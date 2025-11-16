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

[logsDir, parsedDir].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

const logFile = resolve(logsDir, `test-lesson-02-${new Date().toISOString().replace(/:/g, '-')}.log`);

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
  log(`\n  Quality evaluation`);

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
  if (hasCriticalFailures || avgScore < 70) {
    status = 'FAIL';
    log(`\n  Overall: ${avgScore.toFixed(1)}/100 - ❌ FAIL`);
  } else if (avgScore < 85) {
    status = 'WARN';
    log(`\n  Overall: ${avgScore.toFixed(1)}/100 - ⚠️  WARN`);
  } else {
    status = 'PASS';
    log(`\n  Overall: ${avgScore.toFixed(1)}/100 - ✅ PASS`);
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

// Main processing
async function testLesson02() {
  const lessonNumber = 2;
  const lessonFile = `lesson-${String(lessonNumber).padStart(2, '0')}`;

  log(`\n${'='.repeat(80)}`);
  log(`TEST: Adaptive Parser on Lesson 02 ONLY`);
  log(`${'='.repeat(80)}\n`);

  try {
    // Find the lesson file
    log(`Finding lesson file: ${lessonFile}-*.md`);
    const lessonsPath = resolve(__dirname, '../../lessons');
    log(`Looking in: ${lessonsPath}\n`);

    const actualPath = execSync(`ls ${lessonFile}-*.md`, {
      encoding: 'utf-8',
      cwd: lessonsPath
    }).trim().split('\n')[0];

    log(`Found: ${actualPath}\n`);

    const fullPath = resolve(lessonsPath, actualPath);
    const content = readFileSync(fullPath, 'utf-8');

    log(`File size: ${content.length} characters`);
    log(`File has ${content.split('\n').length} lines\n`);

    // Parse
    log(`Starting adaptive parse...`);
    const parseResult = adaptiveParse(content, lessonNumber);

    if (!parseResult || parseResult.stages.length === 0) {
      log(`\n❌ PARSING FAILED - No stages extracted\n`);
      return;
    }

    log(`\n✅ Parsing successful - ${parseResult.stages.length} stages extracted`);
    log(`   Pattern: ${parseResult.pattern}\n`);

    // Score
    const result = scoreLesson(parseResult.stages, parseResult.pattern);

    // Save parsed data
    const outputPath = resolve(parsedDir, `${lessonFile}-TEST.json`);
    writeFileSync(outputPath, JSON.stringify(result, null, 2));
    log(`\n📁 Saved parsed output to: ${outputPath}`);

    // Display summary
    log(`\n${'='.repeat(80)}`);
    log(`SUMMARY`);
    log(`${'='.repeat(80)}`);
    log(`Lesson: ${result.lessonId}`);
    log(`Status: ${result.status}`);
    log(`Quality Score: ${result.qualityScore}/100`);
    log(`Pattern: ${result.pattern}`);
    log(`Stages: ${result.stageCount}`);
    log(`Total Time: ${result.totalMinutes} minutes`);
    log(`Total Content: ${(result.totalChars / 1000).toFixed(1)}K characters`);

    if (result.issues.length > 0) {
      log(`\n❌ Issues (${result.issues.length}):`);
      result.issues.forEach(issue => log(`   - ${issue}`));
    }

    if (result.warnings.length > 0) {
      log(`\n⚠️  Warnings (${result.warnings.length}):`);
      result.warnings.forEach(warning => log(`   - ${warning}`));
    }

    log(`\n${'='.repeat(80)}`);
    log(`STAGES BREAKDOWN`);
    log(`${'='.repeat(80)}\n`);

    result.stages.forEach((stage, index) => {
      log(`Stage ${index + 1}:`);
      log(`  Title: ${stage.title}`);
      log(`  Type: ${stage.content_type}`);
      log(`  Difficulty: ${stage.difficulty}`);
      log(`  Time: ${stage.estimated_minutes} min`);
      log(`  Content: ${stage.content.length} chars`);
      log(`  Quality: ${stage.quality_score}/100`);
      log(`  First 100 chars: ${stage.content.substring(0, 100).replace(/\n/g, ' ')}...`);
      log('');
    });

    log(`\n${'='.repeat(80)}`);
    log(`NEXT STEPS`);
    log(`${'='.repeat(80)}`);

    if (result.status === 'PASS') {
      log(`✅ Lesson-02 is ready for database insertion`);
      log(`   Quality score ${result.qualityScore}/100 meets PASS threshold (85+)`);
      log(`\n⏸️  WAITING FOR APPROVAL before inserting to database`);
    } else if (result.status === 'WARN') {
      log(`⚠️  Lesson-02 has warnings but may be acceptable`);
      log(`   Quality score ${result.qualityScore}/100 (70-84 range)`);
      log(`\n⏸️  WAITING FOR APPROVAL - Review warnings above`);
    } else {
      log(`❌ Lesson-02 failed quality checks`);
      log(`   Quality score ${result.qualityScore}/100 below threshold (<70)`);
      log(`\n⏸️  WAITING FOR INSTRUCTIONS - Manual fixes may be needed`);
    }

    log(`\nLog file: ${logFile}`);
    log(`Parsed JSON: ${outputPath}\n`);

  } catch (err) {
    log(`\n❌ ERROR: ${err}`);
    log(`\nStack trace: ${(err as Error).stack}\n`);
  }
}

// Execute
testLesson02()
  .then(() => process.exit(0))
  .catch(err => {
    log(`FATAL: ${err}`);
    process.exit(1);
  });
