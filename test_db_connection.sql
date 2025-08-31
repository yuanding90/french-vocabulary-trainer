-- Test database connection and user_progress table
-- Run this in your Supabase SQL editor to verify the table exists

-- Check if user_progress table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_progress'
);

-- Show table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_progress'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'user_progress';

-- Test a simple insert (this will fail if RLS is blocking it)
-- INSERT INTO user_progress (user_id, word_id, deck_id, repetitions, interval, ease_factor, next_review_date, again_count)
-- VALUES ('00000000-0000-0000-0000-000000000000', 1, '00000000-0000-0000-0000-000000000000', 1, 1, 2.5, NOW(), 0);
