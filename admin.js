/* Painel /admin — edição dos textos das páginas (ver src/admin.js para a API). */
(function () {
  'use strict';

  var TOKEN_KEY = 'unoteismo_admin_token';
  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  // ------------------------------------------------------------------ estado
  var token = null;
  try { token = sessionStorage.getItem(TOKEN_KEY); } catch (e) {}
  var pages = [];
  var currentPage = null;   // { page, label, path, blocks }
  var fields = [];          // { block, card, editor, baseline, dirty }
  var saving = false;

  // ------------------------------------------------------------------ utilidades
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  var toastTimer = null;
  function toast(msg, isError) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('error', !!isError);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, isError ? 5000 : 2600);
  }

  function setToken(t) {
    token = t;
    try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch('/api/admin/' + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store'
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (res.status === 401 && path !== 'login' && path !== 'password') {
          showLogin('Sua sessão expirou. Entre novamente.');
          throw new Error('sessão expirada');
        }
        if (!res.ok) {
          var err = new Error((data && data.message) || ('Erro ' + res.status));
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  // ------------------------------------------------------------------ sanitização no navegador
  // Espelha src/blocks.js (o servidor sempre sanitiza de novo; isto só evita sujeira do editor).
  var SAFE_HREF = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i;

  function escText(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function cleanNode(node) {
    var out = '';
    node.childNodes.forEach(function (n) {
      if (n.nodeType === 3) { out += escText(n.nodeValue.replace(/ /g, ' ')); return; }
      if (n.nodeType !== 1) return;
      var tag = n.tagName.toLowerCase();
      if (tag === 'b') tag = 'strong';
      if (tag === 'i') tag = 'em';
      if (tag === 'br') { out += '<br>'; return; }
      if (tag === 'strong' || tag === 'em' || tag === 'sup' || tag === 'sub') {
        var inner = cleanNode(n);
        out += inner ? '<' + tag + '>' + inner + '</' + tag + '>' : '';
        return;
      }
      if (tag === 'a') {
        var href = (n.getAttribute('href') || '').replace(/[\u0000- \u007f-\u009f]/g, '');
        var innerA = cleanNode(n);
        if (SAFE_HREF.test(href)) out += '<a href="' + href.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '">' + innerA + '</a>';
        else out += innerA;
        return;
      }
      if (tag === 'script' || tag === 'style') return;
      // div/p/li etc.: conteúdo vira texto e o fim do bloco vira quebra de linha
      var text = cleanNode(n);
      var block = /^(div|p|li|h[1-6]|blockquote|section|article)$/.test(tag);
      if (block) {
        if (out && !/<br>$/.test(out)) out += '<br>';   // o bloco começa em nova linha
        out += text + (n.nextSibling ? '<br>' : '');
      } else {
        out += text;
      }
    });
    return out;
  }

  function normalize(html) {
    return html.replace(/\s+/g, ' ').replace(/\s*<br>\s*/g, '<br>').replace(/^(<br>)+|(<br>)+$/g, '').trim();
  }

  function cleanRich(html) {
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    return normalize(cleanNode(doc.body));
  }

  // ------------------------------------------------------------------ telas
  function showLogin(message) {
    setToken(null);
    fields = [];
    currentPage = null;
    $('#app-view').hidden = true;
    $('#login-view').hidden = false;
    $('#login-msg').textContent = message || '';
    $('#login-password').value = '';
    $('#login-password').focus();
    document.title = 'Painel — Unoteísmo';
  }

  function showApp() {
    $('#login-view').hidden = true;
    $('#app-view').hidden = false;
  }

  function showSection(name) {
    $('#editor-view').hidden = name !== 'editor';
    $('#security-view').hidden = name !== 'security';
    $('#page-tabs').hidden = name !== 'editor';
    updateSaveUi();
  }

  // ------------------------------------------------------------------ login
  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#login-submit');
    var msg = $('#login-msg');
    msg.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    api('login', { method: 'POST', body: { password: $('#login-password').value } })
      .then(function (data) {
        setToken(data.token);
        $('#login-password').value = '';
        return start();
      })
      .catch(function (err) { msg.textContent = err.message; })
      .then(function () { btn.disabled = false; btn.textContent = 'Entrar'; });
  });

  $('#login-toggle').addEventListener('click', function () {
    var input = $('#login-password');
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    this.textContent = show ? 'Ocultar' : 'Mostrar';
    this.setAttribute('aria-pressed', show ? 'true' : 'false');
    this.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  });

  $('#btn-logout').addEventListener('click', function () {
    if (dirtyCount() && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
    showLogin('Você saiu do painel.');
  });

  // ------------------------------------------------------------------ páginas
  function start() {
    return api('pages').then(function (data) {
      pages = data.pages;
      showApp();
      renderTabs();
      var wanted = (location.hash || '').replace('#', '');
      var first = pages.filter(function (p) { return p.page === wanted; })[0] || pages[0];
      return first ? openPage(first.page) : null;
    });
  }

  function renderTabs() {
    var box = $('#page-tabs');
    box.textContent = '';
    pages.forEach(function (p) {
      var b = el('button', { type: 'button', role: 'tab', 'data-page': p.page, 'aria-selected': currentPage && currentPage.page === p.page ? 'true' : 'false', text: p.label });
      b.addEventListener('click', function () {
        if (currentPage && currentPage.page === p.page) return;
        if (dirtyCount() && !confirm('Há alterações não salvas nesta página. Trocar de página mesmo assim?')) return;
        openPage(p.page);
      });
      box.appendChild(b);
    });
  }

  function openPage(id) {
    return api('pages/' + encodeURIComponent(id)).then(function (detail) {
      currentPage = detail;
      history.replaceState(null, '', '#' + id);
      renderTabs();
      renderPage();
      showSection('editor');
    }).catch(function (err) { toast(err.message, true); });
  }

  // ------------------------------------------------------------------ editor de blocos
  function valueOf(f) {
    return f.block.type === 'text' ? f.editor.value : cleanRich(f.editor.innerHTML);
  }

  function setValue(f, value) {
    if (f.block.type === 'text') { f.editor.value = value; autosize(f.editor); }
    else f.editor.innerHTML = value;
  }

  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 2 + 'px';
  }

  function dirtyCount() { return fields.filter(function (f) { return f.dirty; }).length; }

  function updateSaveUi() {
    var n = dirtyCount();
    var btn = $('#btn-save-all');
    btn.disabled = saving || n === 0;
    btn.textContent = saving ? 'Salvando…' : (n ? 'Salvar alterações (' + n + ')' : 'Salvar alterações');
    var bar = $('#savebar');
    bar.hidden = n === 0 || $('#editor-view').hidden;
    $('#savebar-text').textContent = n + (n === 1 ? ' alteração não salva' : ' alterações não salvas');
    $('#btn-save-bar').disabled = saving;
    updateGroupCounts();
  }

  function updateGroupCounts() {
    document.querySelectorAll('.group').forEach(function (g) {
      var cards = g.querySelectorAll('.block');
      var edited = g.querySelectorAll('.badge.edited').length;
      var dirty = g.querySelectorAll('.block.dirty').length;
      g.querySelector('.g-count').textContent = cards.length + ' blocos' + (edited ? ' · ' + edited + ' editados' : '') + (dirty ? ' · ' + dirty + ' a salvar' : '');
    });
  }

  function markState(f) {
    var dirty = valueOf(f) !== f.baseline;
    f.dirty = dirty;
    f.card.classList.toggle('dirty', dirty);
    f.card.querySelector('.dirty-flag').hidden = !dirty;
    if (dirty) { f.card.classList.remove('error'); var er = f.card.querySelector('.b-err'); if (er) er.textContent = ''; }
    updateSaveUi();
  }

  function setBadge(f, edited) {
    var b = f.card.querySelector('.badge');
    b.textContent = edited ? 'Editado' : 'Original';
    b.classList.toggle('edited', !!edited);
    f.block.edited = !!edited;
  }

  function toolbarButton(label, title, action) {
    var b = el('button', { type: 'button', title: title, 'aria-label': title, text: label });
    b.addEventListener('mousedown', function (e) { e.preventDefault(); }); // não perde a seleção do texto
    b.addEventListener('click', action);
    return b;
  }

  function buildToolbar(f) {
    var tb = el('div', { class: 'ed-toolbar', role: 'toolbar', 'aria-label': 'Formatação' });
    tb.appendChild(toolbarButton('N', 'Negrito (Ctrl+B)', function () { document.execCommand('bold'); f.editor.focus(); markState(f); }));
    tb.appendChild(toolbarButton('I', 'Itálico (Ctrl+I)', function () { document.execCommand('italic'); f.editor.focus(); markState(f); }));
    tb.appendChild(toolbarButton('Link', 'Inserir link no texto selecionado', function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || !f.editor.contains(sel.anchorNode)) { toast('Selecione o trecho que será o link.', true); return; }
      var url = prompt('Endereço do link (https://… ou /pagina):', 'https://');
      if (!url) return;
      url = url.trim();
      if (!SAFE_HREF.test(url)) { toast('Use um endereço que comece com https://, http://, mailto:, / ou #.', true); return; }
      document.execCommand('createLink', false, url);
      markState(f);
    }));
    tb.appendChild(toolbarButton('Sem link', 'Remover link', function () { document.execCommand('unlink'); markState(f); }));
    tb.appendChild(toolbarButton('Limpar', 'Limpar formatação', function () { document.execCommand('removeFormat'); document.execCommand('unlink'); markState(f); }));
    return tb;
  }

  function buildCard(block, index) {
    var labelId = 'lbl-' + index;
    var f = { block: block, dirty: false, baseline: '' };

    var badge = el('span', { class: 'badge' + (block.edited ? ' edited' : ''), text: block.edited ? 'Editado' : 'Original' });
    var flag = el('span', { class: 'dirty-flag', text: '● não salvo', hidden: '' });
    var head = el('div', { class: 'b-head' }, [el('label', { class: 'b-label', id: labelId, text: block.label }), badge, flag]);

    var editor;
    var wrap = el('div', { class: 'ed-wrap' });
    if (block.type === 'text') {
      editor = el('textarea', { class: 'ed-text', rows: '1', 'aria-labelledby': labelId, spellcheck: 'true', lang: 'pt-BR' });
      wrap.appendChild(editor);
    } else {
      editor = el('div', { class: 'ed-rich', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-labelledby': labelId, spellcheck: 'true', lang: 'pt-BR' });
      f.editor = editor;
      wrap.appendChild(buildToolbar(f));
      wrap.appendChild(editor);
    }
    f.editor = editor;

    var err = el('p', { class: 'b-err', role: 'alert' });
    var restore = el('button', { type: 'button', class: 'link-btn danger', text: 'Restaurar original' });
    var histBtn = el('button', { type: 'button', class: 'link-btn', text: 'Histórico' });
    var histBox = el('span', { class: 'hist' });
    var foot = el('div', { class: 'b-foot' }, [restore, histBtn, histBox, err]);

    var card = el('article', { class: 'block', 'data-key': block.key }, [head, wrap, foot]);
    f.card = card;

    setValue(f, block.current);
    f.baseline = valueOf(f);

    editor.addEventListener('input', function () { if (block.type === 'text') autosize(editor); markState(f); });
    if (block.type === 'rich') {
      // Enter = quebra de linha simples (o site usa <br>); colar sempre como texto puro
      editor.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); }
      });
      editor.addEventListener('paste', function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
      });
    }

    restore.addEventListener('click', function () {
      if (!confirm('Voltar este bloco ao texto original do site?')) return;
      var was = f.block.edited;
      var done = function () {
        setValue(f, f.block.original);
        f.baseline = valueOf(f);
        setBadge(f, false);
        markState(f);
        toast('Texto original restaurado.');
        refreshTabCounts();
      };
      if (was) api('pages/' + encodeURIComponent(currentPage.page) + '/blocks/' + encodeURIComponent(block.key), { method: 'DELETE' }).then(done).catch(function (e) { toast(e.message, true); });
      else done();
    });

    histBtn.addEventListener('click', function () {
      histBox.textContent = '';
      api('pages/' + encodeURIComponent(currentPage.page) + '/revisions?key=' + encodeURIComponent(block.key)).then(function (data) {
        if (!data.revisions.length) { toast('Este bloco ainda não tem versões salvas.'); return; }
        var sel = el('select', { 'aria-label': 'Versões salvas de ' + block.label });
        sel.appendChild(el('option', { value: '', text: 'Escolha uma versão…' }));
        data.revisions.forEach(function (r, i) {
          var plain = r.value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          sel.appendChild(el('option', { value: String(i), text: new Date(r.savedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + ' — ' + plain.slice(0, 50) }));
        });
        sel.addEventListener('change', function () {
          if (sel.value === '') return;
          setValue(f, data.revisions[parseInt(sel.value, 10)].value);
          markState(f);
          toast('Versão carregada. Clique em Salvar para aplicá-la.');
          histBox.textContent = '';
        });
        histBox.appendChild(sel);
        sel.focus();
      }).catch(function (e) { toast(e.message, true); });
    });

    f.el = card;
    return f;
  }

  function renderPage() {
    $('#page-title').textContent = currentPage.label;
    $('#view-site').href = currentPage.viewPath || currentPage.path;
    var edited = currentPage.blocks.filter(function (b) { return b.edited; }).length;
    $('#page-meta').textContent = currentPage.blocks.length + ' campos editáveis · ' + edited + ' já editados';
    document.title = 'Painel — ' + currentPage.label;

    var box = $('#groups');
    box.textContent = '';
    fields = [];
    var order = [];
    var byGroup = {};
    currentPage.blocks.forEach(function (b) {
      if (!byGroup[b.group]) { byGroup[b.group] = []; order.push(b.group); }
      byGroup[b.group].push(b);
    });
    var idx = 0;
    order.forEach(function (name, gi) {
      var body = el('div', { class: 'group-body' });
      byGroup[name].forEach(function (b) {
        var f = buildCard(b, idx++);
        fields.push(f);
        body.appendChild(f.card);
      });
      var g = el('details', { class: 'group' }, [
        el('summary', {}, [el('span', { class: 'g-title', text: name }), el('span', { class: 'g-count' })]),
        body
      ]);
      if (gi < 2) g.open = true;
      g.addEventListener('toggle', function () {
        if (g.open) g.querySelectorAll('textarea').forEach(autosize);
      });
      box.appendChild(g);
    });
    // cartões de texto só medem a altura depois de visíveis
    fields.forEach(function (f) { if (f.block.type === 'text') autosize(f.editor); });
    $('#filter').value = '';
    updateSaveUi();
  }

  function refreshTabCounts() {
    // mantém "N já editados" em dia sem recarregar
    var edited = fields.filter(function (f) { return f.block.edited; }).length;
    $('#page-meta').textContent = currentPage.blocks.length + ' campos editáveis · ' + edited + ' já editados';
    updateGroupCounts();
  }

  // ------------------------------------------------------------------ filtro
  $('#filter').addEventListener('input', function () {
    var q = this.value.trim().toLowerCase();
    fields.forEach(function (f) {
      var hay = (f.block.label + ' ' + (f.block.type === 'text' ? f.editor.value : f.editor.textContent)).toLowerCase();
      f.card.hidden = q !== '' && hay.indexOf(q) === -1;
    });
    document.querySelectorAll('.group').forEach(function (g) {
      var visible = g.querySelectorAll('.block:not([hidden])').length;
      g.hidden = visible === 0;
      if (q && visible) g.open = true;
    });
  });

  // ------------------------------------------------------------------ salvar
  function saveAll() {
    if (saving) return;
    var dirty = fields.filter(function (f) { return f.dirty; });
    if (!dirty.length) return;
    var changes = {};
    var sent = {};
    dirty.forEach(function (f) { var v = valueOf(f); changes[f.block.key] = v; sent[f.block.key] = v; });
    saving = true;
    updateSaveUi();
    api('pages/' + encodeURIComponent(currentPage.page) + '/save', { method: 'POST', body: { changes: changes } })
      .catch(function (err) {
        // 400 com lista de erros ainda traz detalhes por campo
        if (err.data && err.data.errors) return err.data;
        throw err;
      })
      .then(function (data) {
        var okCount = 0;
        fields.forEach(function (f) {
          var key = f.block.key;
          if (data.results && data.results[key]) {
            f.baseline = sent[key];
            setBadge(f, data.results[key].edited);
            f.dirty = false;
            f.card.classList.remove('dirty', 'error');
            f.card.querySelector('.dirty-flag').hidden = true;
            okCount++;
          }
        });
        (data.errors || []).forEach(function (er) {
          var f = fields.filter(function (x) { return x.block.key === er.key; })[0];
          if (f) { f.card.classList.add('error'); f.card.querySelector('.b-err').textContent = er.message; }
        });
        if (data.errors && data.errors.length) toast(okCount + ' salvo(s); ' + data.errors.length + ' com erro — veja os campos em vermelho.', true);
        else toast(okCount === 1 ? '1 bloco salvo. Já está no ar.' : okCount + ' blocos salvos. Já estão no ar.');
        refreshTabCounts();
      })
      .catch(function (err) { toast(err.message, true); })
      .then(function () { saving = false; updateSaveUi(); });
  }

  $('#btn-save-all').addEventListener('click', saveAll);
  $('#btn-save-bar').addEventListener('click', saveAll);
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S') && !$('#app-view').hidden && !$('#editor-view').hidden) {
      e.preventDefault();
      saveAll();
    }
  });
  window.addEventListener('beforeunload', function (e) {
    if (dirtyCount()) { e.preventDefault(); e.returnValue = ''; }
  });

  // ------------------------------------------------------------------ segurança
  $('#btn-security').addEventListener('click', function () { $('#pw-msg').textContent = ''; showSection('security'); $('#pw-current').focus(); });
  $('#btn-back').addEventListener('click', function () { showSection('editor'); });

  $('#password-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('#pw-msg');
    msg.className = 'msg';
    msg.textContent = '';
    var cur = $('#pw-current').value;
    var nw = $('#pw-new').value;
    if (nw !== $('#pw-repeat').value) { msg.textContent = 'A confirmação não é igual à nova senha.'; return; }
    api('password', { method: 'POST', body: { current: cur, next: nw } })
      .then(function (data) {
        setToken(data.token);
        $('#password-form').reset();
        msg.className = 'msg ok';
        msg.textContent = 'Senha trocada. As outras sessões foram encerradas.';
      })
      .catch(function (err) { msg.textContent = err.message; });
  });

  // ------------------------------------------------------------------ início
  if (token) {
    api('me').then(start).catch(function () { showLogin(''); });
  } else {
    $('#login-password').focus();
  }
})();
