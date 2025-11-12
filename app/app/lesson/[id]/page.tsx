import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import LessonContent from '@/components/lesson-content'
import CompleteButton from '@/components/complete-button'
import { DashboardHeader } from '@/app/components/dashboard-header'
import { AIPathNavigator } from '@/app/components/ai-path-navigator'

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
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950">
      {/* Header */}
      <DashboardHeader />

      {/* Lesson Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back to AI Assistant Link */}
          <Link
            href="/chatbot"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to AI Assistant
          </Link>

          {/* AI Learning Path Navigator */}
          <AIPathNavigator currentLessonId={id} />

          {/* Lesson Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                Lesson {lesson.lesson_number}
              </span>
              {isCompleted && (
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                  Completed
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 tracking-tight leading-tight">
              {lesson.title}
            </h1>
            {lesson.description && (
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">{lesson.description}</p>
            )}
            <div className="flex items-center gap-3 mt-5 text-sm text-gray-500 dark:text-gray-400">
              <span>{lesson.duration_minutes} minutes</span>
            </div>
          </div>

          {/* Markdown Content */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 p-10 md:p-12 mb-8">
            <LessonContent content={lesson.content} />
          </div>

          {/* Complete Button */}
          <div className="flex justify-center mb-12">
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
