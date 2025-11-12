-- Check what tables currently exist in your Supabase database
-- Run this in SQL Editor first to see what's there

SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
