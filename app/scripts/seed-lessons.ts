import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') })

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

      // Extract lesson ID - handle both numbered (lesson-00-*), decimal (lesson-0.5), and meta (lesson-meta-*) formats
      let lessonId: string
      let lessonNumber: number

      const numberMatch = file.match(/lesson-([\d.]+)/)
      if (numberMatch) {
        // Standard numbered lesson (lesson-00, lesson-01, lesson-0.5, lesson-9.5, etc.)
        lessonNumber = parseFloat(numberMatch[1])
        // Format ID: integers as 2-digit (lesson-00), decimals as-is (lesson-0.5)
        const numStr = numberMatch[1]
        if (numStr.includes('.')) {
          lessonId = `lesson-${numStr}`
        } else {
          lessonId = `lesson-${numStr.padStart(2, '0')}`
        }
      } else if (file.startsWith('lesson-meta-')) {
        // Meta lesson (lesson-meta-guide-to-guide)
        lessonId = file.replace('.md', '')
        lessonNumber = 999 // Use 999 for meta lessons to keep them separate
      } else {
        console.warn(`⚠️  Skipping ${file} - invalid format`)
        continue
      }

      // Extract title from markdown (first # heading)
      const titleMatch = content.match(/^#\s+(.+)$/m)
      const rawTitle = titleMatch ? titleMatch[1] : `Lesson ${lessonNumber}`

      // Clean up title (remove "Lesson N:" prefix if present, but keep meta titles as-is)
      const title = lessonNumber === 999
        ? rawTitle
        : rawTitle.replace(/^Lesson \d+:\s*/i, '').trim()

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
