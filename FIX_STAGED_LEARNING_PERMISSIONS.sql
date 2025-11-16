-- ============================================================================
-- FIX: Staged Learning Permissions
-- 
-- This SQL file fixes the "permission denied for table lesson_stages" error
-- by adding the required GRANT permissions and RLS policies.
--
-- RUN THIS IF YOU SEE: "permission denied for table lesson_stages"
-- ============================================================================

-- STEP 1: Grant SELECT permission to all user roles
GRANT SELECT ON lesson_stages TO authenticated;
GRANT SELECT ON lesson_stages TO anon;
GRANT SELECT ON lesson_stages TO public;

-- STEP 2: Ensure RLS policies exist (may already exist)
-- Drop existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "Authenticated users can view published stages" ON lesson_stages;
DROP POLICY IF EXISTS "Public can view published stages" ON lesson_stages;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view published stages"
ON lesson_stages
FOR SELECT
TO authenticated
USING (is_published = true);

-- Create policies for public/anon users
CREATE POLICY "Public can view published stages"
ON lesson_stages  
FOR SELECT
TO anon, public
USING (is_published = true);

-- STEP 3: Verify the fix worked
-- This query should show SELECT permissions for authenticated, anon, and PUBLIC
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'lesson_stages'
AND privilege_type = 'SELECT'
ORDER BY grantee;

-- Expected output:
-- grantee         | privilege_type
-- ----------------|---------------
-- anon            | SELECT
-- authenticated   | SELECT
-- PUBLIC          | SELECT
-- postgres        | SELECT
-- service_role    | SELECT

-- STEP 4: Verify policies exist
SELECT policyname, cmd, roles, qual
FROM pg_policies 
WHERE tablename = 'lesson_stages'
ORDER BY policyname;

-- Expected output should include:
-- "Authenticated users can view published stages" | SELECT | {authenticated}
-- "Public can view published stages"              | SELECT | {anon,public}

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If you still see "permission denied" errors:

-- 1. Check if RLS is enabled (it should be)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'lesson_stages';
-- Should return: rowsecurity = true

-- 2. Check table owner
SELECT tablename, tableowner 
FROM pg_tables 
WHERE tablename = 'lesson_stages';
-- Should return: tableowner = postgres

-- 3. As a last resort, temporarily disable RLS to test:
-- ALTER TABLE lesson_stages DISABLE ROW LEVEL SECURITY;
-- (But re-enable it after testing!)
-- ALTER TABLE lesson_stages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- WHAT THIS FIXES
-- ============================================================================

-- BEFORE: 
--   - Users got "permission denied for table lesson_stages" error
--   - Lessons showed monolithic content (one long page)
--   - No staged learning interface
--   - Terminal showed: stagesError: Object, stages.length: 0

-- AFTER:
--   - Users can read lesson_stages table
--   - Lessons show staged learning interface
--   - Progress tracking per stage works
--   - Terminal shows: stagesError: null, stages.length: 17+

-- ============================================================================

