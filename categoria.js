(function () {
  'use strict';

  var CATEGORIES = {
    'versiculo_do_dia': {
      slug: 'versiculo-do-dia',
      label: 'Versículo do Dia',
      icon: '📜',
      desc: 'Passagens bíblicas selecionadas e reflexões exegéticas profundas para iluminar o seu dia com a Palavra do Deus Único.'
    },
    'palavra_do_dia': {
      slug: 'palavra-do-dia',
      label: 'Palavra do Dia',
      icon: '📖',
      desc: 'Estudo minucioso de termos hebraicos e gregos com reflexões práticas para o seu crescimento espiritual.'
    },
    'salmos_do_dia': {
      slug: 'salmos-do-dia',
      label: 'Salmos do Dia',
      icon: '🕊️',
      desc: 'Cânticos, orações e salmos bíblicos para trazer consolo, refúgio e louvor ao Altíssimo em qualquer momento.'
    },
    'devocional_do_dia': {
      slug: 'devocional-do-dia',
      label: 'Devocional do Dia',
      icon: '✨',
      desc: 'Reflexões diárias práticas que aproximam você do Criador e fortalecem sua caminhada na fé e na verdade.'
    },
    'historias_da_biblia': {
      slug: 'historias-da-biblia',
      label: 'Histórias da Bíblia',
      icon: '🏛️',
      desc: 'Narrativas inspiradoras de fé, providência divina, coragem e perseverança dos servos de Deus ao longo das eras.'
    },
    'curiosidades_biblicas': {
      slug: 'curiosidades-biblicas',
      label: 'Curiosidades Bíblicas',
      icon: '🔍',
      desc: 'Fatos históricos fascinantes, descobertas arqueológicas, costumes da antiguidade e manuscritos sagrados.'
    },
    'ensinamentos_de_jesus': {
      slug: 'ensinamentos-de-jesus',
      label: 'Ensinamentos de Jesus',
      icon: '👑',
      desc: 'As parábolas profundas, os sermões e os preceitos do Messias Yeshua sobre o Reino de Deus e a justiça.'
    },
    'ensino_biblico': {
      slug: 'ensino-biblico',
      label: 'Ensino Bíblico',
      icon: '📚',
      desc: 'Estudos teológicos e doutrinários fundamentados na verdade sobre o Deus Único e Sua aliança eterna.'
    }
  };

  var CATEGORY_DEFAULT_COVERS = {
    'versiculo_do_dia': '/images/posts/cover_versiculo_dia_1791173917229.jpg',
    'palavra_do_dia': '/images/posts/cover_palavra_dia_1791173939501.jpg',
    'salmos_do_dia': '/images/posts/cover_salmos_dia_1791173964006.jpg',
    'devocional_do_dia': '/images/posts/cover_devocional_dia.jpg',
    'historias_da_biblia': '/images/posts/cover_historias_biblia.jpg',
    'curiosidades_biblicas': '/images/posts/cover_curiosidades_biblicas.jpg',
    'ensinamentos_de_jesus': '/images/posts/cover_ensinamentos_jesus.jpg',
    'ensino_biblico': '/images/posts/cover_ensino_biblico.jpg'
  };

  // Map slug to category key
  var SLUG_TO_KEY = {};
  Object.keys(CATEGORIES).forEach(function (k) {
    SLUG_TO_KEY[CATEGORIES[k].slug] = k;
    SLUG_TO_KEY[k] = k;
  });

  var state = {
    currentCatKey: 'devocional_do_dia',
    currentPostSlug: null,
    posts: [],
    filteredPosts: []
  };

  function parseUrlState() {
    var path = window.location.pathname.replace(/\/+$/, '');
    var parts = path.split('/').filter(Boolean); // e.g. ['posts', 'devocional-do-dia', 'post-slug']
    var params = new URLSearchParams(window.location.search);

    var catParam = params.get('cat') || params.get('categoria') || params.get('tema');
    var postParam = params.get('post') || params.get('slug');

    var catKey = null;
    var postSlug = null;

    if (parts.length >= 2 && parts[0] === 'posts') {
      var catSlug = parts[1];
      if (SLUG_TO_KEY[catSlug]) catKey = SLUG_TO_KEY[catSlug];
      if (parts.length >= 3) {
        postSlug = parts[2];
      }
    }

    if (!catKey && catParam && SLUG_TO_KEY[catParam]) {
      catKey = SLUG_TO_KEY[catParam];
    }

    if (!catKey) {
      catKey = 'devocional_do_dia';
    }

    if (postParam) {
      postSlug = postParam;
    }

    return { catKey: catKey, postSlug: postSlug };
  }

  function fetchPosts() {
    return fetch('/api/agent/posts')
      .then(function (res) {
        if (!res.ok) throw new Error('API status ' + res.status);
        return res.json();
      })
      .then(function (data) {
        return (data && data.posts) || [];
      })
      .catch(function () {
        return fetch('/posts.json')
          .then(function (r) {
            if (!r.ok) throw new Error('posts.json not found');
            return r.json();
          })
          .then(function (d) {
            return Array.isArray(d) ? d : [];
          })
          .catch(function () {
            return fetch('/data/posts.json')
              .then(function (r2) { return r2.json(); })
              .then(function (d2) { return Array.isArray(d2) ? d2 : []; })
              .catch(function () { return []; });
          });
      });
  }

  function renderCategoryHeader(catKey, totalCount) {
    var meta = CATEGORIES[catKey] || CATEGORIES['devocional_do_dia'];
    document.title = meta.label + ' — Unoteísmo';

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', meta.desc);

    var crumbEl = document.getElementById('ci-crumb-current');
    if (crumbEl) crumbEl.textContent = meta.label;

    var iconEl = document.getElementById('ci-hero-icon');
    if (iconEl) iconEl.textContent = meta.icon;

    var titleEl = document.getElementById('ci-hero-title');
    if (titleEl) titleEl.textContent = meta.label;

    var descEl = document.getElementById('ci-hero-desc');
    if (descEl) descEl.textContent = meta.desc;

    var badgeEl = document.getElementById('ci-hero-badge');
    if (badgeEl) {
      badgeEl.textContent = '✦ ' + totalCount + (totalCount === 1 ? ' postagem' : ' postagens');
    }

    // Update active tab in pills
    var tabs = document.querySelectorAll('.ci-cat-tab');
    tabs.forEach(function (tab) {
      var tabCat = tab.getAttribute('data-cat');
      if (tabCat === catKey) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      } else {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      }
    });
  }

  function renderPostsGrid(posts) {
    var gridEl = document.getElementById('posts-grid');
    var emptyEl = document.getElementById('posts-empty');
    var countEl = document.getElementById('ci-results-count');

    if (!gridEl) return;

    if (countEl) {
      countEl.textContent = posts.length + (posts.length === 1 ? ' postagem encontrada' : ' postagens encontradas');
    }

    if (!posts || posts.length === 0) {
      gridEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    var meta = CATEGORIES[state.currentCatKey] || CATEGORIES['devocional_do_dia'];
    var html = '';

    posts.forEach(function (post) {
      var catMeta = CATEGORIES[post.category] || meta;
      var dateStr = post.date || (post.created_at ? post.created_at.split('T')[0] : 'Hoje');
      var verseBadge = post.verse_ref ? '<span class="ci-card-verse-badge">📖 ' + post.verse_ref + '</span>' : '';
      var postUrl = '/posts/' + catMeta.slug + '/' + (post.slug || post.id);

      var defaultCover = CATEGORY_DEFAULT_COVERS[post.category] || '/images/posts/cover_devocional_dia.jpg';
      var coverImg = post.image_url || defaultCover;

      html += '<article class="ci-card" data-slug="' + (post.slug || post.id) + '" onclick="window.abrirPost(\'' + (post.slug || post.id) + '\', event)">';
      
      // Capa da Postagem
      html += '<div class="ci-card-cover-wrap">';
      html += '  <img src="' + escapeHtml(coverImg) + '" alt="' + escapeHtml(post.title) + '" class="ci-card-cover-img" loading="lazy" onerror="this.onerror=null; this.src=\'' + defaultCover + '\';">';
      html += '</div>';

      // Header decorativo
      html += '<div class="ci-card-header">';
      html += '  <span class="ci-card-cat-badge">' + catMeta.icon + ' ' + catMeta.label + '</span>';
      html += verseBadge;
      html += '</div>';

      // Corpo
      html += '<div class="ci-card-body">';
      html += '  <div class="ci-card-meta">';
      html += '    <span>📅 ' + dateStr + '</span>';
      html += '    <span>⏱️ 3 min</span>';
      html += '  </div>';
      html += '  <h3>' + escapeHtml(post.title) + '</h3>';
      html += '  <p class="ci-snippet">' + escapeHtml(post.summary || (post.sections && post.sections[0] ? post.sections[0].body : '')) + '</p>';
      html += '</div>';

      // Rodapé
      html += '<div class="ci-footer">';
      html += '  <span class="ci-read-btn">Ler post completo →</span>';
      
      var shareText = encodeURIComponent(post.title + ' — ' + post.summary + '\n' + window.location.origin + postUrl);
      html += '  <a href="https://api.whatsapp.com/send?text=' + shareText + '" target="_blank" rel="noopener" class="ci-share-btn" title="Compartilhar no WhatsApp" onclick="event.stopPropagation()">';
      html += '    <svg viewBox="0 0 24 24" width="16" height="16" fill="white" aria-hidden="true"><path d="M12.01 2.01c-5.52 0-9.99 4.47-9.99 9.99 0 1.95.55 3.76 1.49 5.3L2 22l4.83-1.48c1.51.9 3.26 1.41 5.16 1.41 5.52 0 9.99-4.47 9.99-9.99 0-5.52-4.47-9.99-9.99-9.99zm5.46 14.26c-.24.68-1.39 1.3-1.92 1.37-.51.07-1.18.2-3.37-.7-2.65-1.09-4.34-3.79-4.47-3.96-.13-.17-1.07-1.42-1.07-2.7 0-1.28.66-1.91.89-2.16.23-.25.5-.31.67-.31.17 0 .34 0 .48.01.15.01.35-.06.54.41.2.48.67 1.63.73 1.76.06.13.1.28.02.45-.08.17-.12.28-.24.41-.12.14-.25.3-.35.41-.12.12-.24.25-.1.5.14.25.62 1.03 1.33 1.66.91.82 1.68 1.07 1.93 1.19.25.12.39.1.54-.07.15-.17.65-.75.82-1.04.17-.29.17-.5.12-.67z"/></svg>';
      html += '  </a>';
      html += '</div>';

      html += '</article>';
    });

    gridEl.innerHTML = html;
  }

  function renderPostDetail(post) {
    var viewWrap = document.getElementById('post-detail-view');
    var listWrap = document.getElementById('category-list-view');

    if (!viewWrap || !listWrap) return;

    listWrap.style.display = 'none';
    viewWrap.style.display = 'block';

    var catMeta = CATEGORIES[post.category] || CATEGORIES['devocional_do_dia'];
    document.title = post.title + ' — ' + catMeta.label + ' — Unoteísmo';

    var dateStr = post.date || (post.created_at ? post.created_at.split('T')[0] : 'Hoje');
    var postUrl = window.location.origin + '/posts/' + catMeta.slug + '/' + (post.slug || post.id);

    var html = '';

    // Botão Voltar
    html += '<a href="/posts/' + catMeta.slug + '/" class="btn-post-back" onclick="window.voltarParaLista(event)">← Voltar para todos os posts de ' + catMeta.label + '</a>';

    // Artigo Principal
    html += '<article class="post-article">';
    
    // Cabeçalho
    html += '<header class="post-header">';
    html += '  <div class="post-header-meta">';
    html += '    <span class="post-cat-pill">' + catMeta.icon + ' ' + catMeta.label + '</span>';
    html += '    <span class="post-date-badge">📅 ' + dateStr + '</span>';
    html += '    <span class="post-time-badge">⏱️ 4 min de leitura</span>';
    html += '  </div>';
    html += '  <h1 class="post-title">' + escapeHtml(post.title) + '</h1>';
    if (post.subtitle) {
      html += '  <p class="post-subtitle">' + escapeHtml(post.subtitle) + '</p>';
    }
    html += '</header>';

    // Imagem de Capa do Artigo
    var defaultCover = CATEGORY_DEFAULT_COVERS[post.category] || '/images/posts/cover_devocional_dia.jpg';
    var coverImg = post.image_url || defaultCover;
    html += '<div class="post-cover-wrap">';
    html += '  <img src="' + escapeHtml(coverImg) + '" alt="' + escapeHtml(post.title) + '" class="post-cover-img" onerror="this.onerror=null; this.src=\'' + defaultCover + '\';">';
    html += '</div>';

    // Versículo de Destaque
    if (post.verse_text) {
      html += '<blockquote class="post-scripture-quote">';
      html += '  <p>“' + escapeHtml(post.verse_text) + '”</p>';
      if (post.verse_ref) {
        html += '  <cite>— ' + escapeHtml(post.verse_ref) + '</cite>';
      }
      html += '</blockquote>';
    }

    // Resumo
    if (post.summary) {
      html += '<div class="post-summary-box">';
      html += '  <strong>Síntese:</strong> ' + escapeHtml(post.summary);
      html += '</div>';
    }

    // Seções
    if (post.sections && post.sections.length) {
      post.sections.forEach(function (sec) {
        html += '<div class="post-section">';
        html += '  <h3>' + escapeHtml(sec.heading) + '</h3>';
        html += '  <p>' + escapeHtml(sec.body) + '</p>';
        html += '</div>';
      });
    }

    // Tabela Comparativa / Teológica
    if (post.table_headers && post.table_headers.length && post.table_rows && post.table_rows.length) {
      html += '<div class="post-table-wrap">';
      html += '  <h4 class="post-table-title">' + escapeHtml(post.table_title || 'Quadro Temático Bíblico') + '</h4>';
      html += '  <div class="post-table-container">';
      html += '    <table class="post-table">';
      html += '      <thead><tr>';
      post.table_headers.forEach(function (h) {
        html += '<th>' + escapeHtml(h) + '</th>';
      });
      html += '      </tr></thead><tbody>';
      post.table_rows.forEach(function (row) {
        html += '<tr>';
        row.forEach(function (cell) {
          html += '<td>' + escapeHtml(cell) + '</td>';
        });
        html += '</tr>';
      });
      html += '      </tbody></table>';
      html += '  </div>';
      html += '</div>';
    }

    // Quiz Interativo
    if (post.quiz && post.quiz.question && post.quiz.options && post.quiz.options.length) {
      html += '<div class="post-quiz-box">';
      html += '  <h4 class="post-quiz-title"><span>💡</span> Quiz Bíblico de Fixação</h4>';
      html += '  <p class="post-quiz-question">' + escapeHtml(post.quiz.question) + '</p>';
      html += '  <div class="post-quiz-options">';
      post.quiz.options.forEach(function (opt) {
        html += '    <button type="button" class="post-quiz-btn" data-correct="' + (opt.correct ? '1' : '0') + '" onclick="window.responderQuizPost(this)">' + escapeHtml(opt.text) + '</button>';
      });
      html += '  </div>';
      if (post.quiz.explanation) {
        html += '  <div class="post-quiz-explanation" style="display:none;">';
        html += '    <strong>Explicação:</strong> ' + escapeHtml(post.quiz.explanation);
        html += '  </div>';
      }
      html += '</div>';
    }

    // Oração de Encerramento
    if (post.closing_prayer) {
      html += '<div class="post-prayer-box">';
      html += '  <h4 class="post-prayer-title"><span>🙏</span> Oração de Encerramento</h4>';
      html += '  <p class="post-prayer-text">' + escapeHtml(post.closing_prayer) + '</p>';
      html += '</div>';
    }

    // Barra de Compartilhamento e CTA
    var shareMsg = encodeURIComponent(post.title + '\n' + post.summary + '\n' + postUrl);
    html += '<footer class="post-actions-bar">';
    html += '  <div class="post-share-group">';
    html += '    <span>Compartilhar:</span>';
    html += '    <a href="https://api.whatsapp.com/send?text=' + shareMsg + '" target="_blank" rel="noopener" class="btn-share-social btn-share-whatsapp">WhatsApp</a>';
    html += '    <a href="https://t.me/share/url?url=' + encodeURIComponent(postUrl) + '&text=' + encodeURIComponent(post.title) + '" target="_blank" rel="noopener" class="btn-share-social" style="background:#0088cc;color:#fff;">Telegram</a>';
    html += '    <button type="button" class="btn-share-social btn-share-copy" onclick="window.copiarLinkPost(\'' + postUrl + '\')">📋 Copiar Link</button>';
    html += '  </div>';
    html += '  <a href="/biblia" class="btn-bible-cta">📖 Abrir na Bíblia Online →</a>';
    html += '</footer>';

    html += '</article>';

    // Postagens Relacionadas
    var related = state.posts.filter(function (p) {
      return p.category === post.category && (p.slug || p.id) !== (post.slug || post.id);
    }).slice(0, 3);

    if (related.length > 0) {
      html += '<section class="post-related-section">';
      html += '  <h3 class="post-related-title">Outros Posts em ' + catMeta.label + '</h3>';
      html += '  <div class="ci-grid">';
      related.forEach(function (rel) {
        var rUrl = '/posts/' + catMeta.slug + '/' + (rel.slug || rel.id);
        var rDefaultCover = CATEGORY_DEFAULT_COVERS[rel.category] || '/images/posts/cover_devocional_dia.jpg';
        var rCoverImg = rel.image_url || rDefaultCover;
        html += '<article class="ci-card" onclick="window.abrirPost(\'' + (rel.slug || rel.id) + '\', event)">';
        html += '<div class="ci-card-cover-wrap">';
        html += '  <img src="' + escapeHtml(rCoverImg) + '" alt="' + escapeHtml(rel.title) + '" class="ci-card-cover-img" loading="lazy" onerror="this.onerror=null; this.src=\'' + rDefaultCover + '\';">';
        html += '</div>';
        html += '  <div class="ci-card-header">';
        html += '    <span class="ci-card-cat-badge">' + catMeta.icon + ' ' + catMeta.label + '</span>';
        if (rel.verse_ref) html += '<span class="ci-card-verse-badge">📖 ' + rel.verse_ref + '</span>';
        html += '  </div>';
        html += '  <div class="ci-card-body">';
        html += '    <h3>' + escapeHtml(rel.title) + '</h3>';
        html += '    <p class="ci-snippet">' + escapeHtml(rel.summary || '') + '</p>';
        html += '  </div>';
        html += '  <div class="ci-footer">';
        html += '    <span class="ci-read-btn">Ler post →</span>';
        html += '  </div>';
        html += '</article>';
      });
      html += '  </div>';
      html += '</section>';
    }

    viewWrap.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.abrirPost = function (slugOrId, ev) {
    if (ev) ev.preventDefault();
    var post = state.posts.find(function (p) {
      return (p.slug || p.id) === slugOrId || p.id === slugOrId;
    });
    if (!post) return;

    state.currentPostSlug = slugOrId;
    var catMeta = CATEGORIES[post.category] || CATEGORIES['devocional_do_dia'];
    var newUrl = '/posts/' + catMeta.slug + '/' + (post.slug || post.id);

    try {
      window.history.pushState({ postSlug: slugOrId, catKey: post.category }, '', newUrl);
    } catch (_) {}

    renderPostDetail(post);
  };

  window.voltarParaLista = function (ev) {
    if (ev) ev.preventDefault();
    state.currentPostSlug = null;
    var catMeta = CATEGORIES[state.currentCatKey] || CATEGORIES['devocional_do_dia'];
    var newUrl = '/posts/' + catMeta.slug + '/';

    try {
      window.history.pushState({ catKey: state.currentCatKey }, '', newUrl);
    } catch (_) {}

    var viewWrap = document.getElementById('post-detail-view');
    var listWrap = document.getElementById('category-list-view');
    if (viewWrap) viewWrap.style.display = 'none';
    if (listWrap) listWrap.style.display = 'block';

    document.title = catMeta.label + ' — Unoteísmo';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.trocarCategoria = function (catKey, ev) {
    if (ev) ev.preventDefault();
    if (!CATEGORIES[catKey]) return;

    state.currentCatKey = catKey;
    state.currentPostSlug = null;
    var meta = CATEGORIES[catKey];
    var newUrl = '/posts/' + meta.slug + '/';

    try {
      window.history.pushState({ catKey: catKey }, '', newUrl);
    } catch (_) {}

    var viewWrap = document.getElementById('post-detail-view');
    var listWrap = document.getElementById('category-list-view');
    if (viewWrap) viewWrap.style.display = 'none';
    if (listWrap) listWrap.style.display = 'block';

    var searchInput = document.getElementById('ci-search-input');
    if (searchInput) searchInput.value = '';

    filterAndRender();
  };

  window.responderQuizPost = function (btn) {
    var container = btn.closest('.post-quiz-options');
    if (!container) return;
    var all = container.querySelectorAll('.post-quiz-btn');
    all.forEach(function (b) { b.disabled = true; });

    var isCorrect = btn.getAttribute('data-correct') === '1';
    if (isCorrect) {
      btn.classList.add('correct');
    } else {
      btn.classList.add('wrong');
      all.forEach(function (b) {
        if (b.getAttribute('data-correct') === '1') b.classList.add('correct');
      });
    }

    var exp = container.parentNode.querySelector('.post-quiz-explanation');
    if (exp) exp.style.display = 'block';
  };

  window.copiarLinkPost = function (url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        alert('Link copiado para a área de transferência!');
      });
    } else {
      prompt('Copie o link:', url);
    }
  };

  function filterAndRender() {
    var catPosts = state.posts.filter(function (p) {
      return p.category === state.currentCatKey;
    });

    var searchInput = document.getElementById('ci-search-input');
    var query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    if (query) {
      state.filteredPosts = catPosts.filter(function (p) {
        var t = (p.title || '').toLowerCase();
        var s = (p.summary || '').toLowerCase();
        var v = (p.verse_text || '').toLowerCase() + ' ' + (p.verse_ref || '').toLowerCase();
        return t.indexOf(query) !== -1 || s.indexOf(query) !== -1 || v.indexOf(query) !== -1;
      });
    } else {
      state.filteredPosts = catPosts;
    }

    renderCategoryHeader(state.currentCatKey, catPosts.length);
    renderPostsGrid(state.filteredPosts);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.addEventListener('popstate', function () {
    var u = parseUrlState();
    state.currentCatKey = u.catKey;
    state.currentPostSlug = u.postSlug;

    if (state.currentPostSlug) {
      var found = state.posts.find(function (p) {
        return (p.slug || p.id) === state.currentPostSlug || p.id === state.currentPostSlug;
      });
      if (found) {
        renderPostDetail(found);
        return;
      }
    }

    var viewWrap = document.getElementById('post-detail-view');
    var listWrap = document.getElementById('category-list-view');
    if (viewWrap) viewWrap.style.display = 'none';
    if (listWrap) listWrap.style.display = 'block';

    filterAndRender();
  });

  // Inicialização
  document.addEventListener('DOMContentLoaded', function () {
    var u = parseUrlState();
    state.currentCatKey = u.catKey;
    state.currentPostSlug = u.postSlug;

    // Search input listener
    var searchInput = document.getElementById('ci-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterAndRender();
      });
    }

    // Carregar postagens do backend
    fetchPosts().then(function (allPosts) {
      state.posts = allPosts;

      if (state.currentPostSlug) {
        var post = state.posts.find(function (p) {
          return (p.slug || p.id) === state.currentPostSlug || p.id === state.currentPostSlug;
        });
        if (post) {
          state.currentCatKey = post.category || state.currentCatKey;
          renderCategoryHeader(state.currentCatKey, state.posts.filter(function (p) { return p.category === state.currentCatKey; }).length);
          renderPostDetail(post);
          return;
        }
      }

      filterAndRender();
    });
  });

})();
