import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

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

async function clearLessons() {
  console.log('🗑️  Clearing all lessons from database...\n')

  try {
    // Delete all user progress first (foreign key constraint)
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .delete()
      .neq('lesson_id', '')

    if (progressError) {
      console.error('⚠️  Note: Could not clear user_progress:', progressError.message)
    } else {
      // @ts-ignore - Supabase delete returns null
      const count = progressData?.length || 0
      console.log(`✅ Cleared ${count} user progress records`)
    }

    // Delete all lessons
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .delete()
      .neq('id', '')

    if (lessonError) {
      console.error('❌ Error deleting lessons:', lessonError)
      process.exit(1)
    }

    // @ts-ignore - Supabase delete returns null
    console.log(`✅ Cleared ${lessonData?.length || 0} lesson records`)
    console.log('\n✅ Database is now empty - ready for fresh seed!\n')
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  }
}

// Run the clear function
clearLessons().catch((error) => {
  console.error('❌ Failed:', error)
  process.exit(1)
})
