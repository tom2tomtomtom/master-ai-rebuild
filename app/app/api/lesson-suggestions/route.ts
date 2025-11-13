import { createClient } from '@/lib/supabase/server'
import { Anthropic } from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface RequestBody {
  lessonId: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: RequestBody = await request.json()
    const { lessonId } = body

    // Fetch lesson content
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single()

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      )
    }

    // Call Claude to generate suggested questions
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      system: `You are an expert educator. Based on the lesson content provided, generate exactly 3 clarifying questions that a student might ask about this lesson.

Requirements:
- Each question should be distinct and cover different aspects of the lesson
- Questions should be practical and focused on understanding
- Questions should be phrased naturally as a student would ask them
- Do NOT include introductions or numbering
- Separate each question with a newline

Output format:
question 1?
question 2?
question 3?`,
      messages: [
        {
          role: 'user',
          content: `Lesson: "${lesson.title}"\n\nContent:\n${lesson.content.substring(0, 2000)}`
        }
      ]
    })

    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    const suggestedQuestions = responseText
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0 && q.endsWith('?'))
      .slice(0, 3)

    return NextResponse.json({
      success: true,
      suggestedQuestions
    })
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggested questions' },
      { status: 500 }
    )
  }
}
