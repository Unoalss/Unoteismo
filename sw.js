/* Service worker do Unoteísmo: abre rápido e deixa ler offline o que já foi lido.
   O make_public.py troca o marcador __BUILD__ (abaixo) por um hash do conteúdo a cada publicação,
   o que invalida os caches antigos. */
const BUILD = '__BUILD__';
const SHELL_CACHE = `unoteismo-shell-${BUILD}`;
const RUNTIME_CACHE = `unoteismo-runtime-${BUILD}`;
const MAX_RUNTIME_ENTRIES = 250;

const PRECACHE = [
  '/', '/biblia', '/teologia',
  '/versao.css', '/style.css', '/biblia.css', '/versao_biblia.css',
  '/site.js', '/biblia.js', '/logo-64.png', '/data/books.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('unoteismo-') && k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok && res.type === 'basic') {
        cache.put(request, res.clone()).then(() => trim(cacheName, MAX_RUNTIME_ENTRIES));
      }
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

async function networkFirstPage(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok && res.type === 'basic') {
      cache.put(request, res.clone()).then(() => trim(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES));
    }
    return res;
  } catch (_) {
    const hit = (await cache.match(request)) || (await caches.match(request));
    if (hit) return hit;
    const url = new URL(request.url);
    // Capítulo ainda não visitado: entrega o shell da Bíblia, que busca o texto no cache/API
    if (url.pathname.startsWith('/biblia')) {
      const shell = await caches.match('/biblia');
      if (shell) return shell;
    }
    return (await caches.match('/')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Painel administrativo: sempre direto da rede (nada de cache)
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin.') || url.pathname.startsWith('/api/admin')) return;

  // Áudio da narração e requisições parciais: sempre direto da rede
  if (url.pathname === '/api/tts' || request.destination === 'audio' || request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.pathname === '/api/chapter' || url.pathname === '/api/word') {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  if (url.pathname.startsWith('/api/')) return;

  // Estáticos (css/js/imagens) e dados essenciais
  if (/\.(css|js|png|jpg|svg|webmanifest)$/.test(url.pathname) || url.pathname === '/data/books.json' || url.pathname === '/data/bible_search_index.json') {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});
