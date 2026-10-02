"""Gera o slug de URL de cada livro (ex.: 'I Samuel' -> '1-samuel', 'João' -> 'joao').

Usado por build_bible_data.py e por tools/add_slugs.py. O Worker (src/index.js) e o
biblia.js apenas LEEM o campo `slug` de data/books.json — a regra vive só aqui.
"""
import re
import unicodedata

_ROMAN = {'i': '1', 'ii': '2', 'iii': '3'}


def slugify(name: str) -> str:
    s = unicodedata.normalize('NFD', name)
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower().strip()
    m = re.match(r'^(iii|ii|i)\s+(.*)$', s)
    if m:
        s = f'{_ROMAN[m.group(1)]} {m.group(2)}'
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s
