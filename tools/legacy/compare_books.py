import sqlite3
import json
import os

db_path = r"C:\Users\Administrador\Desktop\DIC\arquivos\site\Barach-m.interlinear.SQLite3"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

with open(r"c:\Users\Administrador\Desktop\Nova pasta\data\books.json", "r", encoding="utf-8") as f:
    site_books = json.load(f)

print(f"Site books count: {len(site_books)}")
site_book_ids = [b['id'] for b in site_books]
print("First 10 site books:", [b['name'] for b in site_books[:10]])

cur.execute("SELECT book_number, short_name, long_name FROM books")
db_books = cur.fetchall()
print(f"DB books count: {len(db_books)}")

cur.execute("SELECT count(*) FROM verses")
print(f"Total verses in DB: {cur.fetchone()[0]}")

cur.execute("SELECT count(*) FROM dictionary")
print(f"Total dictionary entries in DB: {cur.fetchone()[0]}")

cur.execute("SELECT count(*) FROM lexicon_extra")
print(f"Total lexicon_extra entries in DB: {cur.fetchone()[0]}")

cur.execute("SELECT count(*) FROM lexicon_barach")
print(f"Total lexicon_barach entries in DB: {cur.fetchone()[0]}")

