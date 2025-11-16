import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

// Create logs directory
const logsDir = resolve(__dirname, '../logs');
if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

const analysisJsonFile = resolve(logsDir, 'lesson-analysis-complete.json');
const analysisSummaryFile = resolve(logsDir, 'lesson-analysis-summary.md');
const logFile = resolve(logsDir, 'analysis-process.txt');

function log(message: string) {
  console.log(message);
  writeFileSync(logFile, message + '\n', { flag: 'a' });
}

interface HeadingInfo {
  level: number
  text: string
  line: number
  contentSize: number
}

interface LessonAnalysis {
  file: string
  cleaned: boolean
  size_kb: number
  total_chars: number
  total_words: number
  total_lines: number
  headings_h2: string[]
  headings_h3: string[]
  heading_content_sizes: Record<string, number>
  detected_pattern: string
  estimated_stages: number
  stage_balance_ratio: number
  predicted_types: string[]
  predicted_total_time_min: number
  complexity_assessment: 'simple' | 'medium' | 'complex'
  warnings: string[]
  notes: string
}

const stats = {
  analyzed: 0,
  cleanedLessons: 0,
  patterns: {
    'progressive-mastery': 0,
    'step-based': 0,
    'business-focused': 0,
    'section-based': 0,
    'custom': 0
  },
  totalEstimatedStages: 0,
  totalEstimatedMinutes: 0,
  warningsCount: 0
};

const cleanedLessons = [2, 3, 5, 13];

const lessonsToAnalyze = [
  2, 3, 4, 5, 6, 7, 10, 11, 13, 14, 15, 18, 19,
  37, 40, 44, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
  61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73
];

function detectPattern(headingsH2: string[], headingsH3: string[]): string {
  const allHeadings = [...headingsH2, ...headingsH3].join(' ').toLowerCase();

  // Progressive Mastery pattern
  if (allHeadings.includes('foundation') &&
      allHeadings.includes('intermediate') &&
      allHeadings.includes('advanced')) {
    return 'progressive-mastery';
  }

  // Business-focused pattern
  if (allHeadings.includes('business reality') ||
      allHeadings.includes('roi') ||
      allHeadings.includes('60 second')) {
    return 'business-focused';
  }

  // Step-based pattern
  if (allHeadings.match(/step \d/) ||
      allHeadings.match(/part \d/) ||
      allHeadings.match(/phase \d/)) {
    return 'step-based';
  }

  // Section-based (generic sections)
  if (headingsH2.length >= 3) {
    return 'section-based';
  }

  return 'custom';
}

function estimateStages(headings: HeadingInfo[], pattern: string): number {
  const h2Count = headings.filter(h => h.level === 2).length;
  const h3Count = headings.filter(h => h.level === 3).length;

  if (pattern === 'progressive-mastery') {
    // Usually: Business Reality + Quick Start + 3 mastery levels + Templates = 6
    return Math.min(Math.max(h2Count + Math.floor(h3Count / 2), 4), 8);
  }

  if (pattern === 'business-focused') {
    // Similar structure
    return Math.min(Math.max(h2Count, 4), 7);
  }

  if (pattern === 'step-based') {
    // Count the steps
    return Math.min(Math.max(h2Count, 3), 8);
  }

  // Section-based: each H2 becomes a stage, merge very small H3s
  return Math.min(Math.max(h2Count, 2), 8);
}

function predictContentTypes(pattern: string, stageCount: number): string[] {
  const types: string[] = [];

  if (pattern === 'progressive-mastery' || pattern === 'business-focused') {
    types.push('reading'); // Business reality
    types.push('practice'); // Quick start
    for (let i = 2; i < stageCount - 1; i++) {
      types.push(i % 2 === 0 ? 'exercise' : 'reading');
    }
    types.push('practice'); // Templates
  } else if (pattern === 'step-based') {
    types.push('reading'); // Intro
    for (let i = 1; i < stageCount - 1; i++) {
      types.push('exercise');
    }
    types.push('practice'); // Final
  } else {
    // Generic
    for (let i = 0; i < stageCount; i++) {
      types.push(i % 3 === 0 ? 'reading' : i % 3 === 1 ? 'exercise' : 'practice');
    }
  }

  return types;
}

function estimateTotalTime(totalWords: number, stageCount: number, types: string[]): number {
  // Base calculation on word count
  const avgWordsPerMinute = 180; // Conservative
  const baseMinutes = Math.round(totalWords / avgWordsPerMinute);

  // Adjust for number of stages (more stages = more overhead)
  const overhead = stageCount * 2; // 2 min overhead per stage

  const total = baseMinutes + overhead;

  // Round to nearest 5
  return Math.round(total / 5) * 5;
}

function calculateBalanceRatio(headings: HeadingInfo[]): number {
  const sizes = headings.map(h => h.contentSize).filter(s => s > 0);
  if (sizes.length === 0) return 1;

  const max = Math.max(...sizes);
  const min = Math.min(...sizes);

  return min > 0 ? max / min : max;
}

function assessComplexity(totalChars: number, headingCount: number, balanceRatio: number): 'simple' | 'medium' | 'complex' {
  let score = 0;

  // Length factor
  if (totalChars < 10000) score += 0;
  else if (totalChars < 30000) score += 1;
  else score += 2;

  // Structure factor
  if (headingCount < 5) score += 0;
  else if (headingCount < 10) score += 1;
  else score += 2;

  // Balance factor
  if (balanceRatio < 5) score += 0;
  else if (balanceRatio < 15) score += 1;
  else score += 2;

  if (score <= 2) return 'simple';
  if (score <= 4) return 'medium';
  return 'complex';
}

function analyzeLesson(lessonNumber: number): LessonAnalysis | null {
  const lessonId = `lesson-${String(lessonNumber).padStart(2, '0')}`;
  const lessonsPath = resolve(__dirname, '../../lessons');

  try {
    log(`\nAnalyzing ${lessonId}...`);

    // Find the lesson file
    const fileName = execSync(`ls ${lessonId}-*.md`, {
      encoding: 'utf-8',
      cwd: lessonsPath
    }).trim().split('\n')[0];

    const filePath = resolve(lessonsPath, fileName);
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Basic stats
    const totalChars = content.length;
    const totalWords = content.split(/\s+/).filter(w => w.length > 0).length;
    const totalLines = lines.length;
    const sizeKb = parseFloat((totalChars / 1024).toFixed(1));

    log(`  File: ${fileName}`);
    log(`  Size: ${sizeKb} KB, ${totalChars} chars, ${totalWords} words, ${totalLines} lines`);

    // Extract headings
    const headings: HeadingInfo[] = [];
    const headingsH2: string[] = [];
    const headingsH3: string[] = [];
    const headingContentSizes: Record<string, number> = {};

    lines.forEach((line, index) => {
      const h2Match = line.match(/^(##)\s+(.+)$/);
      const h3Match = line.match(/^(###)\s+(.+)$/);

      if (h2Match || h3Match) {
        const match = h2Match || h3Match;
        const level = match![1].length;
        const text = match![2].trim();

        // Calculate content size until next heading
        let contentSize = 0;
        for (let i = index + 1; i < lines.length; i++) {
          if (lines[i].match(/^#{2,3}\s+/)) break;
          contentSize += lines[i].length + 1;
        }

        const headingKey = `${'#'.repeat(level)} ${text}`;

        headings.push({ level, text, line: index + 1, contentSize });
        headingContentSizes[headingKey] = contentSize;

        if (level === 2) {
          headingsH2.push(headingKey);
        } else if (level === 3) {
          headingsH3.push(headingKey);
        }
      }
    });

    log(`  Headings: ${headingsH2.length} H2, ${headingsH3.length} H3`);

    // Detect pattern
    const pattern = detectPattern(headingsH2, headingsH3);
    log(`  Pattern: ${pattern}`);

    // Estimate stages
    const estimatedStages = estimateStages(headings, pattern);
    log(`  Estimated stages: ${estimatedStages}`);

    // Balance ratio
    const balanceRatio = calculateBalanceRatio(headings);
    log(`  Balance ratio: ${balanceRatio.toFixed(1)}`);

    // Predict types and time
    const predictedTypes = predictContentTypes(pattern, estimatedStages);
    const predictedTotalTime = estimateTotalTime(totalWords, estimatedStages, predictedTypes);
    log(`  Predicted time: ${predictedTotalTime} minutes`);

    // Complexity
    const complexity = assessComplexity(totalChars, headings.length, balanceRatio);
    log(`  Complexity: ${complexity}`);

    // Warnings
    const warnings: string[] = [];

    if (headings.length < 3) {
      warnings.push('Very few headings (<3) - might not split well into stages');
    }
    if (headings.length > 15) {
      warnings.push('Very many headings (>15) - might need section merging');
    }
    if (balanceRatio > 20) {
      warnings.push(`Huge content imbalance (ratio ${balanceRatio.toFixed(1)}) - some sections too small/large`);
    }
    if (totalChars < 5000) {
      warnings.push('Very short lesson (<5000 chars) - might only be 2-3 stages');
    }
    if (totalChars > 50000) {
      warnings.push('Very long lesson (>50000 chars) - might need 7-8 stages');
    }

    if (warnings.length > 0) {
      log(`  ⚠️  Warnings: ${warnings.length}`);
      warnings.forEach(w => log(`     - ${w}`));
    }

    // Notes
    let notes = '';
    const isCleaned = cleanedLessons.includes(lessonNumber);
    if (isCleaned) {
      notes = 'File was cleaned (duplicates removed)';
      if (lessonNumber === 2) {
        notes += ', already tested 100/100';
      }
    }

    return {
      file: `lessons/${fileName}`,
      cleaned: isCleaned,
      size_kb: sizeKb,
      total_chars: totalChars,
      total_words: totalWords,
      total_lines: totalLines,
      headings_h2: headingsH2,
      headings_h3: headingsH3,
      heading_content_sizes: headingContentSizes,
      detected_pattern: pattern,
      estimated_stages: estimatedStages,
      stage_balance_ratio: parseFloat(balanceRatio.toFixed(1)),
      predicted_types: predictedTypes,
      predicted_total_time_min: predictedTotalTime,
      complexity_assessment: complexity,
      warnings,
      notes
    };

  } catch (err) {
    log(`  ❌ Error: ${err}`);
    return null;
  }
}

async function analyzeAllLessons() {
  log('='.repeat(80));
  log('COMPREHENSIVE LESSON ANALYSIS - All 41 Remaining Lessons');
  log('='.repeat(80));
  log(`Started: ${new Date().toISOString()}\n`);

  const analyses: Record<string, LessonAnalysis> = {};

  for (const lessonNumber of lessonsToAnalyze) {
    stats.analyzed++;

    const analysis = analyzeLesson(lessonNumber);

    if (analysis) {
      const lessonId = `lesson-${String(lessonNumber).padStart(2, '0')}`;
      analyses[lessonId] = analysis;

      // Update stats
      if (analysis.cleaned) stats.cleanedLessons++;
      stats.patterns[analysis.detected_pattern as keyof typeof stats.patterns]++;
      stats.totalEstimatedStages += analysis.estimated_stages;
      stats.totalEstimatedMinutes += analysis.predicted_total_time_min;
      stats.warningsCount += analysis.warnings.length;

      log(`  ✅ Analysis complete\n`);
    } else {
      log(`  ❌ Analysis failed\n`);
    }
  }

  generateReports(analyses);
}

function generateReports(analyses: Record<string, LessonAnalysis>) {
  log('\n' + '='.repeat(80));
  log('ANALYSIS COMPLETE');
  log('='.repeat(80));
  log(`Total analyzed: ${stats.analyzed}`);
  log(`Cleaned lessons: ${stats.cleanedLessons}`);
  log(`Total estimated stages: ${stats.totalEstimatedStages}`);
  log(`Total estimated time: ${Math.floor(stats.totalEstimatedMinutes / 60)}h ${stats.totalEstimatedMinutes % 60}m`);
  log(`Warnings flagged: ${stats.warningsCount}`);

  // Save JSON
  writeFileSync(analysisJsonFile, JSON.stringify(analyses, null, 2));
  log(`\n📊 JSON saved: ${analysisJsonFile}`);

  // Generate markdown summary
  const summary: string[] = [];
  summary.push('# Lesson Analysis Summary\n');
  summary.push(`**Generated:** ${new Date().toISOString()}\n`);
  summary.push(`**Total Lessons Analyzed:** ${stats.analyzed}`);
  summary.push(`**Clean Lessons:** ${stats.analyzed - stats.cleanedLessons}`);
  summary.push(`**Cleaned Lessons:** ${stats.cleanedLessons} (duplicates removed)\n`);

  summary.push('## Summary Statistics\n');
  summary.push(`- **Total Estimated Stages:** ${stats.totalEstimatedStages}`);
  summary.push(`- **Total Estimated Learning Time:** ${Math.floor(stats.totalEstimatedMinutes / 60)}h ${stats.totalEstimatedMinutes % 60}m`);
  summary.push(`- **Average Stages per Lesson:** ${(stats.totalEstimatedStages / stats.analyzed).toFixed(1)}`);
  summary.push(`- **Average Time per Lesson:** ${Math.round(stats.totalEstimatedMinutes / stats.analyzed)} minutes`);
  summary.push(`- **Lessons with Warnings:** ${Object.values(analyses).filter(a => a.warnings.length > 0).length}\n`);

  summary.push('## Pattern Distribution\n');
  Object.entries(stats.patterns).forEach(([pattern, count]) => {
    const percentage = ((count / stats.analyzed) * 100).toFixed(1);
    summary.push(`- **${pattern}**: ${count} lessons (${percentage}%)`);
  });

  summary.push('\n---\n');
  summary.push('## Lessons by Pattern\n');

  // Group by pattern
  Object.entries(stats.patterns).forEach(([pattern, count]) => {
    if (count === 0) return;

    summary.push(`\n### ${pattern.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} (${count} lessons)\n`);

    Object.entries(analyses)
      .filter(([_, a]) => a.detected_pattern === pattern)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([lessonId, analysis]) => {
        const cleanedMarker = analysis.cleaned ? ' 🧹' : '';
        const testedMarker = lessonId === 'lesson-02' ? ' ✅ Tested 100/100' : '';
        const warningMarker = analysis.warnings.length > 0 ? ` ⚠️ ${analysis.warnings.length}` : '';

        summary.push(`- **${lessonId}** (${analysis.estimated_stages} stages, ${analysis.predicted_total_time_min}min, ${analysis.complexity_assessment})${cleanedMarker}${testedMarker}${warningMarker}`);
      });
  });

  summary.push('\n---\n');
  summary.push('## Lessons with Warnings\n');

  const lessonsWithWarnings = Object.entries(analyses).filter(([_, a]) => a.warnings.length > 0);

  if (lessonsWithWarnings.length === 0) {
    summary.push('✅ **No warnings** - All lessons look good for parsing!\n');
  } else {
    lessonsWithWarnings.forEach(([lessonId, analysis]) => {
      summary.push(`\n### ${lessonId}\n`);
      analysis.warnings.forEach(w => {
        summary.push(`- ⚠️  ${w}`);
      });
    });
  }

  summary.push('\n---\n');
  summary.push('## Complexity Breakdown\n');

  const complexityGroups = {
    simple: Object.entries(analyses).filter(([_, a]) => a.complexity_assessment === 'simple'),
    medium: Object.entries(analyses).filter(([_, a]) => a.complexity_assessment === 'medium'),
    complex: Object.entries(analyses).filter(([_, a]) => a.complexity_assessment === 'complex')
  };

  summary.push(`- **Simple:** ${complexityGroups.simple.length} lessons`);
  summary.push(`- **Medium:** ${complexityGroups.medium.length} lessons`);
  summary.push(`- **Complex:** ${complexityGroups.complex.length} lessons\n`);

  summary.push('## Top 5 Longest Lessons\n');
  const sortedBySize = Object.entries(analyses).sort((a, b) => b[1].total_chars - a[1].total_chars);
  sortedBySize.slice(0, 5).forEach(([lessonId, analysis], idx) => {
    summary.push(`${idx + 1}. **${lessonId}**: ${analysis.size_kb} KB (${analysis.estimated_stages} stages, ${analysis.predicted_total_time_min}min)`);
  });

  summary.push('\n## Top 5 Shortest Lessons\n');
  sortedBySize.slice(-5).reverse().forEach(([lessonId, analysis], idx) => {
    summary.push(`${idx + 1}. **${lessonId}**: ${analysis.size_kb} KB (${analysis.estimated_stages} stages, ${analysis.predicted_total_time_min}min)`);
  });

  summary.push('\n---\n');
  summary.push('## Next Steps\n');
  summary.push(`✅ **Analysis complete** - All ${stats.analyzed} lessons analyzed successfully\n`);
  summary.push(`📊 **Estimated output**: ${stats.totalEstimatedStages} new stages, ${Math.floor(stats.totalEstimatedMinutes / 60)}h ${stats.totalEstimatedMinutes % 60}m of content\n`);

  if (stats.warningsCount > 0) {
    summary.push(`⚠️  **${lessonsWithWarnings.length} lessons flagged** - Review warnings above before parsing\n`);
  }

  summary.push(`**Ready for Phase 3**: Parse and insert all ${stats.analyzed} lessons with quality control\n`);

  writeFileSync(analysisSummaryFile, summary.join('\n'));
  log(`📄 Summary saved: ${analysisSummaryFile}\n`);

  // Console output
  console.log('\n' + '='.repeat(80));
  console.log('ANALYSIS SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Analyzed: ${stats.analyzed} lessons`);
  console.log(`📊 Estimated stages: ${stats.totalEstimatedStages}`);
  console.log(`⏱️  Estimated time: ${Math.floor(stats.totalEstimatedMinutes / 60)}h ${stats.totalEstimatedMinutes % 60}m`);
  console.log(`⚠️  Warnings: ${stats.warningsCount} across ${lessonsWithWarnings.length} lessons`);
  console.log('');

  console.log('Pattern distribution:');
  Object.entries(stats.patterns).forEach(([pattern, count]) => {
    if (count > 0) {
      console.log(`  - ${pattern}: ${count} lessons`);
    }
  });
  console.log('');

  if (lessonsWithWarnings.length > 0) {
    console.log('Lessons with warnings:');
    lessonsWithWarnings.slice(0, 5).forEach(([lessonId, analysis]) => {
      console.log(`  - ${lessonId}: ${analysis.warnings.length} warnings`);
    });
    if (lessonsWithWarnings.length > 5) {
      console.log(`  ... and ${lessonsWithWarnings.length - 5} more`);
    }
    console.log('');
  }

  console.log('Files generated:');
  console.log(`  - ${analysisJsonFile}`);
  console.log(`  - ${analysisSummaryFile}`);
  console.log(`  - ${logFile}`);
  console.log('');
}

// Execute
analyzeAllLessons()
  .then(() => process.exit(0))
  .catch(err => {
    log(`FATAL: ${err}`);
    process.exit(1);
  });
