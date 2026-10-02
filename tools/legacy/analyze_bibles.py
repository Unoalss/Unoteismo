import zipfile, xml.etree.ElementTree as ET, re, sys
sys.stdout.reconfigure(encoding='utf-8')

def analyze_docx(path, name):
    print(f"\n==========================================")
    print(f"ANALYZING: {name} ({path})")
    print(f"==========================================")
    with zipfile.ZipFile(path) as z:
        tree = ET.fromstring(z.read('word/document.xml'))
        
        paragraphs = []
        for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            t = ''.join([node.text for node in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]).strip()
            if t:
                paragraphs.append(t)
        
        print(f"Total paragraphs: {len(paragraphs):,}")
        
        # Detect books / chapter markers
        headings = []
        for i, p in enumerate(paragraphs):
            # check common patterns for book / chapter
            if len(p) < 80 and any(kw in p.upper() for kw in ['LIVRO', 'CAPÍTULO', 'CAPITULO', 'GÊNESIS', 'GENESIS', 'MATEUS', 'JOÃO', 'TEÓFILO', 'AUTÓLICO', 'CLEMENTE', 'INÁCIO']):
                headings.append((i, p))
        
        print(f"Sample headings ({len(headings)} found):")
        for idx, h in headings[:30]:
            print(f"  [{idx}] {h}")

analyze_docx('Bíblia Sagrada (port-br) Unoteista.docx', 'BIBLIA NORMAL')
analyze_docx('Biblia_Interlinear_Canon_Unoteista_77livros.docx', 'BIBLIA INTERLINEAR')
