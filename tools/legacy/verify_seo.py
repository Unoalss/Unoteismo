import urllib.request

urls = [
    'https://unoteismo.arthurlazarodesousasantos.workers.dev/robots.txt',
    'https://unoteismo.arthurlazarodesousasantos.workers.dev/sitemap.xml',
    'https://unoteismo.arthurlazarodesousasantos.workers.dev/biblia',
]

for u in urls:
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            ct = resp.headers.get('Content-Type')
            print(f"{u} -> {resp.status} | Content-Type: {ct} | Size: {len(data)} bytes")
    except Exception as e:
        print(f"{u} -> ERROR: {e}")
