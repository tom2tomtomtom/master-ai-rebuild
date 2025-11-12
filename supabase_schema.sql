-- Master-AI Database Schema
-- Execute this in Supabase SQL Editor: https://supabase.com/dashboard/project/fsohtauqtcftdjcjfdpq/sql

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  selected_path TEXT NOT NULL CHECK (selected_path IN ('business', 'creative', 'technical', 'leadership', 'complete')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LESSONS TABLE
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  lesson_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 45,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USER_PROGRESS TABLE
CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, lesson_id)
);

-- ROW LEVEL SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users view own data" ON users;
DROP POLICY IF EXISTS "Users update own data" ON users;
DROP POLICY IF EXISTS "Users insert own data" ON users;
DROP POLICY IF EXISTS "Users view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users manage own progress" ON user_progress;
DROP POLICY IF EXISTS "Anyone can read published lessons" ON lessons;

-- Users policies
CREATE POLICY "Users view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own data" ON users  
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User progress policies
CREATE POLICY "Users view own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users manage own progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id);

-- Lessons policies (public read)
CREATE POLICY "Anyone can read published lessons" ON lessons
  FOR SELECT USING (is_published = true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON user_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lessons_published ON lessons(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_lessons_number ON lessons(lesson_number);
