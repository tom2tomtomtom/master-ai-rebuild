import { createClient } from '@/lib/supabase/server'
import { Anthropic } from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  message: string
  lessonId: string
  selectedText?: string
  conversationHistory: ChatMessage[]
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
    const { message, lessonId, selectedText, conversationHistory } = body

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

    // Build the system prompt
    const systemPrompt = `You are a helpful tutor assistant for an AI learning platform. You're helping a student understand the content of a lesson.

Current Lesson: "${lesson.title}"

Lesson Content:
${lesson.content}

${selectedText ? `\nThe student has highlighted this specific part of the lesson:\n"${selectedText}"\n` : ''}

Guidelines:
- Provide clear, concise explanations tailored to the student's question
- Use examples from the lesson content when relevant
- If the question is about a specific concept in the lesson, reference that concept
- Break down complex ideas into simpler terms
- Encourage further learning and critical thinking
- Keep responses focused and helpful
- If the question is outside the scope of this lesson, gently redirect to the lesson content

Remember: You're a tutor, not just an AI. Be supportive and educational.`

    // Prepare messages for Claude
    const messages: ChatMessage[] = [
      ...conversationHistory,
      { role: 'user', content: message }
    ]

    // Call Claude API
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Unable to process response'

    return NextResponse.json({
      success: true,
      message: assistantMessage,
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: assistantMessage }
      ]
    })
  } catch (error) {
    console.error('Error in lesson chat:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
