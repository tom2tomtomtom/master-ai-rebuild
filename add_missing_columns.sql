-- Add missing columns to lessons table for chatbot functionality
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Intermediate';

-- Update existing lessons with default values
UPDATE lessons 
SET 
  category = 'General',
  difficulty = 'Intermediate'
WHERE category IS NULL OR difficulty IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_lessons_category ON lessons(category);
CREATE INDEX IF NOT EXISTS idx_lessons_difficulty ON lessons(difficulty);

