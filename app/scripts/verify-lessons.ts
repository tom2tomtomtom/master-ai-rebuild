import { createClient } from '@supabase/supabase-js'
import { join } from 'path'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifyLessons() {
  console.log('🔍 Verifying lesson migration...\n')

  // Get total count
  const { count } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Total lessons in database: ${count}`)

  // Get a sample of lessons
  const { data, error } = await supabase
    .from('lessons')
    .select('id, lesson_number, title')
    .order('lesson_number', { ascending: true })
    .limit(5)

  if (error) {
    console.error('❌ Error fetching lessons:', error)
    process.exit(1)
  }

  console.log('\n📚 Sample of imported lessons:')
  data?.forEach(lesson => {
    console.log(`  ✅ ${lesson.id} - ${lesson.title}`)
  })

  // Check last lessons
  const { data: lastLessons } = await supabase
    .from('lessons')
    .select('id, lesson_number, title')
    .order('lesson_number', { ascending: false })
    .limit(3)

  console.log('\n📚 Last 3 lessons:')
  lastLessons?.reverse().forEach(lesson => {
    console.log(`  ✅ ${lesson.id} - ${lesson.title}`)
  })

  console.log('\n✅ Migration verification complete!')
}

// Run the verification
verifyLessons().catch((error) => {
  console.error('❌ Verification failed:', error)
  process.exit(1)
})
