import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

config({ path: join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function test() {
  console.log('\n🔍 Testing exact query from lesson page...\n')
  
  const { data: stages, error } = await supabase
    .from('lesson_stages')
    .select('id, stage_number, title, slug, content_type, estimated_minutes, difficulty, display_order, is_required, is_published')
    .eq('lesson_id', 'lesson-01')
    .eq('is_published', true)
    .order('display_order')

  console.log('Error:', error)
  console.log('Stages count:', stages?.length || 0)
  console.log('First stage:', stages?.[0])
  console.log('\n✅ If you see stages above, the query works!')
  console.log('⚠️ If stages.length is 0, there\'s a data issue')
}

test()

