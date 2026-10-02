DROP TABLE IF EXISTS test_check;

CREATE TABLE IF NOT EXISTS lexicon (
  word_key TEXT PRIMARY KEY,
  word TEXT,
  lemma TEXT,
  trans TEXT,
  gram TEXT,
  freq INTEGER,
  translit TEXT,
  pronounce TEXT,
  senses TEXT,
  theology TEXT
);

CREATE INDEX IF NOT EXISTS idx_lex_lemma ON lexicon(lemma);
CREATE INDEX IF NOT EXISTS idx_lex_trans ON lexicon(trans);

CREATE TABLE IF NOT EXISTS bible_chapters (
  book_id TEXT,
  chapter INTEGER,
  mode TEXT,
  content TEXT,
  PRIMARY KEY (book_id, chapter, mode)
);

CREATE INDEX IF NOT EXISTS idx_bc_lookup ON bible_chapters(book_id, chapter, mode);
