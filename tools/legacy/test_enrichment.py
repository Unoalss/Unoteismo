import sqlite3
import unicodedata

db_path = r"C:\Users\Administrador\Desktop\DIC\arquivos\site\Barach-m.interlinear.SQLite3"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

def strip_accents(s):
    if not s: return ""
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()

cur.execute("SELECT word_norm, senses_pt FROM lexicon_barach WHERE senses_pt IS NOT NULL AND senses_pt != ''")
barach_rows = cur.fetchall()
barach_map = {strip_accents(r[0]): r[1] for r in barach_rows}
print(f"Unique normalized barach keys with senses_pt: {len(barach_map)}")

cur.execute("SELECT lemma_norm, transliteration, pronunciation, senses FROM lexicon_extra")
extra_rows = cur.fetchall()
extra_map = {strip_accents(r[0]): {'tr': r[1], 'pr': r[2], 'senses': r[3]} for r in extra_rows}
print(f"Unique normalized extra keys (lemmas): {len(extra_map)}")

cur.execute("SELECT word, word_no_accent, gloss, freq, source, lemma, gram FROM dictionary")
dict_rows = cur.fetchall()
print(f"Total dictionary rows: {len(dict_rows)}")

matched_barach = 0
matched_extra = 0
matched_any = 0

sample_enriched = []

for r in dict_rows:
    w = r[0]
    w_norm = strip_accents(r[1] or w)
    lemma = r[5] or ''
    l_norm = strip_accents(lemma)
    
    has_b = w_norm in barach_map or l_norm in barach_map
    has_e = l_norm in extra_map or w_norm in extra_map
    
    if has_b: matched_barach += 1
    if has_e: matched_extra += 1
    if has_b or has_e:
        matched_any += 1
        if len(sample_enriched) < 5:
            b_sense = barach_map.get(w_norm) or barach_map.get(l_norm)
            e_info = extra_map.get(l_norm) or extra_map.get(w_norm)
            sample_enriched.append({
                'word': w,
                'lemma': lemma,
                'gloss': r[2],
                'gram': r[6],
                'freq': r[3],
                'barach_sense': b_sense[:80] if b_sense else None,
                'extra_info': e_info
            })

print(f"Matched with barach senses: {matched_barach} / {len(dict_rows)} ({matched_barach/len(dict_rows)*100:.1f}%)")
print(f"Matched with extra lexicon: {matched_extra} / {len(dict_rows)} ({matched_extra/len(dict_rows)*100:.1f}%)")
print(f"Matched with at least one rich lexicon: {matched_any} / {len(dict_rows)} ({matched_any/len(dict_rows)*100:.1f}%)")

print("\n--- Samples of Enriched Entries ---")
for s in sample_enriched:
    print(s)

