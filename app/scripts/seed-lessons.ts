import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface Lesson {
  id: string
  lesson_number: number
  title: string
  description: string
  content: string
  duration_minutes: number
  is_published: boolean
}

async function seedLessons() {
  console.log('🌱 Starting lesson seed...\n')

  // Path to lessons directory (one level up from app folder)
  const lessonsDir = join(process.cwd(), '..', 'lessons')

  console.log(`📂 Reading lessons from: ${lessonsDir}`)

  // Get all markdown files
  const files = readdirSync(lessonsDir)
    .filter(f => f.endsWith('.md') && f.startsWith('lesson-'))
    .sort()

  console.log(`📚 Found ${files.length} lesson files\n`)

  const lessons: Lesson[] = []

  for (const file of files) {
    try {
      const content = readFileSync(join(lessonsDir, file), 'utf-8')

      // Extract lesson number from filename (lesson-00-*.md)
      const match = file.match(/lesson-(\d+)/)
      if (!match) {
        console.warn(`⚠️  Skipping ${file} - invalid format`)
        continue
      }

      const lessonNumber = parseInt(match[1])
      const lessonId = `lesson-${lessonNumber.toString().padStart(2, '0')}`

      // Extract title from markdown (first # heading)
      const titleMatch = content.match(/^#\s+(.+)$/m)
      const rawTitle = titleMatch ? titleMatch[1] : `Lesson ${lessonNumber}`

      // Clean up title (remove "Lesson N:" prefix if present)
      const title = rawTitle.replace(/^Lesson \d+:\s*/i, '').trim()

      // Extract description (first paragraph after title or subtitle)
      const descMatch = content.match(/^[#\s]+.+\n+(.+?)$/m)
      const description = descMatch ? descMatch[1].trim() : ''

      lessons.push({
        id: lessonId,
        lesson_number: lessonNumber,
        title,
        description: description.slice(0, 200), // Limit description length
        content,
        duration_minutes: 45,
        is_published: true
      })

      console.log(`✅ Processed: ${lessonId} - ${title}`)
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error)
    }
  }

  console.log(`\n📊 Prepared ${lessons.length} lessons for import`)

  // Insert lessons into database (upsert to handle re-runs)
  const { data, error } = await supabase
    .from('lessons')
    .upsert(lessons, { onConflict: 'id' })
    .select()

  if (error) {
    console.error('❌ Error inserting lessons:', error)
    process.exit(1)
  }

  console.log(`\n✅ Successfully seeded ${data?.length || lessons.length} lessons!`)
  console.log('\n🎉 Database is ready! You can now start the application.')
}

// Run the seed function
seedLessons().catch((error) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})
