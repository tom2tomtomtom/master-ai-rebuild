import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, basename } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create directories
const logsDir = resolve(__dirname, '../logs');
const parsedDir = resolve(logsDir, 'parsed-stages-adaptive');
const failedDir = resolve(logsDir, 'failed-adaptive');
const cleanedDir = resolve(__dirname, '../../lessons-cleaned');

[logsDir, parsedDir, failedDir, cleanedDir].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

const logFile = resolve(logsDir, `adaptive-parsing-${new Date().toISOString().replace(/:/g, '-')}.log`);

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
  status: 'PASS' | 'WARN' | 'FAIL'
  pattern: string
  stageCount: number
  qualityScore: number
  totalMinutes: number
  totalChars: number
  stages: ParsedStage[]
  issues: string[]
  warnings: string[]
}

const stats = {
  processed: 0,
  passed: 0,
  warned: 0,
  failed: 0,
  totalStages: 0,
  totalChars: 0,
  totalMinutes: 0,
  results: [] as LessonResult[]
};

// Smart content type detection
function detectContentType(title: string, content: string): 'practice' | 'reading' | 'exercise' | 'quiz' {
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  // Practice indicators
  if (titleLower.match(/production|template|real-world|applied|example|your first/)) {
    return 'practice';
  }

  // Exercise indicators
  if (titleLower.match(/exercise|try|practice|build|create|hands-on|step|mastery/)) {
    return 'exercise';
  }

  // Quiz indicators
  if (titleLower.match(/quiz|test|check|assessment|knowledge check/)) {
    return 'quiz';
  }

  // Practice if contains many templates/code blocks
  const codeBlocks = (content.match(/```/g) || []).length / 2;
  if (codeBlocks > 3) {
    return 'practice';
  }

  // Exercise if has prompts to fill
  if (contentLower.match(/copy this|your turn|fill in|customize/)) {
    return 'exercise';
  }

  // Default to reading
  return 'reading';
}

// Smart difficulty detection
function detectDifficulty(title: string, stageIndex: number, totalStages: number): 'beginner' | 'intermediate' | 'advanced' {
  const titleLower = title.toLowerCase();

  // Explicit difficulty indicators
  if (titleLower.match(/beginner|fundamentals|introduction|getting started|basics|foundation|quick start|your first/)) {
    return 'beginner';
  }

  if (titleLower.match(/advanced|expert|mastery|complex|professional|production level/)) {
    return 'advanced';
  }

  if (titleLower.match(/intermediate|deep dive|optimization|best practices/)) {
    return 'intermediate';
  }

  // Progressive difficulty based on position
  if (totalStages >= 4) {
    if (stageIndex < totalStages * 0.4) return 'beginner';
    if (stageIndex < totalStages * 0.7) return 'intermediate';
    return 'advanced';
  }

  // First third: beginner, middle: intermediate, last: advanced
  const portion = (stageIndex + 1) / totalStages;
  if (portion <= 0.33) return 'beginner';
  if (portion <= 0.66) return 'intermediate';
  return 'advanced';
}

// Calculate estimated time based on word count and type
function calculateEstimatedTime(content: string, type: 'practice' | 'reading' | 'exercise' | 'quiz'): number {
  const words = content.split(/\s+/).length;

  const wordsPerMinute = {
    reading: 200,
    exercise: 150,
    practice: 180,
    quiz: 100  // slower for quizzes
  };

  const rawMinutes = words / wordsPerMinute[type];

  // Round to nearest 5, minimum 3, maximum 30
  const rounded = Math.round(rawMinutes / 5) * 5;
  return Math.max(3, Math.min(30, rounded || 5));
}

// Adaptive parsing - detect natural structure
function adaptiveParse(content: string, lessonNumber: number): { stages: ParsedStage[], pattern: string } | null {
  log(`  Adaptive parsing for lesson-${String(lessonNumber).padStart(2, '0')}`);

  const lessonId = `lesson-${String(lessonNumber).padStart(2, '0')}`;
  const stages: ParsedStage[] = [];

  // Pattern 1: Standard Master-AI pattern (Business Reality + Quick Start + Progressive Mastery + Templates)
  const hasBusinessReality = content.match(/##\s+💰\s+(?:The\s+)?Business\s+Reality/i);
  const hasQuickStart = content.match(/##\s+⚡\s+(?:60-Second\s+Quick\s+Start|Your\s+First)/i);
  const hasProgressive = content.match(/##\s+🎓\s+Progressive\s+Mastery/i);
  const hasTemplates = content.match(/##\s+🚀\s+Production\s+Templates/i);

  if (hasBusinessReality || hasQuickStart || hasProgressive || hasTemplates) {
    log(`    Pattern detected: Standard Master-AI format`);
    return parseStandardPattern(content, lessonId, lessonNumber);
  }

  // Pattern 2: Simple heading-based (just ## sections)
  const h2Headings = content.match(/^## [^#\n]+/gm);
  if (h2Headings && h2Headings.length >= 2) {
    log(`    Pattern detected: Section-based (${h2Headings.length} main sections)`);
    return parseSectionBased(content, lessonId, lessonNumber);
  }

  log(`    ❌ No recognizable pattern found`);
  return null;
}

// Parse standard Master-AI pattern
function parseStandardPattern(content: string, lessonId: string, lessonNumber: number): { stages: ParsedStage[], pattern: string } {
  const stages: ParsedStage[] = [];
  let stageNumber = 0;

  // Stage patterns with flexible matching
  const patterns = [
    // Business Reality
    {
      regex: /##\s+💰\s+(?:The\s+)?Business\s+Reality[\s\S]+?(?=\n## |$)/i,
      type: 'reading' as const,
      difficulty: 'beginner' as const
    },
    // Quick Start / Your First
    {
      regex: /##\s+⚡\s+(?:60-Second\s+Quick\s+Start|Your\s+First[^\n]+)[\s\S]+?(?=\n## |$)/i,
      type: 'practice' as const,
      difficulty: 'beginner' as const
    },
    // Progressive Mastery - Foundation
    {
      regex: /###\s+Foundation\s+Level[\s\S]+?(?=\n### (?:Intermediate|Advanced)|## |$)/i,
      type: 'exercise' as const,
      difficulty: 'beginner' as const
    },
    // Progressive Mastery - Intermediate
    {
      regex: /###\s+Intermediate\s+Level[\s\S]+?(?=\n### Advanced|## |$)/i,
      type: 'exercise' as const,
      difficulty: 'intermediate' as const
    },
    // Progressive Mastery - Advanced
    {
      regex: /###\s+Advanced\s+Level[\s\S]+?(?=\n## |$)/i,
      type: 'exercise' as const,
      difficulty: 'advanced' as const
    },
    // Production Templates
    {
      regex: /##\s+🚀\s+Production\s+Templates[\s\S]+?(?=\n## |$)/i,
      type: 'practice' as const,
      difficulty: 'intermediate' as const
    }
  ];

  for (const { regex, type, difficulty } of patterns) {
    const match = content.match(regex);
    if (match) {
      stageNumber++;
      const fullMatch = match[0];

      // Extract title
      const titleMatch = fullMatch.match(/^#{2,3}\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : `Stage ${stageNumber}`;

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const stageContent = fullMatch.trim();

      // Smart detection overrides if needed
      const detectedType = detectContentType(title, stageContent);
      const estimatedMinutes = calculateEstimatedTime(stageContent, detectedType);

      stages.push({
        lesson_id: lessonId,
        stage_number: stageNumber,
        title,
        slug,
        content: stageContent,
        content_type: detectedType,
        estimated_minutes: estimatedMinutes,
        difficulty,
        is_required: true,
        display_order: stageNumber,
        is_published: true
      });

      log(`    Stage ${stageNumber}: "${title.substring(0, 50)}..." (${stageContent.length} chars, ${estimatedMinutes} min, ${detectedType})`);
    }
  }

  return { stages, pattern: 'standard-master-ai' };
}

// Parse section-based lessons
function parseSectionBased(content: string, lessonId: string, lessonNumber: number): { stages: ParsedStage[], pattern: string } {
  const stages: ParsedStage[] = [];

  // Split by ## headings
  const sections = content.split(/(?=^## )/m).filter(s => s.trim().startsWith('##'));

  sections.forEach((section, index) => {
    if (section.length < 200) {
      log(`    Skipping small section ${index + 1} (${section.length} chars)`);
      return; // Skip tiny sections
    }

    const titleMatch = section.match(/^##\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Section ${index + 1}`;

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const stageContent = section.trim();

    const contentType = detectContentType(title, stageContent);
    const difficulty = detectDifficulty(title, index, sections.length);
    const estimatedMinutes = calculateEstimatedTime(stageContent, contentType);

    stages.push({
      lesson_id: lessonId,
      stage_number: index + 1,
      title,
      slug,
      content: stageContent,
      content_type: contentType,
      estimated_minutes: estimatedMinutes,
      difficulty,
      is_required: true,
      display_order: index + 1,
      is_published: true
    });

    log(`    Stage ${index + 1}: "${title.substring(0, 50)}..." (${stageContent.length} chars, ${estimatedMinutes} min, ${contentType}, ${difficulty})`);
  });

  return { stages, pattern: 'section-based' };
}

// Quality scoring
function scoreStage(stage: ParsedStage, allStages: ParsedStage[]): { score: number, issues: string[], warnings: string[] } {
  let score = 0;
  const issues: string[] = [];
  const warnings: string[] = [];

  // Content length (40 points)
  if (stage.content.length < 200) {
    issues.push(`Content too short (${stage.content.length} chars)`);
  } else if (stage.content.length < 500) {
    score += 20;
    warnings.push(`Content short (${stage.content.length} chars)`);
  } else if (stage.content.length > 25000) {
    score += 30;
    warnings.push(`Content very long (${stage.content.length} chars)`);
  } else {
    score += 40;
  }

  // Title quality (30 points)
  if (!stage.title || stage.title.length < 5) {
    issues.push('Title missing or too short');
  } else {
    score += 30;
  }

  // Content completeness (30 points)
  const hasUnclosedCodeBlock = (stage.content.match(/```/g) || []).length % 2 !== 0;
  if (hasUnclosedCodeBlock) {
    score += 15;
    warnings.push('Unclosed code block detected');
  } else {
    score += 30;
  }

  return { score, issues, warnings };
}

function scoreLesson(stages: ParsedStage[], pattern: string): LessonResult {
  log(`  Quality evaluation`);

  const stageScores: number[] = [];
  const allIssues: string[] = [];
  const allWarnings: string[] = [];

  stages.forEach((stage, index) => {
    const { score, issues, warnings } = scoreStage(stage, stages);
    stage.quality_score = score;
    stageScores.push(score);

    const status = issues.length > 0 ? 'FAIL' : warnings.length > 0 ? 'WARN' : 'PASS';
    log(`    Stage ${index + 1}: ${score}/100 - ${status}`);

    issues.forEach(issue => {
      allIssues.push(`Stage ${index + 1}: ${issue}`);
      log(`      ❌ ${issue}`);
    });

    warnings.forEach(warning => {
      allWarnings.push(`Stage ${index + 1}: ${warning}`);
      log(`      ⚠️  ${warning}`);
    });
  });

  const avgScore = stageScores.reduce((a, b) => a + b, 0) / stageScores.length;
  const hasCriticalFailures = stageScores.some(s => s < 50);

  let status: 'PASS' | 'WARN' | 'FAIL';
  if (hasCriticalFailures || avgScore < 60) {
    status = 'FAIL';
    log(`  Overall: ${avgScore.toFixed(1)}/100 - ❌ FAIL`);
  } else if (avgScore < 80) {
    status = 'WARN';
    log(`  Overall: ${avgScore.toFixed(1)}/100 - ⚠️  WARN`);
  } else {
    status = 'PASS';
    log(`  Overall: ${avgScore.toFixed(1)}/100 - ✅ PASS`);
  }

  return {
    lessonNumber: parseInt(stages[0].lesson_id.split('-')[1]),
    lessonId: stages[0].lesson_id,
    status,
    pattern,
    stageCount: stages.length,
    qualityScore: Math.round(avgScore),
    totalMinutes: stages.reduce((sum, s) => sum + s.estimated_minutes, 0),
    totalChars: stages.reduce((sum, s) => sum + s.content.length, 0),
    stages,
    issues: allIssues,
    warnings: allWarnings
  };
}

// Database insertion
async function insertLesson(result: LessonResult): Promise<boolean> {
  log(`  Database insertion for ${result.lessonId}`);

  try {
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id')
      .eq('id', result.lessonId)
      .single();

    if (!lesson) {
      log(`    ❌ Lesson not found in database`);
      return false;
    }

    const stagesToInsert = result.stages.map(({ quality_score, ...stage }) => stage);

    const { data, error } = await supabase
      .from('lesson_stages')
      .insert(stagesToInsert)
      .select();

    if (error) {
      log(`    ❌ Database error: ${error.message}`);
      return false;
    }

    log(`    ✅ Inserted ${data.length} stages successfully`);
    return true;
  } catch (err) {
    log(`    ❌ Unexpected error: ${err}`);
    return false;
  }
}

// Main processing
async function processLesson(lessonNumber: number): Promise<LessonResult | null> {
  const lessonFile = `lesson-${String(lessonNumber).padStart(2, '0')}`;

  log(`\n${'='.repeat(80)}`);
  log(`Processing ${lessonFile}...`);
  log(`${'='.repeat(80)}`);

  try {
    const actualPath = execSync(`ls ../lessons/${lessonFile}-*.md`, { encoding: 'utf-8', cwd: __dirname }).trim().split('\n')[0];
    const content = readFileSync(resolve(__dirname, '../../lessons', basename(actualPath)), 'utf-8');

    const parseResult = adaptiveParse(content, lessonNumber);
    if (!parseResult || parseResult.stages.length === 0) {
      log(`❌ Parsing failed`);
      return null;
    }

    const result = scoreLesson(parseResult.stages, parseResult.pattern);

    // Save parsed data
    writeFileSync(
      resolve(parsedDir, `${lessonFile}.json`),
      JSON.stringify(result, null, 2)
    );

    return result;
  } catch (err) {
    log(`❌ Error: ${err}`);
    return null;
  }
}

// Batch process
async function batchProcess() {
  log('Starting adaptive parsing of remaining lessons...\n');

  // Lessons that failed in first pass
  const lessonsToProcess = [
    2, 3, 4, 5, 6, 7, 10, 11, 13, 14, 15, 18, 19,  // Quality failures
    37, 40, 44, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,  // Parsing errors
    61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73  // Parsing errors
  ];

  for (const lessonNumber of lessonsToProcess) {
    stats.processed++;

    const result = await processLesson(lessonNumber);

    if (!result) {
      stats.failed++;
      continue;
    }

    stats.results.push(result);

    if (result.status === 'FAIL') {
      stats.failed++;
      writeFileSync(resolve(failedDir, `${result.lessonId}.json`), JSON.stringify(result, null, 2));
      log(`❌ ${result.lessonId} - FAILED (${result.qualityScore}/100)\n`);
    } else {
      const inserted = await insertLesson(result);
      if (inserted) {
        if (result.status === 'WARN') stats.warned++;
        stats.passed++;
        stats.totalStages += result.stageCount;
        stats.totalChars += result.totalChars;
        stats.totalMinutes += result.totalMinutes;
        log(`✅ ${result.lessonId} complete (${result.stageCount} stages, ${result.totalMinutes} min, pattern: ${result.pattern})\n`);
      } else {
        stats.failed++;
        log(`❌ ${result.lessonId} - Database insertion failed\n`);
      }
    }

    // Progress every 10
    if (stats.processed % 10 === 0) {
      log(`\n${'='.repeat(80)}`);
      log(`PROGRESS: ${stats.processed}/${lessonsToProcess.length} lessons`);
      log(`✅ Passed: ${stats.passed}`);
      log(`⚠️  Warned: ${stats.warned}`);
      log(`❌ Failed: ${stats.failed}`);
      log(`📊 Total stages: ${stats.totalStages}`);
      log(`${'='.repeat(80)}\n`);
    }
  }

  generateFinalReport();
}

function generateFinalReport() {
  log(`\n${'='.repeat(80)}`);
  log('ADAPTIVE PARSING COMPLETE');
  log(`${'='.repeat(80)}\n`);

  log(`Lessons processed: ${stats.processed}`);
  log(`✅ Passed: ${stats.passed}`);
  log(`⚠️  Warned: ${stats.warned}`);
  log(`❌ Failed: ${stats.failed}`);
  log(`Total stages created: ${stats.totalStages}`);
  log(`Total time: ${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m\n`);

  const reportPath = resolve(logsDir, 'adaptive-parsing-report.md');
  writeFileSync(reportPath, `# Adaptive Parsing Report\n\nProcessed: ${stats.processed}\nPassed: ${stats.passed}\nFailed: ${stats.failed}\n`);
  log(`📊 Report: ${reportPath}\n`);
}

// Execute
batchProcess().then(() => process.exit(0)).catch(err => {
  log(`FATAL: ${err}`);
  process.exit(1);
});
