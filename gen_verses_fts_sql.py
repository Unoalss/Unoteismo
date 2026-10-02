"""Gera verses_fts.sql: índice de busca de versículos (SQLite FTS5) para o D1.

Com essa tabela o /api/search_verses responde direto do servidor (sem o navegador baixar os
4,7 MB de bible_search_index.json). Sem ela, o Worker devolve 503 e o site continua usando o índice estático.

Uso:
    python gen_verses_fts_sql.py
    wrangler d1 execute unoteismo-db --remote --file=verses_fts.sql
"""
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'verses_fts.sql')
MAX_STMT = 60_000  # o D1 aceita até ~100 KB por instrução


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


with open(os.path.join(ROOT, 'data', 'books.json'), 'r', encoding='utf-8') as f:
    books = json.load(f)

n = 0
with open(OUT, 'w', encoding='utf-8', newline='\n') as out:
    out.write('DROP TABLE IF EXISTS verses_fts;\n')
    out.write("CREATE VIRTUAL TABLE verses_fts USING fts5(text, book_id UNINDEXED, chapter UNINDEXED, verse UNINDEXED, "
              "tokenize = 'unicode61 remove_diacritics 2');\n")
    head = 'INSERT INTO verses_fts (text, book_id, chapter, verse) VALUES '
    buf, size = [], len(head)

    def flush():
        global buf, size
        if buf:
            out.write(head + ',\n'.join(buf) + ';\n')
        buf, size = [], len(head)

    for b in books:
        with open(os.path.join(ROOT, 'data', 'pt', f"{b['id']}.json"), 'r', encoding='utf-8') as f:
            data = json.load(f)
        for ch in sorted(data['chapters'], key=int):
            for v in data['chapters'][ch]:
                row = f"({q(v['t'])},{q(b['id'])},{int(ch)},{int(v['v'])})"
                if size + len(row) > MAX_STMT:
                    flush()
                buf.append(row)
                size += len(row) + 2
                n += 1
    flush()

print(f'verses_fts.sql: {n} versículos ({os.path.getsize(OUT) / 1024 / 1024:.1f} MB)')
