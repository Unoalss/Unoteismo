# -*- coding: utf-8 -*-
"""
Script de unificação e enriquecimento do Léxico Grego Bíblico do Unoteísmo.
Combina:
1. Barach-m.interlinear.SQLite3 (61.047 formas flexionadas com lemas, análise gramatical e frequência)
2. dicionario_grego_completo.txt (59.714 verbetes clássicos e patrísticos)
"""

import os
import sys
import json
import sqlite3
import unicodedata

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"c:\Users\Administrador\Desktop\Nova pasta"
SQLITE_PATH = r"C:\Users\Administrador\Desktop\DIC\arquivos\site\Barach-m.interlinear.SQLite3"
TXT_PATH = r"c:\Users\Administrador\Desktop\DIC\arquivos\site\dicionario_grego_completo.txt"
DATA_DIR = os.path.join(BASE_DIR, "data")
DICT_DIR = os.path.join(DATA_DIR, "dict")

os.makedirs(DICT_DIR, exist_ok=True)

def strip_accents(s):
    if not s:
        return ""
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()

print("1. Conectando ao SQLite:", SQLITE_PATH)
conn = sqlite3.connect(SQLITE_PATH)
c = conn.cursor()

sql_rows = c.execute("SELECT word, word_no_accent, gloss, freq, lemma, gram FROM dictionary").fetchall()
print(f"-> {len(sql_rows):,} entradas carregadas do SQLite.")

entries_by_word = {}

for w, no_acc, gloss, freq, lemma, gram in sql_rows:
    w = (w or "").strip()
    if not w:
        continue
    lemma = (lemma or w).strip()
    gloss = (gloss or "").strip()
    gram = (gram or "").strip()
    freq = int(freq or 0)

    entries_by_word[w] = {
        "w": w,
        "l": lemma,
        "t": gloss,
        "o": gram,
        "f": freq
    }

print("2. Lendo arquivo de texto completo:", TXT_PATH)
txt_count = 0
with open(TXT_PATH, "r", encoding="utf-8") as f:
    for line in f:
        parts = line.strip().split("\t")
        if len(parts) >= 3:
            txt_count += 1
            w = parts[0].strip()
            l = parts[1].strip() if len(parts) > 1 else ""
            t = parts[2].strip() if len(parts) > 2 else ""
            o = parts[3].strip() if len(parts) > 3 else ""

            if w not in entries_by_word:
                entries_by_word[w] = {
                    "w": w,
                    "l": l or w,
                    "t": t,
                    "o": o,
                    "f": 0
                }
            else:
                curr = entries_by_word[w]
                # Enriquecer observação se SQLite não tinha
                if not curr["o"] and o:
                    curr["o"] = o
                # Enriquecer tradução se o TXT tiver definição mais detalhada
                if not curr["t"] and t:
                    curr["t"] = t
                elif t and t.lower() not in curr["t"].lower():
                    if len(curr["t"]) < 45:
                        curr["t"] = f"{curr['t']} • {t}"

print(f"-> {txt_count:,} linhas lidas do TXT.")
print(f"-> Total de verbetes únicos unificados: {len(entries_by_word):,}")

# Criar índices
dict_exact = {}
dict_by_first_char = {}
all_entries_sorted = sorted(entries_by_word.values(), key=lambda x: (-x.get("f", 0), x["w"]))

for entry in all_entries_sorted:
    w = entry["w"]
    l = entry["l"]
    norm_w = strip_accents(w)
    norm_l = strip_accents(l)

    # indexar palavra e lema
    if norm_w and norm_w not in dict_exact:
        dict_exact[norm_w] = entry
    if norm_l and norm_l not in dict_exact:
        dict_exact[norm_l] = entry

    # Particionar por primeira letra grega
    fl = norm_w[0] if norm_w else "α"
    if fl not in dict_by_first_char:
        dict_by_first_char[fl] = []
    dict_by_first_char[fl].append(entry)

print(f"-> Dicionário de busca exata: {len(dict_exact):,} formas mapeadas.")

# Salvar dict_exact.json
exact_path = os.path.join(DATA_DIR, "dict_exact.json")
with open(exact_path, "w", encoding="utf-8") as f:
    json.dump(dict_exact, f, ensure_ascii=False)
print("-> Salvo:", exact_path)

# Salvar particionado por letra
for fl, entries in dict_by_first_char.items():
    file_name = f"{fl}.json"
    file_path = os.path.join(DICT_DIR, file_name)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False)

print(f"-> {len(dict_by_first_char)} arquivos alfabéticos gerados em data/dict/.")

# Salvar índice de busca (compacto para o drawer)
search_index = [
    {
        "w": e["w"],
        "l": e["l"],
        "t": e["t"][:90],
        "o": e["o"][:60],
        "f": e.get("f", 0)
    }
    for e in all_entries_sorted
]

search_path = os.path.join(DATA_DIR, "dict_search_index.json")
with open(search_path, "w", encoding="utf-8") as f:
    json.dump(search_index, f, ensure_ascii=False)
print("-> Salvo:", search_path)
print(f"\nCONCLUÍDO COM SUCESSO: {len(entries_by_word):,} verbetes gregos disponíveis no site!")
