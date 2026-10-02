import zipfile, xml.etree.ElementTree as ET, re, sys, json, os, unicodedata, time

sys.stdout.reconfigure(encoding='utf-8')

print("==========================================================")
print("COMPILADOR DO CÂNON UNOTEÍSTA: BÍBLIA & LÉXICO GREGO")
print("==========================================================")
t0 = time.time()

DATA_DIR = os.path.join(os.getcwd(), 'data')
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, 'pt'), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, 'int'), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, 'dict'), exist_ok=True)

def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()

# =========================================================================
# 1. PROCESSAR DICIONÁRIO GREGO COMPLETO (59.714 verbetes)
# =========================================================================
print("\n[1/3] Processando Dicionário Grego Completo...")
dict_entries = []
dict_by_clean_word = {}
dict_by_first_char = {}

with open('dicionario_grego_completo.txt', 'r', encoding='utf-8', errors='ignore') as f:
    header = f.readline()
    for line in f:
        parts = line.strip().split('\t')
        if len(parts) >= 2:
            greek_raw = parts[0].strip()
            trans = parts[1].strip()
            obs = parts[2].strip() if len(parts) > 2 else ''
            
            clean_word = greek_raw
            lemma = greek_raw
            m = re.match(r'^([^(]+)(?:\(([^)]+)\))?', greek_raw)
            if m:
                clean_word = m.group(1).strip()
                lemma = m.group(2).strip() if m.group(2) else clean_word
            
            item = {
                'w': clean_word,
                'l': lemma,
                't': trans,
                'o': obs
            }
            dict_entries.append(item)
            
            norm_w = strip_accents(clean_word)
            norm_l = strip_accents(lemma)
            
            if norm_w not in dict_by_clean_word:
                dict_by_clean_word[norm_w] = item
            if norm_l not in dict_by_clean_word:
                dict_by_clean_word[norm_l] = item
            
            fl = norm_w[0] if norm_w else '_'
            if fl not in dict_by_first_char:
                dict_by_first_char[fl] = []
            dict_by_first_char[fl].append(item)

print(f"-> {len(dict_entries):,} verbetes processados.")

# Salvar dicionário particionado por letra
for fl, entries in dict_by_first_char.items():
    safe_name = f"char_{ord(fl)}.json" if not fl.isalnum() else f"{fl}.json"
    with open(os.path.join(DATA_DIR, 'dict', safe_name), 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False)

# Salvar índice de busca (completo e rápido)
search_index = [
    {
        'w': e['w'],
        'l': e['l'],
        't': e['t'][:80],
        'o': e['o'][:50]
    }
    for e in dict_entries
]
with open(os.path.join(DATA_DIR, 'dict_search_index.json'), 'w', encoding='utf-8') as f:
    json.dump(search_index, f, ensure_ascii=False)

with open(os.path.join(DATA_DIR, 'dict_exact.json'), 'w', encoding='utf-8') as f:
    json.dump(dict_by_clean_word, f, ensure_ascii=False)

print("-> Dicionário compilado com sucesso.")

# =========================================================================
# 2. DEFINIÇÃO CANÔNICA DOS 78 LIVROS (77 LIVROS + PRELÚDIO AUTÓLICO)
# =========================================================================
CANON_BOOKS = [
    # Prelúdio Apologético
    {"id": "aut", "name": "A Autólico", "greek": "Πρὸς Αὐτόλυκον", "testament": "preludio", "abbr": "Aut", "author": "Teófilo de Antioquia"},
    
    # Antigo Testamento (42 Livros)
    {"id": "gn", "name": "Gênesis", "greek": "Γένεσις", "testament": "at", "abbr": "Gn"},
    {"id": "ex", "name": "Êxodo", "greek": "Ἔξοδος", "testament": "at", "abbr": "Éx"},
    {"id": "lv", "name": "Levítico", "greek": "Λευϊτικόν", "testament": "at", "abbr": "Lv"},
    {"id": "nm", "name": "Números", "greek": "Ἀριθμοί", "testament": "at", "abbr": "Nm"},
    {"id": "dt", "name": "Deuteronômio", "greek": "Δευτερονόμιον", "testament": "at", "abbr": "Dt"},
    {"id": "js", "name": "Josué", "greek": "Ἰησοῦς", "testament": "at", "abbr": "Js"},
    {"id": "jz", "name": "Juízes", "greek": "Κριταί", "testament": "at", "abbr": "Jz"},
    {"id": "rt", "name": "Rute", "greek": "Ῥοὺθ", "testament": "at", "abbr": "Rt"},
    {"id": "1sm", "name": "I Samuel", "greek": "Βασιλειῶν Αʹ", "testament": "at", "abbr": "1Sm"},
    {"id": "2sm", "name": "II Samuel", "greek": "Βασιλειῶν Βʹ", "testament": "at", "abbr": "2Sm"},
    {"id": "1rs", "name": "I Reis", "greek": "Βασιλειῶν Γʹ", "testament": "at", "abbr": "1Rs"},
    {"id": "2rs", "name": "II Reis", "greek": "Βασιλειῶν Δʹ", "testament": "at", "abbr": "2Rs"},
    {"id": "1cr", "name": "I Crônicas", "greek": "Παραλειπομένων Αʹ", "testament": "at", "abbr": "1Cr"},
    {"id": "2cr", "name": "II Crônicas", "greek": "Παραλειπομένων Βʹ", "testament": "at", "abbr": "2Cr"},
    {"id": "ed", "name": "Esdras", "greek": "Ἔσδρας", "testament": "at", "abbr": "Ed"},
    {"id": "ne", "name": "Neemias", "greek": "Νεεμίας", "testament": "at", "abbr": "Ne"},
    {"id": "et", "name": "Ester", "greek": "Ἐσθήρ", "testament": "at", "abbr": "Et"},
    {"id": "job", "name": "Jó", "greek": "Ἰώβ", "testament": "at", "abbr": "Jó"},
    {"id": "sl", "name": "Salmos", "greek": "Ψαλμοί", "testament": "at", "abbr": "Sl"},
    {"id": "pv", "name": "Provérbios", "greek": "Παροιμίαι", "testament": "at", "abbr": "Pv"},
    {"id": "ec", "name": "Eclesiastes", "greek": "Ἐκκλησιαστής", "testament": "at", "abbr": "Ec"},
    {"id": "ct", "name": "Cântico dos Cânticos", "greek": "Ἆσμα", "testament": "at", "abbr": "Ct"},
    {"id": "sb", "name": "Sabedoria de Salomão", "greek": "Σοφία Σαλωμῶνος", "testament": "at", "abbr": "Sb"},
    {"id": "eclo", "name": "Eclesiástico", "greek": "Σοφία Σιράχ", "testament": "at", "abbr": "Eclo"},
    {"id": "is", "name": "Isaías", "greek": "Ἠσαΐας", "testament": "at", "abbr": "Is"},
    {"id": "jr", "name": "Jeremias", "greek": "Ἱερεμίας", "testament": "at", "abbr": "Jr"},
    {"id": "lm", "name": "Lamentações", "greek": "Θρῆνοι", "testament": "at", "abbr": "Lm"},
    {"id": "br", "name": "Baruque", "greek": "Βαρούχ", "testament": "at", "abbr": "Br"},
    {"id": "ez", "name": "Ezequiel", "greek": "Ἰεζεκιήλ", "testament": "at", "abbr": "Ez"},
    {"id": "dn", "name": "Daniel", "greek": "Δανιήλ", "testament": "at", "abbr": "Dn"},
    {"id": "os", "name": "Oséias", "greek": "Ὠσηέ", "testament": "at", "abbr": "Os"},
    {"id": "jl", "name": "Joel", "greek": "Ἰωήλ", "testament": "at", "abbr": "Jl"},
    {"id": "am", "name": "Amós", "greek": "Ἀμώς", "testament": "at", "abbr": "Am"},
    {"id": "ob", "name": "Obadias", "greek": "Ἀβδιού", "testament": "at", "abbr": "Ob"},
    {"id": "jn", "name": "Jonas", "greek": "Ἰωνᾶς", "testament": "at", "abbr": "Jn"},
    {"id": "mq", "name": "Miquéias", "greek": "Μιχαίας", "testament": "at", "abbr": "Mq"},
    {"id": "na", "name": "Naum", "greek": "Ναούμ", "testament": "at", "abbr": "Na"},
    {"id": "hc", "name": "Habacuque", "greek": "Ἀμβακούμ", "testament": "at", "abbr": "Hc"},
    {"id": "sf", "name": "Sofonias", "greek": "Σοφονίας", "testament": "at", "abbr": "Sf"},
    {"id": "ag", "name": "Ageu", "greek": "Ἀγγαῖος", "testament": "at", "abbr": "Ag"},
    {"id": "zc", "name": "Zacarias", "greek": "Ζαχαρίας", "testament": "at", "abbr": "Zc"},
    {"id": "ml", "name": "Malaquias", "greek": "Μαλαχίας", "testament": "at", "abbr": "Ml"},
    
    # Novo Testamento (27 Livros)
    {"id": "mt", "name": "Mateus", "greek": "Κατὰ Μαθθαῖων", "testament": "nt", "abbr": "Mt"},
    {"id": "mc", "name": "Marcos", "greek": "Κατὰ Μᾶρκων", "testament": "nt", "abbr": "Mc"},
    {"id": "lc", "name": "Lucas", "greek": "Κατὰ Λουκᾶν", "testament": "nt", "abbr": "Lc"},
    {"id": "jo", "name": "João", "greek": "Κατὰ Ἰωάννην", "testament": "nt", "abbr": "Jo"},
    {"id": "at", "name": "Atos dos Apóstolos", "greek": "Πράξεις Ἀποστόλων", "testament": "nt", "abbr": "At"},
    {"id": "rm", "name": "Romanos", "greek": "Πρὸς Ῥωμαίους", "testament": "nt", "abbr": "Rm"},
    {"id": "1co", "name": "I Coríntios", "greek": "Πρὸς Κορινθίους Αʹ", "testament": "nt", "abbr": "1Co"},
    {"id": "2co", "name": "II Coríntios", "greek": "Πρὸς Κορινθίους Βʹ", "testament": "nt", "abbr": "2Co"},
    {"id": "gl", "name": "Gálatas", "greek": "Πρὸς Γαλάτας", "testament": "nt", "abbr": "Gl"},
    {"id": "ef", "name": "Efésios", "greek": "Πρὸς Ἐφεσίους", "testament": "nt", "abbr": "Ef"},
    {"id": "fp", "name": "Filipenses", "greek": "Πρὸς Φιλιππησίους", "testament": "nt", "abbr": "Fp"},
    {"id": "cl", "name": "Colossenses", "greek": "Πρὸς Κολοσσαεῖς", "testament": "nt", "abbr": "Cl"},
    {"id": "1ts", "name": "I Tessalonicenses", "greek": "Πρὸς Θεσσαλονικεῖς Αʹ", "testament": "nt", "abbr": "1Ts"},
    {"id": "2ts", "name": "II Tessalonicenses", "greek": "Πρὸς Θεσσαλονικεῖς Βʹ", "testament": "nt", "abbr": "2Ts"},
    {"id": "1tm", "name": "I Timóteo", "greek": "Πρὸς Τιμόθεον Αʹ", "testament": "nt", "abbr": "1Tm"},
    {"id": "2tm", "name": "II Timóteo", "greek": "Πρὸς Τιμόθεον Βʹ", "testament": "nt", "abbr": "2Tm"},
    {"id": "tt", "name": "Tito", "greek": "Πρὸς Τίτον", "testament": "nt", "abbr": "Tt"},
    {"id": "fm", "name": "Filemom", "greek": "Πρὸς Φιλήμονα", "testament": "nt", "abbr": "Fm"},
    {"id": "hb", "name": "Hebreus", "greek": "Πρὸς Ἑβραίους", "testament": "nt", "abbr": "Hb"},
    {"id": "tg", "name": "Tiago", "greek": "Ἰακώβου", "testament": "nt", "abbr": "Tg"},
    {"id": "1pe", "name": "I Pedro", "greek": "Πέτρου Αʹ", "testament": "nt", "abbr": "1Pe"},
    {"id": "2pe", "name": "II Pedro", "greek": "Πέτρου Βʹ", "testament": "nt", "abbr": "2Pe"},
    {"id": "1jo", "name": "I João", "greek": "Ἰωάννου Αʹ", "testament": "nt", "abbr": "1Jo"},
    {"id": "2jo", "name": "II João", "greek": "Ἰωάννου Βʹ", "testament": "nt", "abbr": "2Jo"},
    {"id": "3jo", "name": "III João", "greek": "Ἰωάννου Γʹ", "testament": "nt", "abbr": "3Jo"},
    {"id": "jd", "name": "Judas", "greek": "Ἰούδα", "testament": "nt", "abbr": "Jd"},
    {"id": "ap", "name": "Apocalipse", "greek": "Ἀποκάλυψις Ἰωάννου", "testament": "nt", "abbr": "Ap"},
    
    # Bispos Apostólicos (8 Escritos)
    {"id": "inef", "name": "Inácio aos Efésios", "greek": "Ἐφεσίοις Ἰγνάτιος", "testament": "bispos", "abbr": "InEf", "author": "Santo Inácio de Antioquia"},
    {"id": "inmag", "name": "Inácio aos Magnésios", "greek": "Μαγνησιεῦσιν Ἰγνάτιος", "testament": "bispos", "abbr": "InMag", "author": "Santo Inácio de Antioquia"},
    {"id": "intral", "name": "Inácio aos Tralianos", "greek": "Τραλλιανοῖς Ἰγνάτιος", "testament": "bispos", "abbr": "InTral", "author": "Santo Inácio de Antioquia"},
    {"id": "inrm", "name": "Inácio aos Romanos", "greek": "Ῥωμαίοις Ἰγνάτιος", "testament": "bispos", "abbr": "InRm", "author": "Santo Inácio de Antioquia"},
    {"id": "infil", "name": "Inácio aos Filadelfos", "greek": "Φιλαδελφεῦσιν Ἰγνάτιος", "testament": "bispos", "abbr": "InFil", "author": "Santo Inácio de Antioquia"},
    {"id": "inesm", "name": "Inácio aos Esmirneus", "greek": "Σμυρναίοις Ἰγνάτιος", "testament": "bispos", "abbr": "InEsm", "author": "Santo Inácio de Antioquia"},
    {"id": "inpol", "name": "Inácio a Policarpo", "greek": "Πολυκάρπῳ Ἰγνάτιος", "testament": "bispos", "abbr": "InPol", "author": "Santo Inácio de Antioquia"},
    {"id": "1cl", "name": "Carta de Clemente aos Coríntios", "greek": "Κλήμεντος πρὸς Κορινθίους", "testament": "bispos", "abbr": "1Cl", "author": "São Clemente Romano"}
]

# Map aliases for book identification
ALIAS_MAP = {
    'GENESIS': 'gn', 'GÊNESIS': 'gn',
    'EXODO': 'ex', 'ÊXODO': 'ex',
    'LEVITICO': 'lv', 'LEVÍTICO': 'lv',
    'NUMEROS': 'nm', 'NÚMEROS': 'nm',
    'DEUTERONOMIO': 'dt', 'DEUTERONÔMIO': 'dt',
    'JOSUE': 'js', 'JOSUÉ': 'js', 'JOSUÉ (VATICANO)': 'js',
    'JUIZES': 'jz', 'JUÍZES': 'jz', 'JUÍZES (VATICANO)': 'jz',
    'RUTE': 'rt',
    'I SAMUEL': '1sm', '1 SAMUEL': '1sm',
    'II SAMUEL': '2sm', '2 SAMUEL': '2sm',
    'I REIS': '1rs', '1 REIS': '1rs',
    'II REIS': '2rs', '2 REIS': '2rs',
    'I CRONICAS': '1cr', 'I CRÔNICAS': '1cr', '1 CRÔNICAS': '1cr',
    'II CRONICAS': '2cr', 'II CRÔNICAS': '2cr', '2 CRÔNICAS': '2cr',
    'ESDRAS': 'ed',
    'NEEMIAS': 'ne',
    'ESTER': 'et',
    'JO': 'job', 'JÓ': 'job',
    'SALMOS': 'sl', 'SALMO': 'sl',
    'PROVERBIOS': 'pv', 'PROVÉRBIOS': 'pv',
    'ECLESIASTES': 'ec',
    'CANTICO DOS CANTICOS': 'ct', 'CÂNTICO DOS CÂNTICOS': 'ct', 'CÂNTICO': 'ct',
    'SABEDORIA': 'sb', 'SABEDORIA DE SALOMAO': 'sb', 'SABEDORIA DE SALOMÃO': 'sb',
    'ECLESIASTICO': 'eclo', 'ECLESIÁSTICO': 'eclo', 'ECLESIÁSTICO (SIRÁCIDA)': 'eclo',
    'ISAIAS': 'is', 'ISAÍAS': 'is',
    'JEREMIAS': 'jr',
    'LAMENTACOES': 'lm', 'LAMENTAÇÕES': 'lm', 'LAMENTAÇÕES DE JEREMIAS': 'lm',
    'BARUQUE': 'br',
    'EZEQUIEL': 'ez',
    'DANIEL': 'dn', 'DANIEL (TEODÓCIO)': 'dn',
    'OSEIAS': 'os', 'OSÉIAS': 'os',
    'JOEL': 'jl',
    'AMOS': 'am', 'AMÓS': 'am',
    'OBADIAS': 'ob',
    'JONAS': 'jn',
    'MIQUEIAS': 'mq', 'MIQUÉIAS': 'mq',
    'NAUM': 'na',
    'HABACUQUE': 'hc',
    'SOFONIAS': 'sf',
    'AGEU': 'ag',
    'ZACARIAS': 'zc',
    'MALAQUIAS': 'ml',
    'MATEUS': 'mt',
    'MARCOS': 'mc',
    'LUCAS': 'lc',
    'JOAO': 'jo', 'JOÃO': 'jo',
    'ATOS': 'at', 'ATOS DOS APÓSTOLOS': 'at',
    'ROMANOS': 'rm',
    'I CORINTIOS': '1co', 'I CORÍNTIOS': '1co', '1 CORÍNTIOS': '1co',
    'II CORINTIOS': '2co', 'II CORÍNTIOS': '2co', '2 CORÍNTIOS': '2co',
    'GALATAS': 'gl', 'GÁLATAS': 'gl',
    'EFESIOS': 'ef', 'EFÉSIOS': 'ef',
    'FILIPENSES': 'fp',
    'COLOSSENSES': 'cl',
    'I TESSALONICENSES': '1ts', '1 TESSALONICENSES': '1ts',
    'II TESSALONICENSES': '2ts', '2 TESSALONICENSES': '2ts',
    'I TIMOTEO': '1tm', 'I TIMÓTEO': '1tm', '1 TIMÓTEO': '1tm',
    'II TIMOTEO': '2tm', 'II TIMÓTEO': '2tm', '2 TIMÓTEO': '2tm',
    'TITO': 'tt',
    'FILEMOM': 'fm',
    'HEBREUS': 'hb',
    'TIAGO': 'tg',
    'I PEDRO': '1pe', '1 PEDRO': '1pe',
    'II PEDRO': '2pe', '2 PEDRO': '2pe',
    'I JOAO': '1jo', 'I JOÃO': '1jo', '1 JOÃO': '1jo',
    'II JOAO': '2jo', 'II JOÃO': '2jo', '2 JOÃO': '2jo',
    'III JOAO': '3jo', 'III JOÃO': '3jo', '3 JOÃO': '3jo',
    'JUDAS': 'jd',
    'APOCALIPSE': 'ap',
    'INACIO AOS EFESIOS': 'inef', 'INÁCIO AOS EFÉSIOS': 'inef', 'CARTA DE INÁCIO AOS EFÉSIOS': 'inef',
    'INACIO AOS MAGNESIOS': 'inmag', 'INÁCIO AOS MAGNÉSIOS': 'inmag', 'CARTA DE INÁCIO AOS MAGNÉSIOS': 'inmag',
    'INACIO AOS TRALIANOS': 'intral', 'INÁCIO AOS TRALIANOS': 'intral', 'CARTA DE INÁCIO AOS TRALIANOS': 'intral',
    'INACIO AOS ROMANOS': 'inrm', 'INÁCIO AOS ROMANOS': 'inrm', 'CARTA DE INÁCIO AOS ROMANOS': 'inrm',
    'INACIO AOS FILADELFOS': 'infil', 'INÁCIO AOS FILADELFOS': 'infil', 'CARTA DE INÁCIO AOS FILADÉLFIOS': 'infil',
    'INACIO AOS ESMIRNEUS': 'inesm', 'INÁCIO AOS ESMIRNEUS': 'inesm', 'CARTA DE INÁCIO AOS ESMIRNENSES': 'inesm',
    'INACIO A POLICARPO': 'inpol', 'INÁCIO A POLICARPO': 'inpol', 'CARTA DE INÁCIO A POLICARPO': 'inpol',
    'CLEMENTE': '1cl', '1 CLEMENTE': '1cl', 'I E II CLEMENTE': '1cl', 'CARTA DE CLEMENTE AOS CORÍNTIOS': '1cl'
}

# =========================================================================
# 3. EXTRAÇÃO E ESTRUTURAÇÃO DO TEXTO EM PORTUGUÊS (PORT-BR)
# =========================================================================
print("\n[2/3] Extraindo e compilando texto da Bíblia em Português...")

with zipfile.ZipFile('Bíblia Sagrada (port-br) Unoteista.docx') as z:
    tree = ET.fromstring(z.read('word/document.xml'))
    pt_paragraphs = [''.join([n.text for n in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if n.text]).strip() 
                    for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')]
    pt_paragraphs = [p for p in pt_paragraphs if p]

pt_books_data = {b['id']: {'chapters': {}} for b in CANON_BOOKS}

current_book_id = None
current_chapter = None

# Regex patterns
chap_regex = re.compile(r'^([A-Za-zÀ-ÖØ-öø-ÿ\s\d]+?)\s+(\d+)$')
verse_regex = re.compile(r'^(\d+)\s+(.+)$')

# Process Autólico first (index 64 to 305)
current_aut_chap = 1
for i in range(64, 305):
    p = pt_paragraphs[i]
    if p.startswith('LIVRO '):
        continue
    if p.startswith('Capítulo '):
        m_chap = re.match(r'^Capítulo\s+([IVXLCDM]+|\d+)\s*—?\s*(.*)$', p, re.I)
        if m_chap:
            current_chapter = str(current_aut_chap)
            current_aut_chap += 1
            if current_chapter not in pt_books_data['aut']['chapters']:
                pt_books_data['aut']['chapters'][current_chapter] = []
            title = m_chap.group(2).strip()
            if title:
                pt_books_data['aut']['chapters'][current_chapter].append({'v': 0, 't': f"[{title}]"})
            continue
    elif current_chapter:
        pt_books_data['aut']['chapters'][current_chapter].append({
            'v': len(pt_books_data['aut']['chapters'][current_chapter]) + 1,
            't': p
        })

# Process all other books from index 306 onwards
current_book_id = None
current_chapter = None

for i in range(306, len(pt_paragraphs)):
    p = pt_paragraphs[i]
    
    # Check if this paragraph is a standalone book name
    clean_p = p.upper().strip()
    clean_norm = strip_accents(clean_p)
    
    # Check chapter match
    m_ch = chap_regex.match(p)
    if m_ch:
        raw_bname = m_ch.group(1).strip().upper()
        cnum = m_ch.group(2)
        norm_bname = strip_accents(raw_bname)
        
        # Check alias
        found_id = ALIAS_MAP.get(raw_bname) or ALIAS_MAP.get(norm_bname)
        if not found_id:
            for k, v in ALIAS_MAP.items():
                if strip_accents(k) == norm_bname:
                    found_id = v
                    break
        
        if found_id:
            current_book_id = found_id
            current_chapter = str(cnum)
            if current_chapter not in pt_books_data[current_book_id]['chapters']:
                pt_books_data[current_book_id]['chapters'][current_chapter] = []
            continue
    
    # Check standalone book title (e.g. "Gênesis", "Mateus")
    if len(p) < 40:
        found_id = ALIAS_MAP.get(clean_p) or ALIAS_MAP.get(clean_norm)
        if found_id:
            current_book_id = found_id
            continue
    
    # Check verse match
    m_v = verse_regex.match(p)
    if m_v and current_book_id and current_chapter:
        if current_chapter not in pt_books_data[current_book_id]['chapters']:
            pt_books_data[current_book_id]['chapters'][current_chapter] = []
        vnum = int(m_v.group(1))
        vtext = m_v.group(2).strip()
        pt_books_data[current_book_id]['chapters'][current_chapter].append({
            'v': vnum,
            't': vtext
        })
    elif current_book_id and current_chapter:
        # Paragraph continuation
        if current_chapter in pt_books_data[current_book_id]['chapters'] and pt_books_data[current_book_id]['chapters'][current_chapter]:
            pt_books_data[current_book_id]['chapters'][current_chapter][-1]['t'] += " " + p

# Save PT books
for b in CANON_BOOKS:
    bid = b['id']
    data = {
        'id': bid,
        'name': b['name'],
        'greek': b.get('greek', ''),
        'testament': b['testament'],
        'abbr': b['abbr'],
        'chapters': pt_books_data[bid]['chapters']
    }
    with open(os.path.join(DATA_DIR, 'pt', f"{bid}.json"), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)

print("-> Texto em Português gerado com sucesso.")

# =========================================================================
# 4. EXTRAÇÃO E ESTRUTURAÇÃO DA BÍBLIA INTERLINEAR (GREGO / PORT-BR)
# =========================================================================
print("\n[3/3] Extraindo e pareando Bíblia Interlinear...")

with zipfile.ZipFile('Biblia_Interlinear_Canon_Unoteista_77livros.docx') as z:
    tree = ET.fromstring(z.read('word/document.xml'))
    int_paragraphs = [''.join([n.text for n in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if n.text]).strip() 
                     for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')]
    int_paragraphs = [p for p in int_paragraphs if p]

int_books_data = {b['id']: {'chapters': {}} for b in CANON_BOOKS}

super_map = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹', '0123456789')

def parse_words_pairing(greek_line, pt_line):
    # Remove leading chapter/verse numbers
    clean_g = re.sub(r'^\d+\s+\d+\.\s*', '', greek_line)
    clean_g = re.sub(r'^\d+\.\s*', '', clean_g)
    
    clean_p = re.sub(r'^\d+\s+\d+\.\s*', '', pt_line)
    clean_p = re.sub(r'^\d+\.\s*', '', clean_p)
    
    # Extract indexed words
    g_tokens = re.findall(r'(\S+?)([⁰¹²³⁴⁵⁶⁷⁸⁹\d]+)', clean_g)
    p_tokens = re.findall(r'(\S+?)([⁰¹²³⁴⁵⁶⁷⁸⁹\d]+)', clean_p)
    
    g_map = {}
    for w, idx in g_tokens:
        clean_w = re.sub(r'[.,;·!?()\"“”]', '', w)
        try:
            num = int(idx.translate(super_map))
            g_map[num] = clean_w
        except:
            pass
            
    p_map = {}
    for w, idx in p_tokens:
        clean_w = re.sub(r'[.,;·!?()\"“”]', '', w)
        try:
            num = int(idx.translate(super_map))
            p_map[num] = clean_w
        except:
            pass
            
    all_indices = sorted(set(g_map.keys()) | set(p_map.keys()))
    pairs = []
    for i in all_indices:
        gw = g_map.get(i, '')
        pw = p_map.get(i, '')
        pairs.append({'i': i, 'g': gw, 'p': pw})
        
    return pairs, clean_g, clean_p

current_book_id = None
current_chapter = None
i = 0
total_int_p = len(int_paragraphs)

while i < total_int_p:
    p = int_paragraphs[i]
    
    # Check book header: e.g. "Gênesis   Γένεσις" or "Carta de Inácio aos Efésios"
    is_book_header = False
    if len(p) < 60 and ('   ' in p or '\t' in p or p.startswith(('Carta de Inácio', 'I e II Clemente'))):
        raw_bname = re.split(r'[\t\s]{3,}', p)[0].strip().upper()
        norm_bname = strip_accents(raw_bname)
        found_id = ALIAS_MAP.get(raw_bname) or ALIAS_MAP.get(norm_bname)
        if not found_id:
            for k, v in ALIAS_MAP.items():
                if strip_accents(k) == norm_bname:
                    found_id = v
                    break
        if found_id:
            current_book_id = found_id
            current_chapter = '1'
            if current_chapter not in int_books_data[current_book_id]['chapters']:
                int_books_data[current_book_id]['chapters'][current_chapter] = []
            is_book_header = True
            i += 1
            continue
            
    # Check chapter/verse start: e.g. "1 1. Ἐν¹..." or "2 1. ..." or "2. ἡ¹..."
    m_ch_start = re.match(r'^(\d+)\s+(\d+)\.\s*(.*)$', p)
    m_v_start = re.match(r'^(\d+)\.\s*(.*)$', p)
    
    if m_ch_start and current_book_id:
        cnum = m_ch_start.group(1)
        vnum = int(m_ch_start.group(2))
        current_chapter = str(cnum)
        if current_chapter not in int_books_data[current_book_id]['chapters']:
            int_books_data[current_book_id]['chapters'][current_chapter] = []
            
        greek_line = p
        pt_line = int_paragraphs[i + 1] if i + 1 < total_int_p else ""
        pairs, g_raw, p_raw = parse_words_pairing(greek_line, pt_line)
        int_books_data[current_book_id]['chapters'][current_chapter].append({
            'v': vnum,
            'pairs': pairs,
            'g': g_raw,
            'p': p_raw
        })
        i += 2
        continue
        
    elif m_v_start and current_book_id and current_chapter:
        vnum = int(m_v_start.group(1))
        greek_line = p
        pt_line = int_paragraphs[i + 1] if i + 1 < total_int_p else ""
        pairs, g_raw, p_raw = parse_words_pairing(greek_line, pt_line)
        int_books_data[current_book_id]['chapters'][current_chapter].append({
            'v': vnum,
            'pairs': pairs,
            'g': g_raw,
            'p': p_raw
        })
        i += 2
        continue
        
    i += 1

# Save INT books
for b in CANON_BOOKS:
    bid = b['id']
    data = {
        'id': bid,
        'name': b['name'],
        'greek': b.get('greek', ''),
        'testament': b['testament'],
        'abbr': b['abbr'],
        'chapters': int_books_data[bid]['chapters']
    }
    with open(os.path.join(DATA_DIR, 'int', f"{bid}.json"), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)

print("-> Versão Interlinear gerada com sucesso.")

# =========================================================================
# 5. GERAR METADADOS GERAIS (DATA/BOOKS.JSON)
# =========================================================================
import sys as _sys
_sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tools'))
from slugs import slugify

catalog = []
for b in CANON_BOOKS:
    bid = b['id']
    pt_chaps = sorted([int(c) for c in pt_books_data[bid]['chapters'].keys()])
    int_chaps = sorted([int(c) for c in int_books_data[bid]['chapters'].keys()])
    
    # Combined chapter list
    all_chaps = sorted(list(set(pt_chaps) | set(int_chaps)))
    if not all_chaps:
        all_chaps = [1]
        
    catalog.append({
        'id': bid,
        'slug': slugify(b['name']),
        'name': b['name'],
        'greek': b.get('greek', ''),
        'testament': b['testament'],
        'abbr': b['abbr'],
        'author': b.get('author', ''),
        'chapters': all_chaps,
        'chapters_count': len(all_chaps)
    })

with open(os.path.join(DATA_DIR, 'books.json'), 'w', encoding='utf-8') as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)

t_end = time.time()
print(f"\n==========================================================")
print(f"COMPILAÇÃO CONCLUÍDA EM {t_end - t0:.2f} SEGUNDOS!")
print(f"Total de livros catalogados: {len(catalog)}")
print(f"==========================================================")
