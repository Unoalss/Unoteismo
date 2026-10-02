"""Insere na Bíblia Sagrada (port-br) Unoteista (69 Livros - Sem Teofilo).docx:
1. Tratado de Soteriologia Unoteísta
2. Tratado de Communicatio Idiomatum
3. Tratado do Batismo Bíblico
4. Tratado da Forma da Consciência

Atualiza a Ficha Catalográfica (CIP) para 1730 p. ; 15,5 x 23,0 cm.
Atualiza docProps/app.xml com <Pages>1730</Pages>.
Organiza as quebras de página e tipografia para total harmonia editorial.
"""
import os
import re
import shutil
import zipfile
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIBLE_PATH = os.path.join(ROOT, 'Bíblia Sagrada (port-br) Unoteista (69 Livros - Sem Teofilo).docx')

# -------------------------------------------------------------
# DADOS DE COMMUNICATIO IDIOMATUM
# -------------------------------------------------------------
COMMUNICATIO_DATA = [
    {
        "num": "1",
        "title": "1. O que é a Communicatio Idiomatum",
        "paragraphs": [
            "Communicatio idiomatum significa “comunicação das propriedades” ou “comunicação dos atributos”.",
            "No entendimento Unoteísta, esse princípio explica a relação entre Deus, sua Consciência, o Logos, o Ser divino e Jesus Cristo, especialmente quanto à comunicação de nomes, títulos, atributos e ações.",
            "A estrutura fundamental é:"
        ],
        "chain": "Deus → Consciência → Espírito → Logos → divindade",
        "paragraphs_after": [
            "Esses termos não designam diferentes Pessoas divinas.",
            "A Consciência divina é o próprio Logos, o próprio Espírito e a própria divindade.",
            "Essa Consciência divina constitui o Ser divino manifestado. Por isso, aquilo que pertence à Consciência divina é comunicado ao Ser que ela constitui."
        ]
    },
    {
        "num": "2",
        "title": "2. A Consciência divina constitui o Ser",
        "paragraphs": [
            "Deus é Espírito e Consciência eterna.",
            "Quando Deus se manifesta na realidade criada, sua própria Consciência constitui o Ser divino por meio do qual Ele se manifesta.",
            "Assim:"
        ],
        "quote": ("“A Consciência divina constitui o Ser; e, por constituí-lo, comunica-lhe sua própria identidade, seus nomes, títulos e atributos.”", ""),
        "paragraphs_after": [
            "Por isso, o Ser constituído pela Consciência divina é chamado: Deus, Logos, Palavra, Verbo, Sabedoria e Espírito.",
            "Não porque existam várias Pessoas ou várias divindades, mas porque a própria Consciência divina constitui esse Ser e nele se manifesta."
        ]
    },
    {
        "num": "3",
        "title": "3. O Logos é a própria Consciência divina",
        "paragraphs": [
            "O Logos não é uma Pessoa diferente da Consciência divina.",
            "O Logos é a Consciência divina enquanto manifesta e constitui o Ser divino.",
            "Portanto:"
        ],
        "chain": "Deus é a Consciência • A Consciência é o Espírito • O Espírito é o Logos • O Logos é a manifestação da divindade no Ser que ele constitui",
        "paragraphs_after": [
            "Por isso, quando o Ser divino é chamado de Logos, o nome não está sendo aplicado a ele como algo externo.",
            "Ele é chamado Logos porque o próprio Logos — a própria Consciência divina — constitui o seu ser."
        ]
    },
    {
        "num": "4",
        "title": "4. Por que o Ser divino é chamado Deus",
        "paragraphs": [
            "O Ser divino pode ser chamado Deus porque a própria divindade está nele.",
            "A relação não é: Deus ≠ Ser divino. Nem: duas Pessoas divinas.",
            "A relação é: Deus, que é Consciência, constitui e manifesta-se no Ser divino.",
            "Por isso, o nome e os atributos daquele que é Deus podem ser atribuídos ao Ser constituído por sua Consciência.",
            "O Ser é chamado Deus porque Deus está nele e o constitui por sua própria Consciência."
        ]
    },
    {
        "num": "5",
        "title": "5. A comunicação dos nomes",
        "paragraphs": [
            "O mesmo princípio explica a comunicação dos nomes.",
            "O nome Deus pertence propriamente à Consciência divina, mas é atribuído ao Ser que essa Consciência constitui.",
            "O nome Logos pertence à própria Consciência divina e, por isso, é atribuído ao Ser que ela constitui.",
            "Da mesma forma:"
        ],
        "chain": "Consciência divina → constitui o Ser → comunica o nome Logos e o nome Deus",
        "paragraphs_after": [
            "Assim, o Ser divino pode ser chamado simultaneamente de: Deus, Logos, Palavra, Verbo, Sabedoria e Espírito.",
            "Esses nomes apontam para a relação entre a Consciência divina e o Ser que ela constitui."
        ]
    },
    {
        "num": "6",
        "title": "6. A comunicação na encarnação",
        "paragraphs": [
            "O mesmo princípio ocorre na encarnação.",
            "O Logos — que é a própria Consciência divina — encarna no homem Jesus.",
            "Portanto: Consciência divina / Logos → constitui e habita em Jesus → Jesus é chamado Logos.",
            "• Jesus é chamado Logos porque o Logos está nele.\n• Jesus é chamado Deus porque a própria divindade está nele.\n• Jesus é chamado Sabedoria porque a Sabedoria divina está nele.\n• Jesus é chamado Palavra porque a Palavra divina está nele.\n• Jesus é chamado Espírito porque o Espírito divino está nele.",
            "A comunicação não ocorre porque Jesus seja uma segunda Pessoa divina, mas porque a própria Consciência divina constitui e manifesta-se nele."
        ]
    },
    {
        "num": "7",
        "title": "7. A comunicação dos títulos",
        "paragraphs": [
            "Os títulos também são comunicados pela mesma relação.",
            "O Logos é Sabedoria porque a Consciência divina é a Sabedoria que se manifesta. Quando essa Consciência se manifesta em Jesus, Jesus é chamado Sabedoria.",
            "O Logos é Palavra porque a Consciência divina se expressa como Palavra. Quando essa Consciência se manifesta em Jesus, Jesus é chamado Palavra ou Verbo.",
            "O Logos, ao encarnar-se, passa a ser chamado Filho e é conhecido como Unigênito.",
            "Assim:"
        ],
        "chain": "Logos → encarna-se em Jesus → é chamado Filho → é conhecido como Unigênito → é proclamado Cristo."
    },
    {
        "num": "8",
        "title": "8. A comunicação dos atributos",
        "paragraphs": [
            "A comunicação também alcança os atributos e as ações.",
            "Aquilo que pertence à Consciência divina pode ser manifestado e atribuído àquele que ela constitui.",
            "Por isso, Jesus pode ser apresentado como aquele que: revela Deus; manifesta a vontade de Deus; possui a Sabedoria divina; fala as palavras de Deus; manifesta o poder de Deus; recebe o nome de Deus; revela o Pai.",
            "Ao mesmo tempo, aquilo que acontece na humanidade de Jesus pode ser atribuído ao Cristo em sua totalidade: Jesus nasceu; Jesus sofreu; Jesus morreu; Jesus ressuscitou; Jesus foi glorificado.",
            "A morte pertence à sua condição humana e corporal. Ela não significa que a Consciência divina deixou de existir."
        ]
    },
    {
        "num": "9",
        "title": "9. Uma só Consciência",
        "paragraphs": [
            "A communicatio idiomatum não cria uma segunda Consciência divina.",
            "Há: um só Deus • uma só Consciência • um só Espírito • uma só divindade • uma só Pessoa divina.",
            "Essa única Consciência divina pode constituir e manifestar-se em um Ser divino e, posteriormente, encarnar-se em Jesus.",
            "Portanto, a comunicação dos nomes e atributos não significa multiplicação da divindade. Significa manifestação da mesma divindade naquilo que ela constitui."
        ]
    },
    {
        "num": "10",
        "title": "10. Fórmula Unoteísta",
        "paragraphs": [
            "A relação pode ser resumida assim:"
        ],
        "quote": (
            "“Deus é a Consciência eterna. A Consciência é o Espírito e o Logos. O Logos, sendo a própria Consciência divina, constitui o Ser divino e comunica a ele os nomes, títulos e atributos da divindade. Quando o Logos se encarna em Jesus, a mesma Consciência divina constitui e manifesta-se nele; por isso Jesus é chamado Logos, Deus, Palavra, Sabedoria, Espírito, Filho, Unigênito e Cristo.”",
            "— Síntese Hermenêutica Unoteísta"
        ),
        "paragraphs_after": [
            "Assim, a communicatio idiomatum explica por que os nomes, títulos e atributos da divindade podem ser atribuídos ao Ser divino e, na encarnação, a Jesus Cristo: porque a própria Consciência divina — Deus, Espírito, Logos e divindade — constitui e se manifesta nesses seres."
        ]
    }
]

# -------------------------------------------------------------
# DADOS DO BATISMO BÍBLICO
# -------------------------------------------------------------
BATISMO_DATA = [
    {
        "num": "1",
        "title": "1. Um só batismo",
        "paragraphs": [
            "Cremos em um só batismo, conforme está escrito:"
        ],
        "quote": ("“Um só Senhor, uma só fé, um só batismo.”", "— Efésios 4:5"),
        "paragraphs_after": [
            "Esse único batismo é realizado em nome de Jesus Cristo, pois é nele que recebemos a salvação e o Espírito de Deus."
        ]
    },
    {
        "num": "2",
        "title": "2. O batismo em nome de Jesus",
        "paragraphs": [
            "As Sagradas Escrituras registram de forma constante a prática apostólica:",
            "• “Arrependei-vos, e cada um de vós seja batizado em nome de Jesus Cristo para remissão dos vossos pecados; e recebereis o dom do Espírito Santo.” (Atos 2:38)\n• “Porque sobre nenhum deles tinha ainda descido; somente tinham sido batizados em nome do Senhor Jesus.” (Atos 8:16)\n• “E mandou que fossem batizados em nome de Jesus Cristo.” (Atos 10:48)\n• “E, tendo eles ouvido isto, foram batizados em nome do Senhor Jesus.” (Atos 19:5)",
            "Assim, o batismo cristão é um só e tem como nome Jesus Cristo."
        ]
    },
    {
        "num": "3",
        "title": "3. O verdadeiro batismo é interior",
        "paragraphs": [
            "O batismo que salva é a obra de Deus dentro do homem.",
            "Quando a pessoa ouve a Palavra, recebe de Deus a fé, crê nela e estabelece essa relação de fé e crença, Deus a sela com o Espírito Santo:",
            "• “Tendo também crido, fostes selados com o Espírito Santo da promessa.” (Efésios 1:13)\n• “Não entristeçais o Espírito Santo de Deus, no qual fostes selados para o dia da redenção.” (Efésios 4:30)",
            "Esse é o batismo com o Espírito Santo, pelo qual o homem é unido a Cristo e recebe a realidade da salvação:",
            "• “Pois todos nós fomos batizados em um Espírito, formando um corpo.” (1 Coríntios 12:13)\n• “Vós sereis batizados com o Espírito Santo.” (Atos 1:5)",
            "Portanto, o verdadeiro batismo é espiritual e interior: Deus transforma o homem pela fé, concede-lhe o Espírito e o sela para a salvação."
        ]
    },
    {
        "num": "4",
        "title": "4. O batismo nas águas",
        "paragraphs": [
            "O batismo nas águas é a manifestação exterior daquilo que ocorreu interiormente.",
            "Aquele que creu publicamente confessa sua fé por meio da água, sendo batizado em nome de Jesus Cristo.",
            "A forma ordinária é a imersão, representando a união com Cristo em sua morte e ressurreição:"
        ],
        "quote": ("“Fomos sepultados com ele pelo batismo na morte, para que, como Cristo foi ressuscitado dentre os mortos pela glória do Pai, assim também andemos nós em novidade de vida.”", "— Romanos 6:4"),
        "paragraphs_after": [
            "Entretanto, quando a imersão não for possível, a água pode ser derramada sobre a cabeça, pois a realidade que salva não está na quantidade ou na forma da água, mas na obra interior realizada por Deus."
        ]
    },
    {
        "num": "5",
        "title": "5. A água não substitui a fé",
        "paragraphs": [
            "O batismo nas águas é uma confissão pública da fé, mas a água, por si mesma, não salva.",
            "A verdadeira transformação acontece no interior do homem.",
            "Por isso, alguém pode passar pelas águas e, ainda assim, não possuir a realidade espiritual do batismo se não houver fé e crença verdadeira. “Com o coração se crê para justiça.” (Romanos 10:10)",
            "Assim, a manifestação exterior sem a realidade interior é vazia.",
            "O batismo nas águas manifesta a fé; não produz a fé."
        ]
    },
    {
        "num": "6",
        "title": "6. Quando as águas não podem ser recebidas",
        "paragraphs": [
            "Se alguém recebeu a fé, creu na Palavra e foi selado com o Espírito Santo, mas não teve oportunidade de manifestar essa fé por meio do batismo nas águas, não perde a salvação por essa ausência.",
            "A salvação está na obra interior de Deus:"
        ],
        "chain": "Palavra → fé → crença → Espírito Santo → selo → salvação",
        "paragraphs_after": [
            "As águas são a confissão pública dessa realidade.",
            "Portanto: “O batismo interior é a realidade; o batismo nas águas é sua manifestação.”"
        ]
    },
    {
        "num": "7",
        "title": "7. Síntese do Batismo",
        "paragraphs": [
            "Cremos em um só batismo, em nome de Jesus Cristo.",
            "Esse batismo é realizado verdadeiramente com o Espírito Santo, quando o homem recebe a fé por meio da Palavra, crê e é selado pelo Espírito Santo.",
            "O batismo nas águas é a manifestação pública dessa fé, normalmente por imersão ou, quando necessário, pelo derramamento da água sobre a cabeça.",
            "A água não é a causa da salvação. A salvação acontece pela obra interior de Deus."
        ],
        "quote": ("“Um só Senhor, uma só fé, um só batismo.”", "— Efésios 4:5"),
        "paragraphs_after": [
            "Um só batismo. Um só nome: Jesus. Uma realidade interior e uma manifestação exterior."
        ]
    }
]

# -------------------------------------------------------------
# DADOS DA FORMA DA CONSCIÊNCIA
# -------------------------------------------------------------
FORMA_CONSCIENCIA_DATA = [
    {
        "num": "1",
        "title": "1. O que é a Forma da Consciência",
        "paragraphs": [
            "Cremos que toda pessoa é uma Consciência, e que cada consciência possui uma forma particular de relacionar-se com aquilo que conhece.",
            "Chamamos essa maneira particular de Forma da Consciência.",
            "Ela compreende a maneira pela qual uma consciência: percebe; relaciona; interpreta; entende; compara; julga; escolhe; deseja; age e contempla.",
            "Assim, a Forma da Consciência é a maneira particular pela qual a vontade racional de uma consciência se relaciona com aquilo que ela conhece."
        ]
    },
    {
        "num": "2",
        "title": "2. Cada consciência é distinta",
        "paragraphs": [
            "Duas pessoas podem possuir o mesmo conhecimento e, ainda assim, relacionar-se com ele de maneiras diferentes.",
            "Podem conhecer a mesma verdade, contemplar o mesmo objeto e receber o mesmo ensinamento, mas sua maneira de compreender, julgar e agir continuará sendo própria de cada consciência.",
            "Por isso, nenhuma consciência humana é idêntica a outra.",
            "A individualidade não está simplesmente naquilo que a pessoa conhece, mas na própria consciência que conhece e na forma particular pela qual ela se relaciona com o conhecimento."
        ]
    },
    {
        "num": "3",
        "title": "3. Podemos aprender a ser semelhantes a Deus",
        "paragraphs": [
            "Deus pode ensinar o homem a conhecer, julgar e agir segundo a sua vontade.",
            "Por meio de sua Palavra e de seu Espírito, Deus transforma o homem e o conduz à verdade, à justiça, à misericórdia e à benevolência.",
            "Assim, o homem pode tornar-se semelhante a Deus em seus pensamentos, julgamentos, desejos e ações.",
            "Entretanto, semelhança não significa identidade."
        ],
        "quote": ("“Podemos aprender a pensar segundo Deus, julgar segundo Deus e agir segundo Deus, mas jamais nos tornaremos a própria Consciência divina.”", ""),
        "paragraphs_after": [
            "A criatura pode refletir a vontade de Deus sem possuir a mesma Consciência de Deus."
        ]
    },
    {
        "num": "4",
        "title": "4. A Forma da Consciência e a vontade",
        "paragraphs": [
            "A consciência não é apenas aquilo que conhece. Ela também possui vontade racional.",
            "A vontade relaciona o conhecimento com a decisão:"
        ],
        "chain": "conhecer → compreender → julgar → querer → agir",
        "paragraphs_after": [
            "Por isso, duas consciências podem receber a mesma verdade e produzir decisões diferentes, porque cada uma possui sua própria Forma da Consciência.",
            "A santificação consiste, entre outras coisas, em aprender a submeter essa vontade à vontade de Deus."
        ]
    },
    {
        "num": "5",
        "title": "5. Jesus: a exceção",
        "paragraphs": [
            "Jesus é diferente de todos os outros homens.",
            "Nos homens, existe uma consciência criada que pode aprender e tornar-se semelhante à vontade de Deus.",
            "Em Jesus, porém, a própria Consciência divina encarnou.",
            "Por isso, Jesus não apenas aprendeu a conhecer Deus ou recebeu uma consciência semelhante à de Deus. A Consciência divina estava nele."
        ],
        "chain": "Homem → consciência própria → aprende a ser semelhante a Deus.\nJesus → Consciência divina encarnada → manifesta a própria Consciência de Deus.",
        "paragraphs_after": [
            "Por isso, somente Jesus pode ser considerado idêntico à Consciência divina, não porque sua humanidade deixe de ser humana, mas porque nele encarnou a própria Consciência divina."
        ]
    },
    {
        "num": "6",
        "title": "6. Semelhança e identidade",
        "paragraphs": [
            "Devemos, portanto, distinguir:",
            "• Semelhança: a criatura aprende a conhecer, julgar, querer e agir segundo Deus.\n• Identidade: a própria Consciência divina está presente e encarnada.",
            "Os homens podem alcançar grande semelhança com Deus, mas sua Forma da Consciência continuará sendo própria.",
            "Jesus, porém, é singular:"
        ],
        "quote": ("“Ele não apenas manifesta uma consciência semelhante à de Deus; nele manifesta-se a própria Consciência divina.”", "")
    },
    {
        "num": "7",
        "title": "7. Síntese",
        "paragraphs": [
            "A Forma da Consciência é a maneira particular pela qual cada consciência se relaciona com aquilo que conhece, formando sua maneira própria de compreender, julgar, querer e agir.",
            "Por isso, cada consciência é distinta.",
            "Deus pode ensinar o homem a julgar e agir segundo sua vontade, tornando-o semelhante a Ele. Porém, nenhuma criatura se torna idêntica à Consciência divina.",
            "Somente Jesus é a exceção, pois nele encarnou a própria Consciência divina."
        ],
        "quote": ("“Podemos ser semelhantes a Deus em nossa vontade, pensamento, julgamento e ação; somente Cristo é a manifestação encarnada da própria Consciência de Deus.”", "")
    }
]


def format_treatise_paragraph(p, elem_type, data):
    p.paragraph_format.line_spacing = 1.15
    if elem_type == 'TITLE':
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(data)
        run.font.name = 'Arial'
        run.font.size = Pt(14)
        run.bold = True
    elif elem_type == 'SUBTITLE':
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(10)
        run = p.add_run(data)
        run.font.name = 'Bookman Old Style'
        run.font.size = Pt(10.5)
        run.italic = True
    elif elem_type == 'SEC_TITLE':
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(9)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(data)
        run.font.name = 'Arial'
        run.font.size = Pt(11.5)
        run.bold = True
    elif elem_type == 'PARA':
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(data)
        run.font.name = 'Bookman Old Style'
        run.font.size = Pt(10)
    elif elem_type == 'QUOTE':
        quote_text, ref_text = data
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.left_indent = Inches(0.3)
        p.paragraph_format.right_indent = Inches(0.3)
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(4)
        r1 = p.add_run(quote_text)
        r1.font.name = 'Bookman Old Style'
        r1.font.size = Pt(9.5)
        r1.bold = True
        if ref_text:
            r1.text += '\n'
            r2 = p.add_run(ref_text)
            r2.font.name = 'Bookman Old Style'
            r2.font.size = Pt(9)
            r2.italic = True
    elif elem_type == 'CHAIN':
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(data)
        run.font.name = 'Bookman Old Style'
        run.font.size = Pt(10)
        run.bold = True
    elif elem_type == 'PAGE_BREAK':
        run = p.add_run()
        run.add_break(docx.enum.text.WD_BREAK.PAGE)


def build_treatise_elements(title, subtitle, dataset):
    elements = []
    elements.append(('TITLE', title))
    elements.append(('SUBTITLE', subtitle))
    for sec in dataset:
        elements.append(('SEC_TITLE', sec['title']))
        for p in sec.get('paragraphs', []):
            elements.append(('PARA', p))
        if 'quote' in sec:
            elements.append(('QUOTE', sec['quote']))
        if 'chain' in sec:
            elements.append(('CHAIN', sec['chain']))
        for p in sec.get('paragraphs_after', []):
            elements.append(('PARA', p))
    return elements


def run():
    bak = BIBLE_PATH + '.pre_all_theology.bak'
    if not os.path.exists(bak):
        shutil.copy2(BIBLE_PATH, bak)
        print(f'Backup criado em {bak}')

    doc = docx.Document(BIBLE_PATH)

    # 1. Atualizar a Ficha Catalográfica (CIP) para "1730 p. ; 15,5 x 23,0 cm."
    cip_updated = False
    for p in doc.paragraphs[:50]:
        if 'p. ; 15,5 x 23,0 cm.' in p.text:
            # Substituir garantindo 1730 p.
            new_text = re.sub(r'(\d+\s*)?p\.\s*;\s*15,5\s*x\s*23,0\s*cm\.', '1730 p. ; 15,5 x 23,0 cm.', p.text)
            p.text = new_text
            cip_updated = True
            print('CIP atualizada:', p.text)
            break
    if not cip_updated:
        print('Aviso: Linha da CIP não encontrada nos primeiros 50 parágrafos.')

    # 2. Localizar o ponto de inserção: antes de "NOTA SOBRE ESTA EDIÇÃO"
    target_idx = None
    for i, p in enumerate(doc.paragraphs[:300]):
        if 'NOTA SOBRE ESTA EDIÇÃO' in p.text.upper():
            target_idx = i
            break

    if target_idx is None:
        print('ERRO: Não encontrou NOTA SOBRE ESTA EDIÇÃO.')
        return

    ref_p = doc.paragraphs[target_idx]
    print(f'Ponto de inserção: parágrafo {target_idx} (antes de {ref_p.text[:50]!r})')

    # Montar os blocos dos 3 novos tratados
    treatises = [
        ('COMMUNICATIO IDIOMATUM', 'A Comunicação dos Nomes, Títulos e Atributos: Da Consciência Divina ao Logos e a Jesus Cristo', COMMUNICATIO_DATA),
        ('O BATISMO BÍBLICO', 'Um Só Batismo em Nome de Jesus — A Realidade Espiritual Interior e a Manifestação pelas Águas', BATISMO_DATA),
        ('A FORMA DA CONSCIÊNCIA', 'A Distinção entre as Consciências — A Vontade Racional, o Conhecimento e a Singularidade de Cristo', FORMA_CONSCIENCIA_DATA)
    ]

    for title, subtitle, data in treatises:
        # Quebra de página antes de cada grande tratado para organização editorial impecável
        p_break = ref_p.insert_paragraph_before()
        format_treatise_paragraph(p_break, 'PAGE_BREAK', '')
        
        elems = build_treatise_elements(title, subtitle, data)
        for elem_type, edata in elems:
            new_p = ref_p.insert_paragraph_before()
            format_treatise_paragraph(new_p, elem_type, edata)
        print(f'Inserido: {title} ({len(elems)} elementos)')

    doc.save(BIBLE_PATH)
    print('Documento DOCX salvo com sucesso.')

    # 3. Atualizar docProps/app.xml com <Pages>1730</Pages>
    update_app_xml_pages(BIBLE_PATH, 1730)


def update_app_xml_pages(docx_path, target_pages):
    """Garante que docProps/app.xml possua <Pages>1730</Pages>."""
    tmp_path = docx_path + '.tmp_zip'
    with zipfile.ZipFile(docx_path, 'r') as zin:
        with zipfile.ZipFile(tmp_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == 'docProps/app.xml':
                    xml_str = data.decode('utf-8', errors='ignore')
                    if '<Pages>' in xml_str:
                        xml_str = re.sub(r'<Pages>\d+</Pages>', f'<Pages>{target_pages}</Pages>', xml_str)
                    else:
                        # Inserir <Pages> antes de </Properties>
                        xml_str = xml_str.replace('</Properties>', f'<Pages>{target_pages}</Pages></Properties>')
                    data = xml_str.encode('utf-8')
                    print(f'app.xml atualizado com <Pages>{target_pages}</Pages>')
                zout.writestr(item, data)
    shutil.move(tmp_path, docx_path)
    print('DOCX atualizado com app.xml modificado.')


if __name__ == '__main__':
    run()
