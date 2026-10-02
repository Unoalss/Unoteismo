# Guia de desenvolvimento do site Unoteísmo

## Estrutura

| O quê | Onde |
| --- | --- |
| Páginas | `index.html`, `biblia.html`, `teologia.html`, `sobre.html`, `privacidade.html`, `comparativo.html`, `404.html`, `admin.html` (+ `admin.css`, `admin.js`) |
| Estilos / scripts | `versao.css` (base), `style.css` + `biblia.css` + `versao_biblia.css` (Bíblia), `teologia.css`; `site.js` (menu, "continuar lendo", service worker), `biblia.js` (leitor), `sw.js` |
| Servidor (Cloudflare Worker) | `src/index.js` (rotas e API), `src/bible-page.js` (HTML por capítulo), `src/tts.js` (áudio), `src/admin.js` + `src/blocks.js` + `src/auth.js` (painel) |
| Configuração | `wrangler.jsonc` (inclui `SITE_URL`), `_headers`, `_redirects` |
| Dados | `data/books.json` (com `slug`), `data/pt/`, `data/int/`, `data/dict*/` |
| Gerado (não editar) | `public/` (o que vai ao ar), `sitemap.xml`, `verses_fts.sql` |
| Ferramentas | `tools/` (`smoke_test.py`, `apply_layout.py`, `make_images.py`, `set_domain.py`, `setup_admin.py`, `test_admin*.{mjs,py}`), `tools/legacy/` (scripts antigos) |
| Protótipos / front antigo | `_standby/prototipos/` (nunca publicados) |

Edite sempre a **raiz**; `public/` é recriada a cada publicação.

## Rodar localmente

```bash
python dev_server.py            # simples: http://localhost:8085/ (usa data/pt e data/int direto)
wrangler dev                    # completo: Worker + banco D1 local, igual à produção (http://127.0.0.1:8787)
```

Para o `wrangler dev` ter conteúdo, popule o D1 **local** uma vez:

```bash
wrangler d1 execute unoteismo-db --local --file init_schema.sql
wrangler d1 execute unoteismo-db --local --file bible_chapters.sql   # python gen_chapters_sql.py gera
wrangler d1 execute unoteismo-db --local --file lexicon.sql          # python gen_lexicon_sql.py gera
```

O `wrangler dev` serve `public/`: rode `python make_public.py` depois de cada edição (aguarde ~3 s).

## Testar e publicar

```bash
python generate_sitemap.py      # 1 URL por capítulo (usa SITE_URL do wrangler.jsonc)
python make_public.py           # monta public/ e confere se todo href/src existe
python tools/smoke_test.py      # com o wrangler dev rodando: rotas, 404, SSR, JSON-LD, links, sitemap
python make_public.py --deploy  # monta e publica (wrangler deploy)
python tools/smoke_test.py https://SEU-SITE   # confere a produção
```

`make_public.py` usa uma **lista fechada** de arquivos: um arquivo novo que precisa ir ao ar deve ser
acrescentado à lista no topo do script. Se faltar um arquivo obrigatório, ele para antes de apagar `public/`.

## Rotas do Worker

* `/biblia` — leitor (a URL antiga `?book=gn&ch=1` redireciona 301 para a nova).
* `/biblia/<livro>/<capítulo>` — HTML já com o texto (título, canonical, Open Graph e JSON-LD por capítulo).
  Livro ou capítulo inexistente = 404 real. O `<livro>` é o `slug` de `data/books.json`
  (regra em `tools/slugs.py`; `build_bible_data.py` já grava o slug).
* `/api/chapter`, `/api/word`, `/api/search`, `/api/search_verses`, `/api/tts`.
* Todo o resto vem dos assets; rota inexistente devolve `404.html` com status 404.

Se mudar a saída de `renderChapterPage` (ou o `biblia.html`), o cache das páginas geradas se renova sozinho
pelo ETag do `biblia.html`; para mudanças só em `src/bible-page.js`, aumente `SSR_CODE_VERSION`.

## Tarefas comuns

* **Trocar cabeçalho/rodapé/menu em todas as páginas:** editar `tools/apply_layout.py` e rodar `python tools/apply_layout.py`.
* **Migrar de domínio:** `python tools/set_domain.py https://novo.dominio --dry-run`, depois sem `--dry-run`, e `make_public.py --deploy`.
* **Busca de versículos direto no servidor (FTS5):**
  `python gen_verses_fts_sql.py` e `wrangler d1 execute unoteismo-db --remote --file=verses_fts.sql`.
  Sem essa tabela o site continua funcionando (o navegador usa `data/bible_search_index.json`).
* **Limite do áudio (`/api/tts`):** binding `TTS_LIMITER` em `wrangler.jsonc` (60 req/min por IP). Ajuste `limit`.
* **Analytics:** não há. Para medir sem cookies, ative o *Web Analytics* no painel da Cloudflare e cole o
  `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"..."}'>` nas
  páginas (e acrescente `https://static.cloudflareinsights.com` a `script-src`/`connect-src` no CSP de `_headers` e `src/index.js`).

## Painel /admin (edição dos textos)

Página restrita em `/admin` (noindex, fora do sitemap e do robots) para editar textos sem mexer no código.
Hoje edita a **Teologia** (27 blocos estruturados nos Três Axiomas) e a **Confissão de Fé** da página inicial (título, subtítulo e os 12 artigos: rótulo e texto),
mais o título e a descrição para Google de cada uma. O texto original continua no `teologia.html` / `index.html`; as edições ficam no D1 (`page_blocks`) e são aplicadas pelo Worker ao servir `/teologia`.
Cada bloco guarda as 20 últimas versões e tem "Restaurar original".

**Ativar em produção (uma vez):**

```bash
python tools/setup_admin.py                                            # pede a senha e gera admin_setup.sql
wrangler d1 execute unoteismo-db --remote --file admin_setup.sql       # cria as tabelas e grava o hash da senha
del admin_setup.sql                                                    # contém o hash e o segredo do token
python make_public.py --deploy
```

Para testar localmente use `wrangler d1 execute unoteismo-db --local --file admin_setup.sql` e o `wrangler dev`
(o `dev_server.py` não roda o Worker, então o painel não funciona nele).
**Esqueceu a senha?** Rode `setup_admin.py` de novo e reimporte: ele redefine a senha e derruba as sessões.
A senha também pode ser trocada no painel, em "Segurança".

**Como funciona:** senha guardada só como hash PBKDF2-SHA-256 (100 mil iterações, com sal) na tabela `admin_config`;
o login devolve um token assinado (HMAC, 12 h) que o painel manda no cabeçalho `Authorization` (sem cookies).
Limite de 5 senhas erradas por IP a cada 15 min (e 30 no total). O texto salvo passa por uma lista de permissões
(só negrito, itálico, sobrescrito/subscrito, quebra de linha e links `https://`, `mailto:`, `/…` e `#…`) e é
sanitizado de novo ao publicar.

**Tornar outra página editável:** (1) marque os elementos com `data-edit="chave" data-label="Rótulo" data-group="Grupo"`
(`data-type="text"` para texto puro, como títulos; o padrão é texto com formatação); (2) acrescente a página em
`EDITABLE_PAGES` (`src/admin.js`); (3) inclua o caminho em `run_worker_first` no `wrangler.jsonc` (a rota em `src/index.js` já é automática
para todo caminho listado em `EDITABLE_PAGES`).

**Testes:** `node tools/test_admin.mjs` (sanitização, blocos, hash/token; não precisa de servidor) e
`python tools/test_admin_api.py http://127.0.0.1:8787 --password 'SENHA'` (contra o `wrangler dev`; salva e depois
restaura tudo; `--lockout` inclui o teste de bloqueio, só local).

## Dados a conferir

* `data/pt/am.json` não tem o capítulo 1 de Amós (o `books.json` lista 9 capítulos).
* Salmos aparece com 168 capítulos em `books.json` (a numeração usual tem 150/151).
