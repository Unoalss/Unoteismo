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
    if ($('#editor-view')) $('#editor-view').hidden = name !== 'editor';
    if ($('#postagem-view')) $('#postagem-view').hidden = name !== 'postagem';
    if ($('#programar-view')) $('#programar-view').hidden = name !== 'programar';
    if ($('#gerenciar-view')) $('#gerenciar-view').hidden = name !== 'gerenciar';
    if ($('#security-view')) $('#security-view').hidden = name !== 'security';
    if ($('#prayers-view')) $('#prayers-view').hidden = name !== 'prayers';
    if ($('#agent-view')) $('#agent-view').hidden = name !== 'agent';

    if ($('#btn-nav-canvas')) $('#btn-nav-canvas').classList.toggle('active', name === 'editor');
    if ($('#btn-nav-postagem')) $('#btn-nav-postagem').classList.toggle('active', name === 'postagem');
    if ($('#btn-nav-programar')) $('#btn-nav-programar').classList.toggle('active', name === 'programar');
    if ($('#btn-nav-gerenciar')) $('#btn-nav-gerenciar').classList.toggle('active', name === 'gerenciar');
    if ($('#btn-agent')) $('#btn-agent').classList.toggle('active', name === 'agent');
    if ($('#btn-prayers')) $('#btn-prayers').classList.toggle('active', name === 'prayers');
    if ($('#btn-security')) $('#btn-security').classList.toggle('active', name === 'security');

    if (name === 'programar') {
      startBrasiliaClock();
      loadQueuePosts();
    } else if (name === 'gerenciar') {
      loadManagePosts();
    }
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
    if (dirtyCount() && !confirm('Há alterações não salvas no Canvas. Sair mesmo assim?')) return;
    showLogin('Você saiu do painel.');
  });

  // ==================================================================
  // VISUAL CANVAS STUDIO (EDITOR WYSIWYG ESTILO ELEMENTOR / WEBFLOW)
  // ==================================================================
  var canvasInitialized = false;
  var canvasDirty = 0;
  var canvasMode = 'edit'; // 'edit' ou 'browse'
  var canvasZoom = 1.0;
  var currentSelectedEl = null;
  var canvasSaving = false;

  function dirtyCount() {
    return canvasDirty;
  }

  function start() {
    showApp();
    showSection('editor');
    initCanvasStudio();
    initPostagemTab();
    initProgramarTab();
    initGerenciarTab();
    initPostPreviewModal();
  }

  function initCanvasStudio() {
    if (canvasInitialized) return;
    canvasInitialized = true;

    var frame = $('#canvas-frame');
    var frameContainer = $('#canvas-frame-container');
    var pageSelect = $('#canvas-page-select');
    var btnModeEdit = $('#btn-canvas-mode-edit');
    var btnModeBrowse = $('#btn-canvas-mode-browse');
    var btnDevDesktop = $('#btn-device-desktop');
    var btnDevTablet = $('#btn-device-tablet');
    var btnDevMobile = $('#btn-device-mobile');
    var btnZoomIn = $('#btn-zoom-in');
    var btnZoomOut = $('#btn-zoom-out');
    var btnZoomReset = $('#btn-zoom-reset');
    var zoomLabel = $('#canvas-zoom-label');
    var btnBold = $('#btn-fmt-bold');
    var btnItalic = $('#btn-fmt-italic');
    var btnUnderline = $('#btn-fmt-underline');
    var dirtyPill = $('#canvas-dirty-counter');
    var btnReload = $('#btn-canvas-reload');
    var btnSave = $('#btn-canvas-save');
    var tagInfo = $('#inspector-tag-info');
    var charsInfo = $('#inspector-chars');
    var liveLink = $('#canvas-live-link');

    // Carregar lista de páginas do servidor
    fetch('/api/admin/canvas-pages')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.pages && data.pages.length && pageSelect) {
          var curVal = pageSelect.value;
          pageSelect.innerHTML = '';
          data.pages.forEach(function (p) {
            var opt = document.createElement('option');
            opt.value = p.url;
            opt.textContent = p.label + ' (' + p.id + ')';
            pageSelect.appendChild(opt);
          });
          pageSelect.value = curVal || '/';
        }
      })
      .catch(function () {});

    function updateDirtyUI() {
      if (dirtyPill) {
        dirtyPill.textContent = canvasDirty === 1 ? '1 alteração pendente' : canvasDirty + ' alterações';
        dirtyPill.classList.toggle('has-changes', canvasDirty > 0);
      }
      if (btnSave) {
        btnSave.disabled = (canvasDirty === 0 || canvasSaving);
      }
    }

    function updateZoomUI() {
      if (zoomLabel) zoomLabel.textContent = Math.round(canvasZoom * 100) + '%';
      if (frameContainer) {
        frameContainer.style.transform = 'scale(' + canvasZoom + ')';
        frameContainer.style.transformOrigin = 'top center';
      }
    }

    function setDevice(device) {
      [btnDevDesktop, btnDevTablet, btnDevMobile].forEach(function (b) { if (b) b.classList.remove('active'); });
      if (device === 'desktop') {
        if (btnDevDesktop) btnDevDesktop.classList.add('active');
        if (frameContainer) frameContainer.className = 'canvas-frame-container desktop';
      } else if (device === 'tablet') {
        if (btnDevTablet) btnDevTablet.classList.add('active');
        if (frameContainer) frameContainer.className = 'canvas-frame-container tablet';
      } else if (device === 'mobile') {
        if (btnDevMobile) btnDevMobile.classList.add('active');
        if (frameContainer) frameContainer.className = 'canvas-frame-container mobile';
      }
    }

    if (btnDevDesktop) btnDevDesktop.addEventListener('click', function () { setDevice('desktop'); });
    if (btnDevTablet) btnDevTablet.addEventListener('click', function () { setDevice('tablet'); });
    if (btnDevMobile) btnDevMobile.addEventListener('click', function () { setDevice('mobile'); });

    // Controles de zoom
    if (btnZoomIn) btnZoomIn.addEventListener('click', function () {
      canvasZoom = Math.min(1.5, Math.round((canvasZoom + 0.1) * 10) / 10);
      updateZoomUI();
    });
    if (btnZoomOut) btnZoomOut.addEventListener('click', function () {
      canvasZoom = Math.max(0.5, Math.round((canvasZoom - 0.1) * 10) / 10);
      updateZoomUI();
    });
    if (btnZoomReset) btnZoomReset.addEventListener('click', function () {
      canvasZoom = 1.0;
      updateZoomUI();
    });

    // Modos Editar vs Navegar
    function setMode(mode) {
      canvasMode = mode;
      if (btnModeEdit) btnModeEdit.classList.toggle('active', mode === 'edit');
      if (btnModeBrowse) btnModeBrowse.classList.toggle('active', mode === 'browse');

      var doc = getIframeDoc();
      if (!doc) return;

      if (mode === 'browse') {
        doc.querySelectorAll('[data-canvas-hover]').forEach(function (el) { el.removeAttribute('data-canvas-hover'); });
        doc.querySelectorAll('[data-canvas-selected]').forEach(function (el) {
          el.removeAttribute('data-canvas-selected');
          el.removeAttribute('contenteditable');
        });
        currentSelectedEl = null;
        if (tagInfo) tagInfo.textContent = '👁️ Modo Navegar ativo — links e botões funcionam normalmente';
        if (charsInfo) charsInfo.textContent = '';
        toast('Modo Navegação: links e botões funcionam como no navegador.');
      } else {
        if (tagInfo) tagInfo.textContent = '🎯 Clique em qualquer elemento na tela para editar';
        toast('Modo Edição: clique em qualquer texto ou elemento para editar.');
      }
    }

    if (btnModeEdit) btnModeEdit.addEventListener('click', function () { setMode('edit'); });
    if (btnModeBrowse) btnModeBrowse.addEventListener('click', function () { setMode('browse'); });

    // Trocar de página
    if (pageSelect) {
      pageSelect.addEventListener('change', function () {
        if (canvasDirty > 0 && !confirm('Há alterações não salvas nesta página. Deseja trocar mesmo assim e descartá-las?')) {
          pageSelect.value = frame.getAttribute('data-loaded-src') || '/';
          return;
        }
        canvasDirty = 0;
        updateDirtyUI();
        currentSelectedEl = null;
        var targetUrl = pageSelect.value;
        frame.setAttribute('data-loaded-src', targetUrl);
        frame.src = targetUrl;
        if (liveLink) liveLink.href = targetUrl;
      });
    }

    function getIframeDoc() {
      try {
        return frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
      } catch (e) {
        return null;
      }
    }

    // Injeção de estilo e escutas no iframe
    var HELPER_STYLE_ID = 'unoteismo-canvas-helpers';
    function injectIframeHelpers() {
      var doc = getIframeDoc();
      if (!doc || !doc.head) return;

      // Injetar estilos do canvas
      var existingStyle = doc.getElementById(HELPER_STYLE_ID);
      if (!existingStyle) {
        var style = doc.createElement('style');
        style.id = HELPER_STYLE_ID;
        style.textContent = [
          '[data-canvas-hover] { outline: 2px dashed #000000 !important; outline-offset: 3px !important; cursor: text !important; }',
          '[data-canvas-selected] { outline: 2px solid #000000 !important; outline-offset: 3px !important; background-color: rgba(0,0,0,0.04) !important; cursor: text !important; }',
          '[data-canvas-edited] { box-shadow: 0 0 0 1px #000000 !important; }'
        ].join('\n');
        doc.head.appendChild(style);
      }

      // Eventos no corpo do iframe
      doc.body.removeEventListener('mouseover', handleMouseOver);
      doc.body.removeEventListener('mouseout', handleMouseOut);
      doc.body.removeEventListener('click', handleClick, true);
      doc.body.removeEventListener('input', handleInput);
      doc.body.removeEventListener('keydown', handleKeyDown);

      doc.body.addEventListener('mouseover', handleMouseOver);
      doc.body.addEventListener('mouseout', handleMouseOut);
      doc.body.addEventListener('click', handleClick, true);
      doc.body.addEventListener('input', handleInput);
      doc.body.addEventListener('keydown', handleKeyDown);
    }

    function isSafeToEdit(el) {
      if (!el || el === el.ownerDocument.body || el === el.ownerDocument.documentElement) return false;
      var tag = el.tagName.toLowerCase();
      if (['script', 'style', 'iframe', 'meta', 'link', 'noscript'].indexOf(tag) !== -1) return false;
      return true;
    }

    function handleMouseOver(e) {
      if (canvasMode !== 'edit') return;
      var target = e.target;
      if (!isSafeToEdit(target)) return;
      target.setAttribute('data-canvas-hover', 'true');
      if (!currentSelectedEl && tagInfo) {
        var tag = target.tagName.toLowerCase();
        var cls = target.className && typeof target.className === 'string' ? '.' + target.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
        tagInfo.textContent = 'Hover: <' + tag + cls + '>';
      }
    }

    function handleMouseOut(e) {
      if (e.target && e.target.removeAttribute) {
        e.target.removeAttribute('data-canvas-hover');
      }
    }

    function handleClick(e) {
      if (canvasMode !== 'edit') return;
      var target = e.target;
      if (!isSafeToEdit(target)) return;

      // Impede links de navegarem e botões de dispararem
      e.preventDefault();
      e.stopPropagation();

      var doc = getIframeDoc();
      if (doc) {
        doc.querySelectorAll('[data-canvas-selected]').forEach(function (node) {
          if (node !== target) {
            node.removeAttribute('data-canvas-selected');
            node.removeAttribute('contenteditable');
          }
        });
      }

      target.setAttribute('data-canvas-selected', 'true');
      target.setAttribute('contenteditable', 'true');
      target.focus();
      currentSelectedEl = target;

      var tag = target.tagName.toLowerCase();
      var cls = target.className && typeof target.className === 'string' ? '.' + target.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      var txt = target.innerText || target.textContent || '';

      if (tagInfo) tagInfo.textContent = '✏️ Editando: <' + tag + cls + '>';
      if (charsInfo) charsInfo.textContent = txt.length + ' caracteres';
    }

    function handleInput(e) {
      var target = e.target;
      if (!target) return;
      target.setAttribute('data-canvas-edited', 'true');

      var doc = getIframeDoc();
      if (doc) {
        var editedList = doc.querySelectorAll('[data-canvas-edited]');
        canvasDirty = editedList.length;
        updateDirtyUI();
      }

      var txt = target.innerText || target.textContent || '';
      if (charsInfo) charsInfo.textContent = txt.length + ' caracteres';
    }

    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCanvas();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        var doc = getIframeDoc();
        if (doc) {
          e.preventDefault();
          doc.execCommand('bold', false, null);
          if (currentSelectedEl) {
            currentSelectedEl.setAttribute('data-canvas-edited', 'true');
            handleInput({ target: currentSelectedEl });
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        var doc = getIframeDoc();
        if (doc) {
          e.preventDefault();
          doc.execCommand('italic', false, null);
          if (currentSelectedEl) {
            currentSelectedEl.setAttribute('data-canvas-edited', 'true');
            handleInput({ target: currentSelectedEl });
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        var doc = getIframeDoc();
        if (doc) {
          e.preventDefault();
          doc.execCommand('underline', false, null);
          if (currentSelectedEl) {
            currentSelectedEl.setAttribute('data-canvas-edited', 'true');
            handleInput({ target: currentSelectedEl });
          }
        }
      }
    }

    // Formatação Rápida
    function execFormat(cmd) {
      var doc = getIframeDoc();
      if (!doc) return;
      if (currentSelectedEl) currentSelectedEl.focus();
      doc.execCommand(cmd, false, null);
      if (currentSelectedEl) {
        currentSelectedEl.setAttribute('data-canvas-edited', 'true');
        handleInput({ target: currentSelectedEl });
      }
    }

    if (btnBold) btnBold.addEventListener('click', function () { execFormat('bold'); });
    if (btnItalic) btnItalic.addEventListener('click', function () { execFormat('italic'); });
    if (btnUnderline) btnUnderline.addEventListener('click', function () { execFormat('underline'); });

    // Descartar / Recarregar
    if (btnReload) {
      btnReload.addEventListener('click', function () {
        if (canvasDirty > 0 && !confirm('Descartar todas as ' + canvasDirty + ' alterações não salvas e recarregar a página?')) return;
        canvasDirty = 0;
        updateDirtyUI();
        currentSelectedEl = null;
        try {
          frame.contentWindow.location.reload();
          toast('Página recarregada.');
        } catch (e) {
          frame.src = frame.src;
        }
      });
    }

    // Salvar Página no Servidor
    function saveCanvas() {
      if (canvasSaving) return;
      var doc = getIframeDoc();
      if (!doc || !doc.documentElement) {
        toast('Erro: não foi possível acessar o documento do iframe para salvar.', true);
        return;
      }

      // Remover temporariamente tags e atributos visuais do canvas antes de serializar
      var helperStyle = doc.getElementById(HELPER_STYLE_ID);
      if (helperStyle) helperStyle.remove();

      var hoverNodes = Array.prototype.slice.call(doc.querySelectorAll('[data-canvas-hover]'));
      hoverNodes.forEach(function (n) { n.removeAttribute('data-canvas-hover'); });

      var selNodes = Array.prototype.slice.call(doc.querySelectorAll('[data-canvas-selected]'));
      selNodes.forEach(function (n) { n.removeAttribute('data-canvas-selected'); n.removeAttribute('contenteditable'); });

      var editNodes = Array.prototype.slice.call(doc.querySelectorAll('[data-canvas-edited]'));
      editNodes.forEach(function (n) { n.removeAttribute('data-canvas-edited'); });

      // Serializar HTML completo com DOCTYPE
      var fullHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;

      // Re-injetar helpers para continuar editando sem quebrar a sessão
      injectIframeHelpers();
      if (currentSelectedEl) {
        currentSelectedEl.setAttribute('data-canvas-selected', 'true');
        currentSelectedEl.setAttribute('contenteditable', 'true');
      }

      var pageKey = (pageSelect && pageSelect.value) || '/';
      canvasSaving = true;
      if (btnSave) {
        btnSave.disabled = true;
        var btnText = btnSave.querySelector('.btn-save-text');
        if (btnText) btnText.textContent = 'Salvando…';
      }

      fetch('/api/admin/save-canvas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? 'Bearer ' + token : ''
        },
        body: JSON.stringify({ page: pageKey, html: fullHtml })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          canvasSaving = false;
          if (btnSave) {
            var btnText = btnSave.querySelector('.btn-save-text');
            if (btnText) btnText.textContent = '💾 Salvar Página';
          }
          if (data && data.success) {
            canvasDirty = 0;
            updateDirtyUI();
            toast('✔ ' + (data.message || 'Página salva com sucesso!') + (data.backup ? ' (Backup: ' + data.backup + ')' : ''));
          } else {
            toast('Erro ao salvar: ' + ((data && data.message) || 'Erro desconhecido'), true);
            if (btnSave) btnSave.disabled = false;
          }
        })
        .catch(function (err) {
          canvasSaving = false;
          if (btnSave) {
            btnSave.disabled = false;
            var btnText = btnSave.querySelector('.btn-save-text');
            if (btnText) btnText.textContent = '💾 Salvar Página';
          }
          toast('Erro de rede ao salvar: ' + err.message, true);
        });
    }

    if (btnSave) btnSave.addEventListener('click', saveCanvas);

    // Atalho global Ctrl+S na janela principal
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !$('#app-view').hidden && !$('#editor-view').hidden) {
        e.preventDefault();
        saveCanvas();
      }
    });

    window.addEventListener('beforeunload', function (e) {
      if (canvasDirty > 0) { e.preventDefault(); e.returnValue = ''; }
    });

    // Quando o iframe carregar, injetar helpers e listeners
    frame.addEventListener('load', function () {
      injectIframeHelpers();
      if (tagInfo) tagInfo.textContent = '🎯 Clique em qualquer elemento na tela para editar';
    });

    // Se já estiver carregado
    if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
      injectIframeHelpers();
    }
  }

  // Navegação no Topo do Painel
  var navCanvasBtn = $('#btn-nav-canvas');
  if (navCanvasBtn) navCanvasBtn.addEventListener('click', function () { showSection('editor'); });

  var navPostagemBtn = $('#btn-nav-postagem');
  if (navPostagemBtn) navPostagemBtn.addEventListener('click', function () { showSection('postagem'); });

  var navProgramarBtn = $('#btn-nav-programar');
  if (navProgramarBtn) navProgramarBtn.addEventListener('click', function () { showSection('programar'); });

  var navGerenciarBtn = $('#btn-nav-gerenciar');
  if (navGerenciarBtn) navGerenciarBtn.addEventListener('click', function () { showSection('gerenciar'); });

  // ==================================================================
  // DEFINIÇÕES E AUXILIARES DE CONTEÚDO
  // ==================================================================
  var CAT_INFO = {
    'versiculo_do_dia': { label: 'Versículo do Dia', icon: '📜', slug: 'versiculo-do-dia' },
    'palavra_do_dia': { label: 'Palavra do Dia', icon: '📖', slug: 'palavra-do-dia' },
    'salmos_do_dia': { label: 'Salmos do Dia', icon: '🕊️', slug: 'salmos-do-dia' },
    'devocional_do_dia': { label: 'Devocional do Dia', icon: '✨', slug: 'devocional-do-dia' },
    'historias_da_biblia': { label: 'Histórias da Bíblia', icon: '🏛️', slug: 'historias-da-biblia' },
    'curiosidades_biblicas': { label: 'Curiosidades Bíblicas', icon: '🔍', slug: 'curiosidades-biblicas' },
    'ensinamentos_de_jesus': { label: 'Ensinamentos de Jesus', icon: '👑', slug: 'ensinamentos-de-jesus' },
    'ensino_biblico': { label: 'Ensino Bíblico', icon: '📚', slug: 'ensino-biblico' }
  };

  var currentPreviewPost = null;
  var queuePostsList = [];
  var managePostsList = [];
  var selectedManageCategory = 'all';
  var currentManageSearch = '';

  function escapeHtmlAdmin(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==================================================================
  // 📝 1. POSTAGEM (CRIAR E EDITAR CONTEÚDO)
  // ==================================================================
  var isPostHtmlMode = false;

  function initPostagemTab() {
    var form = $('#form-postagem');
    if (!form) return;

    var destSelect = $('#post-destination');
    var schedRow = $('#post-schedule-datetime-row');
    if (destSelect && schedRow) {
      destSelect.addEventListener('change', function () {
        schedRow.style.display = destSelect.value === 'scheduled' ? 'grid' : 'none';
      });
    }

    // Upload de Imagem e Pré-visualização
    var fileInput = $('#post-image-file');
    var urlInput = $('#post-image-url');
    var prevWrap = $('#post-image-preview-wrap');
    var prevImg = $('#post-image-preview');
    var btnRemoveImg = $('#btn-remove-post-image');

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          var b64 = e.target.result;
          prevImg.src = b64;
          prevWrap.style.display = 'block';

          // Enviar imagem para o servidor
          fetch('/api/admin/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'upload_image', image_data: b64, filename: file.name })
          })
            .then(function (r) { return r.json(); })
            .then(function (res) {
              if (res.success && res.url) {
                urlInput.value = res.url;
                toast('Imagem carregada e salva com sucesso!');
              } else {
                urlInput.value = b64;
              }
            })
            .catch(function () {
              urlInput.value = b64;
            });
        };
        reader.readAsDataURL(file);
      });
    }

    if (btnRemoveImg) {
      btnRemoveImg.addEventListener('click', function () {
        if (fileInput) fileInput.value = '';
        if (urlInput) urlInput.value = '';
        if (prevImg) prevImg.src = '';
        if (prevWrap) prevWrap.style.display = 'none';
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', function () {
        var v = urlInput.value.trim();
        if (v && prevWrap && prevImg) {
          prevImg.src = v;
          prevWrap.style.display = 'block';
        } else if (prevWrap) {
          prevWrap.style.display = 'none';
        }
      });
    }

    // Ferramentas do Editor Rico
    var editable = $('#post-content-editable');
    var htmlArea = $('#post-content-html');
    var btnToggleHtml = $('#btn-toggle-html-mode');

    document.querySelectorAll('#post-editor-toolbar .editor-btn[data-cmd]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cmd = btn.getAttribute('data-cmd');
        var val = btn.getAttribute('data-val') || null;
        if (editable) {
          editable.focus();
          document.execCommand(cmd, false, val);
        }
      });
    });

    var btnLink = $('#btn-editor-link');
    if (btnLink && editable) {
      btnLink.addEventListener('click', function () {
        var u = prompt('Endereço do link (https://...):', 'https://');
        if (u && u.trim()) {
          editable.focus();
          document.execCommand('createLink', false, u.trim());
        }
      });
    }

    if (btnToggleHtml && editable && htmlArea) {
      btnToggleHtml.addEventListener('click', function () {
        isPostHtmlMode = !isPostHtmlMode;
        if (isPostHtmlMode) {
          htmlArea.value = editable.innerHTML;
          editable.style.display = 'none';
          htmlArea.style.display = 'block';
          btnToggleHtml.textContent = 'Modo Visual';
        } else {
          editable.innerHTML = htmlArea.value;
          htmlArea.style.display = 'none';
          editable.style.display = 'block';
          btnToggleHtml.textContent = 'Alternar Código HTML';
        }
      });
    }

    function collectPostFormData(overrideStatus) {
      var content = isPostHtmlMode ? htmlArea.value : editable.innerHTML;
      var cat = $('#post-category').value;
      var catMeta = CAT_INFO[cat] || { label: 'Postagem', icon: '📜', slug: 'post' };
      var dest = $('#post-destination').value;
      var status = overrideStatus || dest;

      var p = {
        id: ($('#post-id').value || '').trim() || undefined,
        category: cat,
        category_label: catMeta.label,
        category_icon: catMeta.icon,
        title: ($('#post-title').value || '').trim(),
        subtitle: ($('#post-subtitle').value || '').trim(),
        verse_text: ($('#post-verse-text').value || '').trim(),
        verse_ref: ($('#post-verse-ref').value || '').trim(),
        image_url: ($('#post-image-url').value || '').trim(),
        youtube_link: ($('#post-youtube-link').value || '').trim(),
        summary: ($('#post-summary').value || '').trim(),
        content_html: content,
        closing_prayer: ($('#post-closing-prayer').value || '').trim(),
        status: status
      };

      if (status === 'scheduled') {
        var sDate = $('#post-schedule-date').value;
        var sTime = $('#post-schedule-time').value || '17:00';
        p.scheduled_for = sDate ? sDate + ' ' + sTime : '';
      }
      return p;
    }

    // Salvar na Fila (Submit do Form)
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var post = collectPostFormData();
      if (!post.title) { toast('Digite o título da postagem.', true); return; }

      savePostToServer(post, function () {
        resetPostagemForm();
        if (post.status === 'published') {
          showSection('gerenciar');
        } else {
          showSection('programar');
        }
      });
    });

    // Publicar Diretamente Agora
    var btnPubNow = $('#btn-post-publish-now');
    if (btnPubNow) {
      btnPubNow.addEventListener('click', function () {
        var post = collectPostFormData('published');
        if (!post.title) { toast('Digite o título da postagem.', true); return; }
        post.published_at = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR').slice(0, 5);

        savePostToServer(post, function () {
          resetPostagemForm();
          showSection('gerenciar');
        });
      });
    }

    // Pré-visualizar no Modal
    var btnPrev = $('#btn-post-preview');
    if (btnPrev) {
      btnPrev.addEventListener('click', function () {
        var post = collectPostFormData();
        openPostPreview(post);
      });
    }

    // Limpar / Nova Postagem
    var btnClear = $('#btn-post-clear');
    if (btnClear) {
      btnClear.addEventListener('click', function () {
        if (confirm('Deseja limpar todos os campos do formulário?')) {
          resetPostagemForm();
        }
      });
    }

    var btnNew = $('#btn-postagem-new');
    if (btnNew) {
      btnNew.addEventListener('click', function () {
        resetPostagemForm();
      });
    }

    var btnToProg = $('#btn-postagem-to-programar');
    if (btnToProg) btnToProg.addEventListener('click', function () { showSection('programar'); });

    var btnToGen = $('#btn-postagem-to-gerenciar');
    if (btnToGen) btnToGen.addEventListener('click', function () { showSection('gerenciar'); });
  }

  function resetPostagemForm() {
    $('#post-id').value = '';
    $('#post-title').value = '';
    $('#post-subtitle').value = '';
    $('#post-verse-text').value = '';
    $('#post-verse-ref').value = '';
    $('#post-image-url').value = '';
    $('#post-youtube-link').value = '';
    $('#post-summary').value = '';
    $('#post-closing-prayer').value = '';

    var prevWrap = $('#post-image-preview-wrap');
    if (prevWrap) prevWrap.style.display = 'none';

    var editable = $('#post-content-editable');
    if (editable) editable.innerHTML = '';
    var htmlArea = $('#post-content-html');
    if (htmlArea) htmlArea.value = '';

    $('#post-destination').value = 'draft';
    var schedRow = $('#post-schedule-datetime-row');
    if (schedRow) schedRow.style.display = 'none';

    $('#postagem-view-title').textContent = 'Nova Postagem';
  }

  function loadPostIntoForm(post) {
    if (!post) return;
    $('#post-id').value = post.id || '';
    $('#post-category').value = post.category || 'versiculo_do_dia';
    $('#post-title').value = post.title || '';
    $('#post-subtitle').value = post.subtitle || '';
    $('#post-verse-text').value = post.verse_text || '';
    $('#post-verse-ref').value = post.verse_ref || '';
    $('#post-image-url').value = post.image_url || '';

    var prevWrap = $('#post-image-preview-wrap');
    var prevImg = $('#post-image-preview');
    if (post.image_url && prevWrap && prevImg) {
      prevImg.src = post.image_url;
      prevWrap.style.display = 'block';
    } else if (prevWrap) {
      prevWrap.style.display = 'none';
    }

    $('#post-youtube-link').value = post.youtube_link || '';
    $('#post-summary').value = post.summary || '';
    $('#post-closing-prayer').value = post.closing_prayer || '';

    // Conteúdo formatado
    var content = post.content_html || '';
    if (!content && post.sections && post.sections.length) {
      content = post.sections.map(function (s) {
        return '<h2>' + escapeHtmlAdmin(s.heading) + '</h2><p>' + escapeHtmlAdmin(s.body) + '</p>';
      }).join('\n');
    }
    var editable = $('#post-content-editable');
    if (editable) editable.innerHTML = content;
    var htmlArea = $('#post-content-html');
    if (htmlArea) htmlArea.value = content;

    // Destino e agendamento
    var destSelect = $('#post-destination');
    var schedRow = $('#post-schedule-datetime-row');
    if (post.status === 'scheduled') {
      if (destSelect) destSelect.value = 'scheduled';
      if (schedRow) {
        schedRow.style.display = 'grid';
        if (post.scheduled_for) {
          var parts = post.scheduled_for.split(' ');
          if (parts[0]) $('#post-schedule-date').value = parts[0];
          if (parts[1]) $('#post-schedule-time').value = parts[1];
        }
      }
    } else if (post.status === 'published') {
      if (destSelect) destSelect.value = 'published';
      if (schedRow) schedRow.style.display = 'none';
    } else {
      if (destSelect) destSelect.value = 'draft';
      if (schedRow) schedRow.style.display = 'none';
    }

    $('#postagem-view-title').textContent = 'Editar Postagem: ' + (post.title || '');
    showSection('postagem');
  }

  function savePostToServer(postObj, callback) {
    fetch('/api/admin/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token ? 'Bearer ' + token : '' },
      body: JSON.stringify({ action: 'save', post: postObj })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          toast(data.message || 'Postagem salva com sucesso!');
          if (callback) callback(data.post);
        } else {
          toast('Erro: ' + (data.message || 'Falha ao salvar postagem.'), true);
        }
      })
      .catch(function (err) {
        toast('Erro de rede: ' + err.message, true);
      });
  }

  // ==================================================================
  // 📅 2. PROGRAMAR (FILA DE POSTAGENS E AGENDAMENTO)
  // ==================================================================
  var brasiliaClockInterval = null;

  function startBrasiliaClock() {
    if (brasiliaClockInterval) return;
    function updateClock() {
      var timeEl = $('#queue-brasilia-time');
      var dateEl = $('#queue-brasilia-date');
      if (!timeEl || !dateEl) return;
      var now = new Date();
      try {
        var timeStr = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
        var dateStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
        timeEl.textContent = timeStr;
        dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
      } catch (e) {
        timeEl.textContent = now.toTimeString().split(' ')[0];
        dateEl.textContent = now.toLocaleDateString('pt-BR');
      }
    }
    updateClock();
    brasiliaClockInterval = setInterval(updateClock, 1000);
  }

  function initProgramarTab() {
    var btnRefresh = $('#btn-queue-refresh');
    if (btnRefresh) btnRefresh.addEventListener('click', loadQueuePosts);

    var btnNewPost = $('#btn-queue-new-post');
    if (btnNewPost) {
      btnNewPost.addEventListener('click', function () {
        resetPostagemForm();
        showSection('postagem');
      });
    }

    // Selecionar todos na fila
    var selAll = $('#queue-select-all');
    if (selAll) {
      selAll.addEventListener('change', function () {
        var checked = selAll.checked;
        document.querySelectorAll('.queue-item-cb').forEach(function (cb) {
          cb.checked = checked;
          var card = cb.closest('.queue-item-card');
          if (card) card.classList.toggle('selected', checked);
        });
        updateQueueSelectedCount();
      });
    }

    // Ações em lote
    var btnBatchSchedule = $('#btn-queue-batch-schedule');
    if (btnBatchSchedule) {
      btnBatchSchedule.addEventListener('click', function () {
        var ids = getSelectedQueueIds();
        if (!ids.length) { toast('Selecione ao menos uma postagem na fila.', true); return; }
        var dateVal = ($('#queue-batch-date').value || '').trim();
        var timeVal = ($('#queue-batch-time').value || '17:00').trim();
        if (!dateVal) { toast('Preencha a data de agendamento (dd/mm/aaaa).', true); return; }

        fetch('/api/admin/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bulk_schedule', ids: ids, scheduled_date: dateVal, scheduled_time: timeVal })
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            toast(res.message || 'Postagens agendadas!');
            loadQueuePosts();
          });
      });
    }

    var btnBatchPublish = $('#btn-queue-batch-publish');
    if (btnBatchPublish) {
      btnBatchPublish.addEventListener('click', function () {
        var ids = getSelectedQueueIds();
        if (!ids.length) { toast('Selecione ao menos uma postagem na fila.', true); return; }
        if (!confirm('Deseja publicar as ' + ids.length + ' postagens selecionadas agora no site?')) return;

        fetch('/api/admin/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bulk_publish', ids: ids })
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            toast(res.message || 'Postagens publicadas!');
            loadQueuePosts();
          });
      });
    }

    var btnBatchDelete = $('#btn-queue-batch-delete');
    if (btnBatchDelete) {
      btnBatchDelete.addEventListener('click', function () {
        var ids = getSelectedQueueIds();
        if (!ids.length) { toast('Selecione ao menos uma postagem na fila.', true); return; }
        if (!confirm('Deseja excluir permanentemente as ' + ids.length + ' postagens selecionadas?')) return;

        fetch('/api/admin/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bulk_delete', ids: ids })
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            toast(res.message || 'Postagens excluídas.');
            loadQueuePosts();
          });
      });
    }
  }

  function getSelectedQueueIds() {
    var ids = [];
    document.querySelectorAll('.queue-item-cb:checked').forEach(function (cb) {
      ids.push(cb.getAttribute('data-id'));
    });
    return ids;
  }

  function updateQueueSelectedCount() {
    var count = getSelectedQueueIds().length;
    var pill = $('#queue-selected-count');
    if (pill) pill.textContent = count + ' selecionado(s)';
  }

  function loadQueuePosts() {
    var container = $('#queue-items-container');
    if (!container) return;
    container.innerHTML = '<p class="muted" style="text-align:center; padding:2.5rem;">Carregando fila...</p>';

    fetch('/api/admin/posts?t=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var all = (data && data.posts) || [];
        queuePostsList = all.filter(function (p) { return p.status === 'draft' || p.status === 'scheduled'; });

        var totalBadge = $('#queue-total-count');
        if (totalBadge) totalBadge.textContent = queuePostsList.length + ' postagens na fila';

        var selAll = $('#queue-select-all');
        if (selAll) selAll.checked = false;
        updateQueueSelectedCount();

        if (!queuePostsList.length) {
          container.innerHTML = [
            '<div style="text-align:center; padding:3.5rem; color:#888;">',
            '<p style="font-size:2.2rem; margin-bottom:0.5rem;">📭</p>',
            '<p style="font-size:1.05rem; font-weight:700; color:#111;">Nenhuma postagem na fila de agendamento</p>',
            '<p style="font-size:0.9rem;">Crie uma nova publicação na aba <strong>📝 Postagem</strong> ou gere automaticamente pelo <strong>🤖 Agente IA</strong>.</p>',
            '</div>'
          ].join('');
          return;
        }

        container.innerHTML = '';
        queuePostsList.forEach(function (p) {
          var catInfo = CAT_INFO[p.category] || { label: p.category_label || p.category, icon: '📜' };
          var isSched = p.status === 'scheduled';

          var thumbHtml = p.image_url
            ? '<img src="' + escapeHtmlAdmin(p.image_url) + '" class="queue-item-thumb" alt="Capa">'
            : '<div class="queue-item-thumb">' + catInfo.icon + '</div>';

          var statusBadge = isSched
            ? '<span class="badge" style="background:#0f172a; color:#fff;">⏰ Agendado: ' + escapeHtmlAdmin(p.scheduled_for || 'Definir data') + '</span>'
            : '<span class="badge">Na Fila (Rascunho)</span>';

          var card = document.createElement('article');
          card.className = 'queue-item-card';
          card.setAttribute('data-id', p.id);
          card.innerHTML = [
            '<input type="checkbox" class="queue-item-cb" data-id="' + p.id + '">',
            thumbHtml,
            '<div class="queue-item-content">',
            '  <div class="queue-item-head">',
            '    <span class="badge" style="border:1px solid #cbd5e1;">' + catInfo.icon + ' ' + escapeHtmlAdmin(catInfo.label) + '</span>',
            '    ' + statusBadge,
            '  </div>',
            '  <h3 class="queue-item-title">' + escapeHtmlAdmin(p.title) + '</h3>',
            '  <p class="queue-item-sub">' + escapeHtmlAdmin(p.subtitle || p.summary || p.verse_text || 'Sem descrição') + '</p>',
            '</div>',
            '<div class="queue-item-actions">',
            '  <button type="button" class="btn-secondary btn-q-preview" data-id="' + p.id + '" title="Pré-visualizar">👁️ Prévia</button>',
            '  <button type="button" class="btn-secondary btn-q-edit" data-id="' + p.id + '" title="Editar no formulário">✏️ Editar</button>',
            '  <button type="button" class="btn-primary btn-q-pub" data-id="' + p.id + '" title="Publicar agora">🚀 Publicar</button>',
            '  <button type="button" class="icon-btn btn-q-del" data-id="' + p.id + '" title="Excluir" style="color:#e11d48; margin-left:4px;">🗑️</button>',
            '</div>'
          ].join('\n');

          // Eventos do card
          var cb = card.querySelector('.queue-item-cb');
          cb.addEventListener('change', function () {
            card.classList.toggle('selected', cb.checked);
            updateQueueSelectedCount();
          });

          card.querySelector('.btn-q-preview').addEventListener('click', function () {
            openPostPreview(p);
          });

          card.querySelector('.btn-q-edit').addEventListener('click', function () {
            loadPostIntoForm(p);
          });

          card.querySelector('.btn-q-pub').addEventListener('click', function () {
            fetch('/api/admin/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'publish', id: p.id })
            })
              .then(function (r) { return r.json(); })
              .then(function (res) {
                toast(res.message || 'Postagem publicada!');
                loadQueuePosts();
              });
          });

          card.querySelector('.btn-q-del').addEventListener('click', function () {
            if (!confirm('Deseja excluir esta postagem da fila?')) return;
            fetch('/api/admin/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'delete', id: p.id })
            })
              .then(function (r) { return r.json(); })
              .then(function (res) {
                toast(res.message || 'Postagem excluída.');
                loadQueuePosts();
              });
          });

          container.appendChild(card);
        });
      })
      .catch(function (err) {
        container.innerHTML = '<p class="muted" style="text-align:center; color:#e11d48; padding:2rem;">Erro ao carregar fila: ' + escapeHtmlAdmin(err.message) + '</p>';
      });
  }

  // ==================================================================
  // 📋 3. GERENCIAR (POSTAGENS PUBLICADAS)
  // ==================================================================
  function initGerenciarTab() {
    var btnRefresh = $('#btn-manage-refresh');
    if (btnRefresh) btnRefresh.addEventListener('click', loadManagePosts);

    var btnNew = $('#btn-manage-new-post');
    if (btnNew) {
      btnNew.addEventListener('click', function () {
        resetPostagemForm();
        showSection('postagem');
      });
    }

    var searchInput = $('#manage-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        currentManageSearch = searchInput.value.trim().toLowerCase();
        renderManagePostsFiltered();
      });
    }

    var btnClearSearch = $('#btn-manage-search-clear');
    if (btnClearSearch && searchInput) {
      btnClearSearch.addEventListener('click', function () {
        searchInput.value = '';
        currentManageSearch = '';
        renderManagePostsFiltered();
      });
    }

    // Detector de Duplicadas
    var btnDups = $('#btn-detect-duplicates');
    if (btnDups) {
      btnDups.addEventListener('click', function () {
        var statusMsg = $('#duplicates-status-msg');
        var banner = $('#duplicates-alert-box');
        if (statusMsg) statusMsg.textContent = 'Verificando duplicidades...';

        fetch('/api/admin/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'detect_duplicates' })
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.duplicates && data.duplicates.length) {
              if (statusMsg) statusMsg.textContent = '⚠️ ' + data.total + ' grupo(s) de títulos duplicados encontrados.';
              if (banner) {
                banner.style.display = 'block';
                var html = '<h3>⚠️ Postagens Duplicadas Detectadas:</h3>';
                data.duplicates.forEach(function (grp) {
                  html += '<div style="margin:8px 0; padding:8px 12px; background:rgba(255,255,255,0.08); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">';
                  html += '<div><strong>"' + escapeHtmlAdmin(grp.title) + '"</strong> — ' + grp.count + ' cópias encontradas</div>';
                  html += '<button type="button" class="btn-secondary danger btn-resolve-dup" data-title="' + escapeHtmlAdmin(grp.title) + '" style="font-size:12px; padding:4px 8px;">Excluir Cópias Extras</button>';
                  html += '</div>';
                });
                banner.innerHTML = html;

                banner.querySelectorAll('.btn-resolve-dup').forEach(function (btn) {
                  btn.addEventListener('click', function () {
                    var t = btn.getAttribute('data-title');
                    var grp = data.duplicates.find(function (g) { return g.title === t; });
                    if (grp && grp.ids && grp.ids.length > 1) {
                      var toDelete = grp.ids.slice(1);
                      if (!confirm('Deseja excluir as ' + toDelete.length + ' cópia(s) repetida(s) de "' + t + '"?')) return;
                      fetch('/api/admin/posts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'bulk_delete', ids: toDelete })
                      }).then(function () {
                        toast('Cópias extras excluídas!');
                        loadManagePosts();
                        btnDups.click();
                      });
                    }
                  });
                });
              }
            } else {
              if (statusMsg) statusMsg.textContent = '✔ Nenhuma duplicidade encontrada no acervo!';
              if (banner) banner.style.display = 'none';
            }
          });
      });
    }

    // Selecionar todos na tela
    var selAll = $('#manage-select-all');
    if (selAll) {
      selAll.addEventListener('change', function () {
        var checked = selAll.checked;
        document.querySelectorAll('.manage-item-cb').forEach(function (cb) {
          cb.checked = checked;
        });
        updateManageBulkUI();
      });
    }

    // Excluir selecionados
    var btnBulkDel = $('#btn-manage-bulk-delete');
    if (btnBulkDel) {
      btnBulkDel.addEventListener('click', function () {
        var ids = [];
        document.querySelectorAll('.manage-item-cb:checked').forEach(function (cb) {
          ids.push(cb.getAttribute('data-id'));
        });
        if (!ids.length) return;
        if (!confirm('Deseja realmente excluir permanentemente as ' + ids.length + ' postagens selecionadas?')) return;

        fetch('/api/admin/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bulk_delete', ids: ids })
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            toast(res.message || 'Postagens excluídas.');
            loadManagePosts();
          });
      });
    }
  }

  function updateManageBulkUI() {
    var count = document.querySelectorAll('.manage-item-cb:checked').length;
    var btn = $('#btn-manage-bulk-delete');
    var badge = $('#manage-bulk-count');
    if (btn && badge) {
      btn.style.display = count > 0 ? 'inline-flex' : 'none';
      badge.textContent = count;
    }
  }

  function loadManagePosts() {
    var container = $('#manage-posts-list');
    if (!container) return;
    container.innerHTML = '<p class="muted" style="text-align:center; padding:2.5rem;">Carregando postagens publicadas...</p>';

    fetch('/api/admin/posts?t=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var all = (data && data.posts) || [];
        managePostsList = all.filter(function (p) { return p.status === 'published'; });
        renderManageCategoryChips();
        renderManagePostsFiltered();
      })
      .catch(function (err) {
        container.innerHTML = '<p class="muted" style="text-align:center; color:#e11d48; padding:2rem;">Erro ao carregar: ' + escapeHtmlAdmin(err.message) + '</p>';
      });
  }

  function renderManageCategoryChips() {
    var wrap = $('#manage-cats-filters');
    if (!wrap) return;
    wrap.innerHTML = '';

    // Chip Todas
    var total = managePostsList.length;
    var allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'manage-chip' + (selectedManageCategory === 'all' ? ' active' : '');
    allBtn.innerHTML = 'Todas <span class="manage-chip-count">' + total + '</span>';
    allBtn.addEventListener('click', function () {
      selectedManageCategory = 'all';
      renderManageCategoryChips();
      renderManagePostsFiltered();
    });
    wrap.appendChild(allBtn);

    // Contadores por categoria
    Object.keys(CAT_INFO).forEach(function (catKey) {
      var cat = CAT_INFO[catKey];
      var count = managePostsList.filter(function (p) { return p.category === catKey; }).length;

      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'manage-chip' + (selectedManageCategory === catKey ? ' active' : '');
      chip.innerHTML = cat.icon + ' ' + escapeHtmlAdmin(cat.label) + ' <span class="manage-chip-count">' + count + '</span>';
      chip.addEventListener('click', function () {
        selectedManageCategory = catKey;
        renderManageCategoryChips();
        renderManagePostsFiltered();
      });
      wrap.appendChild(chip);
    });
  }

  function renderManagePostsFiltered() {
    var container = $('#manage-posts-list');
    if (!container) return;

    var filtered = managePostsList.filter(function (p) {
      if (selectedManageCategory !== 'all' && p.category !== selectedManageCategory) return false;
      if (currentManageSearch) {
        var hay = ((p.title || '') + ' ' + (p.subtitle || '') + ' ' + (p.verse_text || '') + ' ' + (p.summary || '') + ' ' + (p.content_html || '')).toLowerCase();
        if (hay.indexOf(currentManageSearch) === -1) return false;
      }
      return true;
    });

    var selAll = $('#manage-select-all');
    if (selAll) selAll.checked = false;
    updateManageBulkUI();

    if (!filtered.length) {
      container.innerHTML = [
        '<div style="text-align:center; padding:3.5rem; color:#888;">',
        '<p style="font-size:2rem; margin-bottom:0.5rem;">📋</p>',
        '<p style="font-size:1.05rem; font-weight:700; color:#222;">Nenhuma postagem encontrada</p>',
        '<p style="font-size:0.9rem;">Tente ajustar o termo de pesquisa ou a categoria selecionada.</p>',
        '</div>'
      ].join('');
      return;
    }

    container.innerHTML = '';
    filtered.forEach(function (p) {
      var catInfo = CAT_INFO[p.category] || { label: p.category_label || p.category, icon: '📜', slug: 'versiculo-do-dia' };
      var postLiveUrl = '/posts/' + catInfo.slug + '/' + (p.slug || p.id);

      var thumbHtml = p.image_url
        ? '<img src="' + escapeHtmlAdmin(p.image_url) + '" class="manage-post-thumb" alt="Capa">'
        : '<div class="manage-post-thumb">' + catInfo.icon + '</div>';

      var card = document.createElement('article');
      card.className = 'manage-post-card';
      card.setAttribute('data-id', p.id);
      card.innerHTML = [
        '<input type="checkbox" class="manage-item-cb" data-id="' + p.id + '">',
        thumbHtml,
        '<div class="manage-post-body">',
        '  <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px; flex-wrap:wrap;">',
        '    <span class="badge">' + catInfo.icon + ' ' + escapeHtmlAdmin(catInfo.label) + '</span>',
        '    <span class="muted" style="font-size:12px;">Publicado em ' + escapeHtmlAdmin(p.published_at || p.date || '—') + '</span>',
        p.verse_ref ? '    <span class="muted" style="font-size:12px; font-weight:700;">· ' + escapeHtmlAdmin(p.verse_ref) + '</span>' : '',
        '  </div>',
        '  <h3 class="manage-post-title">' + escapeHtmlAdmin(p.title) + '</h3>',
        '  <p class="manage-post-meta">' + escapeHtmlAdmin(p.subtitle || p.summary || '') + '</p>',
        '</div>',
        '<div class="manage-post-actions">',
        '  <button type="button" class="btn-secondary btn-m-edit" data-id="' + p.id + '" title="Editar">✏️ Editar</button>',
        '  <a href="' + postLiveUrl + '" target="_blank" rel="noopener" class="btn-secondary" title="Ver no site" style="text-decoration:none;">👁️ Ver no Site ↗</a>',
        '  <button type="button" class="icon-btn btn-m-del" data-id="' + p.id + '" title="Excluir" style="color:#e11d48; margin-left:4px;">🗑️</button>',
        '</div>'
      ].join('\n');

      var cb = card.querySelector('.manage-item-cb');
      cb.addEventListener('change', updateManageBulkUI);

      card.querySelector('.btn-m-edit').addEventListener('click', function () {
        loadPostIntoForm(p);
      });

      card.querySelector('.btn-m-del').addEventListener('click', function () {
        if (!confirm('Deseja realmente excluir permanentemente a postagem "' + p.title + '"?')) return;
        fetch('/api/admin/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: p.id })
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            toast(res.message || 'Postagem excluída.');
            loadManagePosts();
          });
      });

      container.appendChild(card);
    });
  }

  // ==================================================================
  // 👁️ MODAL COMPARTILHADO DE PRÉ-VISUALIZAÇÃO DE POSTAGEM
  // ==================================================================
  function initPostPreviewModal() {
    var modal = $('#post-preview-modal');
    if (!modal) return;

    var btnClose = $('#btn-close-post-preview');
    if (btnClose) btnClose.addEventListener('click', function () { modal.hidden = true; });

    var btnFootClose = $('#btn-modal-preview-close');
    if (btnFootClose) btnFootClose.addEventListener('click', function () { modal.hidden = true; });

    var btnEdit = $('#btn-modal-preview-edit');
    if (btnEdit) {
      btnEdit.addEventListener('click', function () {
        modal.hidden = true;
        if (currentPreviewPost) loadPostIntoForm(currentPreviewPost);
      });
    }
  }

  function openPostPreview(post) {
    if (!post) return;
    currentPreviewPost = post;
    var modal = $('#post-preview-modal');
    var body = $('#post-preview-content-body');
    if (!modal || !body) return;

    var catInfo = CAT_INFO[post.category] || { label: post.category_label || post.category, icon: '📜' };
    var catBadge = $('#preview-modal-cat-badge');
    if (catBadge) catBadge.textContent = catInfo.icon + ' ' + catInfo.label;

    var dateEl = $('#preview-modal-date');
    if (dateEl) dateEl.textContent = post.published_at || post.date || (post.status === 'scheduled' ? 'Agendado' : 'Rascunho');

    var html = '<h1>' + escapeHtmlAdmin(post.title || 'Sem título') + '</h1>';
    if (post.subtitle) {
      html += '<div class="preview-subtitle">' + escapeHtmlAdmin(post.subtitle) + '</div>';
    }
    if (post.verse_text) {
      html += '<div class="preview-verse-quote">“' + escapeHtmlAdmin(post.verse_text) + '” ' + (post.verse_ref ? '<strong>(' + escapeHtmlAdmin(post.verse_ref) + ')</strong>' : '') + '</div>';
    }
    if (post.image_url) {
      html += '<img src="' + escapeHtmlAdmin(post.image_url) + '" class="preview-cover-img" alt="Capa">';
    }

    // Conteúdo formatado
    var contentHtml = post.content_html || '';
    if (!contentHtml && post.sections && post.sections.length) {
      contentHtml = post.sections.map(function (s) {
        return '<h2>' + escapeHtmlAdmin(s.heading) + '</h2><p>' + escapeHtmlAdmin(s.body) + '</p>';
      }).join('');
    }
    html += '<div class="preview-text-block">' + (contentHtml || '<p>' + escapeHtmlAdmin(post.summary || '') + '</p>') + '</div>';

    if (post.closing_prayer) {
      html += '<div style="margin-top:20px; background:#f4f4f5; border-left:3px solid #000; padding:14px 18px; border-radius:0 8px 8px 0;">';
      html += '<strong style="display:block; margin-bottom:4px;">🕊️ Oração de Conclusão:</strong>';
      html += escapeHtmlAdmin(post.closing_prayer);
      html += '</div>';
    }

    body.innerHTML = html;
    modal.hidden = false;
  }

  // ------------------------------------------------------------------ segurança
  $('#btn-security').addEventListener('click', function () { $('#pw-msg').textContent = ''; showSection('security'); $('#pw-current').focus(); });
  $('#btn-back').addEventListener('click', function () { showSection('editor'); });

  // ------------------------------------------------------------------ moderação de orações
  var adminPrayersList = [];

  function loadAdminPrayers() {
    var container = $('#prayers-admin-list');
    container.innerHTML = '<p class="muted" style="text-align: center; padding: 2rem;">Carregando pedidos…</p>';
    fetch('/api/prayers?t=' + Date.now())
      .then(function (res) {
        if (!res.ok) return fetch('/prayer_requests.json?t=' + Date.now()).then(function (r) { return r.json(); });
        return res.json();
      })
      .then(function (data) {
        adminPrayersList = Array.isArray(data) ? data : [];
        updatePrayerStats();
        renderAdminPrayers();
      })
      .catch(function (err) {
        container.innerHTML = '<p class="muted" style="text-align: center; color: var(--red); padding: 2rem;">Erro ao carregar pedidos: ' + escText(err.message) + '</p>';
      });
  }

  function updatePrayerStats() {
    var total = adminPrayersList.length;
    var totalOracoes = adminPrayersList.reduce(function (s, p) { return s + (parseInt(p.prayers_count, 10) || 0); }, 0);
    var totalRespostas = adminPrayersList.reduce(function (s, p) { return s + ((p.replies && p.replies.length) || 0); }, 0);
    $('#stat-total-prayers').textContent = total.toLocaleString('pt-BR');
    $('#stat-total-oracoes').textContent = totalOracoes.toLocaleString('pt-BR');
    $('#stat-total-respostas').textContent = totalRespostas.toLocaleString('pt-BR');
  }

  function renderAdminPrayers() {
    var container = $('#prayers-admin-list');
    var query = ($('#prayer-search-input').value || '').trim().toLowerCase();
    var filterType = $('#prayer-filter-select').value;

    var filtered = adminPrayersList.filter(function (p) {
      if (filterType === 'with-replies' && (!p.replies || p.replies.length === 0)) return false;
      if (filterType === 'without-replies' && p.replies && p.replies.length > 0) return false;
      if (!query) return true;

      var nameMatch = (p.name || '').toLowerCase().indexOf(query) !== -1;
      var msgMatch = (p.message || '').toLowerCase().indexOf(query) !== -1;
      var replyMatch = (p.replies || []).some(function (r) {
        return (r.name || '').toLowerCase().indexOf(query) !== -1 || (r.message || '').toLowerCase().indexOf(query) !== -1;
      });
      return nameMatch || msgMatch || replyMatch;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:3rem;background:#fff;border:1px solid var(--border);border-radius:12px;color:var(--muted);">' +
        (query ? 'Nenhum pedido encontrado para o termo pesquisado.' : 'Nenhum pedido de oração cadastrado.') +
        '</div>';
      return;
    }

    container.innerHTML = '';
    filtered.forEach(function (p) {
      var item = el('div', { class: 'adm-prayer-item', id: 'adm-prayer-' + p.id });

      var author = el('div', { class: 'adm-prayer-author' }, [
        el('span', { text: '🕊️ ' + (p.name || 'Anônimo') }),
        el('span', { class: 'adm-prayer-badge', text: p.is_public ? 'Público' : 'Privado' })
      ]);

      var dateStr = p.created_at ? new Date(p.created_at).toLocaleString('pt-BR') : 'Data não informada';
      var meta = el('div', { class: 'adm-prayer-meta' }, [
        el('time', { text: dateStr })
      ]);

      var header = el('div', { class: 'adm-prayer-header' }, [author, meta]);
      var content = el('div', { class: 'adm-prayer-content', text: p.message || '' });

      var oracoesCount = p.prayers_count || 0;
      var counts = el('div', { class: 'adm-prayer-counts', text: '🙏 ' + oracoesCount + (oracoesCount === 1 ? ' pessoa orou' : ' pessoas oraram') });

      var delBtn = el('button', { type: 'button', class: 'btn-del-prayer', text: '🗑️ Excluir Pedido' });
      delBtn.addEventListener('click', function () {
        deleteAdminPrayer(p.id);
      });

      var footer = el('div', { class: 'adm-prayer-footer' }, [counts, delBtn]);

      item.appendChild(header);
      item.appendChild(content);

      if (p.replies && p.replies.length > 0) {
        var repliesBox = el('div', { class: 'adm-prayer-replies' });
        var repTitle = el('div', { class: 'adm-reply-title', text: 'Respostas da Comunidade (' + p.replies.length + ')' });
        repliesBox.appendChild(repTitle);

        p.replies.forEach(function (r) {
          var repItem = el('div', { class: 'adm-reply-item' });
          var repInfo = el('div', { class: 'adm-reply-info' });
          var repAuthor = el('strong', { text: r.name || 'Irmão de Fé' });
          var repTimeStr = r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '';
          var repTime = el('time', { text: repTimeStr });
          var repText = el('div', { class: 'adm-reply-text', text: r.message || '' });

          repInfo.appendChild(repAuthor);
          if (repTimeStr) repInfo.appendChild(repTime);
          repInfo.appendChild(repText);

          var delRepBtn = el('button', { type: 'button', class: 'btn-del-reply', text: 'Excluir Resposta' });
          delRepBtn.addEventListener('click', function () {
            deleteAdminReply(p.id, r.id);
          });

          repItem.appendChild(repInfo);
          repItem.appendChild(delRepBtn);
          repliesBox.appendChild(repItem);
        });

        item.appendChild(repliesBox);
      }

      item.appendChild(footer);
      container.appendChild(item);
    });
  }

  function deleteAdminPrayer(prayerId) {
    if (!confirm('Deseja realmente excluir permanentemente este pedido de oração?')) return;
    fetch('/api/prayers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', prayer_id: prayerId })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          toast('Pedido de oração excluído com sucesso.');
          adminPrayersList = adminPrayersList.filter(function (p) { return p.id !== prayerId; });
          updatePrayerStats();
          renderAdminPrayers();
        } else {
          toast(data.message || 'Erro ao excluir pedido.', true);
        }
      })
      .catch(function (err) {
        toast('Erro de comunicação: ' + err.message, true);
      });
  }

  function deleteAdminReply(prayerId, replyId) {
    if (!confirm('Deseja realmente excluir esta resposta?')) return;
    fetch('/api/prayers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_reply', prayer_id: prayerId, reply_id: replyId })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          toast('Resposta excluída com sucesso.');
          var prayer = adminPrayersList.find(function (p) { return p.id === prayerId; });
          if (prayer && prayer.replies) {
            prayer.replies = prayer.replies.filter(function (r) { return r.id !== replyId; });
          }
          updatePrayerStats();
          renderAdminPrayers();
        } else {
          toast(data.message || 'Erro ao excluir resposta.', true);
        }
      })
      .catch(function (err) {
        toast('Erro de comunicação: ' + err.message, true);
      });
  }

  $('#btn-prayers').addEventListener('click', function () {
    if (dirtyCount() && !confirm('Há alterações não salvas nos textos. Ir para os pedidos mesmo assim?')) return;
    showSection('prayers');
    loadAdminPrayers();
  });
  $('#btn-back-prayers').addEventListener('click', function () {
    showSection('editor');
  });
  $('#btn-refresh-prayers').addEventListener('click', function () {
    loadAdminPrayers();
  });
  $('#prayer-search-input').addEventListener('input', renderAdminPrayers);
  $('#prayer-filter-select').addEventListener('change', renderAdminPrayers);

  // ==================================================================
  // AGENTE DE IA — CRIAÇÃO E GESTÃO DE CONTEÚDO BÍBLICO (8 CATEGORIAS)
  // ==================================================================
  var AGENT_CATS = {
    'versiculo_do_dia': { label: 'Versículo do Dia', icon: '📜', slug: 'versiculo-do-dia' },
    'palavra_do_dia': { label: 'Palavra do Dia', icon: '📖', slug: 'palavra-do-dia' },
    'salmos_do_dia': { label: 'Salmos do Dia', icon: '🕊️', slug: 'salmos-do-dia' },
    'devocional_do_dia': { label: 'Devocional do Dia', icon: '✨', slug: 'devocional-do-dia' },
    'historias_da_biblia': { label: 'Histórias da Bíblia', icon: '🏛️', slug: 'historias-da-biblia' },
    'curiosidades_biblicas': { label: 'Curiosidades Bíblicas', icon: '🔍', slug: 'curiosidades-biblicas' },
    'ensinamentos_de_jesus': { label: 'Ensinamentos de Jesus', icon: '👑', slug: 'ensinamentos-de-jesus' },
    'ensino_biblico': { label: 'Ensino Bíblico', icon: '📚', slug: 'ensino-biblico' }
  };
  var AGENT_CAT_KEYS = Object.keys(AGENT_CATS);

  var adminAgentPosts = [];
  var currentGeneratedPost = null;
  var batchIsRunning = false;
  var batchShouldCancel = false;
  var selectedAgentCategory = 'all';

  // Sub-abas do Agente
  function switchAgentSubTab(tab) {
    ['single', 'batch', 'posts', 'config'].forEach(function (t) {
      var btn = $('#agent-tab-' + t);
      var pnl = $('#agent-panel-' + t);
      if (btn) {
        btn.classList.toggle('active', t === tab);
        btn.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      }
      if (pnl) pnl.hidden = (t !== tab);
    });
    if (tab === 'posts') {
      loadAgentPosts();
    } else if (tab === 'config') {
      loadAgentConfig();
    }
  }

  $('#agent-tab-single').addEventListener('click', function () { switchAgentSubTab('single'); });
  $('#agent-tab-batch').addEventListener('click', function () { switchAgentSubTab('batch'); });
  $('#agent-tab-posts').addEventListener('click', function () { switchAgentSubTab('posts'); });
  $('#agent-tab-config').addEventListener('click', function () { switchAgentSubTab('config'); });

  $('#btn-agent').addEventListener('click', function () {
    if (dirtyCount() && !confirm('Há alterações não salvas nos textos. Ir para o Agente IA mesmo assim?')) return;
    showSection('agent');
    loadAgentPosts();
    loadAgentConfig();
  });
  $('#btn-back-agent').addEventListener('click', function () {
    showSection('editor');
  });

  // ------------------------------------------------------------------ Geração Individual
  $('#btn-agent-generate-single').addEventListener('click', function () {
    var cat = $('#agent-single-category').value;
    var topic = $('#agent-single-topic').value.trim();
    var template = $('#agent-single-template').value;
    var autoPub = $('#agent-single-autopublish').checked;

    var btn = $('#btn-agent-generate-single');
    var loading = $('#agent-single-loading');
    var resultBox = $('#agent-single-result');

    btn.disabled = true;
    loading.hidden = false;
    resultBox.hidden = true;

    fetch('/api/agent/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cat, topic: topic, template: template, auto_publish: autoPub })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        loading.hidden = true;
        if (data.success && data.post) {
          currentGeneratedPost = data.post;
          renderSingleResult(data.post);
          toast('Postagem gerada com sucesso!');
          if (autoPub) {
            loadAgentPosts();
          }
        } else {
          toast(data.message || 'Erro ao gerar postagem.', true);
        }
      })
      .catch(function (err) {
        btn.disabled = false;
        loading.hidden = true;
        toast('Erro de comunicação: ' + err.message, true);
      });
  });

  function renderSingleResult(post) {
    var catMeta = AGENT_CATS[post.category] || { label: post.category, icon: '📜' };
    $('#res-badge-cat').textContent = catMeta.icon + ' ' + catMeta.label;

    var statusBadge = $('#res-badge-status');
    statusBadge.textContent = post.status === 'published' ? 'Publicado' : 'Rascunho';
    statusBadge.className = 'agent-status-badge ' + (post.status === 'published' ? 'published' : 'draft');

    $('#res-title').textContent = post.title;
    $('#res-subtitle').textContent = post.subtitle || '';

    // Versículo
    var vBox = $('#res-verse-box');
    if (post.verse_text) {
      vBox.hidden = false;
      $('#res-verse-text').textContent = '“' + post.verse_text + '”';
      $('#res-verse-ref').textContent = '— ' + (post.verse_ref || '');
    } else {
      vBox.hidden = true;
    }

    // Resumo
    $('#res-summary').textContent = post.summary || '';

    // Seções
    var secContainer = $('#res-sections');
    secContainer.innerHTML = '';
    (post.sections || []).forEach(function (s) {
      var item = el('div', { class: 'agent-section-item' }, [
        el('h4', { text: s.heading }),
        el('p', { text: s.body })
      ]);
      secContainer.appendChild(item);
    });

    // Tabela
    var tBox = $('#res-table-box');
    if (post.table_headers && post.table_headers.length && post.table_rows && post.table_rows.length) {
      tBox.hidden = false;
      $('#res-table-title').textContent = post.table_title || 'Quadro Temático e Bíblico';
      var thead = $('#res-table-head');
      thead.innerHTML = '';
      var trH = el('tr');
      post.table_headers.forEach(function (h) { trH.appendChild(el('th', { text: h })); });
      thead.appendChild(trH);

      var tbody = $('#res-table-body');
      tbody.innerHTML = '';
      post.table_rows.forEach(function (r) {
        var trB = el('tr');
        r.forEach(function (c) { trB.appendChild(el('td', { text: c })); });
        tbody.appendChild(trB);
      });
    } else {
      tBox.hidden = true;
    }

    // Quiz interativo
    var qBox = $('#res-quiz-box');
    if (post.quiz && post.quiz.question) {
      qBox.hidden = false;
      $('#res-quiz-question').textContent = post.quiz.question;
      var qOpts = $('#res-quiz-options');
      qOpts.innerHTML = '';
      var qExp = $('#res-quiz-explanation');
      qExp.hidden = true;
      qExp.textContent = post.quiz.explanation || '';

      (post.quiz.options || []).forEach(function (opt) {
        var optBtn = el('button', { type: 'button', class: 'quiz-opt-btn', text: opt.text });
        optBtn.addEventListener('click', function () {
          // Desativa outros
          qOpts.querySelectorAll('.quiz-opt-btn').forEach(function (b) { b.disabled = true; });
          if (opt.correct) {
            optBtn.classList.add('correct');
          } else {
            optBtn.classList.add('incorrect');
            // Marca o correto
            var idxCorrect = (post.quiz.options || []).findIndex(function (o) { return o.correct; });
            if (idxCorrect >= 0 && qOpts.children[idxCorrect]) {
              qOpts.children[idxCorrect].classList.add('correct');
            }
          }
          if (post.quiz.explanation) qExp.hidden = false;
        });
        qOpts.appendChild(optBtn);
      });
    } else {
      qBox.hidden = true;
    }

    // Reflexões
    var refBox = $('#res-reflections-box');
    var refList = $('#res-reflections-list');
    refList.innerHTML = '';
    if (post.reflections && post.reflections.length) {
      refBox.hidden = false;
      post.reflections.forEach(function (ref) {
        var li = el('li');
        var strong = el('strong', { text: (ref.title || '') + ' ' });
        var span = el('span', { text: ref.text || '' });
        li.appendChild(strong);
        li.appendChild(span);
        refList.appendChild(li);
      });
    } else {
      refBox.hidden = true;
    }

    // Oração
    var pBox = $('#res-prayer-box');
    if (post.closing_prayer) {
      pBox.hidden = false;
      $('#res-prayer').textContent = post.closing_prayer;
    } else {
      pBox.hidden = true;
    }

    $('#agent-single-result').hidden = false;
    $('#agent-single-result').scrollIntoView({ behavior: 'smooth' });
  }

  // Ações do Resultado
  $('#btn-res-preview').addEventListener('click', function () {
    if (currentGeneratedPost) openPostPreviewModal(currentGeneratedPost);
  });

  $('#btn-res-toggle-status').addEventListener('click', function () {
    if (!currentGeneratedPost) return;
    fetch('/api/agent/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_status', id: currentGeneratedPost.id })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.success && d.post) {
          currentGeneratedPost = d.post;
          renderSingleResult(d.post);
          toast('Status alterado para: ' + d.post.status);
          loadAgentPosts();
        } else {
          toast(d.message || 'Erro ao alterar status', true);
        }
      });
  });

  $('#btn-res-copy-html').addEventListener('click', function () {
    if (!currentGeneratedPost) return;
    var content = formatPostForExport(currentGeneratedPost);
    navigator.clipboard.writeText(content).then(function () {
      toast('Conteúdo copiado para a área de transferência!');
    }).catch(function () {
      toast('Falha ao copiar automaticamente.', true);
    });
  });

  $('#btn-res-discard').addEventListener('click', function () {
    if (confirm('Deseja descartar este resultado da tela? (Se já foi publicado, ele continuará salvo na aba Postagens)')) {
      $('#agent-single-result').hidden = true;
      currentGeneratedPost = null;
    }
  });

  // ------------------------------------------------------------------ Geração em Lote
  function logBatch(msg) {
    var terminal = $('#agent-batch-log');
    var now = new Date();
    var timeStr = now.toLocaleTimeString('pt-BR');
    terminal.textContent += '[' + timeStr + '] ' + msg + '\n';
    terminal.scrollTop = terminal.scrollHeight;
  }

  $('#btn-clear-batch-log').addEventListener('click', function () {
    $('#agent-batch-log').textContent = '';
  });

  $('#btn-agent-batch-cancel').addEventListener('click', function () {
    batchShouldCancel = true;
    logBatch('⚠️ Solicitação de cancelamento enviada pelo usuário...');
    $('#btn-agent-batch-cancel').disabled = true;
  });

  $('#btn-agent-batch-start').addEventListener('click', function () {
    var catChoice = $('#agent-batch-category').value;
    var totalCount = parseInt($('#agent-batch-count').value, 10) || 8;
    var autoPub = $('#agent-batch-autopublish').checked;

    batchIsRunning = true;
    batchShouldCancel = false;

    var startBtn = $('#btn-agent-batch-start');
    var cancelBtn = $('#btn-agent-batch-cancel');
    var progBox = $('#agent-batch-progress-box');
    var termBox = $('#agent-batch-terminal-box');
    var progFill = $('#agent-batch-progress-fill');
    var progLbl = $('#agent-batch-progress-label');
    var progPct = $('#agent-batch-progress-percent');

    startBtn.disabled = true;
    startBtn.style.display = 'none';
    cancelBtn.disabled = false;
    cancelBtn.style.display = 'inline-block';
    progBox.hidden = false;
    termBox.hidden = false;

    $('#agent-batch-log').textContent = '';
    logBatch('Iniciando lote: ' + totalCount + ' postagens. Publicação automática: ' + (autoPub ? 'SIM' : 'NÃO'));

    var currentIdx = 0;

    function runNext() {
      if (batchShouldCancel) {
        logBatch('🛑 Lote cancelado pelo usuário após ' + currentIdx + ' postagens.');
        finishBatch();
        return;
      }
      if (currentIdx >= totalCount) {
        logBatch('✨ Lote concluído com sucesso! Todas as ' + totalCount + ' postagens foram geradas.');
        finishBatch();
        return;
      }

      // Define a categoria da vez
      var thisCat = catChoice;
      if (catChoice === 'all') {
        thisCat = AGENT_CAT_KEYS[currentIdx % AGENT_CAT_KEYS.length];
      }
      var catMeta = AGENT_CATS[thisCat] || { label: thisCat, icon: '📜' };

      progLbl.textContent = 'Gerando item ' + (currentIdx + 1) + ' de ' + totalCount + ' (' + catMeta.label + ')…';
      var percent = Math.round((currentIdx / totalCount) * 100);
      progFill.style.width = percent + '%';
      progPct.textContent = percent + '%';

      logBatch('(' + (currentIdx + 1) + '/' + totalCount + ') Gerando para [' + catMeta.label + ']...');

      fetch('/api/agent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: thisCat, auto_publish: autoPub })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success && data.post) {
            logBatch('✔ Post gerado: "' + data.post.title + '" (' + (autoPub ? 'Publicado' : 'Rascunho') + ')');
          } else {
            logBatch('❌ Falha ao gerar: ' + (data.message || 'Erro desconhecido'));
          }
          currentIdx++;
          setTimeout(runNext, 400);
        })
        .catch(function (err) {
          logBatch('❌ Erro de conexão no item: ' + err.message);
          currentIdx++;
          setTimeout(runNext, 400);
        });
    }

    function finishBatch() {
      batchIsRunning = false;
      startBtn.disabled = false;
      startBtn.style.display = 'inline-block';
      cancelBtn.style.display = 'none';
      progFill.style.width = '100%';
      progPct.textContent = '100%';
      progLbl.textContent = 'Processo finalizado.';
      toast('Lote concluído!');
      loadAgentPosts();
    }

    runNext();
  });

  // ------------------------------------------------------------------ Gestão de Postagens (Feed)
  function loadAgentPosts() {
    fetch('/api/agent/posts')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success && Array.isArray(data.posts)) {
          adminAgentPosts = data.posts;
          updateAgentStats();
          renderAgentPosts();
        }
      })
      .catch(function (err) {
        console.error('Erro ao carregar posts do agente:', err);
      });
  }

  function updateAgentStats() {
    var total = adminAgentPosts.length;
    var pub = adminAgentPosts.filter(function (p) { return p.status === 'published'; }).length;
    var dft = total - pub;

    var catsFound = {};
    adminAgentPosts.forEach(function (p) { if (p.category) catsFound[p.category] = true; });
    var catCount = Object.keys(catsFound).length;

    $('#stat-total-posts').textContent = total;
    $('#stat-published-posts').textContent = pub;
    $('#stat-draft-posts').textContent = dft;
    $('#stat-categories-posts').textContent = catCount;
    $('#agent-badge-posts-count').textContent = total;
  }

  function renderAgentPosts() {
    var container = $('#agent-posts-list');
    var query = ($('#agent-posts-search').value || '').toLowerCase().trim();
    var statusFilter = $('#agent-status-filter').value;

    var list = adminAgentPosts.filter(function (p) {
      if (selectedAgentCategory !== 'all' && p.category !== selectedAgentCategory) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (query) {
        var titleMatch = (p.title || '').toLowerCase().indexOf(query) >= 0;
        var summaryMatch = (p.summary || '').toLowerCase().indexOf(query) >= 0;
        var verseMatch = (p.verse_text || '').toLowerCase().indexOf(query) >= 0 || (p.verse_ref || '').toLowerCase().indexOf(query) >= 0;
        if (!titleMatch && !summaryMatch && !verseMatch) return false;
      }
      return true;
    });

    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = '<p class="muted" style="text-align: center; padding: 2.5rem; background: #fff; border: 1px solid var(--line); border-radius: 10px;">Nenhuma postagem encontrada com os filtros selecionados.</p>';
      return;
    }

    list.forEach(function (post) {
      var catMeta = AGENT_CATS[post.category] || { label: post.category, icon: '📜' };
      var card = el('div', { class: 'agent-post-card' });

      // Cabeçalho do Card
      var head = el('div', { class: 'agent-post-head' });
      var left = el('div', { class: 'agent-post-head-left' }, [
        el('span', { class: 'agent-cat-badge', text: catMeta.icon + ' ' + catMeta.label }),
        el('span', { class: 'agent-status-badge ' + (post.status === 'published' ? 'published' : 'draft'), text: post.status === 'published' ? 'Publicado' : 'Rascunho' })
      ]);
      var dateSpan = el('span', { class: 'agent-post-date', text: post.date || '' });
      head.appendChild(left);
      head.appendChild(dateSpan);
      card.appendChild(head);

      // Título
      var titleH3 = el('h3', { class: 'agent-post-title', text: post.title });
      card.appendChild(titleH3);

      // Tag de Versículo
      if (post.verse_ref) {
        var vTag = el('span', { class: 'agent-post-verse-tag', text: '📖 ' + post.verse_ref });
        card.appendChild(vTag);
      }

      // Resumo
      if (post.summary) {
        var sumP = el('p', { class: 'agent-post-summary', text: post.summary });
        card.appendChild(sumP);
      }

      // Ações do Card
      var actions = el('div', { class: 'agent-post-actions' });

      var btnView = el('button', { type: 'button', class: 'btn-post-action', text: '👁️ Visualizar' });
      btnView.addEventListener('click', function () { openPostPreviewModal(post); });

      var btnEdit = el('button', { type: 'button', class: 'btn-post-action', text: '✏️ Editar' });
      btnEdit.addEventListener('click', function () { openPostEditModal(post); });

      var btnToggle = el('button', { type: 'button', class: 'btn-post-action', text: post.status === 'published' ? 'Despublicar' : 'Publicar' });
      btnToggle.addEventListener('click', function () {
        toggleAgentPostStatus(post.id);
      });

      var btnDelete = el('button', { type: 'button', class: 'btn-post-action danger', text: '🗑️ Excluir' });
      btnDelete.addEventListener('click', function () {
        deleteAgentPost(post.id);
      });

      var catSlug = (AGENT_CATS[post.category] && AGENT_CATS[post.category].slug) || post.category.replace(/_/g, '-');
      var btnLive = el('a', {
        href: '/posts/' + catSlug + '/' + (post.slug || post.id),
        target: '_blank',
        rel: 'noopener',
        class: 'btn-post-action',
        text: '🔗 Ver no Site',
        style: 'text-decoration: none; display: inline-flex; align-items: center;'
      });

      actions.appendChild(btnView);
      actions.appendChild(btnLive);
      actions.appendChild(btnEdit);
      actions.appendChild(btnToggle);
      actions.appendChild(btnDelete);
      card.appendChild(actions);

      container.appendChild(card);
    });
  }

  function toggleAgentPostStatus(postId) {
    fetch('/api/agent/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_status', id: postId })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          toast(data.message || 'Status alterado!');
          var p = adminAgentPosts.find(function (x) { return x.id === postId; });
          if (p) p.status = p.status === 'published' ? 'draft' : 'published';
          updateAgentStats();
          renderAgentPosts();
        } else {
          toast(data.message || 'Erro ao alterar status.', true);
        }
      });
  }

  function deleteAgentPost(postId) {
    if (!confirm('Deseja realmente excluir esta postagem?')) return;
    fetch('/api/agent/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: postId })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          toast('Postagem excluída com sucesso.');
          adminAgentPosts = adminAgentPosts.filter(function (x) { return x.id !== postId; });
          updateAgentStats();
          renderAgentPosts();
        } else {
          toast(data.message || 'Erro ao excluir postagem.', true);
        }
      });
  }

  // Chips de Categoria
  $('#agent-cat-chips').addEventListener('click', function (e) {
    var btn = e.target.closest('.cat-chip');
    if (!btn) return;
    $('#agent-cat-chips').querySelectorAll('.cat-chip').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    selectedAgentCategory = btn.getAttribute('data-cat') || 'all';
    renderAgentPosts();
  });

  $('#agent-posts-search').addEventListener('input', renderAgentPosts);
  $('#agent-status-filter').addEventListener('change', renderAgentPosts);

  // ------------------------------------------------------------------ Modal de Pré-visualização
  function openPostPreviewModal(post) {
    var catMeta = AGENT_CATS[post.category] || { label: post.category, icon: '📜' };
    $('#modal-prev-cat').textContent = catMeta.icon + ' ' + catMeta.label;

    var body = $('#modal-prev-content');
    body.innerHTML = '';

    var article = el('article', { style: 'color: #111; line-height: 1.65;' });

    article.appendChild(el('h2', { text: post.title, style: 'font-size: 24px; font-weight: 800; margin-bottom: 6px;' }));
    if (post.subtitle) {
      article.appendChild(el('p', { text: post.subtitle, class: 'muted', style: 'font-size: 15px; margin-bottom: 16px;' }));
    }

    if (post.verse_text) {
      var vq = el('blockquote', {
        style: 'margin: 18px 0; padding: 14px 18px; background: #f7f7f8; border-left: 4px solid #000; font-style: italic; border-radius: 0 8px 8px 0;'
      }, [
        el('p', { text: '“' + post.verse_text + '”', style: 'margin-bottom: 4px; font-size: 16px;' }),
        el('cite', { text: '— ' + (post.verse_ref || ''), style: 'font-size: 13px; font-weight: 700; font-style: normal; color: #555;' })
      ]);
      article.appendChild(vq);
    }

    if (post.summary) {
      article.appendChild(el('p', { text: post.summary, style: 'font-size: 15px; margin: 16px 0; color: #222;' }));
    }

    (post.sections || []).forEach(function (s) {
      var sec = el('div', { style: 'margin: 20px 0; padding: 16px; background: #fafafa; border: 1px solid #ebebeb; border-radius: 8px;' }, [
        el('h3', { text: s.heading, style: 'font-size: 17px; font-weight: 700; margin-bottom: 8px; color: #000;' }),
        el('p', { text: s.body, style: 'font-size: 14.5px; color: #333;' })
      ]);
      article.appendChild(sec);
    });

    // Tabela
    if (post.table_headers && post.table_headers.length && post.table_rows && post.table_rows.length) {
      var tblWrap = el('div', { style: 'margin: 22px 0; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;' });
      tblWrap.appendChild(el('h4', { text: post.table_title || 'Quadro Temático', style: 'padding: 10px 14px; background: #f4f4f5; font-size: 14px;' }));
      var table = el('table', { style: 'width: 100%; border-collapse: collapse; font-size: 13px;' });
      var thead = el('thead');
      var trH = el('tr');
      post.table_headers.forEach(function (h) { trH.appendChild(el('th', { text: h, style: 'padding: 8px 12px; background: #f0f0f0; border-bottom: 1px solid #e0e0e0; text-align: left;' })); });
      thead.appendChild(trH);
      table.appendChild(thead);
      var tbody = el('tbody');
      post.table_rows.forEach(function (r) {
        var trB = el('tr');
        r.forEach(function (c) { trB.appendChild(el('td', { text: c, style: 'padding: 8px 12px; border-bottom: 1px solid #f4f4f4;' })); });
        tbody.appendChild(trB);
      });
      table.appendChild(tbody);
      tblWrap.appendChild(table);
      article.appendChild(tblWrap);
    }

    // Quiz
    if (post.quiz && post.quiz.question) {
      var qCard = el('div', { style: 'margin: 22px 0; padding: 18px; background: #fcfcfc; border: 1px solid #000; border-radius: 8px;' }, [
        el('h4', { text: 'Quiz Bíblico', style: 'font-size: 15px; margin-bottom: 8px;' }),
        el('p', { text: post.quiz.question, style: 'font-weight: 600; margin-bottom: 12px;' })
      ]);
      var qOpts = el('div', { style: 'display: flex; flex-direction: column; gap: 6px;' });
      (post.quiz.options || []).forEach(function (opt) {
        var btn = el('button', {
          type: 'button',
          class: 'quiz-opt-btn',
          text: (opt.correct ? '✔ ' : '○ ') + opt.text,
          style: opt.correct ? 'font-weight: 700; border-color: #000;' : ''
        });
        qOpts.appendChild(btn);
      });
      qCard.appendChild(qOpts);
      if (post.quiz.explanation) {
        qCard.appendChild(el('p', { text: '💡 ' + post.quiz.explanation, style: 'font-size: 13px; margin-top: 10px; color: #555;' }));
      }
      article.appendChild(qCard);
    }

    // Oração
    if (post.closing_prayer) {
      article.appendChild(el('div', {
        style: 'margin: 20px 0; padding: 16px; background: #f7f7f8; border: 1px solid #e0e0e0; border-radius: 8px; font-style: italic;'
      }, [
        el('h4', { text: 'Oração de Encerramento', style: 'font-style: normal; font-size: 14px; margin-bottom: 6px;' }),
        el('p', { text: post.closing_prayer })
      ]));
    }

    body.appendChild(article);
    $('#agent-modal-preview').hidden = false;
  }

  $('#btn-close-preview-modal').addEventListener('click', function () { $('#agent-modal-preview').hidden = true; });
  $('#btn-modal-close').addEventListener('click', function () { $('#agent-modal-preview').hidden = true; });
  $('#btn-modal-copy-full').addEventListener('click', function () {
    if (currentGeneratedPost) {
      navigator.clipboard.writeText(formatPostForExport(currentGeneratedPost));
      toast('Copiado para a área de transferência!');
    }
  });

  // ------------------------------------------------------------------ Modal de Edição
  function openPostEditModal(post) {
    $('#edit-post-id').value = post.id;
    $('#edit-post-title').value = post.title || '';
    $('#edit-post-subtitle').value = post.subtitle || '';
    $('#edit-post-category').value = post.category || 'versiculo_do_dia';
    $('#edit-post-verse-text').value = post.verse_text || '';
    $('#edit-post-verse-ref').value = post.verse_ref || '';
    $('#edit-post-summary').value = post.summary || '';
    $('#edit-post-status').value = post.status || 'published';
    $('#agent-modal-edit').hidden = false;
  }

  $('#btn-close-edit-modal').addEventListener('click', function () { $('#agent-modal-edit').hidden = true; });
  $('#btn-cancel-edit-modal').addEventListener('click', function () { $('#agent-modal-edit').hidden = true; });

  $('#agent-edit-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var postId = $('#edit-post-id').value;
    var updated = {
      id: postId,
      title: $('#edit-post-title').value.trim(),
      subtitle: $('#edit-post-subtitle').value.trim(),
      category: $('#edit-post-category').value,
      verse_text: $('#edit-post-verse-text').value.trim(),
      verse_ref: $('#edit-post-verse-ref').value.trim(),
      summary: $('#edit-post-summary').value.trim(),
      status: $('#edit-post-status').value
    };

    fetch('/api/agent/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', post: updated })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          toast('Postagem atualizada com sucesso!');
          $('#agent-modal-edit').hidden = true;
          var p = adminAgentPosts.find(function (x) { return x.id === postId; });
          if (p) Object.assign(p, updated);
          updateAgentStats();
          renderAgentPosts();
        } else {
          toast(data.message || 'Erro ao salvar alterações.', true);
        }
      });
  });

  // ------------------------------------------------------------------ Configurações de IA
  function loadAgentConfig() {
    fetch('/api/agent/config')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success && data.config) {
          var c = data.config;
          if (c.provider) $('#agent-cfg-provider').value = c.provider;
          if (c.api_key) $('#agent-cfg-key').value = c.api_key;
          if (c.custom_model) $('#agent-cfg-model').value = c.custom_model;
        }
      });
  }

  $('#agent-config-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var cfg = {
      provider: $('#agent-cfg-provider').value,
      api_key: $('#agent-cfg-key').value.trim(),
      custom_model: $('#agent-cfg-model').value.trim()
    };
    var msg = $('#agent-cfg-msg');
    msg.className = 'msg';
    msg.textContent = 'Salvando…';

    fetch('/api/agent/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          msg.className = 'msg ok';
          msg.textContent = 'Configurações de IA salvas com sucesso!';
          toast('Configurações salvas!');
        } else {
          msg.textContent = data.message || 'Erro ao salvar.';
        }
      });
  });

  $('#btn-agent-test-connection').addEventListener('click', function () {
    var btn = $('#btn-agent-test-connection');
    var msg = $('#agent-cfg-msg');
    btn.disabled = true;
    msg.className = 'msg';
    msg.textContent = 'Testando motor de IA…';

    fetch('/api/agent/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'versiculo_do_dia', auto_publish: false })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        btn.disabled = false;
        if (d.success && d.post) {
          msg.className = 'msg ok';
          msg.textContent = '✔ Teste realizado com sucesso! O motor respondeu normalmente: "' + d.post.title + '"';
          toast('Teste de conexão aprovado!');
        } else {
          msg.textContent = 'Falha no teste: ' + (d.message || 'Sem resposta');
        }
      })
      .catch(function (err) {
        btn.disabled = false;
        msg.textContent = 'Erro ao testar: ' + err.message;
      });
  });

  function formatPostForExport(p) {
    var text = '# ' + p.title + '\n\n';
    if (p.subtitle) text += '*' + p.subtitle + '*\n\n';
    if (p.verse_text) text += '> “' + p.verse_text + '” (' + (p.verse_ref || '') + ')\n\n';
    if (p.summary) text += p.summary + '\n\n';
    (p.sections || []).forEach(function (s) {
      text += '## ' + s.heading + '\n' + s.body + '\n\n';
    });
    if (p.closing_prayer) {
      text += '### Oração\n' + p.closing_prayer + '\n';
    }
    return text;
  }

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
