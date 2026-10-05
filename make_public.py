"""Monta a pasta public/ (o que o Cloudflare publica) a partir da raiz do projeto.

Uso (da raiz do projeto, ou de qualquer pasta):
    python make_public.py            # monta public/ e confere as referências
    python make_public.py --deploy   # monta e roda "wrangler deploy"

Regras:
  * Só entra em public/ o que está na lista abaixo (lista fechada: protótipos,
    scripts e arquivos de dados grandes nunca vão junto por engano).
  * Falta de um arquivo obrigatório interrompe a montagem — antes o script
    apagava public/ e seguia sem avisar, derrubando páginas.
  * Depois de copiar, confere se todo href/src local das páginas existe em public/.
"""
import hashlib
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, 'public')

PAGES = ['index.html', 'biblia.html', 'teologia.html', 'soteriologia.html', 'communicatio-idiomatum.html', 'batismo.html', 'forma-da-consciencia.html', 'sobre.html', 'privacidade.html', 'comparativo.html', '404.html', 'admin.html', 'pedidos-de-oracao.html', 'quizzes.html', 'categoria.html']
STYLES = ['versao.css', 'style.css', 'biblia.css', 'versao_biblia.css', 'teologia.css', 'admin.css', 'categoria.css']
SCRIPTS = ['site.js', 'biblia.js', 'admin.js', 'palavra_coracao.js', 'categoria.js']
IMAGES = ['logo_unoteismo.png', 'logo-64.png', 'logo-128.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png',
          'apple-touch-icon.png', 'favicon-48.png', 'og-image.png',
          'codigo_de_barras_isbn_9786502411940.svg', 'codigo_de_barras_isbn_9786502411940.png',
          'capa_frente_biblia_unoteista.webp', 'capa_frente_biblia_unoteista.png']
META = ['robots.txt', 'sitemap.xml', 'site.webmanifest', '_headers', '_redirects',
        'googlerYjJW0OeqtHHoSxkdebRaMzGb3eoxjKfHtVpzUdYm7E.html', 'google4bb1d4e1b48ee8e4.html']
DATA = ['data/books.json', 'data/bible_search_index.json', 'posts.json', 'data/posts.json']
SERVICE_WORKER = 'sw.js'  # recebe um hash de versão a cada montagem

REQUIRED = ['index.html', 'biblia.html', 'versao.css', 'site.js', SERVICE_WORKER, 'data/books.json']


def main():
    missing = [f for f in REQUIRED if not os.path.exists(os.path.join(ROOT, f))]
    if missing:
        sys.exit('ERRO: arquivos obrigatórios ausentes (public/ NÃO foi alterada):\n  ' + '\n  '.join(missing))

    # Esvazia o conteúdo (e não a pasta em si): no Windows o "wrangler dev" mantém a pasta aberta
    if os.path.isdir(PUBLIC):
        for name in os.listdir(PUBLIC):
            path = os.path.join(PUBLIC, name)
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)
    os.makedirs(os.path.join(PUBLIC, 'data'), exist_ok=True)

    copied = []
    for rel in PAGES + STYLES + SCRIPTS + IMAGES + META + DATA:
        src = os.path.join(ROOT, rel)
        if os.path.exists(src):
            dst = os.path.join(PUBLIC, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
            copied.append(rel)
        else:
            print(f'  (opcional ausente: {rel})')

    for folder in ['images', 'posts']:
        src_folder = os.path.join(ROOT, folder)
        if os.path.isdir(src_folder):
            dst_folder = os.path.join(PUBLIC, folder)
            shutil.copytree(src_folder, dst_folder, dirs_exist_ok=True)


    # Service worker com hash de versão: a cada montagem os caches antigos são descartados
    h = hashlib.sha1()
    for rel in sorted(copied):
        with open(os.path.join(PUBLIC, rel), 'rb') as f:
            h.update(f.read())
    build = h.hexdigest()[:10]
    with open(os.path.join(ROOT, SERVICE_WORKER), 'r', encoding='utf-8') as f:
        sw = f.read().replace('__BUILD__', build)
    with open(os.path.join(PUBLIC, SERVICE_WORKER), 'w', encoding='utf-8', newline='') as f:
        f.write(sw)

    # Confere referências locais das páginas
    problems = []
    ref = re.compile(r'\b(?:href|src)="(/[^"#?]*)')
    for page in PAGES:
        with open(os.path.join(PUBLIC, page), 'r', encoding='utf-8') as f:
            html = f.read()
        for m in ref.finditer(html):
            path = m.group(1)
            if path == '/' or path.startswith('/biblia') or path.startswith('/posts') or path.startswith('/categoria') or path in ('/teologia', '/soteriologia', '/communicatio-idiomatum', '/batismo', '/forma-da-consciencia', '/sobre', '/privacidade', '/comparativo', '/admin', '/pedidos-de-oracao', '/quizzes', '/quiz'):
                continue  # rotas servidas pelo Worker/assets sem extensão
            if path.startswith('//'):
                continue
            if not os.path.exists(os.path.join(PUBLIC, path.lstrip('/'))):
                problems.append(f'{page}: {path}')

    total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(PUBLIC) for f in fs)
    count = sum(len(fs) for _, _, fs in os.walk(PUBLIC))
    print(f'public/ montada: {count} arquivos, {total / 1024 / 1024:.2f} MB (versão do service worker: {build})')
    if problems:
        print('ATENÇÃO — referências a arquivos que não estão em public/:')
        for p in sorted(set(problems)):
            print('  ', p)
        sys.exit(1)
    print('Referências conferidas: tudo existe.')

    if '--deploy' in sys.argv:
        print('Publicando com wrangler deploy...')
        sys.exit(subprocess.call(['wrangler', 'deploy'], cwd=ROOT, shell=(os.name == 'nt')))


if __name__ == '__main__':
    main()
