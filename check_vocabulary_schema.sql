-- Check vocabulary table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'vocabulary' 
ORDER BY ordinal_position;

-- Check a few sample records
SELECT id, french_word, english_translation 
FROM vocabulary 
LIMIT 5;

-- Check deck_vocabulary table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'deck_vocabulary' 
ORDER BY ordinal_position;

-- Check a few sample records from deck_vocabulary
SELECT deck_id, vocabulary_id 
FROM deck_vocabulary 
LIMIT 5;
