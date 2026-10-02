// Testes das partes puras do painel admin (sem Cloudflare):  node tools/test_admin.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyBlocks, applyHeadValues, getHeadValues, htmlToText, normalizeHtml, sanitizeRich, scanBlocks, textToHtml } from '../src/blocks.js';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../src/auth.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0;
const fails = [];
function t(name, cond, extra = '') {
  if (cond) ok++;
  else { fails.push(name + (extra ? ` -> ${extra}` : '')); console.log('  FALHOU:', name, extra); }
}
const eq = (name, got, want) => t(name, got === want, `obtido ${JSON.stringify(got)}, esperado ${JSON.stringify(want)}`);

// ------------------------------------------------------------------ sanitização
console.log('Sanitização');
eq('mantém strong/em', sanitizeRich('a <strong>b</strong> <em>c</em>'), 'a <strong>b</strong> <em>c</em>');
eq('b/i viram strong/em', sanitizeRich('<b>x</b><i>y</i>'), '<strong>x</strong><em>y</em>');
eq('remove script (com conteúdo)', sanitizeRich('oi<script>alert(1)</script>fim'), 'oifim');
eq('remove style', sanitizeRich('a<style>*{}</style>b'), 'ab');
eq('remove onerror/img', sanitizeRich('<img src=x onerror=alert(1)>ok'), 'ok');
eq('remove atributos de strong', sanitizeRich('<strong onclick="x()" style="a:b">t</strong>'), '<strong>t</strong>');
eq('link seguro externo', sanitizeRich('<a href="https://ex.com/a?b=1&c=2">l</a>'), '<a href="https://ex.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">l</a>');
eq('link interno', sanitizeRich('<a href="/biblia">l</a>'), '<a href="/biblia">l</a>');
eq('bloqueia javascript:', sanitizeRich('<a href="javascript:alert(1)">l</a>'), 'l');
eq('bloqueia javascript: disfarçado', sanitizeRich('<a href="jav\tascript:alert(1)">l</a>'), 'l');
eq('bloqueia data:', sanitizeRich('<a href="data:text/html;base64,AAA">l</a>'), 'l');
eq('bloqueia //host', sanitizeRich('<a href="//evil.com">l</a>'), 'l');
eq('br normalizado', sanitizeRich('a<br/>b<BR>c'), 'a<br>b<br>c');
eq('fecha tags abertas', sanitizeRich('<strong>aberto'), '<strong>aberto</strong>');
eq('ignora fechamento órfão', sanitizeRich('x</strong>y'), 'xy');
eq('escapa < solto', sanitizeRich('a < b'), 'a &lt; b');
eq('preserva entidades', sanitizeRich('R&amp;D &lt;3'), 'R&amp;D &lt;3');
eq('escapa & solto', sanitizeRich('R&D'), 'R&amp;D');
eq('remove comentário', sanitizeRich('a<!-- x -->b'), 'ab');
eq('sup/sub', sanitizeRich('x<sup>2</sup>'), 'x<sup>2</sup>');
eq('idempotente', sanitizeRich(sanitizeRich('<b>a</b> <a href="https://x.com">y</a>')), sanitizeRich('<b>a</b> <a href="https://x.com">y</a>'));
t('nunca deixa < de tag proibida', !/<(script|iframe|img|svg|object)/i.test(sanitizeRich('<svg onload=alert(1)><iframe src=x></iframe><object data=x>')));
eq('texto puro', textToHtml('a & b <c>\nlinha 2'), 'a &amp; b &lt;c&gt;<br>linha 2');
eq('texto em uma linha', textToHtml('a\n  b', false), 'a b');
eq('htmlToText', htmlToText('a<br>b &amp; <strong>c</strong>'), 'a\nb & c');
eq('normaliza espaços', normalizeHtml('  a \n   b<br> \n <br>c '), 'a b<br><br>c');

// ------------------------------------------------------------------ blocos na página real
console.log('Blocos de teologia.html');
const page = readFileSync(join(ROOT, 'teologia.html'), 'utf-8').replace(/\r\n/g, '\n');
const blocks = scanBlocks(page);
eq('quantidade de blocos', blocks.length, 27);
const keys = blocks.map((b) => b.key);
eq('chaves únicas', new Set(keys).size, keys.length);
t('todos têm rótulo e grupo', blocks.every((b) => b.label && b.group));
const byKey = Object.fromEntries(blocks.map((b) => [b.key, b]));
eq('tipo text do H1', byKey['hero.title'].type, 'text');
eq('texto do H1', htmlToText(byKey['hero.title'].inner), 'Teologia Unoteísta');
t('lead é rich', byKey['intro.lead'].type === 'rich' && byKey['intro.lead'].inner.length > 100);
t('shema quote presente', /Ouve, Israel/.test(byKey['ontologico.shema.quote'].inner));
t('shema decl presente', /uma só Consciência/.test(byKey['ontologico.shema.decl'].inner));
t('economico quote presente', /No princípio era o Logos/.test(byKey['economico.quote.text'].inner));
t('cristologico p2 com strong', /<strong>/.test(byKey['cristologico.p2'].inner) && /encarnou no ser humano Jesus/.test(byKey['cristologico.p2'].inner));
t('sem sobreposição entre blocos', blocks.every((b, i) => i === 0 || blocks[i - 1].innerEnd <= b.innerStart || blocks[i - 1].innerStart >= b.innerEnd));

// Aplicar sem alterar nada deve reproduzir a página; aplicar uma edição só muda o bloco
const identity = applyBlocks(page, Object.fromEntries(blocks.map((b) => [b.key, b.inner])));
t('aplicar os originais = página idêntica', identity === page);
const edited = applyBlocks(page, { 'hero.title': 'Novo título', 'ontologico.p1': 'Texto <strong>novo</strong>' });
t('edição aparece', edited.includes('<h1 class="titulo" data-edit="hero.title" data-label="Título da página (H1)" data-group="Cabeçalho" data-type="text">Novo título</h1>'));
t('resto da página intacto', edited.replace('Novo título', 'Teologia Unoteísta').replace('Texto <strong>novo</strong>', byKey['ontologico.p1'].inner) === page);
t('reescaneia após editar', scanBlocks(edited).length === 27);
eq('chave inexistente é ignorada', applyBlocks(page, { 'nao.existe': 'x' }), page);

// Confissão de Fé (index.html)
console.log('Blocos de index.html (Confissão de Fé)');
const home = readFileSync(join(ROOT, 'index.html'), 'utf-8').replace(/\r\n/g, '\n');
const hb = scanBlocks(home);
eq('blocos da Confissão', hb.length, 26);
eq('chaves únicas (home)', new Set(hb.map((b) => b.key)).size, hb.length);
const hk = Object.fromEntries(hb.map((b) => [b.key, b]));
eq('título da seção', htmlToText(hk['confissao.title'].inner), 'Confissão de Fé Unoteísta');
eq('rótulo do artigo 12', htmlToText(hk['confissao.a12.num'].inner), 'Artigo 12 — Salvação e ressurreição');
t('artigo 9 é rich', hk['confissao.a9.text'].type === 'rich');
t('artigo 1 é o primeiro texto', /^Cremos em um só Deus e Pai de todos/.test(htmlToText(hk['confissao.a1.text'].inner)));
eq('12 textos e 12 rótulos', hb.filter((b) => /\.a\d+\.(text|num)$/.test(b.key)).length, 24);
t('aplicar os originais = home idêntica', applyBlocks(home, Object.fromEntries(hb.map((b) => [b.key, b.inner]))) === home);
const homeEdited = applyBlocks(home, { 'confissao.a3.text': 'Texto <strong>novo</strong> do artigo 3.' });
t('edição do artigo 3 aparece', homeEdited.includes('>Texto <strong>novo</strong> do artigo 3.</div>'));
t('demais artigos intactos', homeEdited.includes(hk['confissao.a4.text'].inner) && homeEdited.includes(hk['confissao.a2.text'].inner));

// Soteriologia (soteriologia.html)
console.log('Blocos de soteriologia.html');
const sote = readFileSync(join(ROOT, 'soteriologia.html'), 'utf-8').replace(/\r\n/g, '\n');
const sb = scanBlocks(sote);
eq('quantidade de blocos (soteriologia)', sb.length, 90);
eq('chaves únicas (soteriologia)', new Set(sb.map((b) => b.key)).size, sb.length);
t('todos os blocos da soteriologia têm rótulo e grupo', sb.every((b) => b.label && b.group));
const sk = Object.fromEntries(sb.map((b) => [b.key, b]));
eq('título H1 da soteriologia', htmlToText(sk['hero.title'].inner), 'Soteriologia Unoteísta');
t('citação Hb 9:16 presente', /morte do testador/.test(sk['sec3.quote'].inner));
t('citação Os 2:19 presente', /desposar-te-ei/.test(sk['sec5.quote'].inner));
t('resumo passo 14 presente', /benignidade e misericórdia/.test(sk['resumo.step14'].inner));
t('aplicar os originais = soteriologia idêntica', applyBlocks(sote, Object.fromEntries(sb.map((b) => [b.key, b.inner]))) === sote);

// Communicatio Idiomatum (communicatio-idiomatum.html)
console.log('Blocos de communicatio-idiomatum.html');
const comm = readFileSync(join(ROOT, 'communicatio-idiomatum.html'), 'utf-8').replace(/\r\n/g, '\n');
const cb = scanBlocks(comm);
eq('quantidade de blocos (communicatio)', cb.length, 66);
eq('chaves únicas (communicatio)', new Set(cb.map((b) => b.key)).size, cb.length);
t('todos os blocos da communicatio têm rótulo e grupo', cb.every((b) => b.label && b.group));
const ck = Object.fromEntries(cb.map((b) => [b.key, b]));
eq('título H1 da communicatio', htmlToText(ck['hero.title'].inner), 'Communicatio Idiomatum');
t('fórmula unoteísta presente', /Deus é a Consciência eterna/.test(ck['sec10.formula'].inner));
t('aplicar os originais = communicatio idêntica', applyBlocks(comm, Object.fromEntries(cb.map((b) => [b.key, b.inner]))) === comm);

// Batismo (batismo.html)
console.log('Blocos de batismo.html');
const bat = readFileSync(join(ROOT, 'batismo.html'), 'utf-8').replace(/\r\n/g, '\n');
const bb = scanBlocks(bat);
eq('quantidade de blocos (batismo)', bb.length, 58);
eq('chaves únicas (batismo)', new Set(bb.map((b) => b.key)).size, bb.length);
t('todos os blocos do batismo têm rótulo e grupo', bb.every((b) => b.label && b.group));
const bk = Object.fromEntries(bb.map((b) => [b.key, b]));
eq('título H1 do batismo', htmlToText(bk['hero.title'].inner), 'O Batismo Bíblico');
t('citação Efésios 4:5 presente', /Um só Senhor, uma só fé, um só batismo/.test(bk['sec1.quote'].inner));
t('citação Atos 2:38 presente', /em nome de Jesus Cristo/.test(bk['sec2.atos2'].inner));
t('fórmula resolutiva presente', /Um só batismo\. Um só nome: Jesus/.test(bk['sec7.resolucao'].inner));
t('aplicar os originais = batismo idêntico', applyBlocks(bat, Object.fromEntries(bb.map((b) => [b.key, b.inner]))) === bat);

// Forma da Consciência (forma-da-consciencia.html)
console.log('Blocos de forma-da-consciencia.html');
const fdc = readFileSync(join(ROOT, 'forma-da-consciencia.html'), 'utf-8').replace(/\r\n/g, '\n');
const fcb = scanBlocks(fdc);
eq('quantidade de blocos (forma-da-consciencia)', fcb.length, 63);
eq('chaves únicas (forma-da-consciencia)', new Set(fcb.map((b) => b.key)).size, fcb.length);
t('todos os blocos de forma-da-consciencia têm rótulo e grupo', fcb.every((b) => b.label && b.group));
const fck = Object.fromEntries(fcb.map((b) => [b.key, b]));
eq('título H1 de forma-da-consciencia', htmlToText(fck['hero.title'].inner), 'Forma da Consciência');
t('fluxo da decisão presente', /conhecer → compreender → julgar → querer → agir/.test(fck['sec4.flow'].inner));
t('singularidade de Cristo presente', /somente Cristo é a manifestação encarnada/.test(fck['sec7.resolucao'].inner));
t('aplicar os originais = forma-da-consciencia idêntica', applyBlocks(fdc, Object.fromEntries(fcb.map((b) => [b.key, b.inner]))) === fdc);

// Cabeçalho (título/descrição)
const head = getHeadValues(page);
t('título lido', /Teologia Unoteísta/.test(head['head.title']));
t('descrição lida', head['head.description'].length > 50);
const h2 = applyHeadValues(page, { 'head.title': 'T &amp; Novo', 'head.description': 'Desc &quot;nova&quot;' });
t('title trocado', h2.includes('<title>T &amp; Novo</title>'));
t('og:title trocado', /property="og:title" content="T &amp; Novo"/.test(h2));
t('twitter:description trocada', /name="twitter:description" content="Desc &quot;nova&quot;"/.test(h2));

// ------------------------------------------------------------------ senha e token
console.log('Autenticação');
const stored = await hashPassword('senha-de-teste');
t('formato do hash', /^pbkdf2-sha256\$100000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/.test(stored));
t('senha certa', await verifyPassword('senha-de-teste', stored));
t('senha errada', !(await verifyPassword('outra', stored)));
t('hash inválido', !(await verifyPassword('x', 'lixo')));
t('iterações absurdas recusadas', !(await verifyPassword('x', 'pbkdf2-sha256$99999999$AAAA$AAAA')));

// Hash gerado pelo Python (tools/setup_admin.py) precisa ser aceito pelo Worker
const py = execFileSync('python', ['-c', "import sys; sys.path.insert(0,'tools'); import setup_admin as s; print(s.hash_password('Ação-ç 123'))"], { cwd: ROOT, encoding: 'utf-8' }).trim();
t('hash do Python aceito (com acentos)', await verifyPassword('Ação-ç 123', py));
t('hash do Python rejeita errada', !(await verifyPassword('acao-c 123', py)));

const secret = 'segredo-de-teste';
const tok = await signToken(secret, { exp: Date.now() + 60000, v: 1 });
t('token válido', (await verifyToken(secret, tok))?.v === 1);
t('segredo errado', (await verifyToken('outro', tok)) === null);
t('token expirado', (await verifyToken(secret, await signToken(secret, { exp: Date.now() - 1, v: 1 }))) === null);
const [b, s] = tok.split('.');
t('payload adulterado', (await verifyToken(secret, Buffer.from('{"exp":9999999999999,"v":1}').toString('base64url') + '.' + s)) === null);
t('lixo', (await verifyToken(secret, 'abc')) === null && (await verifyToken(secret, '')) === null);

console.log(`\n${ok} verificações ok, ${fails.length} falha(s).`);
process.exit(fails.length ? 1 : 0);
