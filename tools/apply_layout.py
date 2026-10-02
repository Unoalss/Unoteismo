"""Aplica o cabeçalho, o rodapé, o skip-link e o site.js em todas as páginas (idempotente).

Rode da raiz do projeto:  python tools/apply_layout.py
Assim o menu/rodapé ficam iguais em todas as páginas; para mudar um link do menu,
edite HEADER/FOOTER abaixo e rode de novo.
"""
import re
import sys

# arquivo -> (item ativo do menu, alvo do skip-link)
PAGES = {
    'index.html': ('inicio', '#conteudo'),
    'teologia.html': ('teologia', '#conteudo'),
    'soteriologia.html': ('soteriologia', '#conteudo'),
    'communicatio-idiomatum.html': ('communicatio', '#conteudo'),
    'batismo.html': ('batismo', '#conteudo'),
    'forma-da-consciencia.html': ('consciencia', '#conteudo'),
    'biblia.html': ('biblia', '#bible-reading-container'),
    'sobre.html': ('sobre', '#conteudo'),
    'privacidade.html': ('privacidade', '#conteudo'),
    'comparativo.html': ('comparativo', '#conteudo'),
}


def header(active):
    # Classes ativas
    cur_inicio = ' active" aria-current="page' if active == 'inicio' else ''
    cur_biblia = ' active' if active == 'biblia' else ''
    cur_teologia = ' active' if active in ('teologia', 'soteriologia', 'communicatio', 'batismo', 'consciencia', 'comparativo') else ''
    cur_sobre = ' active" aria-current="page' if active == 'sobre' else ''

    act_teologia_geral = ' active' if active == 'teologia' else ''
    act_soteriologia = ' active' if active == 'soteriologia' else ''
    act_communicatio = ' active' if active == 'communicatio' else ''
    act_batismo = ' active' if active == 'batismo' else ''
    act_consciencia = ' active' if active == 'consciencia' else ''
    act_comparativo = ' active' if active == 'comparativo' else ''

    return (
        '<header class="topbar">\n'
        '        <div class="topbar-left">\n'
        '            <a href="/" class="logo">\n'
        '                <img src="/logo-64.png" alt="" width="12" height="32">\n'
        '                <span>UNOTEÍSMO</span>\n'
        '            </a>\n'
        '        </div>\n\n'
        '        <button class="menu-toggle-btn" id="menu-toggle-btn" aria-label="Abrir menu de navegação" aria-expanded="false" aria-controls="topbar-menu">\n'
        '            <span class="hamburger-box">\n'
        '                <span class="hamburger-line"></span>\n'
        '                <span class="hamburger-line"></span>\n'
        '                <span class="hamburger-line"></span>\n'
        '            </span>\n'
        '        </button>\n\n'
        '        <div class="menu-backdrop" id="menu-backdrop" aria-hidden="true"></div>\n\n'
        '        <nav class="menu" id="topbar-menu" aria-label="Principal">\n'
        f'            <a href="/" class="nav-link{cur_inicio}">Início</a>\n\n'
        '            <!-- Dropdown Bíblia -->\n'
        '            <div class="nav-item-dropdown">\n'
        f'                <button type="button" class="nav-dropdown-toggle{cur_biblia}" aria-expanded="false" aria-haspopup="true">\n'
        '                    <span>Bíblia</span>\n'
        '                    <svg class="dropdown-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">\n'
        '                        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>\n'
        '                    </svg>\n'
        '                </button>\n'
        '                <span class="mobile-section-label">Bíblia Sagrada</span>\n'
        '                <div class="nav-dropdown-menu">\n'
        '                    <a href="/biblia" class="nav-dropdown-item">\n'
        '                        <span class="nav-item-icon">📖</span>\n'
        '                        <div class="nav-item-text">\n'
        '                            <strong>Bíblia (69 Livros)</strong>\n'
        '                            <small>Texto canônico com áudio narrado</small>\n'
        '                        </div>\n'
        '                    </a>\n'
        '                    <a href="/biblia?mode=int" class="nav-dropdown-item">\n'
        '                        <span class="nav-item-icon">🏛️</span>\n'
        '                        <div class="nav-item-text">\n'
        '                            <strong>Interlinear Grego</strong>\n'
        '                            <small>Texto original com lemas e morfologia</small>\n'
        '                        </div>\n'
        '                    </a>\n'
        '                </div>\n'
        '            </div>\n\n'
        '            <!-- Dropdown Teologia -->\n'
        '            <div class="nav-item-dropdown">\n'
        f'                <button type="button" class="nav-dropdown-toggle{cur_teologia}" aria-expanded="false" aria-haspopup="true">\n'
        '                    <span>Teologia</span>\n'
        '                    <svg class="dropdown-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">\n'
        '                        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>\n'
        '                    </svg>\n'
        '                </button>\n'
        '                <span class="mobile-section-label">Tratados Teológicos</span>\n'
        '                <div class="nav-dropdown-menu">\n'
        f'                    <a href="/teologia" class="nav-dropdown-item{act_teologia_geral}">\n'
        '                        <span class="nav-item-icon">📜</span>\n'
        '                        <div class="nav-item-text">\n'
        '                            <strong>Teologia Unoteísta</strong>\n'
        '                            <small>Fundamentos e síntese doutrinária</small>\n'
        '                        </div>\n'
        '                    </a>\n'
        f'                    <a href="/soteriologia" class="nav-dropdown-item{act_soteriologia}">\n'
        '                        <span class="nav-item-icon">✝️</span>\n'
        '                        <div class="nav-item-text">\n'
        '                            <strong>Soteriologia</strong>\n'
        '                            <small>A salvação, certeza da fé e crença</small>\n'
        '                        </div>\n'
        '                    </a>\n'
        f'                    <a href="/communicatio-idiomatum" class="nav-dropdown-item{act_communicatio}">\n'
        '                        <span class="nav-item-icon">🕊️</span>\n'
        '                        <div class="nav-item-text">\n'
        '                            <strong>Communicatio Idiomatum</strong>\n'
        '                            <small>Comunicação dos nomes e atributos</small>\n'
        '                        </div>\n'
        '                    </a>\n'
        f'                    <a href="/batismo" class="nav-dropdown-item{act_batismo}">\n'
        '                        <span class="nav-item-icon">💧</span>\n'
        '                        <div class="nav-item-text">\n'
        '                            <strong>O Batismo Bíblico</strong>\n'
        '                            <small>Um só batismo em nome de Jesus</small>\n'
        '                        </div>\n'
        '                    </a>\n'
        f'                    <a href="/forma-da-consciencia" class="nav-dropdown-item{act_consciencia}">\n'
        '                        <span class="nav-item-icon">🧠</span>\n'
        '                        <div class="nav-item-text">\n'
        '                            <strong>Forma da Consciência</strong>\n'
        '                            <small>Distinção entre as consciências e Cristo</small>\n'
        '                        </div>\n'
        '                    </a>\n'
        '                    <div class="nav-dropdown-divider"></div>\n'
        f'                    <a href="/comparativo" class="nav-dropdown-item{act_comparativo}">\n'
        '                        <span class="nav-item-icon">⚖️</span>\n'
        '                        <div class="nav-item-text">\n'
        '                            <strong>Comparativo Teológico</strong>\n'
        '                            <small>Paralelo com trinitarismo e unicismo</small>\n'
        '                        </div>\n'
        '                    </a>\n'
        '                </div>\n'
        '            </div>\n\n'
        '            <!-- Dropdown Filosofia -->\n'
        '            <div class="nav-item-dropdown">\n'
        '                <button type="button" class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">\n'
        '                    <span>Filosofia</span>\n'
        '                    <svg class="dropdown-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">\n'
        '                        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>\n'
        '                    </svg>\n'
        '                </button>\n'
        '                <span class="mobile-section-label">Filosofia & Busca da Verdade</span>\n'
        '                <div class="nav-dropdown-menu">\n'
        '                    <a href="/#filosofia" class="nav-dropdown-item">\n'
        '                        <span class="nav-item-icon">💡</span>\n'
        '                        <div class="nav-item-text">\n'
        '                            <strong>A Filosofia</strong>\n'
        '                            <small>Vida e verdade sem viés religioso</small>\n'
        '                        </div>\n'
        '                    </a>\n'
        '                    <a href="/#respostas" class="nav-dropdown-item">\n'
        '                        <span class="nav-item-icon">💬</span>\n'
        '                        <div class="nav-item-text">\n'
        '                            <strong>Respostas Claras</strong>\n'
        '                            <small>Esclarecimentos diretos às dúvidas</small>\n'
        '                        </div>\n'
        '                    </a>\n'
        '                    <a href="/#confissao" class="nav-dropdown-item">\n'
        '                        <span class="nav-item-icon">📜</span>\n'
        '                        <div class="nav-item-text">\n'
        '                            <strong>Confissão de Fé</strong>\n'
        '                            <small>Declaração dos princípios fundamentais</small>\n'
        '                        </div>\n'
        '                    </a>\n'
        '                </div>\n'
        '            </div>\n\n'
        f'            <a href="/sobre" class="nav-link{cur_sobre}">Sobre</a>\n\n'
        '            <a href="/biblia" class="menu-btn-cta"><span>Ler Bíblia →</span></a>\n'
        '        </nav>\n'
        '    </header>'
    )


FOOTER = (
    '<footer class="footer">\n'
    '        <nav class="footer-links" aria-label="Rodapé">\n'
    '            <a href="/">Início</a>\n'
    '            <a href="/teologia">Teologia</a>\n'
    '            <a href="/soteriologia">Soteriologia</a>\n'
    '            <a href="/communicatio-idiomatum">Communicatio</a>\n'
    '            <a href="/batismo">Batismo</a>\n'
    '            <a href="/forma-da-consciencia">Consciência</a>\n'
    '            <a href="/biblia">Bíblia Online (69 Livros)</a>\n'
    '            <a href="/biblia?mode=int">Interlinear Grego</a>\n'
    '            <a href="/comparativo">Comparativo Teológico</a>\n'
    '            <a href="/#filosofia">A Filosofia</a>\n'
    '            <a href="/#respostas">Respostas Claras</a>\n'
    '            <a href="/#confissao">Confissão de Fé</a>\n'
    '            <a href="/sobre">Sobre</a>\n'
    '            <a href="/privacidade">Privacidade</a>\n'
    '            <a href="https://www.youtube.com/@unoteismo" target="_blank" rel="noopener">YouTube</a>\n'
    '            <a href="https://www.tiktok.com/@unoteismo" target="_blank" rel="noopener">TikTok</a>\n'
    '            <a href="https://github.com/Unoalss/Unoteismo" target="_blank" rel="noopener">GitHub</a>\n'
    '        </nav>\n'
    '        <p class="footer-copy">\n'
    '            &copy; 2026 UNOTEÍSMO — Cânon Sagrado &amp; Filosofia de Vida. Acesso público, aberto e gratuito à verdade.\n'
    '        </p>\n'
    '    </footer>'
)

CLEAN = {
    'index.html': '/',
    'biblia.html': '/biblia',
    'teologia.html': '/teologia',
    'soteriologia.html': '/soteriologia',
    'communicatio-idiomatum.html': '/communicatio-idiomatum',
    'batismo.html': '/batismo',
    'forma-da-consciencia.html': '/forma-da-consciencia',
    'sobre.html': '/sobre',
    'privacidade.html': '/privacidade',
    'comparativo.html': '/comparativo'
}


def absolutize(m):
    attr, val = m.group(1), m.group(2)
    if val.startswith(('/', '#', 'http:', 'https:', 'mailto:', 'data:', 'tel:', 'javascript:')):
        return m.group(0)
    base, sep, rest = val.partition('#')
    base, qsep, query = base.partition('?')
    target = CLEAN.get(base, '/' + base)
    return f'{attr}="{target}{qsep}{query}{sep}{rest}"'


def process(name, active, skip_target):
    with open(name, 'r', encoding='utf-8', newline='') as f:
        html = f.read()
    html = html.replace('\r\n', '\n')

    html, n1 = re.subn(r'<header class="topbar">[\s\S]*?</header>', lambda m: header(active), html, count=1)
    html, n2 = re.subn(r'<footer class="footer">[\s\S]*?</footer>', lambda m: FOOTER, html, count=1)

    # Skip-link logo após <body>
    html = re.sub(r'\n?[ \t]*<a class="skip-link"[^>]*>[^<]*</a>', '', html)
    html = re.sub(
        r'(<body[^>]*>)',
        lambda m: f'{m.group(1)}\n    <a class="skip-link" href="{skip_target}">Ir para o conteúdo</a>',
        html, count=1)

    # Alvo do skip-link
    if skip_target == '#conteudo' and 'id="conteudo"' not in html:
        html = html.replace('<main class="container">', '<main class="container" id="conteudo">', 1)

    # Menu inline antigo -> site.js
    html = re.sub(
        r'(?:[ \t]*<!--[^>]*Menu[^>]*-->\n)?[ \t]*<script>\s*document\.addEventListener\(\'DOMContentLoaded\'[\s\S]*?menu-toggle-btn[\s\S]*?</script>\n?',
        '', html)
    if '<script src="/site.js" defer></script>' not in html:
        html = html.replace('</body>', '    <script src="/site.js" defer></script>\n</body>', 1)

    # Referências relativas -> absolutas / URLs limpas
    html = re.sub(r'\b(href|src)="([^"]*)"', absolutize, html)

    with open(name, 'w', encoding='utf-8', newline='') as f:
        f.write(html)
    return n1, n2


if __name__ == '__main__':
    import os
    for page, (active, skip) in PAGES.items():
        if not os.path.exists(page):
            print(f'  (pulando {page}: não existe)')
            continue
        n1, n2 = process(page, active, skip)
        print(f'{page}: cabeçalho={n1} rodapé={n2}')
    sys.exit(0)
