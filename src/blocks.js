// Blocos de texto editáveis das páginas (painel /admin).
//
// Uma página marca o que pode ser editado com atributos no próprio HTML:
//   <p data-edit="intro.lead" data-label="Texto de introdução" data-group="Introdução" data-type="rich">...</p>
//   data-type="text"  -> texto puro (títulos, rótulos);  "rich" (padrão) -> negrito, itálico, links e quebras de linha.
// O HTML da página continua sendo a fonte da verdade: o texto original vem dele, e as edições
// (tabela page_blocks do D1) só substituem o conteúdo interno desses elementos na hora de servir.
//
// Este módulo é só manipulação de string (sem APIs do Workers), então é testável em Node
// (tools/test_admin.mjs).

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»' };

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function decodeEntities(s) {
  return String(s == null ? '' : s).replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, e) ? ENTITIES[e] : m;
  });
}

// Compacta espaços e quebras de linha do código-fonte (indentação do HTML não é conteúdo).
export function normalizeHtml(html) {
  return String(html == null ? '' : html)
    .replace(/\s+/g, ' ')
    .replace(/\s*<br\s*\/?>\s*/gi, '<br>')
    .trim();
}

// HTML (já sanitizado ou original) -> texto puro; <br> vira quebra de linha.
export function htmlToText(html) {
  return decodeEntities(
    String(html == null ? '' : html)
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s*<br\s*\/?>\s*/gi, '\n')
      .replace(/<[^>]*>/g, '')
  )
    .replace(/[ \t\f\v\r]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

// Texto puro -> HTML seguro. multiline=false junta tudo numa linha (título, descrição).
export function textToHtml(text, multiline = true) {
  let t = String(text == null ? '' : text).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  t = multiline ? t.split('\n').map((l) => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim() : t.replace(/\s+/g, ' ').trim();
  return esc(t).replace(/\n/g, '<br>');
}

// ---------------------------------------------------------------------------
// Sanitização de HTML "rich": só strong, em, br, sup, sub e links seguros.
// ---------------------------------------------------------------------------
const ALLOWED = new Set(['strong', 'em', 'br', 'a', 'sup', 'sub']);
const ALIAS = { b: 'strong', i: 'em' };
const SAFE_HREF = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i;

function cleanText(t) {
  return t
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&(?!(?:#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);)/g, '&amp;');
}

function readHref(attrs) {
  const m = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs || '');
  if (!m) return '';
  const raw = decodeEntities(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).trim();
  // remove caracteres de controle/espaços que enganam o filtro (ex.: "java\tscript:")
  const compact = raw.replace(/[\u0000- \u007f-\u009f]/g, '');
  if (!SAFE_HREF.test(compact)) return '';
  return compact.slice(0, 500);
}

export function sanitizeRich(input, maxLen = 20000) {
  let s = String(input == null ? '' : input).slice(0, maxLen * 2);
  s = s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|template|noscript|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '');

  const out = [];
  const stack = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  let last = 0;
  let m;
  while ((m = tagRe.exec(s))) {
    out.push(cleanText(s.slice(last, m.index)));
    last = tagRe.lastIndex;
    const closing = m[1] === '/';
    let name = m[2].toLowerCase();
    name = ALIAS[name] || name;
    if (!ALLOWED.has(name)) continue; // tag removida; o texto interno permanece
    if (name === 'br') {
      if (!closing) out.push('<br>');
      continue;
    }
    if (closing) {
      const i = stack.lastIndexOf(name);
      if (i < 0) continue;
      while (stack.length > i) out.push(`</${stack.pop()}>`);
      continue;
    }
    if (name === 'a') {
      const href = readHref(m[3]);
      if (!href) continue; // link inseguro/ausente: só o texto
      const external = /^https?:\/\//i.test(href);
      out.push(`<a href="${esc(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>`);
    } else {
      out.push(`<${name}>`);
    }
    stack.push(name);
  }
  out.push(cleanText(s.slice(last)));
  while (stack.length) out.push(`</${stack.pop()}>`);
  return normalizeHtml(out.join('')).slice(0, maxLen);
}

// ---------------------------------------------------------------------------
// Localizar e substituir blocos marcados com data-edit
// ---------------------------------------------------------------------------
function attr(attrs, name) {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(attrs);
  return m ? decodeEntities(m[1]) : '';
}

const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link']);

export function scanBlocks(html) {
  const blocks = [];
  const openRe = /<([a-zA-Z][a-zA-Z0-9]*)\b((?:"[^"]*"|'[^']*'|[^'">])*?\sdata-edit="([^"]+)"(?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  let m;
  while ((m = openRe.exec(html))) {
    const tag = m[1].toLowerCase();
    if (VOID.has(tag)) continue;
    const innerStart = openRe.lastIndex;
    const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
    re.lastIndex = innerStart;
    let depth = 1;
    let innerEnd = -1;
    let t;
    while ((t = re.exec(html))) {
      if (t[0].endsWith('/>')) continue;
      depth += t[1] === '/' ? -1 : 1;
      if (depth === 0) {
        innerEnd = t.index;
        break;
      }
    }
    if (innerEnd < 0) continue;
    const type = attr(m[2], 'data-type') === 'text' ? 'text' : 'rich';
    blocks.push({
      key: decodeEntities(m[3]),
      label: attr(m[2], 'data-label') || m[3],
      group: attr(m[2], 'data-group') || 'Conteúdo',
      type,
      tag,
      innerStart,
      innerEnd,
      inner: html.slice(innerStart, innerEnd),
    });
    openRe.lastIndex = innerStart; // permite encontrar blocos dentro de outros elementos
  }
  return blocks;
}

/** values: { chave: htmlInterno }  (já seguro). Devolve o HTML com os conteúdos trocados. */
export function applyBlocks(html, values) {
  if (!values || !Object.keys(values).length) return html;
  const blocks = scanBlocks(html).filter((b) => Object.prototype.hasOwnProperty.call(values, b.key));
  blocks.sort((a, b) => b.innerStart - a.innerStart);
  let out = html;
  for (const b of blocks) out = out.slice(0, b.innerStart) + values[b.key] + out.slice(b.innerEnd);
  return out;
}

// ---------------------------------------------------------------------------
// Título e descrição (busca / compartilhamento)
// ---------------------------------------------------------------------------
export const HEAD_FIELDS = [
  { key: 'head.title', label: 'Título da página (aba do navegador e Google)', type: 'text', group: 'Busca e compartilhamento', max: 160 },
  { key: 'head.description', label: 'Descrição para Google e redes sociais', type: 'text', group: 'Busca e compartilhamento', max: 320 },
];

export function getHeadValues(html) {
  const t = /<title>([\s\S]*?)<\/title>/i.exec(html);
  const d = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html);
  return { 'head.title': t ? t[1] : '', 'head.description': d ? d[1] : '' };
}

function setMetaContent(html, kind, key, value) {
  const re = new RegExp(`(<meta\\s+${kind}="${key}"\\s+content=")[^"]*(")`, 'i');
  return html.replace(re, (_m, a, b) => a + value + b);
}

/** values: { 'head.title': htmlSeguro, 'head.description': htmlSeguro } */
export function applyHeadValues(html, values) {
  let out = html;
  if (values['head.title'] != null) {
    const v = values['head.title'];
    out = out.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${v}</title>`);
    out = setMetaContent(out, 'property', 'og:title', v);
    out = setMetaContent(out, 'name', 'twitter:title', v);
  }
  if (values['head.description'] != null) {
    const v = values['head.description'];
    out = setMetaContent(out, 'name', 'description', v);
    out = setMetaContent(out, 'property', 'og:description', v);
    out = setMetaContent(out, 'name', 'twitter:description', v);
  }
  return out;
}
