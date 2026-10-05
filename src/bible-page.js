// Renderização no servidor (SSR) das páginas de capítulo: /biblia/<slug>/<capitulo>
//
// O Worker busca o "shell" biblia.html nos assets e, sem depender de APIs do runtime
// (só strings), troca título/descrição/canonical/Open Graph, o cabeçalho do capítulo e
// injeta o texto dos versículos. O biblia.js assume a partir daí (progressive enhancement).
// Como é só manipulação de string, dá para testar em Node (tools/test_worker.mjs).

// Aumente este número ao mudar a saída de renderChapterPage (invalida o cache das páginas geradas).
export const SSR_CODE_VERSION = '2';

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function testamentLabel(t) {
  if (t === 'at') return 'Antigo Testamento (42 Livros)';
  if (t === 'nt') return 'Novo Testamento (27 Livros)';
  return 'Cânon Sagrado';
}

export function chapterPath(book, n) {
  return `/biblia/${book.slug}/${n}`;
}

// <meta name|property="key" content="..."> -> troca só o content
function setMeta(html, key, value) {
  const re = new RegExp(`(<meta\\s+(?:name|property)="${escRe(key)}"\\s+content=")[^"]*(")`, 'i');
  return html.replace(re, (_m, a, b) => a + esc(value) + b);
}

// <link rel="canonical" href="...">
function setLinkHref(html, rel, value) {
  const re = new RegExp(`(<link\\s+rel="${escRe(rel)}"\\s+href=")[^"]*(")`, 'i');
  return html.replace(re, (_m, a, b) => a + esc(value) + b);
}

// <tag ... id="ID" ...>texto simples</tag>
function setElementText(html, id, text) {
  const re = new RegExp(`(<(\\w+)[^>]*\\sid="${escRe(id)}"[^>]*>)[^<]*(</\\2>)`);
  return html.replace(re, (_m, open, _tag, close) => open + esc(text) + close);
}

function metaDescription(book, n, verses) {
  let text = verses.map((v) => v.t).join(' ').replace(/\s+/g, ' ').trim();
  const head = `${book.name} ${n}: `;
  const room = 158 - head.length;
  if (text.length > room) text = text.slice(0, room - 1).replace(/\s+\S*$/, '') + '…';
  return (head + text).trim();
}

export function chapterLinksHtml(book, current) {
  const items = book.chapters
    .map((c) => {
      const cur = c === current ? ' aria-current="page"' : '';
      return `<li><a href="${chapterPath(book, c)}" data-bid="${esc(book.id)}" data-ch="${c}"${cur}>${c}</a></li>`;
    })
    .join('');
  return (
    `<h2 class="chapter-links-title">Capítulos de ${esc(book.name)}</h2>` +
    `<ol class="chapter-links-list">${items}</ol>`
  );
}

function verseRowsHtml(verses) {
  return verses
    .map(
      (v) =>
        `<div class="pt-verse-row" id="v-${v.v}" data-verse="${v.v}">` +
        `<span class="pt-v-num" data-verse="${v.v}">${v.v}</span>` +
        `<span class="pt-v-text">${esc(v.t)}</span></div>`
    )
    .join('');
}

/**
 * @param {string} shell   conteúdo de biblia.html
 * @param {object} o       { site, book, chapter, verses, books }
 */
export function renderChapterPage(shell, { site, book, chapter, verses, books }) {
  const path = chapterPath(book, chapter);
  const url = site + path;
  const title = `${book.name} ${chapter} — Bíblia Sagrada Online | Unoteísmo`;
  const desc = verses.length
    ? metaDescription(book, chapter, verses)
    : `Leia ${book.name} ${chapter} na Bíblia Sagrada Online (69 livros) com interlinear grego e áudio narrado.`;

  let html = shell;

  // <head>
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(title)}</title>`);
  html = setMeta(html, 'description', desc);
  html = setLinkHref(html, 'canonical', url);
  html = setMeta(html, 'og:url', url);
  html = setMeta(html, 'og:title', title);
  html = setMeta(html, 'og:description', desc);
  html = setMeta(html, 'twitter:title', title);
  html = setMeta(html, 'twitter:description', desc);

  const idx = books.findIndex((b) => b.id === book.id);
  let prev = null;
  let next = null;
  if (chapter > 1) prev = { book, n: chapter - 1 };
  else if (idx > 0) prev = { book: books[idx - 1], n: books[idx - 1].chapters_count };
  if (chapter < book.chapters_count) next = { book, n: chapter + 1 };
  else if (idx < books.length - 1) next = { book: books[idx + 1], n: 1 };

  const rel =
    (prev ? `<link rel="prev" href="${esc(site + chapterPath(prev.book, prev.n))}">` : '') +
    (next ? `<link rel="next" href="${esc(site + chapterPath(next.book, next.n))}">` : '');

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Chapter',
        '@id': `${url}#chapter`,
        name: `${book.name} ${chapter}`,
        url,
        position: chapter,
        inLanguage: 'pt-BR',
        isPartOf: {
          '@type': 'Book',
          name: 'Bíblia Sagrada Unoteísta: o caminho da verdade',
          isbn: '978-65-02-41194-0',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${site}/` },
          { '@type': 'ListItem', position: 2, name: 'Bíblia Sagrada', item: `${site}/biblia` },
          { '@type': 'ListItem', position: 3, name: book.name, item: `${site}/biblia/${book.slug}/1` },
          { '@type': 'ListItem', position: 4, name: `Capítulo ${chapter}`, item: url },
        ],
      },
    ],
  };
  const ldTag = `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
  html = html.replace('</head>', () => `${rel}\n${ldTag}\n</head>`);

  // Cabeçalho do capítulo e barra de controles
  const badge = testamentLabel(book.testament);
  html = setElementText(html, 'header-book-title', book.name);
  html = setElementText(html, 'header-book-greek', book.greek || '');
  html = setElementText(html, 'header-chap-title', `Capítulo ${chapter}`);
  html = setElementText(html, 'header-canon-badge', badge);
  html = setElementText(html, 'chapter-header-title', `${book.name} ${chapter}`);
  html = setElementText(html, 'chapter-header-sub', `${verses.length} versículos`);
  html = setElementText(html, 'top-chap-info', `${chapter} / ${book.chapters_count}`);
  html = setElementText(html, 'breadcrumb-book-link', book.name);
  html = setElementText(html, 'breadcrumb-chap-current', `Capítulo ${chapter}`);
  html = html.replace(/id="breadcrumb-book-link"\s+href="[^"]*"/, `id="breadcrumb-book-link" href="/biblia/${esc(book.slug)}/"`);
  html = setElementText(html, 'current-book-name', book.name);
  html = setElementText(html, 'current-book-greek', book.greek ? `(${book.greek})` : '');
  html = setElementText(html, 'current-chap-num', String(chapter));
  html = setElementText(html, 'current-testament-badge', badge);
  html = setElementText(html, 'bottom-chap-indicator', `${chapter} / ${book.chapters_count}`);

  // Texto dos versículos (o biblia.js reaproveita sem piscar: data-ssr)
  if (verses.length) {
    html = html.replace(
      /<!--SSR_VERSES-->[\s\S]*?<!--\/SSR_VERSES-->/,
      () => verseRowsHtml(verses)
    );
    html = html.replace('id="verses-display-area"', () => `id="verses-display-area" data-ssr="${esc(book.id)}/${chapter}"`);
  }

  // Links de capítulos do livro (rastreáveis) + anterior/próximo
  const pn =
    `<p class="chapter-links-step">` +
    (prev ? `<a rel="prev" href="${chapterPath(prev.book, prev.n)}">← ${esc(prev.book.name)} ${prev.n}</a>` : '<span></span>') +
    (next ? `<a rel="next" href="${chapterPath(next.book, next.n)}">${esc(next.book.name)} ${next.n} →</a>` : '<span></span>') +
    `</p>`;
  html = html.replace(
    /<!--SSR_CHAPTER_LINKS-->[\s\S]*?<!--\/SSR_CHAPTER_LINKS-->/,
    () => `<nav class="chapter-links" id="chapter-links" aria-label="Capítulos de ${esc(book.name)}">${chapterLinksHtml(book, chapter)}${pn}</nav>`
  );

  // Páginas de capítulo não repetem o bloco institucional/FAQ (evita conteúdo duplicado)
  html = html.replace(/<!--SEO_BOILER-->[\s\S]*?<!--\/SEO_BOILER-->/g, '');

  return html;
}
