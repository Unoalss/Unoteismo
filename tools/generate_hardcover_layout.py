"""Gera a capa dura completa e aberta (Full Wrap: Contracapa + Lombada de 3,5 cm + Capa da Frente)
em altíssima resolução (300 DPI) para impressão física da Bíblia Sagrada Unoteísta (1.730 páginas).
Inclui o Código de Barras Oficial EAN-13 (ISBN 978-65-02-41194-0) registrado na CBL.
"""
import os
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# ESPECIFICAÇÕES TÉCNICAS MILIMÉTRICAS (300 DPI)
# ---------------------------------------------------------------------------
# 1 polegada = 25.4 mm. Resolução = 300 pixels por polegada.
DPI = 300
PPM = DPI / 25.4  # ~11.811 pixels por milímetro

def mm_to_px(mm):
    return int(round(mm * PPM))

# Cotas físicas reais (em milímetros)
PAGE_W_MM = 155.0       # Largura da página do miolo
PAGE_H_MM = 230.0       # Altura da página do miolo
SQUARES_MM = 3.0        # Avanço do papelão da capa dura além do miolo (squares)
BOARD_W_MM = PAGE_W_MM + SQUARES_MM       # 158 mm (largura do papelão da capa)
BOARD_H_MM = PAGE_H_MM + 2 * SQUARES_MM   # 236 mm (altura do papelão da capa)

SPINE_MM = 35.5         # Largura da lombada para 1.730 páginas em Papel Bíblia 30g/m²
HINGE_MM = 8.0          # Canaleta / junta de flexão entre capa e lombada
WRAP_MM = 18.0          # Vira de papelão da capa dura (Turn-in / sangria de empastamento)
BLEED_MM = 2.0          # Sangria de segurança adicional

# Dimensões totais da folha de revestimento aberta
TOTAL_W_MM = (WRAP_MM + BLEED_MM) * 2 + BOARD_W_MM * 2 + HINGE_MM * 2 + SPINE_MM
TOTAL_H_MM = (WRAP_MM + BLEED_MM) * 2 + BOARD_H_MM

WIDTH_PX = mm_to_px(TOTAL_W_MM)
HEIGHT_PX = mm_to_px(TOTAL_H_MM)

print(f"Dimensões do arquivo de capa aberta (Full Wrap):")
print(f"  Milímetros: {TOTAL_W_MM:.1f} mm x {TOTAL_H_MM:.1f} mm")
print(f"  Pixels (300 DPI): {WIDTH_PX} px x {HEIGHT_PX} px")

# Posições horizontais X dos elementos (em pixels)
MARGIN_LEFT_PX = mm_to_px(WRAP_MM + BLEED_MM)
BACK_COVER_LEFT_PX = MARGIN_LEFT_PX
BACK_COVER_RIGHT_PX = BACK_COVER_LEFT_PX + mm_to_px(BOARD_W_MM)

LEFT_HINGE_RIGHT_PX = BACK_COVER_RIGHT_PX + mm_to_px(HINGE_MM)
SPINE_LEFT_PX = LEFT_HINGE_RIGHT_PX
SPINE_RIGHT_PX = SPINE_LEFT_PX + mm_to_px(SPINE_MM)

RIGHT_HINGE_RIGHT_PX = SPINE_RIGHT_PX + mm_to_px(HINGE_MM)
FRONT_COVER_LEFT_PX = RIGHT_HINGE_RIGHT_PX
FRONT_COVER_RIGHT_PX = FRONT_COVER_LEFT_PX + mm_to_px(BOARD_W_MM)

MARGIN_TOP_PX = mm_to_px(WRAP_MM + BLEED_MM)
COVER_BOTTOM_PX = MARGIN_TOP_PX + mm_to_px(BOARD_H_MM)

# ---------------------------------------------------------------------------
# PALETA DE CORES NOBRES
# ---------------------------------------------------------------------------
# Couro Azul Petróleo / Marinho Régio Profundo
COLOR_BG_DARK = (13, 27, 42)          # #0d1b2a
COLOR_BG_LIGHT = (20, 38, 58)         # #14263a
COLOR_GOLD = (212, 175, 55)           # Ouro Nobre #d4af37
COLOR_GOLD_LIGHT = (240, 215, 130)    # Ouro Claro Iluminado #f0d782
COLOR_GOLD_MUTED = (180, 145, 45)     # Ouro Envelhecido
COLOR_WHITE = (255, 255, 255)
COLOR_TEXT_PALE = (235, 240, 245)     # Branco Levemente Acetinado
COLOR_TEXT_MUTED = (175, 190, 205)
COLOR_HINGE_SHADOW = (8, 16, 26)      # Sombra sutil das canaletas

# ---------------------------------------------------------------------------
# CARREGAMENTO DE FONTES TIPOGRÁFICAS
# ---------------------------------------------------------------------------
def get_font(name, size):
    font_paths = {
        'serif_bold': 'C:/Windows/Fonts/georgiab.ttf',
        'serif_reg': 'C:/Windows/Fonts/georgia.ttf',
        'serif_italic': 'C:/Windows/Fonts/georgiai.ttf',
        'times_bold': 'C:/Windows/Fonts/timesbd.ttf',
        'times_reg': 'C:/Windows/Fonts/times.ttf',
        'sans_bold': 'C:/Windows/Fonts/arialbd.ttf',
        'sans_reg': 'C:/Windows/Fonts/arial.ttf',
    }
    path = font_paths.get(name, font_paths['serif_bold'])
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

# ---------------------------------------------------------------------------
# FUNÇÕES DE DESENHO VETORIAL PARA ORNAMENTOS (SEM CARACTERES TOFU/QUADRADOS)
# ---------------------------------------------------------------------------
def draw_vector_star(draw, x, y, size, fill):
    """Desenha uma estrela/diamante nobre de 4 pontas totalmente vetorial."""
    pts = [
        (x, y - size),
        (x + size * 0.28, y - size * 0.28),
        (x + size, y),
        (x + size * 0.28, y + size * 0.28),
        (x, y + size),
        (x - size * 0.28, y + size * 0.28),
        (x - size, y),
        (x - size * 0.28, y - size * 0.28)
    ]
    draw.polygon(pts, fill=fill)

def draw_vector_ornament_center(draw, cx, cy, size, fill):
    """Ornamento central com estrela maior e diamantes menores laterais."""
    draw_vector_star(draw, cx, cy, size, fill)
    draw_vector_star(draw, cx - size * 2.8, cy, size * 0.55, fill)
    draw_vector_star(draw, cx + size * 2.8, cy, size * 0.55, fill)
    # Linhas finas laterais
    line_len = mm_to_px(25.0)
    draw.line([(cx - size * 3.8 - line_len, cy), (cx - size * 3.8, cy)], fill=fill, width=2)
    draw.line([(cx + size * 3.8, cy), (cx + size * 3.8 + line_len, cy)], fill=fill, width=2)

# ---------------------------------------------------------------------------
# CRIAÇÃO DA IMAGEM E GRADIENTE
# ---------------------------------------------------------------------------
img = Image.new('RGB', (WIDTH_PX, HEIGHT_PX), COLOR_BG_DARK)
draw = ImageDraw.Draw(img)

# Cria gradiente sutil do centro da capa para as bordas para efeito de volume e couro
for y in range(HEIGHT_PX):
    ratio = abs(y - HEIGHT_PX / 2) / (HEIGHT_PX / 2)
    factor = 1.0 - (ratio * 0.16)
    r = int(COLOR_BG_DARK[0] * factor)
    g = int(COLOR_BG_DARK[1] * factor)
    b = int(COLOR_BG_DARK[2] * factor)
    draw.line([(0, y), (WIDTH_PX, y)], fill=(r, g, b))

# Desenha as juntas / canaletas de dobradiça (sombra vertical para visualização gráfica)
hinge_l_start = BACK_COVER_RIGHT_PX
hinge_l_end = SPINE_LEFT_PX
hinge_r_start = SPINE_RIGHT_PX
hinge_r_end = FRONT_COVER_LEFT_PX

for x in range(hinge_l_start, hinge_l_end):
    draw.line([(x, 0), (x, HEIGHT_PX)], fill=COLOR_HINGE_SHADOW)
for x in range(hinge_r_start, hinge_r_end):
    draw.line([(x, 0), (x, HEIGHT_PX)], fill=COLOR_HINGE_SHADOW)

# Linhas de guia pontilhadas bem sutis nas áreas de dobra da capa
def draw_dashed_vline(x, y1, y2, color, dash=18, gap=18):
    for y in range(y1, y2, dash + gap):
        draw.line([(x, y), (x, min(y + dash, y2))], fill=color, width=1)

guide_color = (40, 60, 85)
draw_dashed_vline(BACK_COVER_LEFT_PX, MARGIN_TOP_PX, COVER_BOTTOM_PX, guide_color)
draw_dashed_vline(SPINE_LEFT_PX, MARGIN_TOP_PX, COVER_BOTTOM_PX, guide_color)
draw_dashed_vline(SPINE_RIGHT_PX, MARGIN_TOP_PX, COVER_BOTTOM_PX, guide_color)
draw_dashed_vline(FRONT_COVER_RIGHT_PX, MARGIN_TOP_PX, COVER_BOTTOM_PX, guide_color)

# ---------------------------------------------------------------------------
# MOLDURA DOURADA NOBRE (Classical Oxford/Cambridge Double Border)
# ---------------------------------------------------------------------------
def draw_luxury_frame(x1, y1, x2, y2, with_bottom_stars=True):
    pad_out = mm_to_px(12.0)
    pad_in = mm_to_px(16.0)
    
    # Retângulo externo fino
    draw.rectangle([x1 + pad_out, y1 + pad_out, x2 - pad_out, y2 - pad_out], outline=COLOR_GOLD_MUTED, width=2)
    # Retângulo interno nobre
    draw.rectangle([x1 + pad_in, y1 + pad_in, x2 - pad_in, y2 - pad_in], outline=COLOR_GOLD, width=3)
    
    # Ornamentos delicados de estrela dourada nos cantos superiores
    star_inset = mm_to_px(22.0)
    star_r = mm_to_px(2.2)
    draw_vector_star(draw, x1 + star_inset, y1 + star_inset, star_r, COLOR_GOLD_LIGHT)
    draw_vector_star(draw, x2 - star_inset, y1 + star_inset, star_r, COLOR_GOLD_LIGHT)
    
    # Cantos inferiores (apenas quando solicitado, evitando colisão com código de barras/selos na contracapa)
    if with_bottom_stars:
        draw_vector_star(draw, x1 + star_inset, y2 - star_inset, star_r, COLOR_GOLD_LIGHT)
        draw_vector_star(draw, x2 - star_inset, y2 - star_inset, star_r, COLOR_GOLD_LIGHT)

# Aplica a moldura de luxo na Frente (com estrelas inferiores) e na Contracapa (sem estrelas inferiores para dar espaço ao CBL e Código de Barras)
draw_luxury_frame(FRONT_COVER_LEFT_PX, MARGIN_TOP_PX, FRONT_COVER_RIGHT_PX, COVER_BOTTOM_PX, with_bottom_stars=True)
draw_luxury_frame(BACK_COVER_LEFT_PX, MARGIN_TOP_PX, BACK_COVER_RIGHT_PX, COVER_BOTTOM_PX, with_bottom_stars=False)

# ---------------------------------------------------------------------------
# CAPA DA FRENTE (FRONT COVER)
# ---------------------------------------------------------------------------
fc_center_x = (FRONT_COVER_LEFT_PX + FRONT_COVER_RIGHT_PX) // 2
fc_top_y = MARGIN_TOP_PX + mm_to_px(26.0)

# Ornamento Vetorial Superior
draw_vector_ornament_center(draw, fc_center_x, fc_top_y, mm_to_px(4.0), COLOR_GOLD_LIGHT)

# Lema superior
font_motto = get_font('sans_bold', 24)
draw.text((fc_center_x, fc_top_y + mm_to_px(14.0)), "A VERDADE SEM VIÉS RELIGIOSO", fill=COLOR_GOLD_MUTED, font=font_motto, anchor="mm")

# Título Principal com presença monumental
font_title = get_font('serif_bold', 82)
font_title_sub = get_font('serif_bold', 58)
title_y = fc_top_y + mm_to_px(48.0)

draw.text((fc_center_x, title_y), "BÍBLIA SAGRADA", fill=COLOR_GOLD_LIGHT, font=font_title, anchor="mm")
draw.text((fc_center_x, title_y + mm_to_px(20.0)), "UNOTEÍSTA", fill=COLOR_GOLD, font=font_title_sub, anchor="mm")

# Subtítulo em itálico
font_sub = get_font('serif_italic', 36)
draw.text((fc_center_x, title_y + mm_to_px(38.0)), "o caminho da verdade", fill=COLOR_TEXT_PALE, font=font_sub, anchor="mm")

# Divisor Dourado Central Vetorial
div_y = title_y + mm_to_px(53.0)
draw_vector_ornament_center(draw, fc_center_x, div_y, mm_to_px(3.5), COLOR_GOLD)

# Descrição do Cânon Sagrado
canon_desc_y = div_y + mm_to_px(20.0)
font_canon_head = get_font('sans_bold', 27)
font_canon_body = get_font('serif_reg', 25)
font_canon_treatises = get_font('serif_italic', 23)

draw.text((fc_center_x, canon_desc_y), "EDIÇÃO CANÔNICA DEFINITIVA", fill=COLOR_GOLD, font=font_canon_head, anchor="mm")
draw.text((fc_center_x, canon_desc_y + mm_to_px(11.0)), "Antigo Testamento (42 Livros) • Novo Testamento (27 Livros)", fill=COLOR_TEXT_PALE, font=font_canon_body, anchor="mm")
draw.text((fc_center_x, canon_desc_y + mm_to_px(21.0)), "Texto Canônico Integral com os 4 Tratados Teológicos Fundamentais", fill=COLOR_TEXT_MUTED, font=font_canon_treatises, anchor="mm")

# Rodapé da Capa da Frente: Autor e Editora
fc_bot_y = COVER_BOTTOM_PX - mm_to_px(36.0)
font_author = get_font('serif_bold', 42)
font_pub = get_font('sans_bold', 22)

draw.text((fc_center_x, fc_bot_y - mm_to_px(14.0)), "Arthur Santos", fill=COLOR_GOLD_LIGHT, font=font_author, anchor="mm")
draw.text((fc_center_x, fc_bot_y + mm_to_px(6.0)), "CAMINHO DA VERDADE • 2026", fill=COLOR_GOLD_MUTED, font=font_pub, anchor="mm")

# ---------------------------------------------------------------------------
# LOMBADA (SPINE - 35,5 mm de largura / 236 mm de altura)
# ---------------------------------------------------------------------------
spine_center_x = (SPINE_LEFT_PX + SPINE_RIGHT_PX) // 2
spine_w_px = SPINE_RIGHT_PX - SPINE_LEFT_PX
spine_h_px = COVER_BOTTOM_PX - MARGIN_TOP_PX

# Cria tira horizontal para a lombada com a largura da altura (236 mm) e altura da largura (35,5 mm)
spine_strip = Image.new('RGBA', (spine_h_px, spine_w_px), (0, 0, 0, 0))
spine_draw = ImageDraw.Draw(spine_strip)

font_spine_title = get_font('serif_bold', 29)
font_spine_sub = get_font('serif_italic', 19)
font_spine_author = get_font('sans_bold', 20)
font_spine_pub = get_font('sans_bold', 17)

# Posicionamento harmônico ao longo dos 236 mm da lombada:
# Topo = 24 mm; Título = 70 mm; Subtítulo = 126 mm; Autor = 165 mm; Editora = 196 mm
draw_vector_star(spine_draw, mm_to_px(24.0), spine_w_px // 2, mm_to_px(3.2), COLOR_GOLD)
spine_draw.text((mm_to_px(72.0), spine_w_px // 2), "BÍBLIA SAGRADA UNOTEÍSTA", fill=COLOR_GOLD_LIGHT, font=font_spine_title, anchor="mm")
spine_draw.text((mm_to_px(126.0), spine_w_px // 2), "o caminho da verdade", fill=COLOR_TEXT_PALE, font=font_spine_sub, anchor="mm")
spine_draw.text((mm_to_px(164.0), spine_w_px // 2), "Arthur Santos", fill=COLOR_GOLD, font=font_spine_author, anchor="mm")
spine_draw.text((mm_to_px(196.0), spine_w_px // 2), "CAMINHO DA VERDADE", fill=COLOR_GOLD_MUTED, font=font_spine_pub, anchor="mm")

# Rotaciona a tira para a vertical (270 graus para leitura da cabeça para o pé conforme a norma técnica ABNT)
spine_strip_rot = spine_strip.rotate(270, expand=True)
img.paste(spine_strip_rot, (SPINE_LEFT_PX, MARGIN_TOP_PX), spine_strip_rot)

# Moldura delicada no topo e base da lombada (com folga segura dos textos)
draw.line([(SPINE_LEFT_PX + 4, MARGIN_TOP_PX + mm_to_px(14.0)), (SPINE_RIGHT_PX - 4, MARGIN_TOP_PX + mm_to_px(14.0))], fill=COLOR_GOLD_MUTED, width=2)
draw.line([(SPINE_LEFT_PX + 4, COVER_BOTTOM_PX - mm_to_px(14.0)), (SPINE_RIGHT_PX - 4, COVER_BOTTOM_PX - mm_to_px(14.0))], fill=COLOR_GOLD_MUTED, width=2)

# ---------------------------------------------------------------------------
# CONTRACAPA (BACK COVER)
# ---------------------------------------------------------------------------
bc_center_x = (BACK_COVER_LEFT_PX + BACK_COVER_RIGHT_PX) // 2
bc_top_y = MARGIN_TOP_PX + mm_to_px(25.0)

# Título da Contracapa
font_bc_title = get_font('sans_bold', 28)
font_bc_sub = get_font('sans_bold', 18)

draw_vector_ornament_center(draw, bc_center_x, bc_top_y, mm_to_px(3.5), COLOR_GOLD_LIGHT)
draw.text((bc_center_x, bc_top_y + mm_to_px(13.0)), "UNOTEÍSMO", fill=COLOR_GOLD_LIGHT, font=font_bc_title, anchor="mm")
draw.text((bc_center_x, bc_top_y + mm_to_px(22.0)), "Filosofia de Vida, Monoteísmo Bíblico & Defesa da Verdade", fill=COLOR_GOLD_MUTED, font=font_bc_sub, anchor="mm")

# Separador Dourado
draw.line([(bc_center_x - mm_to_px(45.0), bc_top_y + mm_to_px(30.0)), (bc_center_x + mm_to_px(45.0), bc_top_y + mm_to_px(30.0))], fill=COLOR_GOLD_MUTED, width=2)

# Função auxiliar para quebrar texto em linhas com largura máxima
font_body = get_font('serif_reg', 24)
font_quote = get_font('serif_italic', 26)

def wrap_text(text, font, max_width_px):
    words = text.split()
    lines = []
    current_line = []
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if (bbox[2] - bbox[0]) <= max_width_px:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]
    if current_line:
        lines.append(' '.join(current_line))
    return lines

max_text_width = mm_to_px(126.0)
p1 = ("A Bíblia Sagrada Unoteísta constitui uma edição monumental que reúne a "
      "totalidade dos 69 Livros Sagrados das Escrituras — preservando o Antigo "
      "Testamento na fidedigna tradição histórica da Septuaginta (42 livros) e o "
      "Novo Testamento canônico (27 livros) —, liberta de dogmatismos, corporativismos "
      "clericais e interpolações tardias.")

p2 = ("No ápice da revelação escriturística, a obra integra de forma pioneira os quatro "
      "tratados teológicos e filosóficos que fundamentam a fé unoteísta: a Soteriologia da "
      "Certeza, a Communicatio Idiomatum, O Batismo Bíblico em Nome de Jesus e A Forma da "
      "Consciência Divina e Humana em Cristo.")

p3 = ("Uma obra indispensável para estudiosos, exegetas, teólogos e para todo ser humano "
      "que busca o Criador através da honestidade intelectual e da fé viva.")

text_y = bc_top_y + mm_to_px(39.0)
line_step = mm_to_px(6.5)

for p in [p1, p2, p3]:
    p_lines = wrap_text(p, font_body, max_text_width)
    for l in p_lines:
        draw.text((bc_center_x, text_y), l, fill=COLOR_TEXT_PALE, font=font_body, anchor="mm")
        text_y += line_step
    text_y += mm_to_px(3.5)

# Citação bíblica de destaque
quote_y = text_y + mm_to_px(5.0)
draw.text((bc_center_x, quote_y), "« Conhecereis a verdade, e a verdade vos libertará. »", fill=COLOR_GOLD_LIGHT, font=font_quote, anchor="mm")
draw.text((bc_center_x, quote_y + mm_to_px(7.5)), "— João 8:32", fill=COLOR_GOLD_MUTED, font=get_font('sans_bold', 19), anchor="mm")

# ---------------------------------------------------------------------------
# CÓDIGO DE BARRAS OFICIAL EAN-13 (ISBN 978-65-02-41194-0) NA CONTRACAPA
# ---------------------------------------------------------------------------
# Dimensões perfeitamente proporcionais para caber com elegância DENTRO da moldura
barcode_src_path = os.path.join(ROOT, "codigo_de_barras_isbn_9786502411940.png")
if os.path.exists(barcode_src_path):
    barcode_img = Image.open(barcode_src_path)
    # Largura de 42 mm x altura proporcional (~25 mm)
    bc_target_w = mm_to_px(42.0)
    bc_target_h = int(barcode_img.height * (bc_target_w / barcode_img.width))
    barcode_resized = barcode_img.resize((bc_target_w, bc_target_h), Image.Resampling.LANCZOS)
    
    # Posicionado a 24 mm da borda direita da contracapa e a 24 mm do fundo (folga segura de 8 mm da moldura interna)
    barcode_x = BACK_COVER_RIGHT_PX - mm_to_px(24.0) - bc_target_w
    barcode_y = COVER_BOTTOM_PX - mm_to_px(24.0) - bc_target_h
    
    # Caixa branca com zona de silêncio e moldura dourada sutil
    pad_box = mm_to_px(2.5)
    draw.rectangle([barcode_x - pad_box, barcode_y - pad_box,
                    barcode_x + bc_target_w + pad_box, barcode_y + bc_target_h + pad_box],
                   fill=(255, 255, 255), outline=COLOR_GOLD_MUTED, width=1)
    
    img.paste(barcode_resized, (barcode_x, barcode_y))

# Selo Oficial CBL no canto inferior esquerdo da contracapa (dentro da moldura)
font_cbl_badge = get_font('sans_bold', 18)
font_cbl_details = get_font('sans_reg', 15)
cbl_x = BACK_COVER_LEFT_PX + mm_to_px(24.0)
cbl_y = COVER_BOTTOM_PX - mm_to_px(48.0)

draw.text((cbl_x, cbl_y), "REGISTRO OFICIAL DO LIVRO", fill=COLOR_GOLD, font=font_cbl_badge)
draw.text((cbl_x, cbl_y + mm_to_px(6.0)), "Câmara Brasileira do Livro — Agência do ISBN", fill=COLOR_TEXT_PALE, font=font_cbl_details)
draw.text((cbl_x, cbl_y + mm_to_px(11.5)), "ISBN 978-65-02-41194-0 • 1ª Edição — 2026", fill=COLOR_TEXT_PALE, font=font_cbl_details)
draw.text((cbl_x, cbl_y + mm_to_px(17.0)), "1.730 páginas • Formato 15,5 × 23,0 cm", fill=COLOR_TEXT_MUTED, font=font_cbl_details)
draw.text((cbl_x, cbl_y + mm_to_px(22.5)), "Titular: Arthur Santos • Editora Caminho Da Verdade", fill=COLOR_TEXT_MUTED, font=font_cbl_details)

# ---------------------------------------------------------------------------
# SALVAMENTO DA IMAGEM E GERAÇÃO DO PDF DE ALTA RESOLUÇÃO (300 DPI)
# ---------------------------------------------------------------------------
out_png_path = os.path.join(ROOT, "capa_completa_biblia_unoteista_300dpi.png")
print("Salvando imagem PNG em alta resolução (300 DPI)...")
img.save(out_png_path, dpi=(300, 300), quality=95)
print(f"  OK: {out_png_path} ({os.path.getsize(out_png_path) / 1024 / 1024:.2f} MB)")

# Salva versão em PDF gráfico para impressão gráfica profissional
out_pdf_path = os.path.join(ROOT, "capa_completa_biblia_unoteista.pdf")
print("Gerando PDF oficial de impressão (Full Wrap)...")
img.save(out_pdf_path, "PDF", resolution=300.0, save_all=True)
print(f"  OK: {out_pdf_path} ({os.path.getsize(out_pdf_path) / 1024 / 1024:.2f} MB)")

print("\nCapa completa e aberta gerada com total sucesso!")

