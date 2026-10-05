import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CANONICAL_FOOTER = """    <footer class="footer">
        <nav class="footer-links" aria-label="Rodapé">
            <a href="/">Início</a>
            <a href="/teologia">Teologia</a>
            <a href="/soteriologia">Soteriologia</a>
            <a href="/communicatio-idiomatum">Communicatio</a>
            <a href="/batismo">Batismo</a>
            <a href="/forma-da-consciencia">Consciência</a>
            <a href="/biblia">Bíblia Online (69 Livros)</a>
            <a href="/pedidos-de-oracao">Pedidos de Oração</a>
            <a href="/quizzes">Quizzes Bíblicos</a>
            <a href="/biblia?mode=int">Interlinear Grego</a>
            <a href="/#edicao-impressa">Edição Impressa &amp; PDF</a>
            <a href="/comparativo">Comparativo Teológico</a>
            <a href="/#filosofia">A Filosofia</a>
            <a href="/#respostas">Respostas Claras</a>
            <a href="/#confissao">Confissão de Fé</a>
            <a href="/sobre">Sobre</a>
            <a href="/privacidade">Privacidade</a>
            <a href="https://github.com/Unoalss/Unoteismo" target="_blank" rel="noopener">GitHub</a>
        </nav>
        <p class="footer-copy">
            &copy; 2026 UNOTEÍSMO — Cânon Sagrado &amp; Filosofia de Vida. Acesso público, aberto e gratuito à verdade.
        </p>
    </footer>"""

def build_header(active_page):
    inicio_class = ' active" aria-current="page' if active_page == 'inicio' else ''
    biblia_toggle = ' active' if active_page in ('biblia', 'interlinear') else ''
    item_biblia = ' active' if active_page == 'biblia' else ''
    item_interlinear = ' active' if active_page == 'interlinear' else ''

    teologia_pages = ('teologia', 'soteriologia', 'communicatio', 'batismo', 'consciencia', 'comparativo')
    teologia_toggle = ' active' if active_page in teologia_pages else ''
    item_teologia = ' active' if active_page == 'teologia' else ''
    item_soteriologia = ' active' if active_page == 'soteriologia' else ''
    item_communicatio = ' active' if active_page == 'communicatio' else ''
    item_batismo = ' active' if active_page == 'batismo' else ''
    item_consciencia = ' active' if active_page == 'consciencia' else ''
    item_comparativo = ' active' if active_page == 'comparativo' else ''

    oracao_class = ' active" aria-current="page' if active_page == 'oracao' else ''
    quizzes_class = ' active" aria-current="page' if active_page == 'quizzes' else ''
    sobre_class = ' active" aria-current="page' if active_page == 'sobre' else ''

    return f"""    <header class="topbar">
        <div class="topbar-left">
            <a href="/" class="logo">
                <img src="/logo-64.png" alt="" width="12" height="32">
                <span>UNOTEÍSMO</span>
            </a>
        </div>

        <button class="menu-toggle-btn" id="menu-toggle-btn" aria-label="Abrir menu de navegação" aria-expanded="false" aria-controls="topbar-menu">
            <span class="hamburger-box">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </span>
        </button>

        <div class="menu-backdrop" id="menu-backdrop" aria-hidden="true"></div>

        <nav class="menu" id="topbar-menu" aria-label="Principal">
            <a href="/" class="nav-link{inicio_class}">Início</a>

            <!-- Dropdown Bíblia -->
            <div class="nav-item-dropdown">
                <button type="button" class="nav-dropdown-toggle{biblia_toggle}" aria-expanded="false" aria-haspopup="true">
                    <span>Bíblia</span>
                    <svg class="dropdown-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <span class="mobile-section-label">Bíblia Sagrada</span>
                <div class="nav-dropdown-menu">
                    <a href="/biblia" class="nav-dropdown-item{item_biblia}">
                        <span class="nav-item-icon">📖</span>
                        <div class="nav-item-text">
                            <strong>Bíblia (69 Livros)</strong>
                            <small>Texto canônico com áudio narrado</small>
                        </div>
                    </a>
                    <a href="/biblia?mode=int" class="nav-dropdown-item{item_interlinear}">
                        <span class="nav-item-icon">🏛️</span>
                        <div class="nav-item-text">
                            <strong>Interlinear Grego</strong>
                            <small>Texto original com lemas e morfologia</small>
                        </div>
                    </a>
                    <div class="nav-dropdown-divider"></div>
                    <a href="/#edicao-impressa" class="nav-dropdown-item">
                        <span class="nav-item-icon">📥</span>
                        <div class="nav-item-text">
                            <strong>Edição Impressa &amp; PDF</strong>
                            <small>ISBN 978-65-02-41194-0 • Download PDF</small>
                        </div>
                    </a>
                </div>
            </div>

            <!-- Dropdown Teologia -->
            <div class="nav-item-dropdown">
                <button type="button" class="nav-dropdown-toggle{teologia_toggle}" aria-expanded="false" aria-haspopup="true">
                    <span>Teologia</span>
                    <svg class="dropdown-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <span class="mobile-section-label">Tratados Teológicos</span>
                <div class="nav-dropdown-menu">
                    <a href="/teologia" class="nav-dropdown-item{item_teologia}">
                        <span class="nav-item-icon">📜</span>
                        <div class="nav-item-text">
                            <strong>Teologia Unoteísta</strong>
                            <small>Fundamentos e síntese doutrinária</small>
                        </div>
                    </a>
                    <a href="/soteriologia" class="nav-dropdown-item{item_soteriologia}">
                        <span class="nav-item-icon">✝️</span>
                        <div class="nav-item-text">
                            <strong>Soteriologia</strong>
                            <small>A salvação, certeza da fé e crença</small>
                        </div>
                    </a>
                    <a href="/communicatio-idiomatum" class="nav-dropdown-item{item_communicatio}">
                        <span class="nav-item-icon">🕊️</span>
                        <div class="nav-item-text">
                            <strong>Communicatio Idiomatum</strong>
                            <small>Comunicação dos nomes e atributos</small>
                        </div>
                    </a>
                    <a href="/batismo" class="nav-dropdown-item{item_batismo}">
                        <span class="nav-item-icon">💧</span>
                        <div class="nav-item-text">
                            <strong>O Batismo Bíblico</strong>
                            <small>Um só batismo em nome de Jesus</small>
                        </div>
                    </a>
                    <a href="/forma-da-consciencia" class="nav-dropdown-item{item_consciencia}">
                        <span class="nav-item-icon">🧠</span>
                        <div class="nav-item-text">
                            <strong>Forma da Consciência</strong>
                            <small>Distinção entre as consciências e Cristo</small>
                        </div>
                    </a>
                    <div class="nav-dropdown-divider"></div>
                    <a href="/comparativo" class="nav-dropdown-item{item_comparativo}">
                        <span class="nav-item-icon">⚖️</span>
                        <div class="nav-item-text">
                            <strong>Comparativo Teológico</strong>
                            <small>Paralelo com trinitarismo e unicismo</small>
                        </div>
                    </a>
                </div>
            </div>

            <!-- Dropdown Filosofia -->
            <div class="nav-item-dropdown">
                <button type="button" class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
                    <span>Filosofia</span>
                    <svg class="dropdown-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <span class="mobile-section-label">Filosofia & Busca da Verdade</span>
                <div class="nav-dropdown-menu">
                    <a href="/#filosofia" class="nav-dropdown-item">
                        <span class="nav-item-icon">💡</span>
                        <div class="nav-item-text">
                            <strong>A Filosofia</strong>
                            <small>Vida e verdade sem viés religioso</small>
                        </div>
                    </a>
                    <a href="/#respostas" class="nav-dropdown-item">
                        <span class="nav-item-icon">💬</span>
                        <div class="nav-item-text">
                            <strong>Respostas Claras</strong>
                            <small>Esclarecimentos diretos às dúvidas</small>
                        </div>
                    </a>
                    <a href="/#confissao" class="nav-dropdown-item">
                        <span class="nav-item-icon">📜</span>
                        <div class="nav-item-text">
                            <strong>Confissão de Fé</strong>
                            <small>Declaração dos princípios fundamentais</small>
                        </div>
                    </a>
                </div>
            </div>

            <a href="/pedidos-de-oracao" class="nav-link{oracao_class}">Oração</a>
            <a href="/quizzes" class="nav-link{quizzes_class}">Quizzes</a>
            <a href="/sobre" class="nav-link{sobre_class}">Sobre</a>

            <a href="/biblia" class="menu-btn-cta"><span>Ler Bíblia →</span></a>
        </nav>
    </header>"""

PAGES_MAP = {
    'index.html': ('inicio', True),
    'biblia.html': ('biblia', False),  # não altera o footer em biblia.html
    'teologia.html': ('teologia', True),
    'soteriologia.html': ('soteriologia', True),
    'communicatio-idiomatum.html': ('communicatio', True),
    'batismo.html': ('batismo', True),
    'forma-da-consciencia.html': ('consciencia', True),
    'comparativo.html': ('comparativo', True),
    'sobre.html': ('sobre', True),
    'privacidade.html': ('privacidade', True),
    'pedidos-de-oracao.html': ('oracao', True),
    'quizzes.html': ('quizzes', True),
    'categoria.html': ('categoria', True),
    '404.html': ('404', True),
    'posts/index.html': ('posts', True),
    'posts/versiculo-do-dia/index.html': ('posts', True),
    'posts/palavra-do-dia/index.html': ('posts', True),
    'posts/salmos-do-dia/index.html': ('posts', True),
    'posts/devocional-do-dia/index.html': ('posts', True),
    'posts/historias-da-biblia/index.html': ('posts', True),
    'posts/curiosidades-biblicas/index.html': ('posts', True),
    'posts/ensinamentos-de-jesus/index.html': ('posts', True),
    'posts/ensino-biblico/index.html': ('posts', True),
}

def sync_page(rel_path, active_page, update_footer):
    full_path = os.path.join(ROOT, rel_path.replace('/', os.sep))
    if not os.path.exists(full_path):
        print(f"Skipping {rel_path} (not found)")
        return

    with open(full_path, 'r', encoding='utf-8') as f:
        html = f.read()

    new_header = build_header(active_page)

    # Substitui <header class="topbar">...</header>
    header_pattern = re.compile(r'<header class="topbar">[\s\S]*?</header>')
    if header_pattern.search(html):
        html = header_pattern.sub(lambda m: new_header, html, count=1)
    else:
        print(f"Warning: <header class='topbar'> not found in {rel_path}")

    # Atualiza o rodapé se aplicável e se existir na página
    if update_footer:
        footer_pattern = re.compile(r'<footer class="footer">[\s\S]*?</footer>')
        if footer_pattern.search(html):
            html = footer_pattern.sub(lambda m: CANONICAL_FOOTER, html, count=1)
        elif rel_path == '404.html':
            # Insere footer antes de </body> em 404.html
            html = html.replace('</body>', CANONICAL_FOOTER + '\n    <script src="/site.js" defer></script>\n</body>')

    # Garante que site.js está incluído se for 404
    if rel_path == '404.html' and '<script src="/site.js"' not in html:
        html = html.replace('</body>', '    <script src="/site.js" defer></script>\n</body>')

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Updated {rel_path} (active: {active_page})")

if __name__ == '__main__':
    for rel_path, (active, upd_footer) in PAGES_MAP.items():
        sync_page(rel_path, active, upd_footer)
    print("All pages synchronized successfully!")
