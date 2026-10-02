"""Prepara o painel /admin: gera admin_setup.sql (tabelas + hash da senha + segredo do token).

    python tools/setup_admin.py                 # pergunta a senha (não aparece na tela)
    python tools/setup_admin.py --password ...  # informa a senha na linha de comando (fica no histórico do terminal)

Depois importe no banco (uma vez; repita este passo para REDEFINIR a senha se a esquecer):
    wrangler d1 execute unoteismo-db --remote --file admin_setup.sql     # produção
    wrangler d1 execute unoteismo-db --local  --file admin_setup.sql     # teste local (wrangler dev)

A senha em si nunca é gravada: só o hash PBKDF2-SHA-256 (100.000 iterações, com sal). O admin_setup.sql
contém o hash e o segredo de assinatura, por isso está no .gitignore — apague-o depois de importar.
Depois de entrar no painel dá para trocar a senha em "Segurança".
"""
import base64
import getpass
import hashlib
import os
import secrets
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITERATIONS = 100_000  # teto do Workers para PBKDF2


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, ITERATIONS, dklen=32)
    b64 = lambda b: base64.b64encode(b).decode('ascii')
    return f'pbkdf2-sha256${ITERATIONS}${b64(salt)}${b64(digest)}'


def main():
    if '--password' in sys.argv:
        password = sys.argv[sys.argv.index('--password') + 1]
    else:
        password = getpass.getpass('Senha do painel: ')
        if password != getpass.getpass('Repita a senha: '):
            sys.exit('As senhas não conferem.')
    if len(password) < 8:
        sys.exit('Use pelo menos 8 caracteres.')

    with open(os.path.join(ROOT, 'admin_schema.sql'), 'r', encoding='utf-8') as f:
        schema = f.read()

    sql = [schema.rstrip(), '',
           "INSERT OR REPLACE INTO admin_config (key, value) VALUES ('password_hash', '%s');" % hash_password(password),
           "INSERT OR REPLACE INTO admin_config (key, value) VALUES ('token_secret', '%s');" % secrets.token_hex(32),
           "INSERT OR REPLACE INTO admin_config (key, value) VALUES ('token_version', '1');",
           "DELETE FROM admin_login_attempts;", '']
    out = os.path.join(ROOT, 'admin_setup.sql')
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(sql))
    print('Gerado:', out)
    print('Agora importe no banco:')
    print('  wrangler d1 execute unoteismo-db --remote --file admin_setup.sql')
    print('Depois apague o admin_setup.sql (contém o hash e o segredo do token).')


if __name__ == '__main__':
    main()
