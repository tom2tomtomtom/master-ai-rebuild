# 🚀 MASTER-AI REBUILD TRACKER

**Project**: Master-AI Learning Platform (From Scratch)  
**Timeline**: 3 Days  
**Start Date**: ___________  
**Target Launch**: ___________

---

## 📝 HOW TO USE THIS TRACKER

### Updating Progress:
1. **Mark tasks complete**: Change `- [ ]` to `- [x]`
2. **Add notes**: Use the `Notes:` sections under each phase
3. **Track blockers**: Use the `⚠️ BLOCKERS` section at bottom
4. **Update dates**: Fill in actual completion times
5. **Save frequently**: `Cmd/Ctrl + S` after each update

### Quick Commands:
- **Find next task**: Search for `- [ ]` (unchecked box)
- **See progress**: Count `[x]` vs `[ ]`
- **Jump to day**: Search for `DAY 1`, `DAY 2`, `DAY 3`

---

## 🎯 PROJECT REQUIREMENTS CHECKLIST

### Core Features Needed:
- [ ] User authentication (magic link)
- [ ] 5 learning paths (business, creative, technical, leadership, complete)
- [ ] 73 lessons (markdown content)
- [ ] Progress tracking (lesson completion)
- [ ] Simple dashboard
- [ ] Responsive design

### What We're NOT Building:
- [x] ~~Stripe subscriptions~~ (Invoice-based only)
- [x] ~~Team collaboration~~
- [x] ~~Gamification/achievements~~
- [x] ~~Certifications~~
- [x] ~~Graded exercises~~
- [x] ~~Admin approval workflows~~

---

## 📊 OVERALL PROGRESS

**Status**: 🔴 Not Started | 🟡 In Progress | 🟢 Complete

| Day | Status | Completion | Duration | Notes |
|-----|--------|------------|----------|-------|
| Day 1 | 🔴 | 0/3 phases | ___ hrs | Foundation |
| Day 2 | 🔴 | 0/4 phases | ___ hrs | Core Features |
| Day 3 | 🔴 | 0/3 phases | ___ hrs | Polish & Deploy |

**Total Progress**: 0/10 phases complete (0%)

---

# DAY 1: FOUNDATION (Target: 6 hours)

**Date Started**: ___________  
**Date Completed**: ___________  
**Actual Duration**: ___________

## Phase 1: Database Setup (1 hour)
**Status**: 🔴 Not Started  
**Started**: ___________ | **Completed**: ___________

### Tasks:
- [ ] Open Supabase dashboard
- [ ] Create new project (if needed) or use existing
- [ ] **CRITICAL**: Backup existing database (if any data to keep)
- [ ] Drop all old tables from previous project
- [ ] Create `users` table with schema
- [ ] Create `user_progress` table with schema
- [ ] Verify `lessons` table exists (or create)
- [ ] Set up RLS policies for users table
- [ ] Set up RLS policies for user_progress table
- [ ] Enable Supabase Auth (Magic Link provider)
- [ ] Test magic link auth flow manually
- [ ] Save Supabase credentials (URL + anon key)

### SQL Scripts to Run:
```sql
-- 1. DROP OLD TABLES (⚠️ CAREFUL!)
-- List all tables first to verify
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Then drop (uncomment when ready):
-- DROP TABLE IF EXISTS [old_table_name] CASCADE;

-- 2. CREATE NEW TABLES
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  selected_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_progress (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  PRIMARY KEY (user_id, lesson_id)
);

-- 3. RLS POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own data" ON users  
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users view own progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id);
```

### Verification Checklist:
- [ ] Can view tables in Supabase dashboard
- [ ] RLS policies show as "enabled"
- [ ] Magic link test email arrives
- [ ] Credentials saved in password manager

**Notes:**
```
[Add any issues, decisions, or observations here]




```

---

## Phase 2: Lesson Data Migration (2 hours)
**Status**: 🔴 Not Started  
**Started**: ___________ | **Completed**: ___________

### Tasks:
- [ ] Locate all 88 lesson .md files
- [ ] Verify files are named: `lesson-00.md` through `lesson-87.md`
- [ ] Create `scripts/seed-lessons.ts` file
- [ ] Install dependencies: `npm install @supabase/supabase-js`
- [ ] Write parsing logic to extract title from markdown
- [ ] Write bulk insert script
- [ ] Run seed script for first 10 lessons (test)
- [ ] Verify data in Supabase dashboard
- [ ] Run full seed script for all 73 lessons
- [ ] Verify lesson count (should be 73 total)
- [ ] Test querying lessons by ID
- [ ] Commit seed script to git

### Script Location:
`/scripts/seed-lessons.ts`

### Verification Checklist:
- [ ] All 73 lessons in database
- [ ] Lesson numbers are sequential (0-72)
- [ ] Titles are correctly extracted
- [ ] Content is not truncated
- [ ] Can query by lesson ID successfully

**Notes:**
```
[Add file paths, any parsing issues, etc.]




```

---

## Phase 3: Next.js Project Setup (3 hours)
**Status**: 🔴 Not Started  
**Started**: ___________ | **Completed**: ___________

### Tasks:
- [ ] Create new Next.js project with TypeScript
- [ ] Install Tailwind CSS
- [ ] Install Supabase packages
- [ ] Set up environment variables (.env.local)
- [ ] Create lib/supabase.ts (Supabase client)
- [ ] Create lib/learning-paths.ts (path config)
- [ ] Set up basic folder structure
- [ ] Create landing page (app/page.tsx)
- [ ] Test dev server runs (`npm run dev`)
- [ ] Verify Supabase connection works
- [ ] Install react-markdown for lesson content
- [ ] Create git repository
- [ ] Initial commit

### Command History:
```bash
# Run these commands:
cd /Users/tommyhyde/Code_Projects
npx create-next-app@latest master-ai --typescript --tailwind --app
cd master-ai
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install react-markdown remark-gfm
npm run dev

# Git setup:
git init
git add .
git commit -m "Initial project setup"
```

### File Structure to Create:
```
src/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── onboarding/
│   │   └── page.tsx            # Path selection
│   ├── dashboard/
│   │   └── page.tsx            # Lesson list
│   └── lesson/[id]/
│       └── page.tsx            # Lesson viewer
├── lib/
│   ├── supabase.ts             # Supabase client
│   └── learning-paths.ts       # Path configuration
└── components/
    ├── auth-provider.tsx
    └── path-card.tsx
```

### Verification Checklist:
- [ ] Dev server runs without errors
- [ ] Can access http://localhost:3000
- [ ] Environment variables loaded
- [ ] Supabase connection verified
- [ ] Git initialized with first commit

**Notes:**
```
[Add any installation issues, version conflicts, etc.]




```

---

## 📋 DAY 1 SUMMARY

**Total Time Spent**: ___________ hours  
**Blockers Encountered**: ___________  
**Key Decisions Made**: ___________

### What's Working:
```
[List successful completions]


```

### What Needs Attention:
```
[List any technical debt or concerns]


```

---

# DAY 2: CORE FEATURES (Target: 8 hours)

**Date Started**: ___________  
**Date Completed**: ___________  
**Actual Duration**: ___________

## Phase 1: Auth Flow (2 hours)
**Status**: 🔴 Not Started  
**Started**: ___________ | **Completed**: ___________

### Tasks:
- [ ] Create landing page with hero section
- [ ] Add "Get Started" CTA button
- [ ] Create auth provider component
- [ ] Implement magic link signup flow
- [ ] Create auth callback route
- [ ] Add loading states during auth
- [ ] Implement protected route middleware
- [ ] Test signup flow end-to-end
- [ ] Test email delivery
- [ ] Add error handling for failed auth
- [ ] Style auth pages
- [ ] Test on mobile viewport

### Files to Create:
- `app/page.tsx` - Landing page
- `app/auth/callback/route.ts` - Auth callback
- `components/auth-provider.tsx` - Auth wrapper
- `middleware.ts` - Route protection

### Verification Checklist:
- [ ] Can request magic link
- [ ] Email arrives within 30 seconds
- [ ] Magic link redirects correctly
- [ ] Protected routes redirect to login
- [ ] Session persists on refresh

**Notes:**
```




```

---

## Phase 2: Onboarding (2 hours)
**Status**: 🔴 Not Started  
**Started**: ___________ | **Completed**: ___________

### Tasks:
- [ ] Create onboarding page route
- [ ] Build path selection card component
- [ ] Display all 5 learning paths
- [ ] Add path descriptions and icons
- [ ] Implement path selection handler
- [ ] Save selected path to database
- [ ] Add validation (require path selection)
- [ ] Create "Continue" button
- [ ] Redirect to dashboard after selection
- [ ] Add loading state during save
- [ ] Style path cards with hover effects
- [ ] Test path selection and save

### Path Configuration Check:
- [ ] Business (💼) - 32 lessons
- [ ] Creative (🎨) - 28 lessons
- [ ] Technical (⚙️) - 30 lessons
- [ ] Leadership (👔) - 22 lessons
- [ ] Complete (🚀) - 73 lessons

### Verification Checklist:
- [ ] All 5 paths display correctly
- [ ] Can select a path
- [ ] Path saves to user record
- [ ] Redirects to dashboard
- [ ] Mobile responsive

**Notes:**
```




```

---

## Phase 3: Dashboard (2 hours)
**Status**: 🔴 Not Started  
**Started**: ___________ | **Completed**: ___________

### Tasks:
- [ ] Create dashboard page route
- [ ] Fetch user's selected path
- [ ] Query lessons for user's path
- [ ] Fetch user progress data
- [ ] Build lesson list component
- [ ] Show lesson number, title, description
- [ ] Add completion checkmarks
- [ ] Calculate and display progress (X/Y complete)
- [ ] Add "Start Lesson" buttons
- [ ] Implement "Change Path" functionality
- [ ] Add navigation header
- [ ] Style dashboard with cards
- [ ] Test with different paths

### Data Flow:
1. Get authenticated user
2. Read user.selected_path
3. Get lesson IDs from LEARNING_PATHS config
4. Query lessons table
5. Join with user_progress
6. Display with completion status

### Verification Checklist:
- [ ] Shows correct lessons for path
- [ ] Progress displays accurately
- [ ] Can navigate to lessons
- [ ] "Change Path" works
- [ ] No lessons from other paths show

**Notes:**
```




```

---

## Phase 4: Lesson Viewer (2 hours)
**Status**: 🔴 Not Started  
**Started**: ___________ | **Completed**: ___________

### Tasks:
- [ ] Create dynamic lesson route
- [ ] Fetch lesson by ID
- [ ] Render markdown content with ReactMarkdown
- [ ] Add syntax highlighting for code blocks
- [ ] Create "Complete" button component
- [ ] Implement completion handler
- [ ] Update user_progress on completion
- [ ] Calculate next lesson in path
- [ ] Add "Next Lesson" navigation
- [ ] Add "Back to Dashboard" link
- [ ] Style lesson content (typography)
- [ ] Test completion flow
- [ ] Handle last lesson (no "next")

### Markdown Rendering:
- [ ] Code blocks with syntax highlighting
- [ ] Tables render correctly
- [ ] Images display (if any)
- [ ] Links work
- [ ] Headers have proper hierarchy

### Verification Checklist:
- [ ] Markdown renders properly
- [ ] Can mark lesson complete
- [ ] Progress updates in database
- [ ] Navigation between lessons works
- [ ] Responsive on mobile

**Notes:**
```




```

---

## 📋 DAY 2 SUMMARY

**Total Time Spent**: ___________ hours  
**Blockers Encountered**: ___________  
**Key Decisions Made**: ___________

### What's Working:
```


```

### What Needs Attention:
```


```

---

# DAY 3: POLISH & DEPLOY (Target: 4 hours)

**Date Started**: ___________  
**Date Completed**: ___________  
**Actual Duration**: ___________

## Phase 1: Progress Tracking Polish (1 hour)
**Status**: 🔴 Not Started  
**Started**: ___________ | **Completed**: ___________

### Tasks:
- [ ] Add optimistic UI updates
- [ ] Show completion animation
- [ ] Add progress bar to dashboard
- [ ] Display "X% complete" indicator
- [ ] Add "Continue Learning" quick action
- [ ] Test progress persistence
- [ ] Add undo completion (if needed)
- [ ] Verify progress across sessions
- [ ] Test with multiple users
- [ ] Add completion timestamps

### Verification Checklist:
- [ ] Progress saves immediately
- [ ] UI updates without refresh
- [ ] Works across browser tabs
- [ ] Progress persists after logout/login

**Notes:**
```




```

---

## Phase 2: UI Polish (1 hour)
**Status**: 🔴 Not Started  
**Started**: ___________ | **Completed**: ___________

### Tasks:
- [ ] Add loading skeletons
- [ ] Create error boundary components
- [ ] Add empty states (no lessons, etc.)
- [ ] Implement toast notifications
- [ ] Check mobile responsiveness
- [ ] Test on iPhone viewport
- [ ] Test on Android viewport
- [ ] Fix any layout issues
- [ ] Add favicon
- [ ] Add meta tags for SEO
- [ ] Test keyboard navigation
- [ ] Verify color contrast (accessibility)

### Device Testing:
- [ ] Desktop (1920x1080)
- [ ] Laptop (1440x900)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

### Verification Checklist:
- [ ] No console errors
- [ ] All interactions have feedback
- [ ] Loading states everywhere
- [ ] Graceful error handling
- [ ] Accessible to screen readers

**Notes:**
```




```

---

## Phase 3: Deploy to Production (2 hours)
**Status**: 🔴 Not Started  
**Started**: ___________ | **Completed**: ___________

### Tasks:
- [ ] Create Vercel account (if needed)
- [ ] Connect GitHub repository
- [ ] Configure environment variables in Vercel
- [ ] Set up production domain
- [ ] Run production build locally first
- [ ] Fix any build errors
- [ ] Deploy to Vercel
- [ ] Verify deployment successful
- [ ] Test production site end-to-end
- [ ] Set up Supabase production credentials
- [ ] Update auth callback URLs
- [ ] Test auth flow in production
- [ ] Share production URL with team

### Environment Variables to Set:
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] NEXT_PUBLIC_SITE_URL

### Production Testing Checklist:
- [ ] Can sign up
- [ ] Can select path
- [ ] Dashboard loads
- [ ] Lessons load
- [ ] Can mark complete
- [ ] Progress persists

### Production URL:
```
https://_____________________.vercel.app
```

**Notes:**
```




```

---

## 📋 DAY 3 SUMMARY

**Total Time Spent**: ___________ hours  
**Blockers Encountered**: ___________  
**Key Decisions Made**: ___________

### What's Working:
```


```

### What Needs Attention:
```


```

---

# ✅ FINAL LAUNCH CHECKLIST

## Pre-Launch:
- [ ] All 10 phases marked complete
- [ ] No critical bugs
- [ ] Performance is acceptable (< 3s page load)
- [ ] Mobile works perfectly
- [ ] Auth flow is bulletproof
- [ ] Progress tracking works

## Launch Day:
- [ ] Announce to Alt/Shift team
- [ ] Send to first test client
- [ ] Monitor Vercel analytics
- [ ] Watch for errors in Sentry/logs
- [ ] Be available for support

## Post-Launch (Week 1):
- [ ] Collect user feedback
- [ ] Fix critical bugs
- [ ] Plan v1.1 features
- [ ] Send first invoice
- [ ] Document lessons learned

---

# ⚠️ BLOCKERS & ISSUES LOG

**Format**: [DATE] - [PHASE] - [ISSUE] - [STATUS] - [RESOLUTION]

### Active Blockers:
```
[None yet]




```

### Resolved Blockers:
```
[Archive resolved issues here]




```

---

# 📝 DECISIONS LOG

**Format**: [DATE] - [DECISION] - [RATIONALE]

```
[Track important architectural or product decisions]




```

---

# 🎯 POST-MVP FEATURES (Future)

**Priority**: 🔴 High | 🟡 Medium | 🟢 Nice-to-Have

### Week 2+:
- [ ] 🟡 Path switching functionality
- [ ] 🟡 Lesson bookmarks
- [ ] 🟢 Note-taking feature
- [ ] 🟢 Search functionality
- [ ] 🟢 Lesson ratings/feedback

### Month 2+:
- [ ] 🔴 Team/company accounts
- [ ] 🟡 Progress reports for managers
- [ ] 🟢 Certificates of completion
- [ ] 🟢 Social sharing

---

# 📊 METRICS TO TRACK

### Technical Metrics:
- Build time: ___________
- Bundle size: ___________
- Lighthouse score: ___________
- API response time: ___________

### User Metrics:
- Signups: ___________
- Path selection breakdown: ___________
- Avg. lessons completed: ___________
- Completion rate: ___________

---

**Last Updated**: ___________  
**Status**: 🔴 Not Started

---

## 🚀 QUICK START REMINDER

**To begin Day 1, run:**
```bash
cd /Users/tommyhyde/Code_Projects/master-ai-rebuild
open MASTER_AI_BUILD_TRACKER.md
# Then start Phase 1: Database Setup
```

**Good luck! You've got this. 🔥**
