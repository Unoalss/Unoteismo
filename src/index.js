import books from '../data/books.json';
import { createAudioStream } from './tts.js';
import { renderChapterPage, chapterPath, SSR_CODE_VERSION } from './bible-page.js';
import { handleAdmin, pageIdForPath, renderEditablePage } from './admin.js';

// Livros em standby (Cartas de Inácio e Clemente): não fazem parte do cânon publicado
const STANDBY_BOOKS = new Set(['inef', 'inmag', 'intral', 'inrm', 'infil', 'inesm', 'inpol', '1cl']);

const BOOK_BY_ID = new Map(books.map((b) => [b.id, b]));
const BOOK_BY_SLUG = new Map(books.map((b) => [b.slug, b]));

const DEFAULT_SITE = 'https://unoteismo.arthurlazarodesousasantos.workers.dev';
const NEURAL_VOICES = new Set(['pt-BR-AntonioNeural', 'pt-BR-FranciscaNeural', 'pt-BR-ThalitaMultilingualNeural']);

// Mantenha em sincronia com public/_headers (arquivo _headers cobre só os assets estáticos)
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
    "media-src 'self' data: blob:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; " +
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

function withSecurity(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  return out;
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

// 404 real: pede aos assets uma rota inexistente -> devolve 404.html com status 404
async function notFound(env, url) {
  try {
    const res = await env.ASSETS.fetch(new Request(new URL('/__nao-encontrado__', url.origin)));
    if (res.status === 404) return res;
  } catch (_) {}
  return new Response('Página não encontrada', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

function redirect(url, location, status = 301) {
  return Response.redirect(new URL(location, url.origin).toString(), status);
}

const likeEscape = (s) => s.replace(/[\\%_]/g, '\\$&');

// ---------------------------------------------------------------------------
// /biblia  e  /biblia/<slug>/<capítulo>
// ---------------------------------------------------------------------------
async function handleBible(request, env, ctx, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Método não permitido', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const site = (env.SITE_URL || DEFAULT_SITE).replace(/\/$/, '');
  const parts = url.pathname.split('/').filter(Boolean); // ['biblia', slug?, n?]

  // /biblia/  ->  /biblia
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    return redirect(url, url.pathname.replace(/\/+$/, '') + url.search);
  }

  // /biblia (shell) — e URLs antigas ?book=gn&ch=1 -> URL limpa
  if (parts.length === 1) {
    const qBook = (url.searchParams.get('book') || url.searchParams.get('b') || '').toLowerCase().trim();
    if (qBook) {
      if (STANDBY_BOOKS.has(qBook)) return redirect(url, '/biblia/genesis/1', 302);
      const book = BOOK_BY_ID.get(qBook) || BOOK_BY_SLUG.get(qBook);
      if (!book) return notFound(env, url);
      const rawCh = url.searchParams.get('ch') || url.searchParams.get('c') || url.searchParams.get('cap') || '1';
      const ch = parseInt(rawCh, 10);
      if (!Number.isInteger(ch) || ch < 1) return redirect(url, chapterPath(book, 1));
      if (!book.chapters.includes(ch)) return notFound(env, url);
      const target = new URL(chapterPath(book, ch), url.origin);
      const mode = (url.searchParams.get('mode') || url.searchParams.get('m') || '').toLowerCase();
      if (mode === 'int' || mode === 'parallel') target.searchParams.set('mode', mode);
      const q = url.searchParams.get('q');
      if (q) target.searchParams.set('q', q);
      return Response.redirect(target.toString(), 301);
    }
    const shell = await env.ASSETS.fetch(new Request(new URL('/biblia', url.origin)));
    const res = new Response(shell.body, shell);
    res.headers.set('Cache-Control', 'public, max-age=300');
    return res;
  }

  const book = BOOK_BY_SLUG.get(parts[1]);
  if (!book || parts.length > 3) return notFound(env, url);

  // /biblia/<slug>  ->  capítulo 1
  if (parts.length === 2) return redirect(url, chapterPath(book, 1) + url.search);

  // /biblia/<slug>/<n>
  const n = /^[1-9]\d*$/.test(parts[2]) ? parseInt(parts[2], 10) : NaN;
  if (!book.chapters.includes(n)) return notFound(env, url);

  // A chave do cache inclui a versão do shell (ETag de biblia.html) e do código de SSR:
  // ao publicar um novo biblia.html ou alterar bible-page.js, as páginas antigas deixam de ser servidas.
  const shellRes = await env.ASSETS.fetch(new Request(new URL('/biblia', url.origin)));
  const shellVersion = (shellRes.headers.get('etag') || 'sem-etag').replace(/[^A-Za-z0-9]/g, '');
  const cacheKey = new Request(`${url.origin}/__ssr/${SSR_CODE_VERSION}-${shellVersion}${url.pathname}`);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      if (shellRes.body) shellRes.body.cancel();
      return hit;
    }
  }
  const shell = await shellRes.text();

  let verses = [];
  try {
    const row = await env.DB.prepare(
      "SELECT content FROM bible_chapters WHERE book_id = ? AND chapter = ? AND mode = 'pt' LIMIT 1"
    ).bind(book.id, n).first();
    if (row && row.content) {
      const parsed = JSON.parse(row.content);
      if (Array.isArray(parsed)) verses = parsed.filter((v) => v && typeof v.t === 'string');
    }
  } catch (err) {
    console.error('SSR: falha ao ler capítulo', book.id, n, err && err.message);
  }

  const html = renderChapterPage(shell, { site, book, chapter: n, verses, books });
  const res = new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Só cacheia no edge quando o texto veio do banco (evita fixar uma página sem versículos)
      'Cache-Control': verses.length ? 'public, max-age=300, s-maxage=3600' : 'no-store',
    },
  });
  if (cache && verses.length) ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

// ---------------------------------------------------------------------------
// /api/tts — narração neural. Restrita ao próprio site, limitada por IP e cacheada.
// ---------------------------------------------------------------------------
async function handleTts(request, env, ctx, url) {
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  let sameSite;
  if (fetchSite) {
    sameSite = fetchSite === 'same-origin';
  } else {
    const ref = request.headers.get('Referer') || request.headers.get('Origin') || '';
    try { sameSite = new URL(ref).host === url.host; } catch (_) { sameSite = false; }
  }
  if (!sameSite) return json({ error: 'Forbidden' }, 403);

  if (env.TTS_LIMITER) {
    const key = request.headers.get('CF-Connecting-IP') || 'anon';
    const { success } = await env.TTS_LIMITER.limit({ key });
    if (!success) return json({ error: 'Too many requests' }, 429, { 'Retry-After': '60' });
  }

  const text = (url.searchParams.get('text') || '').trim();
  if (!text) return json({ error: 'Missing text parameter' }, 400);
  if (text.length > 2000) return json({ error: 'Text too long' }, 413);

  const voiceParam = (url.searchParams.get('voice') || 'pt-BR-AntonioNeural').trim();
  const voice = NEURAL_VOICES.has(voiceParam) ? voiceParam : 'pt-BR-AntonioNeural';
  let rate = parseFloat(url.searchParams.get('rate') || '1.0');
  if (!Number.isFinite(rate)) rate = 1.0;
  rate = Math.min(2, Math.max(0.5, rate));

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(`${url.origin}/api/tts?voice=${encodeURIComponent(voice)}&rate=${rate}&text=${encodeURIComponent(text)}`);
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }

  try {
    const stream = await createAudioStream(text, voice, rate);
    const audio = await new Response(stream).arrayBuffer();
    const res = new Response(audio, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=604800, immutable' },
    });
    if (cache) ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (err) {
    console.error('Edge TTS Error:', err);
    return json({ error: 'TTS unavailable' }, 502);
  }
}

// ---------------------------------------------------------------------------
// APIs de dados
// ---------------------------------------------------------------------------
const LEXICON_COLS = 'word, lemma, trans, gram, freq, translit, pronounce, senses, theology';

async function handleWord(env, url) {
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  if (!q) return json({ error: 'Missing word parameter' }, 400);
  const row = await env.DB.prepare(`SELECT ${LEXICON_COLS} FROM lexicon WHERE word_key = ? LIMIT 1`).bind(q).first();
  return json(row || null, 200, { 'Cache-Control': 'public, max-age=86400' });
}

async function handleLexiconSearch(env, url) {
  const q = (url.searchParams.get('q') || '').trim();
  const letter = (url.searchParams.get('letter') || '').trim().toLowerCase();
  let results = [];
  if (letter) {
    const res = await env.DB.prepare(
      `SELECT ${LEXICON_COLS} FROM lexicon WHERE word_key LIKE ? ESCAPE '\\' ORDER BY freq DESC LIMIT 60`
    ).bind(`${likeEscape(letter)}%`).all();
    results = res.results || [];
  } else if (q.length >= 2) {
    const p = `%${likeEscape(q)}%`;
    const res = await env.DB.prepare(
      `SELECT ${LEXICON_COLS} FROM lexicon WHERE word LIKE ?1 ESCAPE '\\' OR word_key LIKE ?1 ESCAPE '\\' OR lemma LIKE ?1 ESCAPE '\\' OR trans LIKE ?1 ESCAPE '\\' ORDER BY freq DESC LIMIT 50`
    ).bind(p).all();
    results = res.results || [];
  }
  return json(results, 200, { 'Cache-Control': 'public, max-age=3600' });
}

async function handleChapter(env, url) {
  const bookParam = (url.searchParams.get('book') || '').trim().toLowerCase();
  const book = BOOK_BY_ID.get(bookParam);
  const ch = parseInt(url.searchParams.get('ch') || '1', 10);
  const mode = (url.searchParams.get('mode') || 'pt').trim().toLowerCase();
  if (!book || !Number.isInteger(ch) || (mode !== 'pt' && mode !== 'int')) {
    return json({ error: 'Chapter not found' }, 404);
  }
  const row = await env.DB.prepare(
    'SELECT content FROM bible_chapters WHERE book_id = ? AND chapter = ? AND mode = ? LIMIT 1'
  ).bind(book.id, ch, mode).first();
  if (!row || !row.content) return json({ error: 'Chapter not found' }, 404);
  return new Response(row.content, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
  });
}

const stripAccents = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Busca de versículos via FTS5 (tabela verses_fts, ver gen_verses_fts_sql.py).
// Sem a tabela, responde 503 e o navegador usa o índice estático como antes.
async function handleSearchVerses(env, url) {
  const q = (url.searchParams.get('q') || '').trim();
  const caseSensitive = url.searchParams.get('cs') === '1' || url.searchParams.get('case_sensitive') === 'true';
  if (q.length < 2) return json([], 200, { 'X-Search-Mode': 'fts' });

  const tokens = stripAccents(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!tokens.length) return json([], 200, { 'X-Search-Mode': 'fts' });

  const phrase = `"${tokens.join(' ')}" *`;
  const all = tokens.map((t) => `"${t}" *`).join(' AND ');
  const sql = 'SELECT book_id, chapter, verse, text FROM verses_fts WHERE verses_fts MATCH ? ORDER BY rowid LIMIT 2000';

  let rows;
  try {
    rows = (await env.DB.prepare(sql).bind(phrase).all()).results || [];
    if (!rows.length && tokens.length > 1) rows = (await env.DB.prepare(sql).bind(all).all()).results || [];
  } catch (err) {
    return json({ error: 'fts_unavailable' }, 503, { 'X-Search-Mode': 'unavailable', 'Cache-Control': 'no-store' });
  }

  let out = rows.filter((r) => !STANDBY_BOOKS.has(r.book_id)).map((r) => [r.book_id, r.chapter, r.verse, r.text]);
  if (caseSensitive) out = out.filter((r) => r[3].includes(q));
  return json(out, 200, { 'X-Search-Mode': 'fts', 'Cache-Control': 'public, max-age=3600' });
}

// ---------------------------------------------------------------------------
// Páginas cujo texto pode ser editado no /admin (ver EDITABLE_PAGES em admin.js)
// ---------------------------------------------------------------------------
async function handleEditablePage(request, env, url, pageId) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Método não permitido', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const res = await env.ASSETS.fetch(new Request(new URL(url.pathname, url.origin)));
  if (!res.ok) return res;
  const html = await renderEditablePage(env, pageId, await res.text());
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // revalida sempre: uma edição no painel aparece na hora
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}

// ---------------------------------------------------------------------------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      const p = url.pathname;
      let res;

      if (p === '/biblia' || p.startsWith('/biblia/')) {
        res = await handleBible(request, env, ctx, url);
      } else if (pageIdForPath(p)) {
        res = await handleEditablePage(request, env, url, pageIdForPath(p));
      } else if (p === '/api/admin' || p.startsWith('/api/admin/')) {
        res = await handleAdmin(request, env, url);
      } else if (p.startsWith('/api/')) {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          res = json({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' });
        } else if (p === '/api/tts') res = await handleTts(request, env, ctx, url);
        else if (p === '/api/word') res = await handleWord(env, url);
        else if (p === '/api/search') res = await handleLexiconSearch(env, url);
        else if (p === '/api/chapter') res = await handleChapter(env, url);
        else if (p === '/api/search_verses') res = await handleSearchVerses(env, url);
        else res = json({ error: 'Not found' }, 404);
      } else {
        res = await env.ASSETS.fetch(request);
      }
      return withSecurity(res);
    } catch (err) {
      console.error('Worker error:', err && err.stack ? err.stack : err);
      return withSecurity(json({ error: 'Internal error' }, 500));
    }
  },
};
