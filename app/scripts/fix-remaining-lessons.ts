import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Failed lessons to check
const failedLessons = [
  'lesson-07',
  'lesson-64',
  'lesson-66'
];

// WARN lessons to check
const warnLessons = [
  'lesson-47',
  'lesson-49'
];

async function checkLesson(lessonId: string) {
  console.log(`\nChecking ${lessonId}...`);

  // Check if lesson exists
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) {
    console.log(`  ❌ Lesson not found in database`);
    return;
  }

  console.log(`  ✅ Lesson exists: ${lesson.title}`);

  // Check existing stages
  const { data: stages, error: stagesError } = await supabase
    .from('lesson_stages')
    .select('id, stage_number, title, slug')
    .eq('lesson_id', lessonId)
    .order('stage_number', { ascending: true });

  if (stagesError) {
    console.log(`  ❌ Error checking stages: ${stagesError.message}`);
    return;
  }

  if (stages && stages.length > 0) {
    console.log(`  ✅ Has ${stages.length} stages already`);
    stages.forEach(s => {
      console.log(`     ${s.stage_number}. ${s.title} (slug: ${s.slug || 'NULL'})`);
    });
  } else {
    console.log(`  ⚠️  No stages found`);
  }
}

async function main() {
  console.log('================================================================================');
  console.log('CHECKING FAILED LESSONS');
  console.log('================================================================================');

  for (const lessonId of failedLessons) {
    await checkLesson(lessonId);
  }

  console.log('\n================================================================================');
  console.log('CHECKING WARN LESSONS');
  console.log('================================================================================');

  for (const lessonId of warnLessons) {
    await checkLesson(lessonId);
  }

  console.log('\n================================================================================');
  console.log('DONE');
  console.log('================================================================================');
}

main();
