/* Comportamentos compartilhados por todas as páginas: menu mobile, "continuar lendo" e service worker. */
(function () {
  'use strict';

  // 1. Menu sanduíche (mobile) e Dropdowns (desktop/mobile)
  var btn = document.getElementById('menu-toggle-btn');
  var menu = document.getElementById('topbar-menu');
  var backdrop = document.getElementById('menu-backdrop');

  function closeAllDropdowns() {
    document.querySelectorAll('.nav-item-dropdown.open').forEach(function (d) {
      d.classList.remove('open');
      var toggle = d.querySelector('.nav-dropdown-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  }

  function setMenu(open) {
    if (!btn || !menu) return;
    menu.classList.toggle('open', open);
    btn.classList.toggle('open', open);
    if (backdrop) backdrop.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      closeAllDropdowns();
    }
  }

  // Suporte a clique nos botões dropdown (para tablets, acessibilidade por toque/teclado)
  document.querySelectorAll('.nav-dropdown-toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var parent = toggle.closest('.nav-item-dropdown');
      if (!parent) return;
      var wasOpen = parent.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) {
        parent.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });

  if (btn && menu) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setMenu(!menu.classList.contains('open'));
    });
    if (backdrop) {
      backdrop.addEventListener('click', function () {
        setMenu(false);
      });
    }
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        setMenu(false);
      }
      if (!e.target.closest('.nav-item-dropdown')) {
        closeAllDropdowns();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (menu.classList.contains('open')) {
          setMenu(false);
          btn.focus();
        } else {
          closeAllDropdowns();
        }
      }
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        setMenu(false);
        closeAllDropdowns();
      });
    });
  }

  // 2. "Continuar de onde parei" (a página da Bíblia grava em unoteismo_last_read)
  var box = document.getElementById('continue-reading');
  if (box) {
    try {
      var last = JSON.parse(localStorage.getItem('unoteismo_last_read') || 'null');
      if (last && last.path && last.label) {
        var a = box.querySelector('a');
        a.setAttribute('href', last.path);
        a.querySelector('.continue-label').textContent = last.label;
        box.hidden = false;
      }
    } catch (e) { /* localStorage indisponível */ }
  }

  // 3. Service worker (só em HTTPS; em desenvolvimento local: localStorage.unoteismo_sw = '1')
  if ('serviceWorker' in navigator) {
    var enabled = location.protocol === 'https:';
    try { enabled = enabled || localStorage.getItem('unoteismo_sw') === '1'; } catch (e) {}
    if (enabled) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
      });
    }
  }
})();
