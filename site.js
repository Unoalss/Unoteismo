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

  // 4. Alternador de testamentos (Seção Bíblia na Home)
  window.mostrarTestamento = function (id, el) {
    var panels = document.querySelectorAll('.bb-testamento');
    var tabs = document.querySelectorAll('.bb-tab');
    panels.forEach(function (p) {
      p.classList.remove('bb-active');
    });
    tabs.forEach(function (t) {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    var target = document.getElementById('bb-' + id);
    if (target) {
      target.classList.add('bb-active');
    }
    if (el) {
      el.classList.add('active');
      el.setAttribute('aria-selected', 'true');
    }
  };
  window.alternarTestamento = window.mostrarTestamento;

  // 5. Resposta do Céu (Modal interativo)
  var MENSAGENS_DO_CEU = [
    { texto: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a destra da minha justiça.", ref: "Isaías 41:10" },
    { texto: "Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.", ref: "Salmos 37:5" },
    { texto: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", ref: "Mateus 11:28" },
    { texto: "O Senhor é o meu pastor; de nada terei falta. Ele me faz repousar em verdes pastos e me guia a águas tranquilas.", ref: "Salmos 23:1-2" },
    { texto: "Pois eu bem sei os planos que tenho para vós, diz o Senhor; planos de paz e não de mal, para vos dar um futuro e uma esperança.", ref: "Jeremias 29:11" },
    { texto: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
    { texto: "Confie no Senhor de todo o seu coração e não se apoie no seu próprio entendimento; reconheça-o em todos os seus caminhos, e ele endireitará as suas veredas.", ref: "Provérbios 3:5-6" },
    { texto: "A paz vos deixo, a minha paz vos dou; não vo-la dou como o mundo a dá. Não se turbe o vosso coração, nem se atemorize.", ref: "João 14:27" },
    { texto: "Deus é o nosso refúgio e fortaleza, socorro bem presente nas tribulações.", ref: "Salmos 46:1" },
    { texto: "Porque para Deus nada é impossível.", ref: "Lucas 1:37" },
    { texto: "Mil poderão cair ao teu lado, e dez mil à tua direita; mas tu não serás atingido.", ref: "Salmos 91:7" },
    { texto: "O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e tenha misericórdia de ti.", ref: "Números 6:24-25" }
  ];

  var currentMsg = null;

  window.abrirRespostaDoCeu = function () {
    var modal = document.getElementById('modal-resposta-ceu');
    var txtEl = document.getElementById('modal-resposta-texto');
    var refEl = document.getElementById('modal-resposta-ref');
    if (!modal) return;
    var idx = Math.floor(Math.random() * MENSAGENS_DO_CEU.length);
    currentMsg = MENSAGENS_DO_CEU[idx];
    if (txtEl) txtEl.textContent = '“' + currentMsg.texto + '”';
    if (refEl) refEl.textContent = currentMsg.ref;
    modal.removeAttribute('hidden');
    modal.hidden = false;
    modal.style.display = 'flex';
    requestAnimationFrame(function () {
      modal.classList.add('open');
    });
    document.body.style.overflow = 'hidden';
  };

  window.fecharRespostaDoCeu = function () {
    var modal = document.getElementById('modal-resposta-ceu');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(function () {
      modal.hidden = true;
      modal.setAttribute('hidden', '');
      modal.style.display = 'none';
    }, 200);
    document.body.style.overflow = '';
  };

  window.compartilharRespostaWhatsApp = function () {
    if (!currentMsg) return;
    var url = window.location.origin;
    var msg = '🕊️ *Resposta do Céu*\n\n' + '“' + currentMsg.texto + '”\n— ' + currentMsg.ref + '\n\nReceba também sua palavra:\n' + url;
    window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(msg), '_blank');
  };

  // Inicializa listeners diretos para Resposta do Céu
  function initRespostaDoCeu() {
    var btn = document.getElementById('btn-resposta-ceu');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        window.abrirRespostaDoCeu();
      });
    }
    var modal = document.getElementById('modal-resposta-ceu');
    if (modal) {
      var closeBtns = modal.querySelectorAll('.modal-resposta-close, .btn-modal-close');
      closeBtns.forEach(function (cb) {
        cb.addEventListener('click', function (e) {
          e.preventDefault();
          window.fecharRespostaDoCeu();
        });
      });
      var shareBtn = document.getElementById('btn-compartilhar-resposta');
      if (shareBtn) {
        shareBtn.addEventListener('click', function (e) {
          e.preventDefault();
          window.compartilharRespostaWhatsApp();
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRespostaDoCeu);
  } else {
    initRespostaDoCeu();
  }

  // Fecha o modal ao clicar fora ou apertar Esc
  document.addEventListener('click', function (e) {
    var modal = document.getElementById('modal-resposta-ceu');
    if (modal && modal.classList.contains('open') && e.target === modal) {
      window.fecharRespostaDoCeu();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('modal-resposta-ceu');
      if (modal && modal.classList.contains('open')) {
        window.fecharRespostaDoCeu();
      }
    }
  });

  // 6. Quiz Box (Qual é o seu momento de fé hoje?)
  var QUIZ_MOMENTOS = {
    ansiedade: {
      titulo: "🕊️ Resultado: Você precisa da paz de Deus",
      texto: "Sua alma combina com salmos calmantes, orações de paz e reflexões sobre a confiança e o descanso seguro em Deus.",
      linkTexto: "📖 Continue lendo no Unoteísmo e receba a Palavra e o discernimento para você."
    },
    forca: {
      titulo: "💪 Resultado: Renove suas forças",
      texto: "Você combina com salmos de fortalecimento, passagens sobre a perseverança da fé e reflexões de coragem diante dos desafios.",
      linkTexto: "📖 Continue lendo no Unoteísmo e receba a Palavra e o discernimento para você."
    },
    gratidao: {
      titulo: "🙌 Resultado: Coração agradecido",
      texto: "Você combina com salmos de louvor, cânticos de celebração e testemunhos da fidelidade e soberania do Eterno.",
      linkTexto: "📖 Continue lendo no Unoteísmo e receba a Palavra e o discernimento para você."
    },
    milagre: {
      titulo: "✨ Resultado: Tempo de esperança e milagre",
      texto: "Você combina com a Resposta do Céu, relatos do poder do Altíssimo e palavras inspiradas de edificação e fé.",
      linkTexto: "📖 Continue lendo no Unoteísmo e receba a Palavra e o discernimento para você."
    }
  };

  window.showQuizResult = function (type, btn) {
    var resultEl = document.getElementById("quizResult");
    if (!resultEl) return;

    var allBtns = document.querySelectorAll(".quiz-option-btn");
    allBtns.forEach(function (b) { b.classList.remove("selected"); });
    if (btn) btn.classList.add("selected");

    var res = QUIZ_MOMENTOS[type] || QUIZ_MOMENTOS.ansiedade;
    resultEl.innerHTML = '' +
      '<div class="quiz-result-header">' + res.titulo + '</div>' +
      '<p class="quiz-result-text">' + res.texto + '</p>' +
      '<a href="/biblia" class="quiz-result-link">' + res.linkTexto + '</a>';
    resultEl.hidden = false;
    resultEl.style.display = "block";
  };

  // 7. Modal Leitor dos 8 Temas Principais
  var TEMAS_CAT_META = {
    'versiculo_do_dia': { label: 'Versículo do Dia', icon: '📜' },
    'palavra_do_dia': { label: 'Palavra do Dia', icon: '📖' },
    'salmos_do_dia': { label: 'Salmos do Dia', icon: '🕊️' },
    'devocional_do_dia': { label: 'Devocional do Dia', icon: '☀️' },
    'historias_da_biblia': { label: 'Histórias da Bíblia', icon: '🏛️' },
    'curiosidades_biblicas': { label: 'Curiosidades Bíblicas', icon: '🔍' },
    'ensinamentos_de_jesus': { label: 'Ensinamentos de Jesus', icon: '👑' },
    'ensino_biblico': { label: 'Ensino Bíblico', icon: '📚' }
  };

  function renderPostInModal(post) {
    var titleEl = document.getElementById('modal-tema-title');
    var subEl = document.getElementById('modal-tema-subtitle');
    var bodyEl = document.getElementById('modal-tema-body');

    titleEl.textContent = post.title;
    subEl.textContent = post.subtitle || '';

    var html = '';

    // Versículo
    if (post.verse_text) {
      html += '<blockquote>';
      html += '<p>“' + post.verse_text + '”</p>';
      if (post.verse_ref) html += '<cite>— ' + post.verse_ref + '</cite>';
      html += '</blockquote>';
    }

    // Resumo
    if (post.summary) {
      html += '<p style="margin: 16px 0; font-size: 15.5px; color: #222;">' + post.summary + '</p>';
    }

    // Seções
    if (post.sections && post.sections.length) {
      post.sections.forEach(function (s) {
        html += '<div class="modal-tema-section">';
        html += '<h4>' + s.heading + '</h4>';
        html += '<p>' + s.body + '</p>';
        html += '</div>';
      });
    }

    // Tabela
    if (post.table_headers && post.table_headers.length && post.table_rows && post.table_rows.length) {
      html += '<div class="modal-tema-table-wrap">';
      html += '<h4>' + (post.table_title || 'Quadro Temático Bíblico') + '</h4>';
      html += '<div style="overflow-x: auto;"><table><thead><tr>';
      post.table_headers.forEach(function (h) { html += '<th>' + h + '</th>'; });
      html += '</tr></thead><tbody>';
      post.table_rows.forEach(function (row) {
        html += '<tr>';
        row.forEach(function (c) { html += '<td>' + c + '</td>'; });
        html += '</tr>';
      });
      html += '</tbody></table></div></div>';
    }

    // Quiz interativo
    if (post.quiz && post.quiz.question && post.quiz.options && post.quiz.options.length) {
      html += '<div style="margin: 22px 0; background: #fafafa; border: 1px solid #000; border-radius: 8px; padding: 18px;">';
      html += '<h4 style="font-size: 15px; font-weight: 700; color: #000; margin-bottom: 8px;">Quiz Bíblico de Fixação</h4>';
      html += '<p style="font-weight: 600; font-size: 14.5px; margin-bottom: 12px; color: #111;">' + post.quiz.question + '</p>';
      html += '<div class="theme-modal-quiz-options" style="display: flex; flex-direction: column; gap: 8px;">';
      post.quiz.options.forEach(function (opt, idx) {
        html += '<button type="button" class="quiz-opt-btn theme-modal-opt" data-correct="' + (opt.correct ? '1' : '0') + '" onclick="verificarQuizModal(this)">' + opt.text + '</button>';
      });
      html += '</div>';
      if (post.quiz.explanation) {
        html += '<p class="theme-modal-exp" style="display: none; margin-top: 10px; font-size: 13px; color: #444; background: #eee; padding: 8px 12px; border-radius: 6px;">💡 ' + post.quiz.explanation + '</p>';
      }
      html += '</div>';
    }

    // Oração
    if (post.closing_prayer) {
      html += '<div class="modal-tema-prayer">';
      html += '<h4 style="font-style: normal; font-size: 14.5px; font-weight: 700; color: #000; margin-bottom: 6px;">Oração de Encerramento</h4>';
      html += '<p>' + post.closing_prayer + '</p>';
      html += '</div>';
    }

    bodyEl.innerHTML = html;
  }

  window.verificarQuizModal = function (btn) {
    var container = btn.closest('.theme-modal-quiz-options');
    if (!container) return;
    var all = container.querySelectorAll('.theme-modal-opt');
    all.forEach(function (b) { b.disabled = true; });

    var isCorrect = btn.getAttribute('data-correct') === '1';
    if (isCorrect) {
      btn.classList.add('correct');
    } else {
      btn.classList.add('incorrect');
      all.forEach(function (b) {
        if (b.getAttribute('data-correct') === '1') b.classList.add('correct');
      });
    }

    var exp = container.parentNode.querySelector('.theme-modal-exp');
    if (exp) exp.style.display = 'block';
  };

  window.abrirTemaModal = function (cat) {
    var modal = document.getElementById('modal-tema-leitor');
    if (!modal) return;
    var meta = TEMAS_CAT_META[cat] || { label: 'Tema Bíblico', icon: '📖' };
    var badgeEl = document.getElementById('modal-tema-badge');
    var titleEl = document.getElementById('modal-tema-title');
    var subEl = document.getElementById('modal-tema-subtitle');
    var bodyEl = document.getElementById('modal-tema-body');

    badgeEl.textContent = meta.icon + ' ' + meta.label;
    titleEl.textContent = 'Carregando ' + meta.label + '…';
    subEl.textContent = '';
    bodyEl.innerHTML = '<p style="text-align: center; padding: 2.5rem; color: #666;">Buscando conteúdo inspirado…</p>';

    modal.hidden = false;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    fetch('/api/agent/posts')
      .then(function (res) {
        if (!res.ok) throw new Error('API status ' + res.status);
        return res.json();
      })
      .catch(function () {
        return fetch('/posts.json')
          .then(function (r) {
            if (!r.ok) throw new Error('posts.json not found');
            return r.json();
          })
          .then(function (d) {
            return { success: true, posts: Array.isArray(d) ? d : [] };
          })
          .catch(function () {
            return fetch('/data/posts.json')
              .then(function (r2) { return r2.json(); })
              .then(function (d2) {
                return { success: true, posts: Array.isArray(d2) ? d2 : [] };
              });
          });
      })
      .then(function (data) {
        var posts = (data && data.posts) || [];
        var matching = posts.filter(function (p) { return p.category === cat && p.status === 'published'; });
        if (!matching.length) {
          matching = posts.filter(function (p) { return p.category === cat; });
        }
        var post = matching[0];
        if (!post) {
          titleEl.textContent = meta.label;
          bodyEl.innerHTML = '<p style="text-align: center; padding: 2rem;">Ainda não há postagens publicadas nesta categoria. Você pode gerá-las no Painel Administrativo com o Agente IA.</p>';
          return;
        }
        renderPostInModal(post);
      })
      .catch(function () {
        bodyEl.innerHTML = '<p style="text-align: center; padding: 2rem; color: #c62828;">Não foi possível carregar o conteúdo no momento.</p>';
      });
  };

  window.fecharTemaModal = function () {
    var modal = document.getElementById('modal-tema-leitor');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(function () {
      modal.hidden = true;
      document.body.style.overflow = '';
    }, 200);
  };

  document.addEventListener('click', function (e) {
    var modal = document.getElementById('modal-tema-leitor');
    if (modal && modal.classList.contains('open') && e.target === modal) {
      window.fecharTemaModal();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('modal-tema-leitor');
      if (modal && modal.classList.contains('open')) {
        window.fecharTemaModal();
      }
    }
  });
})();


