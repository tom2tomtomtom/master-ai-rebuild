-- QUICK FIX: Database error saving new user
-- Run this in Supabase SQL Editor FIRST
-- 👉 https://supabase.com/dashboard/project/fsohtauqtcftdjcjfdpq/sql

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: Drop existing trigger if it exists
-- ═══════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Create the trigger function with SECURITY DEFINER
-- This bypasses RLS and runs with the function owner's permissions
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER -- This is KEY - bypasses RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicates
  
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: Create the trigger on auth.users
-- ═══════════════════════════════════════════════════════════════
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: Verify setup
-- ═══════════════════════════════════════════════════════════════
SELECT 
  'Trigger created successfully' as status,
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'handle_new_user';


