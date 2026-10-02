import sqlite3
import os
import json

db_path = r"C:\Users\Administrador\Desktop\DIC\arquivos\site\Barach-m.interlinear.SQLite3"
print(f"Database path: {db_path}")
print(f"File size: {os.path.getsize(db_path):,} bytes")

conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cur.fetchall()]
print(f"Tables: {tables}")

for t in tables:
    cur.execute(f'SELECT count(*) FROM "{t}"')
    cnt = cur.fetchone()[0]
    cur.execute(f'PRAGMA table_info("{t}")')
    cols = [c[1] for c in cur.fetchall()]
    print(f"\n--- Table: {t} (Total rows: {cnt:,}) ---")
    print(f"Columns: {cols}")
    cur.execute(f'SELECT * FROM "{t}" LIMIT 5')
    rows = cur.fetchall()
    for r in rows:
        print(" ", repr(r).encode('ascii', 'replace').decode('ascii'))
