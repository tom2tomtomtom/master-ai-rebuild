import { readFileSync } from 'fs';
import { join } from 'path';

interface Stage {
  lesson_id: string;
  stage_number: number;
  title: string;
  slug: string;
  content: string;
  content_type: 'reading' | 'exercise' | 'practice' | 'quiz' | 'video' | 'reflection';
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
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single
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
    
    // Check if we've found the start pattern
    if (!foundStart && line.includes(startPattern)) {
      inSection = true;
      foundStart = true;
      sectionTitle = line.replace(/^#+\s*/, '').trim(); // Extract title without markdown #
      sectionLines.push(line);
      continue;
    }

    // If we're in the section, collect lines
    if (inSection) {
      // Check if we've hit the end pattern (if provided)
      if (endPattern && line.includes(endPattern)) {
        break;
      }
      
      // Check if we've hit a new major section (## or ### at the start)
      // but allow ### subheadings within the section
      if (line.match(/^##\s+/) && !line.includes(startPattern)) {
        // Only break if this is a different major section
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

async function parseLessonToStages() {
  console.log('📖 Starting lesson parsing...\n');

  const lessonPath = '/Users/tommyhyde/Code_Projects/master-ai-rebuild/lessons/lesson-01-chatgpt-communication-mastery.md';
  const lessonId = 'lesson-01';

  console.log(`📂 Reading lesson from: ${lessonPath}\n`);

  const content = readFileSync(lessonPath, 'utf-8');
  const stages: Stage[] = [];

  // Define stage patterns as requested
  const stageDefinitions = [
    {
      stage_number: 1,
      content_type: 'practice' as const,
      startPattern: '## ⚡ Your First',
      estimated_minutes: 5,
      difficulty: 'beginner'
    },
    {
      stage_number: 2,
      content_type: 'reading' as const,
      startPattern: '## 💰 The Business Reality',
      estimated_minutes: 3,
      difficulty: 'beginner'
    },
    {
      stage_number: 3,
      content_type: 'exercise' as const,
      startPattern: '### Foundation Level',
      estimated_minutes: 15,
      difficulty: 'beginner'
    },
    {
      stage_number: 4,
      content_type: 'exercise' as const,
      startPattern: '### Intermediate Level',
      estimated_minutes: 20,
      difficulty: 'intermediate'
    },
    {
      stage_number: 5,
      content_type: 'exercise' as const,
      startPattern: '### Advanced Level',
      estimated_minutes: 25,
      difficulty: 'advanced'
    },
    {
      stage_number: 6,
      content_type: 'practice' as const,
      startPattern: '## 🚀 Production Templates',
      estimated_minutes: 20,
      difficulty: 'intermediate'
    }
  ];

  // Extract each stage
  for (const stageDef of stageDefinitions) {
    console.log(`🔍 Searching for: ${stageDef.startPattern}...`);
    
    const section = extractSection(content, stageDef.startPattern);
    
    if (section) {
      const stage: Stage = {
        lesson_id: lessonId,
        stage_number: stageDef.stage_number,
        title: section.title,
        slug: createSlug(section.title),
        content: section.content,
        content_type: stageDef.content_type,
        estimated_minutes: stageDef.estimated_minutes,
        difficulty: stageDef.difficulty,
        is_required: true,
        display_order: stageDef.stage_number,
        is_published: true
      };

      stages.push(stage);
      
      console.log(`✅ Found: "${section.title}"`);
      console.log(`   - Content length: ${section.content.length} characters`);
      console.log(`   - Type: ${stageDef.content_type}`);
      console.log(`   - Estimated time: ${stageDef.estimated_minutes} minutes`);
      console.log(`   - Difficulty: ${stageDef.difficulty}\n`);
    } else {
      console.log(`❌ Not found: ${stageDef.startPattern}\n`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`📊 PARSING SUMMARY`);
  console.log('='.repeat(80));
  console.log(`Lesson ID: ${lessonId}`);
  console.log(`Total Stages Found: ${stages.length}/6`);
  console.log(`Total Estimated Time: ${stages.reduce((sum, s) => sum + s.estimated_minutes, 0)} minutes\n`);

  // Output as formatted JSON
  console.log('📋 PARSED STAGES (JSON):\n');
  console.log(JSON.stringify(stages, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('✨ STAGE PREVIEW');
  console.log('='.repeat(80) + '\n');

  stages.forEach((stage, index) => {
    console.log(`Stage ${stage.stage_number}: ${stage.title}`);
    console.log(`  Type: ${stage.content_type}`);
    console.log(`  Slug: ${stage.slug}`);
    console.log(`  Time: ${stage.estimated_minutes} min`);
    console.log(`  Difficulty: ${stage.difficulty}`);
    console.log(`  Content preview: ${stage.content.substring(0, 150).replace(/\n/g, ' ')}...`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('⏸️  AWAITING YOUR APPROVAL');
  console.log('='.repeat(80));
  console.log('\nReview the parsed stages above.');
  console.log('If they look correct, I can proceed to insert them into the database.\n');

  return stages;
}

// Run the parser
parseLessonToStages().catch((error) => {
  console.error('❌ Parsing failed:', error);
  process.exit(1);
});

