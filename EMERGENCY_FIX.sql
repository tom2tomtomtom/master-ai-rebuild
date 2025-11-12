-- EMERGENCY FIX: 500 Error on User Creation
-- Run this IMMEDIATELY in Supabase SQL Editor
-- 👉 https://supabase.com/dashboard/project/fsohtauqtcftdjcjfdpq/sql

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: Fix RLS Policies (Allow users to INSERT and UPDATE their own records)
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Allow users to INSERT their own record (for upsert to work)
CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to UPDATE their own record
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to SELECT their own record
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Recreate the trigger with SECURITY DEFINER
-- ═══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: Grant necessary permissions
-- ═══════════════════════════════════════════════════════════════

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.lessons TO authenticated;
GRANT ALL ON public.user_progress TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: Verify the setup
-- ═══════════════════════════════════════════════════════════════

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'users';


