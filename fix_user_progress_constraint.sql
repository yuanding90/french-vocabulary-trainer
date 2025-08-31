-- Fix user_progress table unique constraint issue
-- This script will properly recreate the table with the correct constraints

-- Drop the existing unique constraint if it exists
ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_user_id_word_id_deck_id_key;

-- Drop any existing unique indexes
DROP INDEX IF EXISTS user_progress_unique_idx;

-- Recreate the table with proper constraints
DROP TABLE IF EXISTS user_progress CASCADE;

CREATE TABLE user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    deck_id UUID REFERENCES vocabulary_decks(id) ON DELETE CASCADE,
    repetitions INTEGER DEFAULT 0,
    interval REAL DEFAULT 0,
    ease_factor REAL DEFAULT 2.5,
    next_review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    again_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a unique constraint that allows upsert to work properly
CREATE UNIQUE INDEX user_progress_unique_idx ON user_progress(user_id, word_id, deck_id);

-- Enable Row Level Security
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can delete their own progress" ON user_progress;

-- Create RLS policies for user_progress
CREATE POLICY "Users can view their own progress" ON user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON user_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON user_progress
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_word_id ON user_progress(word_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_deck_id ON user_progress(deck_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_next_review ON user_progress(next_review_date);

-- Verify the table was created correctly
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_progress'
ORDER BY ordinal_position;

-- Show the unique constraint
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_progress' 
AND indexname LIKE '%unique%';
