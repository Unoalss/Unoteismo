import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

base = 'https://unoteismo.arthurlazarodesousasantos.workers.dev'
headers = {'User-Agent': 'Mozilla/5.0'}

def api(path):
    req = urllib.request.Request(base + path, headers=headers)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))

# 1. Books
books = api('/data/books.json')
print(f"Total de Livros carregados: {len(books)}")

# 2. Genesis ch 1 (PT)
gn1 = api('/api/chapter?book=gn&ch=1&mode=pt')
print(f"Gênesis 1 (PT): {len(gn1)} versículos. V1: {gn1[0]['t'][:50]}...")

# 3. João ch 1 (INT)
jo1 = api('/api/chapter?book=jo&ch=1&mode=int')
print(f"João 1 (INT): {len(jo1)} versículos. V1 pairs: {len(jo1[0]['pairs'])} palavras interlineares.")

# 4. Palavra 'logos'
w = api('/api/word?q=logos')
print(f"Verbete 'logos': {w['word']} ({w['lemma']}) - '{w['trans']}' - Pronúncia: /{w['pronounce']}/ - Freq: {w['freq']}x")

# 5. Busca 'amor'
res = api('/api/search?q=amor')
print(f"Busca 'amor': {len(res)} resultados encontrados. Primeiro: {res[0]['word']} ({res[0]['lemma']}) -> {res[0]['trans']}")
