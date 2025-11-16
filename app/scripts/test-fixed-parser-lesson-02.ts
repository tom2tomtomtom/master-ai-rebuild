import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const logsDir = resolve(__dirname, '../logs');
if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

const logFile = resolve(logsDir, `test-fixed-parser-${new Date().toISOString().replace(/:/g, '-')}.log`);

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

// Helper functions
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
    .replace(/[🎓💰⚡🚀💼🔧🎯📊🎁🔗✅⚠️❌]/g, '')
    .trim();
}

// Extract H3 subsections with their content
function extractH3Sections(content: string): Array<{ title: string, content: string, startPos: number }> {
  const lines = content.split('\n');
  const h3s: Array<{ title: string, content: string, startPos: number }> = [];

  let currentH3: { title: string, lines: string[], startLine: number } | null = null;

  lines.forEach((line, idx) => {
    const h3Match = line.match(/^###\s+(.+)$/);

    if (h3Match) {
      // Save previous H3 if exists
      if (currentH3) {
        h3s.push({
          title: currentH3.title,
          content: currentH3.lines.join('\n'),
          startPos: currentH3.startLine
        });
      }

      // Start new H3
      currentH3 = {
        title: h3Match[1].trim(),
        lines: [line],
        startLine: idx
      };
    } else if (currentH3) {
      currentH3.lines.push(line);
    }
  });

  // Don't forget the last H3
  if (currentH3) {
    h3s.push({
      title: currentH3.title,
      content: currentH3.lines.join('\n'),
      startPos: currentH3.startLine
    });
  }

  return h3s;
}

// Split content at template boundaries (Template 1:, Template 2:, etc.)
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

// INTELLIGENT SECTION PARSING
function parseSection(heading: string, sectionContent: string, sectionType: string): ParsedStage[] {
  const stages: ParsedStage[] = [];
  const contentLength = sectionContent.length;

  log(`    Section: "${heading}" (${contentLength} chars)`);

  // RULE 1: Small section (<10K) → ONE stage
  if (contentLength < 10000) {
    const cleanedTitle = cleanTitle(heading);
    const type = detectContentType(cleanedTitle, sectionContent);

    stages.push({
      stage_number: 0, // Will be renumbered later
      title: cleanedTitle,
      content: sectionContent,
      content_type: type,
      estimated_minutes: calculateTime(sectionContent, type),
      difficulty: 'beginner',
      chars: contentLength
    });

    log(`      → 1 stage (small section)`);
    return stages;
  }

  // RULE 2: Check for Production Templates (special handling)
  if (heading.match(/production templates/i)) {
    log(`      → Production Templates section detected`);
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

      log(`      → ${stages.length} template stages`);
      return stages;
    }
  }

  // RULE 3: Check for H3 subsections
  const h3Sections = extractH3Sections(sectionContent);

  if (h3Sections.length > 0) {
    log(`      → Found ${h3Sections.length} H3 subsections`);

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

    log(`      → ${stages.length} H3-based stages`);
    return stages;
  }

  // RULE 4: No subsections, keep as one stage (even if large)
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

  log(`      → 1 stage (no subsections)`);
  return stages;
}

// MAIN PARSING FUNCTION
function parseLesson02(content: string): ParsedStage[] {
  log(`\nParsing lesson-02 with FIXED intelligent splitting...`);
  log(`Total content: ${content.length} chars\n`);

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

  log(`  Found ${h2Sections.length} H2 sections\n`);

  // Parse each H2 section
  h2Sections.forEach(section => {
    const sectionContent = lines.slice(section.start, section.end).join('\n');
    const sectionStages = parseSection(section.heading, sectionContent, 'progressive');
    stages.push(...sectionStages);
  });

  // Renumber stages and assign difficulty based on position
  const totalStages = stages.length;
  stages.forEach((stage, idx) => {
    stage.stage_number = idx + 1;
    stage.difficulty = detectDifficulty(stage.title, idx, totalStages);
  });

  return stages;
}

// QUALITY SCORING
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

// TEST
function testFixedParser() {
  log('='.repeat(80));
  log('TESTING FIXED PARSER ON LESSON-02');
  log('='.repeat(80));

  const lessonsPath = resolve(__dirname, '../../lessons');
  const filePath = resolve(lessonsPath, 'lesson-02-chatgpt-advanced-writing.md');

  const content = readFileSync(filePath, 'utf-8');
  const stages = parseLesson02(content);

  log(`\n${'='.repeat(80)}`);
  log(`RESULTS`);
  log(`${'='.repeat(80)}\n`);

  log(`Total stages created: ${stages.length}\n`);

  let totalScore = 0;
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  stages.forEach(stage => {
    const { score, status, issues } = scoreStage(stage);
    totalScore += score;

    if (status === 'PASS') passCount++;
    else if (status === 'WARN') warnCount++;
    else failCount++;

    const statusIcon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️ ' : '❌';

    log(`Stage ${stage.stage_number}: ${statusIcon} ${score}/100`);
    log(`  Title: "${stage.title.substring(0, 60)}..."`);
    log(`  Type: ${stage.content_type}, Time: ${stage.estimated_minutes}min, Difficulty: ${stage.difficulty}`);
    log(`  Content: ${stage.chars} chars`);
    if (issues.length > 0) {
      log(`  Issues: ${issues.join(', ')}`);
    }
    log('');
  });

  const avgScore = Math.round(totalScore / stages.length);
  const overallStatus = avgScore >= 85 ? 'PASS' : avgScore >= 70 ? 'WARN' : 'FAIL';

  log(`${'='.repeat(80)}`);
  log(`LESSON QUALITY: ${avgScore}/100 → ${overallStatus}`);
  log(`${'='.repeat(80)}`);
  log(`✅ PASS: ${passCount} stages`);
  log(`⚠️  WARN: ${warnCount} stages`);
  log(`❌ FAIL: ${failCount} stages`);
  log(`\nTotal time: ${stages.reduce((sum, s) => sum + s.estimated_minutes, 0)} minutes`);
  log(`Total content: ${(stages.reduce((sum, s) => sum + s.chars, 0) / 1000).toFixed(1)}K chars`);

  // Balance check
  const sizes = stages.map(s => s.chars);
  const maxSize = Math.max(...sizes);
  const minSize = Math.min(...sizes);
  const ratio = minSize > 0 ? maxSize / minSize : 999;

  log(`\nBalance ratio: ${ratio.toFixed(1)} (max ${maxSize} / min ${minSize})`);

  if (ratio < 20) {
    log(`✅ Good balance (ratio < 20)`);
  } else {
    log(`⚠️  Poor balance (ratio > 20)`);
  }

  // Save results
  const resultsPath = resolve(logsDir, 'test-fixed-parser-lesson-02-results.json');
  writeFileSync(resultsPath, JSON.stringify({ avgScore, overallStatus, passCount, warnCount, failCount, stages }, null, 2));

  log(`\nResults saved to: ${resultsPath}`);
  log(`Log saved to: ${logFile}\n`);

  // Comparison
  log(`${'='.repeat(80)}`);
  log(`COMPARISON`);
  log(`${'='.repeat(80)}`);
  log(`OLD PARSER: 9 stages, quality 91/100 FAIL, 2 stages failed`);
  log(`NEW PARSER: ${stages.length} stages, quality ${avgScore}/100 ${overallStatus}, ${failCount} stages failed`);
  log('');

  if (overallStatus === 'PASS' && avgScore >= 90) {
    log(`✅ IMPROVEMENT: Parser is FIXED and ready for all 41 lessons!`);
  } else if (avgScore > 91) {
    log(`✅ IMPROVEMENT: Quality increased from 91 to ${avgScore}`);
  } else {
    log(`⚠️  NEEDS MORE WORK: Quality is ${avgScore}, need >= 85 for PASS`);
  }
}

testFixedParser();
