-- DANGER: This drops ALL tables in the public schema
-- Only run if you want to completely reset the database

-- Drop tables (with CASCADE to remove dependencies)
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;

-- Add any other tables you see from check_existing_tables.sql here
-- DROP TABLE IF EXISTS your_old_table CASCADE;

-- Verify everything is gone
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
