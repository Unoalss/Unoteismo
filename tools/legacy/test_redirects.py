import urllib.request

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(NoRedirectHandler)

test_redirects = [
    'https://unoteismo.arthurlazarodesousasantos.workers.dev/biblia.html',
    'https://unoteismo.arthurlazarodesousasantos.workers.dev/index.html',
    'https://unoteismo.arthurlazarodesousasantos.workers.dev/home',
    'https://unoteismo.arthurlazarodesousasantos.workers.dev/metafisica'
]

for url in test_redirects:
    req = urllib.request.Request(url, headers={'User-Agent': 'Googlebot'})
    try:
        resp = opener.open(req)
        print(f"{url} -> {resp.status}")
    except urllib.error.HTTPError as e:
        loc = e.headers.get('Location')
        print(f"{url} -> {e.code} Redirect to: {loc}")
