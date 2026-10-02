SELECT word_key, word, lemma, trans, freq FROM lexicon WHERE word_key = 'logos';
SELECT book_id, chapter, mode, length(content) as content_len FROM bible_chapters WHERE book_id = 'jo' AND chapter = 1;
