import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Brain, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import LessonContent from '@/components/lesson-content'
import CompleteButton from '@/components/complete-button'

interface LessonPageProps {
  params: Promise<{ id: string }>
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/')
  }

  // Get lesson data
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .single()

  if (lessonError || !lesson) {
    redirect('/dashboard')
  }

  // Get user progress for this lesson
  const { data: progress } = await supabase
    .from('user_progress')
    .select('completed, completed_at')
    .eq('user_id', user.id)
    .eq('lesson_id', id)
    .single()

  const isCompleted = progress?.completed || false

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Link>
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-blue-600" />
                <span className="font-semibold text-gray-900">Master AI</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isCompleted && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                  ✓ Completed
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Lesson Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Lesson Header */}
          <div className="mb-8">
            <div className="text-sm text-gray-500 mb-2">
              Lesson {lesson.lesson_number}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {lesson.title}
            </h1>
            {lesson.description && (
              <p className="text-xl text-gray-600">{lesson.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <span>⏱ {lesson.duration_minutes} minutes</span>
            </div>
          </div>

          {/* Markdown Content */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 mb-8 shadow-sm">
            <LessonContent content={lesson.content} />
          </div>

          {/* Complete Button */}
          <div className="flex justify-center mb-8">
            <CompleteButton
              lessonId={id}
              userId={user.id}
              initialCompleted={isCompleted}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
