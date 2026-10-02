# Scripts antigos (legado)

Scripts de teste, inspeção e correções pontuais que já cumpriram seu papel. Foram tirados da raiz
para não se misturarem com o que roda de verdade. Nada aqui é usado pelo build atual.

Cuidado: `update_html_seo.py` reescreve o SEO dos HTML a partir do `books.json` e **sobrescreveria**
as mudanças feitas depois (URLs por capítulo, JSON-LD, etc.). Não rode.

Para verificar o site hoje, use `python tools/smoke_test.py`.
