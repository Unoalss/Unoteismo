import sqlite3
import json

db_path = r"C:\Users\Administrador\Desktop\DIC\arquivos\site\Barach-m.interlinear.SQLite3"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT book_number, chapter, verse, text_greek, text_pt, text FROM verses WHERE book_number = 10 AND chapter = 1 AND verse = 1")
row = cur.fetchone()
print("Book 10 (Gen 1:1) from SQLite:")
print(" GREEK:", row[3])
print(" PT:   ", row[4])
print(" TEXT: ", repr(row[5]))

# Compare with our current data/int/gn.json
with open(r"c:\Users\Administrador\Desktop\Nova pasta\data\int\gn.json", "r", encoding="utf-8") as f:
    gn_data = json.load(f)

v1 = gn_data["chapters"]["1"][0]
print("\nCurrent data/int/gn.json (Gen 1:1):")
print(" pairs:", v1.get("pairs"))
print(" literal text:", v1.get("p"))
