import sqlite3
import unicodedata
import json
import os

db_path = r"C:\Users\Administrador\Desktop\DIC\arquivos\site\Barach-m.interlinear.SQLite3"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

def strip_accents(s):
    if not s: return ""
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()

print("Loading lexicon_barach...")
cur.execute("SELECT word_norm, senses_pt FROM lexicon_barach WHERE senses_pt IS NOT NULL AND senses_pt != ''")
barach_map = {}
for r in cur.fetchall():
    k = strip_accents(r[0])
    if k not in barach_map:
        # Clean text slightly
        sense = r[1].strip()
        barach_map[k] = sense

print(f"Loaded {len(barach_map)} barach entries")

print("Loading lexicon_extra...")
cur.execute("SELECT lemma_norm, transliteration, pronunciation, senses FROM lexicon_extra")
extra_map = {}
for r in cur.fetchall():
    k = strip_accents(r[0])
    extra_map[k] = {
        'tr': (r[1] or '').strip(),
        'pr': (r[2] or '').strip(),
        's': (r[3] or '').strip()
    }

print(f"Loaded {len(extra_map)} extra entries")

print("Processing dictionary...")
cur.execute("SELECT word, word_no_accent, gloss, freq, lemma, gram FROM dictionary")
dict_rows = cur.fetchall()

exact_map = {}
search_list = []

for r in dict_rows:
    w = (r[0] or '').strip()
    w_norm = strip_accents(r[1] or w)
    lemma = (r[4] or '').strip()
    l_norm = strip_accents(lemma)
    gloss = (r[2] or '').strip()
    freq = r[3] or 0
    gram = (r[5] or '').strip()
    
    # Enrichment
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
        
    if w_norm not in exact_map or freq > exact_map[w_norm].get('f', 0):
        exact_map[w_norm] = entry
        
    # Search item (compact)
    search_entry = {
        'w': w,
        'l': lemma,
        't': gloss,
        'g': gram,
        'f': freq
    }
    if e_info and e_info.get('tr'):
        search_entry['tr'] = e_info['tr']
    if b_sense:
        search_entry['s'] = b_sense[:150] # compact preview for search
    search_list.append(search_entry)

print(f"Total exact keys: {len(exact_map)}")
print(f"Total search items: {len(search_list)}")

# Test json dump size in memory
sample_json = json.dumps(exact_map, ensure_ascii=False)
print(f"dict_exact.json size: {len(sample_json):,} bytes ({len(sample_json)/1024/1024:.2f} MB)")

sample_search_json = json.dumps(search_list, ensure_ascii=False)
print(f"dict_search_index.json size: {len(sample_search_json):,} bytes ({len(sample_search_json)/1024/1024:.2f} MB)")

