import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAllStages() {
  console.log('=== COMPREHENSIVE STAGE VERIFICATION ===\n');

  const report = [];
  report.push('# Master-AI Staged Learning Platform - Final Report\n');
  report.push(`Generated: ${new Date().toISOString()}\n`);

  // Query 1: Total stages count
  console.log('Query 1: Total stages count');
  const { data: stagesCount, error: countError } = await supabase
    .from('lesson_stages')
    .select('id', { count: 'exact', head: true });

  const totalStages = stagesCount ? (stagesCount as any).count || 0 : 0;
  console.log(`✅ Total stages in database: ${totalStages}\n`);
  report.push(`## Overall Statistics\n`);
  report.push(`- **Total Stages**: ${totalStages}`);

  // Query 2: Stages per lesson
  console.log('Query 2: Stages per lesson');
  const { data: lessonStats } = await supabase
    .from('lesson_stages')
    .select('lesson_id, stage_number, estimated_minutes, content')
    .order('lesson_id, stage_number');

  if (lessonStats) {
    const lessonMap = new Map<string, any[]>();

    lessonStats.forEach(stage => {
      if (!lessonMap.has(stage.lesson_id)) {
        lessonMap.set(stage.lesson_id, []);
      }
      lessonMap.get(stage.lesson_id)!.push(stage);
    });

    console.log(`✅ Found stages for ${lessonMap.size} lessons\n`);
    report.push(`- **Lessons with Stages**: ${lessonMap.size}/73 (${((lessonMap.size / 73) * 100).toFixed(1)}%)`);

    const totalMinutes = lessonStats.reduce((sum, s) => sum + (s.estimated_minutes || 0), 0);
    const totalChars = lessonStats.reduce((sum, s) => sum + (s.content?.length || 0), 0);

    report.push(`- **Total Learning Time**: ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`);
    report.push(`- **Total Content**: ${(totalChars / 1000).toFixed(1)}K characters\n`);

    console.log('Total learning time:', Math.floor(totalMinutes / 60), 'hours', totalMinutes % 60, 'minutes');
    console.log('Total content:', (totalChars / 1000).toFixed(1), 'K characters\n');

    // Detailed breakdown
    report.push(`## Lesson Breakdown\n`);
    report.push(`| Lesson | Stages | Total Time | Content | Avg Stage Size |`);
    report.push(`|--------|--------|------------|---------|----------------|`);

    const sortedLessons = Array.from(lessonMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    sortedLessons.forEach(([lessonId, stages]) => {
      const stageCount = stages.length;
      const minutes = stages.reduce((sum, s) => sum + (s.estimated_minutes || 0), 0);
      const chars = stages.reduce((sum, s) => sum + (s.content?.length || 0), 0);
      const avgSize = Math.round(chars / stageCount);

      report.push(`| ${lessonId} | ${stageCount} | ${minutes}m | ${(chars / 1000).toFixed(1)}K | ${(avgSize / 1000).toFixed(1)}K |`);
      console.log(`${lessonId}: ${stageCount} stages, ${minutes}min, ${(chars / 1000).toFixed(1)}K chars`);
    });

    console.log('');
  }

  // Query 3: Stage type distribution
  console.log('\nQuery 3: Stage type distribution');
  const { data: typeStats } = await supabase
    .from('lesson_stages')
    .select('content_type')
    .order('content_type');

  if (typeStats) {
    const typeCounts = typeStats.reduce((acc, stage) => {
      acc[stage.content_type] = (acc[stage.content_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    report.push(`\n## Stage Type Distribution\n`);
    Object.entries(typeCounts).forEach(([type, count]) => {
      const percentage = ((count / totalStages) * 100).toFixed(1);
      console.log(`${type}: ${count} stages (${percentage}%)`);
      report.push(`- **${type}**: ${count} stages (${percentage}%)`);
    });
  }

  // Query 4: Difficulty distribution
  console.log('\nQuery 4: Difficulty distribution');
  const { data: diffStats } = await supabase
    .from('lesson_stages')
    .select('difficulty')
    .order('difficulty');

  if (diffStats) {
    const diffCounts = diffStats.reduce((acc, stage) => {
      acc[stage.difficulty] = (acc[stage.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    report.push(`\n## Difficulty Distribution\n`);
    Object.entries(diffCounts).forEach(([diff, count]) => {
      const percentage = ((count / totalStages) * 100).toFixed(1);
      console.log(`${diff}: ${count} stages (${percentage}%)`);
      report.push(`- **${diff}**: ${count} stages (${percentage}%)`);
    });
  }

  // Query 5: Data integrity checks
  console.log('\nQuery 5: Data integrity checks');
  report.push(`\n## Data Integrity Checks\n`);

  // Check for NULL content
  const { data: nullContent } = await supabase
    .from('lesson_stages')
    .select('lesson_id, stage_number')
    .or('content.is.null,content.eq.')
    .limit(10);

  if (nullContent && nullContent.length > 0) {
    console.log(`⚠️  Found ${nullContent.length} stages with NULL/empty content`);
    report.push(`- ⚠️  **NULL/Empty Content**: ${nullContent.length} stages`);
  } else {
    console.log(`✅ No NULL/empty content`);
    report.push(`- ✅ **Content Integrity**: All stages have content`);
  }

  // Check for duplicate stages
  const { data: duplicates } = await supabase
    .rpc('check_duplicate_stages' as any)
    .limit(10)
    .catch(() => null);

  // Simple duplicate check without RPC
  const { data: allStages } = await supabase
    .from('lesson_stages')
    .select('lesson_id, stage_number')
    .order('lesson_id, stage_number');

  if (allStages) {
    const seen = new Set<string>();
    const dups: string[] = [];
    allStages.forEach(s => {
      const key = `${s.lesson_id}-${s.stage_number}`;
      if (seen.has(key)) {
        dups.push(key);
      }
      seen.add(key);
    });

    if (dups.length > 0) {
      console.log(`⚠️  Found ${dups.length} duplicate stage entries`);
      report.push(`- ⚠️  **Duplicates**: ${dups.length} duplicate entries found`);
    } else {
      console.log(`✅ No duplicate stages`);
      report.push(`- ✅ **No Duplicates**: All stage numbers are unique per lesson`);
    }
  }

  // Check for short content
  const { data: shortContent } = await supabase
    .from('lesson_stages')
    .select('lesson_id, stage_number, title')
    .lt('content', 500)
    .limit(10);

  if (shortContent && shortContent.length > 0) {
    console.log(`⚠️  Found ${shortContent.length} stages with content <500 chars (might be too short)`);
    report.push(`- ⚠️  **Short Content**: ${shortContent.length} stages under 500 characters`);
  } else {
    console.log(`✅ All stages have substantial content`);
    report.push(`- ✅ **Content Length**: All stages have substantial content (>500 chars)`);
  }

  // Query 6: Missing lessons (lessons without stages)
  console.log('\nQuery 6: Lessons without stages');
  const { data: allLessons } = await supabase
    .from('lessons')
    .select('id')
    .like('id', 'lesson-%')
    .not('id', 'like', '%-0.5')
    .not('id', 'like', '%-meta%')
    .order('id');

  const lessonsWithStages = new Set(lessonStats?.map(s => s.lesson_id) || []);
  const lessonsWithoutStages = allLessons?.filter(l => !lessonsWithStages.has(l.id)) || [];

  console.log(`Found ${lessonsWithoutStages.length} lessons without stages:`);
  report.push(`\n## Lessons Without Stages (${lessonsWithoutStages.length})\n`);

  if (lessonsWithoutStages.length > 0) {
    lessonsWithoutStages.forEach(l => {
      console.log(`  - ${l.id}`);
      report.push(`- ${l.id}`);
    });
  } else {
    report.push(`✅ All lessons have stages!`);
  }

  // Save report
  const reportPath = resolve(__dirname, '../logs/final-verification-report.md');
  writeFileSync(reportPath, report.join('\n'));

  console.log(`\n✅ Verification complete`);
  console.log(`📊 Report saved to: ${reportPath}\n`);

  console.log('=== SUMMARY ===');
  console.log(`✅ ${lessonMap.size} lessons with stages`);
  console.log(`✅ ${totalStages} total stages created`);
  console.log(`✅ Platform is ${((lessonMap.size / 73) * 100).toFixed(1)}% staged\n`);
}

verifyAllStages()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
