import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';

// Create directories
const logsDir = resolve(__dirname, '../logs');
const backupDir = resolve(__dirname, '../../lessons-backup');

[logsDir, backupDir].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

const cleaningLogFile = resolve(logsDir, 'cleaning-log.md');
const logFile = resolve(logsDir, 'cleaning-process.txt');

function log(message: string) {
  console.log(message);
  writeFileSync(logFile, message + '\n', { flag: 'a' });
}

// Lessons to clean based on scan results
const lessonsToClean = [
  {
    lessonNumber: 2,
    duplicates: [
      { heading: '## 🎓 Progressive Mastery', removeLine: 86, keepLine: 81 },
      { heading: '### Foundation Level (5 minutes)', removeLine: 83, keepLine: 88 }
    ]
  },
  {
    lessonNumber: 3,
    duplicates: [
      { heading: '## 💰 The Business Reality', removeLine: 136, keepLine: 4 },
      { heading: '## ⚡ BEFORE YOU START: Enable Advanced Mode', removeLine: 154, keepLine: 22 },
      { heading: '### 🎯 Critical Features for This Lesson', removeLine: 158, keepLine: 26 },
      { heading: '### How to Enable: Advanced Mode (Plus Only)', removeLine: 166, keepLine: 34 },
      { heading: '### How to Select: Use GPT-4 Turbo or o1 Model', removeLine: 185, keepLine: 53 },
      { heading: '### 🔗 For Complete Reasoning Setup', removeLine: 193, keepLine: 61 },
      { heading: '## ⚡ Your First Complex Problem Solved in 60 Seconds', removeLine: 208, keepLine: 76 },
      { heading: '### Copy This Exact Prompt:', removeLine: 212, keepLine: 80 },
      { heading: '### What You Should See:', removeLine: 246, keepLine: 114 },
      { heading: '### Success Indicator:', removeLine: 255, keepLine: 123 },
      { heading: '## 🎓 Progressive Mastery', removeLine: 260, keepLine: 128 },
      { heading: '### Foundation Level (5 minutes)', removeLine: 262, keepLine: 130 },
      { heading: '## 🚀 Production Templates', removeLine: 1166, keepLine: 543 },
      { heading: '### Template 1: Strategic Decision Memo (Executive Format)', removeLine: 1168, keepLine: 545 },
      { heading: '### Template 2: Root Cause Analysis (5 Whys)', removeLine: 1223, keepLine: 600 },
      { heading: '### Template 3: Decision Tree for Complex Choices', removeLine: 1277, keepLine: 654 },
      { heading: '### Template 4: Opportunity Cost Calculator', removeLine: 1328, keepLine: 705 },
      { heading: '### Template 5: Pre-Flight Checklist (Decision Validation)', removeLine: 1378, keepLine: 755 },
      { heading: '## 💼 Business Integration', removeLine: 1444, keepLine: 821 },
      { heading: '### This Week: Problem-Solving Practice', removeLine: 1446, keepLine: 823 },
      { heading: '### This Month: Strategic Capability Building', removeLine: 1473, keepLine: 850 },
      { heading: '## 🔧 Troubleshooting & Pro Tips', removeLine: 1488, keepLine: 865 },
      { heading: '### Common Issues', removeLine: 1490, keepLine: 867 },
      { heading: '### Pro Tips', removeLine: 1501, keepLine: 878 },
      { heading: '## 🎯 Your Action Plan', removeLine: 1514, keepLine: 891 },
      { heading: '### This Week (4 hours)', removeLine: 1516, keepLine: 893 },
      { heading: '### This Month (16 hours)', removeLine: 1522, keepLine: 899 },
      { heading: '### 90-Day Mastery', removeLine: 1528, keepLine: 905 }
    ]
  },
  {
    lessonNumber: 5,
    duplicates: [
      { heading: '## 🎓 Progressive Mastery', removeLine: 78, keepLine: 73 },
      { heading: '### Foundation Level (5 minutes)', removeLine: 75, keepLine: 80 }
    ]
  },
  {
    lessonNumber: 13,
    duplicates: [
      { heading: '## 🎓 Progressive Mastery', removeLine: 78, keepLine: 73 },
      { heading: '### Foundation Level (5 minutes)', removeLine: 75, keepLine: 80 }
    ]
  }
];

interface CleaningResult {
  lessonNumber: number
  lessonId: string
  fileName: string
  originalLines: number
  cleanedLines: number
  removedLines: number
  removedHeaders: string[]
  status: 'SUCCESS' | 'FAILED'
  error?: string
}

const stats = {
  cleaned: 0,
  failed: 0,
  totalHeadersRemoved: 0,
  results: [] as CleaningResult[]
};

function cleanLesson(lessonNumber: number, duplicates: Array<{ heading: string, removeLine: number, keepLine: number }>): CleaningResult {
  const lessonId = `lesson-${String(lessonNumber).padStart(2, '0')}`;
  const lessonsPath = resolve(__dirname, '../../lessons');

  try {
    log(`\n${'='.repeat(80)}`);
    log(`Cleaning ${lessonId}...`);
    log(`${'='.repeat(80)}`);

    // Find the lesson file
    const fileName = execSync(`ls ${lessonId}-*.md`, {
      encoding: 'utf-8',
      cwd: lessonsPath
    }).trim().split('\n')[0];

    const sourcePath = resolve(lessonsPath, fileName);
    const backupPath = resolve(backupDir, `${fileName}.backup`);

    log(`  Source: ${sourcePath}`);
    log(`  Backup: ${backupPath}`);

    // Create backup
    copyFileSync(sourcePath, backupPath);
    log(`  ✅ Backup created`);

    // Read file
    const content = readFileSync(sourcePath, 'utf-8');
    const lines = content.split('\n');
    const originalLines = lines.length;

    log(`  Original: ${originalLines} lines`);
    log(`  Duplicates to remove: ${duplicates.length}`);

    // Sort duplicates by line number (descending) to remove from bottom up
    // This ensures line numbers remain valid as we remove lines
    const sortedDuplicates = [...duplicates].sort((a, b) => b.removeLine - a.removeLine);

    const removedHeaders: string[] = [];
    let totalLinesRemoved = 0;

    // Process each duplicate
    sortedDuplicates.forEach(dup => {
      const lineIndex = dup.removeLine - 1; // Convert to 0-based index

      if (lineIndex < 0 || lineIndex >= lines.length) {
        log(`  ⚠️  Warning: Line ${dup.removeLine} out of bounds, skipping`);
        return;
      }

      // Find the extent of this section (until next heading or end of file)
      let endIndex = lineIndex + 1;
      for (let i = lineIndex + 1; i < lines.length; i++) {
        if (lines[i].match(/^#{2,3}\s+/)) {
          endIndex = i;
          break;
        }
        endIndex = i + 1;
      }

      const linesRemoved = endIndex - lineIndex;

      log(`  Removing line ${dup.removeLine}: "${dup.heading.substring(0, 60)}..."`);
      log(`    Range: lines ${dup.removeLine} to ${dup.removeLine + linesRemoved - 1} (${linesRemoved} lines)`);

      // Remove the section
      lines.splice(lineIndex, linesRemoved);

      removedHeaders.push(`${dup.heading} (line ${dup.removeLine}, ${linesRemoved} lines removed)`);
      totalLinesRemoved += linesRemoved;
    });

    const cleanedLines = lines.length;
    log(`  Cleaned: ${cleanedLines} lines`);
    log(`  Removed: ${totalLinesRemoved} lines (${originalLines - cleanedLines} net change)`);

    // Verify we didn't break markdown
    const cleanedContent = lines.join('\n');
    const codeBlockCount = (cleanedContent.match(/```/g) || []).length;

    if (codeBlockCount % 2 !== 0) {
      log(`  ⚠️  WARNING: Odd number of code blocks (${codeBlockCount}) - may have unclosed blocks`);
    }

    // Write cleaned file
    writeFileSync(sourcePath, cleanedContent);
    log(`  ✅ File cleaned and saved`);

    // Verify cleaned file
    const verifyContent = readFileSync(sourcePath, 'utf-8');
    const verifyLines = verifyContent.split('\n').length;

    if (verifyLines !== cleanedLines) {
      throw new Error(`Verification failed: expected ${cleanedLines} lines, got ${verifyLines}`);
    }

    log(`  ✅ Verification passed`);

    return {
      lessonNumber,
      lessonId,
      fileName,
      originalLines,
      cleanedLines,
      removedLines: totalLinesRemoved,
      removedHeaders,
      status: 'SUCCESS'
    };

  } catch (err) {
    log(`  ❌ Error: ${err}`);
    return {
      lessonNumber,
      lessonId,
      fileName: 'UNKNOWN',
      originalLines: 0,
      cleanedLines: 0,
      removedLines: 0,
      removedHeaders: [],
      status: 'FAILED',
      error: String(err)
    };
  }
}

async function cleanAllLessons() {
  log('='.repeat(80));
  log('CLEANING DUPLICATE HEADERS - 4 Lessons');
  log('='.repeat(80));
  log(`Started: ${new Date().toISOString()}\n`);

  for (const { lessonNumber, duplicates } of lessonsToClean) {
    const result = cleanLesson(lessonNumber, duplicates);
    stats.results.push(result);

    if (result.status === 'SUCCESS') {
      stats.cleaned++;
      stats.totalHeadersRemoved += result.removedHeaders.length;
      log(`✅ ${result.lessonId} cleaned successfully\n`);
    } else {
      stats.failed++;
      log(`❌ ${result.lessonId} cleaning FAILED\n`);
    }
  }

  generateCleaningReport();
}

function generateCleaningReport() {
  log('\n' + '='.repeat(80));
  log('CLEANING COMPLETE');
  log('='.repeat(80));
  log(`Cleaned: ${stats.cleaned}`);
  log(`Failed: ${stats.failed}`);
  log(`Total headers removed: ${stats.totalHeadersRemoved}`);

  // Generate markdown report
  const report: string[] = [];
  report.push('# Cleaning Log\n');
  report.push(`**Generated:** ${new Date().toISOString()}\n`);
  report.push(`**Cleaned:** ${stats.cleaned} lessons`);
  report.push(`**Failed:** ${stats.failed} lessons`);
  report.push(`**Total Headers Removed:** ${stats.totalHeadersRemoved}\n`);

  report.push('---\n');
  report.push('## Summary\n');
  report.push('| Lesson | Status | Original Lines | Cleaned Lines | Removed | Headers Removed |');
  report.push('|--------|--------|----------------|---------------|---------|-----------------|');

  stats.results.forEach(r => {
    const statusIcon = r.status === 'SUCCESS' ? '✅' : '❌';
    report.push(`| ${r.lessonId} | ${statusIcon} ${r.status} | ${r.originalLines} | ${r.cleanedLines} | ${r.removedLines} | ${r.removedHeaders.length} |`);
  });

  report.push('\n---\n');
  report.push('## Detailed Changes\n');

  stats.results.forEach(r => {
    if (r.status === 'SUCCESS') {
      report.push(`\n### ${r.lessonId} - ${r.fileName}\n`);
      report.push(`- **Original:** ${r.originalLines} lines`);
      report.push(`- **Cleaned:** ${r.cleanedLines} lines`);
      report.push(`- **Removed:** ${r.removedLines} lines\n`);
      report.push(`**Removed Headers:**\n`);
      r.removedHeaders.forEach(h => {
        report.push(`- ${h}`);
      });
      report.push('');
    }
  });

  if (stats.failed > 0) {
    report.push('\n---\n');
    report.push('## Failures\n');

    stats.results.filter(r => r.status === 'FAILED').forEach(r => {
      report.push(`\n### ${r.lessonId}\n`);
      report.push(`**Error:** ${r.error}\n`);
    });
  }

  report.push('\n---\n');
  report.push('## Backups\n');
  report.push(`All original files backed up to: \`${backupDir}\`\n`);
  report.push(`Backup files:\n`);
  stats.results.forEach(r => {
    if (r.status === 'SUCCESS') {
      report.push(`- ${r.fileName}.backup`);
    }
  });

  report.push('\n---\n');
  report.push('## Next Steps\n');

  if (stats.failed > 0) {
    report.push(`⚠️  **${stats.failed} lessons failed** - Review errors above and clean manually\n`);
  }

  if (stats.cleaned > 0) {
    report.push(`✅ **${stats.cleaned} lessons cleaned** - Ready for re-testing\n`);
    report.push(`Next: Re-run adaptive parser on cleaned lessons to verify quality improvements\n`);
  }

  writeFileSync(cleaningLogFile, report.join('\n'));
  log(`\n📊 Cleaning report: ${cleaningLogFile}`);
  log(`📋 Process log: ${logFile}\n`);

  // Console summary
  console.log('\n' + '='.repeat(80));
  console.log('CLEANING SUMMARY:');
  console.log('='.repeat(80));
  console.log(`✅ Cleaned: ${stats.cleaned} lessons`);
  console.log(`❌ Failed: ${stats.failed} lessons`);
  console.log(`📝 Total headers removed: ${stats.totalHeadersRemoved}`);
  console.log(`💾 Backups: ${backupDir}`);
  console.log('');

  if (stats.cleaned > 0) {
    console.log('Cleaned lessons:');
    stats.results.filter(r => r.status === 'SUCCESS').forEach(r => {
      console.log(`  - ${r.lessonId}: Removed ${r.removedHeaders.length} duplicate headers (${r.removedLines} lines)`);
    });
    console.log('');
  }
}

// Execute
cleanAllLessons()
  .then(() => process.exit(0))
  .catch(err => {
    log(`FATAL: ${err}`);
    process.exit(1);
  });
