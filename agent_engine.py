"""Módulo do Agente IA para o Unoteísmo — Geração e Gestão de Conteúdo Bíblico.
Compatível com o agente de referência do site Bíblia, adaptado para as 8 categorias oficiais:
1. Versículo do Dia (versiculo_do_dia)
2. Palavra do Dia (palavra_do_dia)
3. Salmos do Dia (salmos_do_dia)
4. Devocional do Dia (devocional_do_dia)
5. Histórias da Bíblia (historias_da_biblia)
6. Curiosidades Bíblicas (curiosidades_biblicas)
7. Ensinamentos de Jesus (ensinamentos_de_jesus)
8. Ensino Bíblico (ensino_biblico)
"""
import datetime
import json
import os
import random
import re
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
POSTS_FILE_DATA = os.path.join(ROOT, 'data', 'posts.json')
POSTS_FILE_ROOT = os.path.join(ROOT, 'posts.json')
CONFIG_FILE_DATA = os.path.join(ROOT, 'data', 'agent_config.json')
CONFIG_FILE_ROOT = os.path.join(ROOT, 'agent_config.json')

CATEGORIES = {
    'versiculo_do_dia': {
        'id': 'versiculo_do_dia',
        'label': 'Versículo do Dia',
        'icon': '📜',
        'desc': 'Passagem bíblica em destaque com exegese imediata, contexto e aplicação prática.',
    },
    'palavra_do_dia': {
        'id': 'palavra_do_dia',
        'label': 'Palavra do Dia',
        'icon': '📖',
        'desc': 'Estudo aprofundado do significado no hebraico ou grego original (ex: Shalom, Hesed, Emunah).',
    },
    'salmos_do_dia': {
        'id': 'salmos_do_dia',
        'label': 'Salmos do Dia',
        'icon': '🕊️',
        'desc': 'Hinos poéticos de consolo, renovação espiritual, gratidão e louvor ao Deus Único.',
    },
    'devocional_do_dia': {
        'id': 'devocional_do_dia',
        'label': 'Devocional do Dia',
        'icon': '☀️',
        'desc': 'Reflexão pastoral inspiradora para enfrentar os desafios do cotidiano com fé.',
    },
    'historias_da_biblia': {
        'id': 'historias_da_biblia',
        'label': 'Histórias da Bíblia',
        'icon': '🏛️',
        'desc': 'Narrativas marcantes de homens e mulheres de fé, lições de coragem e providência.',
    },
    'curiosidades_biblicas': {
        'id': 'curiosidades_biblicas',
        'label': 'Curiosidades Bíblicas',
        'icon': '🔍',
        'desc': 'Fatos históricos, arqueologia, costumes dos tempos bíblicos e manuscritos antigos.',
    },
    'ensinamentos_de_jesus': {
        'id': 'ensinamentos_de_jesus',
        'label': 'Ensinamentos de Jesus',
        'icon': '👑',
        'desc': 'As parábolas, sermões e mandamentos do Messias Yeshua sobre o Reino de Deus.',
    },
    'ensino_biblico': {
        'id': 'ensino_biblico',
        'label': 'Ensino Bíblico',
        'icon': '📚',
        'desc': 'Exposição doutrinária e teológica séria alinhada à verdade bíblica do Deus Único.',
    },
}

# -----------------------------------------------------------------------------
# BANCO DE DADOS DE TEMAS E CONTEÚDOS PARA GERAÇÃO TEOLÓGICA INTELIGENTE
# -----------------------------------------------------------------------------
KNOWLEDGE_BANK = {
    'versiculo_do_dia': [
        {
            'topic': 'A Paz que Excede Todo Entendimento',
            'title': 'Versículo do Dia: A Paz que Guarda o Vosso Coração',
            'subtitle': 'A serenidade que brota da oração com ações de graças perante o Criador.',
            'verse_text': 'E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos sentimentos em Cristo Jesus.',
            'verse_ref': 'Filipenses 4:7',
            'summary': 'Uma meditação sobre como a entrega confiante das ansiedades a Deus transforma o tumulto interior em paz inabalável.',
            'sections': [
                {'heading': '🕊️ A Promessa no Cárcere Romano', 'body': 'O apóstolo Paulo escreveu estas palavras enquanto se encontrava preso em Roma, demonstrando que a paz bíblica não é a ausência de problemas externos, mas a presença constante da proteção divina sobre a alma.'},
                {'heading': '🛡️ O Sentinela Divino da Mente', 'body': 'O verbo grego phrouresei traduzido por "guardará" evoca a imagem de uma guarnição militar protegendo uma fortaleza contra ataques. É a paz de Deus que patrulha nossos pensamentos contra o pânico.'},
                {'heading': '🌱 Vivendo Filipenses 4:7 Hoje', 'body': 'Sempre que a inquietação bater à porta, apresente em oração sincera cada detalhe da sua vida ao Pai Celestial, acompanhado de gratidão genuína por suas bênçãos.'}
            ],
            'table_title': 'Contrastes entre a Paz Humana e a Paz de Deus',
            'table_headers': ['Aspecto', 'Paz do Mundo', 'Paz de Deus (Filipenses 4:7)'],
            'table_rows': [
                ['Fundamento', 'Circunstâncias externas favoráveis', 'A fidelidade imutável do Deus Único'],
                ['Duração', 'Passageira e volátil', 'Constante e protetora'],
                ['Alcance', 'Apenas sensação passageira', 'Guarda tanto as emoções quanto a razão'],
                ['Condição', 'Depende de ausência de conflitos', 'Opera no meio da tribulação'],
                ['Fonte', 'Segurança material ilusória', 'Comunhão viva em Cristo Jesus']
            ],
            'quiz': {
                'question': 'O que o texto de Filipenses 4:7 diz que a paz de Deus faz com os nossos corações?',
                'options': [
                    {'text': 'Isola-nos de qualquer convívio social', 'correct': False},
                    {'text': 'Guardará os vossos corações e sentimentos em Cristo Jesus', 'correct': True},
                    {'text': 'Garante prosperidade financeira automática', 'correct': False},
                    {'text': 'Elimina instantaneamente todas as obrigações do dia', 'correct': False}
                ],
                'explanation': 'Paulo afirma que a paz de Deus funciona como um sentinela divino guardando mente e emoções.'
            },
            'reflections': [
                {'title': '🤲 Entrega Total:', 'text': 'Qual preocupação você ainda hesita em depositar inteiramente nas mãos de Deus?'},
                {'title': '🌿 Gratidão Ativa:', 'text': 'Agradeça por 3 bênçãos recebidas antes de fazer qualquer novo pedido hoje.'},
                {'title': '🎯 Foco na Promessa:', 'text': 'A paz divina supera a lógica humana e estabiliza o espírito.'}
            ],
            'closing_prayer': 'Pai de amor e misericórdia, derrama a Tua paz que excede todo entendimento sobre as nossas mentes e corações. Silencia as vozes do medo e ensina-nos a descansar sob o Teu cuidado soberano. Em Yeshua, amém.'
        },
        {
            'topic': 'Confiança de Todo o Coração em Provérbios 3:5',
            'title': 'Versículo do Dia: Confia no Senhor de Todo o Teu Coração',
            'subtitle': 'A renúncia à autossuficiência e a entrega dos rumos da vida à sabedoria divina.',
            'verse_text': 'Confia no Senhor de todo o teu coração, e não te estribes no teu próprio entendimento.',
            'verse_ref': 'Provérbios 3:5',
            'summary': 'Entenda por que a sabedoria bíblica nos convida a fundamentar nossos passos na direção do Deus Altíssimo, superando a miopia da lógica puramente humana.',
            'sections': [
                {'heading': '📜 O Conselho da Sabedoria Hebraica', 'body': 'Salomão sintetiza um dos maiores paradoxos da vida espiritual: a verdadeira inteligência começa com a humildade de admitir que a nossa visão finita não é capaz de prever o amanhã.'},
                {'heading': '⚠️ O Perigo do Próprio Entendimento', 'body': '"Estribar-se" significa apoiar todo o peso do corpo sobre uma bengala frágil. Confiar apenas em recursos próprios ou opiniões do momento nos torna vulneráveis a ilusões.'},
                {'heading': '🧭 Reconhecendo a Deus em Todos os Caminhos', 'body': 'O versículo seguinte completa: "Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas". Consultar o Senhor antes de decisões financeiras, relacionais e vocacionais traz segurança.'}
            ],
            'table_title': 'Consequências da Confiança versus Autossuficiência',
            'table_headers': ['Área da Vida', 'Baseada no Próprio Entendimento', 'Baseada na Confiança no Senhor'],
            'table_rows': [
                ['Tomada de Decisão', 'Ansiedade e precipitação', 'Oração e discernimento sereno'],
                ['Crises Inesperadas', 'Desespero e revolta', 'Firmeza e esperança na providência'],
                ['Relacionamentos', 'Interesse próprio e exigências', 'Misericórdia e justiça bíblica'],
                ['Futuro', 'Medo do desconhecido', 'Certeza da fidelidade do Criador'],
                ['Ética Diária', 'Relativismo de conveniência', 'Obediência aos mandamentos eternos']
            ],
            'quiz': {
                'question': 'Conforme Provérbios 3:5, em que NÃO devemos nos estribar?',
                'options': [
                    {'text': 'Na Lei de Deus', 'correct': False},
                    {'text': 'No conselho de pessoas sábias', 'correct': False},
                    {'text': 'No nosso próprio entendimento', 'correct': True},
                    {'text': 'Na bondade do Criador', 'correct': False}
                ],
                'explanation': 'O texto adverte claramente contra a armadilha do orgulho intelectual: "não te estribes no teu próprio entendimento".'
            },
            'reflections': [
                {'title': '🔍 Humildade Diária:', 'text': 'Você tem consultado a Deus antes de tomar suas decisões importantes?'},
                {'title': '🧭 Direção Segura:', 'text': 'Deus tem o poder de endireitar caminhos que pareciam tortuosos.'},
                {'title': '🤝 Fé Prática:', 'text': 'Confiança não é passividade, mas caminhar obedecendo à verdade revelada.'}
            ],
            'closing_prayer': 'Eterno Deus e soberano Senhor, reconhecemos que a Tua sabedoria é infinitamente mais alta que os nossos pensamentos. Guia os nossos passos e guarda o nosso coração de toda autossuficiência. Em Cristo Jesus, amém.'
        }
    ],
    'palavra_do_dia': [
        {
            'topic': 'A Palavra Shalom (שָׁלוֹם)',
            'title': 'A Palavra do Dia: Shalom — A Integridade e Plenitude de Deus',
            'subtitle': 'A etimologia hebraica revela que paz é muito mais do que ausência de guerra.',
            'verse_text': 'Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá. Não se turbe o vosso coração, nem se atemorize.',
            'verse_ref': 'João 14:27',
            'summary': 'Mergulhe no significado do termo hebraico Shalom e descubra como a plenitude de vida concedida pelo Deus Único restaura o ser humano integralmente.',
            'sections': [
                {'heading': '📖 Raiz Linguística e Conceito', 'body': 'Shalom deriva da raiz shalam, que denota completude, inteireza e restauração. Quando alguém desejava Shalom na Bíblia, pedia que Deus restaurasse qualquer parte quebrada da vida daquela pessoa.'},
                {'heading': '🕊️ Shalom em Relação ao Criador', 'body': 'O unoteísmo ensina que a harmonia com o Deus Único é a fonte primária de onde fluem a paz com o próximo e a harmonia consigo mesmo. Sem alinhamento com a verdade divina, a paz é apenas ilusão temporária.'},
                {'heading': '🌱 Semeando Shalom', 'body': 'Ser pacificador envolve reparar relacionamentos danificados, defender os injustiçados e falar a verdade com mansidão e coragem.'}
            ],
            'table_title': 'Dimensões Bíblicas da Palavra Shalom',
            'table_headers': ['Dimensão', 'Texto Bíblico', 'Impacto na Vida Diária'],
            'table_rows': [
                ['Paz com Deus', 'Romanos 5:1', 'Reconciliação e descanso da consciência'],
                ['Paz Interior', 'Isaías 26:3', 'Estabilidade mental mesmo sob pressão'],
                ['Paz com o Próximo', 'Romanos 12:18', 'Busca ativa da convivência pacífica'],
                ['Bênção Sacerdotal', 'Números 6:26', 'A face do Senhor resplandecendo sobre nós'],
                ['Paz do Messias', 'João 14:27', 'Esperança viva que dissipa o medo']
            ],
            'quiz': {
                'question': 'Qual é o sentido original da raiz hebraica da qual se origina a palavra Shalom?',
                'options': [
                    {'text': 'Silêncio absoluto e isolamento total', 'correct': False},
                    {'text': 'Completude, integridade, restauração e plenitude', 'correct': True},
                    {'text': 'Derrota temporária de um inimigo', 'correct': False},
                    {'text': 'Uma fórmula mágica sem base moral', 'correct': False}
                ],
                'explanation': 'A raiz shalam significa estar completo, são, integrado e restaurado perante o Criador.'
            },
            'reflections': [
                {'title': '🤝 Reconciliação:', 'text': 'Existe algum laço familiar ou de amizade que precisa ser restaurado por meio do perdão hoje?'},
                {'title': '🕊️ Calma Interior:', 'text': 'Não permita que o barulho das preocupações roube o Shalom que vem do Pai.'},
                {'title': '🌿 Integridade:', 'text': 'Viva de forma transparente diante de Deus e dos homens.'}
            ],
            'closing_prayer': 'Senhor Deus da Paz, Tu que és a fonte de todo Shalom, enche a nossa casa e os nossos pensamentos com a Tua serenidade. Faze de nós instrumentos de reconciliação e justiça no mundo. Amém.'
        },
        {
            'topic': 'A Palavra Emunah (אֱמוּנָה)',
            'title': 'A Palavra do Dia: Emunah — A Fé que se Traduz em Fidelidade Prática',
            'subtitle': 'A compreensão hebraica de fé como firmeza inabalável e obediência contínua.',
            'verse_text': 'Mas o justo viverá da sua fé (emunah).',
            'verse_ref': 'Habacuque 2:4',
            'summary': 'Explore o conceito bíblico de Emunah e compreenda por que a fé nas Escrituras é sinônimo de lealdade ativa, perseverança e confiança comprovada por ações.',
            'sections': [
                {'heading': '📖 Da Estabilidade à Fé', 'body': 'No pensamento grego clássico, fé muitas vezes denotava concordância intelectual com um conjunto de ideias. No hebraico, Emunah vem da raiz aman (que também gera Amém), significando solidez, firmeza e confiabilidade.'},
                {'heading': '🧗 A Rocha que Dá Sustentação', 'body': 'Ter Emunah não é um sentimento volátil; é permanecer de pé sobre a rocha da verdade mesmo quando o vento sopra forte. Moisés, quando orava no topo da colina com os braços sustentados, viu suas mãos ficarem "emunah" (firmes) até o pôr do sol (Êxodo 17:12).'},
                {'heading': '🚶 Vivendo da Fé Diária', 'body': 'Viver por Emunah significa cumprir a palavra empenhada, ser honesto nas negociações e manter a lealdade a Deus independente das circunstâncias.'}
            ],
            'table_title': 'Comparações entre Compreensões de Fé',
            'table_headers': ['Aspecto', 'Fé Apenas Conceitual', 'Emunah Bíblica (Habacuque 2:4)'],
            'table_rows': [
                ['Natureza', 'Mero assentimento de ideias', 'Compromisso leal e contínuo de vida'],
                ['Evidência', 'Palavras sem transformação', 'Obras de justiça e misericórdia'],
                ['Na Dificuldade', 'Abandona convicções com facilidade', 'Permanece firme e perseverante'],
                ['Relação com Deus', 'Busca de bênçãos egoístas', 'Entrega total ao Criador Soberano'],
                ['Expressão', 'Discursos teóricos', 'Fidelidade nas pequenas tarefas cotidianas']
            ],
            'quiz': {
                'question': 'O que significa a palavra hebraica "Emunah" no contexto de Habacuque 2:4?',
                'options': [
                    {'text': 'Uma aposta arriscada no escuro', 'correct': False},
                    {'text': 'Firmeza, fidelidade estável e lealdade comprovada a Deus', 'correct': True},
                    {'text': 'Um ritual de adivinhação do futuro', 'correct': False},
                    {'text': 'Apenas uma opinião pessoal sem compromisso moral', 'correct': False}
                ],
                'explanation': 'Emunah expressa estabilidade de caráter, fidelidade e lealdade firme fundamentada na palavra divina.'
            },
            'reflections': [
                {'title': '🧱 Firmeza Ética:', 'text': 'Sua conduta permanece a mesma em público e em particular?'},
                {'title': '🛡️ Confiança Estável:', 'text': 'Quando o socorro parece demorar, mantenha-se leal ao Deus que não mente.'},
                {'title': '🤝 Confiabilidade:', 'text': 'Seja alguém em cuja palavra as outras pessoas possam confiar com segurança.'}
            ],
            'closing_prayer': 'Deus de verdade e fidelidade, cuja fidelidade estende-se de geração em geração, concede-nos a graça de uma fé firme e operosa. Que a nossa vida manifeste fidelidade aos Teus santos preceitos todos os dias. Em Yeshua, amém.'
        }
    ],
    'salmos_do_dia': [
        {
            'topic': 'O Senhor é o Meu Pastor (Salmo 23)',
            'title': 'Salmos do Dia: Salmo 23 — O Cuidado Pessoal do Pastor de Israel',
            'subtitle': 'O cântico imortal de Davi sobre o refrigério da alma e a proteção no vale da sombra.',
            'verse_text': 'O Senhor é o meu pastor; nada me faltará. Deitar-me faz em verdes pastos, guia-me mansamente a águas mansas.',
            'verse_ref': 'Salmos 23:1-2',
            'summary': 'Uma jornada espiritual pelos versículos do Salmo 23, descobrindo o refrigério divino para o cansaço, a direção nas veredas da justiça e a unção da cabeça na presença dos adversários.',
            'sections': [
                {'heading': '🌿 O Refrigério nas Águas Tranquilas', 'body': 'Davi, que conheceu as agruras do pastoreio nas montanhas de Belém, sabia que as ovelhas não bebem água em torrentes agitadas. O Senhor nos conduz a águas mansas para que a nossa alma seja restaurada da exaustão interior.'},
                {'heading': '⛰️ O Vale da Sombra e a Companhia Divina', 'body': 'O salmista não diz "se eu andar", mas "ainda que eu ande". As estações difíceis são parte da jornada terrena, mas o segredo da coragem está na proximidade do Bom Pastor: "porque tu estás comigo; a tua vara e o teu cajado me consolam".'},
                {'heading': '🍷 O Cálice que Transborda', 'body': 'Na tenda do hospedeiro sagrado, Deus prepara uma mesa honrosa e unge a nossa cabeça com o óleo do Espírito. A bondade e a misericórdia do Pai não nos acompanham de longe; elas nos seguem ativamente todos os dias.'}
            ],
            'table_title': 'As Seis Etapas Espirituais do Salmo 23',
            'table_headers': ['Versículo', 'Ação do Pastor', 'Benefício para o Seguidor'],
            'table_rows': [
                ['Sl 23:1', 'Ele é o Pastor soberano', 'Plenitude e suficiência na graça de Deus'],
                ['Sl 23:2', 'Faz deitar em verdes pastos', 'Descanso genuíno para a mente e o corpo'],
                ['Sl 23:3', 'Guia pelas veredas da justiça', 'Rumo moral seguro por amor do Seu Nome'],
                ['Sl 23:4', 'Presença no vale escuro', 'Livramento do medo e consolo protetor'],
                ['Sl 23:5', 'Prepara mesa e unge a cabeça', 'Dignidade, honra e comunhão festiva'],
                ['Sl 23:6', 'Bondade e misericórdia seguem', 'Habitação eterna na presença do Eterno']
            ],
            'quiz': {
                'question': 'Por qual motivo Davi afirma no Salmo 23:4 que não teme mal algum no vale da sombra da morte?',
                'options': [
                    {'text': 'Porque possuía espada e arco afiados', 'correct': False},
                    {'text': 'Porque o Senhor estava com ele, trazendo consolo com Sua vara e cajado', 'correct': True},
                    {'text': 'Porque o vale era curto e fácil de atravessar', 'correct': False},
                    {'text': 'Porque confiava na cavalaria dos reis vizinhos', 'correct': False}
                ],
                'explanation': 'Davi encontrava intrepidez na companhia pessoal do Criador: "porque tu estás comigo; a tua vara e o teu cajado me consolam".'
            },
            'reflections': [
                {'title': '🐑 Docilidade:', 'text': 'Você permite que o Senhor guie suas escolhas ou insiste em trilhar caminhos próprios?'},
                {'title': '🕯️ Luz no Vale:', 'text': 'Lembre-se: os vales são passagens para os cumes, nunca a morada final.'},
                {'title': '🍷 Gratidão:', 'text': 'Reconheça a abundância espiritual com que Deus já cercou seus dias.'}
            ],
            'closing_prayer': 'Pastor Eterno das nossas almas, guia os nossos passos pelas veredas da retidão. Conduz-nos para além das angústias terrenas e acolhe-nos na Tua casa para sempre. Em nome de Yeshua, nosso mestre e pastor, amém.'
        },
        {
            'topic': 'O Refúgio do Altíssimo (Salmo 91)',
            'title': 'Salmos do Dia: Salmo 91 — Aquele que Habita no Esconderijo do Altíssimo',
            'subtitle': 'A blindagem da fé contra o laço do passarinheiro e o terror noturno.',
            'verse_text': 'Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará. Direi do Senhor: Ele é o meu refúgio e a minha fortaleza, o meu Deus, em quem confio.',
            'verse_ref': 'Salmos 91:1-2',
            'summary': 'Um dos textos mais celebrados da Bíblia Sagrada nos convida à intimidade espiritual profunda com o Criador, prometendo livramento e resposta ao clamor.',
            'sections': [
                {'heading': '🏰 Habitar vs. Apenas Visitar', 'body': 'O texto não fala daquele que faz visitas esporádicas a Deus nos momentos de aflição, mas daquele que escolhe residir continuamente na presença do Pai. Habitar no esconderijo é fazer do Senhor o seu ambiente diário de pensamento e ação.'},
                {'heading': '🪶 Sob as Suas Asas', 'body': '"Ele te cobrirá com as suas penas, e debaixo das suas asas te confiarás; a sua verdade será o teu escudo e broquel". A metáfora carinhosa das asas evoca calor, proteção maternal e refúgio seguro em meio às intempéries.'},
                {'heading': '📞 "Ele me Invocará e Eu lhe Responderei"', 'body': 'No encerramento do Salmo, é o próprio Deus quem fala em primeira pessoa: "Porquanto tão encarecidamente me amou, também eu o livrarei... com ele estarei na angústia; dela o retirarei, e o glorificarei".'}
            ],
            'table_title': 'Títulos de Deus no Salmo 91 e Seus Significados',
            'table_headers': ['Nome em Hebraico', 'Tradução no Salmo', 'Significado Revelado'],
            'table_rows': [
                ['Elyon (עֶלְיוֹן)', 'O Altíssimo', 'Soberano sobre todas as autoridades cósmicas e terrenas'],
                ['Shaddai (שַׁדַּי)', 'O Onipotente', 'O Deus todo-suficiente que sustenta e protege'],
                ['YHWH (יְהוָה)', 'O Senhor', 'O Deus pessoal da aliança eterna, fiel às promessas'],
                ['Elohim (אֱלֹהִים)', 'Meu Deus', 'O Criador do universo a quem servimos de coração'],
                ['Magen (מָגֵן)', 'Escudo e Broquel', 'Defesa intransponível ao redor do fiel']
            ],
            'quiz': {
                'question': 'Qual é a atitude do fiel mencionada no versículo 1 do Salmo 91 que garante o descanso à sombra do Onipotente?',
                'options': [
                    {'text': 'Possuir grande conhecimento secular', 'correct': False},
                    {'text': 'Habitar no esconderijo do Altíssimo', 'correct': True},
                    {'text': 'Cumprir rituais sem sinceridade de coração', 'correct': False},
                    {'text': 'Evitar qualquer tipo de responsabilidade terrena', 'correct': False}
                ],
                'explanation': 'O Salmo começa destacando a habitação contínua e fiel na presença do Altíssimo.'
            },
            'reflections': [
                {'title': '🏰 Seu Esconderijo:', 'text': 'Onde você tem buscado abrigo emocional quando as pressões aumentam?'},
                {'title': '🛡️ Escudo da Verdade:', 'text': 'A verdade bíblica é a melhor proteção contra mentiras e acusações.'},
                {'title': '🕊️ Descanso Real:', 'text': 'Quem confia no Deus Todo-Suficiente não perde o sono com o amanhã.'}
            ],
            'closing_prayer': 'Deus Altíssimo e Onipotente, Tu és a nossa fortaleza inexpugnável. Abriga as nossas famílias sob as Tuas asas e livra-nos dos laços da maldade. Que a Tua verdade seja o nosso escudo hoje e sempre. Amém.'
        }
    ],
    'devocional_do_dia': [
        {
            'topic': 'Vencendo o Orgulho e Praticando a Mansidão',
            'title': 'Devocional do Dia: A Nobre Força da Mansidão Diante das Provocações',
            'subtitle': 'Como agir com domínio próprio em um mundo que confunde agressividade com coragem.',
            'verse_text': 'A resposta branda desvia o furor, mas a palavra dura suscita a ira.',
            'verse_ref': 'Provérbios 15:1',
            'summary': 'Aprenda a aplicar a sabedoria divina no controle das palavras cotidianas, transformando potenciais conflitos em pontes de concórdia e amadurecimento espiritual.',
            'sections': [
                {'heading': '🔥 O Fogo das Reações Impensadas', 'body': 'Em momentos de atrito, o impulso humano comum é responder à altura com aspereza e sarcasmo. Salomão nos ensina que adicionar combustível a uma chama só produz destruição e arrependimento.'},
                {'heading': '🛡️ Mansidão: Força sob Controle', 'body': 'Mansidão não significa fraqueza ou passividade covarde. No grego bíblico, a palavra prautes era usada para cavalos de guerra adestrados, com força imensa submetida inteiramente à vontade do cavaleiro.'},
                {'heading': '🌱 3 Segundos que Salvam Relações', 'body': 'Antes de responder a uma mensagem agressiva ou a uma crítica no trabalho, faça uma pausa consciente de três segundos em oração. Peça ao Pai que coloque uma guarda em seus lábios.'}
            ],
            'table_title': 'O Poder das Respostas no Dia a Dia',
            'table_headers': ['Situação Cotidiana', 'Reação Dura e Carnal', 'Resposta Branda e Sábia (Pv 15:1)'],
            'table_rows': [
                ['Crítica no trabalho', 'Revidar na defensiva ou culpar outros', 'Ouvir com calma e esclarecer com fatos objetivos'],
                ['Discussão em família', 'Gritar e lembrar erros do passado', 'Reconhecer sentimentos e propor diálogo sereno'],
                ['Provocação na internet', 'Alimentar debates infrutíferos', 'Silenciar ou responder com elegância e verdade'],
                ['Desentendimento no trânsito', 'Gesticular e aumentar a tensão', 'Manter a compostura e seguir em paz'],
                ['Frustração pessoal', 'Reclamar e murmurar contra tudo', 'Agradecer a Deus e buscar a solução correta']
            ],
            'quiz': {
                'question': 'Segundo Provérbios 15:1, qual é o efeito prático de uma resposta branda?',
                'options': [
                    {'text': 'Demonstrar incapacidade de argumentação', 'correct': False},
                    {'text': 'Desviar o furor', 'correct': True},
                    {'text': 'Aumentar a indignação alheia', 'correct': False},
                    {'text': 'Conceder vitória total ao adversário injusto', 'correct': False}
                ],
                'explanation': 'A resposta branda desvia o furor e quebra o ciclo de escalada da ira.'
            },
            'reflections': [
                {'title': '⏳ Pausa Serena:', 'text': 'Você consegue esperar a poeira baixar antes de responder a ofensas?'},
                {'title': '🌿 Cura nas Palavras:', 'text': 'Suas palavras têm sido remédio que constrói ou veneno que destrói?'},
                {'title': '👑 O Exemplo do Mestre:', 'text': 'Yeshua, quando injuriado, não injuriava de volta, mas entregava-se Àquele que julga com justiça.'}
            ],
            'closing_prayer': 'Senhor Deus da paciência e da sabedoria, põe uma sentinela à nossa boca e guarda a porta dos nossos lábios. Livra-nos do orgulho e concede-nos o discernimento para agir com mansidão e integridade em todo tempo. Em Yeshua, amém.'
        }
    ],
    'historias_da_biblia': [
        {
            'topic': 'José do Egito: Da Prisão ao Trono pela Providência',
            'title': 'Histórias da Bíblia: José do Egito — A Providência Invisível de Deus',
            'subtitle': 'Como a fidelidade nas trevas forjou um líder capaz de salvar nações da fome.',
            'verse_text': 'Vós bem intentastes mal contra mim; porém Deus o intentou para bem, para fazer como se vê neste dia, para conservar muita gente com vida.',
            'verse_ref': 'Gênesis 50:20',
            'summary': 'A emocionante trajetória do filho de Jacó, vendido pelos irmãos e aprisionado injustamente, até se tornar o governador que acolheu sua família com perdão sincero.',
            'sections': [
                {'heading': '🧺 A Túnica Rasgada e a Traição', 'body': 'Inveja e ciúmes familiares levaram os irmãos de José a lançá-lo numa cisterna no deserto e vendê-lo aos mercadores ismaelitas. No entanto, o texto bíblico reitera repetidas vezes um detalhe decisivo: "O Senhor era com José".'},
                {'heading': '⛓️ Integridade no Cárcere Egípcio', 'body': 'Na casa de Potifar, José recusou o pecado em respeito a Deus e a seu senhor. Acusado falsamente, foi parar na prisão do faraó. Longe de se entregar à amargura, serviu com excelência aos outros prisioneiros.'},
                {'heading': '🌾 O Perdão que Cura Gerações', 'body': 'Ao interpretar os sonhos do faraó pela inspiração do Altíssimo, José foi alçado ao governo. Quando seus irmãos vieram pedir mantimento, ele não buscou vingança, mas reconheceu a mão soberana de Deus guiando os fios da história para salvar vidas.'}
            ],
            'table_title': 'A Jornada de José e a Pedagogia da Providência',
            'table_headers': ['Fase da Vida', 'Prova Enfrentada', 'Atitude de José e Ação Divina'],
            'table_rows': [
                ['Juventude em Canaã', 'Inveja e zombaria dos irmãos', 'Guardou as visões e permaneceu sincero'],
                ['Casa de Potifar', 'Assédio moral e tentação constante', 'Fidelidade a Deus: "Como cometeria eu tão grande maldade?"'],
                ['Prisão Real', 'Esquecimento pelo copeiro-mor', 'Serviço prestimoso e paciência no tempo do Senhor'],
                ['Palácio de Faraó', 'Grande responsabilidade nacional', 'Administração justa e honra atribuída a Deus'],
                ['Reencontro Familiar', 'Oportunidade de vingar-se', 'Perdão comovido, reconciliação e restauração da aliança']
            ],
            'quiz': {
                'question': 'Qual foi a memorável declaração de José aos seus irmãos em Gênesis 50:20?',
                'options': [
                    {'text': 'Exijo indenização por todos os anos que passei na cadeia', 'correct': False},
                    {'text': 'Vós bem intentastes mal contra mim; porém Deus o intentou para bem', 'correct': True},
                    {'text': 'Nunca mais colocareis os pés em território egípcio', 'correct': False},
                    {'text': 'Esqueci completamente quem sois e de onde viestes', 'correct': False}
                ],
                'explanation': 'Gênesis 50:20 é o ápice teológico da providência divina sobre as injustiças humanas.'
            },
            'reflections': [
                {'title': '⏳ O Tempo da Espera:', 'text': 'Deus muitas vezes trabalha no silêncio dos bastidores antes de trazer a público o Seu propósito.'},
                {'title': '🌾 O Poder do Perdão:', 'text': 'Guardar rancor é beber veneno esperando que o outro sofra; perdoar liberta o próprio coração.'},
                {'title': '🛡️ Fidelidade Diária:', 'text': 'Seja leal a Deus no lugar onde você está hoje, mesmo que pareça uma prisão humilde.'}
            ],
            'closing_prayer': 'Soberano Criador e Guia da história humana, Tu que transformas o mal intentado em bênção e salvação, renova a nossa paciência nas horas de incompreensão e concede-nos um coração generoso para perdoar. Amém.'
        }
    ],
    'curiosidades_biblicas': [
        {
            'topic': 'O Sal da Terra e os Costumes da Galileia',
            'title': 'Curiosidades Bíblicas: O Sal da Terra e o Valor Inestimável no Mundo Antigo',
            'subtitle': 'Por que os ouvintes de Jesus entenderam imediatamente a metáfora do sal como pureza, preservação e aliança.',
            'verse_text': 'Vós sois o sal da terra; e se o sal for insípido, com que se há de salgar? Para nada mais presta senão para se lançar fora, e ser pisado pelos homens.',
            'verse_ref': 'Mateus 5:13',
            'summary': 'Conheça o contexto histórico do sal no Oriente Médio, as rotas comerciais do Mar Morto e o pacto de sal nas Escrituras antigas.',
            'sections': [
                {'heading': '🧂 Mais Valioso que Ouro em Roma', 'body': 'Na antiguidade bíblica, o sal era vital para a preservação de alimentos, especialmente peixes e carnes, antes da refrigeração. Soldados romanos chegavam a receber parte do soldo em sal (origem do termo salário).'},
                {'heading': '📜 A Aliança Perpétua de Sal', 'body': 'Nas Escrituras, o "pacto de sal" (Números 18:19; 2 Crônicas 13:5) representava um acordo incorruptível e solene entre duas partes. Quando Jesus chamou os discípulos de sal, Ele estava indicando que eles eram os agentes divinos contra a deterioração moral da sociedade.'},
                {'heading': '⚠️ Como o Sal Podia se Tornar Insípido?', 'body': 'O sal recolhido nas margens do Mar Morto vinha misturado com gesso, areia e outros minerais. Se molhado em excesso, o cloreto de sódio dissolvia-se primeiro, deixando para trás um pó branco sem sabor e inútil para conservação.'}
            ],
            'table_title': 'Usos e Simbolismos do Sal na Bíblia',
            'table_headers': ['Referência Bíblica', 'Uso no Texto', 'Significado Simbólico'],
            'table_rows': [
                ['Levítico 2:13', 'Sal adicionado a todas as ofertas de cereais', 'Pureza e preservação da aliança sem fermento'],
                ['Números 18:19', 'Aliança perpétua de sal perante o Senhor', 'Compromisso inalterável e lealdade sagrada'],
                ['2 Reis 2:19-22', 'Eliseu purifica as águas de Jericó com sal', 'Poder restaurador de Deus sanando a esterilidade'],
                ['Mateus 5:13', 'Discípulos como sal da terra', 'Influência moral, ética e preservação social'],
                ['Colossenses 4:6', 'Conversa sempre agradável, temperada com sal', 'Sabedoria, discernimento e graça no falar']
            ],
            'quiz': {
                'question': 'O que significava o "pacto de sal" na tradição bíblica do Antigo Testamento?',
                'options': [
                    {'text': 'Uma taxa comercial cobrada pelos escribas', 'correct': False},
                    {'text': 'Uma aliança solene, duradoura e incorruptível', 'correct': True},
                    {'text': 'Um juramento de guerra entre tribos nômades', 'correct': False},
                    {'text': 'Um método de plantio em terras salgadas', 'correct': False}
                ],
                'explanation': 'O sal, por suas propriedades preservativas, simbolizava a durabilidade e incorruptibilidade do pacto perante Deus.'
            },
            'reflections': [
                {'title': '🧂 Preservação Ativa:', 'text': 'Você tem impedido a corrupção de conversas e atitudes nos ambientes em que atua?'},
                {'title': '🗣️ Palavras com Tempero:', 'text': 'Sua comunicação diária constrói, pacifica e inspira as pessoas ao redor?'},
                {'title': '✨ Sabor da Graça:', 'text': 'O testemunho cristão genuíno atrai pessoas para o amor do Pai Celestial.'}
            ],
            'closing_prayer': 'Pai de luz e bondade, que nos chamaste para sermos o sal da terra e a luz do mundo, guarda-nos da insipidez da indiferença. Que o Teu amor brilhe através de ações justas e acolhedoras em nossa comunidade. Amém.'
        }
    ],
    'ensinamentos_de_jesus': [
        {
            'topic': 'O Maior Mandamento (Marcos 12:28-34)',
            'title': 'Ensinamentos de Jesus: O Maior de Todos os Mandamentos',
            'subtitle': 'O escriba sincero, o Shemá de Israel e o resumo sublime de toda a Lei e dos Profetas.',
            'verse_text': 'E Jesus respondeu-lhe: O primeiro de todos os mandamentos é: Ouve, Israel, o Senhor nosso Deus é o único Senhor; Amarás, pois, ao Senhor teu Deus de todo o teu coração, e de toda a tua alma, e de todas as tuas forças.',
            'verse_ref': 'Marcos 12:29-30',
            'summary': 'A resposta magistral de Jesus ao escriba em Jerusalém resgata a pureza do monoteísmo estrito e revela que o amor a Deus é inseparável do amor ao próximo.',
            'sections': [
                {'heading': '📜 A Pergunta do Mestre da Lei', 'body': 'Os teólogos da época contavam 613 preceitos na Lei mosaica e discutiam calorosamente qual teria maior peso. Um escriba, impressionado com as respostas de Jesus, perguntou com sinceridade: "Qual é o primeiro de todos os mandamentos?"'},
                {'heading': '🏛️ O Fundamento Inegociável', 'body': 'Jesus não começou com uma ordem moral genérica, mas com a confissão de fé de Israel: "O Senhor nosso Deus é o único Senhor". Para Jesus, a moralidade está ancorada na realidade teológica de que há apenas um Deus verdadeiro.'},
                {'heading': '🤝 O Segundo Mandamento Semelhante', 'body': '"E o segundo, semelhante a este, é: Amarás o teu próximo como a ti mesmo. Não há outro mandamento maior do que estes". Quem afirma amar a Deus a quem não vê, mas despreza o irmão a quem vê, engana a si próprio.'}
            ],
            'table_title': 'A Harmonia entre o Amor a Deus e o Amor ao Próximo',
            'table_headers': ['Mandamento', 'Origem nas Escrituras', 'Expressão no Cotidiano'],
            'table_rows': [
                ['Ouvir o Deus Único', 'Deuteronômio 6:4', 'Reverência exclusiva, adoração sem idolatria'],
                ['Amar de Todo o Coração', 'Deuteronômio 6:5', 'Lealdade afetiva e prioridade máxima ao Pai'],
                ['Amar de Toda a Alma', 'Deuteronômio 6:5', 'Dedicação da própria vida e vontade ao Reino'],
                ['Amar com Todas as Forças', 'Deuteronômio 6:5', 'Uso dos talentos, tempo e recursos materiais em retidão'],
                ['Amar o Próximo', 'Levítico 19:18', 'Justiça social, misericórdia e socorro prático ao necessitado']
            ],
            'quiz': {
                'question': 'Como Jesus inicia Sua resposta sobre o maior mandamento em Marcos 12:29?',
                'options': [
                    {'text': 'Dizendo que os sacrifícios de animais são suficientes', 'correct': False},
                    {'text': 'Citando o Shemá: "Ouve, Israel, o Senhor nosso Deus é o único Senhor"', 'correct': True},
                    {'text': 'Proclamando uma nova lei que anula os profetas', 'correct': False},
                    {'text': 'Ordenando o isolamento dos crentes nas montanhas', 'correct': False}
                ],
                'explanation': 'Jesus alicerça o maior mandamento na unicidade do Deus de Israel citando Deuteronômio 6:4.'
            },
            'reflections': [
                {'title': '❤️ Amor sem Divisão:', 'text': 'Você tem dedicado seu coração inteiro ao Criador ou dividido com ídolos modernos como o dinheiro e a vaidade?'},
                {'title': '🤝 O Próximo Visível:', 'text': 'Quem é a pessoa próxima que hoje necessita do seu apoio prático ou perdão?'},
                {'title': '🎯 Coerência de Fé:', 'text': 'O evangelho de Yeshua unifica teologia clara com conduta compassiva.'}
            ],
            'closing_prayer': 'Pai de misericórdia, único Deus vivo e verdadeiro, derrama o Teu amor em nossos corações para que Te amemos de toda a nossa alma e amemos o nosso próximo como o Teu Filho nos ensinou. Em Yeshua, amém.'
        }
    ],
    'ensino_biblico': [
        {
            'topic': 'O Deus Único e o Seu Enviado (1 Timóteo 2:5)',
            'title': 'Ensino Bíblico: O Único Deus e o Único Mediador entre Deus e a Humanidade',
            'subtitle': 'A clareza apostólica sobre a unidade absoluta do Criador e o sacerdócio de Cristo Jesus.',
            'verse_text': 'Porque há um só Deus, e um só Mediador entre Deus e os homens, Jesus Cristo, homem.',
            'verse_ref': '1 Timóteo 2:5',
            'summary': 'Um estudo teológico e exegético profundo sobre 1 Timóteo 2:5, examinando a distinção bíblica límpida entre o Pai celestial e o Messias ressurreto e exaltado.',
            'sections': [
                {'heading': '🏛️ A Doutrina Apostólica Prístina', 'body': 'Ao orientar o jovem pastor Timóteo na cidade cosmopolita de Éfeso, o apóstolo Paulo reafirma a fé monoteísta inquebrantável das Escrituras. Contra as influências politeístas da época, Paulo proclama: "há um só Deus" (heis theos).'},
                {'heading': '🕊️ O Papel Glorioso do Mediador', 'body': 'Um mediador é aquele que estabelece a ponte e a paz entre duas partes. Jesus Cristo, glorificado e exaltado à destra do Pai, cumpre perfeitamente o papel de sumo sacerdote e intercessor dos redimidos.'},
                {'heading': '⚖️ Conhecimento da Verdade e Salvação', 'body': 'Paulo ensina que Deus "quer que todos os homens se salvem e venham ao conhecimento da verdade" (1 Tm 2:4). A verdade central do Evangelho une a soberania do Deus Único e a suficiência do sacrifício do Seu Ungido.'}
            ],
            'table_title': 'Quadro Comparativo de Passagens sobre o Monoteísmo Apostólico',
            'table_headers': ['Passagem do NT', 'O Único Deus (O Pai)', 'O Senhor e Mediador (Yeshua)'],
            'table_rows': [
                ['1 Timóteo 2:5', 'Há um só Deus', 'Um só Mediador, Cristo Jesus, homem'],
                ['1 Coríntios 8:6', 'Um só Deus, o Pai, de quem são todas as coisas', 'Um só Senhor, Jesus Cristo, por quem são todas as coisas'],
                ['João 17:3', 'O único Deus verdadeiro', 'Jesus Cristo, a quem o Pai enviou'],
                ['Efésios 4:5-6', 'Um só Deus e Pai de todos', 'Um só Senhor, uma só fé, um só batismo'],
                ['Romanos 15:6', 'O Deus e Pai de nosso Senhor Jesus Cristo', 'O Messias que glorificou ao Pai']
            ],
            'quiz': {
                'question': 'De acordo com 1 Timóteo 2:5, quantos mediadores existem entre Deus e a humanidade?',
                'options': [
                    {'text': 'Múltiplos santos e filósofos', 'correct': False},
                    {'text': 'Apenas um: Jesus Cristo, homem', 'correct': True},
                    {'text': 'Nenhum, pois não há necessidade de mediação', 'correct': False},
                    {'text': 'Doze mediadores apostólicos', 'correct': False}
                ],
                'explanation': 'O texto afirma categoricamente: "há um só Deus, e um só Mediador entre Deus e os homens, Jesus Cristo, homem".'
            },
            'reflections': [
                {'title': '📖 Pureza Doutrinária:', 'text': 'Alinhe suas orações e convicções à simplicidade límpida do Novo Testamento.'},
                {'title': '🕊️ Acesso Direto:', 'text': 'Temos plena confiança em nos aproximar do Pai por meio de Cristo nosso Mediador.'},
                {'title': '🌍 Salvação para Todos:', 'text': 'Deus deseja que a verdade do Seu amor alcance todas as nações sem distinção.'}
            ],
            'closing_prayer': 'Eterno Deus e Pai de bondade, louvamos o Teu santo nome porque abriste para nós o caminho vivo até a Tua presença por meio do Teu Filho amado Yeshua. Guarda a Tua congregação na verdade da Tua santa Palavra. Amém.'
        }
    ]
}


# -----------------------------------------------------------------------------
# FUNÇÕES DE PERSISTÊNCIA DOS POSTS E CONFIGURAÇÕES
# -----------------------------------------------------------------------------
def get_posts_list():
    """Lê a lista de posts do arquivo data/posts.json ou posts.json."""
    target = POSTS_FILE_DATA if os.path.exists(POSTS_FILE_DATA) else POSTS_FILE_ROOT
    if not os.path.exists(target):
        return []
    try:
        with open(target, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print('[AgentEngine] Erro ao carregar posts:', e)
        return []


def save_posts_list(posts):
    """Salva a lista de posts sincronizada em data/posts.json e posts.json."""
    os.makedirs(os.path.dirname(POSTS_FILE_DATA), exist_ok=True)
    try:
        with open(POSTS_FILE_DATA, 'w', encoding='utf-8') as f:
            json.dump(posts, f, indent=2, ensure_ascii=False)
        with open(POSTS_FILE_ROOT, 'w', encoding='utf-8') as f:
            json.dump(posts, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print('[AgentEngine] Erro ao salvar posts:', e)
        return False


def get_agent_config():
    """Retorna as configurações atuais do agente IA."""
    target = CONFIG_FILE_DATA if os.path.exists(CONFIG_FILE_DATA) else CONFIG_FILE_ROOT
    default_cfg = {
        'provider': 'unoteista_engine',
        'api_key': '',
        'custom_model': 'deepseek/deepseek-v4-flash',
        'auto_publish_default': True,
        'temperature': 0.7,
        'style': 'unoteista_sobrio'
    }
    if os.path.exists(target):
        try:
            with open(target, 'r', encoding='utf-8') as f:
                data = json.load(f)
                default_cfg.update(data)
        except Exception:
            pass
    return default_cfg


def save_agent_config(cfg):
    """Salva configurações do agente em ambos os caminhos."""
    os.makedirs(os.path.dirname(CONFIG_FILE_DATA), exist_ok=True)
    try:
        with open(CONFIG_FILE_DATA, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
        with open(CONFIG_FILE_ROOT, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print('[AgentEngine] Erro ao salvar config:', e)
        return False


def slugify(text):
    """Gera um slug amigável para URLs a partir do título."""
    text = text.lower()
    text = re.sub(r'[áàãâä]', 'a', text)
    text = re.sub(r'[éèêë]', 'e', text)
    text = re.sub(r'[íìîï]', 'i', text)
    text = re.sub(r'[óòõôö]', 'o', text)
    text = re.sub(r'[úùûü]', 'u', text)
    text = re.sub(r'[ç]', 'c', text)
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')[:80]


# -----------------------------------------------------------------------------
# CHAMADA A APIS EXTERNAS DE LLM (SE CONFIGURADO PELO USUÁRIO)
# -----------------------------------------------------------------------------
def call_external_llm(provider, api_key, model, prompt_system, prompt_user):
    """Tenta chamar uma API compatível com OpenAI/OpenRouter."""
    if not api_key:
        return None

    url = 'https://openrouter.ai/api/v1/chat/completions'
    if provider == 'openai':
        url = 'https://api.openai.com/v1/chat/completions'
        if not model:
            model = 'gpt-4o-mini'
    elif provider == 'groq':
        url = 'https://api.groq.com/openai/v1/chat/completions'
        if not model:
            model = 'llama-3.3-70b-versatile'
    else:
        if not model:
            model = 'deepseek/deepseek-v4-flash'

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}',
        'User-Agent': 'UnoteismoAgent/1.0'
    }
    payload = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': prompt_system},
            {'role': 'user', 'content': prompt_user}
        ],
        'temperature': 0.7,
        'response_format': {'type': 'json_object'}
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            content = data['choices'][0]['message']['content']
            return json.loads(content)
    except Exception as e:
        print(f'[AgentEngine] Aviso: Falha na API externa {provider} ({e}). Usando gerador teológico autônomo.')
        return None


# -----------------------------------------------------------------------------
# MOTOR DE GERAÇÃO AUTÔNOMO UNOTEÍSTA
# -----------------------------------------------------------------------------
def generate_post(category_id, topic_hint='', template='classico', auto_publish=True):
    """Gera uma postagem completa para uma das 8 categorias."""
    if category_id not in CATEGORIES:
        category_id = 'versiculo_do_dia'

    cat_meta = CATEGORIES[category_id]
    cfg = get_agent_config()

    # Se o usuário configurou uma chave e outro provedor que não o local, tenta a IA externa
    generated_json = None
    if cfg.get('provider') in ('openrouter', 'openai', 'groq') and cfg.get('api_key'):
        prompt_sys = (
            "Você é o Agente Redator do site 'Unoteísmo' (unoteismo.com.br), dedicado à busca da verdade "
            "e à Bíblia Sagrada sob uma perspectiva monoteísta estrita (Deus Único, Pai de todas as coisas, "
            "e Yeshua/Jesus Cristo como Seu amado Messias e Enviado). Escreva sempre em português com reverência, "
            "profundidade histórica, clareza e acolhimento. "
            "Responda SOMENTE um objeto JSON válido contendo: "
            "title, subtitle, summary, verse_text, verse_ref, sections (array com {heading, body}), "
            "table_title, table_headers (3 colunas), table_rows (5 linhas com 3 colunas), "
            "quiz ({question, options:[{text, correct}], explanation}), "
            "reflections (array com 3 itens {title, text}), closing_prayer."
        )
        prompt_usr = (
            f"Gere um post completo para a categoria '{cat_meta['label']}'. "
            f"Tema/Assunto desejado: '{topic_hint or 'Escolha um tema bíblico rico e edificante'}'. "
            f"Template solicitado: '{template}'."
        )
        generated_json = call_external_llm(
            cfg.get('provider'),
            cfg.get('api_key'),
            cfg.get('custom_model'),
            prompt_sys,
            prompt_usr
        )

    # Se a IA externa não respondeu ou o provedor é o motor embutido
    if not generated_json:
        candidates = KNOWLEDGE_BANK.get(category_id, KNOWLEDGE_BANK['versiculo_do_dia'])
        # Procura por correspondência no tópico se fornecido
        chosen = None
        if topic_hint:
            h = topic_hint.lower()
            for c in candidates:
                if h in c.get('topic', '').lower() or h in c.get('title', '').lower() or h in c.get('verse_ref', '').lower():
                    chosen = c
                    break
        if not chosen:
            chosen = random.choice(candidates)

        # Monta cópia estruturada
        now_ts = int(time.time() * 1000)
        custom_title = chosen['title']
        if topic_hint and topic_hint.strip() and topic_hint.lower() not in custom_title.lower():
            custom_title = f"{cat_meta['label']}: {topic_hint.strip()} — Reflexão Bíblica"

        generated_json = {
            'title': custom_title,
            'subtitle': chosen.get('subtitle', 'Reflexão diária edificante à luz das Sagradas Escrituras.'),
            'summary': chosen.get('summary', 'Conheça os princípios eternos do Criador para a sua vida hoje.'),
            'verse_text': chosen.get('verse_text', 'O Senhor nosso Deus é o único Senhor.'),
            'verse_ref': chosen.get('verse_ref', 'Deuteronômio 6:4'),
            'sections': chosen.get('sections', []),
            'table_title': chosen.get('table_title', f"Aspectos Bíblicos de {cat_meta['label']}"),
            'table_headers': chosen.get('table_headers', ['Tópico', 'Referência', 'Aplicação Prática']),
            'table_rows': chosen.get('table_rows', []),
            'quiz': chosen.get('quiz', {
                'question': 'Qual é a base essencial para a caminhada diária com Deus?',
                'options': [
                    {'text': 'A obediência sincera e o amor à verdade revelada', 'correct': True},
                    {'text': 'A conformidade cega com opiniões do mundo', 'correct': False},
                    {'text': 'A busca egoísta por recompensas fáceis', 'correct': False},
                    {'text': 'O desânimo diante dos desafios diários', 'correct': False}
                ],
                'explanation': 'A fé bíblica genuína se manifesta no amor ao Deus Único e na prática da justiça.'
            }),
            'reflections': chosen.get('reflections', [
                {'title': '🎯 Atenção:', 'text': 'Dedique momentos do seu dia para silenciar a mente e ouvir a Deus.'},
                {'title': '🌱 Crescimento:', 'text': 'Pequenas atitudes diárias de bondade moldam um caráter duradouro.'},
                {'title': '🕊️ Confiança:', 'text': 'Entregue o amanhã nas mãos Daquele que governa com justiça.'}
            ]),
            'closing_prayer': chosen.get('closing_prayer', 'Pai Celeste, Soberano e Bom, sê a luz dos nossos passos e a paz dos nossos corações. Em Yeshua, amém.')
        }

    # Monta o objeto final do post
    post_id = f"post_{int(time.time() * 1000)}_{random.randint(100, 999)}"
    now_date = datetime.date.today().isoformat()
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    post_slug = slugify(generated_json.get('title', 'post'))

    status = 'published' if auto_publish else 'draft'

    final_post = {
        'id': post_id,
        'slug': post_slug,
        'category': category_id,
        'category_label': cat_meta['label'],
        'category_icon': cat_meta['icon'],
        'title': generated_json.get('title', 'Postagem Bíblica'),
        'subtitle': generated_json.get('subtitle', ''),
        'summary': generated_json.get('summary', ''),
        'verse_text': generated_json.get('verse_text', ''),
        'verse_ref': generated_json.get('verse_ref', ''),
        'sections': generated_json.get('sections', []),
        'table_title': generated_json.get('table_title', ''),
        'table_headers': generated_json.get('table_headers', []),
        'table_rows': generated_json.get('table_rows', []),
        'quiz': generated_json.get('quiz', {}),
        'reflections': generated_json.get('reflections', []),
        'closing_prayer': generated_json.get('closing_prayer', ''),
        'date': now_date,
        'status': status,
        'views': 0,
        'created_at': now_iso,
        'template': template
    }

    # Se auto_publish for verdadeiro, adiciona automaticamente à lista
    if auto_publish:
        posts = get_posts_list()
        posts.insert(0, final_post)
        save_posts_list(posts)

    return final_post
