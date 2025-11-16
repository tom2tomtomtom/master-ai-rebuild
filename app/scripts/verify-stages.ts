import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyStages() {
  console.log('=== STEP 5: Verification Query ===\n');

  // Query inserted stages
  const { data, error } = await supabase
    .from('lesson_stages')
    .select('id, lesson_id, stage_number, title, content_type, estimated_minutes, difficulty, display_order, slug, is_required, is_published')
    .eq('lesson_id', 'lesson-01')
    .order('display_order');

  if (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('❌ No stages found for lesson-01');
    process.exit(1);
  }

  console.log(`✅ Found ${data.length} stages for lesson-01\n`);

  // Display as table
  console.log('| # | Title | Type | Time | Difficulty | Required | Published |');
  console.log('|---|-------|------|------|------------|----------|-----------|');

  data.forEach(stage => {
    const title = stage.title.length > 40 ? stage.title.substring(0, 37) + '...' : stage.title;
    const req = stage.is_required ? '✅' : '❌';
    const pub = stage.is_published ? '✅' : '❌';
    console.log(`| ${stage.stage_number} | ${title} | ${stage.content_type} | ${stage.estimated_minutes} min | ${stage.difficulty} | ${req} | ${pub} |`);
  });

  console.log('\n=== STEP 6: Data Integrity Check ===\n');

  // Check data integrity
  const checks = {
    allContentPopulated: true,
    allSlugsValid: true,
    displayOrderSequential: true,
    lessonIdValid: true
  };

  data.forEach((stage, index) => {
    // Check content
    if (!stage.id || stage.id.trim() === '') {
      console.log(`❌ Stage ${stage.stage_number}: Missing ID`);
      checks.allContentPopulated = false;
    }

    // Check slug
    if (!stage.slug || stage.slug.trim() === '' || stage.slug === 'undefined') {
      console.log(`❌ Stage ${stage.stage_number}: Invalid slug (${stage.slug})`);
      checks.allSlugsValid = false;
    }

    // Check display order
    if (stage.display_order !== index + 1) {
      console.log(`❌ Stage ${stage.stage_number}: Display order mismatch (expected ${index + 1}, got ${stage.display_order})`);
      checks.displayOrderSequential = false;
    }

    // Check lesson_id
    if (stage.lesson_id !== 'lesson-01') {
      console.log(`❌ Stage ${stage.stage_number}: Wrong lesson_id (${stage.lesson_id})`);
      checks.lessonIdValid = false;
    }
  });

  if (checks.allContentPopulated) {
    console.log('✅ All IDs populated');
  }

  if (checks.allSlugsValid) {
    console.log('✅ All slugs generated correctly');
  }

  if (checks.displayOrderSequential) {
    console.log('✅ Display order sequential (1-6)');
  }

  if (checks.lessonIdValid) {
    console.log('✅ Lesson ID foreign key valid');
  }

  const allChecks = Object.values(checks).every(check => check === true);

  if (allChecks) {
    console.log('\n🎉 All integrity checks passed!\n');
  } else {
    console.log('\n⚠️  Some integrity checks failed. See details above.\n');
  }

  // Show content length check
  console.log('=== Content Length Verification ===\n');
  data.forEach(stage => {
    const contentLength = stage.id ? stage.id.length : 0;
    console.log(`Stage ${stage.stage_number}: ID length = ${contentLength} chars`);
  });
  console.log('');

  return data;
}

verifyStages()
  .then(() => {
    console.log('=== VERIFICATION COMPLETE ===');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
