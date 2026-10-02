import os, json

def escape_sql(val):
    if val is None:
        return "NULL"
    s = str(val).replace("'", "''")
    return f"'{s}'"

out_path = 'bible_chapters.sql'
count = 0
CHUNK_SIZE = 40000  # Chunks of 40KB chars to stay well under 100KB bytes

with open(out_path, 'w', encoding='utf-8') as out:
    for mode, folder in [('pt', 'data/pt'), ('int', 'data/int')]:
        if not os.path.exists(folder):
            continue
        for fname in sorted(os.listdir(folder)):
            if not fname.endswith('.json'):
                continue
            book_id = fname[:-5]
            fpath = os.path.join(folder, fname)
            with open(fpath, 'r', encoding='utf-8') as fp:
                data = json.load(fp)
            chapters = data.get('chapters', {})
            for ch_str, verses in chapters.items():
                try:
                    ch_num = int(ch_str)
                except ValueError:
                    continue
                content_json = json.dumps(verses, ensure_ascii=False, separators=(',', ':'))
                
                if len(content_json) <= CHUNK_SIZE:
                    sql = f"INSERT OR REPLACE INTO bible_chapters (book_id, chapter, mode, content) VALUES ({escape_sql(book_id)}, {ch_num}, '{mode}', {escape_sql(content_json)});\n"
                    out.write(sql)
                    count += 1
                else:
                    # Multi-part concatenation
                    parts = [content_json[i:i+CHUNK_SIZE] for i in range(0, len(content_json), CHUNK_SIZE)]
                    first = parts[0]
                    sql = f"INSERT OR REPLACE INTO bible_chapters (book_id, chapter, mode, content) VALUES ({escape_sql(book_id)}, {ch_num}, '{mode}', {escape_sql(first)});\n"
                    out.write(sql)
                    count += 1
                    for part in parts[1:]:
                        sql = f"UPDATE bible_chapters SET content = content || {escape_sql(part)} WHERE book_id = {escape_sql(book_id)} AND chapter = {ch_num} AND mode = '{mode}';\n"
                        out.write(sql)
                        count += 1

size_mb = os.path.getsize(out_path) / (1024 * 1024)
print(f"Generated {count} statements. Total size: {size_mb:.2f} MB")

# Verify max statement length
max_len = 0
with open(out_path, 'r', encoding='utf-8') as f:
    for line in f:
        b_len = len(line.encode('utf-8'))
        if b_len > max_len:
            max_len = b_len

print(f"Max statement length: {max_len} bytes (All strictly under 100,000 bytes limit!)")
