"""Servidor local simples (sem Cloudflare) que imita as rotas limpas do site.

    python dev_server.py [porta]      # padrão: 8085  ->  http://localhost:8085/

Serve os arquivos da RAIZ do projeto (não de public/) e traduz as URLs limpas:
    /  /biblia  /biblia/joao/3  /teologia  /sobre ...   ->  o .html correspondente
    /api/*  ->  404 em JSON (o site cai nos arquivos estáticos data/pt e data/int, como antes)
Para testar o Worker de verdade (SSR, API, D1 local), use:  wrangler dev
"""
import datetime
import http.server
import json
import os
import re
import sys
import time

import agent_engine

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8085
PAGES = {
    '/': 'index.html',
    '/teologia': 'teologia.html',
    '/soteriologia': 'soteriologia.html',
    '/communicatio-idiomatum': 'communicatio-idiomatum.html',
    '/batismo': 'batismo.html',
    '/forma-da-consciencia': 'forma-da-consciencia.html',
    '/sobre': 'sobre.html',
    '/privacidade': 'privacidade.html',
    '/comparativo': 'comparativo.html',
    '/biblia': 'biblia.html',
    '/admin': 'admin.html',
    '/pedidos-de-oracao': 'pedidos-de-oracao.html',
    '/pedidos-de-oracao/': 'pedidos-de-oracao.html',
    '/quizzes': 'quizzes.html',
    '/quizzes/': 'quizzes.html',
    '/quiz': 'quizzes.html',
    '/quiz/': 'quizzes.html',
    '/categoria': 'categoria.html',
    '/categoria/': 'categoria.html',
    '/posts': 'categoria.html',
    '/posts/': 'categoria.html',
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def translate_path(self, path):
        clean = path.split('?', 1)[0].split('#', 1)[0]
        if clean in PAGES:
            path = '/' + PAGES[clean]
        elif re.match(r'^/biblia/[^/]+(/\d+)?/?$', clean):
            path = '/biblia.html'
        elif clean.startswith('/posts/') or clean.startswith('/categoria/'):
            path = '/categoria.html'
        return super().translate_path(path)

    def do_GET(self):
        clean = self.path.split('?', 1)[0]
        if clean in ('/api/prayers', '/prayer_requests.json'):
            p_file = os.path.join(ROOT, 'prayer_requests.json')
            if not os.path.exists(p_file):
                p_file = os.path.join(ROOT, 'data', 'prayer_requests.json')
            try:
                with open(p_file, 'r', encoding='utf-8') as f:
                    body = f.read().encode('utf-8')
            except Exception:
                body = b'[]'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if clean in ('/api/agent/posts', '/api/posts', '/api/admin/posts'):
            posts = agent_engine.get_posts_list()
            body = json.dumps({'success': True, 'posts': posts}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if clean == '/api/agent/config':
            cfg = agent_engine.get_agent_config()
            body = json.dumps({'success': True, 'config': cfg}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if clean == '/api/admin/canvas-pages':
            pages_list = [
                {'id': 'index.html', 'url': '/', 'label': 'Página Inicial (Início)'},
                {'id': 'teologia.html', 'url': '/teologia', 'label': 'Teologia Unoteísta'},
                {'id': 'soteriologia.html', 'url': '/soteriologia', 'label': 'Soteriologia'},
                {'id': 'communicatio-idiomatum.html', 'url': '/communicatio-idiomatum', 'label': 'Communicatio Idiomatum'},
                {'id': 'batismo.html', 'url': '/batismo', 'label': 'O Batismo Bíblico'},
                {'id': 'forma-da-consciencia.html', 'url': '/forma-da-consciencia', 'label': 'Forma da Consciência'},
                {'id': 'sobre.html', 'url': '/sobre', 'label': 'Sobre o Unoteísmo'},
                {'id': 'pedidos-de-oracao.html', 'url': '/pedidos-de-oracao', 'label': 'Pedidos de Oração'},
                {'id': 'quizzes.html', 'url': '/quizzes', 'label': 'Quizzes Bíblicos'},
                {'id': 'categoria.html', 'url': '/posts/devocional-do-dia/', 'label': 'Temas / Categorias'}
            ]
            body = json.dumps({'success': True, 'pages': pages_list}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if clean.startswith('/api/admin/'):
            sub = clean[len('/api/admin/'):]
            if sub == 'me':
                body = json.dumps({'user': 'admin'}).encode('utf-8')
            elif sub == 'pages':
                body = json.dumps({'pages': [{'page': 'home', 'label': 'Página Inicial'}]}).encode('utf-8')
            elif sub.startswith('pages/'):
                body = json.dumps({'page': 'home', 'label': 'Página Inicial', 'blocks': []}).encode('utf-8')
            else:
                body = json.dumps({}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if self.path.startswith('/api/') and not self.path.startswith('/api/prayers') and not self.path.startswith('/api/agent'):
            body = json.dumps({'error': 'API indisponível no servidor local'}).encode()
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        clean = self.path.split('?', 1)[0]
        if clean in ('/api/admin/save-canvas', '/api/admin/save_canvas'):
            content_len = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_len) if content_len > 0 else b'{}'
            try:
                data = json.loads(post_body.decode('utf-8'))
            except Exception:
                data = {}
            page = data.get('page', 'index.html').strip()
            html_content = data.get('html', '')

            page_map = {
                '/': 'index.html',
                '': 'index.html',
                'home': 'index.html',
                'index.html': 'index.html',
                '/teologia': 'teologia.html',
                'teologia': 'teologia.html',
                'teologia.html': 'teologia.html',
                '/soteriologia': 'soteriologia.html',
                'soteriologia': 'soteriologia.html',
                'soteriologia.html': 'soteriologia.html',
                '/communicatio-idiomatum': 'communicatio-idiomatum.html',
                'communicatio_idiomatum': 'communicatio-idiomatum.html',
                'communicatio-idiomatum.html': 'communicatio-idiomatum.html',
                '/batismo': 'batismo.html',
                'batismo': 'batismo.html',
                'batismo.html': 'batismo.html',
                '/forma-da-consciencia': 'forma-da-consciencia.html',
                'forma_da_consciencia': 'forma-da-consciencia.html',
                'forma-da-consciencia.html': 'forma-da-consciencia.html',
                '/sobre': 'sobre.html',
                'sobre': 'sobre.html',
                'sobre.html': 'sobre.html',
                '/privacidade': 'privacidade.html',
                'privacidade': 'privacidade.html',
                'privacidade.html': 'privacidade.html',
                '/pedidos-de-oracao': 'pedidos-de-oracao.html',
                'pedidos-de-oracao.html': 'pedidos-de-oracao.html',
                '/quizzes': 'quizzes.html',
                'quizzes.html': 'quizzes.html',
                '/categoria': 'categoria.html',
                'categoria.html': 'categoria.html',
                '/posts/devocional-do-dia/': 'categoria.html',
                '/posts/devocional-do-dia': 'categoria.html',
            }

            clean_page = page.split('?')[0].strip()
            if clean_page.startswith('/posts/'):
                filename = 'categoria.html'
            else:
                filename = page_map.get(clean_page.lower(), None)
            if not filename:
                stripped = clean_page.lstrip('/')
                if stripped in page_map:
                    filename = page_map[stripped]
                elif stripped.endswith('.html') and os.path.exists(os.path.join(ROOT, stripped)):
                    filename = stripped
                else:
                    filename = 'index.html'

            target_path = os.path.join(ROOT, filename)

            if not html_content or len(html_content) < 50:
                resp = {'success': False, 'message': 'Conteúdo HTML inválido ou vazio.'}
            else:
                backup_dir = os.path.join(ROOT, 'backups')
                os.makedirs(backup_dir, exist_ok=True)
                ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
                backup_path = os.path.join(backup_dir, f"{filename}.{ts}.bak")
                if os.path.exists(target_path):
                    try:
                        import shutil
                        shutil.copy2(target_path, backup_path)
                    except Exception as ex:
                        print("Backup warning:", ex)

                try:
                    with open(target_path, 'w', encoding='utf-8') as f:
                        f.write(html_content)
                    resp = {
                        'success': True,
                        'message': f'Página {filename} salva com sucesso no servidor!',
                        'file': filename,
                        'backup': os.path.basename(backup_path),
                        'timestamp': ts
                    }
                except Exception as ex:
                    resp = {'success': False, 'message': f'Erro ao gravar arquivo: {str(ex)}'}

            body = json.dumps(resp, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if clean.startswith('/api/admin/') and clean != '/api/admin/posts':
            sub = clean[len('/api/admin/'):]
            if sub in ('login', 'password'):
                body = json.dumps({'token': 'dev_token_unoteismo'}).encode('utf-8')
            else:
                body = json.dumps({'results': {}, 'errors': []}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if clean == '/api/agent/generate':
            content_len = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_len) if content_len > 0 else b'{}'
            try:
                data = json.loads(post_body.decode('utf-8'))
            except Exception:
                data = {}
            category = data.get('category', 'versiculo_do_dia')
            topic = data.get('topic', '')
            template = data.get('template', 'classico')
            auto_publish = bool(data.get('auto_publish', True))
            post = agent_engine.generate_post(category, topic, template, auto_publish)
            body = json.dumps({'success': True, 'post': post}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if clean in ('/api/agent/posts', '/api/posts', '/api/admin/posts'):
            content_len = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_len) if content_len > 0 else b'{}'
            try:
                data = json.loads(post_body.decode('utf-8'))
            except Exception:
                data = {}
            action = data.get('action', '')
            posts = agent_engine.get_posts_list()
            resp = {'success': False, 'message': 'Ação inválida.'}
            cat_meta_map = agent_engine.CATEGORIES

            if action == 'save':
                post_data = data.get('post', {})
                if post_data:
                    p_id = post_data.get('id')
                    if not p_id:
                        p_id = f"post_{int(time.time() * 1000)}"
                        post_data['id'] = p_id
                    cat_id = post_data.get('category', 'versiculo_do_dia')
                    cat_info = cat_meta_map.get(cat_id, {'label': 'Postagem', 'icon': '📜'})
                    post_data['category_label'] = cat_info['label']
                    post_data['category_icon'] = cat_info['icon']
                    if not post_data.get('slug'):
                        post_data['slug'] = agent_engine.slugify(post_data.get('title', 'post'))
                    if not post_data.get('created_at'):
                        post_data['created_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                    if not post_data.get('date'):
                        post_data['date'] = datetime.date.today().isoformat()

                    idx = next((i for i, p in enumerate(posts) if p.get('id') == p_id), -1)
                    if idx >= 0:
                        posts[idx] = post_data
                    else:
                        posts.insert(0, post_data)
                    agent_engine.save_posts_list(posts)
                    resp = {'success': True, 'message': 'Postagem salva com sucesso!', 'post': post_data}
            elif action == 'schedule':
                p_id = data.get('id')
                s_date = data.get('scheduled_date', '').strip()
                s_time = data.get('scheduled_time', '17:00').strip()
                for p in posts:
                    if p.get('id') == p_id:
                        p['status'] = 'scheduled'
                        p['scheduled_for'] = f"{s_date} {s_time}".strip()
                        agent_engine.save_posts_list(posts)
                        resp = {'success': True, 'message': f'Postagem agendada para {p["scheduled_for"]}.', 'post': p}
                        break
            elif action == 'publish':
                p_id = data.get('id')
                for p in posts:
                    if p.get('id') == p_id:
                        p['status'] = 'published'
                        p['published_at'] = datetime.datetime.now().strftime('%d/%m/%Y %H:%M')
                        agent_engine.save_posts_list(posts)
                        resp = {'success': True, 'message': 'Postagem publicada no site!', 'post': p}
                        break
            elif action == 'bulk_schedule':
                ids = data.get('ids', [])
                s_date = data.get('scheduled_date', '').strip()
                s_time = data.get('scheduled_time', '17:00').strip()
                count = 0
                for p in posts:
                    if p.get('id') in ids:
                        p['status'] = 'scheduled'
                        p['scheduled_for'] = f"{s_date} {s_time}".strip()
                        count += 1
                agent_engine.save_posts_list(posts)
                resp = {'success': True, 'message': f'{count} postagem(ns) agendada(s) para {s_date} {s_time}.'}
            elif action == 'bulk_publish':
                ids = data.get('ids', [])
                now_str = datetime.datetime.now().strftime('%d/%m/%Y %H:%M')
                count = 0
                for p in posts:
                    if p.get('id') in ids:
                        p['status'] = 'published'
                        p['published_at'] = now_str
                        count += 1
                agent_engine.save_posts_list(posts)
                resp = {'success': True, 'message': f'{count} postagem(ns) publicada(s) com sucesso no site!'}
            elif action == 'bulk_delete':
                ids = data.get('ids', [])
                before = len(posts)
                posts = [p for p in posts if p.get('id') not in ids]
                deleted = before - len(posts)
                agent_engine.save_posts_list(posts)
                resp = {'success': True, 'message': f'{deleted} postagem(ns) excluída(s) com sucesso.'}
            elif action == 'detect_duplicates':
                from collections import defaultdict
                by_title = defaultdict(list)
                for p in posts:
                    t = (p.get('title') or '').strip().lower()
                    if t:
                        by_title[t].append(p)
                duplicates = []
                for t, group in by_title.items():
                    if len(group) > 1:
                        duplicates.append({
                            'title': group[0].get('title'),
                            'count': len(group),
                            'ids': [p.get('id') for p in group],
                            'posts': [{'id': p.get('id'), 'category': p.get('category'), 'status': p.get('status')} for p in group]
                        })
                resp = {'success': True, 'duplicates': duplicates, 'total': len(duplicates)}
            elif action == 'toggle_status':
                p_id = data.get('id')
                for p in posts:
                    if p.get('id') == p_id:
                        p['status'] = 'draft' if p.get('status') == 'published' else 'published'
                        agent_engine.save_posts_list(posts)
                        resp = {'success': True, 'message': f"Status alterado para {p['status']}.", 'post': p}
                        break
            elif action == 'delete':
                p_id = data.get('id')
                posts = [p for p in posts if p.get('id') != p_id]
                agent_engine.save_posts_list(posts)
                resp = {'success': True, 'message': 'Postagem excluída com sucesso.'}
            elif action == 'update':
                post_data = data.get('post', {})
                p_id = post_data.get('id')
                for i, p in enumerate(posts):
                    if p.get('id') == p_id:
                        posts[i].update(post_data)
                        agent_engine.save_posts_list(posts)
                        resp = {'success': True, 'message': 'Postagem atualizada.', 'post': posts[i]}
                        break
            elif action == 'upload_image':
                img_data = data.get('image_data', '')
                filename = data.get('filename', 'upload.jpg')
                if img_data and ',' in img_data:
                    import base64
                    header, encoded = img_data.split(',', 1)
                    upload_dir = os.path.join(ROOT, 'images', 'uploads')
                    os.makedirs(upload_dir, exist_ok=True)
                    safe_name = f"up_{int(time.time())}_{os.path.basename(filename)}"
                    out_path = os.path.join(upload_dir, safe_name)
                    with open(out_path, 'wb') as f:
                        f.write(base64.b64decode(encoded))
                    resp = {'success': True, 'url': f'/images/uploads/{safe_name}'}

            body = json.dumps(resp, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if clean == '/api/agent/config':
            content_len = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_len) if content_len > 0 else b'{}'
            try:
                data = json.loads(post_body.decode('utf-8'))
            except Exception:
                data = {}
            cfg = agent_engine.get_agent_config()
            cfg.update(data)
            agent_engine.save_agent_config(cfg)
            body = json.dumps({'success': True, 'config': cfg}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if clean in ('/api/prayers', '/save_prayer.php', '/api/save_prayer'):
            content_len = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_len) if content_len > 0 else b'{}'
            try:
                data = json.loads(post_body.decode('utf-8'))
            except Exception:
                data = {}
            action = data.get('action', '')
            p_file = os.path.join(ROOT, 'prayer_requests.json')
            d_file = os.path.join(ROOT, 'data', 'prayer_requests.json')
            
            prayers = []
            target_file = p_file if os.path.exists(p_file) else d_file
            if os.path.exists(target_file):
                try:
                    with open(target_file, 'r', encoding='utf-8') as f:
                        prayers = json.load(f)
                except Exception:
                    prayers = []

            resp = {'success': False, 'message': 'Ação inválida.'}
            if action == 'add':
                new_id = f"prayer_{int(time.time() * 1000)}"
                raw_name = (data.get('name') or 'Anônimo').strip()
                new_prayer = {
                    'id': new_id,
                    'name': raw_name,
                    'initials': raw_name[:2].upper(),
                    'target': data.get('target', 'Oração'),
                    'reason': data.get('reason', 'Vida e Família'),
                    'message': (data.get('message') or '').strip(),
                    'prayers_count': 0,
                    'is_public': bool(data.get('is_public', True)),
                    'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    'replies': []
                }
                prayers.insert(0, new_prayer)
                resp = {'success': True, 'message': 'Pedido de oração enviado com sucesso!', 'prayer': new_prayer}
            elif action == 'pray':
                p_id = data.get('prayer_id', '')
                for p in prayers:
                    if p.get('id') == p_id:
                        p['prayers_count'] = p.get('prayers_count', 0) + 1
                        resp = {'success': True, 'message': 'Obrigado por orar!'}
                        break
            elif action == 'reply':
                p_id = data.get('prayer_id', '')
                r_name = (data.get('name') or 'Anônimo').strip()
                r_msg = (data.get('message') or '').strip()
                for p in prayers:
                    if p.get('id') == p_id:
                        if 'replies' not in p or not isinstance(p['replies'], list):
                            p['replies'] = []
                        new_reply = {
                            'id': f"reply_{int(time.time() * 1000)}",
                            'name': r_name,
                            'message': r_msg,
                            'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat()
                        }
                        p['replies'].append(new_reply)
                        resp = {'success': True, 'message': 'Resposta enviada!', 'reply': new_reply}
                        break
            elif action == 'delete':
                p_id = data.get('prayer_id', '')
                prayers = [p for p in prayers if p.get('id') != p_id]
                resp = {'success': True, 'message': 'Pedido excluído com sucesso.'}
            elif action == 'delete_reply':
                p_id = data.get('prayer_id', '')
                r_id = data.get('reply_id', '')
                for p in prayers:
                    if p.get('id') == p_id:
                        p['replies'] = [r for r in p.get('replies', []) if r.get('id') != r_id]
                        resp = {'success': True, 'message': 'Resposta excluída.'}
                        break

            # Save back to files
            try:
                with open(p_file, 'w', encoding='utf-8') as f:
                    json.dump(prayers, f, indent=2, ensure_ascii=False)
                with open(d_file, 'w', encoding='utf-8') as f:
                    json.dump(prayers, f, indent=2, ensure_ascii=False)
            except Exception as e:
                print('Error saving prayers:', e)

            body = json.dumps(resp).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        body = json.dumps({'error': 'Not found'}).encode('utf-8')
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    print(f'Servidor local em http://localhost:{PORT}/  (Ctrl+C para parar)')
    http.server.ThreadingHTTPServer(('', PORT), Handler).serve_forever()
