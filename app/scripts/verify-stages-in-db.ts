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

async function verifyStages() {
  console.log('================================================================================');
  console.log('VERIFYING STAGES IN DATABASE');
  console.log('================================================================================\n');

  // Query stage counts per lesson
  const { data: stageCounts, error } = await supabase
    .rpc('get_stage_counts')
    .limit(10);

  if (error) {
    console.log('RPC function not available, using manual query...\n');

    // Manual aggregation
    const { data: allStages } = await supabase
      .from('lesson_stages')
      .select('lesson_id')
      .order('lesson_id');

    if (allStages) {
      const counts = allStages.reduce((acc: any, stage: any) => {
        acc[stage.lesson_id] = (acc[stage.lesson_id] || 0) + 1;
        return acc;
      }, {});

      console.log('Lessons with stages (first 10):');
      console.log('================================\n');

      Object.entries(counts)
        .slice(0, 10)
        .forEach(([lessonId, count]) => {
          console.log(`${lessonId}: ${count} stages`);
        });

      console.log(`\nTotal lessons with stages: ${Object.keys(counts).length}`);
      console.log(`Total stages: ${allStages.length}`);
    }
  } else {
    console.log('Stage counts:', stageCounts);
  }

  // Check specific lesson
  console.log('\n================================================================================');
  console.log('CHECKING LESSON-01 SPECIFICALLY');
  console.log('================================================================================\n');

  const { data: lesson01, error: lesson01Error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', 'lesson-01')
    .single();

  console.log('Lesson record:', lesson01 ? `Found: ${lesson01.id} - ${lesson01.title}` : 'NOT FOUND');

  const { data: stages01, error: stages01Error } = await supabase
    .from('lesson_stages')
    .select('*')
    .eq('lesson_id', 'lesson-01')
    .order('display_order');

  console.log(`Stages for lesson-01: ${stages01?.length || 0}`);

  if (stages01 && stages01.length > 0) {
    console.log('\nFirst 3 stages:');
    stages01.slice(0, 3).forEach((stage: any) => {
      console.log(`  ${stage.stage_number}. ${stage.title} (${stage.content.length} chars)`);
    });
  }
}

verifyStages();
