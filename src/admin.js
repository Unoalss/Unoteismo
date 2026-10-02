// API do painel /admin e renderização das páginas editáveis.
//
// Rotas (todas em /api/admin/*, exceto o login exigem Authorization: Bearer <token>):
//   POST   login                         { password }        -> { token, expiresAt }
//   GET    me
//   POST   password                      { current, next }   -> troca a senha (invalida os outros tokens)
//   GET    pages                                              -> páginas editáveis
//   GET    pages/<pagina>                                     -> blocos (original x atual)
//   POST   pages/<pagina>/save           { changes: {chave: valor} }
//   GET    pages/<pagina>/revisions?key=                      -> histórico de um bloco
//   DELETE pages/<pagina>/blocks/<chave>                      -> volta ao texto original
//
// O token vai no cabeçalho (não em cookie): não há sessão a ser "pega" por outro site (sem CSRF)
// e o site continua sem definir cookies.

import { applyBlocks, applyHeadValues, getHeadValues, HEAD_FIELDS, htmlToText, normalizeHtml, sanitizeRich, scanBlocks, textToHtml } from './blocks.js';
import { hashPassword, signToken, verifyPassword, verifyToken } from './auth.js';

// Para tornar outra página editável: acrescente aqui e marque os elementos com data-edit no HTML.
export const EDITABLE_PAGES = {
  teologia: { label: 'Teologia', path: '/teologia' },
  soteriologia: { label: 'Soteriologia', path: '/soteriologia' },
  communicatio_idiomatum: { label: 'Communicatio Idiomatum', path: '/communicatio-idiomatum' },
  batismo: { label: 'Batismo', path: '/batismo' },
  forma_da_consciencia: { label: 'Forma da Consciência', path: '/forma-da-consciencia' },
  // A Confissão de Fé fica na página inicial; "view" é o endereço que o painel abre em "Ver página"
  inicio: { label: 'Início e Confissão de Fé', path: '/', view: '/#confissao' },
};

/** id da página editável que corresponde a um caminho público (ou null) */
export function pageIdForPath(pathname) {
  for (const [id, p] of Object.entries(EDITABLE_PAGES)) if (p.path === pathname) return id;
  return null;
}

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const WINDOW_S = 15 * 60;
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_GLOBAL = 30;
const REVISIONS_KEEP = 20;
const MAX_CHANGES = 400;

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      ...extra,
    },
  });
}

async function readJson(request) {
  try {
    const t = await request.text();
    if (t.length > 2_000_000) return null;
    return JSON.parse(t);
  } catch (_) {
    return null;
  }
}

async function getConfig(env) {
  try {
    const { results } = await env.DB.prepare('SELECT key, value FROM admin_config').all();
    const cfg = Object.fromEntries((results || []).map((r) => [r.key, r.value]));
    if (!cfg.password_hash || !cfg.token_secret) return null;
    return cfg;
  } catch (_) {
    return null; // tabelas ainda não criadas
  }
}

async function requireAdmin(request, env) {
  const cfg = await getConfig(env);
  if (!cfg) return { error: json({ error: 'not_configured', message: 'Painel ainda não configurado no banco.' }, 503) };
  const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '');
  const payload = m ? await verifyToken(cfg.token_secret, m[1]) : null;
  if (!payload || payload.v !== Number(cfg.token_version || 1)) {
    return { error: json({ error: 'unauthorized', message: 'Sessão inválida ou expirada. Entre novamente.' }, 401) };
  }
  return { cfg, payload };
}

async function newToken(cfg) {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  return { token: await signToken(cfg.token_secret, { exp: expiresAt, v: Number(cfg.token_version || 1) }), expiresAt };
}

// ---------------------------------------------------------------------------
async function login(request, env) {
  const body = await readJson(request);
  const password = body && typeof body.password === 'string' ? body.password : '';
  if (!password || password.length > 200) return json({ error: 'bad_request', message: 'Informe a senha.' }, 400);

  const cfg = await getConfig(env);
  if (!cfg) return json({ error: 'not_configured', message: 'Painel ainda não configurado no banco (veja DEV.md).' }, 503);

  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const now = Math.floor(Date.now() / 1000);
  const since = now - WINDOW_S;
  await env.DB.prepare('DELETE FROM admin_login_attempts WHERE ts < ?').bind(now - 86400).run();

  const mine = (await env.DB.prepare('SELECT ts FROM admin_login_attempts WHERE ip = ? AND ts > ? ORDER BY ts DESC LIMIT ?').bind(ip, since, MAX_FAILS_PER_IP).all()).results || [];
  if (mine.length >= MAX_FAILS_PER_IP) {
    const wait = Math.max(1, mine[MAX_FAILS_PER_IP - 1].ts + WINDOW_S - now);
    return json({ error: 'locked', message: `Muitas tentativas erradas. Tente de novo em cerca de ${Math.ceil(wait / 60)} minuto(s).`, waitSeconds: wait }, 429, { 'Retry-After': String(wait) });
  }
  const global = (await env.DB.prepare('SELECT count(*) AS c FROM admin_login_attempts WHERE ts > ?').bind(since).first()) || { c: 0 };
  if (global.c >= MAX_FAILS_GLOBAL) {
    return json({ error: 'locked', message: 'Muitas tentativas de acesso no momento. Tente de novo em alguns minutos.', waitSeconds: WINDOW_S }, 429, { 'Retry-After': String(WINDOW_S) });
  }

  if (!(await verifyPassword(password, cfg.password_hash))) {
    await env.DB.prepare('INSERT INTO admin_login_attempts (ip, ts) VALUES (?, ?)').bind(ip, now).run();
    const remaining = Math.max(0, MAX_FAILS_PER_IP - (mine.length + 1));
    return json({ error: 'invalid', message: remaining ? `Senha incorreta. Restam ${remaining} tentativa(s).` : 'Senha incorreta. Acesso bloqueado por 15 minutos.', remaining }, 401);
  }

  await env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip = ?').bind(ip).run();
  return json({ ok: true, ...(await newToken(cfg)) });
}

async function changePassword(request, env, cfg) {
  const body = await readJson(request);
  const current = body && typeof body.current === 'string' ? body.current : '';
  const next = body && typeof body.next === 'string' ? body.next : '';
  if (!(await verifyPassword(current, cfg.password_hash))) return json({ error: 'invalid', message: 'A senha atual está incorreta.' }, 401);
  if (next.length < 8 || next.length > 200) return json({ error: 'weak', message: 'A nova senha precisa ter de 8 a 200 caracteres.' }, 400);
  if (next === current) return json({ error: 'same', message: 'A nova senha deve ser diferente da atual.' }, 400);
  const version = Number(cfg.token_version || 1) + 1;
  await env.DB.batch([
    env.DB.prepare("INSERT OR REPLACE INTO admin_config (key, value) VALUES ('password_hash', ?)").bind(await hashPassword(next)),
    env.DB.prepare("INSERT OR REPLACE INTO admin_config (key, value) VALUES ('token_version', ?)").bind(String(version)),
  ]);
  // Todos os tokens antigos deixam de valer; devolvemos um novo para esta sessão continuar
  return json({ ok: true, ...(await newToken({ ...cfg, token_version: version })) });
}

// ---------------------------------------------------------------------------
async function loadPageHtml(env, url, page) {
  const res = await env.ASSETS.fetch(new Request(new URL(page.path, url.origin)));
  if (!res.ok) throw new Error('Página não encontrada nos assets');
  return res.text();
}

async function overridesFor(env, pageId) {
  const { results } = await env.DB.prepare('SELECT key, html, updated_at FROM page_blocks WHERE page = ?').bind(pageId).all();
  return new Map((results || []).map((r) => [r.key, r]));
}

// Todos os campos editáveis (blocos do corpo + título/descrição) com o texto original do HTML
function fieldsOf(html) {
  const head = getHeadValues(html);
  const fields = HEAD_FIELDS.map((f) => ({ ...f, multiline: false, originalHtml: head[f.key] }));
  for (const b of scanBlocks(html)) fields.push({ key: b.key, label: b.label, group: b.group, type: b.type, multiline: true, originalHtml: b.inner });
  return fields;
}

const originalOf = (f) => (f.type === 'text' ? htmlToText(f.originalHtml) : normalizeHtml(f.originalHtml));
const valueOf = (f, html) => (f.type === 'text' ? htmlToText(html) : html);

async function pageDetail(env, url, pageId) {
  const page = EDITABLE_PAGES[pageId];
  const html = await loadPageHtml(env, url, page);
  const over = await overridesFor(env, pageId);
  const items = fieldsOf(html).map((f) => {
    const o = over.get(f.key);
    const original = originalOf(f);
    return { key: f.key, label: f.label, group: f.group, type: f.type, original, current: o ? valueOf(f, o.html) : original, edited: !!o, updatedAt: o ? o.updated_at : null };
  });
  return { page: pageId, label: page.label, path: page.path, viewPath: page.view || page.path, blocks: items };
}

async function savePage(request, env, url, pageId) {
  const body = await readJson(request);
  const changes = body && body.changes && typeof body.changes === 'object' ? body.changes : null;
  if (!changes || Object.keys(changes).length === 0) return json({ error: 'bad_request', message: 'Nada para salvar.' }, 400);
  if (Object.keys(changes).length > MAX_CHANGES) return json({ error: 'bad_request', message: 'Alterações demais de uma vez.' }, 400);

  const html = await loadPageHtml(env, url, EDITABLE_PAGES[pageId]);
  const fields = new Map(fieldsOf(html).map((f) => [f.key, f]));
  const now = Date.now();
  const stmts = [];
  const results = {};
  const errors = [];

  for (const [key, value] of Object.entries(changes)) {
    const f = fields.get(key);
    if (!f) { errors.push({ key, message: 'Campo desconhecido.' }); continue; }
    if (typeof value !== 'string') { errors.push({ key, message: 'Valor inválido.' }); continue; }
    const max = f.max || (f.type === 'text' ? 2000 : 20000);
    if (value.length > max * 2) { errors.push({ key, message: `Texto longo demais (máximo ${max} caracteres).` }); continue; }

    const clean = f.type === 'text' ? textToHtml(value.slice(0, max), f.multiline) : sanitizeRich(value, max);
    if (!htmlToText(clean)) { errors.push({ key, message: 'O texto não pode ficar vazio.' }); continue; }

    const originalClean = f.type === 'text' ? textToHtml(htmlToText(f.originalHtml), f.multiline) : sanitizeRich(f.originalHtml, 60000);
    if (clean === originalClean) {
      stmts.push(env.DB.prepare('DELETE FROM page_blocks WHERE page = ? AND key = ?').bind(pageId, key));
      results[key] = { edited: false };
    } else {
      stmts.push(env.DB.prepare('INSERT OR REPLACE INTO page_blocks (page, key, html, updated_at) VALUES (?, ?, ?, ?)').bind(pageId, key, clean, now));
      stmts.push(env.DB.prepare('INSERT INTO page_block_revisions (page, key, html, saved_at) VALUES (?, ?, ?, ?)').bind(pageId, key, clean, now));
      stmts.push(env.DB.prepare(
        'DELETE FROM page_block_revisions WHERE page = ?1 AND key = ?2 AND id NOT IN (SELECT id FROM page_block_revisions WHERE page = ?1 AND key = ?2 ORDER BY id DESC LIMIT ?3)'
      ).bind(pageId, key, REVISIONS_KEEP));
      results[key] = { edited: true };
    }
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: errors.length === 0, results, errors, saved: Object.keys(results).length }, errors.length && !Object.keys(results).length ? 400 : 200);
}

async function revisions(env, url, pageId) {
  const key = url.searchParams.get('key') || '';
  const html = await loadPageHtml(env, url, EDITABLE_PAGES[pageId]);
  const f = fieldsOf(html).find((x) => x.key === key);
  if (!f) return json({ error: 'not_found', message: 'Campo desconhecido.' }, 404);
  const { results } = await env.DB.prepare('SELECT id, html, saved_at FROM page_block_revisions WHERE page = ? AND key = ? ORDER BY id DESC LIMIT ?').bind(pageId, key, REVISIONS_KEEP).all();
  return json({ key, revisions: (results || []).map((r) => ({ id: r.id, savedAt: r.saved_at, value: valueOf(f, r.html) })) });
}

// ---------------------------------------------------------------------------
export async function handleAdmin(request, env, url) {
  const parts = url.pathname.replace(/^\/api\/admin\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const method = request.method;

  // Defesa extra: escrita só vinda do próprio site
  if (method !== 'GET' && method !== 'HEAD') {
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return json({ error: 'forbidden', message: 'Origem não permitida.' }, 403);
  }

  if (parts[0] === 'login') {
    if (method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
    return login(request, env);
  }

  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  try {
    if (parts[0] === 'me' && method === 'GET') return json({ ok: true, expiresAt: auth.payload.exp });
    if (parts[0] === 'password' && method === 'POST') return changePassword(request, env, auth.cfg);

    if (parts[0] === 'pages') {
      if (parts.length === 1 && method === 'GET') {
        const list = [];
        for (const [id, p] of Object.entries(EDITABLE_PAGES)) {
          const html = await loadPageHtml(env, url, p);
          const over = await overridesFor(env, id);
          list.push({ page: id, label: p.label, path: p.path, blocks: fieldsOf(html).length, edited: over.size });
        }
        return json({ pages: list });
      }
      const pageId = parts[1];
      if (!Object.prototype.hasOwnProperty.call(EDITABLE_PAGES, pageId)) return json({ error: 'not_found', message: 'Página desconhecida.' }, 404);

      if (parts.length === 2 && method === 'GET') return json(await pageDetail(env, url, pageId));
      if (parts[2] === 'save' && method === 'POST') return savePage(request, env, url, pageId);
      if (parts[2] === 'revisions' && method === 'GET') return revisions(env, url, pageId);
      if (parts[2] === 'blocks' && parts[3] && method === 'DELETE') {
        await env.DB.prepare('DELETE FROM page_blocks WHERE page = ? AND key = ?').bind(pageId, parts[3]).run();
        return json({ ok: true });
      }
    }
    return json({ error: 'not_found' }, 404);
  } catch (err) {
    console.error('Admin error:', err && err.stack ? err.stack : err);
    return json({ error: 'server_error', message: 'Erro interno. Tente novamente.' }, 500);
  }
}

// ---------------------------------------------------------------------------
// Página pública com as edições aplicadas (usada pelo Worker em /teologia)
// ---------------------------------------------------------------------------
export async function renderEditablePage(env, pageId, html) {
  try {
    const { results } = await env.DB.prepare('SELECT key, html FROM page_blocks WHERE page = ?').bind(pageId).all();
    if (!results || !results.length) return html;
    const body = {};
    const head = {};
    for (const r of results) {
      if (r.key.startsWith('head.')) head[r.key] = r.html;
      else body[r.key] = sanitizeRich(r.html); // defesa em profundidade: o que vai ao ar é sempre re-sanitizado
    }
    return applyHeadValues(applyBlocks(html, body), head);
  } catch (err) {
    console.error('Falha ao aplicar edições (servindo o original):', err && err.message);
    return html;
  }
}
