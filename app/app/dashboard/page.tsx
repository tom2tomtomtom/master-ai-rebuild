import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLessonsForPath, getPathInfo, type PathId } from '@/lib/learning-paths'
import { Brain, BookOpen, CheckCircle, Circle, LogOut } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/')
  }

  // Get user data including selected path
  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('selected_path')
    .eq('id', user.id)
    .single()

  if (userDataError || !userData?.selected_path) {
    redirect('/onboarding')
  }

  const selectedPath = userData.selected_path as PathId
  const pathInfo = getPathInfo(selectedPath)
  const lessonIds = getLessonsForPath(selectedPath)

  // Get lessons data
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('*')
    .in('id', lessonIds)
    .order('lesson_number', { ascending: true })

  if (lessonsError) {
    console.error('Error fetching lessons:', lessonsError)
  }

  // Get user progress
  const { data: progress, error: progressError } = await supabase
    .from('user_progress')
    .select('lesson_id, completed')
    .eq('user_id', user.id)
    .in('lesson_id', lessonIds)

  if (progressError) {
    console.error('Error fetching progress:', progressError)
  }

  // Create a map of lesson progress
  const progressMap = new Map(
    progress?.map(p => [p.lesson_id, p.completed]) || []
  )

  // Calculate completion stats
  const totalLessons = lessons?.length || 0
  const completedCount = progress?.filter(p => p.completed).length || 0
  const completionPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Master AI</h1>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back!
            </h2>
            <div className="flex items-center gap-3 text-gray-600">
              <span className="text-2xl">{pathInfo.icon}</span>
              <div>
                <p className="font-medium text-gray-900">{pathInfo.name}</p>
                <p className="text-sm">{pathInfo.description}</p>
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Your Progress</h3>
              <span className="text-2xl font-bold text-blue-600">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              {completedCount} of {totalLessons} lessons completed
            </p>
          </div>

          {/* Lessons List */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Your Lessons
            </h3>

            {lessons && lessons.length > 0 ? (
              lessons.map((lesson) => {
                const isCompleted = progressMap.get(lesson.id) || false
                return (
                  <Link
                    key={lesson.id}
                    href={`/lesson/${lesson.id}`}
                    className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        ) : (
                          <Circle className="w-8 h-8 text-gray-300" />
                        )}
                      </div>

                      {/* Lesson Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-500">
                            Lesson {lesson.lesson_number}
                          </span>
                          {isCompleted && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">
                          {lesson.title}
                        </h4>
                        {lesson.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {lesson.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{lesson.duration_minutes} minutes</span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No lessons found for your path.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
