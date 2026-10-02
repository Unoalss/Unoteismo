import json

with open('data/books.json', 'r', encoding='utf-8') as f:
    books = json.load(f)

at = [b for b in books if b['testament'] == 'at']
nt = [b for b in books if b['testament'] == 'nt']
bispos = [b for b in books if b['testament'] == 'bispos']

def make_pills(book_list):
    html = []
    for b in book_list:
        bid = b['id']
        name = b['name']
        greek = f"({b['greek']})" if b.get('greek') else ""
        chaps = b.get('chapters_count', len(b.get('chapters', [])))
        html.append(f'            <a href="/biblia?book={bid}&ch=1" class="seo-book-pill" data-book="{bid}" data-chap="1" title="Ler {name} na Bíblia Online"><span class="pill-name">{name}</span> <span class="pill-greek">{greek}</span> <span class="pill-count">{chaps} cap.</span></a>')
    return '\n'.join(html)

at_html = make_pills(at)
nt_html = make_pills(nt)
bispos_html = make_pills(bispos)

faq_schema = """      {
        "@type": "FAQPage",
        "@id": "https://unoteismo.arthurlazarodesousasantos.workers.dev/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Onde posso ler e estudar a Bíblia Sagrada online completa?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Você pode ler a Bíblia Sagrada online completa gratuitamente no Unoteísmo, com acesso aos 77 Livros Canônicos do Antigo Testamento, Novo Testamento e Escritos Apostólicos, com Tradução em Português e Bíblia Interlinear Grego-Português."
            }
          },
          {
            "@type": "Question",
            "name": "Como funciona a Bíblia Interlinear Grego-Português com Léxico?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A Bíblia Interlinear alinha o texto original em grego bíblico palavra por palavra com a tradução em português, exibindo lemas, morfologia gramatical e permitindo clicar em qualquer palavra para abrir o dicionário léxico com 61.047 verbetes detalhados."
            }
          },
          {
            "@type": "Question",
            "name": "A Bíblia Sagrada Online possui narração em áudio?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sim, a Bíblia conta com leitor e narrador de áudio integrado com vozes neurais humanas de alta fidelidade (IA), controle de velocidade e avanço automático de capítulos em segundo plano, mesmo com a tela do celular apagada."
            }
          },
          {
            "@type": "Question",
            "name": "Quais são os 77 livros da Bíblia Sagrada Unoteísta?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A Bíblia reúne 77 livros sagrados: 42 livros do Antigo Testamento (tradição Septuaginta), 27 livros do Novo Testamento e 8 escritos dos Bispos Apostólicos dos primeiros séculos da Igreja primitiva (incluindo Didaquê, 1 Clemente e Epístolas de Inácio)."
            }
          },
          {
            "@type": "Question",
            "name": "A Bíblia Sagrada Online e o Dicionário Grego são gratuitos?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sim, todo o acervo da Bíblia Sagrada, o modo interlinear grego, a narração em áudio e o léxico bíblico com mais de 61 mil palavras são 100% gratuitos e de acesso livre."
            }
          }
        ]
      }"""

new_seo_section = f"""  <!-- Seção Semântica Otimizada para Motores de Busca (SEO Canônico da Bíblia) -->
  <section class="seo-canon-directory" aria-label="Visão Geral do Cânon Bíblico Sagrado">
    <div class="seo-canon-card">
      <h2 class="seo-section-title">Bíblia Sagrada Online — Cânon Sagrado de 77 Livros, Interlinear Grego &amp; Áudio Narrado</h2>
      <p class="seo-description-text">
        Bem-vindo à edição definitiva da <strong>Bíblia Sagrada Online</strong>. Esta plataforma unifica a leitura sagrada e o estudo bíblico profundo em um ambiente rápido, intuitivo e completo. O cânon reúne <strong>77 Livros Sagrados</strong> — integrando o <strong>Antigo Testamento</strong> (42 Livros preservados na tradição da Septuaginta), o <strong>Novo Testamento</strong> (27 Livros canônicos) e os venerados <strong>Escritos dos Bispos Apostólicos</strong> (8 Livros dos primeiros pais da Igreja).
      </p>
      
      <div class="seo-features-grid">
        <div class="seo-feature-box">
          <h3>📖 Tradução em Português (PT-BR)</h3>
          <p>Texto bíblico fluente, reverente e de alta exatidão, formatado com tipografia sagrada para meditação diária, leitura contínua e devocional.</p>
        </div>
        <div class="seo-feature-box">
          <h3>🏛️ Bíblia Interlinear Grego-Português</h3>
          <p>Alinhamento palavra por palavra do texto grego original com a tradução correspondente, exibindo lemas, códigos morfológicos e análise gramatical exata.</p>
        </div>
        <div class="seo-feature-box">
          <h3>📚 Léxico Grego Bíblico (61.047 Verbetes)</h3>
          <p>Dicionário bíblico e exegético completo: pesquise por termo grego, transliteração ou português, ou clique em qualquer palavra do texto para ver sua etimologia e teologia.</p>
        </div>
        <div class="seo-feature-box">
          <h3>🎙️ Áudio Bíblia com Vozes Neurais Humanas</h3>
          <p>Narração versículo por versículo com inteligência artificial neural de alta fidelidade e avanço contínuo de capítulos mesmo em segundo plano com a tela desligada.</p>
        </div>
      </div>

      <!-- Diretório dos 77 Livros Canônicos para Rastreamento e Indexação Google -->
      <div class="seo-books-directory">
        <h3 class="seo-group-heading">📜 Antigo Testamento (42 Livros)</h3>
        <div class="seo-books-pills">
{at_html}
        </div>

        <h3 class="seo-group-heading" style="margin-top: 1.6rem;">✝️ Novo Testamento (27 Livros)</h3>
        <div class="seo-books-pills">
{nt_html}
        </div>

        <h3 class="seo-group-heading" style="margin-top: 1.6rem;">🕊️ Bispos Apostólicos (8 Escritos da Igreja Primitiva)</h3>
        <div class="seo-books-pills">
{bispos_html}
        </div>
      </div>

      <!-- FAQ Estruturado para o Google (Dúvidas Frequentes sobre a Bíblia) -->
      <div class="seo-faq-section" itemscope itemtype="https://schema.org/FAQPage">
        <h3 class="seo-faq-heading">Perguntas Frequentes sobre a Bíblia Sagrada Online</h3>
        
        <div class="seo-faq-card" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
          <h4 class="seo-faq-q" itemprop="name">Onde posso ler e estudar a Bíblia Sagrada online completa?</h4>
          <div class="seo-faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
            <p itemprop="text">Você pode ler a Bíblia Sagrada online completa gratuitamente no Unoteísmo, com acesso aos 77 Livros Canônicos do Antigo Testamento, Novo Testamento e Escritos Apostólicos, com Tradução em Português e Bíblia Interlinear Grego-Português.</p>
          </div>
        </div>

        <div class="seo-faq-card" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
          <h4 class="seo-faq-q" itemprop="name">Como funciona a Bíblia Interlinear Grego-Português com Léxico?</h4>
          <div class="seo-faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
            <p itemprop="text">A Bíblia Interlinear alinha o texto original em grego bíblico palavra por palavra com a tradução em português, exibindo lemas, morfologia gramatical e permitindo clicar em qualquer palavra para abrir o dicionário léxico com 61.047 verbetes detalhados.</p>
          </div>
        </div>

        <div class="seo-faq-card" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
          <h4 class="seo-faq-q" itemprop="name">A Bíblia Sagrada Online possui narração em áudio?</h4>
          <div class="seo-faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
            <p itemprop="text">Sim, a Bíblia conta com leitor e narrador de áudio integrado com vozes neurais humanas de alta fidelidade (IA), controle de velocidade e avanço automático de capítulos em segundo plano, mesmo com a tela do celular apagada.</p>
          </div>
        </div>

        <div class="seo-faq-card" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
          <h4 class="seo-faq-q" itemprop="name">Quais são os 77 livros da Bíblia Sagrada Unoteísta?</h4>
          <div class="seo-faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
            <p itemprop="text">A Bíblia reúne 77 livros sagrados: 42 livros do Antigo Testamento (tradição Septuaginta), 27 livros do Novo Testamento e 8 escritos dos Bispos Apostólicos dos primeiros séculos da Igreja primitiva (incluindo Didaquê, 1 Clemente e Epístolas de Inácio).</p>
          </div>
        </div>

        <div class="seo-faq-card" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
          <h4 class="seo-faq-q" itemprop="name">A Bíblia Sagrada Online e o Dicionário Grego são gratuitos?</h4>
          <div class="seo-faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
            <p itemprop="text">Sim, todo o acervo da Bíblia Sagrada, o modo interlinear grego, a narração em áudio e o léxico bíblico com mais de 61 mil palavras são 100% gratuitos e de acesso livre para leitura e estudo.</p>
          </div>
        </div>
      </div>

      <div class="seo-keywords-list" aria-label="Livros e Temas de Estudo da Bíblia">
        <span class="seo-tag">Bíblia Sagrada</span>
        <span class="seo-tag">Bíblia Online</span>
        <span class="seo-tag">Bíblia Sagrada Online</span>
        <span class="seo-tag">Ler a Bíblia</span>
        <span class="seo-tag">Bíblia Interlinear Grego</span>
        <span class="seo-tag">Bíblia em Áudio</span>
        <span class="seo-tag">Bíblia Narrada</span>
        <span class="seo-tag">Estudo Bíblico</span>
        <span class="seo-tag">Antigo Testamento</span>
        <span class="seo-tag">Novo Testamento</span>
        <span class="seo-tag">Gênesis</span>
        <span class="seo-tag">Salmos</span>
        <span class="seo-tag">Provérbios</span>
        <span class="seo-tag">Mateus</span>
        <span class="seo-tag">João</span>
        <span class="seo-tag">Romanos</span>
        <span class="seo-tag">Apocalipse</span>
        <span class="seo-tag">Didaquê</span>
        <span class="seo-tag">Léxico Grego Bíblico</span>
      </div>
    </div>
  </section>"""

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Atualizar links internos para /biblia
    content = content.replace('href="biblia.html"', 'href="/biblia"')
    content = content.replace('target": "https://unoteismo.arthurlazarodesousasantos.workers.dev/biblia.html?q={search_term_string}"', 'target": "https://unoteismo.arthurlazarodesousasantos.workers.dev/biblia?q={search_term_string}"')
    content = content.replace('"item": "https://unoteismo.arthurlazarodesousasantos.workers.dev/biblia.html"', '"item": "https://unoteismo.arthurlazarodesousasantos.workers.dev/biblia"')

    # Inserir FAQ schema no JSON-LD se não estiver presente
    if '"@type": "FAQPage"' not in content:
        # Procurar fecho do array @graph: antes de \n    ]\n  }\n  </script>
        target_graph_end = '\n      }\n    ]\n  }\n  </script>'
        replacement_graph = ',\n' + faq_schema + '\n      }\n    ]\n  }\n  </script>'
        if target_graph_end in content:
            content = content.replace(target_graph_end, replacement_graph)
        else:
            print(f"Warning: target_graph_end not found in {filepath}")

    # Substituir seção SEO antiga pela nova e rica
    start_marker = '<!-- Seção Semântica Otimizada para Motores de Busca (SEO Canônico da Bíblia) -->'
    end_marker = '</section>'
    pos_start = content.find(start_marker)
    if pos_start != -1:
        pos_end = content.find(end_marker, pos_start) + len(end_marker)
        content = content[:pos_start] + new_seo_section + content[pos_end:]
        print(f"Seção SEO atualizada com sucesso em {filepath}")
    else:
        print(f"Warning: start_marker not found in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

update_file('biblia.html')
update_file('index.html')
print("Arquivos biblia.html e index.html atualizados com SEO Completo!")
