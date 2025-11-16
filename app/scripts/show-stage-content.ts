import { readFileSync } from 'fs';
import { join } from 'path';

interface Stage {
  lesson_id: string;
  stage_number: number;
  title: string;
  slug: string;
  content: string;
  content_type: string;
  estimated_minutes: number;
  difficulty: string;
  is_required: boolean;
  display_order: number;
  is_published: boolean;
}

// Utility function to create slug from title
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Parse markdown content into sections based on headers
function extractSection(content: string, startPattern: string, endPattern?: string): { content: string; title: string } | null {
  const lines = content.split('\n');
  let inSection = false;
  let sectionLines: string[] = [];
  let sectionTitle = '';
  let foundStart = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!foundStart && line.includes(startPattern)) {
      inSection = true;
      foundStart = true;
      sectionTitle = line.replace(/^#+\s*/, '').trim();
      sectionLines.push(line);
      continue;
    }

    if (inSection) {
      if (endPattern && line.includes(endPattern)) {
        break;
      }
      
      if (line.match(/^##\s+/) && !line.includes(startPattern)) {
        if (endPattern === undefined) {
          break;
        }
      }
      
      sectionLines.push(line);
    }
  }

  if (sectionLines.length === 0) {
    return null;
  }

  return {
    title: sectionTitle,
    content: sectionLines.join('\n').trim()
  };
}

async function showStageContent() {
  const lessonPath = '/Users/tommyhyde/Code_Projects/master-ai-rebuild/lessons/lesson-01-chatgpt-communication-mastery.md';
  const content = readFileSync(lessonPath, 'utf-8');

  console.log('=' .repeat(100));
  console.log('STAGE 3 CONTENT (Foundation Level)');
  console.log('='.repeat(100));
  console.log('Character count: 296');
  console.log('─'.repeat(100));
  
  const stage3 = extractSection(content, '### Foundation Level');
  if (stage3) {
    console.log(stage3.content);
  } else {
    console.log('NOT FOUND');
  }

  console.log('\n\n');
  console.log('='.repeat(100));
  console.log('STAGE 4 CONTENT (Intermediate Level)');
  console.log('='.repeat(100));
  console.log('Character count: 9,719');
  console.log('─'.repeat(100));
  
  const stage4 = extractSection(content, '### Intermediate Level');
  if (stage4) {
    // Show first 2000 characters and last 500 characters
    const fullContent = stage4.content;
    console.log('\n📌 FIRST 2000 CHARACTERS:\n');
    console.log(fullContent.substring(0, 2000));
    console.log('\n...\n[CONTENT TRUNCATED - showing first 2000 and last 500 chars]\n...\n');
    console.log('\n📌 LAST 500 CHARACTERS:\n');
    console.log(fullContent.substring(fullContent.length - 500));
  } else {
    console.log('NOT FOUND');
  }

  console.log('\n\n');
  console.log('='.repeat(100));
  console.log('ANALYSIS');
  console.log('='.repeat(100));
  
  // Let's also check what comes immediately after "Foundation Level" in the original file
  const foundationIndex = content.indexOf('### Foundation Level');
  const intermediateIndex = content.indexOf('### Intermediate Level');
  
  if (foundationIndex !== -1 && intermediateIndex !== -1) {
    const betweenContent = content.substring(foundationIndex, intermediateIndex);
    console.log(`\n📊 Content between "### Foundation Level" and "### Intermediate Level":`);
    console.log(`   Total characters: ${betweenContent.length}`);
    console.log(`\n   Content preview (first 1000 chars):\n`);
    console.log(betweenContent.substring(0, 1000));
  }
}

showStageContent().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

