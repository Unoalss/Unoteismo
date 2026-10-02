"""Teste de integração do painel /admin contra um servidor rodando (wrangler dev).

    python tools/test_admin_api.py http://127.0.0.1:8787 --password 'SUA_SENHA'
    python tools/test_admin_api.py http://127.0.0.1:8787 --password '...' --lockout   # inclui o teste de bloqueio (só local!)

Salva textos de teste e depois RESTAURA tudo (remove as edições que fez). Nunca rode --lockout em produção:
o Cloudflare ignora o cabeçalho de IP falso e o bloqueio cairia no seu próprio IP por 15 minutos.
"""
import json
import random
import sys
import urllib.error
import urllib.request

args = sys.argv[1:]
BASE = next((a for a in args if a.startswith('http')), 'http://127.0.0.1:8787').rstrip('/')
PASSWORD = args[args.index('--password') + 1] if '--password' in args else None
LOCKOUT = '--lockout' in args
if not PASSWORD:
    sys.exit('Informe --password')

failures, checks = [], 0
# IPs de teste únicos a cada execução (o limite de tentativas guarda 15 min; assim as execuções não se afetam)
_BASE = f'10.{random.randint(1, 250)}.{random.randint(1, 250)}'
ip_of = lambda n: f'{_BASE}.{n}'


def check(ok, msg):
    global checks
    checks += 1
    if not ok:
        failures.append(msg)
        print('  FALHOU:', msg)


def call(method, path, body=None, token=None, ip=None, origin=None):
    ip = ip or ip_of(1)
    h = {'CF-Connecting-IP': ip, 'User-Agent': 'admin-test'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    data = None
    if body is not None:
        h['Content-Type'] = 'application/json'
        data = json.dumps(body).encode()
    if origin:
        h['Origin'] = origin
    req = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=60)
        raw = r.read()
        return r.status, (json.loads(raw) if raw else None), dict(r.headers)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw), dict(e.headers)
        except ValueError:
            return e.code, raw.decode('utf-8', 'replace'), dict(e.headers)


def public(path='/teologia'):
    with urllib.request.urlopen(urllib.request.Request(BASE + path, headers={'User-Agent': 'admin-test'}), timeout=60) as r:
        return r.read().decode('utf-8')


# ---------------------------------------------------------------- acesso sem token
print('Acesso')
for m, p in [('GET', '/api/admin/me'), ('GET', '/api/admin/pages'), ('GET', '/api/admin/pages/teologia'),
             ('POST', '/api/admin/pages/teologia/save'), ('DELETE', '/api/admin/pages/teologia/blocks/hero.title'),
             ('POST', '/api/admin/password')]:
    s, _, _ = call(m, p, {} if m != 'GET' else None)
    check(s == 401, f'{m} {p} sem token -> {s} (esperado 401)')
s, _, _ = call('GET', '/api/admin/pages', token='lixo.lixo')
check(s == 401, 'token lixo -> 401')

# ---------------------------------------------------------------- login
print('Login')
s, d, _ = call('POST', '/api/admin/login', {'password': PASSWORD + 'x'}, ip=ip_of(2))
check(s == 401 and d.get('error') == 'invalid', f'senha errada -> {s}')
check(isinstance(d, dict) and d.get('remaining') == 4, 'informa tentativas restantes')
s, d, _ = call('POST', '/api/admin/login', {}, ip=ip_of(2))
check(s == 400, 'sem senha -> 400')
s, d, _ = call('POST', '/api/admin/login', {'password': PASSWORD}, ip=ip_of(2), origin='https://evil.example')
check(s == 403, f'origem estranha -> {s} (esperado 403)')
s, d, hdr = call('POST', '/api/admin/login', {'password': PASSWORD}, ip=ip_of(3))
check(s == 200 and d.get('token'), f'senha certa -> {s}')
check('no-store' in (hdr.get('Cache-Control') or hdr.get('cache-control') or ''), 'resposta sem cache')
TOKEN = d['token']

if LOCKOUT:
    print('Bloqueio por tentativas (local)')
    ip = ip_of(77)
    codes = [call('POST', '/api/admin/login', {'password': 'errada'}, ip=ip)[0] for _ in range(5)]
    check(codes == [401] * 5, f'5 falhas seguidas -> {codes}')
    s, d, hdr = call('POST', '/api/admin/login', {'password': PASSWORD}, ip=ip)
    check(s == 429 and d.get('error') == 'locked', f'6ª tentativa (mesmo com a senha certa) -> {s}')
    check(bool(hdr.get('Retry-After') or hdr.get('retry-after')), 'envia Retry-After')
    s, d, _ = call('POST', '/api/admin/login', {'password': PASSWORD}, ip=ip_of(78))
    check(s == 200, 'outro IP não é afetado')

# ---------------------------------------------------------------- páginas
print('Páginas')
s, d, _ = call('GET', '/api/admin/me', token=TOKEN)
check(s == 200 and d.get('ok'), 'me')
s, d, _ = call('GET', '/api/admin/pages', token=TOKEN)
check(s == 200 and d['pages'][0]['page'] == 'teologia', 'lista de páginas')
s, d, _ = call('GET', '/api/admin/pages/inexistente', token=TOKEN)
check(s == 404, 'página inexistente -> 404')
s, page, _ = call('GET', '/api/admin/pages/teologia', token=TOKEN)
check(s == 200 and len(page['blocks']) == 29, f'29 campos (27 blocos + título + descrição): {len(page["blocks"]) if s == 200 else s}')
blocks = {b['key']: b for b in page['blocks']}
check('head.title' in blocks and 'hero.title' in blocks and 'cristologico.p4' in blocks, 'chaves esperadas')
check(all(not b['edited'] for b in blocks.values()), 'nada editado no início (rode em banco limpo)')
check(blocks['hero.title']['current'] == 'Teologia Unoteísta', 'texto atual do H1')
check(blocks['hero.title']['type'] == 'text' and blocks['intro.lead']['type'] == 'rich', 'tipos')

# ---------------------------------------------------------------- salvar
print('Salvar e publicar')
NOVO = 'Teologia Unoteísta (teste)'
s, d, _ = call('POST', '/api/admin/pages/teologia/save', {'changes': {
    'hero.title': NOVO,
    'cristologico.p2': 'Parágrafo <strong>novo</strong> com <a href="https://exemplo.com/x?a=1&b=2">link</a>, <script>alert(1)</script> e <img src=x onerror=alert(1)>.',
    'head.title': 'Título "novo" & teste',
    'ontologico.badge': '1º Axioma — Ontologia Divina',   # igual ao original: não deve virar edição
}}, token=TOKEN)
check(s == 200 and d['ok'], f'salvar -> {s} {d}')
check(d['results'].get('hero.title', {}).get('edited') is True, 'H1 marcado como editado')
check(d['results'].get('ontologico.badge', {}).get('edited') is False, 'texto igual ao original não vira edição')
html = public()
check(f'>{NOVO}</h1>' in html, 'H1 novo na página pública')
check('Parágrafo <strong>novo</strong> com <a href="https://exemplo.com/x?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">link</a>, ' in html, 'HTML seguro do parágrafo novo')
check('<script>alert' not in html and 'onerror' not in html, 'script/onerror removidos')
check('<title>Título &quot;novo&quot; &amp; teste</title>' in html, 'título da aba escapado')
check('og:title" content="Título &quot;novo&quot; &amp; teste"' in html, 'og:title acompanha')
check(html.count('data-edit=') == 27, 'os outros 26 blocos continuam ali')
s, d, _ = call('GET', '/api/admin/pages/teologia', token=TOKEN)
b2 = {b['key']: b for b in d['blocks']}
check(b2['hero.title']['edited'] and b2['hero.title']['current'] == NOVO, 'painel mostra o texto novo')
check(b2['head.title']['current'] == 'Título "novo" & teste', 'título volta como texto puro')
check(b2['hero.title']['original'] == 'Teologia Unoteísta', 'original preservado')

# erros de validação
s, d, _ = call('POST', '/api/admin/pages/teologia/save', {'changes': {'hero.title': '   ', 'nao.existe': 'x', 'intro.lead': 5}}, token=TOKEN)
check(s == 400 and len(d['errors']) == 3, f'erros por campo -> {s}')
s, d, _ = call('POST', '/api/admin/pages/teologia/save', {'changes': {}}, token=TOKEN)
check(s == 400, 'sem alterações -> 400')

# histórico
s, d, _ = call('POST', '/api/admin/pages/teologia/save', {'changes': {'hero.title': NOVO + ' 2'}}, token=TOKEN)
s, d, _ = call('GET', '/api/admin/pages/teologia/revisions?key=hero.title', token=TOKEN)
check(s == 200 and [r['value'] for r in d['revisions']][:2] == [NOVO + ' 2', NOVO], f'histórico em ordem: {[r["value"] for r in d["revisions"]] if s == 200 else s}')

# ---------------------------------------------------------------- restaurar
print('Restaurar')
for key in ('hero.title', 'cristologico.p2', 'head.title'):
    s, d, _ = call('DELETE', '/api/admin/pages/teologia/blocks/' + key, token=TOKEN)
    check(s == 200, f'restaurar {key}')
html = public()
check('>Teologia Unoteísta</h1>' in html and '(teste)' not in html, 'página voltou ao original')
s, d, _ = call('GET', '/api/admin/pages/teologia', token=TOKEN)
check(all(not b['edited'] for b in d['blocks']), 'nenhum campo editado ao final')
s, d, _ = call('POST', '/api/admin/pages/teologia/save', {'changes': {'hero.title': 'Teologia Unoteísta'}}, token=TOKEN)
check(d['results']['hero.title']['edited'] is False, 'salvar o texto original limpa a edição')

# ---------------------------------------------------------------- Início / Confissão de Fé
print('Início e Confissão de Fé')
s, d, _ = call('GET', '/api/admin/pages', token=TOKEN)
check(sorted(p['page'] for p in d['pages']) == ['inicio', 'teologia'], 'lista com Teologia e Início')
s, home_page, _ = call('GET', '/api/admin/pages/inicio', token=TOKEN)
check(s == 200 and len(home_page['blocks']) == 28, f'28 campos (26 blocos + título + descrição): {len(home_page["blocks"]) if s == 200 else s}')
hb = {b['key']: b for b in home_page['blocks']}
check(home_page.get('viewPath') == '/#confissao', 'link "Ver página" abre a Confissão')
check(hb['confissao.a1.text']['current'].startswith('Cremos em um só Deus e Pai'), 'artigo 1 lido')
check(hb['confissao.a12.num']['type'] == 'text' and hb['confissao.a12.text']['type'] == 'rich', 'tipos da Confissão')
home_before = public('/')
s, d, _ = call('POST', '/api/admin/pages/inicio/save', {'changes': {
    'confissao.a1.text': 'Cremos em um só Deus e Pai, <em>teste de edição</em> <script>alert(1)</script>.',
    'confissao.a12.num': 'Artigo 12',
}}, token=TOKEN)
check(s == 200 and d['ok'], f'salvar Confissão -> {s}')
home_after = public('/')
check('Cremos em um só Deus e Pai, <em>teste de edição</em> .' in home_after, 'artigo 1 novo na página inicial')
check('<script>alert' not in home_after, 'script removido na página inicial')
check('>Artigo 12</div>' in home_after and 'Artigo 12 — Salvação e ressurreição' not in home_after, 'rótulo do artigo 12 editado')
check(home_after.count('data-edit=') == 26 and 'id="filosofia"' in home_after and 'id="respostas"' in home_after, 'resto da home intacto')
check(public('/teologia').count('data-edit=') == 27, 'Teologia não foi afetada')
for key in ('confissao.a1.text', 'confissao.a12.num'):
    s, d, _ = call('DELETE', '/api/admin/pages/inicio/blocks/' + key, token=TOKEN)
    check(s == 200, f'restaurar {key}')
check(public('/') == home_before, 'página inicial voltou byte a byte ao original')

# ---------------------------------------------------------------- trocar senha
print('Senha')
NOVA = PASSWORD + '#tmp'
s, d, _ = call('POST', '/api/admin/password', {'current': 'errada', 'next': NOVA}, token=TOKEN)
check(s == 401, 'senha atual errada -> 401')
s, d, _ = call('POST', '/api/admin/password', {'current': PASSWORD, 'next': 'curta'}, token=TOKEN)
check(s == 400, 'senha curta -> 400')
s, d, _ = call('POST', '/api/admin/password', {'current': PASSWORD, 'next': PASSWORD}, token=TOKEN)
check(s == 400, 'senha igual -> 400')
s, d, _ = call('POST', '/api/admin/password', {'current': PASSWORD, 'next': NOVA}, token=TOKEN)
check(s == 200 and d.get('token'), 'troca de senha')
NEW_TOKEN = d['token']
s, _, _ = call('GET', '/api/admin/me', token=TOKEN)
check(s == 401, 'token antigo invalidado pela troca')
s, _, _ = call('GET', '/api/admin/me', token=NEW_TOKEN)
check(s == 200, 'token novo vale')
s, _, _ = call('POST', '/api/admin/login', {'password': PASSWORD}, ip=ip_of(4))
check(s == 401, 'senha antiga não entra mais')
s, _, _ = call('POST', '/api/admin/login', {'password': NOVA}, ip=ip_of(4))
check(s == 200, 'senha nova entra')
s, d, _ = call('POST', '/api/admin/password', {'current': NOVA, 'next': PASSWORD}, token=NEW_TOKEN)
check(s == 200, 'volta para a senha original')
s, _, _ = call('POST', '/api/admin/login', {'password': PASSWORD}, ip=ip_of(5))
check(s == 200, 'senha original volta a entrar')

print(f'\n{checks} verificações, {len(failures)} falha(s).')
sys.exit(1 if failures else 0)
