import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const logsDir = resolve(__dirname, '../logs');
if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

const logFile = resolve(logsDir, `remaining-5-${new Date().toISOString().replace(/:/g, '-')}.log`);

function log(message: string) {
  console.log(message);
  writeFileSync(logFile, message + '\n', { flag: 'a' });
}

interface ParsedStage {
  stage_number: number
  title: string
  content: string
  content_type: 'practice' | 'reading' | 'exercise' | 'quiz'
  estimated_minutes: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  chars: number
}

interface LessonResult {
  lesson: string
  status: 'PASS' | 'WARN' | 'FAIL'
  quality: number
  stages: number
  inserted: boolean
  issues: string[]
}

// ============================================================================
// FIXED PARSER LOGIC (from phase3-fixed-final-run.ts)
// ============================================================================

function detectContentType(title: string, content: string): 'practice' | 'reading' | 'exercise' | 'quiz' {
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  if (contentLower.match(/exercise:|try this|practice:|build |create /)) return 'exercise';
  if (contentLower.match(/template|production|copy-paste/) || (content.match(/```/g) || []).length >= 4) return 'practice';
  if (titleLower.match(/quiz|test yourself/)) return 'quiz';
  if (titleLower.match(/production|template|real-world/)) return 'practice';

  return 'reading';
}

function detectDifficulty(title: string, stageIndex: number, totalStages: number): 'beginner' | 'intermediate' | 'advanced' {
  const titleLower = title.toLowerCase();
  if (titleLower.match(/beginner|fundamentals|foundation|quick start|business reality/)) return 'beginner';
  if (titleLower.match(/advanced|expert|mastery/)) return 'advanced';
  if (titleLower.match(/intermediate/)) return 'intermediate';

  if (stageIndex < 2) return 'beginner';
  if (stageIndex >= totalStages - 2) return 'advanced';
  return 'intermediate';
}

function calculateTime(content: string, type: string): number {
  const words = content.split(/\s+/).filter(w => w.length > 0).length;
  const rates = { reading: 200, exercise: 150, practice: 180, quiz: 100 };
  const rawMinutes = words / rates[type as keyof typeof rates];
  const rounded = Math.round(rawMinutes / 5) * 5;
  return Math.max(3, Math.min(30, rounded || 5));
}

function cleanTitle(title: string): string {
  return title
    .replace(/^#{2,3}\s+/, '')
    // Remove ALL emojis (Unicode ranges for emojis)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')  // Misc Symbols and Pictographs
    .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')    // Dingbats
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')  // Transport and Map Symbols
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')  // Flags
    .trim();
}

function extractH3Sections(content: string): Array<{ title: string, content: string, startPos: number }> {
  const lines = content.split('\n');
  const h3s: Array<{ title: string, content: string, startPos: number }> = [];

  let currentH3: { title: string, lines: string[], startLine: number } | null = null;

  lines.forEach((line, idx) => {
    const h3Match = line.match(/^###\s+(.+)$/);

    if (h3Match) {
      if (currentH3) {
        h3s.push({
          title: currentH3.title,
          content: currentH3.lines.join('\n'),
          startPos: currentH3.startLine
        });
      }

      currentH3 = {
        title: h3Match[1].trim(),
        lines: [line],
        startLine: idx
      };
    } else if (currentH3) {
      currentH3.lines.push(line);
    }
  });

  if (currentH3) {
    h3s.push({
      title: currentH3.title,
      content: currentH3.lines.join('\n'),
      startPos: currentH3.startLine
    });
  }

  return h3s;
}

function splitAtTemplates(content: string): Array<{ title: string, content: string }> {
  const chunks: Array<{ title: string, content: string }> = [];
  const lines = content.split('\n');

  let currentChunk: { title: string, lines: string[] } | null = null;

  lines.forEach(line => {
    const templateMatch = line.match(/^###\s+(Template \d+:[^$]+)$/);

    if (templateMatch) {
      if (currentChunk && currentChunk.lines.length > 0) {
        chunks.push({
          title: currentChunk.title,
          content: currentChunk.lines.join('\n')
        });
      }

      currentChunk = {
        title: templateMatch[1].trim(),
        lines: [line]
      };
    } else if (currentChunk) {
      currentChunk.lines.push(line);
    }
  });

  if (currentChunk && currentChunk.lines.length > 0) {
    chunks.push({
      title: currentChunk.title,
      content: currentChunk.lines.join('\n')
    });
  }

  return chunks.filter(c => c.content.length >= 500);
}

function parseSection(heading: string, sectionContent: string, sectionType: string): ParsedStage[] {
  const stages: ParsedStage[] = [];
  const contentLength = sectionContent.length;

  // RULE 1: Small section (<10K) → ONE stage
  if (contentLength < 10000) {
    const cleanedTitle = cleanTitle(heading);
    const type = detectContentType(cleanedTitle, sectionContent);

    stages.push({
      stage_number: 0,
      title: cleanedTitle,
      content: sectionContent,
      content_type: type,
      estimated_minutes: calculateTime(sectionContent, type),
      difficulty: 'beginner',
      chars: contentLength
    });

    return stages;
  }

  // RULE 2: Check for Production Templates
  if (heading.match(/production templates/i)) {
    const templates = splitAtTemplates(sectionContent);

    if (templates.length > 1) {
      templates.forEach(template => {
        stages.push({
          stage_number: 0,
          title: cleanTitle(template.title),
          content: template.content,
          content_type: 'practice',
          estimated_minutes: calculateTime(template.content, 'practice'),
          difficulty: 'intermediate',
          chars: template.content.length
        });
      });

      return stages;
    }
  }

  // RULE 3: Check for H3 subsections
  const h3Sections = extractH3Sections(sectionContent);

  if (h3Sections.length > 0) {
    h3Sections.forEach(h3 => {
      if (h3.content.length >= 500) {
        const cleanedTitle = cleanTitle(h3.title);
        const type = detectContentType(cleanedTitle, h3.content);

        stages.push({
          stage_number: 0,
          title: cleanedTitle,
          content: h3.content,
          content_type: type,
          estimated_minutes: calculateTime(h3.content, type),
          difficulty: 'beginner',
          chars: h3.content.length
        });
      }
    });

    return stages;
  }

  // RULE 4: No subsections, keep as one stage
  const cleanedTitle = cleanTitle(heading);
  const type = detectContentType(cleanedTitle, sectionContent);

  stages.push({
    stage_number: 0,
    title: cleanedTitle,
    content: sectionContent,
    content_type: type,
    estimated_minutes: calculateTime(sectionContent, type),
    difficulty: 'beginner',
    chars: contentLength
  });

  return stages;
}

function parseLesson(content: string): ParsedStage[] {
  const lines = content.split('\n');
  const stages: ParsedStage[] = [];

  // Find all H2 sections
  const h2Sections: Array<{ heading: string, start: number, end: number }> = [];

  lines.forEach((line, idx) => {
    if (line.match(/^##\s+[^#]/)) {
      h2Sections.push({
        heading: line,
        start: idx,
        end: -1
      });
    }
  });

  // Set end positions
  for (let i = 0; i < h2Sections.length; i++) {
    h2Sections[i].end = i < h2Sections.length - 1 ? h2Sections[i + 1].start : lines.length;
  }

  // Parse each H2 section
  h2Sections.forEach(section => {
    const sectionContent = lines.slice(section.start, section.end).join('\n');
    const sectionStages = parseSection(section.heading, sectionContent, 'progressive');
    stages.push(...sectionStages);
  });

  // Renumber stages and assign difficulty
  const totalStages = stages.length;
  stages.forEach((stage, idx) => {
    stage.stage_number = idx + 1;
    stage.difficulty = detectDifficulty(stage.title, idx, totalStages);
  });

  return stages;
}

// ============================================================================
// QUALITY SCORING
// ============================================================================

function scoreStage(stage: ParsedStage): { score: number, status: string, issues: string[] } {
  let score = 0;
  const issues: string[] = [];

  // Content length (40 points)
  if (stage.chars < 200) {
    issues.push('Too short');
  } else if (stage.chars < 500) {
    score += 20;
  } else if (stage.chars > 10000) {
    score += 30;
  } else {
    score += 40;
  }

  // Title quality (30 points)
  if (stage.title && stage.title.length >= 3) {
    score += 30;
  }

  // Markdown completeness (30 points)
  const hasUnclosedCode = (stage.content.match(/```/g) || []).length % 2 !== 0;
  if (hasUnclosedCode) {
    score += 15;
  } else {
    score += 30;
  }

  const status = issues.length > 0 ? 'FAIL' : score >= 85 ? 'PASS' : score >= 70 ? 'WARN' : 'FAIL';

  return { score, status, issues };
}

function scoreLesson(stages: ParsedStage[]): { avgScore: number, status: 'PASS' | 'WARN' | 'FAIL', passCount: number, warnCount: number, failCount: number } {
  let totalScore = 0;
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  stages.forEach(stage => {
    const { score, status } = scoreStage(stage);
    totalScore += score;

    if (status === 'PASS') passCount++;
    else if (status === 'WARN') warnCount++;
    else failCount++;
  });

  const avgScore = Math.round(totalScore / stages.length);
  const status = avgScore >= 85 ? 'PASS' : avgScore >= 70 ? 'WARN' : 'FAIL';

  return { avgScore, status, passCount, warnCount, failCount };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getLessonId(filename: string): Promise<string | null> {
  // Extract lesson ID from filename
  // e.g., "lesson-02-chatgpt-advanced-writing.md" → "lesson-02"
  const match = filename.match(/^(lesson-[\d.]+)/);

  if (!match) {
    log(`    ❌ Could not extract lesson ID from filename: ${filename}`);
    return null;
  }

  const lessonId = match[1];

  // Verify lesson exists in database
  const { data, error } = await supabase
    .from('lessons')
    .select('id')
    .eq('id', lessonId)
    .single();

  if (error || !data) {
    log(`    ❌ Lesson not found in database: ${lessonId}`);
    return null;
  }

  return data.id;
}

async function insertStages(lessonId: string, stages: ParsedStage[]): Promise<boolean> {
  try {
    // Delete existing stages for this lesson
    const { error: deleteError } = await supabase
      .from('lesson_stages')
      .delete()
      .eq('lesson_id', lessonId);

    if (deleteError) {
      log(`    ❌ Failed to delete existing stages: ${deleteError.message}`);
      return false;
    }

    // Insert stages ONE AT A TIME to identify problematic content
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];

      const stageData = {
        lesson_id: lessonId,
        stage_number: stage.stage_number,
        display_order: stage.stage_number,
        slug: `${lessonId}-stage-${stage.stage_number}`,
        title: stage.title,
        content: stage.content,
        content_type: stage.content_type,
        estimated_minutes: stage.estimated_minutes,
        difficulty: stage.difficulty,
        is_required: true,
        is_published: true,
        prompt_template: null,
        example_output: null,
        success_criteria: null
      };

      const { error: insertError } = await supabase
        .from('lesson_stages')
        .insert([stageData]);

      if (insertError) {
        log(`       ❌ Stage ${stage.stage_number} failed: ${insertError.message}`);
        log(`          Title: ${stage.title.substring(0, 50)}...`);
        log(`          Content length: ${stage.content.length} chars`);
        log(`          First 100 chars: ${stage.content.substring(0, 100).replace(/\n/g, ' ')}`);
        failCount++;
      } else {
        successCount++;
      }
    }

    if (failCount > 0) {
      log(`    ⚠️  Inserted ${successCount}/${stages.length} stages (${failCount} failed)`);
      return failCount === 0; // Return true only if ALL succeeded
    } else {
      log(`    ✅ Inserted ${stages.length} stages to database`);
      return true;
    }
  } catch (error) {
    log(`    ❌ Database error: ${error}`);
    return false;
  }
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function processLesson(filename: string): Promise<LessonResult> {
  const slug = filename.replace('.md', '');
  log(`\n${'='.repeat(80)}`);
  log(`Processing: ${slug}`);
  log(`${'='.repeat(80)}`);

  const lessonsPath = resolve(__dirname, '../../lessons');
  const filePath = resolve(lessonsPath, filename);

  // Parse lesson
  const content = readFileSync(filePath, 'utf-8');
  const stages = parseLesson(content);

  log(`  Parsed ${stages.length} stages`);

  // Score lesson
  const { avgScore, status, passCount, warnCount, failCount} = scoreLesson(stages);

  log(`  Quality: ${avgScore}/100 → ${status}`);
  log(`  ✅ PASS: ${passCount}, ⚠️  WARN: ${warnCount}, ❌ FAIL: ${failCount}`);

  // Balance check
  const sizes = stages.map(s => s.chars);
  const maxSize = Math.max(...sizes);
  const minSize = Math.min(...sizes);
  const ratio = minSize > 0 ? maxSize / minSize : 999;

  log(`  Balance ratio: ${ratio.toFixed(1)} (max ${maxSize} / min ${minSize})`);

  const result: LessonResult = {
    lesson: slug,
    status,
    quality: avgScore,
    stages: stages.length,
    inserted: false,
    issues: []
  };

  // AUTO-APPROVE: Insert to database if quality >= 70 (PASS or WARN)
  if (avgScore >= 70) {
    const lessonId = await getLessonId(filename);

    if (!lessonId) {
      result.issues.push('Lesson not found in database');
      result.status = 'FAIL';
      return result;
    }

    log(`  🔄 AUTO-APPROVING (quality ${avgScore}/100 ≥ 70)...`);
    const inserted = await insertStages(lessonId, stages);
    result.inserted = inserted;

    if (!inserted) {
      result.issues.push('Database insertion failed');
      result.status = 'FAIL';
    }
  } else {
    result.issues.push(`Quality ${avgScore}/100 - too low (< 70)`);
  }

  return result;
}

async function processRemainingLessons() {
  log('='.repeat(80));
  log('INSERTING REMAINING 5 LESSONS');
  log('='.repeat(80));
  log(`Started: ${new Date().toISOString()}\n`);

  // Target only the 3 remaining failed lessons (47 and 49 already inserted)
  const targetLessons = [
    'lesson-07-chatgpt-custom-gpts-agents.md',
    'lesson-64-loveable-ai-web-builder.md',
    'lesson-66-apify-web-scraping.md'
  ];

  log(`Target lessons: ${targetLessons.length}\n`);

  const results: LessonResult[] = [];

  for (const file of targetLessons) {
    const result = await processLesson(file);
    results.push(result);

    // Brief pause between lessons
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // ============================================================================
  // FINAL REPORT
  // ============================================================================

  log(`\n${'='.repeat(80)}`);
  log('FINAL REPORT');
  log(`${'='.repeat(80)}\n`);

  const insertedResults = results.filter(r => r.inserted);
  const failResults = results.filter(r => !r.inserted);

  log(`Total lessons processed: ${results.length}`);
  log(`✅ INSERTED: ${insertedResults.length}`);
  log(`❌ FAILED: ${failResults.length}\n`);

  if (insertedResults.length > 0) {
    log(`${'='.repeat(80)}`);
    log('SUCCESSFULLY INSERTED');
    log(`${'='.repeat(80)}\n`);

    insertedResults.forEach(r => {
      log(`${r.lesson}: ${r.quality}/100, ${r.stages} stages`);
    });
    log('');
  }

  if (failResults.length > 0) {
    log(`${'='.repeat(80)}`);
    log('FAILED LESSONS');
    log(`${'='.repeat(80)}\n`);

    failResults.forEach(r => {
      log(`${r.lesson}: ${r.quality}/100, ${r.stages} stages`);
      r.issues.forEach(issue => log(`  - ${issue}`));
    });
    log('');
  }

  // Save results
  const resultsPath = resolve(logsDir, 'remaining-5-results.json');
  writeFileSync(resultsPath, JSON.stringify({ results, summary: {
    total: results.length,
    inserted: insertedResults.length,
    failed: failResults.length
  }}, null, 2));

  log(`Results saved to: ${resultsPath}`);
  log(`Log saved to: ${logFile}\n`);

  log(`${'='.repeat(80)}`);
  log('COMPLETION STATUS');
  log(`${'='.repeat(80)}\n`);

  if (insertedResults.length === 3) {
    log(`✅ COMPLETE: All 3 remaining lessons successfully inserted!`);
  } else if (insertedResults.length > 0) {
    log(`⚠️  PARTIAL: ${insertedResults.length}/3 lessons inserted`);
  } else {
    log(`❌ FAILED: No lessons inserted`);
  }
}

processRemainingLessons().catch(error => {
  log(`\n❌ FATAL ERROR: ${error}`);
  console.error(error);
  process.exit(1);
});
