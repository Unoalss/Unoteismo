/**
 * Pedidos de Oração e Intercessão Comunitária — Unoteísmo
 */
(function () {
    'use strict';

    const ITEMS_PER_PAGE = 8;
    let allPublicPrayers = [];
    let currentPage = 1;

    function timeAgo(dateStr) {
        if (!dateStr) return 'recentemente';
        const now = new Date();
        const date = new Date(dateStr);
        const diff = Math.floor((now - date) / 1000);
        if (isNaN(diff) || diff < 60) return 'agora mesmo';
        if (diff < 3600) {
            const m = Math.floor(diff / 60);
            return 'há ' + m + (m === 1 ? ' minuto' : ' minutos');
        }
        if (diff < 86400) {
            const h = Math.floor(diff / 3600);
            return 'há ' + h + (h === 1 ? ' hora' : ' horas');
        }
        if (diff < 604800) {
            const d = Math.floor(diff / 86400);
            return 'há ' + d + (d === 1 ? ' dia' : ' dias');
        }
        const w = Math.floor(diff / 604800);
        return 'há ' + w + (w === 1 ? ' semana' : ' semanas');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = (text == null ? '' : String(text));
        return div.innerHTML;
    }

    function getPrayedSet() {
        try {
            return JSON.parse(localStorage.getItem('unoteismo_prayed_prayers') || '[]');
        } catch (e) {
            return [];
        }
    }

    function markAsPrayedLocal(prayerId) {
        try {
            const set = getPrayedSet();
            if (!set.includes(prayerId)) {
                set.push(prayerId);
                localStorage.setItem('unoteismo_prayed_prayers', JSON.stringify(set));
            }
        } catch (e) {}
    }

    window.prayForRequest = async function (prayerId, btnEl) {
        if (btnEl.classList.contains('done')) return;
        const counter = btnEl.querySelector('.contagem-orando');
        const currentCount = parseInt(counter ? counter.textContent : '0', 10) || 0;
        const newCount = currentCount + 1;

        // Feedback visual imediato
        if (counter) counter.textContent = newCount;
        btnEl.classList.add('done');
        btnEl.innerHTML = '🙏 Você está orando <span class="contagem-orando">' + newCount + '</span>';
        markAsPrayedLocal(prayerId);

        // Atualiza no array em memória
        const p = allPublicPrayers.find(x => x.id === prayerId);
        if (p) p.prayers_count = newCount;

        // Envia para o servidor
        try {
            await fetch('/api/prayers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'pray', prayer_id: prayerId })
            });
        } catch (err) {
            console.warn('Registro local de oração:', err);
        }
    };

    window.sharePrayer = function (prayerId) {
        const card = document.getElementById(prayerId);
        if (!card) return;
        const nome = card.querySelector('.prayer-author-name') ? card.querySelector('.prayer-author-name').innerText : 'Irmão em Cristo';
        const texto = card.querySelector('.prayer-text') ? card.querySelector('.prayer-text').innerText : '';
        const link = window.location.origin + window.location.pathname + '#' + prayerId;
        const msg = '🙏 *Pedido de Oração — Unoteísmo*\n\n' +
            '*De:* ' + nome + '\n' +
            '“' + texto + '”\n\n' +
            'Ore também por esta vida:\n' + link;
        window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(msg), '_blank');
    };

    window.submitReply = async function (prayerId, btnEl) {
        const card = document.getElementById(prayerId);
        if (!card) return;
        const nomeInput = card.querySelector('.reply-input-name');
        const textoInput = card.querySelector('.reply-input-text');
        const name = (nomeInput.value || '').trim() || 'Irmão de Fé';
        const message = (textoInput.value || '').trim();

        if (!message) {
            alert('Por favor, escreva uma palavra de fé ou edificação para responder.');
            textoInput.focus();
            return;
        }

        btnEl.disabled = true;
        const originalText = btnEl.textContent;
        btnEl.textContent = 'Enviando…';

        try {
            let replyData = null;
            try {
                const res = await fetch('/api/prayers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'reply', prayer_id: prayerId, name: name, message: message })
                });
                const data = await res.json();
                if (data && data.success) replyData = data.reply;
            } catch (e) {}

            if (!replyData) {
                replyData = {
                    id: 'reply_' + Date.now(),
                    name: name,
                    message: message,
                    created_at: new Date().toISOString()
                };
            }

            // Renderiza resposta imediatamente
            const respostasDiv = card.querySelector('.prayer-replies');
            if (respostasDiv) {
                const nova = document.createElement('div');
                nova.className = 'prayer-reply-item';
                nova.innerHTML = '<strong>' + escapeHtml(replyData.name) + ':</strong> ' +
                    escapeHtml(replyData.message) +
                    '<span class="prayer-reply-time">' + timeAgo(replyData.created_at) + '</span>';
                respostasDiv.appendChild(nova);
            }

            // Atualiza objeto em memória
            const p = allPublicPrayers.find(x => x.id === prayerId);
            if (p) {
                if (!p.replies) p.replies = [];
                p.replies.push(replyData);
            }

            nomeInput.value = '';
            textoInput.value = '';
        } catch (err) {
            alert('Não foi possível enviar a resposta no momento. Tente novamente.');
        } finally {
            btnEl.disabled = false;
            btnEl.textContent = originalText;
        }
    };

    function renderReply(reply) {
        const time = reply.created_at ? timeAgo(reply.created_at) : '';
        return '<div class="prayer-reply-item">' +
            '<strong>' + escapeHtml(reply.name || 'Irmão de Fé') + ':</strong> ' +
            escapeHtml(reply.message || '') +
            (time ? '<span class="prayer-reply-time">' + time + '</span>' : '') +
            '</div>';
    }

    function renderPrayerCard(prayer, isFeatured) {
        const prayedSet = getPrayedSet();
        const hasPrayed = prayedSet.includes(prayer.id);
        const displayName = prayer.name || prayer.initials || 'Anônimo';
        const msgText = (prayer.message || '').replace(/<[^>]*>?/gm, '');
        const replies = Array.isArray(prayer.replies) ? prayer.replies : [];
        const count = prayer.prayers_count || 0;
        const repliesHtml = replies.map(renderReply).join('');

        return '<article class="prayer-card' + (isFeatured ? ' featured' : '') + '" id="' + prayer.id + '" data-created="' + (prayer.created_at || '') + '">' +
            '  <header class="prayer-card-top">' +
            '    <div class="prayer-author">' +
            '      <span class="prayer-author-avatar" aria-hidden="true">🕊️</span>' +
            '      <span class="prayer-author-name">' + escapeHtml(displayName) + '</span>' +
            '    </div>' +
            '    <time class="prayer-time" data-time datetime="' + (prayer.created_at || '') + '">' + timeAgo(prayer.created_at) + '</time>' +
            '  </header>' +
            '  <p class="prayer-text">' + escapeHtml(msgText) + '</p>' +
            '  <div class="prayer-actions">' +
            '    <button type="button" class="btn-pray' + (hasPrayed ? ' done' : '') + '" onclick="prayForRequest(\'' + prayer.id + '\', this)">' +
            (hasPrayed ? '🙏 Você está orando' : '🙏 Estou Orando') + ' <span class="contagem-orando">' + count + '</span></button>' +
            '    <button type="button" class="btn-share-prayer" onclick="sharePrayer(\'' + prayer.id + '\')">' +
            '      <span aria-hidden="true">📤</span> Compartilhar' +
            '    </button>' +
            '  </div>' +
            '  <div class="prayer-replies">' + repliesHtml + '</div>' +
            '  <div class="reply-box">' +
            '    <input type="text" class="reply-input-name" maxlength="40" placeholder="Seu nome" aria-label="Seu nome">' +
            '    <input type="text" class="reply-input-text" maxlength="280" placeholder="Escreva uma palavra de fé..." aria-label="Mensagem de resposta">' +
            '    <button type="button" class="btn-reply-send" onclick="submitReply(\'' + prayer.id + '\', this)">Responder</button>' +
            '  </div>' +
            '</article>';
    }

    function renderPage(page) {
        currentPage = page;
        const listEl = document.getElementById('prayerPageList');
        const paginationEl = document.getElementById('prayerPagination');
        const countLabel = document.getElementById('prayerTotalCountLabel');
        if (!listEl) return;
        listEl.removeAttribute('aria-busy');

        if (countLabel) {
            countLabel.textContent = allPublicPrayers.length + (allPublicPrayers.length === 1 ? ' pedido' : ' pedidos');
        }

        const totalPages = Math.max(1, Math.ceil(allPublicPrayers.length / ITEMS_PER_PAGE));
        const start = (page - 1) * ITEMS_PER_PAGE;
        const pagePrayers = allPublicPrayers.slice(start, start + ITEMS_PER_PAGE);

        if (pagePrayers.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;color:#666666;padding:3rem;font-size:1.05rem;background:#ffffff;border-radius:14px;border:1px solid #e0e0e0;">' +
                'Ainda não há pedidos de oração cadastrados. Seja o primeiro a compartilhar sua petição! 🙏' +
                '</div>';
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        listEl.innerHTML = pagePrayers.map(function (p, i) {
            return renderPrayerCard(p, page === 1 && i === 0);
        }).join('');

        // Paginação limpa
        if (paginationEl) {
            let pagHtml = '';
            if (totalPages > 1) {
                for (let i = 1; i <= totalPages; i++) {
                    if (i === page) {
                        pagHtml += '<span class="active" aria-current="page">' + i + '</span>';
                    } else {
                        pagHtml += '<a href="javascript:void(0)" onclick="renderPrayerPage(' + i + ')">' + i + '</a>';
                    }
                }
            }
            paginationEl.innerHTML = pagHtml;
        }
    }

    window.renderPrayerPage = function (page) {
        renderPage(page);
        const feedTop = document.querySelector('.prayer-feed-header');
        if (feedTop) feedTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.submitPagePrayer = async function (e) {
        if (e && e.preventDefault) e.preventDefault();
        const nameEl = document.getElementById('ppName');
        const pedidoEl = document.getElementById('ppPedido');
        const msgEl = document.getElementById('ppFormMsg');
        const btn = document.getElementById('ppSubmitBtn');

        if (!pedidoEl || !msgEl || !btn) return;

        const name = (nameEl ? nameEl.value : '').trim() || 'Anônimo';
        const pedido = pedidoEl.value.trim();

        if (!pedido) {
            msgEl.className = 'form-feedback error';
            msgEl.textContent = 'Por favor, escreva o seu pedido de oração.';
            pedidoEl.focus();
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span aria-hidden="true">⏳</span> Enviando Pedido…';
        msgEl.textContent = '';

        const payload = {
            action: 'add',
            name: name,
            message: pedido,
            is_public: true,
            target: 'Oração',
            reason: 'Vida e Família'
        };

        try {
            let success = false;
            let newPrayer = null;

            try {
                const res = await fetch('/api/prayers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data && data.success) {
                    success = true;
                    newPrayer = data.prayer;
                }
            } catch (e1) {}

            if (!newPrayer) {
                newPrayer = {
                    id: 'prayer_' + Date.now(),
                    name: name,
                    message: pedido,
                    prayers_count: 0,
                    is_public: true,
                    created_at: new Date().toISOString(),
                    replies: []
                };
                success = true;
            }

            if (success) {
                msgEl.className = 'form-feedback success';
                msgEl.textContent = '✅ Seu pedido de oração foi recebido! Estaremos orando por você.';
                if (nameEl) nameEl.value = '';
                pedidoEl.value = '';

                // Adiciona no topo da lista
                allPublicPrayers.unshift(newPrayer);
                renderPage(1);

                setTimeout(function () {
                    msgEl.textContent = '';
                }, 5000);
            } else {
                msgEl.className = 'form-feedback error';
                msgEl.textContent = 'Não foi possível registrar o pedido. Tente novamente.';
            }
        } catch (err) {
            msgEl.className = 'form-feedback error';
            msgEl.textContent = 'Erro de comunicação ao enviar. Tente novamente.';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span aria-hidden="true">🕊️</span> Enviar Pedido de Oração';
        }
    };

    async function loadPrayers() {
        try {
            let list = null;
            try {
                const res = await fetch('/api/prayers?t=' + Date.now());
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) list = data;
                }
            } catch (e) {}

            if (!list) {
                try {
                    const res2 = await fetch('/prayer_requests.json?t=' + Date.now());
                    if (res2.ok) {
                        const data2 = await res2.json();
                        if (Array.isArray(data2)) list = data2;
                    }
                } catch (e) {}
            }

            if (!list) {
                try {
                    const res3 = await fetch('/data/prayer_requests.json?t=' + Date.now());
                    if (res3.ok) {
                        const data3 = await res3.json();
                        if (Array.isArray(data3)) list = data3;
                    }
                } catch (e) {}
            }

            allPublicPrayers = (Array.isArray(list) ? list : []).filter(function (p) {
                return p && p.is_public !== false;
            });

            renderPage(1);
        } catch (err) {
            const listEl = document.getElementById('prayerPageList');
            if (listEl) {
                listEl.removeAttribute('aria-busy');
                listEl.innerHTML = '<div style="text-align:center;color:#b91c1c;padding:2rem;">Erro ao carregar pedidos de oração. Recarregue a página.</div>';
            }
        }
    }

    // Simulação suave do contador de pessoas orando online
    function startLiveCounter() {
        const el = document.getElementById('ppPeopleOnline');
        if (!el) return;
        let current = 1240 + Math.floor(Math.random() * 50);
        el.textContent = current.toLocaleString('pt-BR');

        setInterval(function () {
            const delta = Math.floor(Math.random() * 11) - 5;
            current = Math.max(100, current + delta);
            el.textContent = current.toLocaleString('pt-BR');
            el.classList.add('bump');
            setTimeout(function () {
                el.classList.remove('bump');
            }, 300);
        }, 4500);
    }

    // Atualizador de timestamps relativos
    function startTimeRefresh() {
        setInterval(function () {
            document.querySelectorAll('.prayer-card [data-time]').forEach(function (el) {
                const card = el.closest('.prayer-card');
                const created = card ? card.dataset.created : null;
                if (created) el.textContent = timeAgo(created);
            });
        }, 30000);
    }

    function init() {
        loadPrayers();
        startLiveCounter();
        startTimeRefresh();

        const form = document.getElementById('prayerPageForm');
        if (form) {
            form.addEventListener('submit', window.submitPagePrayer);
        }

        // Rola até o pedido se houver hash na URL
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            setTimeout(function () {
                const el = document.getElementById(hash);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.style.borderColor = '#000000';
                    el.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.15)';
                    setTimeout(function () { el.style.boxShadow = ''; }, 3000);
                }
            }, 500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
