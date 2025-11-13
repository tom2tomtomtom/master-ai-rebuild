import { createClient } from '@supabase/supabase-js'
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

async function deleteLessons() {
  console.log('🗑️  Starting lesson deletion...\n')

  // Delete all lessons from the database
  const { error, count } = await supabase
    .from('lessons')
    .delete()
    .neq('id', '') // This matches all rows

  if (error) {
    console.error('❌ Error deleting lessons:', error)
    process.exit(1)
  }

  console.log(`✅ Successfully deleted all lessons!`)
  console.log('\n🎉 Database cleared! Ready for fresh import.')
}

// Run the delete function
deleteLessons().catch((error) => {
  console.error('❌ Deletion failed:', error)
  process.exit(1)
})
