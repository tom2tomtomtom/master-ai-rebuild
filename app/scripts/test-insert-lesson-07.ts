import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInsert() {
  console.log('Testing lesson-07 stage insertion...\n');

  // Simple test stage
  const testStage = {
    lesson_id: 'lesson-07',
    stage_number: 999,
    display_order: 999,
    slug: 'lesson-07-stage-999-test',
    title: 'Test Stage',
    content: 'This is a simple test with no special characters',
    content_type: 'reading',
    estimated_minutes: 5,
    difficulty: 'beginner',
    is_required: true,
    is_published: true,
    prompt_template: null,
    example_output: null,
    success_criteria: null
  };

  console.log('Attempting to insert test stage...');
  const { data, error } = await supabase
    .from('lesson_stages')
    .insert([testStage])
    .select();

  if (error) {
    console.error('❌ Insert failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Insert succeeded!');
    console.log('Inserted stage:', data);

    // Clean up
    console.log('\nCleaning up test stage...');
    const { error: deleteError } = await supabase
      .from('lesson_stages')
      .delete()
      .eq('slug', 'lesson-07-stage-999-test');

    if (deleteError) {
      console.error('Failed to clean up:', deleteError.message);
    } else {
      console.log('✅ Cleaned up successfully');
    }
  }
}

testInsert();
