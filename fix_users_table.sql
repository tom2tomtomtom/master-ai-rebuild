-- Quick fix for users table to allow NULL selected_path
-- Run this in Supabase SQL Editor

-- Step 1: Drop the NOT NULL constraint if it exists
ALTER TABLE public.users 
  ALTER COLUMN selected_path DROP NOT NULL;

-- Step 2: Make sure email is NOT NULL
ALTER TABLE public.users 
  ALTER COLUMN email SET NOT NULL;

-- Step 3: Verify the fix
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;


