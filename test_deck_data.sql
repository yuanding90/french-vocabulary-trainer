-- Test script to verify deck-vocabulary relationships

-- Check if decks exist
SELECT 'Decks:' as info;
SELECT id, name, total_words FROM vocabulary_decks;

-- Check if deck_vocabulary relationships exist
SELECT 'Deck-Vocabulary Relationships:' as info;
SELECT 
    dv.deck_id,
    d.name as deck_name,
    COUNT(dv.vocabulary_id) as word_count
FROM deck_vocabulary dv
JOIN vocabulary_decks d ON dv.deck_id = d.id
GROUP BY dv.deck_id, d.name
ORDER BY d.name;

-- Check sample vocabulary words for each deck
SELECT 'Sample words from Deck 1:' as info;
SELECT 
    v.id,
    v.french_word,
    v.english_translation
FROM vocabulary v
JOIN deck_vocabulary dv ON v.id = dv.vocabulary_id
JOIN vocabulary_decks d ON dv.deck_id = d.id
WHERE d.name = 'French Basics - Part 1'
ORDER BY v.id
LIMIT 5;

SELECT 'Sample words from Deck 2:' as info;
SELECT 
    v.id,
    v.french_word,
    v.english_translation
FROM vocabulary v
JOIN deck_vocabulary dv ON v.id = dv.vocabulary_id
JOIN vocabulary_decks d ON dv.deck_id = d.id
WHERE d.name = 'French Basics - Part 2'
ORDER BY v.id
LIMIT 5;
