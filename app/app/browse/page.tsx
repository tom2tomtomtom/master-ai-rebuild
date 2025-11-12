import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen, Clock, ArrowLeft, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { DashboardHeader } from '@/app/components/dashboard-header'

export default async function BrowsePage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/')
  }

  // Get all lessons
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, lesson_number, title, description, duration_minutes')
    .order('lesson_number')

  if (lessonsError) {
    console.error('Error fetching lessons:', lessonsError)
  }

  // Get user progress
  const { data: progress } = await supabase
    .from('user_progress')
    .select('lesson_id, completed')
    .eq('user_id', user.id)

  const progressMap = new Map(
    progress?.map((p) => [p.lesson_id, p.completed]) || []
  )

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950">
      {/* Header */}
      <DashboardHeader />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Back Link */}
          <Link
            href="/chatbot"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to AI Assistant
          </Link>

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                  Browse Curriculum
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Explore all {lessons?.length || 0} lessons in the Master AI course
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Tip:</strong> Not sure where to start? Try the{' '}
                  <Link
                    href="/chatbot"
                    className="underline hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    AI Assistant
                  </Link>{' '}
                  for personalized lesson recommendations based on your learning goals.
                </p>
              </div>
            </div>
          </div>

          {/* Lessons Grid */}
          <div className="grid gap-4">
            {lessons?.map((lesson) => {
              const isCompleted = progressMap.get(lesson.id) || false

              return (
                <Link
                  key={lesson.id}
                  href={`/lesson/${lesson.id}`}
                  className="block bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-600 dark:hover:border-blue-500 hover:shadow-lg transition-all group p-6"
                >
                  <div className="flex items-start gap-4">
                    {/* Lesson Number */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {lesson.lesson_number}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {lesson.title}
                        </h3>
                        {isCompleted && (
                          <span className="flex-shrink-0 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                            Completed
                          </span>
                        )}
                      </div>

                      {lesson.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                          {lesson.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{lesson.duration_minutes} minutes</span>
                        </div>
                        <span className="text-gray-300 dark:text-gray-700">•</span>
                        <span className="text-blue-600 dark:text-blue-400 group-hover:underline">
                          Start lesson →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

