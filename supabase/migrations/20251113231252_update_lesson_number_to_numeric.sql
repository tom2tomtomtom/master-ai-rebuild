-- Update lesson_number column to support decimal values (0.5, 9.5)
-- This allows for intermediate lessons between major lesson numbers

-- Drop the unique constraint to allow the type change
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_lesson_number_key;

-- Convert the column type from INTEGER to NUMERIC(4,1) to support decimals
-- This allows lesson numbers from 0.0 to 999.9 with 1 decimal place
ALTER TABLE lessons ALTER COLUMN lesson_number TYPE NUMERIC(4,1);

-- Re-add the unique constraint to ensure no duplicate lesson numbers
ALTER TABLE lessons ADD CONSTRAINT lessons_lesson_number_key UNIQUE (lesson_number);

-- Index is automatically updated by PostgreSQL when column type changes
-- The existing idx_lessons_number index will work with NUMERIC type
