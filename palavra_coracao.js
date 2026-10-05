/**
 * Palavra para o seu Coração & Últimas Publicações
 * Unoteísmo — Interatividade e Conteúdo Espiritual
 */
(function () {
  'use strict';

  var PALAVRA_DATA = {
    'ansiedade': [
      {
        title: 'Ansiedade — A Paz que Excede Todo o Entendimento',
        icon: '😰',
        verse: 'Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas diante de Deus as vossas petições, pela oração e pela súplica, com ações de graças. E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e as vossas mentes em Cristo Jesus.',
        ref: 'Filipenses 4:6-7',
        message: 'A ansiedade tenta antecipar dores e criar cenários de tempestade antes mesmo do vento soprar. O Criador dos céus e da terra cuida dos lírios do campo e das aves do céu; você tem valor infinito para Ele. Entregue cada preocupação e permita que a serenidade divina preencha o seu ser neste instante.',
        prayer: 'Senhor Deus, acalma o turbilhão dos meus pensamentos. Retira o peso do amanhã que não me pertence e derrama sobre mim a Tua paz inabalável. Amém.'
      },
      {
        title: 'Ansiedade — O Cuidado Pessoal do Criador',
        icon: '😰',
        verse: 'Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.',
        ref: '1 Pedro 5:7',
        message: 'Você não precisa carregar o mundo nos ombros. Há um Deus atento aos mínimos detalhes da sua vida, que conhece cada suspiro antes mesmo de se transformar em palavra. Descanse no Seu amor fiel.',
        prayer: 'Pai Celestial, coloco aos Teus pés cada incerteza e aflição. Ensina-me a confiar no Teu cuidado diário e a repousar seguro em Tuas promessas. Amém.'
      }
    ],

    'familia': [
      {
        title: 'Família — Alicerce de Amor e Proteção Divina',
        icon: '👨‍👩‍👧‍👦',
        verse: 'Eu e a minha casa serviremos ao Senhor.',
        ref: 'Josué 24:15',
        message: 'A família é um projeto sagrado de amor, perdão e aprendizado diário. Mesmo diante de divergências ou momentos difíceis, a graça divina é capaz de restaurar vínculos, curar mágoas e reacender o diálogo sincero no seu lar.',
        prayer: 'Pai Eterno, abençoa a minha família. Coloca Tua proteção sobre cada membro do meu lar, desfaz desentendimentos e enche nossa casa com amor, respeito e sabedoria. Amém.'
      },
      {
        title: 'Família — Harmonia e Suporte Mútuo',
        icon: '👨‍👩‍👧‍👦',
        verse: 'Oh! quão bom e quão suave é que os irmãos vivam em união!',
        ref: 'Salmos 133:1',
        message: 'Onde há amor paciente e compreensão mútua, a presença de Deus se manifesta como orvalho refrescante. Seja o agente de reconciliação e ternura dentro da sua casa hoje.',
        prayer: 'Senhor, dá-me paciência e mansidão para acolher os que amo. Que o nosso lar seja refúgio de paz e exemplo da Tua verdade. Amém.'
      }
    ],

    'cura': [
      {
        title: 'Cura — O Senhor que Restaura Corpo e Alma',
        icon: '🩺',
        verse: 'Cura-me, Senhor, e serei curado; salva-me, e serei salvo; porque tu és o meu louvor.',
        ref: 'Jeremias 17:14',
        message: 'A dor física e a aflição emocional não têm a última palavra sobre a sua vida. O Deus Único é o autor da vida e o restaurador de todas as forças. Confie no Seu poder regenerador que atua no corpo, na mente e no espírito.',
        prayer: 'Senhor Todo-Poderoso, estende a Tua mão restauradora sobre as minhas enfermidades e dores. Traz saúde, vitalidade e refrigério para o meu corpo e paz para a minha alma. Amém.'
      },
      {
        title: 'Cura — A Promessa de Saúde e Refrigério',
        icon: '🩺',
        verse: 'Eis que lhe trarei a ela saúde e cura, e os sararei, e lhes revelarei abundância de paz e de verdade.',
        ref: 'Jeremias 33:6',
        message: 'Deus renova as forças daquele que não tem nenhum vigor. Receba neste momento o refrigério celestial que renova suas células, acalma suas dores e revigora o seu ânimo.',
        prayer: 'Deus de bondade, derrama a Tua virtude sobre cada área do meu ser que necessita de restauração. Creio na Tua misericórdia e no Teu amor que sarará as minhas feridas. Amém.'
      }
    ],

    'protecao': [
      {
        title: 'Proteção — Sob as Asas do Altíssimo',
        icon: '🛡️',
        verse: 'O Senhor é o meu refúgio e a minha fortaleza, o meu Deus, em quem confio. Ele te cobrirá com as suas penas, e sob as suas asas estarás seguro.',
        ref: 'Salmos 91:2, 4',
        message: 'Você não está desamparado em meio aos perigos deste mundo. O Criador dos céus guarda o seu caminhar, vigia o seu sono e frustra todo laço invisível. Caminhe com a certeza inabalável do amparo divino.',
        prayer: 'Deus Eterno, sê o meu escudo e fortaleza. Livra-me do mal, guarda a minha saída e a minha entrada, hoje e para sempre. Em Ti deposito toda a minha segurança. Amém.'
      },
      {
        title: 'Proteção — O Guarda que Nunca Dorme',
        icon: '🛡️',
        verse: 'O Senhor é quem te guarda; o Senhor é a tua sombra à tua direita. O sol não te molestará de dia nem a lua de noite.',
        ref: 'Salmos 121:5-6',
        message: 'Nenhum mal tem permissão para prevalecer contra aquele que se abriga no Todo-Poderoso. O Teu Guardião não cochila nem dorme; Ele cerca os seus passos com anjos mensageiros.',
        prayer: 'Senhor, obrigado por vigiares a minha vida a cada segundo. Blinda a minha mente contra o medo e sê a muralha de fogo ao redor dos meus entes queridos. Amém.'
      }
    ],

    'financas': [
      {
        title: 'Finanças — Sabedoria, Provisão e Dignidade',
        icon: '💰',
        verse: 'O meu Deus suprirá todas as vossas necessidades segundo a sua riqueza em glória.',
        ref: 'Filipenses 4:19',
        message: 'As dificuldades materiais e a escassez passageira não definem o seu destino. Deus honra o trabalho digno, a retidão e a generosidade de coração. Mantenha a serenidade, organize suas forças e confie na providência justa do Criador.',
        prayer: 'Senhor, concede-me sabedoria para administrar os recursos, abre portas de oportunidade e trabalho honesto, e que nunca falte o pão nem a dignidade em minha mesa. Amém.'
      }
    ],

    'casamento': [
      {
        title: 'Casamento — Aliança de Paciência e Cumplicidade',
        icon: '💍',
        verse: 'O amor é paciente, é benigno; o amor não arde em ciúmes, não se ufana, não se ensoberbe... Tudo sofre, tudo crê, tudo espera, tudo suporta.',
        ref: '1 Coríntios 13:4, 7',
        message: 'O verdadeiro amor constrói-se na tolerância mútua, no perdão constante e na renúncia ao egoísmo. Regue o seu relacionamento com palavras de gentileza, carinho e respeito sincero diante de Deus.',
        prayer: 'Senhor Deus, abençoa a minha união matrimonial. Ensina-nos a perdoar, renova o carinho e o respeito mútuo, e sê o centro que sustenta o nosso laço todos os dias. Amém.'
      }
    ],

    'filhos': [
      {
        title: 'Filhos — Herança Preciosa e Futuro de Paz',
        icon: '👶',
        verse: 'Ensina a criança no caminho em que deve andar, e, ainda quando for velho, não se desviará dele.',
        ref: 'Provérbios 22:6',
        message: 'Cada filho é uma dádiva e uma confiança sagrada entregue em suas mãos. Não desanime diante das fases desafiadoras da criação. O exemplo de justiça e as orações perseverantes dos pais têm poder eterno sobre a vida dos filhos.',
        prayer: 'Pai Celestial, consagro meus filhos a Ti. Guarda seus passos, afasta más influências, protege suas mentes e corações, e dá-me discernimento para educá-los no amor e na retidão. Amém.'
      }
    ],

    'trabalho': [
      {
        title: 'Trabalho — Propósito, Honra e Fruto Digno',
        icon: '💼',
        verse: 'Tudo o que fizerdes, fazei-o de todo o coração, como para o Senhor e não para homens.',
        ref: 'Colossenses 3:23',
        message: 'O seu esforço diário não é em vão. Quando você trabalha com dedicação, integridade e retidão, você reflete o caráter de Deus. Mesmo em ambientes desafiadores, sua conduta honrada será luz e abrirá caminhos de vitória.',
        prayer: 'Senhor, abençoa as obras das minhas mãos. Dá-me ânimo, sabedoria nos desafios profissionais e abre caminhos de prosperidade e justiça para o meu sustento. Amém.'
      }
    ],

    'paz': [
      {
        title: 'Paz — A Tranquilidade Interior que o Mundo Não Tira',
        icon: '☮️',
        verse: 'Deixo-vos a paz, a minha paz vos dou; não vo-la dou como a dá o mundo. Não se turbe o vosso coração, nem se atemorize.',
        ref: 'João 14:27',
        message: 'A verdadeira paz não é a ausência de tempestades ao redor, mas a presença tranquila do Deus Único no centro da sua alma. Solte as tensões do mundo e receba o refrigério do Espírito de Deus.',
        prayer: 'Senhor, inunda a minha alma com a Tua paz celeste. Dissipa as aflições, acalma o meu coração e faz-me repousar em segurança sob os Teus cuidados. Amém.'
      }
    ],

    'libertacao': [
      {
        title: 'Libertação — Quebrando Cadeias e Prisões da Alma',
        icon: '⛓️',
        verse: 'Se, pois, o Filho vos libertar, verdadeiramente sereis livres.',
        ref: 'João 8:36',
        message: 'Nenhum vício, trauma, culpa do passado ou peso espiritual é maior do que o poder da Verdade libertadora. Hoje é o tempo de romper com amarras e caminhar em novidade de vida, com dignidade e consciência limpa.',
        prayer: 'Deus de misericórdia, quebra toda cadeia de vício, medo, mágoa e opressão que queira prender a minha vida. Declaro a minha liberdade na Tua verdade eterna. Amém.'
      }
    ],

    'milagre': [
      {
        title: 'Milagre — O Impossível aos Homens é Possível para Deus',
        icon: '✨',
        verse: 'Porque para Deus não há nada impossível.',
        ref: 'Lucas 1:37',
        message: 'Quando as soluções humanas chegam ao fim, a ação extraordinária de Deus começa. Não limite o agir do Criador à sua lógica humana. Aquele que formou o universo do nada pode transformar a sua história em um testemunho vivo.',
        prayer: 'Senhor Todo-Poderoso, coloco diante de Ti o impossível da minha vida. Opera o milagre que preciso para Tua honra e glória, e firma a minha fé inabalável em Ti. Amém.'
      }
    ],

    'gratidao': [
      {
        title: 'Gratidão — A Chave que Multiplica as Bênçãos',
        icon: '🙌',
        verse: 'Em tudo dai graças, porque esta é a vontade de Deus para convosco.',
        ref: '1 Tessalonicenses 5:18',
        message: 'A gratidão transforma o pouco em suficiente e o ordinário em sublime. Ao reconhecer o fôlego de vida e as misericórdias diárias do Criador, seu coração se enche de contentamento, saúde e alegria genuína.',
        prayer: 'Pai Amado, obrigado pela vida, pelo ar que respiro, pela saúde e pelo Teu amor infinito. Louvo o Teu nome não apenas pelo que fazes, mas por quem Tu és: o Único e Fiel Deus. Amém.'
      }
    ],

    'perdao': [
      {
        title: 'Perdão — Libertando o Coração da Amargura',
        icon: '🤝',
        verse: 'Antes sede uns para com os outros benignos, compassivos, perdoando-vos uns aos outros, como também Deus vos perdoou.',
        ref: 'Efésios 4:32',
        message: 'Guardar mágoa é carregar um veneno esperando que o outro sofra. O perdão não justifica o erro alheio, mas liberta a sua alma da prisão da ofensa. Perdoe para ser livre, leve e acolhido pela graça de Deus.',
        prayer: 'Senhor, purifica o meu coração de todo ressentimento. Concede-me força para perdoar aqueles que me feriram e cura as marcas deixadas pela injustiça. Enche-me de amor e misericórdia. Amém.'
      }
    ],

    'forca': [
      {
        title: 'Força — O Poder que Sustenta o Cansado',
        icon: '💪',
        verse: 'Mas os que esperam no Senhor renovam as suas forças, sobem com asas como águias, correm e não se cansam, caminham e não se fatigam.',
        ref: 'Isaías 40:31',
        message: 'Se os seus passos estão pesados e a energia parece esgotada, não confie na força do próprio braço. O Deus que nunca dorme estende a mão para sustentar o abatido e multiplicar o vigor daquele que nEle espera.',
        prayer: 'Deus forte, renova as minhas energias físicas e espirituais. Ergue a minha fronte, afasta o desânimo e capacita-me a vencer cada batalha deste dia com coragem. Amém.'
      }
    ],

    'fe': [
      {
        title: 'Fé — A Certeza Firme das Promessas Divinas',
        icon: '🙏',
        verse: 'Ora, a fé é a certeza das coisas que se esperam, a convicção de fatos que se não veem.',
        ref: 'Hebreus 11:1',
        message: 'A fé bíblica não é ilusão cega, mas a convicção firme no caráter imutável de Deus. Quando a vista natural só enxerga névoa, a fé enxerga a rocha firme sobre a qual os seus pés estão plantados. Persevere!',
        prayer: 'Senhor, aumenta a minha fé. Ajuda-me a confiar em Tua fidelidade mesmo quando as circunstâncias parecerem contrárias. Eu creio no Teu cuidado soberano. Amém.'
      }
    ],

    'esperanca': [
      {
        title: 'Esperança — Âncora Segura para a Alma',
        icon: '🌅',
        verse: 'Temos esta esperança por âncora da alma, segura e firme.',
        ref: 'Hebreus 6:19',
        message: 'A noite mais escura sempre precede o amanhecer radiante. A esperança colocada no Deus Único jamais decepciona. Há um propósito superior sendo gerado em sua caminhada; não desista no meio do caminho.',
        prayer: 'Pai Eterno, reacende a chama da viva esperança em meu peito. Afasta toda desesperança e lembra-me de que o Teu futuro para mim é de paz e vida plena. Amém.'
      }
    ],

    'tristeza': [
      {
        title: 'Tristeza — O Consolo Pessoal do Consolador Divino',
        icon: '😢',
        verse: 'O choro pode durar uma noite, mas a alegria vem pela manhã.',
        ref: 'Salmos 30:5',
        message: 'As suas lágrimas não caem no esquecimento; cada uma delas é conhecida e recolhida pelo Deus de toda consolação. Permita-se ser acolhido pelo abraço do Pai. A dor vai passar e dará lugar a um novo cântico de júbilo.',
        prayer: 'Senhor, coloco diante de Ti a minha dor e o aperto no peito. Enxuga as minhas lágrimas, sara as feridas da minha alma e traz de volta o sorriso e a alegria da Tua salvação. Amém.'
      }
    ],

    'novos_caminhos': [
      {
        title: 'Novos Caminhos — Começos Abençoados e Recomeços',
        icon: '🌄',
        verse: 'Eis que faço coisa nova, que está saindo à luz; porventura não o percebeis? Eis que porei um caminho no deserto e rios no ermo.',
        ref: 'Isaías 43:19',
        message: 'Não fique preso ao que ficou para trás. O ciclo antigo encerrou-se para que o Criador abra novas portas, novos horizontes e relacionamentos frutíferos. Dê o primeiro passo com confiança e deixe Deus conduzir.',
        prayer: 'Deus compassivo, abre caminhos onde não vejo saída. Concede-me coragem para desapegar do passado e discernimento para abraçar com fé a nova estação que preparaste para mim. Amém.'
      }
    ],

    'sabedoria': [
      {
        title: 'Sabedoria — Luz Clara para Decisões Importantes',
        icon: '🦉',
        verse: 'Se algum de vós tem falta de sabedoria, peça-a a Deus, que a todos dá liberalmente e nada lhes impropera; e ser-lhe-á dada.',
        ref: 'Tiago 1:5',
        message: 'Diante de encruzilhadas e decisões difíceis, não se precipite na emoção passageira. A sabedoria do Alto é pura, pacífica, moderada e cheia de bons frutos. Silencie para ouvir a orientação lúcida do Criador.',
        prayer: 'Senhor Deus, concede-me sabedoria divina e clareza mental. Livra-me de escolhas insensatas, ilumina o meu discernimento e guia cada palavra e atitude da minha vida. Amém.'
      }
    ],

    'direcao_de_deus': [
      {
        title: 'Direção de Deus — Passos Guiados pela Mão do Senhor',
        icon: '🧭',
        verse: 'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento. Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas.',
        ref: 'Provérbios 3:5-6',
        message: 'Você não precisa andar às cegas. Quando você submete seus planos a Deus e busca a verdade sem fingimento, Ele aplaina as veredas tortuosas e acende a lâmpada para os seus pés. Descanse na Sua direção soberana.',
        prayer: 'Senhor, coloco todo o meu futuro em Tuas mãos. Endireita os meus caminhos, fecha portas de engano e guia meus passos exatamente para o centro da Tua perfeita vontade. Amém.'
      }
    ]
  };

  var currentTopicKey = null;
  var currentTopicIndex = 0;

  function renderPalavraResult(topicKey, isCycle) {
    var items = PALAVRA_DATA[topicKey];
    if (!items || !items.length) return;

    if (isCycle) {
      currentTopicIndex = (currentTopicIndex + 1) % items.length;
    } else {
      currentTopicIndex = 0;
    }

    var data = items[currentTopicIndex];
    var box = document.getElementById('palavra-result-box');
    if (!box) return;

    var shareText = encodeURIComponent(
      '✨ *Palavra para o seu Coração: ' + data.title + '*\n\n' +
      '📖 _"' + data.verse + '"_ (' + data.ref + ')\n\n' +
      data.message + '\n\n' +
      '🙏 *Oração:* ' + data.prayer + '\n\n' +
      'Encontre mais reflexões de fé e a Bíblia online em: ' + window.location.origin
    );

    box.classList.remove('active');
    setTimeout(function () {
      box.innerHTML = [
        '<div class="palavra-active-content">',
        '  <div class="palavra-active-header">',
        '    <h3 class="palavra-active-title">',
        '      <span class="palavra-icon-badge">' + data.icon + '</span> ' + data.title,
        '    </h3>',
        '  </div>',
        '  <p class="palavra-active-message">' + data.message + '</p>',
        '  <div class="palavra-active-verse-box">',
        '    <blockquote class="palavra-active-quote">“' + data.verse + '”</blockquote>',
        '    <cite class="palavra-active-ref">📖 ' + data.ref + '</cite>',
        '  </div>',
        '  <div class="palavra-active-prayer-box">',
        '    <strong class="prayer-label">🙏 Oração para o seu Momento:</strong>',
        '    <p class="prayer-text">' + data.prayer + '</p>',
        '  </div>',
        '  <div class="palavra-actions-row">',
        '    <button type="button" class="btn-palavra-action btn-palavra-copy" id="btn-palavra-copy">',
        '      <span>📋</span> Copiar Mensagem',
        '    </button>',
        '    <a href="https://api.whatsapp.com/send?text=' + shareText + '" target="_blank" rel="noopener" class="btn-palavra-action btn-palavra-share">',
        '      <span>📲</span> Compartilhar no WhatsApp',
        '    </a>',
        (items.length > 1 ? '    <button type="button" class="btn-palavra-action btn-palavra-cycle" id="btn-palavra-cycle"><span>🔄</span> Outra Mensagem</button>' : ''),
        '  </div>',
        '</div>'
      ].join('\n');

      box.classList.add('active');

      var btnCopy = document.getElementById('btn-palavra-copy');
      if (btnCopy) {
        btnCopy.addEventListener('click', function () {
          var fullText = data.title + '\n\n"' + data.verse + '" (' + data.ref + ')\n\n' + data.message + '\n\nOração: ' + data.prayer;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullText).then(function () {
              btnCopy.innerHTML = '<span>✔</span> Mensagem Copiada!';
              btnCopy.classList.add('copied');
              setTimeout(function () {
                btnCopy.innerHTML = '<span>📋</span> Copiar Mensagem';
                btnCopy.classList.remove('copied');
              }, 2500);
            });
          } else {
            alert('Texto pronto para compartilhar:\n\n' + fullText);
          }
        });
      }

      var btnCycle = document.getElementById('btn-palavra-cycle');
      if (btnCycle) {
        btnCycle.addEventListener('click', function () {
          renderPalavraResult(currentTopicKey, true);
        });
      }
    }, 120);
  }

  function initPalavraCoracao() {
    var buttons = document.querySelectorAll('.palavra-topic-btn');
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var topic = btn.getAttribute('data-topic');
        if (!topic) return;

        buttons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentTopicKey = topic;

        renderPalavraResult(topic, false);

        // Rolagem suave no mobile se o resultado estiver abaixo
        if (window.innerWidth < 768) {
          var box = document.getElementById('palavra-result-box');
          if (box) {
            var rect = box.getBoundingClientRect();
            if (rect.top > window.innerHeight - 150) {
              box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        }
      });
    });
  }

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

  // Sincronização dinâmica de Últimas Publicações com o backend
  function initLatestPostsSync() {
    var grid = document.getElementById('latest-posts-grid');
    if (!grid) return;

    fetch('/api/agent/posts')
      .then(function (res) { return res.json(); })
      .catch(function () {
        return fetch('/posts.json')
          .then(function (r) { return r.json(); })
          .then(function (d) { return { success: true, posts: d }; });
      })
      .then(function (data) {
        var all = (data && data.posts) || [];
        var published = all.filter(function (p) { return p.status === 'published'; });
        if (!published.length) published = all;

        if (published.length > 0) {
          // Atualiza os cards dinamicamente mantendo as capas de cada post
          var recent8 = published.slice(0, 8);
          grid.innerHTML = '';
          recent8.forEach(function (p) {
            var cat = p.category || 'versiculo_do_dia';
            var catSlug = cat.replace(/_/g, '-');
            var slug = p.slug || p.id;
            var url = '/posts/' + catSlug + '/' + slug;
            var defaultCover = CATEGORY_DEFAULT_COVERS[cat] || '/images/posts/cover_devocional_dia.jpg';
            var img = p.image_url || defaultCover;
            var icon = p.category_icon || '📜';
            var sub = p.subtitle || p.summary || '';

            var card = document.createElement('article');
            card.className = 'latest-post-card';
            card.innerHTML = [
              '<a href="' + url + '" class="latest-post-cover-link" aria-label="Ler artigo: ' + escapeHtml(p.title) + '">',
              '  <img src="' + escapeHtml(img) + '" alt="' + escapeHtml(p.title) + '" class="latest-post-img" loading="lazy" onerror="this.onerror=null; this.src=\'' + defaultCover + '\';">',
              '</a>',
              '<div class="latest-post-body">',
              '  <h3 class="latest-post-title">',
              '    <a href="' + url + '">' + escapeHtml(p.title) + '</a>',
              '  </h3>',
              '  <p class="latest-post-snippet">',
              '    <span class="latest-post-icon" aria-hidden="true">' + icon + '</span> ' + escapeHtml(sub),
              '  </p>',
              '  <div class="latest-post-footer">',
              '    <a href="' + url + '" class="latest-post-read-btn">Ler artigo <span class="arrow" aria-hidden="true">→</span></a>',
              '  </div>',
              '</div>'
            ].join('\n');
            grid.appendChild(card);
          });
        }
      })
      .catch(function () {
        // Fallback silencioso mantendo o HTML já renderizado no index.html
      });
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initPalavraCoracao();
      initLatestPostsSync();
    });
  } else {
    initPalavraCoracao();
    initLatestPostsSync();
  }
})();
