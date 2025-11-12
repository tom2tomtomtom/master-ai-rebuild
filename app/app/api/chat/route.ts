import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Fetch all lessons from the database
    const supabase = await createClient();
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('lesson_number, title, content, category, difficulty, duration_minutes')
      .order('lesson_number');

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return NextResponse.json(
        { error: 'Failed to fetch lessons' },
        { status: 500 }
      );
    }

    // Create a comprehensive lesson catalog for the system prompt
    const lessonCatalog = lessons
      ?.map((lesson) => {
        // Extract first few paragraphs of content for context
        const contentPreview = lesson.content
          .split('\n\n')
          .slice(0, 3)
          .join('\n\n')
          .substring(0, 500);

        return `Lesson ${lesson.lesson_number}: ${lesson.title}
Category: ${lesson.category || 'General'}
Difficulty: ${lesson.difficulty || 'Intermediate'}
Duration: ${lesson.duration_minutes || 45} minutes
Preview: ${contentPreview}...
---`;
      })
      .join('\n\n');

    // System prompt for the AI assistant
    const systemPrompt = `You are an intelligent learning assistant for the Master AI Learning Platform. Your role is to help users discover the most relevant lessons based on their interests, goals, and learning objectives.

You have access to a comprehensive catalog of ${lessons?.length || 0} AI and technology lessons covering topics like:
- ChatGPT, Claude, Gemini, and other AI platforms
- Prompt engineering and AI communication
- API integrations and development
- Image, video, and audio AI tools
- Business applications (sales, marketing, finance, operations)
- Creative and design applications
- Software development and technical skills
- Leadership, team management, and AI governance

LESSON CATALOG:
${lessonCatalog}

When a user tells you what they want to learn or what they're interested in:
1. Carefully analyze their request and identify key topics, skills, or goals
2. Search through the lesson catalog to find the most relevant lessons
3. Recommend 3-7 of the most relevant lessons, prioritizing based on:
   - Direct relevance to their stated interest
   - Appropriate difficulty level
   - Logical learning progression
   - Practical application value

4. Format your response as follows:
   - Brief friendly acknowledgment of their interest
   - A short explanation of why these lessons are relevant
   - A list of recommended lessons with:
     * Lesson number and title
     * 1-2 sentences explaining why it's relevant
     * Difficulty level and duration

5. Be conversational, helpful, and encouraging
6. If their interest spans multiple areas, organize recommendations by category
7. Suggest a learning path or sequence if multiple lessons are related

IMPORTANT: Always include specific lesson numbers in your recommendations so users can easily find and access them.`;

    // Build conversation history for context
    const messages: Anthropic.MessageParam[] = [];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: { role: string; content: string }) => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: systemPrompt,
      messages: messages,
    });

    // Extract the text response
    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Extract lesson recommendations from the response
    const lessonNumberMatches = assistantMessage.match(/Lesson (\d+):/g) || [];
    const recommendedLessonNumbers = lessonNumberMatches
      .map((match) => parseInt(match.match(/\d+/)?.[0] || '0'))
      .filter((num) => num > 0);

    // Get full details of recommended lessons
    const recommendedLessons = lessons?.filter((lesson) =>
      recommendedLessonNumbers.includes(lesson.lesson_number)
    );

    return NextResponse.json({
      message: assistantMessage,
      recommendedLessons: recommendedLessons || [],
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
