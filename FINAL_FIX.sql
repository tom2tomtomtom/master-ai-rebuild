-- FINAL FIX: The trigger fails because RLS blocks it
-- The issue: auth.uid() is NULL when trigger runs, so RLS blocks the INSERT
-- Solution: Make trigger function owner have BYPASSRLS or add service role policy

-- Run this in Supabase SQL Editor:
-- 👉 https://supabase.com/dashboard/project/fsohtauqtcftdjcjfdpq/sql

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: Drop the old trigger and function
-- ═══════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Create function that bypasses RLS by temporarily disabling it
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER -- Run with elevated privileges
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert directly into users table
  -- SECURITY DEFINER allows this to bypass RLS policies
  INSERT INTO public.users (id, email, name, selected_path)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NULL -- selected_path starts as NULL
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Error creating user record: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: Create the trigger
-- ═══════════════════════════════════════════════════════════════
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: Add a special RLS policy for service role (backup safety)
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Users insert own data" ON public.users;
DROP POLICY IF EXISTS "Users update own data" ON public.users;
DROP POLICY IF EXISTS "Users view own data" ON public.users;

-- Allow service role to insert (for trigger)
CREATE POLICY "Service role can insert users"
  ON public.users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow authenticated users to insert their own record (for manual upserts)
CREATE POLICY "Users insert own data"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own record
CREATE POLICY "Users update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to view their own record
CREATE POLICY "Users view own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════
-- STEP 5: Verify setup
-- ═══════════════════════════════════════════════════════════════
SELECT 
  'Setup complete!' as status,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created') as trigger_exists,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users') as policy_count;


