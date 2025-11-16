import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, basename } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Quality thresholds
const MIN_STAGE_CONTENT = 200; // minimum characters per stage
const MAX_STAGE_CONTENT = 25000; // warn if stage exceeds this
const MIN_QUALITY_SCORE = 50; // fail if stage below this
const MIN_LESSON_AVG = 70; // fail lesson if average below this
const WARN_LESSON_AVG = 85; // warn if lesson below this
const MIN_BALANCE_RATIO = 0.1; // fail if smallest/largest < 0.1

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
  lessonId: string | null
  status: 'PASS' | 'WARN' | 'FAIL'
  stageCount: number
  qualityScore: number
  totalMinutes: number
  totalChars: number
  stages: ParsedStage[]
  issues: string[]
  warnings: string[]
}

interface BatchStats {
  processed: number
  passed: number
  warned: number
  failed: number
  totalStages: number
  totalChars: number
  totalMinutes: number
  results: LessonResult[]
}

const stats: BatchStats = {
  processed: 0,
  passed: 0,
  warned: 0,
  failed: 0,
  totalStages: 0,
  totalChars: 0,
  totalMinutes: 0,
  results: []
}

// Create log directories
const logsDir = resolve(__dirname, '../logs');
const parsedDir = resolve(logsDir, 'parsed-stages');
const failedDir = resolve(logsDir, 'failed-parses');
const cleanedDir = resolve(__dirname, '../../lessons-cleaned');

[logsDir, parsedDir, failedDir, cleanedDir].forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

const logFile = resolve(logsDir, `batch-processing-${new Date().toISOString().replace(/:/g, '-')}.log`);

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(message);
  writeFileSync(logFile, logMessage + '\n', { flag: 'a' });
}

// PHASE A: Pre-parsing validation
function validateFile(lessonPath: string, lessonNumber: number): { valid: boolean, cleanedContent?: string, issues: string[] } {
  log(`  Phase A: Pre-parsing validation for lesson-${String(lessonNumber).padStart(2, '0')}`);

  const issues: string[] = [];
  let content: string;

  try {
    content = readFileSync(lessonPath, 'utf-8');
  } catch (err) {
    issues.push(`File read error: ${err}`);
    return { valid: false, issues };
  }

  // Check file size
  const sizeKB = Buffer.byteLength(content, 'utf-8') / 1024;
  if (sizeKB < 5) {
    issues.push(`File very small (${sizeKB.toFixed(1)}KB) - might be incomplete`);
  }
  if (sizeKB > 100) {
    issues.push(`File very large (${sizeKB.toFixed(1)}KB) - might need splitting`);
  }

  // Count headings
  const h2Count = (content.match(/^## /gm) || []).length;
  const h3Count = (content.match(/^### /gm) || []).length;
  log(`    Headings: ${h2Count} H2, ${h3Count} H3`);

  // Detect duplicate title patterns
  const titleMatches = content.match(/^# Lesson \d+:/gm) || [];
  if (titleMatches.length > 1) {
    issues.push(`Found ${titleMatches.length} lesson titles - likely duplicate content`);
  }

  // Detect duplicate "BEFORE YOU START" sections
  const beforeStartMatches = content.match(/##\s+⚡\s+BEFORE YOU START/gi) || [];
  if (beforeStartMatches.length > 1) {
    issues.push(`Found ${beforeStartMatches.length} "BEFORE YOU START" sections - likely duplicate`);
  }

  // Simple duplicate detection: check if content appears to repeat
  const lines = content.split('\n');
  const midPoint = Math.floor(lines.length / 2);
  const firstHalf = lines.slice(0, midPoint).join('\n');
  const secondHalf = lines.slice(midPoint).join('\n');

  // If second half starts with same heading as first half, might be duplicate
  const firstH1 = firstHalf.match(/^# .+$/m)?.[0];
  const secondH1 = secondHalf.match(/^# .+$/m)?.[0];

  if (firstH1 && secondH1 && firstH1 === secondH1) {
    issues.push('Possible duplicate content detected (same H1 in both halves)');
  }

  if (issues.some(i => i.includes('duplicate'))) {
    // Attempt to clean - take first half before duplication
    log(`    Attempting to clean duplicate content...`);
    const cleanedContent = removeDuplicates(content, lessonNumber);
    return { valid: true, cleanedContent, issues };
  }

  return { valid: true, issues };
}

function removeDuplicates(content: string, lessonNumber: number): string {
  // Find where duplication starts (look for second occurrence of lesson title)
  const lessonTitlePattern = /^# Lesson \d+:/gm;
  const matches = [];
  let match;

  lessonTitlePattern.lastIndex = 0;
  while ((match = lessonTitlePattern.exec(content)) !== null) {
    matches.push(match.index);
  }

  if (matches.length > 1) {
    // Take content up to second title
    const cleaned = content.substring(0, matches[1]).trim();
    const originalLines = content.split('\n').length;
    const cleanedLines = cleaned.split('\n').length;
    const removedLines = originalLines - cleanedLines;

    log(`    Removed ${removedLines} duplicate lines (${(removedLines / originalLines * 100).toFixed(1)}%)`);

    // Save cleaned version
    const cleanedPath = resolve(cleanedDir, `lesson-${String(lessonNumber).padStart(2, '0')}-cleaned.md`);
    writeFileSync(cleanedPath, cleaned, 'utf-8');
    log(`    Saved cleaned version to: ${basename(cleanedPath)}`);

    return cleaned;
  }

  return content;
}

// PHASE B: Parse with validation
function parseLesson(content: string, lessonNumber: number): { stages: ParsedStage[], issues: string[] } | null {
  log(`  Phase B: Parsing lesson-${String(lessonNumber).padStart(2, '0')} into stages`);

  const lessonId = `lesson-${String(lessonNumber).padStart(2, '0')}`;
  const stages: ParsedStage[] = [];
  const issues: string[] = [];

  // Define stage patterns (same as original parser)
  const stagePatterns = [
    { pattern: /## ⚡ Your First.+?\n([\s\S]+?)(?=\n## |$)/i, type: 'practice' as const, difficulty: 'beginner' as const },
    { pattern: /## 💰 The Business Reality.+?\n([\s\S]+?)(?=\n## |$)/i, type: 'reading' as const, difficulty: 'beginner' as const },
    { pattern: /### Foundation Level.+?\n([\s\S]+?)(?=\n### Intermediate Level|### Advanced Level|\n## |$)/i, type: 'exercise' as const, difficulty: 'beginner' as const },
    { pattern: /### Intermediate Level.+?\n([\s\S]+?)(?=\n### Advanced Level|\n## |$)/i, type: 'exercise' as const, difficulty: 'intermediate' as const },
    { pattern: /### Advanced Level.+?\n([\s\S]+?)(?=\n## |$)/i, type: 'exercise' as const, difficulty: 'advanced' as const },
    { pattern: /## 🚀 Production Templates.+?\n([\s\S]+?)(?=\n## |$)/i, type: 'practice' as const, difficulty: 'intermediate' as const }
  ];

  let stageNumber = 0;

  for (const { pattern, type, difficulty } of stagePatterns) {
    const match = content.match(pattern);
    if (match) {
      stageNumber++;
      const fullMatch = match[0];
      const titleMatch = fullMatch.match(/^#{2,3}\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : `Stage ${stageNumber}`;

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const stageContent = fullMatch.trim();

      // Estimate reading time based on word count
      const wordCount = stageContent.split(/\s+/).length;
      const wordsPerMinute = type === 'reading' ? 200 : type === 'exercise' ? 150 : 180;
      const estimatedMinutes = Math.max(3, Math.ceil(wordCount / wordsPerMinute));

      stages.push({
        lesson_id: lessonId,
        stage_number: stageNumber,
        title,
        slug,
        content: stageContent,
        content_type: type,
        estimated_minutes: estimatedMinutes,
        difficulty,
        is_required: true,
        display_order: stageNumber,
        is_published: true
      });

      log(`    Found Stage ${stageNumber}: "${title.substring(0, 50)}..." (${stageContent.length} chars, ${estimatedMinutes} min)`);
    }
  }

  if (stages.length === 0) {
    issues.push('No stages found - parsing failed');
    return null;
  }

  log(`    Successfully parsed ${stages.length} stages`);
  return { stages, issues };
}

// PHASE C: Quality scoring
function scoreStage(stage: ParsedStage, allStages: ParsedStage[]): { score: number, issues: string[], warnings: string[] } {
  let score = 0;
  const issues: string[] = [];
  const warnings: string[] = [];

  // Content length (30 points)
  if (stage.content.length < MIN_STAGE_CONTENT) {
    issues.push(`Content too short (${stage.content.length} chars, min ${MIN_STAGE_CONTENT})`);
  } else if (stage.content.length < 500) {
    score += 15;
    warnings.push(`Content short (${stage.content.length} chars)`);
  } else if (stage.content.length > MAX_STAGE_CONTENT) {
    score += 20;
    warnings.push(`Content very long (${stage.content.length} chars)`);
  } else {
    score += 30;
  }

  // Title quality (20 points)
  if (!stage.title || stage.title.length < 5) {
    issues.push('Title missing or too short');
  } else if (stage.title === 'Foundation Level (5 minutes)' || stage.title === 'Intermediate Level (7 minutes)') {
    score += 10;
    warnings.push('Generic title - could be more descriptive');
  } else {
    score += 20;
  }

  // Content completeness (30 points)
  const endsWithEllipsis = stage.content.trim().endsWith('...');
  const endsWithIncomplete = !stage.content.trim().match(/[.!?]$/);
  const hasUnclosedCodeBlock = (stage.content.match(/```/g) || []).length % 2 !== 0;

  if (endsWithEllipsis) {
    issues.push('Content ends with "..." - likely truncated');
  } else if (hasUnclosedCodeBlock) {
    issues.push('Unclosed code block detected');
  } else if (endsWithIncomplete && stage.content.length > 1000) {
    score += 20;
    warnings.push('Content may be incomplete (no ending punctuation)');
  } else {
    score += 30;
  }

  // Balance with other stages (20 points)
  const sizes = allStages.map(s => s.content.length);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);
  const balanceRatio = minSize / maxSize;

  if (balanceRatio < MIN_BALANCE_RATIO) {
    score += 5;
    warnings.push(`Stage size imbalance (ratio ${balanceRatio.toFixed(2)}, min ${MIN_BALANCE_RATIO})`);
  } else if (balanceRatio < 0.3) {
    score += 15;
    warnings.push(`Moderate size imbalance (ratio ${balanceRatio.toFixed(2)})`);
  } else {
    score += 20;
  }

  return { score, issues, warnings };
}

function scoreLess(stages: ParsedStage[]): LessonResult {
  log(`  Phase C: Quality gate evaluation`);

  const stageScores: number[] = [];
  const allIssues: string[] = [];
  const allWarnings: string[] = [];

  stages.forEach((stage, index) => {
    const { score, issues, warnings } = scoreStage(stage, stages);
    stage.quality_score = score;
    stageScores.push(score);

    log(`    Stage ${index + 1}: ${score}/100 - ${issues.length > 0 ? 'FAIL' : warnings.length > 0 ? 'WARN' : 'PASS'}`);

    issues.forEach(issue => {
      const fullIssue = `Stage ${index + 1}: ${issue}`;
      allIssues.push(fullIssue);
      log(`      ❌ ${issue}`);
    });

    warnings.forEach(warning => {
      const fullWarning = `Stage ${index + 1}: ${warning}`;
      allWarnings.push(fullWarning);
      log(`      ⚠️  ${warning}`);
    });
  });

  const avgScore = stageScores.reduce((a, b) => a + b, 0) / stageScores.length;
  const hasCriticalFailures = stageScores.some(s => s < MIN_QUALITY_SCORE);

  let status: 'PASS' | 'WARN' | 'FAIL';
  if (hasCriticalFailures || avgScore < MIN_LESSON_AVG) {
    status = 'FAIL';
    log(`    Overall: ${avgScore.toFixed(1)}/100 - ❌ FAIL`);
  } else if (avgScore < WARN_LESSON_AVG) {
    status = 'WARN';
    log(`    Overall: ${avgScore.toFixed(1)}/100 - ⚠️  WARN`);
  } else {
    status = 'PASS';
    log(`    Overall: ${avgScore.toFixed(1)}/100 - ✅ PASS`);
  }

  const totalMinutes = stages.reduce((sum, s) => sum + s.estimated_minutes, 0);
  const totalChars = stages.reduce((sum, s) => sum + s.content.length, 0);

  return {
    lessonNumber: parseInt(stages[0].lesson_id.split('-')[1]),
    lessonId: stages[0].lesson_id,
    status,
    stageCount: stages.length,
    qualityScore: Math.round(avgScore),
    totalMinutes,
    totalChars,
    stages,
    issues: allIssues,
    warnings: allWarnings
  };
}

// PHASE D: Database insertion
async function insertLesson(result: LessonResult): Promise<boolean> {
  log(`  Phase D: Database insertion for ${result.lessonId}`);

  try {
    // Get lesson_id from database
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .eq('id', result.lessonId)
      .single();

    if (lessonError || !lesson) {
      log(`    ❌ Lesson ${result.lessonId} not found in database`);
      return false;
    }

    log(`    ✅ Found lesson in database: ${lesson.id}`);

    // Prepare stages (remove quality_score for DB)
    const stagesToInsert = result.stages.map(({ quality_score, ...stage }) => stage);

    // Insert stages
    const { data, error } = await supabase
      .from('lesson_stages')
      .insert(stagesToInsert)
      .select();

    if (error) {
      log(`    ❌ Database error: ${error.message}`);
      return false;
    }

    if (!data || data.length !== stagesToInsert.length) {
      log(`    ❌ Verification failed: expected ${stagesToInsert.length} stages, got ${data?.length || 0}`);
      return false;
    }

    log(`    ✅ Inserted ${data.length} stages successfully`);

    // Verify content integrity (sample random stage)
    const randomIndex = Math.floor(Math.random() * data.length);
    const insertedStage = data[randomIndex];
    const originalStage = result.stages[randomIndex];

    if (insertedStage.content.length !== originalStage.content.length) {
      log(`    ⚠️  Content length mismatch in stage ${randomIndex + 1}: ${insertedStage.content.length} vs ${originalStage.content.length}`);
    } else {
      log(`    ✅ Content integrity verified (sample check)`);
    }

    return true;
  } catch (err) {
    log(`    ❌ Unexpected error: ${err}`);
    return false;
  }
}

// Main processing function
async function processLesson(lessonNumber: number): Promise<LessonResult | null> {
  const lessonFile = `lesson-${String(lessonNumber).padStart(2, '0')}`;
  const lessonPath = resolve(__dirname, `../../lessons/${lessonFile}-*.md`);

  log(`\n${'='.repeat(80)}`);
  log(`Processing ${lessonFile}...`);
  log(`${'='.repeat(80)}`);

  // Find the actual file (has suffix after number)
  const { execSync } = require('child_process');
  let actualPath: string;

  try {
    actualPath = execSync(`ls ${lessonPath}`, { encoding: 'utf-8' }).trim().split('\n')[0];
  } catch {
    log(`❌ File not found: ${lessonPath}`);
    return null;
  }

  // Phase A: Validation
  const validation = validateFile(actualPath, lessonNumber);
  if (!validation.valid) {
    log(`❌ Pre-validation failed: ${validation.issues.join(', ')}`);
    return null;
  }

  if (validation.issues.length > 0) {
    validation.issues.forEach(issue => log(`  ⚠️  ${issue}`));
  }

  const contentToUse = validation.cleanedContent || readFileSync(actualPath, 'utf-8');

  // Phase B: Parse
  const parseResult = parseLesson(contentToUse, lessonNumber);
  if (!parseResult) {
    log(`❌ Parsing failed`);
    return null;
  }

  // Phase C: Score
  const result = scoreLess(parseResult.stages);

  // Save parsed data
  const parsedFilePath = resolve(parsedDir, `${lessonFile}.json`);
  writeFileSync(parsedFilePath, JSON.stringify(result, null, 2));

  return result;
}

// Batch process all lessons
async function batchProcess() {
  log('Starting batch processing of 72 lessons...\n');

  const lessonsToProcess = Array.from({ length: 72 }, (_, i) => i + 2); // 2-73

  for (const lessonNumber of lessonsToProcess) {
    stats.processed++;

    const result = await processLesson(lessonNumber);

    if (!result) {
      stats.failed++;
      log(`❌ ${result?.lessonId || `lesson-${lessonNumber}`} - FAILED (parsing error)\n`);
      continue;
    }

    stats.results.push(result);

    if (result.status === 'FAIL') {
      stats.failed++;
      const failedPath = resolve(failedDir, `${result.lessonId}.json`);
      writeFileSync(failedPath, JSON.stringify(result, null, 2));
      log(`❌ ${result.lessonId} - FAILED (quality score ${result.qualityScore}/100)`);
    } else if (result.status === 'WARN') {
      stats.warned++;
      stats.totalStages += result.stageCount;
      stats.totalChars += result.totalChars;
      stats.totalMinutes += result.totalMinutes;

      // For now, auto-approve WARNings (you can change this to ask for input)
      log(`⚠️  ${result.lessonId} - WARNING (quality score ${result.qualityScore}/100) - Auto-approving...`);

      const inserted = await insertLesson(result);
      if (inserted) {
        stats.passed++; // Count as passed after insertion
        log(`✅ ${result.lessonId} complete (${result.stageCount} stages, ${result.totalMinutes} min, ${result.totalChars} chars)\n`);
      } else {
        stats.failed++;
        stats.warned--;
        log(`❌ ${result.lessonId} - FAILED (database insertion error)\n`);
      }
    } else {
      // PASS
      stats.passed++;
      stats.totalStages += result.stageCount;
      stats.totalChars += result.totalChars;
      stats.totalMinutes += result.totalMinutes;

      const inserted = await insertLesson(result);
      if (!inserted) {
        stats.failed++;
        stats.passed--;
        log(`❌ ${result.lessonId} - FAILED (database insertion error)\n`);
      } else {
        log(`✅ ${result.lessonId} complete (${result.stageCount} stages, ${result.totalMinutes} min, ${result.totalChars} chars)\n`);
      }
    }

    // Progress report every 10 lessons
    if (stats.processed % 10 === 0) {
      log(`\n${'='.repeat(80)}`);
      log(`PROGRESS: ${stats.processed}/72 lessons`);
      log(`✅ Passed: ${stats.passed} (${(stats.passed / stats.processed * 100).toFixed(1)}%)`);
      log(`⚠️  Warned: ${stats.warned} (${(stats.warned / stats.processed * 100).toFixed(1)}%)`);
      log(`❌ Failed: ${stats.failed} (${(stats.failed / stats.processed * 100).toFixed(1)}%)`);
      log(`📊 Total stages created: ${stats.totalStages}`);
      log(`${'='.repeat(80)}\n`);
    }
  }

  // Final report
  generateFinalReport();
}

function generateFinalReport() {
  log(`\n${'='.repeat(80)}`);
  log('BATCH PROCESSING COMPLETE');
  log(`${'='.repeat(80)}\n`);

  log('OVERALL STATISTICS:');
  log(`- Lessons processed: ${stats.processed}/72`);
  log(`- Lessons passed: ${stats.passed} (${(stats.passed / stats.processed * 100).toFixed(1)}%)`);
  log(`- Lessons with warnings: ${stats.warned} (${(stats.warned / stats.processed * 100).toFixed(1)}%)`);
  log(`- Lessons failed: ${stats.failed} (${(stats.failed / stats.processed * 100).toFixed(1)}%)`);
  log(`- Total stages created: ${stats.totalStages}`);
  log(`- Total content: ${(stats.totalChars / 1000).toFixed(1)}K characters`);
  log(`- Total learning time: ${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`);

  const avgQuality = stats.results.reduce((sum, r) => sum + r.qualityScore, 0) / stats.results.length;
  log(`- Average quality score: ${avgQuality.toFixed(1)}/100\n`);

  log('See detailed logs at:');
  log(`- Main log: ${logFile}`);
  log(`- Parsed data: ${parsedDir}/`);
  log(`- Failed lessons: ${failedDir}/`);
  log(`- Cleaned files: ${cleanedDir}/\n`);

  const reportPath = resolve(logsDir, 'batch-report.md');
  writeFileSync(reportPath, generateMarkdownReport(), 'utf-8');
  log(`📊 Detailed report generated: ${reportPath}\n`);
}

function generateMarkdownReport(): string {
  const report = [];

  report.push('# Batch Processing Quality Report\n');
  report.push(`Generated: ${new Date().toISOString()}\n`);

  report.push('## Overall Statistics\n');
  report.push(`- **Lessons Processed**: ${stats.processed}/72`);
  report.push(`- **Passed**: ${stats.passed} (${(stats.passed / stats.processed * 100).toFixed(1)}%)`);
  report.push(`- **Warned**: ${stats.warned} (${(stats.warned / stats.processed * 100).toFixed(1)}%)`);
  report.push(`- **Failed**: ${stats.failed} (${(stats.failed / stats.processed * 100).toFixed(1)}%)`);
  report.push(`- **Total Stages**: ${stats.totalStages}`);
  report.push(`- **Total Content**: ${(stats.totalChars / 1000).toFixed(1)}K chars`);
  report.push(`- **Total Time**: ${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m\n`);

  report.push('## Lesson Details\n');
  report.push('| Lesson | Stages | Quality | Time | Chars | Status |');
  report.push('|--------|--------|---------|------|-------|--------|');

  stats.results.forEach(r => {
    const statusEmoji = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
    report.push(`| ${r.lessonId} | ${r.stageCount} | ${r.qualityScore}/100 | ${r.totalMinutes}m | ${r.totalChars} | ${statusEmoji} ${r.status} |`);
  });

  const failed = stats.results.filter(r => r.status === 'FAIL');
  if (failed.length > 0) {
    report.push('\n## Failed Lessons\n');
    failed.forEach(r => {
      report.push(`### ${r.lessonId}`);
      report.push(`- Quality Score: ${r.qualityScore}/100`);
      report.push(`- Issues:`);
      r.issues.forEach(issue => report.push(`  - ${issue}`));
      report.push('');
    });
  }

  return report.join('\n');
}

// Execute
batchProcess()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    log(`FATAL ERROR: ${err}`);
    process.exit(1);
  });
