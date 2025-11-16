import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getLessonId() {
  console.log('=== STEP 1: Getting Lesson ID ===\n');

  // First, check if lesson_stages table exists
  const { data: stagesCheck, error: stagesError } = await supabase
    .from('lesson_stages')
    .select('id')
    .limit(1);

  if (stagesError) {
    console.log('⚠️  Warning: lesson_stages table check:', stagesError.message);
    console.log('    (This table may not exist yet - we may need to create it)\n');
  } else {
    console.log('✅ lesson_stages table exists\n');
  }

  // Try to find lesson-01
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title, lesson_number, description')
    .or('id.ilike.%lesson-01%,id.ilike.%chatgpt-communication%');

  if (error) {
    console.error('❌ Error querying lessons:', error);

    // List all lessons
    console.log('\nAttempting to list all lessons...');
    const { data: allLessons, error: listError } = await supabase
      .from('lessons')
      .select('id, title, lesson_number')
      .order('lesson_number');

    if (listError) {
      console.error('❌ Error listing all lessons:', listError);
      process.exit(1);
    }

    console.log('\nAvailable lessons:');
    allLessons?.forEach(lesson => {
      console.log(`  - ID: ${lesson.id}`);
      console.log(`    #${lesson.lesson_number}: ${lesson.title}\n`);
    });

    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('❌ No lesson found matching "lesson-01" or "chatgpt-communication"');

    // List all lessons
    console.log('\nListing all lessons in database:');
    const { data: allLessons, error: listError } = await supabase
      .from('lessons')
      .select('id, title, lesson_number')
      .order('lesson_number');

    if (listError) {
      console.error('❌ Error listing all lessons:', listError);
      process.exit(1);
    }

    if (!allLessons || allLessons.length === 0) {
      console.log('  (No lessons found in database)\n');
    } else {
      allLessons.forEach(lesson => {
        console.log(`  - ID: ${lesson.id}`);
        console.log(`    #${lesson.lesson_number}: ${lesson.title}\n`);
      });
    }

    process.exit(1);
  }

  console.log(`✅ Found lesson: ${data[0].id}`);
  console.log(`   #${data[0].lesson_number}: ${data[0].title}`);
  if (data[0].description) {
    console.log(`   Description: ${data[0].description.substring(0, 100)}...`);
  }
  console.log('');

  return data[0].id;
}

getLessonId()
  .then(lessonId => {
    console.log(`Lesson ID to use: ${lessonId}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
