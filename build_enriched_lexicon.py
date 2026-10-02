import sqlite3
import unicodedata
import json
import os
import re

db_path = r"C:\Users\Administrador\Desktop\DIC\arquivos\site\Barach-m.interlinear.SQLite3"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

def strip_accents(s):
    if not s: return ""
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()

print("1. Loading lexicon_barach (47k enriched Portuguese definitions)...")
cur.execute("SELECT word_norm, word_original, greek, senses, senses_pt FROM lexicon_barach WHERE senses_pt IS NOT NULL AND senses_pt != ''")
barach_map = {}
for r in cur.fetchall():
    wn = strip_accents(r[0])
    wo = strip_accents(r[1])
    wg = strip_accents(r[2])
    sense_pt = r[4].strip()
    if sense_pt:
        for k in [wn, wo, wg]:
            if k and k not in barach_map:
                barach_map[k] = sense_pt

print(f"   Mapped {len(barach_map)} barach lookup keys")

print("2. Loading lexicon_extra (5k lemmas with transliteration, pronunciation & theological definitions)...")
cur.execute("SELECT lemma_norm, lemma_original, greek, transliteration, pronunciation, senses FROM lexicon_extra")
extra_map = {}
for r in cur.fetchall():
    ln = strip_accents(r[0])
    lo = strip_accents(r[1])
    lg = strip_accents(r[2])
    data = {
        'tr': (r[3] or '').strip(),
        'pr': (r[4] or '').strip(),
        's': (r[5] or '').strip()
    }
    for k in [ln, lo, lg]:
        if k and k not in extra_map:
            extra_map[k] = data

print(f"   Mapped {len(extra_map)} extra theological lookup keys")

print("3. Loading dictionary (61k Biblical words)...")
cur.execute("SELECT word, word_no_accent, gloss, freq, lemma, gram FROM dictionary")
dict_rows = cur.fetchall()
print(f"   Total rows in dictionary table: {len(dict_rows)}")

dict_exact = {}
dict_search_index = []
letter_buckets = {}

for r in dict_rows:
    w = (r[0] or '').strip()
    w_clean = re.sub(r'[.,;·!?()\"“”]', '', w).strip()
    w_norm = strip_accents(r[1] or w_clean)
    gloss = (r[2] or '').strip()
    freq = r[3] or 0
    lemma = (r[4] or '').strip()
    l_norm = strip_accents(lemma)
    gram = (r[5] or '').strip()

    if not w_norm:
        continue

    # Enrich from barach and extra
    b_sense = barach_map.get(w_norm) or barach_map.get(l_norm)
    e_info = extra_map.get(l_norm) or extra_map.get(w_norm)

    entry = {
        'w': w,
        'l': lemma,
        't': gloss,
        'g': gram,
        'f': freq
    }

    if e_info:
        if e_info.get('tr'): entry['tr'] = e_info['tr']
        if e_info.get('pr'): entry['pr'] = e_info['pr']
        if e_info.get('s'): entry['th'] = e_info['s']

    if b_sense:
        entry['s'] = b_sense

    # Save to exact map by inflected word
    if w_norm not in dict_exact or freq > dict_exact[w_norm].get('f', 0):
        dict_exact[w_norm] = entry

    # Also ensure canonical lemma is indexed in exact map if not already present
    if l_norm and (l_norm not in dict_exact or freq > dict_exact[l_norm].get('f', 0)):
        dict_exact[l_norm] = entry

    # Also index by transliteration if available
    if entry.get('tr'):
        tr_norm = strip_accents(entry['tr'])
        if tr_norm and (tr_norm not in dict_exact or freq > dict_exact[tr_norm].get('f', 0)):
            dict_exact[tr_norm] = entry

    # Search item
    search_item = {
        'w': w,
        'l': lemma,
        't': gloss,
        'g': gram,
        'f': freq
    }
    if entry.get('tr'): search_item['tr'] = entry['tr']
    if entry.get('pr'): search_item['pr'] = entry['pr']
    if entry.get('th'): search_item['th'] = entry['th'][:220]
    if b_sense: search_item['s'] = b_sense[:180]

    dict_search_index.append(search_item)

    # Letter bucket
    first_letter = w_norm[0] if w_norm else '_'
    if first_letter not in letter_buckets:
        letter_buckets[first_letter] = []
    letter_buckets[first_letter].append(entry)

print(f"4. Saving dict_exact.json ({len(dict_exact):,} entries)...")
os.makedirs(r"c:\Users\Administrador\Desktop\Nova pasta\data", exist_ok=True)
with open(r"c:\Users\Administrador\Desktop\Nova pasta\data\dict_exact.json", "w", encoding="utf-8") as f:
    json.dump(dict_exact, f, ensure_ascii=False, indent=None, separators=(',', ':'))

print(f"5. Saving dict_search_index.json ({len(dict_search_index):,} search items)...")
with open(r"c:\Users\Administrador\Desktop\Nova pasta\data\dict_search_index.json", "w", encoding="utf-8") as f:
    json.dump(dict_search_index, f, ensure_ascii=False, indent=None, separators=(',', ':'))

print(f"6. Saving letter slices ({len(letter_buckets)} letters)...")
dict_dir = r"c:\Users\Administrador\Desktop\Nova pasta\data\dict"
os.makedirs(dict_dir, exist_ok=True)
for letter, items in letter_buckets.items():
    safe_name = letter if letter.isalnum() else '_'
    filepath = os.path.join(dict_dir, f"{safe_name}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=None, separators=(',', ':'))

print("\n--- Summary of Generated Files ---")
print(f"dict_exact.json: {os.path.getsize(r'c:\Users\Administrador\Desktop\Nova pasta\data\dict_exact.json'):,} bytes")
print(f"dict_search_index.json: {os.path.getsize(r'c:\Users\Administrador\Desktop\Nova pasta\data\dict_search_index.json'):,} bytes")
print("Enrichment complete!")
