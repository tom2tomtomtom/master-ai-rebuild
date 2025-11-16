import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create directories
const logsDir = resolve(__dirname, '../logs');
const parsedDir = resolve(logsDir, 'parsed-stages');
const failedQualityDir = resolve(logsDir, 'failed-quality');
const warnedQualityDir = resolve(logsDir, 'warned-quality');
const failedParseDir = resolve(logsDir, 'failed-parse');

[logsDir, parsedDir, failedQualityDir, warnedQualityDir, failedParseDir].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

const logFile = resolve(logsDir, `phase3-processing-${new Date().toISOString().replace(/:/g, '-')}.log`);

function log(message: string) {
  console.log(message);
  writeFileSync(logFile, message + '\n', { flag: 'a' });
}

interface ParsedStage {
  lesson_id: string
  stage_number: number
  title: string
  slug: string
  content: string
  content_type: 'practice' | 'reading' | 'exercise' | 'quiz'
  estimated_minutes: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  is_required: boolean
  display_order: number
  is_published: boolean
  quality_score?: number
}

interface LessonResult {
  lessonNumber: number
  lessonId: string
  fileName: string
  pattern: string
  status: 'PASS' | 'WARN' | 'FAIL' | 'ERROR'
  qualityScore: number
  stageCount: number
  totalMinutes: number
  totalChars: number
  stages: ParsedStage[]
  issues: string[]
  warnings: string[]
  error?: string
}

const stats = {
  processed: 0,
  passed: 0,
  warned: 0,
  failed: 0,
  errors: 0,
  inserted: 0,
  totalStages: 0,
  results: [] as LessonResult[]
};

const cleanedLessons = [2, 3, 5, 13];
const lessonsToProcess = [
  2, 3, 4, 5, 6, 7, 10, 11, 13, 14, 15, 18, 19,
  37, 40, 44, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
  61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73
];

// Content type detection
function detectContentType(title: string, content: string): 'practice' | 'reading' | 'exercise' | 'quiz' {
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  if (contentLower.match(/exercise:|try this|practice:|build |create |implement /)) {
    return 'exercise';
  }

  if (contentLower.match(/template|production|copy-paste|copy this exact|```/g)?.length >= 3) {
    return 'practice';
  }

  if (titleLower.match(/quiz|test yourself|knowledge check|assessment/)) {
    return 'quiz';
  }

  if (titleLower.match(/production|template|real-world|applied|example|your first/)) {
    return 'practice';
  }

  return 'reading';
}

// Difficulty detection
function detectDifficulty(title: string, stageIndex: number, totalStages: number): 'beginner' | 'intermediate' | 'advanced' {
  const titleLower = title.toLowerCase();

  if (titleLower.match(/beginner|fundamentals|introduction|getting started|basics|foundation|quick start|your first/)) {
    return 'beginner';
  }

  if (titleLower.match(/advanced|expert|mastery|complex|professional|production level/)) {
    return 'advanced';
  }

  if (titleLower.match(/intermediate|deep dive|optimization|best practices/)) {
    return 'intermediate';
  }

  // Progressive based on position
  if (stageIndex < 2) return 'beginner';
  if (stageIndex >= totalStages - 2) return 'advanced';
  return 'intermediate';
}

// Time estimation
function calculateEstimatedTime(content: string, type: 'practice' | 'reading' | 'exercise' | 'quiz'): number {
  const words = content.split(/\s+/).filter(w => w.length > 0).length;

  const wordsPerMinute = {
    reading: 200,
    exercise: 150,
    practice: 180,
    quiz: 100
  };

  const rawMinutes = words / wordsPerMinute[type];
  const rounded = Math.round(rawMinutes / 5) * 5;
  return Math.max(3, Math.min(30, rounded || 5));
}

// Generate slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[🎓💰⚡🚀💼🔧🎯📊🎁🔗]/g, '') // Remove emojis
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

// INTELLIGENT ADAPTIVE PARSING
function parseLesson(content: string, lessonNumber: number, pattern: string): ParsedStage[] {
  const lessonId = `lesson-${String(lessonNumber).padStart(2, '0')}`;
  const lines = content.split('\n');
  const stages: ParsedStage[] = [];

  log(`  Parsing with ${pattern} pattern...`);

  // Extract all H2 and H3 headings with positions
  const headings: Array<{ level: number, text: string, line: number }> = [];

  lines.forEach((line, index) => {
    const h2Match = line.match(/^##\s+(.+)$/);
    const h3Match = line.match(/^###\s+(.+)$/);

    if (h2Match) {
      headings.push({ level: 2, text: h2Match[1].trim(), line: index });
    } else if (h3Match) {
      headings.push({ level: 3, text: h3Match[1].trim(), line: index });
    }
  });

  if (headings.length === 0) {
    log(`    ⚠️  No headings found`);
    return [];
  }

  // STRATEGY: Group content into 5-8 stages based on pattern
  if (pattern === 'progressive-mastery') {
    // Find key sections
    const businessReality = headings.find(h => h.text.match(/business reality/i));
    const quickStart = headings.find(h => h.text.match(/quick start|your first|60 second/i));
    const progressive = headings.find(h => h.text.match(/progressive mastery/i));
    const templates = headings.find(h => h.text.match(/production templates/i));

    let stageNum = 0;

    // Stage 1: Business Reality
    if (businessReality) {
      const nextIdx = headings.findIndex((h, i) => i > headings.indexOf(businessReality) && h.level === 2);
      const endLine = nextIdx !== -1 ? headings[nextIdx].line : lines.length;
      const stageContent = lines.slice(businessReality.line, endLine).join('\n').trim();

      if (stageContent.length >= 200) {
        stageNum++;
        const type = detectContentType(businessReality.text, stageContent);
        stages.push({
          lesson_id: lessonId,
          stage_number: stageNum,
          title: businessReality.text,
          slug: generateSlug(businessReality.text),
          content: stageContent,
          content_type: type,
          estimated_minutes: calculateEstimatedTime(stageContent, type),
          difficulty: 'beginner',
          is_required: true,
          display_order: stageNum,
          is_published: true
        });
      }
    }

    // Stage 2: Quick Start
    if (quickStart && quickStart !== businessReality) {
      const quickStartIdx = headings.indexOf(quickStart);
      const nextIdx = headings.findIndex((h, i) => i > quickStartIdx && h.level === 2);
      const endLine = nextIdx !== -1 ? headings[nextIdx].line : lines.length;
      const stageContent = lines.slice(quickStart.line, endLine).join('\n').trim();

      if (stageContent.length >= 200) {
        stageNum++;
        const type = detectContentType(quickStart.text, stageContent);
        stages.push({
          lesson_id: lessonId,
          stage_number: stageNum,
          title: quickStart.text,
          slug: generateSlug(quickStart.text),
          content: stageContent,
          content_type: type,
          estimated_minutes: calculateEstimatedTime(stageContent, type),
          difficulty: 'beginner',
          is_required: true,
          display_order: stageNum,
          is_published: true
        });
      }
    }

    // Stages 3-5: Progressive Mastery sections (Foundation, Intermediate, Advanced)
    if (progressive) {
      const progressiveIdx = headings.indexOf(progressive);
      const nextH2Idx = headings.findIndex((h, i) => i > progressiveIdx && h.level === 2);
      const endLine = nextH2Idx !== -1 ? headings[nextH2Idx].line : (templates ? templates.line : lines.length);

      // Find all H3 under Progressive Mastery
      const masteryH3s = headings.filter((h, i) => {
        return h.level === 3 &&
               i > progressiveIdx &&
               h.line < endLine;
      });

      masteryH3s.forEach((h3, idx) => {
        const nextH3Idx = idx < masteryH3s.length - 1 ? masteryH3s[idx + 1].line : endLine;
        const h3Content = lines.slice(h3.line, nextH3Idx).join('\n').trim();

        if (h3Content.length >= 200) {
          stageNum++;
          const type = detectContentType(h3.text, h3Content);
          const difficulty = detectDifficulty(h3.text, stageNum - 1, 8);

          stages.push({
            lesson_id: lessonId,
            stage_number: stageNum,
            title: h3.text,
            slug: generateSlug(h3.text),
            content: h3Content,
            content_type: type,
            estimated_minutes: calculateEstimatedTime(h3Content, type),
            difficulty,
            is_required: true,
            display_order: stageNum,
            is_published: true
          });
        }
      });
    }

    // Last Stage: Production Templates
    if (templates) {
      const templatesIdx = headings.indexOf(templates);
      const stageContent = lines.slice(templates.line).join('\n').trim();

      if (stageContent.length >= 200) {
        stageNum++;
        stages.push({
          lesson_id: lessonId,
          stage_number: stageNum,
          title: templates.text,
          slug: generateSlug(templates.text),
          content: stageContent,
          content_type: 'practice',
          estimated_minutes: calculateEstimatedTime(stageContent, 'practice'),
          difficulty: 'intermediate',
          is_required: true,
          display_order: stageNum,
          is_published: true
        });
      }
    }

  } else {
    // BUSINESS-FOCUSED or SECTION-BASED: Each H2 becomes a stage
    const h2Headings = headings.filter(h => h.level === 2);

    h2Headings.forEach((h2, idx) => {
      const nextH2 = h2Headings[idx + 1];
      const endLine = nextH2 ? nextH2.line : lines.length;
      const stageContent = lines.slice(h2.line, endLine).join('\n').trim();

      if (stageContent.length >= 200) {
        const stageNum = stages.length + 1;
        const type = detectContentType(h2.text, stageContent);
        const difficulty = detectDifficulty(h2.text, idx, h2Headings.length);

        stages.push({
          lesson_id: lessonId,
          stage_number: stageNum,
          title: h2.text,
          slug: generateSlug(h2.text),
          content: stageContent,
          content_type: type,
          estimated_minutes: calculateEstimatedTime(stageContent, type),
          difficulty,
          is_required: true,
          display_order: stageNum,
          is_published: true
        });
      }
    });
  }

  // Renumber stages to ensure sequential
  stages.forEach((stage, idx) => {
    stage.stage_number = idx + 1;
    stage.display_order = idx + 1;
  });

  log(`    ✅ Parsed ${stages.length} stages`);
  return stages;
}

// QUALITY VALIDATION
function validateStage(stage: ParsedStage, allStages: ParsedStage[]): { score: number, issues: string[], warnings: string[] } {
  let score = 0;
  const issues: string[] = [];
  const warnings: string[] = [];

  // Content completeness (30 points)
  if (stage.content.length < 200) {
    issues.push(`Content too short (${stage.content.length} chars, minimum 200)`);
  } else if (stage.content.length < 500) {
    score += 15;
    warnings.push(`Content on short side (${stage.content.length} chars)`);
  } else if (stage.content.length > 30000) {
    score += 20;
    warnings.push(`Content very long (${stage.content.length} chars)`);
  } else {
    score += 30;
  }

  // Content quality (25 points)
  const hasPlaceholder = stage.content.match(/\[TODO\]|\.\.\.|coming soon|placeholder/i);
  const endsAbruptly = stage.content.match(/\.\.\.$|[^.!?]\s*$/);
  const hasUnclosedCode = (stage.content.match(/```/g) || []).length % 2 !== 0;

  if (hasPlaceholder) {
    issues.push('Contains placeholder text ([TODO], "...", etc.)');
  } else if (hasUnclosedCode) {
    warnings.push('Unclosed code block detected');
    score += 15;
  } else if (endsAbruptly) {
    warnings.push('Content may end abruptly');
    score += 20;
  } else {
    score += 25;
  }

  // Structure balance (20 points)
  const expectedMinLength = 200;
  const expectedMaxLength = 30000;

  if (stage.content.length >= expectedMinLength && stage.content.length <= expectedMaxLength) {
    score += 20;
  } else if (stage.content.length < expectedMinLength) {
    score += 0;
  } else {
    score += 10;
  }

  // Metadata accuracy (25 points)
  if (!stage.title || stage.title.length < 3) {
    issues.push('Title missing or too short');
  } else {
    score += 10;
  }

  if (!stage.slug || stage.slug.length < 3) {
    issues.push('Slug invalid');
  } else {
    score += 5;
  }

  if (stage.estimated_minutes < 3 || stage.estimated_minutes > 30) {
    warnings.push(`Unusual time estimate (${stage.estimated_minutes} min)`);
    score += 5;
  } else {
    score += 10;
  }

  return { score, issues, warnings };
}

function validateLesson(stages: ParsedStage[], originalContent: string): { score: number, issues: string[], warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Stage count
  if (stages.length < 2) {
    issues.push(`Too few stages (${stages.length}, minimum 2)`);
  } else if (stages.length > 10) {
    issues.push(`Too many stages (${stages.length}, maximum 10)`);
  } else if (stages.length < 4) {
    warnings.push(`Few stages (${stages.length})`);
  }

  // Balance ratio
  const sizes = stages.map(s => s.content.length);
  const maxSize = Math.max(...sizes);
  const minSize = Math.min(...sizes);
  const ratio = minSize > 0 ? maxSize / minSize : 999;

  if (ratio > 20) {
    warnings.push(`High content imbalance (ratio ${ratio.toFixed(1)})`);
  }

  // Sequential numbering
  const isSequential = stages.every((s, i) => s.stage_number === i + 1);
  if (!isSequential) {
    issues.push('Stage numbers not sequential');
  }

  // Content coverage
  const totalStageContent = stages.reduce((sum, s) => sum + s.content.length, 0);
  const coveragePercent = (totalStageContent / originalContent.length) * 100;

  if (coveragePercent < 80) {
    warnings.push(`Low content coverage (${coveragePercent.toFixed(1)}%)`);
  }

  // Average stage scores
  let totalScore = 0;
  stages.forEach(stage => {
    if (stage.quality_score) {
      totalScore += stage.quality_score;
    }
  });

  const avgScore = stages.length > 0 ? totalScore / stages.length : 0;

  return {
    score: Math.round(avgScore),
    issues,
    warnings
  };
}

// DATABASE INSERTION WITH TRANSACTION
async function insertLessonToDatabase(result: LessonResult): Promise<boolean> {
  log(`  Database insertion...`);

  try {
    // Step 1: Verify lesson exists
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .eq('id', result.lessonId)
      .single();

    if (lessonError || !lesson) {
      log(`    ❌ Lesson ${result.lessonId} not found in database`);
      return false;
    }

    // Step 2: Prepare stage data (remove quality_score field)
    const stagesToInsert = result.stages.map(({ quality_score, ...stage }) => stage);

    log(`    BEGIN TRANSACTION`);
    log(`    Inserting ${stagesToInsert.length} stages...`);

    // Step 3: Insert stages
    const { data: insertedStages, error: insertError } = await supabase
      .from('lesson_stages')
      .insert(stagesToInsert)
      .select();

    if (insertError) {
      log(`    ❌ Insert error: ${insertError.message}`);
      return false;
    }

    // Step 4: Immediate verification - count
    const { count, error: countError } = await supabase
      .from('lesson_stages')
      .select('id', { count: 'exact', head: true })
      .eq('lesson_id', result.lessonId);

    if (countError || count !== stagesToInsert.length) {
      log(`    ❌ Count mismatch: expected ${stagesToInsert.length}, got ${count}`);
      // Attempt rollback by deleting
      await supabase.from('lesson_stages').delete().eq('lesson_id', result.lessonId);
      return false;
    }

    log(`    ✓ Count verified: ${count} stages`);

    // Step 5: Content integrity check
    const { data: verifyStages, error: verifyError } = await supabase
      .from('lesson_stages')
      .select('stage_number, content')
      .eq('lesson_id', result.lessonId)
      .order('stage_number');

    if (verifyError || !verifyStages || verifyStages.length !== stagesToInsert.length) {
      log(`    ❌ Verification failed`);
      await supabase.from('lesson_stages').delete().eq('lesson_id', result.lessonId);
      return false;
    }

    // Check no stage is too short
    const tooShort = verifyStages.find(s => s.content.length < 200);
    if (tooShort) {
      log(`    ❌ Stage ${tooShort.stage_number} too short (${tooShort.content.length} chars)`);
      await supabase.from('lesson_stages').delete().eq('lesson_id', result.lessonId);
      return false;
    }

    log(`    ✓ Content integrity verified`);
    log(`    COMMIT ✅`);

    return true;

  } catch (err) {
    log(`    ❌ Unexpected error: ${err}`);
    // Attempt cleanup
    try {
      await supabase.from('lesson_stages').delete().eq('lesson_id', result.lessonId);
    } catch (cleanupErr) {
      log(`    ⚠️  Cleanup failed: ${cleanupErr}`);
    }
    return false;
  }
}

// PROCESS SINGLE LESSON
async function processLesson(lessonNumber: number): Promise<LessonResult | null> {
  const lessonId = `lesson-${String(lessonNumber).padStart(2, '0')}`;

  log(`\n${'='.repeat(80)}`);
  log(`Processing ${lessonId}...`);
  log(`${'='.repeat(80)}`);

  try {
    // Step 1: Read file
    const lessonsPath = resolve(__dirname, '../../lessons');
    const fileName = execSync(`ls ${lessonId}-*.md`, {
      encoding: 'utf-8',
      cwd: lessonsPath
    }).trim().split('\n')[0];

    const filePath = resolve(lessonsPath, fileName);
    const content = readFileSync(filePath, 'utf-8');

    log(`  File: ${fileName}`);
    log(`  Size: ${(content.length / 1024).toFixed(1)} KB`);

    const isCleaned = cleanedLessons.includes(lessonNumber);
    if (isCleaned) {
      log(`  ✓ Using cleaned version (duplicates removed)`);
    }

    // Load analysis to get pattern
    const analysisPath = resolve(logsDir, 'lesson-analysis-complete.json');
    const analysis = JSON.parse(readFileSync(analysisPath, 'utf-8'));
    const pattern = analysis[lessonId]?.detected_pattern || 'section-based';

    log(`  Pattern: ${pattern}`);

    // Step 2: Parse
    const stages = parseLesson(content, lessonNumber, pattern);

    if (stages.length === 0) {
      log(`  ❌ Parsing failed - no stages created`);
      return {
        lessonNumber,
        lessonId,
        fileName,
        pattern,
        status: 'FAIL',
        qualityScore: 0,
        stageCount: 0,
        totalMinutes: 0,
        totalChars: 0,
        stages: [],
        issues: ['Parsing produced no stages'],
        warnings: []
      };
    }

    // Step 3: Quality validation
    log(`  Quality validation:`);

    const stageScores: number[] = [];
    const allIssues: string[] = [];
    const allWarnings: string[] = [];

    stages.forEach((stage, idx) => {
      const { score, issues, warnings } = validateStage(stage, stages);
      stage.quality_score = score;
      stageScores.push(score);

      const status = issues.length > 0 ? '❌ FAIL' : warnings.length > 0 ? '⚠️  WARN' : '✅ PASS';
      log(`    Stage ${idx + 1}: "${stage.title.substring(0, 40)}..." - ${stage.content_type}, ${stage.estimated_minutes}min, ${stage.difficulty} → ${score}/100 ${status}`);

      issues.forEach(issue => {
        allIssues.push(`Stage ${idx + 1}: ${issue}`);
      });

      warnings.forEach(warning => {
        allWarnings.push(`Stage ${idx + 1}: ${warning}`);
      });
    });

    // Lesson-level validation
    const lessonValidation = validateLesson(stages, content);
    allIssues.push(...lessonValidation.issues);
    allWarnings.push(...lessonValidation.warnings);

    const qualityScore = lessonValidation.score;

    let status: 'PASS' | 'WARN' | 'FAIL';
    if (allIssues.length > 0 || qualityScore < 70) {
      status = 'FAIL';
      log(`  Lesson quality: ${qualityScore}/100 → ❌ FAIL`);
    } else if (qualityScore < 85 || allWarnings.length > 0) {
      status = 'WARN';
      log(`  Lesson quality: ${qualityScore}/100 → ⚠️  WARN`);
    } else {
      status = 'PASS';
      log(`  Lesson quality: ${qualityScore}/100 → ✅ PASS`);
    }

    const result: LessonResult = {
      lessonNumber,
      lessonId,
      fileName,
      pattern,
      status,
      qualityScore,
      stageCount: stages.length,
      totalMinutes: stages.reduce((sum, s) => sum + s.estimated_minutes, 0),
      totalChars: stages.reduce((sum, s) => sum + s.content.length, 0),
      stages,
      issues: allIssues,
      warnings: allWarnings
    };

    // Save parsed data
    writeFileSync(
      resolve(parsedDir, `${lessonId}.json`),
      JSON.stringify(result, null, 2)
    );

    return result;

  } catch (err) {
    log(`  ❌ ERROR: ${err}`);
    return {
      lessonNumber,
      lessonId,
      fileName: 'ERROR',
      pattern: 'unknown',
      status: 'ERROR',
      qualityScore: 0,
      stageCount: 0,
      totalMinutes: 0,
      totalChars: 0,
      stages: [],
      issues: [],
      warnings: [],
      error: String(err)
    };
  }
}

// MAIN BATCH PROCESSOR
async function processBatch() {
  log('='.repeat(80));
  log('PHASE 3: COMPREHENSIVE PARSING + QUALITY CONTROL + DATABASE INSERTION');
  log('='.repeat(80));
  log(`Started: ${new Date().toISOString()}\n`);

  for (const lessonNumber of lessonsToProcess) {
    stats.processed++;

    const result = await processLesson(lessonNumber);

    if (!result) {
      stats.errors++;
      continue;
    }

    stats.results.push(result);

    if (result.status === 'ERROR') {
      stats.errors++;
      writeFileSync(resolve(failedParseDir, `${result.lessonId}.json`), JSON.stringify(result, null, 2));
      log(`❌ ${result.lessonId} - ERROR\n`);

    } else if (result.status === 'FAIL') {
      stats.failed++;
      writeFileSync(resolve(failedQualityDir, `${result.lessonId}.json`), JSON.stringify(result, null, 2));
      log(`❌ ${result.lessonId} - FAILED quality (${result.qualityScore}/100)\n`);

    } else if (result.status === 'WARN') {
      stats.warned++;
      writeFileSync(resolve(warnedQualityDir, `${result.lessonId}.json`), JSON.stringify(result, null, 2));
      log(`⚠️  ${result.lessonId} - WARN quality (${result.qualityScore}/100) - NEEDS REVIEW\n`);

      // STOP and wait for user decision
      log(`\n⏸️  PAUSING: ${result.lessonId} has WARN status (${result.qualityScore}/100)`);
      log(`Issues: ${result.issues.length}, Warnings: ${result.warnings.length}`);
      log(`Saved to: ${resolve(warnedQualityDir, `${result.lessonId}.json`)}`);
      log(`\nPLEASE REVIEW AND DECIDE: Insert anyway, skip, or manual fix?\n`);

      // For automation, we'll continue but not insert WARN lessons
      log(`Continuing without insertion (will need manual review)...\n`);

    } else {
      // PASS - auto-insert
      const inserted = await insertLessonToDatabase(result);

      if (inserted) {
        stats.passed++;
        stats.inserted++;
        stats.totalStages += result.stageCount;
        log(`✅ ${result.lessonId} complete (${result.stageCount} stages, ${result.totalMinutes}min, quality: ${result.qualityScore}/100)\n`);
      } else {
        stats.failed++;
        result.status = 'FAIL';
        result.issues.push('Database insertion failed');
        writeFileSync(resolve(failedQualityDir, `${result.lessonId}.json`), JSON.stringify(result, null, 2));
        log(`❌ ${result.lessonId} - Database insertion FAILED\n`);
      }
    }

    // Progress update every 10 lessons
    if (stats.processed % 10 === 0) {
      log(`\n${'='.repeat(80)}`);
      log(`PROGRESS: ${stats.processed}/${lessonsToProcess.length} lessons`);
      log(`✅ Passed: ${stats.passed}, ⚠️  Warned: ${stats.warned}, ❌ Failed: ${stats.failed}, 🔥 Errors: ${stats.errors}`);
      log(`📊 Inserted: ${stats.inserted} lessons (${stats.totalStages} stages)`);
      log(`${'='.repeat(80)}\n`);
    }
  }

  generateFinalReport();
}

function generateFinalReport() {
  log(`\n${'='.repeat(80)}`);
  log('PHASE 3 COMPLETE');
  log(`${'='.repeat(80)}\n`);

  log(`Total processed: ${stats.processed}`);
  log(`✅ Passed & Inserted: ${stats.passed}`);
  log(`⚠️  Warned (need review): ${stats.warned}`);
  log(`❌ Failed quality: ${stats.failed}`);
  log(`🔥 Errors: ${stats.errors}`);
  log(`\n📊 Total stages inserted: ${stats.totalStages}`);
  log(`📁 Logs saved to: ${logFile}\n`);

  // Console summary
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 3 RESULTS:');
  console.log('='.repeat(80));
  console.log(`✅ Successfully inserted: ${stats.passed} lessons (${stats.totalStages} stages)`);
  console.log(`⚠️  Need review: ${stats.warned} lessons`);
  console.log(`❌ Failed: ${stats.failed} lessons`);
  console.log(`🔥 Errors: ${stats.errors} lessons`);
  console.log('');

  if (stats.passed > 0) {
    console.log(`Success rate: ${((stats.passed / stats.processed) * 100).toFixed(1)}%`);
  }

  console.log('\nFiles generated:');
  console.log(`  - ${parsedDir}/ (${stats.processed} JSON files)`);
  console.log(`  - ${logFile}`);
  if (stats.warned > 0) console.log(`  - ${warnedQualityDir}/ (${stats.warned} files need review)`);
  if (stats.failed > 0) console.log(`  - ${failedQualityDir}/ (${stats.failed} files)`);
  if (stats.errors > 0) console.log(`  - ${failedParseDir}/ (${stats.errors} files)`);
  console.log('');
}

// Execute
processBatch()
  .then(() => process.exit(0))
  .catch(err => {
    log(`FATAL: ${err}`);
    process.exit(1);
  });
