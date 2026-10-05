/* ==========================================================================
   BÍBLIA SAGRADA & LÉXICO GREGO UNOTEÍSTA — MOTOR DE LEITURA & EXEGESE
   ========================================================================== */

/* Uso do localStorage sempre protegido: em janelas privadas/bloqueios ele pode lançar erro */
const Store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  },
  getJSON(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v === null || v === undefined ? fallback : v;
    } catch (e) { return fallback; }
  },
  setJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Tema: o visual é claro (versao_biblia.css). Fixamos data-theme="light" para as variáveis de cor
  //    (--text-primary etc.) acompanharem; o valor antigo guardado em localStorage é ignorado.
  document.documentElement.setAttribute('data-theme', 'light');

  // 2. Estado Global da Aplicação
  let books = [];
  let currentBookId = 'gn';
  let currentChapter = 1;
  let currentMode = 'pt'; // Sempre abre primeiro na Tradução PT
  let urlHadReference = false; // a URL já indicava livro/capítulo? (senão restauramos a última leitura)
  let currentView = 'chapter'; // 'chapter' ou 'book'

  // Ler a URL: /biblia/<slug>/<capítulo> ou /biblia/<slug>/ (ou o formato antigo ?book=gn&ch=1)
  function parseLocation() {
    const out = { book: '', chapter: 0, mode: '' };
    try {
      const m = window.location.pathname.match(/^\/biblia\/([^/]+)(?:\/(\d+))?\/?$/);
      if (m) {
        out.book = decodeURIComponent(m[1]).toLowerCase();
        out.chapter = m[2] ? parseInt(m[2], 10) : 0;
      }
      const q = new URLSearchParams(window.location.search);
      if (!out.book) {
        out.book = (q.get('book') || q.get('b') || q.get('livro') || '').toLowerCase().trim();
        out.chapter = parseInt(q.get('ch') || q.get('c') || q.get('cap') || q.get('capitulo') || '0', 10) || 0;
      }
      const mode = (q.get('mode') || q.get('m') || '').toLowerCase().trim();
      if (['pt', 'int', 'parallel'].includes(mode)) out.mode = mode;
    } catch (e) {}
    return out;
  }

  {
    const loc = parseLocation();
    if (loc.book) {
      currentBookId = loc.book;
      urlHadReference = true;
      if (loc.chapter > 0) {
        currentChapter = loc.chapter;
        currentView = 'chapter';
      } else {
        currentChapter = 0;
        currentView = 'book';
      }
    }
    if (loc.mode) currentMode = loc.mode;
  }

  const ptCache = {};
  const intCache = {};
  let dictExact = null;
  let dictSearchIndex = null;
  let activeCategoryFilter = 'all';

  // 3. Elementos do DOM
  const modeBtnPt = document.getElementById('mode-btn-pt');
  const modeBtnInt = document.getElementById('mode-btn-int');
  const modeBtnParallel = document.getElementById('mode-btn-parallel');
  
  const bookSelectorBtn = document.getElementById('book-selector-btn');
  const chapterSelectorBtn = document.getElementById('chapter-selector-btn');
  const currentBookName = document.getElementById('current-book-name');
  const currentBookGreek = document.getElementById('current-book-greek');
  const currentChapNum = document.getElementById('current-chap-num');
  const currentTestamentBadge = document.getElementById('current-testament-badge');
  const prevChapBtn = document.getElementById('prev-chap-btn');
  const nextChapBtn = document.getElementById('next-chap-btn');
  const bottomPrevBtn = document.getElementById('bottom-prev-btn');
  const bottomNextBtn = document.getElementById('bottom-next-btn');
  const bottomChapIndicator = document.getElementById('bottom-chap-indicator');
  const bibleDotIndicators = document.getElementById('bible-dot-indicators');

  const booksModal = document.getElementById('books-modal');
  const closeBooksModal = document.getElementById('close-books-modal');
  const booksGridContainer = document.getElementById('books-grid-container');
  const bookSearchInput = document.getElementById('book-search-input');
  const canonTabs = document.querySelectorAll('.canon-tab');

  const chaptersModal = document.getElementById('chapters-modal');
  const closeChaptersModal = document.getElementById('close-chapters-modal');
  const chaptersGridContainer = document.getElementById('chapters-grid-container');
  const chapModalBookTitle = document.getElementById('chap-modal-book-title');

  const versesDisplayArea = document.getElementById('verses-display-area');
  const headerBookTitle = document.getElementById('header-book-title');
  const headerBookGreek = document.getElementById('header-book-greek');
  const headerChapTitle = document.getElementById('header-chap-title');
  const headerCanonBadge = document.getElementById('header-canon-badge');
  const interlinearTip = document.getElementById('interlinear-tip');

  const openDictBtn = document.getElementById('open-dict-btn');
  const closeDictBtn = document.getElementById('close-dict-btn');
  const dictDrawer = document.getElementById('dict-drawer');
  const dictOverlay = document.getElementById('dict-overlay');
  const dictSearchInput = document.getElementById('dict-search-input');
  const clearDictSearch = document.getElementById('clear-dict-search');
  const dictResultsList = document.getElementById('dict-results-list');
  const dictEmptyState = document.getElementById('dict-empty-state');
  const alphaButtons = document.querySelectorAll('.alpha-btn');

  const quickPopover = document.getElementById('quick-lexicon-popover');
  const popWord = document.getElementById('pop-word');
  const popTranslit = document.getElementById('pop-translit');
  const popLemma = document.getElementById('pop-lemma');
  const popPronounce = document.getElementById('pop-pronounce');
  const popFreqBadge = document.getElementById('pop-freq-badge');
  const popGramBadge = document.getElementById('pop-gram-badge');
  const popTrans = document.getElementById('pop-trans');
  const popSenses = document.getElementById('pop-senses');
  const popTheol = document.getElementById('pop-theol');
  const popObs = document.getElementById('pop-obs');
  const popClose = document.getElementById('pop-close');
  const popFullBtn = document.getElementById('pop-full-btn');
  let currentPopoverWord = null;


  // Elementos do Motor de Pesquisa Bíblica
  const openBibleSearchBtn = document.getElementById('open-bible-search-btn');
  const bibleSearchModal = document.getElementById('bible-search-modal');
  const closeBibleSearchModal = document.getElementById('close-bible-search-modal');
  const bibleSearchInput = document.getElementById('bible-search-input');
  const clearBibleSearchBtn = document.getElementById('clear-bible-search-btn');
  const searchCaseToggleBtn = document.getElementById('search-case-toggle-btn');
  const searchCaseCheckbox = document.getElementById('search-case-checkbox');
  const searchChipsBar = document.getElementById('search-chips-bar');
  const bibleSearchSelectionBar = document.getElementById('bible-search-selection-bar');
  const selectionStatusText = document.getElementById('selection-status-text');
  const searchSelectAllBtn = document.getElementById('search-select-all-btn');
  const searchCopySelectedBtn = document.getElementById('search-copy-selected-btn');
  const searchCancelSelectionBtn = document.getElementById('search-cancel-selection-btn');
  const bibleSearchMetaBar = document.getElementById('bible-search-meta-bar');
  const bibleSearchCountBadge = document.getElementById('bible-search-count-badge');
  const bibleSearchResultsArea = document.getElementById('bible-search-results-area');
  const searchInitialState = document.getElementById('search-initial-state');
  const bibleSearchResultsList = document.getElementById('bible-search-results-list');

  let bibleSearchIndex = null;
  let isBibleIndexLoading = false;
  let currentSearchResults = [];
  const selectedVersesMap = new Map();
  let isSelectionMode = false;
  let isCaseSensitive = false;
  let searchDebounceTimer = null;

  // Elementos do Narrador Sagrado (Áudio / Fala)
  const narratorBar = document.getElementById('narrator-bar');
  const narratorPlayBtn = document.getElementById('narrator-play-btn');
  const narratorBtnLabel = document.getElementById('narrator-btn-label');
  const narratorStopBtn = document.getElementById('narrator-stop-btn');
  const narratorPrevBtn = document.getElementById('narrator-prev-btn');
  const narratorNextBtn = document.getElementById('narrator-next-btn');
  const narratorWaves = document.getElementById('narrator-waves');
  const narratorStatusText = document.getElementById('narrator-status-text');
  const narratorSpeedSelect = document.getElementById('narrator-speed-select');
  const narratorVoiceSelect = document.getElementById('narrator-voice-select');
  const narratorAutoNextCheckbox = document.getElementById('narrator-autonext-checkbox');

  const narratorFloatingPlayer = document.getElementById('narrator-floating-player');
  const floatPlayBtn = document.getElementById('float-play-btn');
  const floatTrackTitle = document.getElementById('float-track-title');
  const floatVerseNum = document.getElementById('float-verse-num');
  const floatWaves = document.getElementById('float-waves');
  const floatPrevBtn = document.getElementById('float-prev-btn');
  const floatNextBtn = document.getElementById('float-next-btn');
  const floatStopBtn = document.getElementById('float-stop-btn');
  const floatCloseBtn = document.getElementById('float-close-btn');

  // 4. Utilitários
  function stripAccents(str) {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function getTestamentLabel(testament) {
    switch (testament) {
      case 'at': return 'Antigo Testamento (42 Livros)';
      case 'nt': return 'Novo Testamento (27 Livros)';
      default: return 'Cânon Sagrado';
    }
  }

  // 5. Carregar Catálogo de Livros
  try {
    const res = await fetch('/data/books.json');
    books = await res.json();
    // A URL pode trazer o id (gn) ou o slug (genesis)
    const byIdOrSlug = books.find(b => b.id === currentBookId || getBookSlug(b) === currentBookId);
    if (byIdOrSlug) {
      currentBookId = byIdOrSlug.id;
      if (currentChapter > byIdOrSlug.chapters_count) currentChapter = 1;
    } else {
      currentBookId = 'gn';
      currentChapter = 1;
      currentView = 'chapter';
      urlHadReference = false;
    }
    // Abrindo /biblia sem referência: volta para onde o leitor parou
    if (!urlHadReference) {
      const last = Store.getJSON('unoteismo_last_read', null);
      const lastBook = last && books.find(b => b.id === last.b);
      if (lastBook && last.c >= 1 && last.c <= lastBook.chapters_count) {
        currentBookId = lastBook.id;
        currentChapter = last.c;
      }
    }
    renderBooksGrid();
  } catch (err) {
    console.error('Erro ao carregar catálogo de livros:', err);
  }

  // Slug de URL de um livro (campo `slug` do books.json; calcula se faltar)
  function getBookSlug(b) {
    if (b.slug) return b.slug;
    return stripAccents(b.name).replace(/^(iii|ii|i)\s+/, (m) => ({ i: '1', ii: '2', iii: '3' })[m.trim()] + ' ')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // Dicionário de consulta rápida (23 MB): só é baixado em ambiente local, quando a API do Worker não existe
  let dictExactPromise = null;
  function loadDictExactLocal() {
    if (dictExactPromise) return dictExactPromise;
    dictExactPromise = fetch('/data/dict_exact.json')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) dictExact = Object.assign(d, dictExact || {}); return dictExact; })
      .catch(() => null);
    return dictExactPromise;
  }

  // 6. Navegação entre Modos de Leitura (PT, INT, Paralelo)
  function setReadingMode(mode, opts = {}) {
    currentMode = mode;
    Store.set('unoteismo_bible_mode', mode);

    [modeBtnPt, modeBtnInt, modeBtnParallel].forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    [modeBtnPt, modeBtnInt, modeBtnParallel].forEach(btn => {
      btn.setAttribute('aria-selected', btn.dataset.mode === mode ? 'true' : 'false');
    });

    // A dica exegética só interessa nos modos com grego, e some de vez depois de dispensada
    const showTip = (mode === 'int' || mode === 'parallel') && Store.get('unoteismo_tip_dismissed') !== '1';
    interlinearTip.classList.toggle('visible', showTip);

    return renderChapterContent();
  }

  modeBtnPt.addEventListener('click', () => setReadingMode('pt'));
  modeBtnInt.addEventListener('click', () => setReadingMode('int'));
  modeBtnParallel.addEventListener('click', () => setReadingMode('parallel'));

  // 7. Carregamento de Dados do Livro Atual
  async function fetchBookPT(bid) {
    if (ptCache[bid]) return ptCache[bid];
    try {
      const res = await fetch(`/data/pt/${bid}.json`);
      const data = await res.json();
      ptCache[bid] = data;
      return data;
    } catch (e) {
      console.error(`Erro ao buscar PT de ${bid}:`, e);
      return null;
    }
  }

  async function fetchBookINT(bid) {
    if (intCache[bid]) return intCache[bid];
    try {
      const res = await fetch(`/data/int/${bid}.json`);
      const data = await res.json();
      intCache[bid] = data;
      return data;
    } catch (e) {
      console.error(`Erro ao buscar INT de ${bid}:`, e);
      return null;
    }
  }

  // Cache para capítulos individuais via API
  const chapterCache = {};

  async function getChapterVerses(bookId, chNum, mode) {
    const key = `${bookId}_${chNum}_${mode}`;
    if (chapterCache[key]) return chapterCache[key];

    // 1. Tentar API Cloudflare D1 protegida
    try {
      const res = await fetch(`/api/chapter?book=${encodeURIComponent(bookId)}&ch=${chNum}&mode=${mode}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          chapterCache[key] = data;
          return data;
        }
      }
    } catch (e) {}

    // 2. Fallback para arquivos locais (modo offline/dev)
    try {
      const fn = mode === 'pt' ? fetchBookPT : fetchBookINT;
      const bData = await fn(bookId);
      const verses = (bData && bData.chapters && bData.chapters[String(chNum)]) || [];
      if (verses.length) chapterCache[key] = verses; // não fixa um resultado vazio (falha momentânea)
      return verses;
    } catch (e) {}

    return [];
  }

  // 7.5 Renderização da Página do Livro (Grade de Capítulos estilo unoteísta preto e branco)
  function renderBookChaptersView(book, opts = {}) {
    if (!book) book = books.find(b => b.id === currentBookId) || books[0];
    currentBookId = book.id;
    currentView = 'book';
    currentChapter = 0;

    const slug = getBookSlug(book);
    document.title = `${book.name} — Bíblia Sagrada Online | Unoteísmo`;

    // Sincroniza URL no formato /biblia/<slug>/
    if (opts.push !== false) {
      try {
        const next = `/biblia/${slug}/`;
        if (window.location.pathname !== next) {
          window.history[opts.push ? 'pushState' : 'replaceState']({ b: book.id, view: 'book' }, '', next);
        }
      } catch (e) {}
    }

    // Ocultar cabeçalhos de leitura e players
    const chapterReadingHeader = document.getElementById('chapter-reading-header-wrap') || document.querySelector('.chapter-reading-header');
    if (chapterReadingHeader) chapterReadingHeader.style.display = 'none';
    if (narratorBar) narratorBar.style.display = 'none';
    const bottomNav = document.getElementById('bottom-bible-pagination') || document.getElementById('bottom-nav-bar');
    if (bottomNav) bottomNav.style.display = 'none';
    if (interlinearTip) interlinearTip.style.display = 'none';
    const versesCard = document.getElementById('verses-container-card');
    if (versesCard) {
      versesCard.style.border = 'none';
      versesCard.style.background = 'transparent';
      versesCard.style.boxShadow = 'none';
      versesCard.style.padding = '0';
    }

    // Atualiza controles da barra superior
    currentBookName.textContent = book.name;
    currentBookGreek.textContent = book.greek ? `(${book.greek})` : '';
    currentChapNum.textContent = '—';
    currentTestamentBadge.textContent = getTestamentLabel(book.testament);

    // Conteúdo da página do livro (Grade de Capítulos)
    versesDisplayArea.innerHTML = `
      <div class="book-page-container">
        <nav class="bible-breadcrumb" aria-label="Navegação">
          <a href="/">Início</a>
          <span class="bc-sep">/</span>
          <a href="/biblia">Bíblia</a>
          <span class="bc-sep">/</span>
          <span class="bc-current">${escapeHtml(book.name)}</span>
        </nav>

        <div class="book-page-header">
          <span class="book-testament-tag">${getTestamentLabel(book.testament)}</span>
          <h1 class="book-page-title">
            ${escapeHtml(book.name)}
            ${book.greek ? `<span class="book-greek-title">(${escapeHtml(book.greek)})</span>` : ''}
          </h1>
          <p class="book-page-sub">${book.chapters_count} capítulos • Clique no capítulo para ler</p>
        </div>

        <div class="book-chapters-grid">
          ${book.chapters.map(ch => `
            <a href="/biblia/${slug}/${ch}" class="book-chap-btn" data-chap="${ch}">
              ${ch}
            </a>
          `).join('')}
        </div>
      </div>
    `;

    // Interatividade: clicar no capítulo abre a leitura diretamente
    versesDisplayArea.querySelectorAll('.book-chap-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        currentChapter = parseInt(btn.dataset.chap, 10);
        currentView = 'chapter';
        renderChapterContent({ push: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // 8. Renderização Central do Capítulo
  // opts.push: true quando o leitor navegou (cria uma entrada no histórico do navegador)
  async function renderChapterContent(opts = {}) {
    currentView = 'chapter';
    const chapterReadingHeader = document.getElementById('chapter-reading-header-wrap') || document.querySelector('.chapter-reading-header');
    if (chapterReadingHeader) chapterReadingHeader.style.display = '';
    if (narratorBar) narratorBar.style.display = '';
    const bottomNav = document.getElementById('bottom-bible-pagination') || document.getElementById('bottom-nav-bar');
    if (bottomNav) bottomNav.style.display = '';
    if (interlinearTip) interlinearTip.style.display = '';
    const versesCard = document.getElementById('verses-container-card');
    if (versesCard) {
      versesCard.style.border = '';
      versesCard.style.background = '';
      versesCard.style.boxShadow = '';
      versesCard.style.padding = '';
    }

    // Verificação de protocolo file:/// (navegadores bloqueiam fetch local)
    if (window.location.protocol === 'file:') {
      versesDisplayArea.innerHTML = `
        <div class="file-protocol-warning" style="max-width: 650px; margin: 3rem auto; padding: 2.2rem; background: var(--bg-card); border: 1px solid var(--bg-card-border-glow); border-radius: 16px; text-align: center; box-shadow: var(--card-shadow);">
          <div style="font-size: 2.2rem; margin-bottom: 0.8rem; color: var(--accent-gold);">✧</div>
          <h3 style="font-family: var(--font-serif-sacred); font-size: 1.35rem; color: var(--text-accent); margin-bottom: 0.8rem;">Servidor Local Necessário</h3>
          <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.2rem; font-size: 0.95rem;">
            Você abriu a página diretamente pelo arquivo no Windows (<code>file:///</code>). Por segurança, os navegadores modernos (Chrome, Edge) impedem que arquivos locais façam requisições <code>fetch()</code> aos dados bíblicos (JSON).
          </p>
          <p style="color: var(--text-primary); font-weight: 500; margin-bottom: 1.5rem; font-size: 0.95rem;">
            Para ler os 69 Livros, o Interlinear e o Léxico Grego, acesse pelo servidor local:
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <a href="http://localhost:8085/biblia.html" style="display: inline-flex; align-items: center; gap: 0.6rem; padding: 0.75rem 1.6rem; background: var(--text-accent); color: var(--bg-primary); border-radius: 9999px; text-decoration: none; font-weight: 600; font-family: var(--font-sans); box-shadow: 0 0 20px var(--accent-glow-strong);">
              Acessar http://localhost:8085/biblia.html
            </a>
          </div>
        </div>
      `;
      return;
    }

    let book = books.find(b => b.id === currentBookId);
    if (!book) {
      if (books.length > 0) {
        currentBookId = 'gn';
        currentChapter = 1;
        book = books.find(b => b.id === 'gn') || books[0];
      } else {
        versesDisplayArea.innerHTML = `
          <div class="empty-chapter" style="max-width: 600px; margin: 3rem auto; text-align: center; padding: 2rem;">
            <h3 style="font-family: var(--font-serif-sacred); color: var(--text-accent); margin-bottom: 0.8rem;">Conectando ao Servidor...</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1.2rem;">Não foi possível carregar os dados dos livros. Verifique sua conexão com a internet.</p>
            <button type="button" data-action="reload" style="padding: 0.6rem 1.4rem; background: var(--bg-card); border: 1px solid var(--bg-card-border-glow); color: var(--text-accent); border-radius: 9999px; cursor: pointer;">Tentar novamente</button>
          </div>
        `;
        const retry = versesDisplayArea.querySelector('[data-action="reload"]');
        if (retry) retry.addEventListener('click', () => location.reload());
        return;
      }
    }

    // Capítulo fora do intervalo do livro (ex.: /biblia?book=gn&ch=99)
    if (currentChapter < 1 || currentChapter > book.chapters_count) currentChapter = 1;

    // Atualizar Cabeçalhos
    currentBookName.textContent = book.name;
    currentBookGreek.textContent = book.greek ? `(${book.greek})` : '';
    currentChapNum.textContent = currentChapter;
    currentTestamentBadge.textContent = getTestamentLabel(book.testament);

    if (headerBookTitle) {
      headerBookTitle.textContent = book.name;
      headerBookTitle.style.cursor = 'pointer';
      headerBookTitle.title = `Ver todos os capítulos de ${book.name}`;
      headerBookTitle.onclick = () => renderBookChaptersView(book, { push: true });
    }
    if (headerBookGreek) headerBookGreek.textContent = book.greek || '';
    if (headerChapTitle) headerChapTitle.textContent = `Capítulo ${currentChapter}`;
    if (headerCanonBadge) headerCanonBadge.textContent = getTestamentLabel(book.testament);

    // Card Cabeçalho do Capítulo (Estilo Referência)
    const chapterHeaderTitle = document.getElementById('chapter-header-title');
    if (chapterHeaderTitle) {
      chapterHeaderTitle.textContent = `${book.name} ${currentChapter}`;
      chapterHeaderTitle.style.cursor = 'pointer';
      chapterHeaderTitle.title = `Ver todos os capítulos de ${book.name}`;
      chapterHeaderTitle.onclick = () => renderBookChaptersView(book, { push: true });
    }
    const chapterHeaderSub = document.getElementById('chapter-header-sub');
    if (chapterHeaderSub) {
      chapterHeaderSub.textContent = 'Carregando versículos...';
    }

    // Breadcrumb dinâmico no topo do capítulo
    const slug = getBookSlug(book);
    const breadcrumbBookLink = document.getElementById('breadcrumb-book-link');
    if (breadcrumbBookLink) {
      breadcrumbBookLink.textContent = book.name;
      breadcrumbBookLink.href = `/biblia/${slug}/`;
      breadcrumbBookLink.onclick = (e) => {
        e.preventDefault();
        renderBookChaptersView(book, { push: true });
      };
    }
    const breadcrumbChapCurrent = document.getElementById('breadcrumb-chap-current');
    if (breadcrumbChapCurrent) {
      breadcrumbChapCurrent.textContent = `Capítulo ${currentChapter}`;
    }

    // Paginações Superior e Inferior
    const topChapInfo = document.getElementById('top-chap-info');
    if (topChapInfo) topChapInfo.textContent = `${currentChapter} / ${book.chapters_count}`;
    if (bottomChapIndicator) bottomChapIndicator.textContent = `${currentChapter} / ${book.chapters_count}`;

    // URL limpa (/biblia/<livro>/<capítulo>), título e metadados; guarda onde o leitor parou
    syncUrl(book, opts.push === true);
    updateHeadMeta(book);
    renderChapterLinks(book);
    Store.setJSON('unoteismo_last_read', {
      b: book.id, c: currentChapter,
      path: chapterUrlPath(book, currentChapter),
      label: `${book.name} ${currentChapter}`,
      ts: Date.now()
    });

    // Atualizar mini-pontos (desativados conforme solicitação visual)
    if (bibleDotIndicators) {
      bibleDotIndicators.innerHTML = '';
    }

    // Atualizar estado de botões de capítulo anterior/próximo
    const isFirst = currentChapter <= 1;
    const isLast = currentChapter >= book.chapters_count;
    if (prevChapBtn) prevChapBtn.disabled = isFirst;
    if (bottomPrevBtn) bottomPrevBtn.disabled = isFirst;
    if (nextChapBtn) nextChapBtn.disabled = isLast;
    if (bottomNextBtn) bottomNextBtn.disabled = isLast;
    const topChapPrev = document.getElementById('top-chap-prev');
    const topChapNext = document.getElementById('top-chap-next');
    if (topChapPrev) topChapPrev.disabled = isFirst;
    if (topChapNext) topChapNext.disabled = isLast;

    // Se o servidor já entregou este capítulo em HTML (SSR), mantém o texto na tela até o JS trocar
    const ssrKey = versesDisplayArea.dataset.ssr;
    const reuseSsr = ssrKey === `${book.id}/${currentChapter}` && currentMode === 'pt';
    delete versesDisplayArea.dataset.ssr;

    clearVerseSelection();

    // Estado de Loading
    if (!reuseSsr) {
      versesDisplayArea.innerHTML = `
        <div class="loading-state" role="status">
          <div class="spinner-circle"></div>
          <span>Carregando texto sagrado...</span>
        </div>
      `;
    }

    // Buscar dados necessários via API D1 ou fallback local
    let ptVerses = [];
    let intVerses = [];

    const renderToken = ++renderSeq;
    if (currentMode === 'pt' || currentMode === 'parallel') {
      ptVerses = await getChapterVerses(currentBookId, currentChapter, 'pt');
    }
    if (currentMode === 'int' || currentMode === 'parallel') {
      intVerses = await getChapterVerses(currentBookId, currentChapter, 'int');
    }
    // Uma navegação mais recente já assumiu: descarta este resultado
    if (renderToken !== renderSeq) return;

    // RENDERIZAR DE ACORDO COM O MODO
    if (currentMode === 'pt') {
      renderModePT(ptVerses);
    } else if (currentMode === 'int') {
      renderModeINT(intVerses);
    } else if (currentMode === 'parallel') {
      renderModeParallel(ptVerses, intVerses);
    }

    const vCount = (ptVerses && ptVerses.length) || (intVerses && intVerses.length) || 0;
    const finalHeaderSub = document.getElementById('chapter-header-sub');
    if (finalHeaderSub && vCount > 0) {
      finalHeaderSub.textContent = `${vCount} versículos`;
    }

    updateHeadMeta(book, ptVerses);
    applyBookmarksToDom();

    // Sincronizar o Narrador de Áudio com o capítulo carregado
    if (typeof BibleNarrator !== 'undefined') {
      BibleNarrator.onChapterLoaded(ptVerses, intVerses);
    }

    // Apenas reposiciona no topo se o usuário já tiver rolado a página
    if (window.scrollY > 150) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }

  let renderSeq = 0;

  // ---- URL, título e metadados por capítulo ----------------------------------
  function chapterUrlPath(book, ch) {
    return `/biblia/${getBookSlug(book)}/${ch}`;
  }

  function syncUrl(book, push) {
    try {
      if (!window.history || !window.history.replaceState) return;
      const url = new URL(window.location.href);
      if (window.location.pathname.endsWith('.html')) {
        // Servidor estático simples (sem rotas limpas): mantém o formato ?book=&ch=
        url.searchParams.set('book', book.id);
        url.searchParams.set('ch', currentChapter);
      } else {
        url.pathname = chapterUrlPath(book, currentChapter);
        ['book', 'b', 'ch', 'c', 'cap', 'm'].forEach(k => url.searchParams.delete(k));
      }
      url.searchParams.delete('q');
      if (currentMode !== 'pt') url.searchParams.set('mode', currentMode);
      else url.searchParams.delete('mode');
      if (push) url.hash = '';
      const next = url.pathname + url.search + url.hash;
      if (next === window.location.pathname + window.location.search + window.location.hash) return;
      window.history[push ? 'pushState' : 'replaceState']({ b: book.id, c: currentChapter }, '', next);
    } catch (e) {}
  }

  function setHeadTag(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  }

  function updateHeadMeta(book, verses) {
    const title = `${book.name} ${currentChapter} — Bíblia Sagrada Online | Unoteísmo`;
    document.title = title;
    const canonical = document.querySelector('link[rel="canonical"]');
    let origin = window.location.origin;
    try { if (canonical) origin = new URL(canonical.href).origin; } catch (e) {}
    const url = origin + chapterUrlPath(book, currentChapter);
    if (canonical) canonical.setAttribute('href', url);
    setHeadTag('meta[property="og:url"]', 'content', url);
    setHeadTag('meta[property="og:title"]', 'content', title);
    setHeadTag('meta[name="twitter:title"]', 'content', title);
    if (verses && verses.length) {
      let text = verses.map(v => v.t).join(' ').replace(/\s+/g, ' ').trim();
      const head = `${book.name} ${currentChapter}: `;
      if (text.length > 158 - head.length) text = text.slice(0, 157 - head.length).replace(/\s+\S*$/, '') + '…';
      const desc = head + text;
      setHeadTag('meta[name="description"]', 'content', desc);
      setHeadTag('meta[property="og:description"]', 'content', desc);
      setHeadTag('meta[name="twitter:description"]', 'content', desc);
    }
  }

  // Lista de capítulos do livro em <a> reais (rastreáveis e navegáveis sem JS)
  function renderChapterLinks(book) {
    const nav = document.getElementById('chapter-links');
    if (!nav) return;
    const idx = books.findIndex(b => b.id === book.id);
    const prev = currentChapter > 1
      ? { book, n: currentChapter - 1 }
      : (idx > 0 ? { book: books[idx - 1], n: books[idx - 1].chapters_count } : null);
    const next = currentChapter < book.chapters_count
      ? { book, n: currentChapter + 1 }
      : (idx < books.length - 1 ? { book: books[idx + 1], n: 1 } : null);
    const a = (t, rel) => t
      ? `<a rel="${rel}" href="${chapterUrlPath(t.book, t.n)}" data-bid="${t.book.id}" data-ch="${t.n}">${rel === 'prev' ? '← ' : ''}${escapeHtml(t.book.name)} ${t.n}${rel === 'next' ? ' →' : ''}</a>`
      : '<span></span>';
    const items = book.chapters.map(c =>
      `<li><a href="${chapterUrlPath(book, c)}" data-bid="${book.id}" data-ch="${c}"${c === currentChapter ? ' aria-current="page"' : ''}>${c}</a></li>`
    ).join('');
    nav.setAttribute('aria-label', `Capítulos de ${book.name}`);
    nav.innerHTML =
      `<h2 class="chapter-links-title">Capítulos de ${escapeHtml(book.name)}</h2>` +
      `<ol class="chapter-links-list">${items}</ol>` +
      `<p class="chapter-links-step">${a(prev, 'prev')}${a(next, 'next')}</p>`;
  }

  // Links internos de capítulo navegam sem recarregar a página
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('a[data-bid][data-ch], a.seo-book-pill[data-book]');
    if (!link) return;
    const bid = link.dataset.bid || link.dataset.book;
    const ch = parseInt(link.dataset.ch || link.dataset.chap || '1', 10);
    const book = books.find(b => b.id === bid);
    if (!book) return;
    e.preventDefault();
    currentBookId = book.id;
    currentChapter = ch;
    renderChapterContent({ push: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  });

  // Botão Voltar/Avançar do navegador
  window.addEventListener('popstate', () => {
    const loc = parseLocation();
    const book = books.find(b => b.id === loc.book || getBookSlug(b) === loc.book);
    if (!book) return;
    currentBookId = book.id;
    if (loc.chapter > 0) {
      currentChapter = loc.chapter;
      currentView = 'chapter';
      if (loc.mode) currentMode = loc.mode;
      else if (!window.location.search.includes('mode=')) currentMode = 'pt';
      setReadingMode(currentMode);
    } else {
      renderBookChaptersView(book, { push: false });
    }
  });

  // Modo 1: Tradução Unoteísta (PT)
  function renderModePT(verses) {
    if (!verses.length) {
      versesDisplayArea.innerHTML = `<div class="empty-chapter">Capítulo não disponível nesta seção.</div>`;
      return;
    }

    let html = '';
    verses.forEach(v => {
      html += `
        <div class="pt-verse-row" id="v-${v.v}" data-verse="${v.v}">
          <button type="button" class="verse-audio-btn" data-verse="${v.v}" title="Ouvir a partir do versículo ${v.v}" aria-label="Ouvir a partir do versículo ${v.v}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 19 12 6 20 6 4"></polygon>
            </svg>
          </button>
          <span class="pt-v-num" data-verse="${v.v}" title="Versículo ${v.v}">${v.v}</span>
          <span class="pt-v-text">${escapeHtml(v.t)}</span>
        </div>
      `;
    });
    versesDisplayArea.innerHTML = html;
    bindVerseAudioButtons();
  }

  // Modo 2: Interlinear (Grego/Português)
  function renderModeINT(verses) {
    if (!verses.length) {
      versesDisplayArea.innerHTML = `<div class="empty-chapter">Versão Interlinear não disponível para este capítulo.</div>`;
      return;
    }

    let html = '';
    verses.forEach(v => {
      let wordsHtml = '';
      (v.pairs || []).forEach(pair => {
        wordsHtml += `
          <div class="word-tile" data-greek="${escapeHtml(pair.g)}" data-pt="${escapeHtml(pair.p)}" data-idx="${escapeHtml(pair.i)}" role="button" tabindex="0" title="Clique para ver no dicionário">
            <span class="wt-greek" lang="grc">${escapeHtml(pair.g) || '—'}</span>
            <span class="wt-pt">${escapeHtml(pair.p) || '—'}</span>
            <span class="wt-idx">${escapeHtml(pair.i)}</span>
          </div>
        `;
      });

      html += `
        <div class="interlinear-verse-card" id="v-int-${v.v}" data-verse="${v.v}">
          <div class="int-v-header">
            <span class="int-v-badge">Versículo ${v.v}</span>
            <button type="button" class="verse-audio-btn" data-verse="${v.v}" title="Ouvir a partir do versículo ${v.v}" aria-label="Ouvir a partir do versículo ${v.v}">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 19 12 6 20 6 4"></polygon>
              </svg>
            </button>
          </div>
          <div class="interlinear-words-flow">
            ${wordsHtml}
          </div>
          <div class="int-literal-footer">
            ${escapeHtml(v.p)}
          </div>
        </div>
      `;
    });

    versesDisplayArea.innerHTML = html;
    bindWordTileClicks();
    bindVerseAudioButtons();
  }

  // Modo 3: Paralelo / Comparativo (Lado a Lado)
  function renderModeParallel(ptVerses, intVerses) {
    const maxV = Math.max(
      ptVerses.length ? ptVerses[ptVerses.length - 1].v : 0,
      intVerses.length ? intVerses[intVerses.length - 1].v : 0
    );

    const ptMap = {};
    ptVerses.forEach(v => { ptMap[v.v] = v.t; });

    const intMap = {};
    intVerses.forEach(v => { intMap[v.v] = v; });

    let html = `
      <div class="parallel-col-header">
        <span>Tradução Unoteísta (PT-BR)</span> &nbsp;&nbsp;&bull;&nbsp;&nbsp;
        <span>Interlinear Grego-Português</span>
      </div>
    `;

    for (let v = 1; v <= maxV; v++) {
      const ptText = ptMap[v] || '';
      const intObj = intMap[v];

      let wordsHtml = '';
      if (intObj && intObj.pairs) {
        intObj.pairs.forEach(pair => {
          wordsHtml += `
            <div class="word-tile" data-greek="${escapeHtml(pair.g)}" data-pt="${escapeHtml(pair.p)}" data-idx="${escapeHtml(pair.i)}" role="button" tabindex="0" title="Clique para ver no dicionário">
              <span class="wt-greek" lang="grc">${escapeHtml(pair.g) || '—'}</span>
              <span class="wt-pt">${escapeHtml(pair.p) || '—'}</span>
              <span class="wt-idx">${escapeHtml(pair.i)}</span>
            </div>
          `;
        });
      }

      html += `
        <div class="parallel-verse-pair" id="v-pair-${v}" data-verse="${v}">
          <div class="parallel-pt-box">
            <div class="int-v-header" style="margin-bottom: 8px;">
              <span class="int-v-badge">Versículo ${v}</span>
              <button type="button" class="verse-audio-btn" data-verse="${v}" title="Ouvir a partir do versículo ${v}" aria-label="Ouvir a partir do versículo ${v}">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 4 19 12 6 20 6 4"></polygon>
                </svg>
              </button>
            </div>
            <div class="pt-v-text">${escapeHtml(ptText) || '—'}</div>
          </div>
          <div class="parallel-int-box">
            <div class="interlinear-words-flow">
              ${wordsHtml || '<span style="color:var(--text-muted);">Sem interlinear correspondente</span>'}
            </div>
            ${intObj && intObj.p ? `<div class="int-literal-footer">${escapeHtml(intObj.p)}</div>` : ''}
          </div>
        </div>
      `;
    }

    versesDisplayArea.innerHTML = html;
    bindWordTileClicks();
    bindVerseAudioButtons();
  }

  // 8.5 Integração de Interatividade nos Versículos
  function bindVerseAudioButtons() {
    versesDisplayArea.querySelectorAll('.verse-audio-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const vNum = parseInt(btn.dataset.verse, 10);
        if (typeof BibleNarrator !== 'undefined') {
          BibleNarrator.playFromVerse(vNum);
        }
      });
    });

    versesDisplayArea.querySelectorAll('.pt-v-num').forEach(numSpan => {
      numSpan.style.cursor = 'pointer';
      numSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        const vNum = parseInt(numSpan.dataset.verse, 10);
        if (typeof BibleNarrator !== 'undefined') {
          BibleNarrator.playFromVerse(vNum);
        }
      });
    });
  }

  // 9. Interação com Palavras Gregas (Clique -> Popover / Dicionário)
  function bindWordTileClicks() {
    const tiles = versesDisplayArea.querySelectorAll('.word-tile');
    tiles.forEach(tile => {
      tile.addEventListener('click', (e) => {
        e.stopPropagation();
        const greek = tile.dataset.greek;
        if (!greek || greek === '—') return;

        // Remover destaque anterior
        tiles.forEach(t => t.classList.remove('active-word'));
        tile.classList.add('active-word');

        lookupAndShowPopover(greek, tile);
      });
      tile.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          tile.click();
        }
      });
    });
  }

  async function lookupAndShowPopover(greekWord, anchorElement) {
    const cleanWord = greekWord.replace(/[.,;·!?()\"“”\s]/g, '').trim();
    const norm = stripAccents(cleanWord);

    let match = (dictExact && dictExact[norm]) ? dictExact[norm] : null;
    let apiReachable = false;

    if (!match) {
      try {
        const res = await fetch(`/api/word?q=${encodeURIComponent(norm)}`);
        if (res.ok) {
          apiReachable = true;
          const row = await res.json();
          if (row && row.word) {
            match = {
              w: row.word,
              l: row.lemma,
              t: row.trans,
              g: row.gram,
              f: row.freq,
              tr: row.translit,
              pr: row.pronounce,
              s: row.senses,
              th: row.theology
            };
            if (!dictExact) dictExact = {};
            dictExact[norm] = match;
          }
        }
      } catch (e) {}
    }

    // Ambiente local (sem a API do Worker): usa o dicionário estático
    if (!match && !apiReachable) {
      await loadDictExactLocal();
      match = (dictExact && dictExact[norm]) ? dictExact[norm] : null;
    }

    popWord.textContent = cleanWord;
    popLemma.textContent = (match && match.l && match.l !== cleanWord) ? `(${match.l})` : '';
    popTranslit.textContent = (match && match.tr) ? match.tr : '';

    // Badges: Pronúncia, Frequência Canônica, Gramática
    if (match && match.pr) {
      popPronounce.textContent = `/${match.pr}/`;
      popPronounce.style.display = 'inline-block';
    } else {
      popPronounce.style.display = 'none';
    }

    if (match && match.f) {
      popFreqBadge.textContent = `${match.f.toLocaleString('pt-BR')}x no Cânon`;
      popFreqBadge.style.display = 'inline-block';
    } else {
      popFreqBadge.style.display = 'none';
    }

    if (match && match.g) {
      popGramBadge.textContent = match.g;
      popGramBadge.style.display = 'inline-block';
    } else {
      popGramBadge.style.display = 'none';
    }

    popTrans.textContent = match ? match.t : 'Consultar no Léxico Grego Completo...';

    // Aceções em Português Enriquecidas
    if (match && match.s) {
      popSenses.textContent = match.s;
      popSenses.style.display = 'block';
    } else {
      popSenses.style.display = 'none';
    }

    // Exegese Teológica
    if (match && match.th) {
      popTheol.textContent = match.th.length > 240 ? match.th.slice(0, 240) + '...' : match.th;
      popTheol.style.display = 'block';
    } else {
      popTheol.style.display = 'none';
    }

    let obsText = (match && match.g) ? match.g : (match ? '' : 'Clique abaixo para pesquisar no Léxico');
    popObs.textContent = obsText;
    popObs.style.display = obsText ? 'block' : 'none';

    currentPopoverWord = cleanWord;

    // Posicionar popover próximo ao elemento clicado mantendo dentro dos limites da tela
    const rect = anchorElement.getBoundingClientRect();
    quickPopover.style.display = 'block';

    const popWidth = Math.min(340, window.innerWidth - 24);
    let left = rect.left;
    if (left + popWidth > window.innerWidth - 12) {
      left = window.innerWidth - popWidth - 12;
    }
    if (left < 10) left = 10;

    let top = rect.bottom + 8;
    const popHeight = quickPopover.offsetHeight || 220;
    if (top + popHeight > window.innerHeight - 10) {
      top = Math.max(10, rect.top - popHeight - 8);
    }

    quickPopover.style.top = `${Math.max(10, top)}px`;
    quickPopover.style.left = `${Math.max(10, left)}px`;
  }

  popClose.addEventListener('click', () => {
    quickPopover.style.display = 'none';
    const active = versesDisplayArea.querySelector('.word-tile.active-word');
    if (active) active.focus();
  });

  popFullBtn.addEventListener('click', () => {
    quickPopover.style.display = 'none';
    openDictionaryWithSearch(currentPopoverWord || '');
  });

  document.addEventListener('click', (e) => {
    if (!quickPopover.contains(e.target)) {
      quickPopover.style.display = 'none';
    }
  });

  // ---- Acessibilidade: diálogos (foco preso, Esc fecha, foco volta ao botão de origem) ----
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const dialogStack = [];

  // Em toques (Safari/iOS) o botão não recebe foco: guardamos o último controle acionado
  let lastTrigger = null;
  document.addEventListener('click', (e) => {
    lastTrigger = e.target.closest('button, a, [role="button"]');
  }, true);

  function openDialog(el, close, focusEl) {
    if (!el) return;
    el.setAttribute('aria-hidden', 'false');
    const opener = (document.activeElement && document.activeElement !== document.body) ? document.activeElement : lastTrigger;
    const i = dialogStack.findIndex(d => d.el === el);
    if (i >= 0) dialogStack.splice(i, 1);
    dialogStack.push({ el, close, opener });
    setTimeout(() => {
      const target = focusEl || el.querySelector(FOCUSABLE);
      if (target && typeof target.focus === 'function') target.focus();
    }, 40);
  }

  function dialogClosed(el) {
    if (!el) return;
    el.setAttribute('aria-hidden', 'true');
    const i = dialogStack.findIndex(d => d.el === el);
    if (i < 0) return;
    const [{ opener }] = dialogStack.splice(i, 1);
    if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
  }

  document.addEventListener('keydown', (e) => {
    const top = dialogStack[dialogStack.length - 1];
    if (!top) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      top.close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = Array.from(top.el.querySelectorAll(FOCUSABLE)).filter(n => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !top.el.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !top.el.contains(document.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  });

  // 10. Grade e Modal de Seleção de Livros
  function renderBooksGrid() {
    let filtered = books;
    if (activeCategoryFilter !== 'all') {
      filtered = books.filter(b => b.testament === activeCategoryFilter);
    }

    const query = stripAccents(bookSearchInput.value.trim());
    if (query) {
      filtered = filtered.filter(b => 
        stripAccents(b.name).includes(query) || 
        stripAccents(b.abbr).includes(query) || 
        stripAccents(b.greek || '').includes(query)
      );
    }

    let html = '';
    filtered.forEach(b => {
      const isSelected = b.id === currentBookId;
      html += `
        <div class="book-grid-card ${isSelected ? 'active-book' : ''}" data-bid="${b.id}" role="button" tabindex="0"${isSelected ? ' aria-current="true"' : ''}>
          <div class="book-card-name">${b.name}</div>
          <div class="book-card-sub">
            <span class="book-card-greek" lang="grc">${b.greek || ''}</span>
            <span class="book-card-abbr">${b.abbr} • ${b.chapters_count} cap.</span>
          </div>
        </div>
      `;
    });

    booksGridContainer.innerHTML = html || '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum livro encontrado.</div>';

    // Vincular cliques nos cards de livros
    booksGridContainer.querySelectorAll('.book-grid-card').forEach(card => {
      const choose = () => {
        const bid = card.dataset.bid;
        selectBook(bid);
        closeBooksModalDialog();
      };
      card.addEventListener('click', choose);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); }
      });
    });
  }

  function selectBook(bid) {
    currentBookId = bid;
    const book = books.find(b => b.id === bid);
    if (book) {
      renderBookChaptersView(book, { push: true });
    } else {
      currentChapter = 1;
      renderChapterContent({ push: true });
    }
  }

  bookSelectorBtn.addEventListener('click', () => {
    booksModal.classList.add('active');
    bookSelectorBtn.setAttribute('aria-expanded', 'true');
    bookSearchInput.value = '';
    renderBooksGrid();
    openDialog(booksModal, closeBooksModalDialog, bookSearchInput);
  });

  function closeBooksModalDialog() {
    booksModal.classList.remove('active');
    bookSelectorBtn.setAttribute('aria-expanded', 'false');
    dialogClosed(booksModal);
  }

  closeBooksModal.addEventListener('click', closeBooksModalDialog);
  booksModal.addEventListener('click', (e) => {
    if (e.target === booksModal) closeBooksModalDialog();
  });

  canonTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      canonTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategoryFilter = tab.dataset.filter;
      renderBooksGrid();
    });
  });

  bookSearchInput.addEventListener('input', renderBooksGrid);

  // 11. Modal de Seleção de Capítulos
  chapterSelectorBtn.addEventListener('click', () => {
    const book = books.find(b => b.id === currentBookId);
    if (!book) return;

    chapModalBookTitle.textContent = `${book.name} — Capítulos`;
    let html = '';
    book.chapters.forEach(ch => {
      const isActive = ch === currentChapter;
      html += `
        <div class="chap-grid-item ${isActive ? 'active-chap' : ''}" data-chap="${ch}" role="button" tabindex="0"${isActive ? ' aria-current="true"' : ''}>
          ${ch}
        </div>
      `;
    });
    chaptersGridContainer.innerHTML = html;

    chaptersGridContainer.querySelectorAll('.chap-grid-item').forEach(item => {
      const choose = () => {
        currentChapter = parseInt(item.dataset.chap);
        closeChaptersModalDialog();
        renderChapterContent({ push: true });
      };
      item.addEventListener('click', choose);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); }
      });
    });

    chaptersModal.classList.add('active');
    chapterSelectorBtn.setAttribute('aria-expanded', 'true');
    openDialog(chaptersModal, closeChaptersModalDialog, chaptersGridContainer.querySelector('.active-chap') || undefined);
  });

  function closeChaptersModalDialog() {
    chaptersModal.classList.remove('active');
    chapterSelectorBtn.setAttribute('aria-expanded', 'false');
    dialogClosed(chaptersModal);
  }

  closeChaptersModal.addEventListener('click', closeChaptersModalDialog);
  chaptersModal.addEventListener('click', (e) => {
    if (e.target === chaptersModal) closeChaptersModalDialog();
  });

  // 12. Navegação Rápida de Capítulos (Anterior / Próximo)
  function nextChapter(fromNarrator = false) {
    const book = books.find(b => b.id === currentBookId);
    if (book && currentChapter < book.chapters_count) {
      currentChapter++;
      renderChapterContent({ push: !fromNarrator });
      return true;
    } else {
      const currentIdx = books.findIndex(b => b.id === currentBookId);
      if (currentIdx !== -1 && currentIdx < books.length - 1) {
        currentBookId = books[currentIdx + 1].id;
        currentChapter = 1;
        renderChapterContent({ push: !fromNarrator });
        return true;
      }
      return false;
    }
  }

  function prevChapter() {
    if (currentChapter > 1) {
      currentChapter--;
      renderChapterContent({ push: true });
      return true;
    } else {
      const currentIdx = books.findIndex(b => b.id === currentBookId);
      if (currentIdx > 0) {
        const prevBook = books[currentIdx - 1];
        currentBookId = prevBook.id;
        currentChapter = prevBook.chapters_count;
        renderChapterContent({ push: true });
        return true;
      }
      return false;
    }
  }

  if (nextChapBtn) nextChapBtn.addEventListener('click', () => nextChapter());
  if (prevChapBtn) prevChapBtn.addEventListener('click', () => prevChapter());
  if (bottomNextBtn) bottomNextBtn.addEventListener('click', () => nextChapter());
  if (bottomPrevBtn) bottomPrevBtn.addEventListener('click', () => prevChapter());
  const topChapPrevBtn = document.getElementById('top-chap-prev');
  const topChapNextBtn = document.getElementById('top-chap-next');
  if (topChapPrevBtn) topChapPrevBtn.addEventListener('click', () => prevChapter());
  if (topChapNextBtn) topChapNextBtn.addEventListener('click', () => nextChapter());

  window.addEventListener('keydown', (e) => {
    if (dialogStack.length) return; // com um diálogo aberto, as setas não trocam de capítulo
    if (['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') {
      nextChapter();
    } else if (e.key === 'ArrowLeft') {
      prevChapter();
    } else if (e.key === 'Escape') {
      quickPopover.style.display = 'none';
      clearVerseSelection();
    }
  });

  // 13. GAVETA DO DICIONÁRIO GREGO (59.714 VERBETES)
  async function loadSearchIndex() {
    if (dictSearchIndex) return dictSearchIndex;
    try {
      const res = await fetch('/data/dict_search_index.json');
      dictSearchIndex = await res.json();
      return dictSearchIndex;
    } catch (e) {
      console.error('Erro ao carregar índice de busca:', e);
      return [];
    }
  }

  function openDictionaryWithSearch(term = '') {
    dictDrawer.classList.add('open');
    dictOverlay.classList.add('active');
    openDialog(dictDrawer, closeDictionaryDrawer, dictSearchInput);
    dictSearchInput.value = term;
    if (term) {
      clearDictSearch.style.display = 'block';
      performDictSearch(term);
    } else {
      clearDictSearch.style.display = 'none';
      dictEmptyState.style.display = 'block';
      dictResultsList.innerHTML = '';
    }
    dictSearchInput.focus();
  }

  function closeDictionaryDrawer() {
    dictDrawer.classList.remove('open');
    dictOverlay.classList.remove('active');
    dialogClosed(dictDrawer);
  }

  openDictBtn.addEventListener('click', () => openDictionaryWithSearch(''));
  closeDictBtn.addEventListener('click', closeDictionaryDrawer);
  dictOverlay.addEventListener('click', closeDictionaryDrawer);

  let searchTimeout = null;
  dictSearchInput.addEventListener('input', () => {
    const val = dictSearchInput.value.trim();
    clearDictSearch.style.display = val ? 'block' : 'none';

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performDictSearch(val);
    }, 200);
  });

  clearDictSearch.addEventListener('click', () => {
    dictSearchInput.value = '';
    clearDictSearch.style.display = 'none';
    dictEmptyState.style.display = 'block';
    dictResultsList.innerHTML = '';
    dictSearchInput.focus();
  });

  function renderDictCard(r) {
    const showLemma = r.l && r.l !== r.w;
    const translitHtml = r.tr ? `<span class="dict-card-translit">${r.tr}</span>` : '';
    const lemmaHtml = showLemma ? `<span class="dict-card-lemma" lang="grc">(${r.l})</span>` : '';
    const freqHtml = r.f ? `<span class="dict-card-freq" title="Frequência canônica">${r.f.toLocaleString('pt-BR')}x no Cânon</span>` : '';

    let metaHtml = '';
    if (r.pr) {
      metaHtml += `<span class="dict-meta-badge dict-meta-pronounce" title="Pronúncia Fonética">/${r.pr}/</span>`;
    }
    if (r.g) {
      metaHtml += `<span class="dict-meta-badge" title="Morfologia">${r.g}</span>`;
    }

    const sensesHtml = r.s ? `<div class="dict-card-senses">${r.s}</div>` : '';
    let theolHtml = '';
    if (r.th) {
      theolHtml = `
        <div class="dict-card-theol">
          <div class="dict-card-theol-title">Exegese Teológica</div>
          <div>${r.th}</div>
        </div>
      `;
    }

    return `
      <div class="dict-card">
        <div class="dict-card-head">
          <span class="dict-card-word" lang="grc">${r.w}</span>
          ${translitHtml}
          ${lemmaHtml}
          ${freqHtml}
        </div>
        ${metaHtml ? `<div class="dict-card-meta">${metaHtml}</div>` : ''}
        <div class="dict-card-trans">${r.t || 'Definição em estudo'}</div>
        ${sensesHtml}
        ${theolHtml}
      </div>
    `;
  }

  async function performDictSearch(query) {
    if (!query) {
      dictEmptyState.style.display = 'block';
      dictResultsList.innerHTML = '';
      return;
    }

    // 1. Tentar API Cloudflare D1
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          dictEmptyState.style.display = 'none';
          if (!rows.length) {
            dictResultsList.innerHTML = `
              <div style="text-align:center; color:var(--text-muted); padding: 3rem 1rem;">
                Nenhum verbete encontrado para "<strong>${query}</strong>".
              </div>
            `;
            return;
          }
          const items = rows.map(r => ({
            w: r.word,
            l: r.lemma,
            t: r.trans,
            g: r.gram,
            f: r.freq,
            tr: r.translit,
            pr: r.pronounce,
            s: r.senses,
            th: r.theology
          }));
          dictResultsList.innerHTML = items.map(renderDictCard).join('');
          return;
        }
      }
    } catch (e) {}

    // 2. Fallback offline
    try {
      const index = await loadSearchIndex();
      const cleanQ = stripAccents(query);

      const results = [];
      for (let i = 0; i < index.length; i++) {
        const item = index[i];
        const wNorm = stripAccents(item.w);
        const lNorm = stripAccents(item.l);
        const tNorm = stripAccents(item.t);
        const trNorm = item.tr ? stripAccents(item.tr) : '';
        const sNorm = (cleanQ.length >= 3 && item.s) ? stripAccents(item.s) : '';

        if (wNorm.includes(cleanQ) || lNorm.includes(cleanQ) || tNorm.includes(cleanQ) || trNorm.includes(cleanQ) || sNorm.includes(cleanQ)) {
          results.push(item);
          if (results.length >= 100) break;
        }
      }

      dictEmptyState.style.display = 'none';
      if (!results.length) {
        dictResultsList.innerHTML = `
          <div style="text-align:center; color:var(--text-muted); padding: 3rem 1rem;">
            Nenhum verbete encontrado para "<strong>${query}</strong>".
          </div>
        `;
        return;
      }

      dictResultsList.innerHTML = results.map(renderDictCard).join('');
    } catch (e) {
      console.error('Erro na pesquisa offline:', e);
    }
  }

  // 13. Navegação Alfabética Rápida (Α a Ω)
  alphaButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      alphaButtons.forEach(b => b.classList.remove('active-letter'));
      btn.classList.add('active-letter');

      const letter = btn.dataset.letter;
      const letterNorm = stripAccents(letter);
      dictSearchInput.value = letter;
      clearDictSearch.style.display = 'block';

      // 1. Tentar API Cloudflare D1 por letra
      try {
        const res = await fetch(`/api/search?letter=${encodeURIComponent(letterNorm)}`);
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const items = rows.map(r => ({
              w: r.word,
              l: r.lemma,
              t: r.trans,
              g: r.gram,
              f: r.freq,
              tr: r.translit,
              pr: r.pronounce,
              s: r.senses,
              th: r.theology
            }));
            renderDictResultsList(items);
            return;
          }
        }
      } catch (e) {}

      // 2. Fallback offline por arquivo particionado
      try {
        const fileName = encodeURIComponent(letterNorm) + '.json';
        const res = await fetch(`/data/dict/${fileName}`);
        if (res.ok) {
          const items = await res.json();
          renderDictResultsList(items.slice(0, 100));
        } else {
          performDictSearch(letter);
        }
      } catch (e) {
        performDictSearch(letter);
      }
    });
  });

  function renderDictResultsList(items) {
    dictEmptyState.style.display = 'none';
    dictResultsList.innerHTML = items.map(renderDictCard).join('');
  }

  // ==========================================================================
  // ==========================================================================
  // MOTOR DO NARRADOR SAGRADO (VOZES NEURAIS IA + CONTINGÊNCIA LOCAL)
  // ==========================================================================
  const NEURAL_VOICES = [
    { id: 'pt-BR-AntonioNeural', name: 'Antônio (Voz Neural IA - Solene)' },
    { id: 'pt-BR-FranciscaNeural', name: 'Francisca (Voz Neural IA - Expressiva)' },
    { id: 'pt-BR-ThalitaMultilingualNeural', name: 'Thalita (Voz Neural IA - Suave)' }
  ];

  const BibleNarrator = {
    synth: window.speechSynthesis || null,
    deviceVoices: [],
    selectedVoiceId: 'pt-BR-AntonioNeural',
    playerA: null,
    playerB: null,
    activePlayer: null,
    preloaderPlayer: null,
    silentAnchor: null,
    wakeLock: null,
    rate: 1.0,
    autoAdvance: true,
    pendingAutoPlay: false,
    nextChapterVersesCache: null,
    unlocked: false,
    userPaused: false,
    verses: [],
    currentIndex: 0,
    isPlaying: false,
    isPaused: false,
    floatingDismissed: false,
    _resumeTimer: null,

    init() {
      this.rate = parseFloat(localStorage.getItem('unoteismo_narrator_speed') || '1');
      if (narratorSpeedSelect) narratorSpeedSelect.value = (this.rate === 1) ? '1' : String(this.rate);

      const savedAuto = localStorage.getItem('unoteismo_narrator_autonext');
      this.autoAdvance = savedAuto !== null ? (savedAuto === 'true') : true;
      if (narratorAutoNextCheckbox) narratorAutoNextCheckbox.checked = this.autoAdvance;

      const savedVoice = localStorage.getItem('unoteismo_narrator_voice');
      if (savedVoice) {
        this.selectedVoiceId = savedVoice;
      }

      this.initAudioPlayers();
      this.loadVoices();

      if (this.synth && this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }

      this.bindEvents();
      this.initScrollWatcher();

      // Reconectar wakeLock e garantir playback contínuo ao voltar de outros apps (ex: WhatsApp)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (this.isPlaying && !this.userPaused) {
            this.requestWakeLock();
            this.updateUI();
            if (this.activePlayer && this.activePlayer.paused && this.activePlayer.src) {
              this.activePlayer.play().catch(() => {});
            }
            if (this.silentAnchor && this.silentAnchor.paused) {
              this.silentAnchor.play().catch(() => {});
            }
          }
        }
      });
    },

    initAudioPlayers() {
      // 1. Âncora de Silêncio Contínuo (Impede o Android/iOS de suspender a aba quando o app vai para segundo plano)
      if (!this.silentAnchor) {
        let el = document.getElementById('bible-silent-anchor');
        if (!el) {
          el = document.createElement('audio');
          el.id = 'bible-silent-anchor';
          el.setAttribute('playsinline', '');
          el.setAttribute('webkit-playsinline', '');
          el.loop = true;
          el.volume = 0.01;
          el.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
          document.body.appendChild(el);
        }
        this.silentAnchor = el;
      }

      // 2. Player A (Duplo Buffer)
      if (!this.playerA) {
        let elA = document.getElementById('bible-audio-player-a');
        if (!elA) {
          elA = document.createElement('audio');
          elA.id = 'bible-audio-player-a';
          elA.setAttribute('playsinline', '');
          elA.setAttribute('webkit-playsinline', '');
          elA.preload = 'auto';
          document.body.appendChild(elA);
        }
        this.playerA = elA;
        this.bindPlayerEvents(this.playerA, 'A');
      }

      // 3. Player B (Duplo Buffer)
      if (!this.playerB) {
        let elB = document.getElementById('bible-audio-player-b');
        if (!elB) {
          elB = document.createElement('audio');
          elB.id = 'bible-audio-player-b';
          elB.setAttribute('playsinline', '');
          elB.setAttribute('webkit-playsinline', '');
          elB.preload = 'auto';
          document.body.appendChild(elB);
        }
        this.playerB = elB;
        this.bindPlayerEvents(this.playerB, 'B');
      }

      if (!this.activePlayer) {
        this.activePlayer = this.playerA;
        this.preloaderPlayer = this.playerB;
      }
    },

    bindPlayerEvents(player, id) {
      player.onended = () => {
        if (!this.isPlaying || this.userPaused) return;
        if (this.activePlayer === player) {
          this.handleVerseEnded();
        }
      };

      player.onplay = () => {
        this.isPlaying = true;
        this.isPaused = false;
        this.userPaused = false;
        this.updateUI();
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      };

      player.onpause = () => {
        if (this.userPaused) {
          this.isPaused = true;
          this.updateUI();
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
          }
          return;
        }

        // Se pausou por evento do sistema (ex: notificação sonora do WhatsApp ou áudio ducking)
        if (this.isPlaying && !this.userPaused && !player.ended) {
          if (this._resumeTimer) clearTimeout(this._resumeTimer);
          this._resumeTimer = setTimeout(() => {
            if (this.isPlaying && !this.userPaused && player.paused && player.src) {
              player.play().catch(() => {});
              if (this.silentAnchor && this.silentAnchor.paused) {
                this.silentAnchor.play().catch(() => {});
              }
            }
          }, 350);
        }
      };

      player.onerror = (e) => {
        if (!this.isPlaying || this.userPaused) return;
        if (this.activePlayer === player) {
          console.warn(`[Player ${id}] Erro no áudio do versículo, recuperando...`, e);
          setTimeout(() => {
            if (this.isPlaying && !this.userPaused) {
              this.handleVerseEnded();
            }
          }, 300);
        }
      };
    },

    unlockAudioContext() {
      if (this.unlocked) return;
      this.unlocked = true;

      if (this.silentAnchor) {
        this.silentAnchor.play().catch(() => {});
      }

      [this.playerA, this.playerB].forEach(p => {
        if (p && !p.src) {
          p.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
          p.play().then(() => {
            p.pause();
            p.currentTime = 0;
          }).catch(() => {});
        }
      });
    },

    getTtsUrl(cleanText, voiceId) {
      return `/api/tts?text=${encodeURIComponent(cleanText)}&voice=${encodeURIComponent(voiceId)}&rate=${this.rate}`;
    },

    isNeuralVoice(id) {
      return NEURAL_VOICES.some(v => v.id === id);
    },

    async requestWakeLock() {
      try {
        if ('wakeLock' in navigator && !this.wakeLock) {
          this.wakeLock = await navigator.wakeLock.request('screen');
          this.wakeLock.addEventListener('release', () => {
            this.wakeLock = null;
          });
        }
      } catch (_) {}
    },

    releaseWakeLock() {
      if (this.wakeLock) {
        try {
          this.wakeLock.release();
        } catch (_) {}
        this.wakeLock = null;
      }
    },

    updateMediaSession(index) {
      if (!('mediaSession' in navigator)) return;
      const verse = this.verses[index];
      const vNum = verse ? verse.v : (index + 1);
      const totalV = this.verses.length;
      const book = books.find(b => b.id === currentBookId);
      const bookName = book ? book.name : 'Bíblia';

      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${bookName} ${currentChapter}:${vNum}`,
          artist: 'Bíblia Sagrada Unoteísta',
          album: `${bookName} - Capítulo ${currentChapter} (${totalV} versículos)`,
          artwork: [
            { src: '/logo_unoteismo.png', sizes: '512x512', type: 'image/png' }
          ]
        });

        navigator.mediaSession.playbackState = 'playing';

        navigator.mediaSession.setActionHandler('play', () => this.resume());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.nextVerse());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.prevVerse());
        navigator.mediaSession.setActionHandler('stop', () => this.stop());
      } catch (_) {}
    },

    loadVoices() {
      if (this.synth) {
        const all = this.synth.getVoices() || [];
        this.deviceVoices = all.filter(v => {
          const lang = (v.lang || '').toLowerCase();
          return lang.startsWith('pt') || lang.includes('pt-br') || lang.includes('pt_br') || lang.includes('pt-pt');
        }).sort((a, b) => {
          const aBr = (a.lang || '').toLowerCase().includes('br');
          const bBr = (b.lang || '').toLowerCase().includes('br');
          if (aBr && !bBr) return -1;
          if (!aBr && bBr) return 1;
          return a.name.localeCompare(b.name);
        });
      }

      if (narratorVoiceSelect) {
        const prevValue = narratorVoiceSelect.value || this.selectedVoiceId;
        narratorVoiceSelect.innerHTML = '';

        const neuralGroup = document.createElement('optgroup');
        neuralGroup.label = '✨ Vozes Neurais IA (Voz Natural Humana)';
        NEURAL_VOICES.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v.id;
          opt.textContent = v.name;
          neuralGroup.appendChild(opt);
        });
        narratorVoiceSelect.appendChild(neuralGroup);

        if (this.deviceVoices.length > 0) {
          const localGroup = document.createElement('optgroup');
          localGroup.label = '📱 Vozes Locais do Dispositivo';
          this.deviceVoices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.name;
            let label = v.name.replace(/(Microsoft|Google|Apple)\s*/gi, '').replace(/Online \(Natural\)/gi, 'Neural').trim();
            if ((v.lang || '').toLowerCase().includes('br')) {
              label += ' (BR)';
            } else if ((v.lang || '').toLowerCase().includes('pt')) {
              label += ' (PT)';
            }
            opt.textContent = label;
            localGroup.appendChild(opt);
          });
          narratorVoiceSelect.appendChild(localGroup);
        }

        const exists = Array.from(narratorVoiceSelect.options).some(o => o.value === prevValue);
        if (exists) {
          narratorVoiceSelect.value = prevValue;
          this.selectedVoiceId = prevValue;
        } else {
          narratorVoiceSelect.value = 'pt-BR-AntonioNeural';
          this.selectedVoiceId = 'pt-BR-AntonioNeural';
        }
      }
    },

    bindEvents() {
      if (narratorPlayBtn) {
        narratorPlayBtn.addEventListener('click', () => {
          if (this.isPlaying) {
            if (this.isPaused) this.resume();
            else this.pause();
          } else {
            this.play();
          }
        });
      }

      if (narratorStopBtn) {
        narratorStopBtn.addEventListener('click', () => this.stop());
      }

      if (narratorPrevBtn) {
        narratorPrevBtn.addEventListener('click', () => this.prevVerse());
      }
      if (narratorNextBtn) {
        narratorNextBtn.addEventListener('click', () => this.nextVerse());
      }

      if (narratorSpeedSelect) {
        narratorSpeedSelect.addEventListener('change', (e) => {
          this.rate = parseFloat(e.target.value) || 1.0;
          localStorage.setItem('unoteismo_narrator_speed', String(this.rate));
          if (this.activePlayer) this.activePlayer.playbackRate = this.rate;
          if (this.preloaderPlayer) this.preloaderPlayer.playbackRate = this.rate;
        });
      }

      if (narratorVoiceSelect) {
        narratorVoiceSelect.addEventListener('change', (e) => {
          this.selectedVoiceId = e.target.value;
          localStorage.setItem('unoteismo_narrator_voice', this.selectedVoiceId);
          if (this.isPlaying && !this.isPaused) {
            this.speakVerse(this.currentIndex);
          }
        });
      }

      if (narratorAutoNextCheckbox) {
        narratorAutoNextCheckbox.addEventListener('change', (e) => {
          this.autoAdvance = !!e.target.checked;
          localStorage.setItem('unoteismo_narrator_autonext', String(this.autoAdvance));
        });
      }

      const toggleLabel = document.querySelector('.narrator-toggle-label');
      if (toggleLabel && narratorAutoNextCheckbox) {
        toggleLabel.addEventListener('click', (e) => {
          if (e.target !== narratorAutoNextCheckbox) {
            e.preventDefault();
            narratorAutoNextCheckbox.checked = !narratorAutoNextCheckbox.checked;
            this.autoAdvance = narratorAutoNextCheckbox.checked;
            localStorage.setItem('unoteismo_narrator_autonext', String(this.autoAdvance));
          }
        });
      }

      // Mini Player Flutuante
      if (floatPlayBtn) {
        floatPlayBtn.addEventListener('click', () => {
          if (this.isPlaying) {
            if (this.isPaused) this.resume();
            else this.pause();
          } else {
            this.play();
          }
        });
      }
      if (floatStopBtn) {
        floatStopBtn.addEventListener('click', () => this.stop());
      }
      if (floatPrevBtn) {
        floatPrevBtn.addEventListener('click', () => this.prevVerse());
      }
      if (floatNextBtn) {
        floatNextBtn.addEventListener('click', () => this.nextVerse());
      }
      if (floatCloseBtn) {
        floatCloseBtn.addEventListener('click', () => {
          this.floatingDismissed = true;
          if (narratorFloatingPlayer) narratorFloatingPlayer.style.display = 'none';
        });
      }
    },

    initScrollWatcher() {
      window.addEventListener('scroll', () => {
        if (!narratorBar || !narratorFloatingPlayer) return;
        if (this.floatingDismissed && !this.isPlaying) {
          narratorFloatingPlayer.style.display = 'none';
          return;
        }

        const barRect = narratorBar.getBoundingClientRect();
        const scrolledPast = barRect.bottom < 60;
        if (scrolledPast && (this.isPlaying || this.verses.length > 0)) {
          if (narratorFloatingPlayer.style.display !== 'flex') {
            narratorFloatingPlayer.style.display = 'flex';
          }
        } else {
          if (narratorFloatingPlayer.style.display !== 'none') {
            narratorFloatingPlayer.style.display = 'none';
          }
        }
      }, { passive: true });
    },

    onChapterLoaded(ptVerses, intVerses) {
      let list = [];
      if (ptVerses && ptVerses.length > 0) {
        list = ptVerses.map(v => ({ v: v.v, text: v.t }));
      } else if (intVerses && intVerses.length > 0) {
        list = intVerses.map(v => ({
          v: v.v,
          text: v.p || (v.pairs || []).map(p => p.p).join(' ')
        }));
      }

      this.verses = list;
      this.floatingDismissed = false;

      const shouldAutoPlay = this.pendingAutoPlay;
      this.pendingAutoPlay = false;

      if (shouldAutoPlay && this.verses.length > 0) {
        this.currentIndex = 0;
        this.isPlaying = true;
        this.isPaused = false;
        this.userPaused = false;
        this.speakVerse(0);
      } else if (!this.isPlaying) {
        this.currentIndex = 0;
        this.updateUI();
      }
    },

    play() {
      if (this.verses.length === 0) return;
      this.initAudioPlayers();
      this.unlockAudioContext();
      this.userPaused = false;
      this.isPlaying = true;
      this.isPaused = false;
      this.floatingDismissed = false;

      if (this.silentAnchor && this.silentAnchor.paused) {
        this.silentAnchor.play().catch(() => {});
      }

      this.speakVerse(this.currentIndex);
    },

    pause() {
      this.userPaused = true;
      this.isPaused = true;

      if (this.activePlayer && !this.activePlayer.paused) {
        this.activePlayer.pause();
      }
      if (this.preloaderPlayer && !this.preloaderPlayer.paused) {
        this.preloaderPlayer.pause();
      }
      if (this.silentAnchor && !this.silentAnchor.paused) {
        this.silentAnchor.pause();
      }
      if (this.synth) {
        this.synth.pause();
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      this.updateUI();
    },

    resume() {
      this.initAudioPlayers();
      this.unlockAudioContext();
      this.userPaused = false;
      this.isPaused = false;

      if (this.silentAnchor && this.silentAnchor.paused) {
        this.silentAnchor.play().catch(() => {});
      }

      if (this.activePlayer && this.activePlayer.paused && this.activePlayer.src) {
        this.activePlayer.playbackRate = this.rate;
        this.activePlayer.play().catch(() => {
          this.speakVerse(this.currentIndex);
        });
      } else if (this.synth && this.synth.paused) {
        this.synth.resume();
      } else {
        this.speakVerse(this.currentIndex);
      }

      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      this.requestWakeLock();
      this.updateUI();
    },

    stop() {
      this.userPaused = true;
      this.pendingAutoPlay = false;
      this.nextChapterVersesCache = null;

      if (this.activePlayer) {
        this.activePlayer.pause();
        this.activePlayer.removeAttribute('src');
        this.activePlayer.load();
      }
      if (this.preloaderPlayer) {
        this.preloaderPlayer.pause();
        this.preloaderPlayer.removeAttribute('src');
        this.preloaderPlayer.load();
      }
      if (this.silentAnchor) {
        this.silentAnchor.pause();
        this.silentAnchor.currentTime = 0;
      }
      if (this.synth) {
        this.synth.cancel();
      }

      this.isPlaying = false;
      this.isPaused = false;
      this.unhighlightAll();
      this.releaseWakeLock();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
      this.updateUI();
    },

    playFromVerse(vNum) {
      this.initAudioPlayers();
      this.unlockAudioContext();
      const idx = this.verses.findIndex(v => v.v === vNum);
      if (idx !== -1) {
        this.userPaused = false;
        this.currentIndex = idx;
        this.isPlaying = true;
        this.isPaused = false;
        this.floatingDismissed = false;
        if (this.silentAnchor && this.silentAnchor.paused) {
          this.silentAnchor.play().catch(() => {});
        }
        this.speakVerse(idx);
      }
    },

    nextVerse() {
      if (this.currentIndex < this.verses.length - 1) {
        this.currentIndex++;
        this.speakVerse(this.currentIndex);
      } else {
        if (this.autoAdvance) {
          this.advanceChapterSeamlessly();
        } else {
          this.stop();
        }
      }
    },

    prevVerse() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.speakVerse(this.currentIndex);
      }
    },

    cleanText(raw) {
      return (raw || '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    },

    speakVerse(index) {
      if (this.verses.length === 0) return;
      if (index < 0 || index >= this.verses.length) {
        this.stop();
        return;
      }

      this.initAudioPlayers();
      this.currentIndex = index;
      const verse = this.verses[index];
      this.isPlaying = true;
      this.isPaused = false;

      this.highlightVerse(verse.v);
      this.updateUI();

      if (this.synth) this.synth.cancel();

      const cleanText = this.cleanText(verse.text);
      if (!cleanText) {
        const next = index + 1;
        if (next < this.verses.length) {
          this.speakVerse(next);
        } else if (this.autoAdvance) {
          this.advanceChapterSeamlessly();
        } else {
          this.stop();
        }
        return;
      }

      const voiceId = this.selectedVoiceId || 'pt-BR-AntonioNeural';

      if (this.isNeuralVoice(voiceId)) {
        this.speakNeural(cleanText, voiceId, index);
      } else {
        this.speakSynth(cleanText, index);
      }
    },

    speakNeural(cleanText, voiceId, index) {
      const url = this.getTtsUrl(cleanText, voiceId);

      this.activePlayer.playbackRate = this.rate;
      if (this.activePlayer.src !== url && !this.activePlayer.src.endsWith(url)) {
        this.activePlayer.src = url;
      }

      const playPromise = this.activePlayer.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name !== 'AbortError' && !this.userPaused) {
            console.warn('Falha no play do versículo atual, tentando recarregar...', err);
            setTimeout(() => {
              if (this.isPlaying && !this.userPaused && this.activePlayer) {
                this.activePlayer.play().catch(() => {});
              }
            }, 300);
          }
        });
      }

      this.updateMediaSession(index);
      this.requestWakeLock();

      // Pré-carregar o próximo versículo imediatamente no preloaderPlayer!
      this.preloadNextVerse(index + 1);
    },

    preloadNextVerse(idx) {
      if (idx < this.verses.length) {
        const nextV = this.verses[idx];
        const nextClean = this.cleanText(nextV.text);
        if (nextClean) {
          const voiceId = this.selectedVoiceId || 'pt-BR-AntonioNeural';
          const nextUrl = this.getTtsUrl(nextClean, voiceId);
          this.preloaderPlayer.src = nextUrl;
          this.preloaderPlayer.preload = 'auto';
          this.preloaderPlayer.playbackRate = this.rate;
          this.preloaderPlayer.load();
        }
      } else if (this.autoAdvance) {
        // Se o próximo versículo for o início do próximo capítulo, pré-carregar com antecedência!
        this.preloadNextChapterFirstVerse();
      }
    },

    async preloadNextChapterFirstVerse() {
      const book = books.find(b => b.id === currentBookId);
      if (!book) return;
      let nextCh = currentChapter + 1;
      let nextBid = currentBookId;

      if (nextCh > book.chapters_count) {
        const currentIdx = books.findIndex(b => b.id === currentBookId);
        if (currentIdx !== -1 && currentIdx < books.length - 1) {
          nextBid = books[currentIdx + 1].id;
          nextCh = 1;
        } else {
          return; // Fim do Cânon
        }
      }

      try {
        const chVerses = await getChapterVerses(nextBid, nextCh, currentMode);
        if (chVerses && chVerses.length > 0) {
          this.nextChapterVersesCache = {
            bid: nextBid,
            ch: nextCh,
            verses: chVerses
          };
          const firstV = chVerses[0];
          const firstTxt = (currentMode === 'pt' ? firstV.t : (firstV.p || (firstV.pairs || []).map(p => p.p).join(' '))) || '';
          const firstClean = this.cleanText(firstTxt);
          if (firstClean) {
            const voiceId = this.selectedVoiceId || 'pt-BR-AntonioNeural';
            const url = this.getTtsUrl(firstClean, voiceId);
            this.preloaderPlayer.src = url;
            this.preloaderPlayer.preload = 'auto';
            this.preloaderPlayer.playbackRate = this.rate;
            this.preloaderPlayer.load();
          }
        }
      } catch (e) {
        console.warn('Erro ao pré-carregar primeiro versículo do próximo capítulo:', e);
      }
    },

    handleVerseEnded() {
      if (!this.isPlaying || this.userPaused) return;

      const nextIdx = this.currentIndex + 1;

      if (nextIdx < this.verses.length) {
        this.currentIndex = nextIdx;
        this.swapPlayersAndPlay();
      } else {
        if (this.autoAdvance) {
          this.advanceChapterSeamlessly();
        } else {
          this.stop();
        }
      }
    },

    swapPlayersAndPlay() {
      const oldActive = this.activePlayer;
      this.activePlayer = this.preloaderPlayer;
      this.preloaderPlayer = oldActive;

      const verse = this.verses[this.currentIndex];
      if (!verse) {
        this.stop();
        return;
      }

      this.highlightVerse(verse.v);
      this.updateMediaSession(this.currentIndex);
      this.updateUI();

      this.activePlayer.playbackRate = this.rate;
      const playPromise = this.activePlayer.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name !== 'AbortError' && !this.userPaused) {
            console.warn('Erro ao reproduzir próximo versículo, recarregando...', err);
            const clean = this.cleanText(verse.text);
            const voiceId = this.selectedVoiceId || 'pt-BR-AntonioNeural';
            const url = this.getTtsUrl(clean, voiceId);
            this.activePlayer.src = url;
            this.activePlayer.play().catch(() => {});
          }
        });
      }

      this.preloadNextVerse(this.currentIndex + 1);
    },

    advanceChapterSeamlessly() {
      const book = books.find(b => b.id === currentBookId);
      if (!book) {
        this.stop();
        return;
      }

      let nextCh = currentChapter + 1;
      let nextBid = currentBookId;

      if (nextCh > book.chapters_count) {
        const currentIdx = books.findIndex(b => b.id === currentBookId);
        if (currentIdx !== -1 && currentIdx < books.length - 1) {
          nextBid = books[currentIdx + 1].id;
          nextCh = 1;
        } else {
          this.stop();
          return;
        }
      }

      if (this.nextChapterVersesCache && this.nextChapterVersesCache.bid === nextBid && this.nextChapterVersesCache.ch === nextCh) {
        const chVerses = this.nextChapterVersesCache.verses;
        this.nextChapterVersesCache = null;

        const oldActive = this.activePlayer;
        this.activePlayer = this.preloaderPlayer;
        this.preloaderPlayer = oldActive;

        currentBookId = nextBid;
        currentChapter = nextCh;

        let list = [];
        if (currentMode === 'pt') {
          list = chVerses.map(v => ({ v: v.v, text: v.t }));
        } else {
          list = chVerses.map(v => ({ v: v.v, text: v.p || (v.pairs || []).map(p => p.p).join(' ') }));
        }
        this.verses = list;
        this.currentIndex = 0;

        this.activePlayer.playbackRate = this.rate;
        this.activePlayer.play().catch(() => {});

        this.highlightVerse(this.verses[0].v);
        this.updateMediaSession(0);
        this.updateUI();

        this.preloadNextVerse(1);

        renderChapterContent();
      } else {
        this.pendingAutoPlay = true;
        nextChapter(true);
      }
    },

    speakSynth(cleanText, index) {
      if (!this.synth) {
        this.stop();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pt-BR';
      utterance.rate = this.rate;

      const deviceVoice = this.deviceVoices.find(v => v.name === this.selectedVoiceId);
      if (deviceVoice) {
        utterance.voice = deviceVoice;
      }

      window._activeBibleUtterance = utterance;

      utterance.onend = () => {
        if (!this.isPlaying || this.userPaused) return;
        if (this.currentIndex !== index) return;
        const nextIdx = this.currentIndex + 1;
        if (nextIdx >= this.verses.length) {
          if (this.autoAdvance) {
            this.advanceChapterSeamlessly();
          } else {
            this.stop();
          }
          return;
        }
        this.speakVerse(nextIdx);
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          if (this.isPlaying && !this.userPaused && this.currentIndex === index) {
            const nextIdx = this.currentIndex + 1;
            if (nextIdx < this.verses.length) {
              this.speakVerse(nextIdx);
            } else if (this.autoAdvance) {
              this.advanceChapterSeamlessly();
            } else {
              this.stop();
            }
          }
        }
      };

      this.updateMediaSession(index);
      this.synth.speak(utterance);
    },

    highlightVerse(vNum) {
      this.unhighlightAll();
      const el = document.getElementById(`v-${vNum}`) ||
                 document.getElementById(`v-int-${vNum}`) ||
                 document.getElementById(`v-pair-${vNum}`);
      if (el) {
        el.classList.add('speaking-verse');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },

    unhighlightAll() {
      document.querySelectorAll('.speaking-verse').forEach(el => el.classList.remove('speaking-verse'));
    },

    updateUI() {
      const book = books.find(b => b.id === currentBookId);
      const bookName = book ? book.name : '';
      const totalV = this.verses.length;
      const currentVNum = this.verses[this.currentIndex] ? this.verses[this.currentIndex].v : (this.currentIndex + 1);

      if (narratorBar) {
        if (this.isPlaying && !this.isPaused) {
          narratorBar.classList.add('is-playing');
        } else {
          narratorBar.classList.remove('is-playing');
        }
      }

      const playIcon = narratorPlayBtn ? narratorPlayBtn.querySelector('.play-icon') : null;
      const pauseIcon = narratorPlayBtn ? narratorPlayBtn.querySelector('.pause-icon') : null;
      if (playIcon && pauseIcon) {
        if (this.isPlaying && !this.isPaused) {
          playIcon.style.display = 'none';
          pauseIcon.style.display = 'block';
          if (narratorBtnLabel) narratorBtnLabel.textContent = 'Pausar';
          if (narratorPlayBtn) narratorPlayBtn.classList.add('playing');
        } else if (this.isPlaying && this.isPaused) {
          playIcon.style.display = 'block';
          pauseIcon.style.display = 'none';
          if (narratorBtnLabel) narratorBtnLabel.textContent = 'Continuar';
          if (narratorPlayBtn) narratorPlayBtn.classList.remove('playing');
        } else {
          playIcon.style.display = 'block';
          pauseIcon.style.display = 'none';
          if (narratorBtnLabel) narratorBtnLabel.textContent = 'Ouvir Capítulo';
          if (narratorPlayBtn) narratorPlayBtn.classList.remove('playing');
        }
      }

      const canAdvanceChapter = this.autoAdvance && books.some(b => b.id === currentBookId && (currentChapter < b.chapters_count || books.findIndex(bk => bk.id === currentBookId) < books.length - 1));

      if (narratorStopBtn) narratorStopBtn.disabled = !this.isPlaying;
      if (narratorPrevBtn) narratorPrevBtn.disabled = !this.isPlaying || this.currentIndex === 0;
      if (narratorNextBtn) narratorNextBtn.disabled = !this.isPlaying || (this.currentIndex >= totalV - 1 && !canAdvanceChapter);

      if (narratorStatusText) {
        if (this.isPlaying && !this.isPaused) {
          narratorStatusText.textContent = `Narrando versículo ${currentVNum} de ${totalV}`;
        } else if (this.isPlaying && this.isPaused) {
          narratorStatusText.textContent = `Pausado no versículo ${currentVNum}`;
        } else {
          narratorStatusText.textContent = totalV > 0 
            ? `Pronto para narrar (${totalV} versículos)`
            : 'Narrador de Áudio pronto';
        }
      }

      if (floatTrackTitle) floatTrackTitle.textContent = `${bookName} ${currentChapter}`;
      if (floatVerseNum) floatVerseNum.textContent = `Versículo ${currentVNum} de ${totalV}`;

      const fPlayIcon = floatPlayBtn ? floatPlayBtn.querySelector('.float-play-icon') : null;
      const fPauseIcon = floatPlayBtn ? floatPlayBtn.querySelector('.float-pause-icon') : null;
      if (fPlayIcon && fPauseIcon) {
        if (this.isPlaying && !this.isPaused) {
          fPlayIcon.style.display = 'none';
          fPauseIcon.style.display = 'block';
        } else {
          fPlayIcon.style.display = 'block';
          fPauseIcon.style.display = 'none';
        }
      }

      if (floatPrevBtn) floatPrevBtn.disabled = !this.isPlaying || this.currentIndex === 0;
      if (floatNextBtn) floatNextBtn.disabled = !this.isPlaying || (this.currentIndex >= totalV - 1 && !canAdvanceChapter);
      if (floatStopBtn) floatStopBtn.disabled = !this.isPlaying;
    }
  };

  // Inicializar Narrador Sagrado
  BibleNarrator.init();
  window.BibleNarrator = BibleNarrator;

  // Expor função global para navegação direta a partir de links SEO e diretório
  window.selectBookAndChapter = function(bid, chap = 1) {
    const book = books.find(b => b.id === bid);
    if (!book) return;
    currentBookId = bid;
    currentChapter = Math.min(Math.max(1, chap), book.chapters_count || 1);
    renderChapterContent({ push: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ==========================================================================
     SISTEMA DE PESQUISA BÍBLICA INTEGRAL — BUSCA, DESTAQUE & SELEÇÃO MÚLTIPLA
     ========================================================================== */

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlightSearchMatches(text, query) {
    if (!query || !query.trim()) return escapeHtml(text);
    const normQ = stripAccents(query.trim());
    const normT = stripAccents(text);

    const indexMap = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const nCh = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (let j = 0; j < nCh.length; j++) {
        indexMap.push(i);
      }
    }
    indexMap.push(text.length);

    const matchRanges = [];
    let pos = 0;
    while ((pos = normT.indexOf(normQ, pos)) !== -1) {
      matchRanges.push({ start: pos, end: pos + normQ.length });
      pos += normQ.length;
    }

    if (matchRanges.length === 0 && normQ.includes(' ')) {
      const terms = normQ.split(/\s+/).filter(t => t.length >= 2);
      for (const t of terms) {
        pos = 0;
        while ((pos = normT.indexOf(t, pos)) !== -1) {
          matchRanges.push({ start: pos, end: pos + t.length });
          pos += t.length;
        }
      }
    }

    if (matchRanges.length === 0) return escapeHtml(text);

    matchRanges.sort((a, b) => a.start - b.start);
    const merged = [];
    let cur = matchRanges[0];
    for (let i = 1; i < matchRanges.length; i++) {
      const next = matchRanges[i];
      if (next.start <= cur.end) {
        cur.end = Math.max(cur.end, next.end);
      } else {
        merged.push(cur);
        cur = next;
      }
    }
    merged.push(cur);

    let result = '';
    let lastEnd = 0;
    for (const m of merged) {
      const actualStart = indexMap[m.start] !== undefined ? indexMap[m.start] : m.start;
      const actualEnd = indexMap[m.end] !== undefined ? indexMap[m.end] : m.end;
      result += escapeHtml(text.slice(lastEnd, actualStart));
      result += '<b class="search-match-bold">' + escapeHtml(text.slice(actualStart, actualEnd)) + '</b>';
      lastEnd = actualEnd;
    }
    result += escapeHtml(text.slice(lastEnd));
    return result;
  }

  function highlightSearchMatches(text, query, caseSensitive = false) {
    if (!query || !query.trim()) return escapeHtml(text);
    const trimmedQ = query.trim();
    const matchRanges = [];

    if (caseSensitive) {
      let pos = 0;
      while ((pos = text.indexOf(trimmedQ, pos)) !== -1) {
        matchRanges.push({ start: pos, end: pos + trimmedQ.length });
        pos += trimmedQ.length;
      }

      if (matchRanges.length === 0 && trimmedQ.includes(' ')) {
        const terms = trimmedQ.split(/\s+/).filter(t => t.length >= 2);
        for (const t of terms) {
          pos = 0;
          while ((pos = text.indexOf(t, pos)) !== -1) {
            matchRanges.push({ start: pos, end: pos + t.length });
            pos += t.length;
          }
        }
      }

      if (matchRanges.length === 0) return escapeHtml(text);

      matchRanges.sort((a, b) => a.start - b.start);
      const merged = [];
      let cur = matchRanges[0];
      for (let i = 1; i < matchRanges.length; i++) {
        const next = matchRanges[i];
        if (next.start <= cur.end) {
          cur.end = Math.max(cur.end, next.end);
        } else {
          merged.push(cur);
          cur = next;
        }
      }
      merged.push(cur);

      let result = '';
      let lastEnd = 0;
      for (const m of merged) {
        result += escapeHtml(text.slice(lastEnd, m.start));
        result += '<b class="search-match-bold">' + escapeHtml(text.slice(m.start, m.end)) + '</b>';
        lastEnd = m.end;
      }
      result += escapeHtml(text.slice(lastEnd));
      return result;
    }

    const normQ = stripAccents(trimmedQ);
    const normT = stripAccents(text);

    const indexMap = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const nCh = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (let j = 0; j < nCh.length; j++) {
        indexMap.push(i);
      }
    }
    indexMap.push(text.length);

    let pos = 0;
    while ((pos = normT.indexOf(normQ, pos)) !== -1) {
      matchRanges.push({ start: pos, end: pos + normQ.length });
      pos += normQ.length;
    }

    if (matchRanges.length === 0 && normQ.includes(' ')) {
      const terms = normQ.split(/\s+/).filter(t => t.length >= 2);
      for (const t of terms) {
        pos = 0;
        while ((pos = normT.indexOf(t, pos)) !== -1) {
          matchRanges.push({ start: pos, end: pos + t.length });
          pos += t.length;
        }
      }
    }

    if (matchRanges.length === 0) return escapeHtml(text);

    matchRanges.sort((a, b) => a.start - b.start);
    const merged = [];
    let cur = matchRanges[0];
    for (let i = 1; i < matchRanges.length; i++) {
      const next = matchRanges[i];
      if (next.start <= cur.end) {
        cur.end = Math.max(cur.end, next.end);
      } else {
        merged.push(cur);
        cur = next;
      }
    }
    merged.push(cur);

    let result = '';
    let lastEnd = 0;
    for (const m of merged) {
      const actualStart = indexMap[m.start] !== undefined ? indexMap[m.start] : m.start;
      const actualEnd = indexMap[m.end] !== undefined ? indexMap[m.end] : m.end;
      result += escapeHtml(text.slice(lastEnd, actualStart));
      result += '<b class="search-match-bold">' + escapeHtml(text.slice(actualStart, actualEnd)) + '</b>';
      lastEnd = actualEnd;
    }
    result += escapeHtml(text.slice(lastEnd));
    return result;
  }

  async function ensureBibleSearchIndex() {
    if (bibleSearchIndex) return bibleSearchIndex;
    if (isBibleIndexLoading) {
      while (isBibleIndexLoading) {
        await new Promise(r => setTimeout(r, 60));
      }
      return bibleSearchIndex;
    }

    isBibleIndexLoading = true;
    try {
      const res = await fetch('/data/bible_search_index.json');
      if (res.ok) {
        const raw = await res.json();
        const canonSet = new Set(books.map(b => b.id));
        bibleSearchIndex = raw
          .filter(item => canonSet.size === 0 || canonSet.has(item[0]))
          .map(item => ({
            b: item[0],
            c: item[1],
            v: item[2],
            t: item[3],
            n: stripAccents(item[3])
          }));
      }
    } catch (err) {
      console.warn('Índice estático não carregado, usando fallback D1 se disponível:', err);
    } finally {
      isBibleIndexLoading = false;
    }
    return bibleSearchIndex;
  }

  let searchSeq = 0;
  let serverSearchOk = null; // null = ainda não sabemos se o servidor tem FTS

  async function searchViaServer(query) {
    if (serverSearchOk === false) return null;
    try {
      const csParam = isCaseSensitive ? '&cs=1' : '';
      const res = await fetch(`/api/search_verses?q=${encodeURIComponent(query)}${csParam}`);
      if (res.ok && res.headers.get('X-Search-Mode') === 'fts') {
        serverSearchOk = true;
        const rows = await res.json();
        return rows.map(r => ({ b: r[0], c: r[1], v: r[2], t: r[3] }));
      }
    } catch (e) {}
    serverSearchOk = false;
    return null;
  }

  async function performBibleSearch(query) {
    const trimmed = (query || '').trim();
    if (!trimmed || trimmed.length < 2) {
      currentSearchResults = [];
      if (bibleSearchResultsList) bibleSearchResultsList.innerHTML = '';
      if (searchInitialState) searchInitialState.style.display = 'flex';
      if (bibleSearchMetaBar) bibleSearchMetaBar.style.display = 'none';
      if (clearBibleSearchBtn) clearBibleSearchBtn.style.display = 'none';
      exitSelectionMode();
      return;
    }

    if (clearBibleSearchBtn) clearBibleSearchBtn.style.display = 'block';
    if (searchInitialState) searchInitialState.style.display = 'none';
    if (bibleSearchMetaBar) bibleSearchMetaBar.style.display = 'flex';

    if (!bibleSearchIndex) {
      bibleSearchResultsList.innerHTML = `
        <div class="loading-state" style="padding: 2.5rem 0;">
          <div class="spinner-circle"></div>
          <span>Buscando em todo o Cânon Sagrado...</span>
        </div>
      `;
    }

    const seq = ++searchSeq;
    // 1) Busca no servidor (FTS5) — sem baixar 4,7 MB; 2) se não houver, índice estático local
    let matches = !bibleSearchIndex ? await searchViaServer(trimmed) : null;
    const index = matches === null ? await ensureBibleSearchIndex() : null;
    if (matches === null) matches = [];
    if (seq !== searchSeq) return; // uma busca mais recente já assumiu

    if (index && index.length > 0) {
      if (isCaseSensitive) {
        for (let i = 0; i < index.length; i++) {
          if (index[i].t.includes(trimmed)) {
            matches.push(index[i]);
          }
        }
        if (matches.length === 0 && trimmed.includes(' ')) {
          const terms = trimmed.split(/\s+/).filter(t => t.length >= 2);
          if (terms.length > 1) {
            for (let i = 0; i < index.length; i++) {
              const itemT = index[i].t;
              if (terms.every(t => itemT.includes(t))) {
                matches.push(index[i]);
              }
            }
          }
        }
      } else {
        const normQ = stripAccents(trimmed);
        for (let i = 0; i < index.length; i++) {
          if (index[i].n.includes(normQ)) {
            matches.push(index[i]);
          }
        }
        if (matches.length === 0 && normQ.includes(' ')) {
          const terms = normQ.split(/\s+/).filter(t => t.length >= 2);
          if (terms.length > 1) {
            for (let i = 0; i < index.length; i++) {
              const itemN = index[i].n;
              if (terms.every(t => itemN.includes(t))) {
                matches.push(index[i]);
              }
            }
          }
        }
      }
    } else if (!index && !matches.length && serverSearchOk !== true) {
      // Último recurso: API do Worker
      try {
        const csParam = isCaseSensitive ? '&cs=1' : '';
        const res = await fetch(`/api/search_verses?q=${encodeURIComponent(trimmed)}${csParam}`);
        if (res.ok) {
          const rows = await res.json();
          matches = rows.map(r => ({ b: r[0], c: r[1], v: r[2], t: r[3] }));
        }
      } catch (e) {}
    }

    // Filtrar estritamente apenas livros que existem no Cânon Sagrado de 69 Livros
    const canonSet = new Set(books.map(b => b.id));
    if (canonSet.size > 0) {
      matches = matches.filter(item => canonSet.has(item.b));
    }

    currentSearchResults = matches;
    const count = matches.length;
    if (bibleSearchCountBadge) {
      const modeSuffix = isCaseSensitive ? ' (exato/case sensitive)' : '';
      bibleSearchCountBadge.textContent = count === 1 ? `1 versículo encontrado${modeSuffix}` : `${count.toLocaleString('pt-BR')} ocorrências encontradas${modeSuffix}`;
    }

    if (count === 0) {
      bibleSearchResultsList.innerHTML = `
        <div class="empty-search-state" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;">✧</div>
          <h4 style="font-family: var(--font-serif-sacred); color: var(--text-accent); margin-bottom: 0.4rem;">Nenhum versículo encontrado</h4>
          <p style="font-size: 0.9rem;">Nenhuma ocorrência encontrada para "<strong>${escapeHtml(trimmed)}</strong>"${isCaseSensitive ? ' com diferenciação de maiúsculas/minúsculas ativada' : ''}.</p>
        </div>
      `;
      return;
    }

    renderSearchResults(matches, trimmed);
  }

  function renderSearchResults(results, query) {
    const bookMap = {};
    books.forEach(b => { bookMap[b.id] = b.name; });

    // Filtrar estritamente os resultados para garantir que apenas livros canônicos sejam renderizados
    const canonResults = results.filter(item => Boolean(bookMap[item.b]));

    const fragment = document.createDocumentFragment();
    bibleSearchResultsList.innerHTML = '';

    canonResults.forEach(item => {
      const bookName = bookMap[item.b];
      const key = `${item.b}_${item.c}_${item.v}`;
      const isSelected = selectedVersesMap.has(key);

      const card = document.createElement('div');
      card.className = `search-result-card ${isSelected ? 'selected' : ''}`;
      card.dataset.bid = item.b;
      card.dataset.ch = item.c;
      card.dataset.v = item.v;
      card.dataset.key = key;

      const highlightedText = highlightSearchMatches(item.t, query, isCaseSensitive);

      card.innerHTML = `
        <div class="search-card-top">
          <div class="search-card-ref-badge">
            <span class="ref-book">${bookName}</span>
            <span class="ref-num">${item.c}:${item.v}</span>
          </div>
          <div class="search-card-checkbox-wrap">
            <input type="checkbox" class="search-card-checkbox" ${isSelected ? 'checked' : ''} aria-label="Selecionar versículo">
          </div>
        </div>
        <div class="search-card-text">${highlightedText}</div>
      `;

      bindCardInteractions(card, item, bookName);
      fragment.appendChild(card);
    });

    bibleSearchResultsList.appendChild(fragment);
  }

  function bindCardInteractions(card, item, bookName) {
    const key = `${item.b}_${item.c}_${item.v}`;
    let holdTimer = null;
    let startX = 0;
    let startY = 0;
    let isHolding = false;
    let holdTriggered = false;

    const startHold = (x, y) => {
      startX = x;
      startY = y;
      isHolding = true;
      holdTriggered = false;
      card.classList.add('holding');

      holdTimer = setTimeout(() => {
        if (isHolding) {
          holdTriggered = true;
          card.classList.remove('holding');
          enterSelectionMode();
          toggleVerseSelection(key, item, bookName, card);
          if (navigator.vibrate) {
            try { navigator.vibrate(50); } catch (e) {}
          }
        }
      }, 420);
    };

    const cancelHold = () => {
      isHolding = false;
      if (holdTimer) clearTimeout(holdTimer);
      card.classList.remove('holding');
    };

    // Suporte a Touch no Mobile
    card.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startHold(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
      if (isHolding && e.touches.length === 1) {
        const diffX = Math.abs(e.touches[0].clientX - startX);
        const diffY = Math.abs(e.touches[0].clientY - startY);
        if (diffX > 12 || diffY > 12) {
          cancelHold();
        }
      }
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
      const wasTriggered = holdTriggered;
      cancelHold();
      if (wasTriggered) {
        e.preventDefault();
      }
    });

    card.addEventListener('touchcancel', cancelHold);

    // Suporte a Mouse no Desktop
    card.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        startHold(e.clientX, e.clientY);
      }
    });

    card.addEventListener('mousemove', (e) => {
      if (isHolding) {
        const diffX = Math.abs(e.clientX - startX);
        const diffY = Math.abs(e.clientY - startY);
        if (diffX > 8 || diffY > 8) {
          cancelHold();
        }
      }
    });

    card.addEventListener('mouseup', cancelHold);
    card.addEventListener('mouseleave', cancelHold);

    // Clique Normal
    card.addEventListener('click', (e) => {
      if (holdTriggered) {
        holdTriggered = false;
        return;
      }

      // Se estiver em modo de seleção múltipla, apenas alterna a seleção deste versículo
      if (isSelectionMode) {
        e.preventDefault();
        toggleVerseSelection(key, item, bookName, card);
        return;
      }

      // Modo normal: Navegar diretamente até o versículo na Bíblia
      navigateToVerse(item.b, item.c, item.v);
    });
  }

  async function navigateToVerse(bid, ch, v) {
    closeSearchModal();

    const bookChanged = currentBookId !== bid;
    const chapChanged = currentChapter !== ch;

    if (bookChanged || chapChanged) {
      currentBookId = bid;
      currentChapter = ch;
      await renderChapterContent({ push: true });
    }

    // Scroll suave e destaque pulsante no versículo
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollToAndHighlightVerse(v);
      }, 100);
    });
  }

  function scrollToAndHighlightVerse(verseNum) {
    const vEl = document.getElementById(`v-${verseNum}`) || 
                document.getElementById(`v-int-${verseNum}`) || 
                document.getElementById(`v-pair-${verseNum}`);
    if (vEl) {
      vEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      vEl.classList.remove('verse-focus-pulse');
      void vEl.offsetWidth; // Forçar reflow para reiniciar animação
      vEl.classList.add('verse-focus-pulse');
      setTimeout(() => {
        vEl.classList.remove('verse-focus-pulse');
      }, 3200);
    }
  }

  function enterSelectionMode() {
    isSelectionMode = true;
    if (bibleSearchResultsArea) bibleSearchResultsArea.classList.add('selection-mode-active');
    if (bibleSearchSelectionBar) bibleSearchSelectionBar.style.display = 'flex';
    updateSelectionUI();
  }

  function exitSelectionMode() {
    isSelectionMode = false;
    selectedVersesMap.clear();
    if (bibleSearchResultsArea) bibleSearchResultsArea.classList.remove('selection-mode-active');
    if (bibleSearchSelectionBar) bibleSearchSelectionBar.style.display = 'none';

    if (bibleSearchResultsList) {
      bibleSearchResultsList.querySelectorAll('.search-result-card').forEach(c => {
        c.classList.remove('selected');
        const cb = c.querySelector('.search-card-checkbox');
        if (cb) cb.checked = false;
      });
    }
  }

  function toggleVerseSelection(key, item, bookName, card) {
    if (selectedVersesMap.has(key)) {
      selectedVersesMap.delete(key);
      card.classList.remove('selected');
      const cb = card.querySelector('.search-card-checkbox');
      if (cb) cb.checked = false;
    } else {
      selectedVersesMap.set(key, { ...item, bookName });
      card.classList.add('selected');
      const cb = card.querySelector('.search-card-checkbox');
      if (cb) cb.checked = true;
    }
    updateSelectionUI();
  }

  function updateSelectionUI() {
    const count = selectedVersesMap.size;
    if (selectionStatusText) {
      if (count === 0) {
        selectionStatusText.textContent = '0 versículos selecionados';
      } else if (count === 1) {
        selectionStatusText.textContent = '1 versículo selecionado';
      } else {
        selectionStatusText.textContent = `${count} versículos selecionados`;
      }
    }
  }

  function copySelectedVerses() {
    if (selectedVersesMap.size === 0) {
      showBibleToast('Nenhum versículo selecionado');
      return;
    }

    const bookMap = {};
    books.forEach(b => { bookMap[b.id] = b.name; });

    const lines = [];
    currentSearchResults.forEach(item => {
      const key = `${item.b}_${item.c}_${item.v}`;
      const sel = selectedVersesMap.get(key);
      if (sel) {
        const bName = sel.bookName || bookMap[sel.b] || sel.b;
        lines.push(`${bName} ${sel.c}:${sel.v} — ${sel.t}`);
      }
    });

    const textToCopy = lines.join('\n\n');
    const count = selectedVersesMap.size;
    const msg = count === 1 ? '1 versículo copiado com sucesso!' : `${count} versículos copiados com sucesso!`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        showBibleToast(msg);
      }).catch(() => {
        fallbackCopyText(textToCopy, msg);
      });
    } else {
      fallbackCopyText(textToCopy, msg);
    }
  }

  function fallbackCopyText(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showBibleToast(successMsg);
    } catch (e) {
      showBibleToast('Erro ao copiar');
    }
    document.body.removeChild(ta);
  }

  function showBibleToast(message) {
    let toast = document.querySelector('.bible-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'bible-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2600);
  }

  function openSearchModal(initialQuery = '') {
    if (!bibleSearchModal) return;
    bibleSearchModal.classList.add('active');
    openDialog(bibleSearchModal, closeSearchModal, bibleSearchInput);

    if (initialQuery && bibleSearchInput) {
      bibleSearchInput.value = initialQuery;
      performBibleSearch(initialQuery);
    }
  }

  function closeSearchModal() {
    if (!bibleSearchModal) return;
    bibleSearchModal.classList.remove('active');
    dialogClosed(bibleSearchModal);
  }

  // Event Listeners do Motor de Busca Bíblica
  if (openBibleSearchBtn) {
    openBibleSearchBtn.addEventListener('click', () => openSearchModal());
  }

  if (closeBibleSearchModal) {
    closeBibleSearchModal.addEventListener('click', closeSearchModal);
  }

  if (bibleSearchModal) {
    bibleSearchModal.addEventListener('click', (e) => {
      if (e.target === bibleSearchModal) closeSearchModal();
    });
  }

  if (bibleSearchInput) {
    bibleSearchInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const ref = resolveReference(bibleSearchInput.value);
      if (ref) {
        e.preventDefault();
        navigateToVerse(ref.book.id, ref.chapter, ref.verse || 1);
      }
    });
    bibleSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimer);
      const val = e.target.value;
      searchDebounceTimer = setTimeout(() => {
        performBibleSearch(val);
      }, 120);
    });
  }

  if (clearBibleSearchBtn) {
    clearBibleSearchBtn.addEventListener('click', () => {
      if (bibleSearchInput) {
        bibleSearchInput.value = '';
        bibleSearchInput.focus();
      }
      performBibleSearch('');
    });
  }

  if (searchChipsBar) {
    searchChipsBar.querySelectorAll('.search-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.dataset.query;
        if (bibleSearchInput && q) {
          bibleSearchInput.value = q;
          bibleSearchInput.focus();
          performBibleSearch(q);
        }
      });
    });
  }

  if (searchSelectAllBtn) {
    searchSelectAllBtn.addEventListener('click', () => {
      const bookMap = {};
      books.forEach(b => { bookMap[b.id] = b.name; });

      currentSearchResults.forEach(item => {
        const key = `${item.b}_${item.c}_${item.v}`;
        const bName = bookMap[item.b] || item.b.toUpperCase();
        selectedVersesMap.set(key, { ...item, bookName: bName });
      });

      if (bibleSearchResultsList) {
        bibleSearchResultsList.querySelectorAll('.search-result-card').forEach(c => {
          c.classList.add('selected');
          const cb = c.querySelector('.search-card-checkbox');
          if (cb) cb.checked = true;
        });
      }
      updateSelectionUI();
    });
  }

  if (searchCopySelectedBtn) {
    searchCopySelectedBtn.addEventListener('click', copySelectedVerses);
  }

  if (searchCancelSelectionBtn) {
    searchCancelSelectionBtn.addEventListener('click', exitSelectionMode);
  }

  function setCaseSensitive(enabled) {
    isCaseSensitive = !!enabled;
    if (searchCaseToggleBtn) {
      searchCaseToggleBtn.classList.toggle('active', isCaseSensitive);
      searchCaseToggleBtn.setAttribute('aria-pressed', isCaseSensitive ? 'true' : 'false');
      searchCaseToggleBtn.title = isCaseSensitive 
        ? 'Diferenciar maiúsculas/minúsculas: ATIVADO (clique para desativar)' 
        : 'Diferenciar maiúsculas/minúsculas: DESATIVADO (clique para ativar)';
    }
    if (searchCaseCheckbox) {
      searchCaseCheckbox.checked = isCaseSensitive;
    }
    if (bibleSearchInput && bibleSearchInput.value.trim().length >= 2) {
      performBibleSearch(bibleSearchInput.value);
    }
  }

  if (searchCaseToggleBtn) {
    searchCaseToggleBtn.addEventListener('click', () => {
      setCaseSensitive(!isCaseSensitive);
    });
  }

  if (searchCaseCheckbox) {
    searchCaseCheckbox.addEventListener('change', (e) => {
      setCaseSensitive(e.target.checked);
    });
  }

  // Atalhos Globais de Teclado (Ctrl+K, '/', Esc)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (bibleSearchModal && bibleSearchModal.classList.contains('active')) {
        closeSearchModal();
      } else {
        openSearchModal();
      }
    } else if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openSearchModal();
    }
  });

  // Reconhece referências como "João 3:16", "1 Co 13", "Sl 23.1" e devolve {book, chapter, verse}
  function resolveReference(query) {
    const m = (query || '').trim().match(/^(.+?)\s+(\d{1,3})(?:\s*[:.,]\s*(\d{1,3}))?$/);
    if (!m) return null;
    const norm = (t) => stripAccents(t).replace(/\./g, '').replace(/^(iii|ii|i)\s+/, (x) => ({ i: '1 ', ii: '2 ', iii: '3 ' })[x.trim()]).replace(/\s+/g, ' ').trim();
    const name = norm(m[1]);
    if (name.length < 2) return null;
    const chapter = parseInt(m[2], 10);
    const verse = m[3] ? parseInt(m[3], 10) : 0;
    const flat = name.replace(/ /g, '');
    const exact = books.filter(b => norm(b.name) === name || norm(b.abbr).replace(/ /g, '') === flat || b.id === flat || getBookSlug(b).replace(/-/g, ' ') === name);
    const cands = exact.length === 1 ? exact : (exact.length === 0 && name.length >= 3 ? books.filter(b => norm(b.name).startsWith(name)) : []);
    if (cands.length !== 1) return null;
    const book = cands[0];
    if (chapter < 1 || chapter > book.chapters_count) return null;
    return { book, chapter, verse };
  }

  // ==========================================================================
  // LEITURA: seleção de versículos, favoritos, compartilhar/copiar, tamanho do texto
  // ==========================================================================
  const verseActionBar = document.getElementById('verse-action-bar');
  const verseActionLabel = document.getElementById('verse-action-label');
  const verseBookmarkBtn = document.getElementById('verse-bookmark-btn');
  const selectedVerses = new Set();
  const BOOKMARKS_KEY = 'unoteismo_bookmarks';

  function verseHolders(n) {
    return versesDisplayArea.querySelectorAll(`.pt-verse-row[data-verse="${n}"], .parallel-verse-pair[data-verse="${n}"]`);
  }

  function formatRanges(nums) {
    const a = Array.from(nums).sort((x, y) => x - y);
    const out = [];
    for (let i = 0; i < a.length;) {
      let j = i;
      while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++;
      out.push(j > i ? `${a[i]}-${a[j]}` : `${a[i]}`);
      i = j + 1;
    }
    return out.join(', ');
  }

  function verseTextOf(n) {
    const el = versesDisplayArea.querySelector(`[data-verse="${n}"] .pt-v-text`);
    return el ? el.textContent.trim() : '';
  }

  function currentBookObj() {
    return books.find(b => b.id === currentBookId);
  }

  function selectionReference() {
    const b = currentBookObj();
    return `${b ? b.name : ''} ${currentChapter}:${formatRanges(selectedVerses)}`;
  }

  function siteOrigin() {
    const c = document.querySelector('link[rel="canonical"]');
    try { if (c) return new URL(c.href).origin; } catch (e) {}
    return window.location.origin;
  }

  function selectionText() {
    const nums = Array.from(selectedVerses).sort((a, b) => a - b);
    const quote = nums.length === 1
      ? `“${verseTextOf(nums[0])}”`
      : nums.map(n => `${n} ${verseTextOf(n)}`).join('\n');
    const b = currentBookObj();
    const url = b ? `${siteOrigin()}${chapterUrlPath(b, currentChapter)}#v-${nums[0]}` : '';
    return `${quote}\n— ${selectionReference()} (Bíblia Unoteísta)\n${url}`;
  }

  function updateVerseActionBar() {
    if (!verseActionBar) return;
    const n = selectedVerses.size;
    verseActionBar.hidden = n === 0;
    document.body.classList.toggle('has-verse-selection', n > 0);
    if (!n) return;
    verseActionLabel.textContent = selectionReference();
    const list = Store.getJSON(BOOKMARKS_KEY, []);
    const all = Array.from(selectedVerses).every(v => list.some(x => x.b === currentBookId && x.c === currentChapter && x.v === v));
    verseBookmarkBtn.setAttribute('aria-pressed', all ? 'true' : 'false');
    verseBookmarkBtn.querySelector('span').textContent = all ? 'Remover favorito' : 'Favoritar';
  }

  function toggleVerseSelected(n) {
    const holders = verseHolders(n);
    if (!holders.length) return;
    if (selectedVerses.has(n)) {
      selectedVerses.delete(n);
      holders.forEach(h => h.classList.remove('verse-selected'));
    } else {
      selectedVerses.add(n);
      holders.forEach(h => h.classList.add('verse-selected'));
    }
    updateVerseActionBar();
  }

  function clearVerseSelection() {
    selectedVerses.clear();
    versesDisplayArea.querySelectorAll('.verse-selected').forEach(h => h.classList.remove('verse-selected'));
    updateVerseActionBar();
  }

  versesDisplayArea.addEventListener('click', (e) => {
    const text = e.target.closest('.pt-v-text');
    if (!text) return;
    // Se o leitor está marcando texto com o mouse, não alterna a seleção
    if (window.getSelection && String(window.getSelection()).length > 0) return;
    const holder = text.closest('[data-verse]');
    if (holder) toggleVerseSelected(parseInt(holder.dataset.verse, 10));
  });

  function getBookmarks() {
    return Store.getJSON(BOOKMARKS_KEY, []);
  }

  function applyBookmarksToDom() {
    const list = getBookmarks();
    versesDisplayArea.querySelectorAll('.pt-verse-row, .parallel-verse-pair, .interlinear-verse-card').forEach(el => {
      const v = parseInt(el.dataset.verse, 10);
      el.classList.toggle('verse-bookmarked', list.some(x => x.b === currentBookId && x.c === currentChapter && x.v === v));
    });
    updateBookmarksBadge(list);
  }

  function updateBookmarksBadge(list = getBookmarks()) {
    const badge = document.getElementById('bookmarks-count');
    if (!badge) return;
    badge.textContent = String(list.length);
    badge.hidden = list.length === 0;
  }

  function toggleBookmarkOnSelection() {
    if (!selectedVerses.size) return;
    const nums = Array.from(selectedVerses);
    const list = getBookmarks();
    const isIn = (v) => list.some(x => x.b === currentBookId && x.c === currentChapter && x.v === v);
    let next;
    if (nums.every(isIn)) {
      next = list.filter(x => !(x.b === currentBookId && x.c === currentChapter && nums.includes(x.v)));
      showBibleToast('Removido dos favoritos');
    } else {
      next = list.slice();
      nums.forEach(v => {
        if (!isIn(v)) next.push({ b: currentBookId, c: currentChapter, v, t: verseTextOf(v).slice(0, 140), ts: Date.now() });
      });
      showBibleToast(nums.length === 1 ? 'Versículo salvo nos favoritos' : 'Versículos salvos nos favoritos');
    }
    Store.setJSON(BOOKMARKS_KEY, next);
    applyBookmarksToDom();
    updateVerseActionBar();
  }

  function copySelection() {
    if (!selectedVerses.size) return;
    const text = selectionText();
    const done = () => showBibleToast('Copiado com a referência');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopyText(text, 'Copiado com a referência'));
    } else {
      fallbackCopyText(text, 'Copiado com a referência');
    }
  }

  function shareSelection() {
    if (!selectedVerses.size) return;
    const b = currentBookObj();
    const nums = Array.from(selectedVerses).sort((x, y) => x - y);
    const data = {
      title: selectionReference(),
      text: `${nums.map(n => verseTextOf(n)).join(' ')} — ${selectionReference()}`,
      url: `${siteOrigin()}${chapterUrlPath(b, currentChapter)}#v-${nums[0]}`
    };
    if (navigator.share) {
      navigator.share(data).catch(() => {});
    } else {
      copySelection();
    }
  }

  if (verseActionBar) {
    document.getElementById('verse-copy-btn').addEventListener('click', copySelection);
    document.getElementById('verse-share-btn').addEventListener('click', shareSelection);
    verseBookmarkBtn.addEventListener('click', toggleBookmarkOnSelection);
    document.getElementById('verse-listen-btn').addEventListener('click', () => {
      const first = Math.min(...selectedVerses);
      if (typeof BibleNarrator !== 'undefined') BibleNarrator.playFromVerse(first);
    });
    document.getElementById('verse-clear-btn').addEventListener('click', clearVerseSelection);
  }

  // ---- Modal de favoritos ----
  const bookmarksModal = document.getElementById('bookmarks-modal');
  const bookmarksList = document.getElementById('bookmarks-list');
  const openBookmarksBtn = document.getElementById('open-bookmarks-btn');

  function renderBookmarksList() {
    const list = getBookmarks().slice().sort((a, b) => b.ts - a.ts);
    if (!list.length) {
      bookmarksList.innerHTML = '<p class="bookmarks-empty">Nenhum favorito ainda. Toque em um versículo e escolha “Favoritar”.</p>';
      return;
    }
    bookmarksList.innerHTML = list.map(x => {
      const bk = books.find(b => b.id === x.b);
      const ref = `${bk ? bk.name : x.b} ${x.c}:${x.v}`;
      return `
        <div class="bookmark-item" data-b="${escapeHtml(x.b)}" data-c="${x.c}" data-v="${x.v}">
          <button type="button" class="bookmark-go">
            <span class="bookmark-ref">${escapeHtml(ref)}</span>
            <span class="bookmark-text">${escapeHtml(x.t || '')}</span>
          </button>
          <button type="button" class="bookmark-remove" aria-label="Remover ${escapeHtml(ref)} dos favoritos">&times;</button>
        </div>`;
    }).join('');
  }

  function openBookmarksModal() {
    renderBookmarksList();
    bookmarksModal.classList.add('active');
    openDialog(bookmarksModal, closeBookmarksModal);
  }

  function closeBookmarksModal() {
    bookmarksModal.classList.remove('active');
    dialogClosed(bookmarksModal);
  }

  if (bookmarksModal) {
    openBookmarksBtn.addEventListener('click', openBookmarksModal);
    document.getElementById('close-bookmarks-modal').addEventListener('click', closeBookmarksModal);
    bookmarksModal.addEventListener('click', (e) => { if (e.target === bookmarksModal) closeBookmarksModal(); });
    bookmarksList.addEventListener('click', (e) => {
      const item = e.target.closest('.bookmark-item');
      if (!item) return;
      const b = item.dataset.b;
      const c = parseInt(item.dataset.c, 10);
      const v = parseInt(item.dataset.v, 10);
      if (e.target.closest('.bookmark-remove')) {
        Store.setJSON(BOOKMARKS_KEY, getBookmarks().filter(x => !(x.b === b && x.c === c && x.v === v)));
        renderBookmarksList();
        applyBookmarksToDom();
      } else {
        closeBookmarksModal();
        navigateToVerse(b, c, v);
      }
    });
    updateBookmarksBadge();
  }

  // ---- Tamanho do texto ----
  let fontScale = parseFloat(Store.get('unoteismo_font_scale', '1')) || 1;
  function applyFontScale() {
    fontScale = Math.min(1.6, Math.max(0.85, Math.round(fontScale * 100) / 100));
    document.documentElement.style.setProperty('--reader-scale', String(fontScale));
    Store.set('unoteismo_font_scale', String(fontScale));
    const label = document.getElementById('font-scale-label');
    if (label) label.textContent = `${Math.round(fontScale * 100)}%`;
  }
  const fontDec = document.getElementById('font-dec-btn');
  const fontInc = document.getElementById('font-inc-btn');
  if (fontDec && fontInc) {
    fontDec.addEventListener('click', () => { fontScale -= 0.1; applyFontScale(); });
    fontInc.addEventListener('click', () => { fontScale += 0.1; applyFontScale(); });
    document.getElementById('font-reset-btn').addEventListener('click', () => { fontScale = 1; applyFontScale(); });
  }
  applyFontScale();

  // Opções de leitura/áudio: abertas no desktop, recolhidas no celular
  const readerOptions = document.getElementById('reader-options');
  if (readerOptions && window.matchMedia && window.matchMedia('(max-width: 700px)').matches) {
    readerOptions.open = false;
  }

  // Dica exegética: dispensável para sempre
  const tipDismiss = document.getElementById('tip-dismiss');
  if (tipDismiss) {
    tipDismiss.addEventListener('click', () => {
      Store.set('unoteismo_tip_dismissed', '1');
      interlinearTip.classList.remove('visible');
    });
  }

  // Barra de controles (celular): some ao rolar para baixo e volta ao rolar para cima.
  // Só usa transform (a altura no fluxo da página não muda), então não há salto de conteúdo nem
  // oscilação ao subir devagar. A direção é medida com margem (8px) acumulada, sem depender de limites fixos.
  const controlBar = document.getElementById('bible-control-bar');
  let barHidden = false;
  let barLastY = window.scrollY;
  let barTicking = false;
  const setBarHidden = (v) => {
    if (v === barHidden) return;
    barHidden = v;
    document.body.classList.toggle('bar-hidden', v);
  };
  const updateBarVisibility = () => {
    barTicking = false;
    const y = Math.max(0, window.scrollY);
    const dy = y - barLastY;
    if (y < 80) {
      setBarHidden(false);
      barLastY = y;
    } else if (dy > 8) {
      setBarHidden(true);
      barLastY = y;
    } else if (dy < -8) {
      setBarHidden(false);
      barLastY = y;
    }
  };
  window.addEventListener('scroll', () => {
    if (!barTicking) { barTicking = true; requestAnimationFrame(updateBarVisibility); }
  }, { passive: true });
  // Navegação por teclado dentro da barra sempre a revela
  if (controlBar) controlBar.addEventListener('focusin', () => setBarHidden(false));

  // Abre a partir de links compartilhados (#v-16) e de atalhos (#lexico)
  function handleInitialHash() {
    const h = window.location.hash;
    const m = h.match(/^#v-(\d+)$/);
    if (m) setTimeout(() => scrollToAndHighlightVerse(parseInt(m[1], 10)), 150);
    else if (h === '#lexico') openDictionaryWithSearch('');
  }

  // Inicialização. ?q= aceita busca ("Filho de Deus") ou referência ("João 3:16");
  // ?intro=1 / ?confissao=1 são redirecionamentos antigos para a página de Teologia.
  let refFromQuery = null;
  let searchFromQuery = '';
  try {
    const initParams = new URLSearchParams(window.location.search);
    const qParam = (initParams.get('q') || initParams.get('query') || '').trim();
    if (initParams.get('intro') === '1' || window.location.hash === '#introducao' || window.location.hash === '#resumo-teologico-unoteista' || initParams.get('confissao') === '1' || window.location.hash === '#confissao-de-fe-unoteista') {
      window.location.replace('/teologia');
    } else if (qParam) {
      refFromQuery = resolveReference(qParam);
      if (!refFromQuery) searchFromQuery = qParam;
    }
  } catch (e) {}

  if (refFromQuery) {
    currentBookId = refFromQuery.book.id;
    currentChapter = refFromQuery.chapter;
    currentView = 'chapter';
  }
  if (currentView === 'book') {
    const book = books.find(b => b.id === currentBookId) || books[0];
    renderBookChaptersView(book, { push: false });
  } else {
    await setReadingMode(currentMode);
  }
  if (refFromQuery) {
    if (refFromQuery.verse) scrollToAndHighlightVerse(refFromQuery.verse);
  } else if (currentView !== 'book') {
    handleInitialHash();
  }
  if (searchFromQuery) openSearchModal(searchFromQuery);
});
