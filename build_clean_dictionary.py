# -*- coding: utf-8 -*-
"""
Compilador Definitivo do Léxico Grego Bíblico do Unoteísmo.
Fonte de Verdade Autoritativa: Barach-m.interlinear.SQLite3 (61.047 formas bíblicas)
Enriquecido com anotações de: dicionario_grego_completo.txt
"""

import os
import sys
import json
import sqlite3
import unicodedata
import re

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"c:\Users\Administrador\Desktop\Nova pasta"
SQLITE_PATH = r"C:\Users\Administrador\Desktop\DIC\arquivos\site\Barach-m.interlinear.SQLite3"
TXT_PATH = r"c:\Users\Administrador\Desktop\DIC\arquivos\site\dicionario_grego_completo.txt"
DATA_DIR = os.path.join(BASE_DIR, "data")
DICT_DIR = os.path.join(DATA_DIR, "dict")

os.makedirs(DICT_DIR, exist_ok=True)

def strip_acc(s):
    if not s: return ""
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()

print("1. Conectando à base autoritativa SQLite:", SQLITE_PATH)
conn = sqlite3.connect(SQLITE_PATH)
c = conn.cursor()

sql_rows = c.execute("SELECT word, word_no_accent, gloss, freq, lemma, gram FROM dictionary ORDER BY freq DESC").fetchall()
print(f"-> {len(sql_rows):,} formas flexionadas carregadas do SQLite.")

# Dicionário de formas com acento
entries_by_word = {}
for w, no_acc, gloss, freq, lemma, gram in sql_rows:
    w = (w or "").strip()
    if not w: continue
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

print("2. Cruzando com o arquivo texto para enriquecer sinônimos e notas exegéticas...")
txt_enriched = 0
if os.path.exists(TXT_PATH):
    with open(TXT_PATH, "r", encoding="utf-8", errors="ignore") as f:
        f.readline() # header
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) >= 2:
                m = re.match(r'^([^(]+)(?:\(([^)]+)\))?', parts[0].strip())
                clean_w = m.group(1).strip() if m else parts[0].strip()
                trans = parts[1].strip()
                obs = parts[2].strip() if len(parts) > 2 else ""

                if clean_w in entries_by_word:
                    curr = entries_by_word[clean_w]
                    # Adicionar detalhes se ausentes
                    if not curr["o"] and obs:
                        curr["o"] = obs
                    if not curr["t"] and trans:
                        curr["t"] = trans
                    txt_enriched += 1

print(f"-> {txt_enriched:,} verbetes enriquecidos com definições cruzadas.")
print(f"-> Total de formas gregas únicas reais: {len(entries_by_word):,}")

# Criar mapa de consulta instantânea (dict_exact.json)
# Mapeia tanto a grafia exata com acento quanto a normalizada (sem acento)
dict_exact = {}
dict_by_first_char = {}
all_entries_sorted = list(entries_by_word.values())

for entry in all_entries_sorted:
    w = entry["w"]
    l = entry["l"]
    norm_w = strip_acc(w)
    norm_l = strip_acc(l)

    # Prioridade para termos com maior frequência
    if norm_w not in dict_exact or entry["f"] > dict_exact[norm_w].get("f", 0):
        dict_exact[norm_w] = entry
    if norm_l not in dict_exact:
        dict_exact[norm_l] = entry

    # Particionar por letra grega inicial
    fl = norm_w[0] if norm_w else "α"
    if fl not in dict_by_first_char:
        dict_by_first_char[fl] = []
    dict_by_first_char[fl].append(entry)

print(f"-> Mapeamento exato concluído: {len(dict_exact):,} chaves de consulta direta.")

# Salvar dict_exact.json
exact_path = os.path.join(DATA_DIR, "dict_exact.json")
with open(exact_path, "w", encoding="utf-8") as f:
    json.dump(dict_exact, f, ensure_ascii=False)
print("-> Salvo:", exact_path, f"({os.path.getsize(exact_path) // 1024:,} KB)")

# Salvar particionado por letra
for fl, entries in dict_by_first_char.items():
    file_name = f"{fl}.json"
    file_path = os.path.join(DICT_DIR, file_name)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False)

print(f"-> {len(dict_by_first_char)} arquivos alfabéticos gerados em data/dict/.")

# Salvar índice de busca para o drawer lateral
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
print("-> Salvo:", search_path, f"({os.path.getsize(search_path) // 1024:,} KB)")

print("\nCONCLUÍDO COM SUCESSO:")
print(f"- Formas flexionadas bíblicas: {len(entries_by_word):,}")
print(f"- Termos normalizados sem repetição: {len(dict_exact):,}")
