"""Acrescenta/atualiza o campo `slug` em data/books.json (rode da raiz do projeto)."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slugs import slugify

path = os.path.join('data', 'books.json')
with open(path, 'r', encoding='utf-8') as f:
    books = json.load(f)

seen = {}
for b in books:
    b['slug'] = slugify(b['name'])
    if b['slug'] in seen:
        raise SystemExit(f"Slug duplicado: {b['slug']} ({b['id']} e {seen[b['slug']]})")
    seen[b['slug']] = b['id']

with open(path, 'w', encoding='utf-8', newline='\r\n') as f:
    json.dump(books, f, ensure_ascii=False, indent=2)

print(f'{len(books)} livros com slug. Exemplos:', [b['slug'] for b in books[:3] + books[8:10] + books[44:46]])
