"""Teste de fumaça do site (local ou publicado).

    python tools/smoke_test.py                       # http://127.0.0.1:8787  (wrangler dev)
    python tools/smoke_test.py https://seu-site.dev  # produção, depois do deploy

Confere: rotas e redirecionamentos, 404 reais, cabeçalhos de segurança, HTML gerado no servidor
(título/canonical/versículos), JSON-LD válido e se todos os links/recursos internos respondem.
"""
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787').rstrip('/')
failures = []
checks = 0


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


opener_nr = urllib.request.build_opener(NoRedirect)
opener = urllib.request.build_opener()


def get(path, follow=True, headers=None):
    req = urllib.request.Request(BASE + path, headers=headers or {'User-Agent': 'smoke-test'})
    try:
        r = (opener if follow else opener_nr).open(req, timeout=30)
        return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


def check(ok, msg):
    global checks
    checks += 1
    if not ok:
        failures.append(msg)
        print('  FALHOU:', msg)


# ---------------------------------------------------------------- rotas
print('Rotas e redirecionamentos')
ROUTES = [
    ('/', 200, None), ('/biblia', 200, None), ('/teologia', 200, None), ('/sobre', 200, None),
    ('/privacidade', 200, None), ('/comparativo', 200, None), ('/sitemap.xml', 200, None),
    ('/robots.txt', 200, None), ('/site.webmanifest', 200, None), ('/sw.js', 200, None),
    ('/biblia/genesis/1', 200, None), ('/biblia/joao/3', 200, None), ('/biblia/1-samuel/2', 200, None),
    ('/biblia?book=gn&ch=1', 301, '/biblia/genesis/1'),
    ('/biblia?book=jo&ch=3&mode=int', 301, '/biblia/joao/3?mode=int'),
    ('/biblia/genesis', 301, '/biblia/genesis/1'),
    ('/biblia/', 301, '/biblia'),
    ('/biblia?book=inef', 302, '/biblia/genesis/1'),
    ('/biblia.html', 301, '/biblia'), ('/index.html', 301, '/'),
    ('/biblia?book=xx', 404, None), ('/biblia/genesis/999', 404, None), ('/biblia/nao-existe/1', 404, None),
    ('/admin', 200, None), ('/admin.html', 301, '/admin'),
    ('/api/admin/me', 401, None), ('/api/admin/pages', 401, None), ('/api/admin/login', 405, None),
    ('/nao-existe', 404, None), ('/scratch/', 404, None), ('/wrangler.jsonc', 404, None),
    ('/api/chapter?book=xx&ch=1', 404, None), ('/api/nao-existe', 404, None),
]
for path, want, loc in ROUTES:
    status, hdr, _ = get(path, follow=False)
    ok = status == want
    if ok and loc:
        got = urllib.parse.urlparse(hdr.get('Location') or hdr.get('location') or '')
        ok = (got.path + ('?' + got.query if got.query else '')) == loc
    check(ok, f'{path} -> {status} (esperado {want}{" -> " + loc if loc else ""})')

# ---------------------------------------------------------------- cabeçalhos
print('Cabeçalhos de segurança')
for path in ('/', '/biblia/joao/3', '/api/chapter?book=gn&ch=1&mode=pt'):
    _, hdr, _ = get(path)
    h = {k.lower(): v for k, v in hdr.items()}
    check('content-security-policy' in h, f'{path}: falta Content-Security-Policy')
    check(h.get('x-content-type-options') == 'nosniff', f'{path}: falta X-Content-Type-Options')
    check(h.get('x-frame-options') == 'DENY', f'{path}: falta X-Frame-Options')

# ---------------------------------------------------------------- HTML gerado
print('HTML de capítulo (SSR)')
status, _, body = get('/biblia/joao/3')
html = body.decode('utf-8', 'replace')
check('<title>João 3 —' in html, 'título do capítulo')
check('rel="canonical" href="' in html and '/biblia/joao/3"' in html, 'canonical do capítulo')
check(len(re.findall(r'class="pt-verse-row"', html)) >= 30, 'versículos no HTML do servidor')
check('Porque Deus amou o mundo' in html, 'texto de João 3:16 presente no HTML')
check('seo-faq' not in html, 'capítulo sem bloco de FAQ repetido')

# ---------------------------------------------------------------- painel e páginas editáveis
print('Painel /admin')
_, hdr, body = get('/admin')
h = {k.lower(): v for k, v in hdr.items()}
check('noindex' in (h.get('x-robots-tag') or '') or b'noindex' in body, '/admin sem noindex')
check(b'name="robots" content="noindex' in body, '/admin sem meta robots noindex')
check('no-store' in (h.get('cache-control') or ''), '/admin deveria ser no-store')
_, _, tbody = get('/teologia')
check(tbody.decode('utf-8', 'replace').count('data-edit=') == 67, '/teologia deveria ter 67 blocos editáveis')
_, _, ibody = get('/')
check(ibody.decode('utf-8', 'replace').count('data-edit=') == 26, '/ deveria ter 26 blocos editáveis (Confissão de Fé)')
_, _, robots = get('/robots.txt')
check(b'Disallow: /admin' in robots, 'robots.txt deveria bloquear /admin')

# ---------------------------------------------------------------- JSON-LD
print('JSON-LD')
for path in ('/', '/biblia', '/biblia/joao/3', '/teologia', '/sobre', '/privacidade', '/comparativo'):
    _, _, b = get(path)
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', b.decode('utf-8', 'replace'), re.S)
    check(len(blocks) >= 1, f'{path}: sem JSON-LD')
    for i, blk in enumerate(blocks):
        try:
            json.loads(blk.replace('<\\/', '</'))
        except ValueError as e:
            check(False, f'{path}: JSON-LD #{i} inválido ({e})')

# ---------------------------------------------------------------- links e recursos
print('Links e recursos internos')
seen = set()
for page in ('/', '/biblia', '/biblia/joao/3', '/teologia', '/sobre', '/privacidade', '/comparativo'):
    _, _, b = get(page)
    for m in re.finditer(r'\b(?:href|src)="(/[^"#]*)', b.decode('utf-8', 'replace')):
        p = m.group(1)
        if p.startswith('//') or p in seen:
            continue
        seen.add(p)
        status, _, _ = get(p)
        check(status < 400, f'{page} referencia {p} -> {status}')
print(f'  {len(seen)} caminhos distintos conferidos')

# ---------------------------------------------------------------- sitemap
print('Sitemap')
_, _, sm = get('/sitemap.xml')
urls = re.findall(r'<loc>([^<]+)</loc>', sm.decode('utf-8'))
check(len(urls) > 1000, f'sitemap com poucas URLs ({len(urls)})')
sample = urls[::97][:14] + urls[-2:]
for u in sample:
    path = urllib.parse.urlparse(u).path
    status, _, _ = get(path)
    check(status == 200, f'sitemap: {path} -> {status}')

print(f'\n{checks} verificações, {len(failures)} falha(s).')
sys.exit(1 if failures else 0)
