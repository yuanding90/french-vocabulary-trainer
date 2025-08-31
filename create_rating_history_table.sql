-- Create rating_history table for tracking consecutive ratings
-- Required for sophisticated leech removal logic

-- Drop table if it exists (for clean recreation)
DROP TABLE IF EXISTS rating_history CASCADE;

-- Create the rating_history table
CREATE TABLE rating_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES vocabulary_decks(id) ON DELETE CASCADE,
    rating TEXT NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy', 'learn', 'know')),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_rating_history_user_word ON rating_history(user_id, word_id);
CREATE INDEX idx_rating_history_timestamp ON rating_history(timestamp);
CREATE INDEX idx_rating_history_rating ON rating_history(rating);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX idx_rating_history_unique ON rating_history(user_id, word_id, deck_id, timestamp);

-- Enable Row Level Security
ALTER TABLE rating_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own rating history" ON rating_history;
CREATE POLICY "Users can view their own rating history" ON rating_history
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own rating history" ON rating_history;
CREATE POLICY "Users can insert their own rating history" ON rating_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own rating history" ON rating_history;
CREATE POLICY "Users can update their own rating history" ON rating_history
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own rating history" ON rating_history;
CREATE POLICY "Users can delete their own rating history" ON rating_history
    FOR DELETE USING (auth.uid() = user_id);

-- Verify table creation
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'rating_history' 
ORDER BY ordinal_position;
