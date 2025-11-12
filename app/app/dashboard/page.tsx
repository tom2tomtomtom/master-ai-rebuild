import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLessonsForPath, getPathInfo, type PathId } from '@/lib/learning-paths'
import { BookOpen, CheckCircle, Circle, Briefcase, Palette, Code, Users, Layers } from 'lucide-react'
import Link from 'next/link'
import { DashboardHeader } from '@/app/components/dashboard-header'

const iconMap = {
  briefcase: Briefcase,
  palette: Palette,
  code: Code,
  users: Users,
  layers: Layers,
}

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

  const PathIcon = iconMap[pathInfo.icon as keyof typeof iconMap] || Briefcase

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950">
      {/* Header */}
      <DashboardHeader />

      {/* Dashboard Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 tracking-tight">
              Your Dashboard
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <PathIcon className="w-5.5 h-5.5 text-slate-700 dark:text-slate-300" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{pathInfo.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{pathInfo.description}</p>
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 p-7 mb-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Progress</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {completionPercentage}
                </span>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">%</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-3">
              <div
                className="bg-slate-900 dark:bg-slate-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {completedCount} of {totalLessons} lessons completed
            </p>
          </div>

          {/* Lessons List */}
          <div className="space-y-2.5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Your Lessons
            </h3>

            {lessons && lessons.length > 0 ? (
              lessons.map((lesson) => {
                const isCompleted = progressMap.get(lesson.id) || false
                return (
                  <Link
                    key={lesson.id}
                    href={`/lesson/${lesson.id}`}
                    className="block bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full border-2 border-gray-300 dark:border-gray-700 flex items-center justify-center">
                            <Circle className="w-5 h-5 text-gray-300 dark:text-gray-700" />
                          </div>
                        )}
                      </div>

                      {/* Lesson Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Lesson {lesson.lesson_number}
                          </span>
                          {isCompleted && (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded">
                              Complete
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5 group-hover:text-slate-900 dark:group-hover:text-slate-200">
                          {lesson.title}
                        </h4>
                        {lesson.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 leading-relaxed">
                            {lesson.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{lesson.duration_minutes} min</span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg
                          className="w-5 h-5 text-gray-400 dark:text-gray-500"
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
              <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <p>No lessons found for your path.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
