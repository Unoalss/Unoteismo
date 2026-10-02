"""Gera o Código de Barras Oficial do ISBN 978-65-02-41194-0
nos formatos SVG (vetorial) e PNG (300 DPI de alta resolução para impressão).
Padrão GS1 / EAN-13 com texto superior "ISBN 978-65-02-41194-0" e dígitos inferiores.
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG_PATH = os.path.join(ROOT, 'codigo_de_barras_isbn_9786502411940.svg')
PNG_PATH = os.path.join(ROOT, 'codigo_de_barras_isbn_9786502411940.png')

CODE13 = "9786502411940"
FORMATTED_ISBN = "ISBN 978-65-02-41194-0"

# Tabelas de codificação EAN-13
L_CODES = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
G_CODES = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
R_CODES = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001100', '1010000', '1000100', '1001000', '1110100']

PARITY_PATTERNS = {
    '0': 'LLLLLL', '1': 'LLGLGG', '2': 'LLGGLG', '3': 'LLGGGL', '4': 'LGLLGG',
    '5': 'LGGLLG', '6': 'LGGGLL', '7': 'LGLGLG', '8': 'LGLGGL', '9': 'LGGLGL'
}


def build_ean13_modules(code13):
    first = code13[0]
    pattern = PARITY_PATTERNS[first]
    left_digits = code13[1:7]
    right_digits = code13[7:13]

    # Lista de tuplas: (tipo, bit) onde tipo é 'G' (guard) ou 'D' (data)
    modules = []
    
    # Start guard: 101
    for b in '101':
        modules.append(('G', b == '1'))
        
    # Left 6 digits
    for digit, p in zip(left_digits, pattern):
        code_str = L_CODES[int(digit)] if p == 'L' else G_CODES[int(digit)]
        for b in code_str:
            modules.append(('D', b == '1'))
            
    # Center guard: 01010
    for b in '01010':
        modules.append(('G', b == '1'))
        
    # Right 6 digits
    for digit in right_digits:
        code_str = R_CODES[int(digit)]
        for b in code_str:
            modules.append(('D', b == '1'))
            
    # End guard: 101
    for b in '101':
        modules.append(('G', b == '1'))
        
    return modules


def generate_svg():
    modules = build_ean13_modules(CODE13)
    
    # Medidas oficiais aproximadas (em mm ou viewBox):
    # Quiet zone esquerda: 11 módulos
    # 95 módulos de código
    # Quiet zone direita: 7 módulos
    # Total de módulos de largura = 113
    scale = 3.5  # px por módulo
    quiet_left = 11 * scale
    bar_width = scale
    code_width = 95 * scale
    quiet_right = 7 * scale
    total_width = quiet_left + code_width + quiet_right
    
    total_height = 200
    top_text_y = 26
    bars_top = 38
    data_bar_height = 110
    guard_bar_height = 124  # guard bars descem mais
    digits_y = 168
    
    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_width:.1f}" height="{total_height:.1f}" viewBox="0 0 {total_width:.1f} {total_height:.1f}">',
        '  <rect width="100%" height="100%" fill="#ffffff"/>',
        f'  <text x="{total_width/2:.1f}" y="{top_text_y}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#000000">{FORMATTED_ISBN}</text>',
    ]
    
    curr_x = quiet_left
    for mod_type, is_black in modules:
        if is_black:
            h = guard_bar_height if mod_type == 'G' else data_bar_height
            svg_parts.append(f'  <rect x="{curr_x:.2f}" y="{bars_top}" width="{bar_width:.2f}" height="{h}" fill="#000000"/>')
        curr_x += bar_width
        
    # Dígito 9 inicial à esquerda
    svg_parts.append(f'  <text x="{quiet_left - 8:.1f}" y="{digits_y}" font-family="Courier, monospace, monospace" font-size="18" font-weight="bold" text-anchor="end" fill="#000000">{CODE13[0]}</text>')
    
    # 6 dígitos esquerdos centrados entre a primeira e a barra central
    left_center = quiet_left + (3 + 21) * bar_width
    svg_parts.append(f'  <text x="{left_center:.1f}" y="{digits_y}" font-family="Courier, monospace" font-size="18" font-weight="bold" letter-spacing="2.5" text-anchor="middle" fill="#000000">{CODE13[1:7]}</text>')
    
    # 6 dígitos direitos centrados entre a barra central e a final
    right_center = quiet_left + (3 + 42 + 5 + 21) * bar_width
    svg_parts.append(f'  <text x="{right_center:.1f}" y="{digits_y}" font-family="Courier, monospace" font-size="18" font-weight="bold" letter-spacing="2.5" text-anchor="middle" fill="#000000">{CODE13[7:13]}</text>')
    
    svg_parts.append('</svg>')
    
    with open(SVG_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(svg_parts))
    print(f'SVG gerado com sucesso em: {SVG_PATH}')


def generate_png():
    modules = build_ean13_modules(CODE13)
    
    # Renderização em alta definição (300 DPI):
    scale = 8  # px por módulo
    quiet_left = 11 * scale
    bar_width = scale
    code_width = 95 * scale
    quiet_right = 9 * scale
    total_width = int(quiet_left + code_width + quiet_right)
    total_height = int(500)
    
    img = Image.new('RGB', (total_width, total_height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Fontes
    font_path = r'C:\Windows\Fonts\arial.ttf'
    font_mono = r'C:\Windows\Fonts\consola.ttf'
    if not os.path.exists(font_path):
        font_path = 'arial.ttf'
    if not os.path.exists(font_mono):
        font_mono = 'consola.ttf'
        
    try:
        font_top = ImageFont.truetype(font_path, 34)
        font_digits = ImageFont.truetype(font_mono, 38)
    except Exception:
        font_top = ImageFont.load_default()
        font_digits = ImageFont.load_default()
        
    # Texto superior
    top_text = FORMATTED_ISBN
    bbox = draw.textbbox((0, 0), top_text, font=font_top)
    tw = bbox[2] - bbox[0]
    draw.text(((total_width - tw) // 2, 40), top_text, font=font_top, fill=(0, 0, 0))
    
    bars_top = 95
    data_h = 280
    guard_h = 315
    
    curr_x = quiet_left
    for mod_type, is_black in modules:
        if is_black:
            h = guard_h if mod_type == 'G' else data_h
            draw.rectangle([curr_x, bars_top, curr_x + bar_width - 1, bars_top + h], fill=(0, 0, 0))
        curr_x += bar_width
        
    # Dígito 9 antes das barras
    digits_y = bars_top + data_h + 10
    draw.text((quiet_left - 30, digits_y), CODE13[0], font=font_digits, fill=(0, 0, 0))
    
    # 6 dígitos esquerdos
    left_str = " ".join(list(CODE13[1:7]))
    bbox_l = draw.textbbox((0, 0), left_str, font=font_digits)
    lw = bbox_l[2] - bbox_l[0]
    left_center = quiet_left + int((3 + 21) * bar_width)
    draw.text((left_center - lw // 2, digits_y), left_str, font=font_digits, fill=(0, 0, 0))
    
    # 6 dígitos direitos
    right_str = " ".join(list(CODE13[7:13]))
    bbox_r = draw.textbbox((0, 0), right_str, font=font_digits)
    rw = bbox_r[2] - bbox_r[0]
    right_center = quiet_left + int((3 + 42 + 5 + 21) * bar_width)
    draw.text((right_center - rw // 2, digits_y), right_str, font=font_digits, fill=(0, 0, 0))
    
    # Salvar com 300 DPI nos metadados
    img.save(PNG_PATH, dpi=(300, 300))
    print(f'PNG 300 DPI gerado com sucesso em: {PNG_PATH}')


if __name__ == '__main__':
    generate_svg()
    generate_png()
