import sqlite3
import unicodedata

db_path = r"C:\Users\Administrador\Desktop\DIC\arquivos\site\Barach-m.interlinear.SQLite3"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

def strip_accents(s):
    if not s: return ""
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()

print("--- Checking lexicon_extra samples ---")
cur.execute("SELECT lemma_norm, lemma_original, greek, transliteration, pronunciation, senses FROM lexicon_extra LIMIT 5")
for r in cur.fetchall():
    print("EXTRA:", r[0], "|", r[1], "|", r[3], "|", r[4])
    print("SENSES:", r[5][:100] if r[5] else None)
    print()

print("--- Checking lexicon_barach samples ---")
cur.execute("SELECT word_norm, word_original, greek, senses, senses_pt FROM lexicon_barach LIMIT 5")
for r in cur.fetchall():
    print("BARACH:", r[0], "|", r[1], "|", r[2])
    print("PT:", r[4][:100] if r[4] else None)
    print("EN:", r[3][:100] if r[3] else None)
    print()

print("--- Checking verses sample ---")
cur.execute("SELECT book_number, chapter, verse, text_greek, text_pt, word_count FROM verses LIMIT 3")
for r in cur.fetchall():
    print("VERSE:", r[0], r[1], r[2], "words:", r[5])
    print("GREEK:", r[3][:80] if r[3] else None)
    print("PT:", r[4][:80] if r[4] else None)
    print()

print("--- Checking books ---")
cur.execute("SELECT book_number, short_name, long_name FROM books")
books = cur.fetchall()
print(f"Total books in SQLite: {len(books)}")
for b in books[:10]:
    print(" ", b)
print(" ...")
for b in books[-5:]:
    print(" ", b)

