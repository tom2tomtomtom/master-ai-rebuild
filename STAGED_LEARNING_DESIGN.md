# 🎯 Staged Learning System - Schema Design

## 📊 Database Schema Overview

### **Table 1: `lesson_stages`**
Breaks down monolithic lessons into bite-sized, sequential stages.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `lesson_id` | TEXT | Links to parent lesson |
| `stage_number` | INTEGER | Sequential number (1, 2, 3...) |
| `title` | TEXT | "Introduction to Prompting" |
| `slug` | TEXT | URL-friendly identifier |
| `content` | TEXT | Markdown content for this stage |
| `content_type` | ENUM | reading, exercise, quiz, practice, video, reflection |
| `estimated_minutes` | INTEGER | Time to complete (default: 5) |
| `difficulty` | TEXT | beginner, intermediate, advanced |
| `is_required` | BOOLEAN | Must complete to proceed? |
| `prompt_template` | TEXT | For exercise stages |
| `example_output` | TEXT | Show expected results |
| `success_criteria` | TEXT | How to know you succeeded |
| `display_order` | INTEGER | Explicit ordering |
| `is_published` | BOOLEAN | Visibility control |

**Unique Constraints:**
- `(lesson_id, stage_number)` - One stage #1, #2, etc. per lesson
- `(lesson_id, slug)` - Unique URLs per lesson
- `(lesson_id, display_order)` - Explicit ordering

---

### **Table 2: `user_stage_progress`**
Tracks user progress through individual stages with rich analytics.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Links to users table |
| `lesson_id` | TEXT | Links to lessons table |
| `stage_id` | UUID | Links to lesson_stages |
| `completed` | BOOLEAN | Stage finished? |
| `started_at` | TIMESTAMPTZ | When first accessed |
| `completed_at` | TIMESTAMPTZ | When marked complete |
| `last_viewed_at` | TIMESTAMPTZ | Most recent view |
| `time_spent_seconds` | INTEGER | Engagement tracking |
| `view_count` | INTEGER | Number of views |
| `user_response` | TEXT | For exercise submissions |
| `user_notes` | TEXT | Personal notes |
| `confidence_level` | INTEGER | Self-reported (1-5) |
| `needs_review` | BOOLEAN | Flag for later review |

**Unique Constraint:**
- `(user_id, stage_id)` - One progress record per user per stage

---

## 🎨 Stage Types

| Type | Purpose | UI Elements |
|------|---------|-------------|
| **reading** | Standard text content | Scroll progress, "Continue" button |
| **exercise** | Hands-on practice | Prompt template, input area, submit |
| **quiz** | Knowledge check | Questions, instant feedback |
| **practice** | Try-it-yourself | Sandbox, examples, hints |
| **video** | Video content | Player, timestamps, notes |
| **reflection** | Thinking prompts | Open-ended questions, journal |

---

## 📐 Example: Lesson Broken Into Stages

**Before (Monolithic):**
```
Lesson 2: ChatGPT Advanced Writing (8,000 words, 45 minutes)
├─ Entire content in one scroll
└─ Binary: Complete or Incomplete
```

**After (Staged):**
```
Lesson 2: ChatGPT Advanced Writing
├─ Stage 1: Business Reality (reading, 3 min)
├─ Stage 2: Quick Win Exercise (practice, 5 min) ⭐
├─ Stage 3: Canvas Deep Dive (reading, 7 min)
├─ Stage 4: Write Your Article (exercise, 15 min) ⭐
├─ Stage 5: Advanced Templates (practice, 10 min)
└─ Stage 6: Reflection (reflection, 5 min)

Progress: 4/6 stages complete (67%)
```

---

## 🔐 Row Level Security (RLS)

### `lesson_stages`
- ✅ Anyone can read published stages
- 🔒 Only service role can create/update/delete

### `user_stage_progress`
- ✅ Users can only see/edit their own progress
- 🔒 No cross-user access

---

## 📈 Analytics Views

### `user_lesson_stage_stats` (Helper View)
```sql
SELECT 
  user_id,
  lesson_id,
  total_stages,
  completed_stages,
  completion_percentage,
  total_time_seconds
FROM user_lesson_stage_stats
WHERE user_id = 'current-user';
```

**Output Example:**
| lesson_id | total_stages | completed_stages | completion_percentage | total_time |
|-----------|--------------|------------------|----------------------|------------|
| lesson-02 | 6 | 4 | 66.67% | 1,620s (27 min) |

---

## 🚀 Migration Strategy

### Phase 1: Add Tables (This PR)
- ✅ Run the schema migration
- ✅ Tables exist alongside current `lessons` table
- ✅ Zero breaking changes

### Phase 2: Build Stage Parser
- Parse existing lesson markdown
- Detect sections (## headings)
- Classify stage types based on keywords
- Auto-generate stages from existing lessons

### Phase 3: UI Components
- Stage navigation component
- Progress indicators per stage
- Stage-specific renderers (exercise vs reading)
- Time tracking integration

### Phase 4: Gradual Migration
- Start with 1-2 pilot lessons
- Get user feedback
- Iterate on stage structure
- Migrate remaining lessons

### Phase 5: Enhanced Features
- Stage-based recommendations
- Gamification (badges per stage type)
- Social features (share progress)
- Analytics dashboard

---

## 🎯 Benefits

### For Users:
- **Bite-sized chunks**: 5-10 min stages vs 45 min lessons
- **Clear progress**: "4 of 6 stages" vs "70% complete"
- **Flexible learning**: Jump to specific stages
- **Better retention**: Smaller chunks = better memory
- **Confidence tracking**: Self-assessment per stage

### For Platform:
- **Better analytics**: Which stages are hard? Where do users drop off?
- **Targeted improvements**: Fix specific stages, not entire lessons
- **Personalization**: Recommend stages based on user level
- **Engagement metrics**: Time per stage, completion rates
- **A/B testing**: Test different stage structures

### For Content:
- **Modular design**: Reuse stages across lessons
- **Easy updates**: Update one stage without touching others
- **Quality control**: Focus on one concept per stage
- **Progressive complexity**: Build understanding step-by-step

---

## 🛠️ Implementation Notes

### Backward Compatibility
- Keep `lessons.content` field (legacy support)
- UI checks: `if (lesson.hasStages)` → staged view, else → legacy view
- No data loss, graceful transition

### Stage Parsing Keywords
```typescript
const stageTypeDetection = {
  exercise: ['exercise:', 'try this:', 'practice:', 'hands-on:'],
  quiz: ['quiz:', 'test yourself:', 'knowledge check:'],
  practice: ['your turn:', 'apply this:', 'experiment with:'],
  reflection: ['reflect on:', 'think about:', 'what did you learn:']
};
```

### Performance Considerations
- Indexes on `(lesson_id, display_order)` for fast stage loading
- View materialization for stats (if needed at scale)
- Cache stage count per lesson

---

## 📋 Next Steps

1. **Review this schema** - Does it meet your vision?
2. **Run migration** - Apply to Supabase database
3. **Build parser** - Auto-generate stages from existing lessons
4. **Create UI components** - Stage navigation, progress tracking
5. **Pilot test** - Start with 2-3 lessons
6. **Iterate** - Refine based on usage data

---

## 🤔 Discussion Points

- Should we allow non-linear stage progression? (Skip ahead?)
- Should stages have prerequisites? (Must complete Stage 2 before Stage 4?)
- Should we track "time paused" vs "time active"?
- Should reflection stages require text input to complete?
- Should we add "bookmarks" or "favorites" for stages?

Ready to proceed with the migration? 🚀

