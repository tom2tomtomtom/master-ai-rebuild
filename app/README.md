# Master AI Learning Platform

A B2B SaaS learning platform built with Next.js 15, TypeScript, Tailwind CSS, and Supabase. Features 73 expert-level AI lessons across 5 customizable learning paths.

## 🚀 Features

- **73 Expert Lessons** - Comprehensive curriculum covering ChatGPT, Claude, Gemini, Perplexity, and more
- **5 Learning Paths** - Business, Creative, Technical, Leadership, or Complete curriculum
- **Magic Link Authentication** - Passwordless sign-in via email
- **Progress Tracking** - Mark lessons complete and track advancement
- **Responsive Design** - Beautiful UI that works on all devices
- **Server-Side Rendering** - Fast page loads with Next.js 15 App Router

## 📋 Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works perfectly)
- npm or yarn package manager

## 🛠 Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

#### Create a Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to initialize (~2 minutes)

#### Run Database Schema
1. Open Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy and paste contents from `database/schema.sql`
4. Click **Run**

You should see: "Database schema created successfully!"

#### Configure Authentication
1. Go to **Authentication → Providers**
2. Enable the **Email** provider
3. Add redirect URLs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

#### Get API Keys
1. Go to **Settings → API**
2. Copy these three values:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`, keep this SECRET!)

### 3. Configure Environment Variables

Edit `.env.local` in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Seed Lesson Data

Import all 73 lessons from the markdown files:

```bash
npm run seed
```

You should see:
```
✅ Processed: lesson-00 - AI Tool Selection Guide
✅ Processed: lesson-01 - ChatGPT Communication Mastery
...
✅ Successfully seeded 73 lessons!
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Usage Flow

### User Journey
1. **Landing Page** → Enter email → Receive magic link
2. **Email** → Click magic link → Auto sign-in
3. **Onboarding** → Select learning path (Business, Creative, etc.)
4. **Dashboard** → View lesson list with progress
5. **Lesson** → Read content → Mark complete
6. **Dashboard** → See updated progress percentage

### Learning Paths

| Path | Icon | Focus | Lessons |
|------|------|-------|---------|
| Business Functions | 💼 | Sales, Marketing, Support, Finance | 10 |
| Creative & Design | 🎨 | Image, Video, Audio, Design | 12 |
| Development & Technical | ⚙️ | Coding, APIs, DevOps | 10 |
| Leadership & Strategy | 👔 | Teams, Governance, Strategy | 12 |
| Complete Curriculum | 🚀 | All lessons | 73 |

## 📁 Project Structure

```
app/
├── app/                      # Next.js App Router
│   ├── page.tsx             # Landing page with auth
│   ├── layout.tsx           # Root layout
│   ├── globals.css          # Global styles
│   ├── auth/
│   │   ├── callback/        # Magic link callback
│   │   └── signout/         # Sign out route
│   ├── onboarding/
│   │   └── page.tsx         # Path selection
│   ├── dashboard/
│   │   └── page.tsx         # Lesson list + progress
│   └── lesson/
│       └── [id]/
│           └── page.tsx     # Lesson viewer
├── components/              # React components
│   ├── lesson-content.tsx   # Markdown renderer
│   └── complete-button.tsx  # Progress toggle
├── lib/
│   ├── learning-paths.ts    # Path configuration
│   └── supabase/
│       ├── client.ts        # Browser client
│       └── server.ts        # Server client
├── database/
│   └── schema.sql           # Database schema
├── scripts/
│   └── seed-lessons.ts      # Lesson import script
└── middleware.ts            # Route protection
```

## 🔧 Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Links)
- **Markdown**: react-markdown + remark-gfm
- **Icons**: lucide-react
- **Hosting**: Vercel (recommended)

## 🚢 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   NEXT_PUBLIC_SITE_URL
   ```
4. Deploy!

### Post-Deployment

1. Update Supabase redirect URLs:
   - Go to Supabase → **Authentication → URL Configuration**
   - Add your Vercel domain: `https://your-app.vercel.app/auth/callback`

2. Run the seed script (one-time):
   ```bash
   npm run seed
   ```

## 🔐 Security

- **Row Level Security (RLS)**: Enabled on all tables
- **Auth Protected Routes**: Middleware guards dashboard and lessons
- **Service Role Key**: Never exposed to client (server-side only)
- **Magic Links**: Expire after 1 hour

## 🎨 Customization

### Change Learning Paths

Edit `lib/learning-paths.ts`:

```typescript
export const LEARNING_PATHS = {
  yourpath: {
    name: 'Your Custom Path',
    icon: '🎯',
    description: 'Your path description',
    lessons: ['lesson-00', 'lesson-01', ...]
  }
}
```

### Customize Styling

- **Colors**: Edit Tailwind classes in components
- **Fonts**: Update `app/layout.tsx`
- **Theme**: Modify `app/globals.css`

## 📊 Database Schema

### Tables

**users**
- `id` (UUID) - Primary key, references auth.users
- `email` (TEXT) - User email
- `name` (TEXT) - Optional display name
- `selected_path` (TEXT) - Chosen learning path
- `created_at`, `updated_at` (TIMESTAMPTZ)

**lessons**
- `id` (TEXT) - Primary key (e.g., "lesson-00")
- `lesson_number` (INTEGER) - Sort order
- `title` (TEXT) - Lesson title
- `description` (TEXT) - Short description
- `content` (TEXT) - Full markdown content
- `duration_minutes` (INTEGER) - Estimated time
- `is_published` (BOOLEAN) - Visibility flag
- `created_at`, `updated_at` (TIMESTAMPTZ)

**user_progress**
- `user_id` (UUID) - Foreign key to users
- `lesson_id` (TEXT) - Foreign key to lessons
- `completed` (BOOLEAN) - Completion status
- `completed_at` (TIMESTAMPTZ) - When marked complete
- `created_at` (TIMESTAMPTZ)

## 🐛 Troubleshooting

### Magic link not arriving
- Check spam folder
- Verify email provider is enabled in Supabase
- Check Supabase → Authentication → Logs for errors

### "Invalid API key" errors
- Verify `.env.local` exists and has correct values
- Restart dev server after changing env vars
- Check that keys match your Supabase project

### Seed script fails
- Ensure database schema was run first
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set (not anon key)
- Check that `../lessons/` directory exists with .md files

### Progress not saving
- Check browser console for errors
- Verify RLS policies are enabled (re-run schema.sql)
- Ensure user is authenticated

## 📈 Next Steps

- [ ] Add lesson search functionality
- [ ] Implement notes/bookmarks feature
- [ ] Add completion certificates
- [ ] Create admin dashboard
- [ ] Add team/organization support
- [ ] Integrate payment with Stripe
- [ ] Add lesson recommendations
- [ ] Build mobile app

## 📝 License

This project is proprietary. All rights reserved.

## 💬 Support

For questions or issues, check the `SETUP.md` guide or review the troubleshooting section above.

---

**Built with ❤️ using Next.js, Supabase, and Tailwind CSS**
