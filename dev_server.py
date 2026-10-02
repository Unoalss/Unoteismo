"""Servidor local simples (sem Cloudflare) que imita as rotas limpas do site.

    python dev_server.py [porta]      # padrão: 8085  ->  http://localhost:8085/

Serve os arquivos da RAIZ do projeto (não de public/) e traduz as URLs limpas:
    /  /biblia  /biblia/joao/3  /teologia  /sobre ...   ->  o .html correspondente
    /api/*  ->  404 em JSON (o site cai nos arquivos estáticos data/pt e data/int, como antes)
Para testar o Worker de verdade (SSR, API, D1 local), use:  wrangler dev
"""
import http.server
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8085
PAGES = {
    '/': 'index.html',
    '/teologia': 'teologia.html',
    '/soteriologia': 'soteriologia.html',
    '/communicatio-idiomatum': 'communicatio-idiomatum.html',
    '/batismo': 'batismo.html',
    '/forma-da-consciencia': 'forma-da-consciencia.html',
    '/sobre': 'sobre.html',
    '/privacidade': 'privacidade.html',
    '/comparativo': 'comparativo.html',
    '/biblia': 'biblia.html'
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def translate_path(self, path):
        clean = path.split('?', 1)[0].split('#', 1)[0]
        if clean in PAGES:
            path = '/' + PAGES[clean]
        elif re.match(r'^/biblia/[^/]+(/\d+)?/?$', clean):
            path = '/biblia.html'
        return super().translate_path(path)

    def do_GET(self):
        if self.path.startswith('/api/'):
            body = json.dumps({'error': 'API indisponível no servidor local'}).encode()
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    print(f'Servidor local em http://localhost:{PORT}/  (Ctrl+C para parar)')
    http.server.ThreadingHTTPServer(('', PORT), Handler).serve_forever()
