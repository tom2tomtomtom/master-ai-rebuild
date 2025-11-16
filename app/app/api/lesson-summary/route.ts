import { createClient } from '@/lib/supabase/server'
import { Anthropic } from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface RequestBody {
  lessonId: string
  lessonContent: string
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
    const { lessonId, lessonContent } = body

    if (!lessonContent || lessonContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Lesson content is required' },
        { status: 400 }
      )
    }

    // Call Claude to generate a TL;DR summary
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: `You are an expert educator and summarizer. Your task is to create a concise, clear TL;DR (Too Long; Didn't Read) summary of lesson content.

Requirements:
- Create a brief summary that captures the ESSENTIAL POINTS only
- Use markdown bullet points for clarity and easy scanning
- Keep language simple and direct
- Focus on what students need to know and do
- Length: 5-10 bullet points maximum
- Format each point as a clear, actionable statement
- Use proper markdown formatting for better readability

Output format (using markdown):
## TL;DR - Key Takeaways

- Essential point 1
- Essential point 2
- Essential point 3
- Essential point 4
- Essential point 5

(Include a brief one-sentence summary at the end if helpful)`,
      messages: [
        {
          role: 'user',
          content: `Please create a TL;DR summary of this lesson content:\n\n${lessonContent}`
        }
      ]
    })

    const summaryText = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Unable to generate summary'

    return NextResponse.json({
      success: true,
      summary: summaryText
    })
  } catch (error) {
    console.error('Error generating lesson summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate lesson summary' },
      { status: 500 }
    )
  }
}
