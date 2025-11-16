-- ============================================================================
-- STAGED LEARNING SCHEMA
-- Transform lessons into interactive, bite-sized stages
-- ============================================================================

-- ============================================================================
-- TABLE: lesson_stages
-- Purpose: Break down each lesson into manageable, sequential stages
-- ============================================================================
CREATE TABLE lesson_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  
  -- Stage identification and ordering
  stage_number INTEGER NOT NULL, -- 1, 2, 3, etc. within the lesson
  title TEXT NOT NULL, -- "Introduction to Prompting"
  slug TEXT NOT NULL, -- "introduction-to-prompting"
  
  -- Content
  content TEXT NOT NULL, -- Markdown content for this stage
  content_type TEXT NOT NULL DEFAULT 'reading' CHECK (content_type IN (
    'reading',      -- Standard text/markdown content
    'exercise',     -- Hands-on practice task
    'quiz',         -- Knowledge check questions
    'practice',     -- Try-it-yourself section
    'video',        -- Video content (future)
    'reflection'    -- Thinking/reflection prompt
  )),
  
  -- Stage metadata
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_required BOOLEAN DEFAULT true, -- Must complete to proceed?
  
  -- Prompts and exercises
  prompt_template TEXT, -- For exercise/practice stages
  example_output TEXT,  -- Show expected results
  success_criteria TEXT, -- How to know you succeeded
  
  -- Ordering and status
  display_order INTEGER NOT NULL, -- Explicit ordering (allows reordering without renumbering)
  is_published BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(lesson_id, stage_number),
  UNIQUE(lesson_id, slug),
  UNIQUE(lesson_id, display_order)
);

-- Indexes for performance
CREATE INDEX idx_lesson_stages_lesson_id ON lesson_stages(lesson_id);
CREATE INDEX idx_lesson_stages_lesson_order ON lesson_stages(lesson_id, display_order);
CREATE INDEX idx_lesson_stages_type ON lesson_stages(content_type);

-- ============================================================================
-- TABLE: user_stage_progress
-- Purpose: Track user progress through individual lesson stages
-- ============================================================================
CREATE TABLE user_stage_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and stage identification
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES lesson_stages(id) ON DELETE CASCADE,
  
  -- Progress tracking
  completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Engagement metrics
  time_spent_seconds INTEGER DEFAULT 0, -- Total time on this stage
  view_count INTEGER DEFAULT 1, -- Number of times viewed
  
  -- User work and notes
  user_response TEXT, -- For exercises/practice stages
  user_notes TEXT, -- Personal notes on this stage
  
  -- Quality indicators
  confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5), -- Self-reported understanding
  needs_review BOOLEAN DEFAULT false, -- Flag for revisiting
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, stage_id) -- One progress record per user per stage
);

-- Indexes for performance
CREATE INDEX idx_user_stage_progress_user ON user_stage_progress(user_id);
CREATE INDEX idx_user_stage_progress_lesson ON user_stage_progress(lesson_id);
CREATE INDEX idx_user_stage_progress_stage ON user_stage_progress(stage_id);
CREATE INDEX idx_user_stage_progress_user_lesson ON user_stage_progress(user_id, lesson_id);
CREATE INDEX idx_user_stage_progress_completed ON user_stage_progress(completed);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE lesson_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stage_progress ENABLE ROW LEVEL SECURITY;

-- lesson_stages policies: Anyone can read published stages
CREATE POLICY "Anyone can read published lesson stages"
  ON lesson_stages
  FOR SELECT
  USING (is_published = true);

-- Admins can do everything with stages (for future admin panel)
CREATE POLICY "Service role can manage lesson stages"
  ON lesson_stages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- user_stage_progress policies: Users can only see/edit their own progress
CREATE POLICY "Users can read own stage progress"
  ON user_stage_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stage progress"
  ON user_stage_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stage progress"
  ON user_stage_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lesson_stages_updated_at
  BEFORE UPDATE ON lesson_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stage_progress_updated_at
  BEFORE UPDATE ON user_stage_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER VIEWS (Optional but useful)
-- ============================================================================

-- View: Get stage completion stats per lesson per user
CREATE OR REPLACE VIEW user_lesson_stage_stats AS
SELECT 
  usp.user_id,
  usp.lesson_id,
  COUNT(ls.id) as total_stages,
  COUNT(CASE WHEN usp.completed THEN 1 END) as completed_stages,
  ROUND(
    (COUNT(CASE WHEN usp.completed THEN 1 END)::DECIMAL / NULLIF(COUNT(ls.id), 0)) * 100, 
    2
  ) as completion_percentage,
  SUM(usp.time_spent_seconds) as total_time_seconds
FROM lesson_stages ls
LEFT JOIN user_stage_progress usp ON ls.id = usp.stage_id
WHERE ls.is_published = true
GROUP BY usp.user_id, usp.lesson_id;

-- ============================================================================
-- SAMPLE DATA STRUCTURE (for reference)
-- ============================================================================

/*
Example: Breaking down "Lesson 2: ChatGPT Advanced Writing" into stages

Stage 1: Introduction (reading)
  - The business reality
  - Why this matters
  - What you'll learn

Stage 2: Quick Win (practice)
  - Your first professional article in 60 seconds
  - Copy-paste prompt
  - See immediate results

Stage 3: Deep Dive (reading)
  - Understanding Canvas
  - Advanced writing techniques
  - Quality controls

Stage 4: Hands-On Exercise (exercise)
  - Write your own article
  - Use the framework
  - Submit for review

Stage 5: Advanced Templates (practice)
  - Try different content types
  - Experiment with styles
  - Build your library

Stage 6: Reflection (reflection)
  - What did you learn?
  - How will you apply it?
  - Next steps
*/

-- ============================================================================
-- NOTES FOR IMPLEMENTATION
-- ============================================================================

/*
MIGRATION STRATEGY:
1. Add these tables (this schema)
2. Keep existing lessons.content field for backward compatibility
3. Build stage parser to break existing lessons into stages
4. Gradually migrate lessons from monolithic to staged
5. UI can check: if lesson has stages, show staged view; else show legacy view

STAGE PARSING LOGIC:
- Parse markdown by ## headings
- Each ## becomes a potential stage
- Detect section types based on content/keywords
- Example: sections with "Exercise:", "Try this:", "Practice:" → exercise type

UI COMPONENTS NEEDED:
- Stage navigation (1 of 6 stages)
- Progress indicator per stage
- "Mark stage complete" button
- Stage-specific UI (exercise has different UI than reading)
- Time tracking per stage

BENEFITS:
- Bite-sized learning (5-10 min chunks vs 45 min monolith)
- Better progress tracking (70% through lesson vs binary complete/incomplete)
- Targeted learning (jump to specific stage)
- Better analytics (which stages are hard? where do users drop off?)
- Gamification potential (badges per stage type, streaks)
*/

