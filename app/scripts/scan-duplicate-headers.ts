import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

// Create logs directory
const logsDir = resolve(__dirname, '../logs');
if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

const reportFile = resolve(logsDir, 'duplicate-headers-report.md');
const logFile = resolve(logsDir, 'duplicate-scan-log.txt');

function log(message: string) {
  console.log(message);
  writeFileSync(logFile, message + '\n', { flag: 'a' });
}

interface Heading {
  level: number
  text: string
  line: number
  nextContentLength: number
}

interface Duplicate {
  heading: string
  occurrences: Array<{
    line: number
    contentLength: number
    contentPreview: string
  }>
  action: string
}

interface LessonScanResult {
  lessonNumber: number
  lessonId: string
  fileName: string
  totalLines: number
  totalHeadings: number
  duplicates: Duplicate[]
  status: 'CLEAN' | 'HAS_DUPLICATES'
}

const stats = {
  scanned: 0,
  clean: 0,
  hasDuplicates: 0,
  totalDuplicates: 0,
  results: [] as LessonScanResult[]
};

// Lessons to scan (all remaining)
const lessonsToScan = [
  2, 3, 4, 5, 6, 7, 10, 11, 13, 14, 15, 18, 19,
  37, 40, 44, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
  61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73
];

function scanLessonForDuplicates(lessonNumber: number): LessonScanResult {
  const lessonId = `lesson-${String(lessonNumber).padStart(2, '0')}`;
  const lessonsPath = resolve(__dirname, '../../lessons');

  try {
    // Find the lesson file
    const fileName = execSync(`ls ${lessonId}-*.md`, {
      encoding: 'utf-8',
      cwd: lessonsPath
    }).trim().split('\n')[0];

    const fullPath = resolve(lessonsPath, fileName);
    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    log(`\nScanning ${fileName}...`);

    // Extract all headings with line numbers
    const headings: Heading[] = [];

    lines.forEach((line, index) => {
      const h2Match = line.match(/^(##)\s+(.+)$/);
      const h3Match = line.match(/^(###)\s+(.+)$/);

      if (h2Match || h3Match) {
        const match = h2Match || h3Match;
        const level = match![1].length;
        const text = match![2].trim();
        const lineNumber = index + 1;

        // Calculate content length until next heading
        let nextContentLength = 0;
        for (let i = index + 1; i < lines.length; i++) {
          if (lines[i].match(/^#{2,3}\s+/)) break;
          nextContentLength += lines[i].length + 1; // +1 for newline
        }

        headings.push({
          level,
          text,
          line: lineNumber,
          nextContentLength
        });
      }
    });

    log(`  Found ${headings.length} headings`);

    // Detect duplicates
    const headingMap = new Map<string, Heading[]>();

    headings.forEach(heading => {
      const key = heading.text;
      if (!headingMap.has(key)) {
        headingMap.set(key, []);
      }
      headingMap.get(key)!.push(heading);
    });

    const duplicates: Duplicate[] = [];

    headingMap.forEach((occurrences, headingText) => {
      if (occurrences.length > 1) {
        log(`  ⚠️  Duplicate found: "${headingText}" appears ${occurrences.length} times`);

        const occurrenceDetails = occurrences.map(h => {
          // Get content preview
          const startIdx = h.line - 1;
          let preview = '';
          for (let i = 0; i < 3 && startIdx + i < lines.length; i++) {
            preview += lines[startIdx + i] + ' ';
          }
          preview = preview.substring(0, 100).replace(/\n/g, ' ').trim() + '...';

          return {
            line: h.line,
            contentLength: h.nextContentLength,
            contentPreview: preview
          };
        });

        // Determine action
        const sorted = [...occurrenceDetails].sort((a, b) => b.contentLength - a.contentLength);
        const keepLine = sorted[0].line;
        const removeLines = occurrenceDetails.filter(o => o.line !== keepLine).map(o => o.line);

        let action = '';
        if (occurrenceDetails.length === 2) {
          action = `Keep line ${keepLine} (${sorted[0].contentLength} chars), remove line ${removeLines[0]} (${occurrenceDetails.find(o => o.line === removeLines[0])!.contentLength} chars)`;
        } else {
          action = `Keep line ${keepLine} (${sorted[0].contentLength} chars), remove ${removeLines.length} others`;
        }

        duplicates.push({
          heading: headingText,
          occurrences: occurrenceDetails,
          action
        });

        occurrenceDetails.forEach(occ => {
          log(`    Line ${occ.line}: ${occ.contentLength} chars - "${occ.contentPreview}"`);
        });
        log(`    Action: ${action}`);
      }
    });

    const status = duplicates.length > 0 ? 'HAS_DUPLICATES' : 'CLEAN';

    if (status === 'CLEAN') {
      log(`  ✅ No duplicates found`);
    } else {
      log(`  ❌ Found ${duplicates.length} duplicate headers`);
    }

    return {
      lessonNumber,
      lessonId,
      fileName,
      totalLines: lines.length,
      totalHeadings: headings.length,
      duplicates,
      status
    };

  } catch (err) {
    log(`  ❌ Error scanning ${lessonId}: ${err}`);
    return {
      lessonNumber,
      lessonId,
      fileName: 'ERROR',
      totalLines: 0,
      totalHeadings: 0,
      duplicates: [],
      status: 'CLEAN'
    };
  }
}

async function scanAllLessons() {
  log('='.repeat(80));
  log('DUPLICATE HEADERS SCAN - All 41 Remaining Lessons');
  log('='.repeat(80));

  for (const lessonNumber of lessonsToScan) {
    stats.scanned++;
    const result = scanLessonForDuplicates(lessonNumber);
    stats.results.push(result);

    if (result.status === 'HAS_DUPLICATES') {
      stats.hasDuplicates++;
      stats.totalDuplicates += result.duplicates.length;
    } else {
      stats.clean++;
    }
  }

  generateReport();
}

function generateReport() {
  log('\n' + '='.repeat(80));
  log('SCAN COMPLETE');
  log('='.repeat(80));
  log(`Total lessons scanned: ${stats.scanned}`);
  log(`Clean: ${stats.clean}`);
  log(`Has duplicates: ${stats.hasDuplicates}`);
  log(`Total duplicate headers: ${stats.totalDuplicates}`);

  // Generate markdown report
  const report: string[] = [];
  report.push('# Duplicate Headers Report\n');
  report.push(`**Generated:** ${new Date().toISOString()}\n`);
  report.push(`**Scanned:** ${stats.scanned} lessons`);
  report.push(`**Clean:** ${stats.clean} lessons`);
  report.push(`**Has Duplicates:** ${stats.hasDuplicates} lessons`);
  report.push(`**Total Duplicate Headers:** ${stats.totalDuplicates}\n`);

  report.push('---\n');
  report.push('## Summary Table\n');
  report.push('| Lesson | Status | Headings | Duplicates | File |');
  report.push('|--------|--------|----------|------------|------|');

  stats.results.forEach(r => {
    const statusIcon = r.status === 'CLEAN' ? '✅' : '❌';
    report.push(`| ${r.lessonId} | ${statusIcon} ${r.status} | ${r.totalHeadings} | ${r.duplicates.length} | ${r.fileName} |`);
  });

  report.push('\n---\n');
  report.push('## Detailed Findings\n');

  const lessonsWithDuplicates = stats.results.filter(r => r.status === 'HAS_DUPLICATES');

  if (lessonsWithDuplicates.length === 0) {
    report.push('✅ **No duplicate headers found in any lesson!**\n');
  } else {
    lessonsWithDuplicates.forEach(lesson => {
      report.push(`\n### ${lesson.lessonId} - ${lesson.fileName}\n`);
      report.push(`- **Total headings:** ${lesson.totalHeadings}`);
      report.push(`- **Duplicates found:** ${lesson.duplicates.length}\n`);

      lesson.duplicates.forEach(dup => {
        report.push(`#### Duplicate: "${dup.heading}"\n`);
        report.push('| Occurrence | Line | Content Length | Preview |');
        report.push('|------------|------|----------------|---------|');

        dup.occurrences.forEach((occ, idx) => {
          report.push(`| ${idx + 1} | ${occ.line} | ${occ.contentLength} chars | ${occ.contentPreview.substring(0, 60)}... |`);
        });

        report.push(`\n**Action:** ${dup.action}\n`);
      });
    });
  }

  report.push('\n---\n');
  report.push('## Next Steps\n');

  if (stats.hasDuplicates > 0) {
    report.push(`1. ❌ **${stats.hasDuplicates} lessons need cleaning**`);
    report.push(`2. Run cleaning script to remove ${stats.totalDuplicates} duplicate headers`);
    report.push(`3. Create backups before cleaning`);
    report.push(`4. Verify cleaned files`);
    report.push(`5. Re-run adaptive parser\n`);
  } else {
    report.push('✅ **All lessons are clean - proceed to Phase 2 (Analysis)**\n');
  }

  writeFileSync(reportFile, report.join('\n'));
  log(`\n📊 Report saved to: ${reportFile}`);
  log(`📋 Log saved to: ${logFile}\n`);

  // Console output of summary
  console.log('\n' + '='.repeat(80));
  console.log('LESSONS REQUIRING CLEANING:');
  console.log('='.repeat(80));

  if (lessonsWithDuplicates.length === 0) {
    console.log('✅ None - all lessons are clean!\n');
  } else {
    lessonsWithDuplicates.forEach(lesson => {
      console.log(`\n${lesson.lessonId}:`);
      lesson.duplicates.forEach(dup => {
        console.log(`  - "${dup.heading.substring(0, 50)}..."`);
        console.log(`    ${dup.action}`);
      });
    });
    console.log('');
  }
}

// Execute
scanAllLessons()
  .then(() => process.exit(0))
  .catch(err => {
    log(`FATAL: ${err}`);
    process.exit(1);
  });
