# Master AI Platform - Setup Guide

## Prerequisites
- Node.js 18+ installed
- Supabase account (free tier is fine)
- Vercel account (for deployment, optional)

## Step 1: Supabase Database Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project to be ready (~2 minutes)

### 1.2 Run Database Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste contents from `database/schema.sql`
4. Click **Run** to execute

You should see: "Database schema created successfully!"

### 1.3 Enable Magic Link Authentication
1. In Supabase Dashboard, go to **Authentication → Providers**
2. Find **Email** provider
3. Make sure it's **Enabled**
4. Configure email templates (optional, defaults work fine)
5. Add your site URL to **Redirect URLs**:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

### 1.4 Get API Keys
1. Go to **Settings → API**
2. Copy these values:
   - **Project URL** (starts with https://...)
   - **anon/public key** (starts with eyJ...)
   - **service_role key** (starts with eyJ..., keep this SECRET)

## Step 2: Environment Configuration

Create `.env.local` file in the `app` directory:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Step 3: Seed Lesson Data

Run the seed script to import all 73 lessons:

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

## Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 5: Test the Flow

1. **Landing Page**: Enter your email → Check inbox for magic link
2. **Magic Link**: Click link in email → Redirects to onboarding
3. **Onboarding**: Select a learning path (Business, Creative, etc.)
4. **Dashboard**: See your lesson list with progress
5. **Lesson**: Click a lesson → Read content → Mark complete
6. **Progress**: Return to dashboard → See checkmark on completed lesson

## Troubleshooting

### "Invalid environment variables"
- Check that `.env.local` exists in the `app` directory
- Verify all three Supabase credentials are set correctly
- Restart the dev server (`npm run dev`)

### "Failed to seed lessons"
- Make sure you ran the database schema first (`database/schema.sql`)
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set (not the anon key)
- Verify the lessons directory exists at `../lessons/` relative to app folder

### Magic link not arriving
- Check your spam folder
- In Supabase Dashboard → Authentication → Logs, check for errors
- Verify email provider is enabled
- Try a different email address

### "User not authenticated" errors
- Check that RLS policies were created (re-run schema.sql if needed)
- Clear browser cookies and try logging in again
- Check browser console for detailed error messages

## Deployment (Vercel)

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your Vercel URL)
4. Deploy
5. Update Supabase redirect URLs to include your Vercel domain

## Next Steps

- Customize styling in `app/globals.css`
- Add more features (bookmarks, notes, etc.)
- Set up email templates in Supabase
- Configure custom domain
- Add analytics

## Support

For issues or questions, check the project documentation or create an issue in the repository.
