import sqlite3

db_path = r"C:\Users\Administrador\Desktop\DIC\arquivos\site\Barach-m.interlinear.SQLite3"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT book_number, short_name, long_name, count(verse) FROM books JOIN verses USING(book_number) GROUP BY book_number ORDER BY book_number")
rows = cur.fetchall()

print(f"Total books with verses: {len(rows)}")
for r in rows:
    print(f"Book {r[0]:3d}: {r[1]:10s} | {r[2]:45s} | verses: {r[3]}")
