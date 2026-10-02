"""Gera os ícones/PWA/OG a partir de logo_unoteismo.png (rode da raiz: python tools/make_images.py)."""
from PIL import Image, ImageDraw, ImageFont, ImageOps

SRC = 'logo_unoteismo.png'
BG = (245, 245, 245)
BLUE = (25, 118, 210)

raw = Image.open(SRC)
if 'A' in raw.getbands() and raw.getchannel('A').getextrema()[0] < 255:
    mask = raw.getchannel('A')                      # logo com fundo transparente
else:
    mask = ImageOps.invert(raw.convert('L'))        # símbolo preto sobre fundo branco
bbox = mask.point(lambda p: 255 if p > 40 else 0).getbbox()
mask = mask.crop(bbox)
mw, mh = mask.size


def mark(height, color=(0, 0, 0)):
    """Símbolo recortado, fundo transparente, na altura pedida."""
    w = max(1, round(mw * height / mh))
    m = mask.resize((w, height), Image.LANCZOS)
    img = Image.new('RGBA', (w, height), color + (0,))
    img.putalpha(m)
    return img


def on_square(size, mark_ratio, bg=(255, 255, 255)):
    img = Image.new('RGB', (size, size), bg)
    m = mark(round(size * mark_ratio))
    img.paste(m, ((size - m.width) // 2, (size - m.height) // 2), m)
    return img


# Topbar (exibida a 32px de altura -> 64px para telas 2x)
mark(64).save('logo-64.png', optimize=True)
mark(128).save('logo-128.png', optimize=True)   # login do painel (telas 2x)

# Ícones
on_square(512, 0.70).save('icon-512.png', optimize=True)
on_square(192, 0.70).save('icon-192.png', optimize=True)
on_square(512, 0.52).save('icon-512-maskable.png', optimize=True)   # zona segura de 80%
on_square(180, 0.70).save('apple-touch-icon.png', optimize=True)
on_square(48, 0.80).save('favicon-48.png', optimize=True)

# Imagem de compartilhamento 1200x630
og = Image.new('RGB', (1200, 630), BG)
d = ImageDraw.Draw(og)
d.rectangle([0, 0, 1200, 12], fill=BLUE)
m = mark(360)
og.paste(m, (150, (630 - m.height) // 2), m)


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


bold = font('C:/Windows/Fonts/arialbd.ttf', 92)
reg = font('C:/Windows/Fonts/arial.ttf', 38)
d.text((400, 190), 'UNOTEÍSMO', font=bold, fill=(32, 33, 36))
d.text((404, 305), 'Bíblia Sagrada Online (69 livros)', font=reg, fill=(85, 85, 85))
d.text((404, 356), 'Interlinear grego, léxico e áudio narrado', font=reg, fill=(85, 85, 85))
d.text((404, 440), 'Filosofia de vida e busca da verdade', font=reg, fill=BLUE)
og.save('og-image.png', optimize=True)

print('ok:', mark(64).size, 'logo-64.png')
