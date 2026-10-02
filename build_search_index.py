import os
import json
import time

def build_search_index():
    t0 = time.time()
    pt_dir = os.path.join(os.getcwd(), 'data', 'pt')
    books_file = os.path.join(os.getcwd(), 'data', 'books.json')
    out_file = os.path.join(os.getcwd(), 'data', 'bible_search_index.json')
    public_out_file = os.path.join(os.getcwd(), 'public', 'data', 'bible_search_index.json')
    
    if not os.path.exists(books_file):
        print(f"Erro: arquivo de cânon {books_file} não encontrado.")
        return

    if not os.path.exists(pt_dir):
        print(f"Erro: diretório {pt_dir} não encontrado.")
        return

    with open(books_file, 'r', encoding='utf-8') as f:
        books_data = json.load(f)

    canon_ids = [b['id'] for b in books_data]
    print(f"Indexando estritamente os {len(canon_ids)} livros do Cânon Sagrado...")

    verses = []
    total_verses = 0

    for bid in canon_ids:
        fname = f"{bid}.json"
        fpath = os.path.join(pt_dir, fname)
        if not os.path.exists(fpath):
            print(f"Aviso: arquivo {fname} não encontrado em {pt_dir}.")
            continue

        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        chapters = data.get('chapters', {})
        ch_keys = sorted(chapters.keys(), key=lambda x: int(x) if x.isdigit() else 9999)
        for ch_str in ch_keys:
            try:
                ch_num = int(ch_str)
            except ValueError:
                continue
            vs = chapters[ch_str]
            for v in vs:
                v_num = v.get('v')
                text = v.get('t', '').strip()
                if text:
                    # [book_id, chapter, verse, text]
                    verses.append([bid, ch_num, v_num, text])
                    total_verses += 1

    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(verses, f, ensure_ascii=False, separators=(',', ':'))

    if os.path.exists(os.path.dirname(public_out_file)):
        with open(public_out_file, 'w', encoding='utf-8') as f:
            json.dump(verses, f, ensure_ascii=False, separators=(',', ':'))

    size_mb = os.path.getsize(out_file) / (1024 * 1024)
    print(f"Índice bíblico gerado com sucesso!")
    print(f"Total de livros indexados: {len(canon_ids)} (Cânon Oficial de 69 Livros)")
    print(f"Total de versículos indexados: {total_verses}")
    print(f"Tamanho do arquivo: {size_mb:.2f} MB")
    print(f"Tempo decorrido: {time.time() - t0:.2f}s")

if __name__ == '__main__':
    build_search_index()
