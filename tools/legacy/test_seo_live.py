import urllib.request

req = urllib.request.Request(
    'https://unoteismo.arthurlazarodesousasantos.workers.dev/biblia',
    headers={'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'}
)

with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')

checks = [
    ('<title>Bíblia Sagrada Online Completa', 'Title Tag'),
    ('name="description"', 'Meta Description'),
    ('name="keywords"', 'Meta Keywords'),
    ('rel="canonical" href="https://unoteismo.arthurlazarodesousasantos.workers.dev/biblia"', 'Canonical Link'),
    ('property="og:title"', 'Open Graph Title'),
    ('property="og:image"', 'Open Graph Image'),
    ('name="twitter:card"', 'Twitter Card'),
    ('"@type": "WebSite"', 'Schema WebSite'),
    ('"@type": "Book"', 'Schema Book'),
    ('"@type": "AudioObject"', 'Schema AudioObject'),
    ('"@type": "FAQPage"', 'Schema FAQPage'),
    ('class="seo-canon-directory"', 'SEO Canon Directory Section'),
    ('class="seo-book-pill"', 'SEO Book Pills (77 Books)'),
    ('class="seo-faq-card"', 'SEO FAQ Accordion Cards')
]

print("=== CHECKLIST SEO LIVE ===")
all_passed = True
for needle, label in checks:
    if needle in html:
        print(f" [PASS] {label}")
    else:
        print(f" [FAIL] {label}")
        all_passed = False

print(f"\nResultado final: {'100% APROVADO' if all_passed else 'PENDÊNCIAS ENCONTRADAS'}")
