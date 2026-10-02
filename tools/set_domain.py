"""Troca o endereço do site em todos os arquivos (canonical, JSON-LD, Open Graph, robots, README...).

    python tools/set_domain.py https://www.seudominio.com.br --dry-run   # só mostra o que mudaria
    python tools/set_domain.py https://www.seudominio.com.br             # aplica

A origem atual vem de SITE_URL em wrangler.jsonc. Depois de aplicar: python make_public.py --deploy
e cadastre o novo domínio no Google Search Console (o domínio antigo deve redirecionar para o novo).
"""
import glob
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
dry = '--dry-run' in sys.argv
if len(args) != 1 or not re.match(r'^https?://[^/\s]+$', args[0].rstrip('/')):
    sys.exit('Uso: python tools/set_domain.py https://novo-dominio [--dry-run]')
new = args[0].rstrip('/')

cfg_path = os.path.join(ROOT, 'wrangler.jsonc')
cfg = open(cfg_path, encoding='utf-8').read()
old = re.search(r'"SITE_URL"\s*:\s*"([^"]+)"', cfg).group(1).rstrip('/')
if old == new:
    sys.exit('O domínio já é ' + new)

targets = [os.path.join(ROOT, f) for f in ('wrangler.jsonc', 'robots.txt', 'README_GITHUB_UNOTEISMO.md')]
targets += glob.glob(os.path.join(ROOT, '*.html'))
changed = 0
for path in targets:
    if not os.path.exists(path):
        continue
    text = open(path, encoding='utf-8', newline='').read()
    n = text.count(old)
    if n:
        print(f'  {os.path.basename(path)}: {n} ocorrência(s)')
        changed += n
        if not dry:
            open(path, 'w', encoding='utf-8', newline='').write(text.replace(old, new))

print(f'{changed} ocorrência(s) de {old} -> {new}' + ('  (simulação, nada foi gravado)' if dry else ''))
if not dry:
    subprocess.check_call([sys.executable, os.path.join(ROOT, 'generate_sitemap.py')])
    print('Próximo passo: python make_public.py --deploy')
