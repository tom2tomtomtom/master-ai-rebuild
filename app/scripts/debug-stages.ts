import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') })

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

async function debugStages() {
  console.log('\n========================================')
  console.log('🔍 DATABASE STAGES DEBUG')
  console.log('========================================\n')

  // Test 1: Check if lesson-01 exists
  console.log('📊 TEST 1: Check if lesson-01 exists in lessons table')
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title, lesson_number')
    .eq('id', 'lesson-01')
    .single()

  if (lessonError) {
    console.log('❌ Lesson query error:', lessonError.message)
  } else {
    console.log('✅ Lesson found:', lesson)
  }

  // Test 2: Check if stages exist for lesson-01
  console.log('\n📊 TEST 2: Check stages for lesson-01')
  const { data: stages, error: stagesError } = await supabase
    .from('lesson_stages')
    .select('id, stage_number, title, lesson_id, is_published')
    .eq('lesson_id', 'lesson-01')
    .order('display_order')

  if (stagesError) {
    console.log('❌ Stages query error:', stagesError.message)
  } else {
    console.log('✅ Stages found:', stages?.length || 0)
    if (stages && stages.length > 0) {
      console.log('\nStage details:')
      stages.forEach(stage => {
        console.log(`  - Stage ${stage.stage_number}: ${stage.title}`)
        console.log(`    ID: ${stage.id}`)
        console.log(`    Published: ${stage.is_published}`)
      })
    }
  }

  // Test 3: Check RLS policies
  console.log('\n📊 TEST 3: Check RLS policies on lesson_stages table')
  const { data: policies, error: policiesError } = await supabase
    .rpc('get_policies_for_table', { table_name: 'lesson_stages' })
    .catch(() => {
      // Fallback: direct query
      return supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'lesson_stages')
    })

  if (policiesError) {
    console.log('⚠️  Could not fetch policies (this is okay):', policiesError.message)
  } else if (policies) {
    console.log('✅ RLS Policies:', policies.length)
    policies.forEach((policy: any) => {
      console.log(`  - ${policy.policyname}: ${policy.cmd}`)
    })
  }

  // Test 4: Count all stages
  console.log('\n📊 TEST 4: Total stages in database')
  const { count: totalStages, error: countError } = await supabase
    .from('lesson_stages')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.log('❌ Count error:', countError.message)
  } else {
    console.log('✅ Total stages in database:', totalStages)
  }

  // Test 5: Count lessons with stages
  console.log('\n📊 TEST 5: Lessons with stages')
  const { data: lessonsWithStages, error: lessonsError } = await supabase
    .from('lesson_stages')
    .select('lesson_id')
    .limit(1000)

  if (lessonsError) {
    console.log('❌ Error:', lessonsError.message)
  } else {
    const uniqueLessons = new Set(lessonsWithStages?.map(s => s.lesson_id))
    console.log('✅ Unique lessons with stages:', uniqueLessons.size)
    console.log('Lesson IDs:', Array.from(uniqueLessons).slice(0, 10), '...')
  }

  console.log('\n========================================')
  console.log('🎯 NEXT STEPS:')
  console.log('========================================')
  console.log('1. Check your terminal output when you visit /lesson/lesson-01')
  console.log('2. Look for the 🔍 debug logs')
  console.log('3. Compare lesson_id values (check for exact match)')
  console.log('4. Verify RLS policies allow authenticated users to read')
  console.log('\n')
}

debugStages().catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})

