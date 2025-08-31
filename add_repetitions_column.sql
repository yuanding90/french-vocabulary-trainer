-- Add repetitions column to user_progress table
-- This column tracks how many times a word has been successfully reviewed
-- Required for proper SRS interval calculations

-- First, check if the column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_progress' 
        AND column_name = 'repetitions'
    ) THEN
        -- Add the repetitions column
        ALTER TABLE user_progress 
        ADD COLUMN repetitions INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Added repetitions column to user_progress table';
    ELSE
        RAISE NOTICE 'repetitions column already exists in user_progress table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_progress' 
AND column_name = 'repetitions';
