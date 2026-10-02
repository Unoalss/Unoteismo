import json, os

def escape_sql(val):
    if val is None or val == "":
        return "NULL"
    s = str(val).replace("'", "''")
    return f"'{s}'"

out_path = 'lexicon.sql'
count = 0

with open('data/dict_exact.json', 'r', encoding='utf-8') as fp:
    d = json.load(fp)

with open(out_path, 'w', encoding='utf-8') as out:
    for word_key, item in d.items():
        w = item.get('w')
        l = item.get('l')
        t = item.get('t')
        g = item.get('g')
        f = item.get('f')
        tr = item.get('tr')
        pr = item.get('pr')
        s = item.get('s')
        th = item.get('th')
        
        freq_sql = str(f) if f is not None else "NULL"
        
        sql = (
            f"INSERT OR REPLACE INTO lexicon (word_key, word, lemma, trans, gram, freq, translit, pronounce, senses, theology) "
            f"VALUES ({escape_sql(word_key)}, {escape_sql(w)}, {escape_sql(l)}, {escape_sql(t)}, {escape_sql(g)}, {freq_sql}, "
            f"{escape_sql(tr)}, {escape_sql(pr)}, {escape_sql(s)}, {escape_sql(th)});\n"
        )
        out.write(sql)
        count += 1

size_mb = os.path.getsize(out_path) / (1024 * 1024)
print(f"Generated {count} lexicon statements. Total size: {size_mb:.2f} MB")
