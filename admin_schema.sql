-- Tabelas do painel /admin (rode uma vez em cada banco: local e remoto).
-- O hash da senha e o segredo do token entram por tools/setup_admin.py (arquivo admin_setup.sql).

CREATE TABLE IF NOT EXISTS admin_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Falhas de login (limite de tentativas por IP e global)
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip TEXT    NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_attempts_ip ON admin_login_attempts (ip, ts);
CREATE INDEX IF NOT EXISTS idx_admin_attempts_ts ON admin_login_attempts (ts);

-- Textos editados (só o que difere do HTML original da página)
CREATE TABLE IF NOT EXISTS page_blocks (
  page       TEXT    NOT NULL,
  key        TEXT    NOT NULL,
  html       TEXT    NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (page, key)
);

-- Histórico de versões salvas de cada bloco (guarda as 20 últimas)
CREATE TABLE IF NOT EXISTS page_block_revisions (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  page     TEXT    NOT NULL,
  key      TEXT    NOT NULL,
  html     TEXT    NOT NULL,
  saved_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_revisions_lookup ON page_block_revisions (page, key, id DESC);
