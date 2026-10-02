"""Atualiza a Bíblia Sagrada (port-br) Unoteista (69 Livros - Sem Teofilo).docx com o ISBN oficial:
ISBN 978-65-02-41194-0
Titular: Arthur Santos
Registro: 01/10/2026 (CBL)
Garante 1730 páginas na CIP e em docProps/app.xml.
"""
import os
import re
import shutil
import zipfile
import docx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCX_PATH = os.path.join(ROOT, 'Bíblia Sagrada (port-br) Unoteista (69 Livros - Sem Teofilo).docx')

def update_docx():
    bak = DOCX_PATH + '.pre_isbn.bak'
    if not os.path.exists(bak):
        shutil.copy2(DOCX_PATH, bak)
        print(f'Backup criado em {bak}')

    doc = docx.Document(DOCX_PATH)

    # 1. Atualizar Ficha Catalográfica (CIP)
    cip_found = False
    for i, p in enumerate(doc.paragraphs[:50]):
        if '1730 p. ; 15,5 x 23,0 cm.' in p.text:
            cip_found = True
            # Parágrafo seguinte é vazio ou recebe o ISBN
            next_p = doc.paragraphs[i + 1]
            next_p.text = '        ISBN 978-65-02-41194-0'
            print('CIP: Linha do ISBN inserida em P' + str(i + 1))
            break
            
    # Atualizar titulares na CIP
    for i, p in enumerate(doc.paragraphs[:50]):
        if 'I. Caminho Da Verdade. II. Título.' in p.text or 'I. Caminho Da Verdade.' in p.text:
            p.text = '        I. Caminho Da Verdade. II. Santos, Arthur. III. Título.'
            print('CIP: Linha de autoria/titular atualizada em P' + str(i))
            break

    # 2. Atualizar Colofão no final
    colofao_idx = None
    for i in range(len(doc.paragraphs) - 30, len(doc.paragraphs)):
        if 'COLOF' in doc.paragraphs[i].text.upper():
            colofao_idx = i
            break

    if colofao_idx:
        print(f'Colofão localizado em P{colofao_idx}')
        # Procurar parágrafo antes de EDIÇÃO CAMINHO DA VERDADE
        for j in range(colofao_idx, len(doc.paragraphs)):
            p = doc.paragraphs[j]
            if 'EDIÇÃO CAMINHO DA VERDADE' in p.text.upper() or 'EDICAO CAMINHO DA VERDADE' in p.text.upper():
                # Inserir parágrafo antes
                new_p = p.insert_paragraph_before()
                new_p.text = 'ISBN: 978-65-02-41194-0 (CBL / Agência Brasileira do ISBN)\nTitular: Arthur Santos — Veiculação: Livro Físico'
                new_p.paragraph_format.alignment = docx.enum.text.WD_ALIGN_PARAGRAPH.CENTER
                for run in new_p.runs:
                    run.font.name = 'Bookman Old Style'
                    run.font.size = docx.shared.Pt(9)
                print(f'Colofão: ISBN e titular inseridos antes de P{j}')
                break

    doc.save(DOCX_PATH)
    print('DOCX salvo com sucesso.')

    # 3. Garantir <Pages>1730</Pages> em docProps/app.xml
    tmp_path = DOCX_PATH + '.tmp_zip'
    with zipfile.ZipFile(DOCX_PATH, 'r') as zin:
        with zipfile.ZipFile(tmp_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == 'docProps/app.xml':
                    xml_str = data.decode('utf-8', errors='ignore')
                    if '<Pages>' in xml_str:
                        xml_str = re.sub(r'<Pages>\d+</Pages>', '<Pages>1730</Pages>', xml_str)
                    else:
                        xml_str = xml_str.replace('</Properties>', '<Pages>1730</Pages></Properties>')
                    data = xml_str.encode('utf-8')
                zout.writestr(item, data)
    shutil.move(tmp_path, DOCX_PATH)
    print('Metadados docProps/app.xml fixados em 1730 páginas.')


if __name__ == '__main__':
    update_docx()
