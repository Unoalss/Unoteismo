"""Gera sitemap.xml: páginas fixas + uma URL por capítulo (/biblia/<livro>/<capítulo>).

Uso (qualquer pasta):  python generate_sitemap.py
A origem do site vem de SITE_URL em wrangler.jsonc (troque lá ao migrar de domínio).
"""
import datetime
import json
import os
import re
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(ROOT, 'wrangler.jsonc'), 'r', encoding='utf-8') as f:
    SITE = re.search(r'"SITE_URL"\s*:\s*"([^"]+)"', f.read()).group(1).rstrip('/')

with open(os.path.join(ROOT, 'data', 'books.json'), 'r', encoding='utf-8') as f:
    books = json.load(f)

today = datetime.date.today().isoformat()

# (caminho, changefreq, prioridade) — os buscadores ignoram changefreq/priority, mas não custa manter
STATIC = [
    ('/', 'weekly', '1.0'),
    ('/biblia', 'weekly', '0.9'),
    ('/teologia', 'monthly', '0.8'),
    ('/soteriologia', 'monthly', '0.8'),
    ('/communicatio-idiomatum', 'monthly', '0.8'),
    ('/batismo', 'monthly', '0.8'),
    ('/forma-da-consciencia', 'monthly', '0.8'),
    ('/comparativo', 'monthly', '0.6'),
    ('/sobre', 'yearly', '0.4'),
    ('/privacidade', 'yearly', '0.2'),
]

lines = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']


def add(path, freq=None, prio=None):
    lines.append('  <url>')
    lines.append(f'    <loc>{escape(SITE + path)}</loc>')
    lines.append(f'    <lastmod>{today}</lastmod>')
    if freq:
        lines.append(f'    <changefreq>{freq}</changefreq>')
    if prio:
        lines.append(f'    <priority>{prio}</priority>')
    lines.append('  </url>')


for path, freq, prio in STATIC:
    add(path, freq, prio)

count = 0
for b in books:
    for ch in b['chapters']:
        add(f"/biblia/{b['slug']}/{ch}", 'monthly', '0.7' if ch == 1 else '0.6')
        count += 1

lines.append('</urlset>')
out = os.path.join(ROOT, 'sitemap.xml')
with open(out, 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(lines) + '\n')

print(f'sitemap.xml: {len(STATIC)} páginas + {count} capítulos = {len(STATIC) + count} URLs ({os.path.getsize(out) / 1024:.0f} KB)')
