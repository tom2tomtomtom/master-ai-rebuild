import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import CompleteButton from '@/components/complete-button'
import { DashboardHeader } from '@/app/components/dashboard-header'
import { AIPathNavigator } from '@/app/components/ai-path-navigator'
import { LessonWithChat } from '@/components/lesson-with-chat'
import { StageList } from '@/components/lesson/StageList'

interface LessonPageProps {
  params: Promise<{ id: string }>
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { id } = await params
  const supabase = await createClient()

  console.log('\n========================================')
  console.log('🚀 LESSON PAGE RENDER START')
  console.log('========================================')

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  console.log('🔍 USER:', user?.id?.substring(0, 20) + '...')
  console.log('🔍 USER ERROR:', userError)

  if (userError || !user) {
    console.log('❌ NO USER - REDIRECTING TO LOGIN')
    redirect('/')
  }

  console.log('🔍 URL PARAMS ID:', id)

  // Get lesson data
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .single()

  console.log('🔍 LESSON QUERY RESULT:')
  console.log('   - lesson.id:', lesson?.id)
  console.log('   - lesson.title:', lesson?.title?.substring(0, 50))
  console.log('   - lessonError:', lessonError)

  if (lessonError || !lesson) {
    console.log('❌ LESSON NOT FOUND - REDIRECTING')
    redirect('/dashboard')
  }

  // Check if this lesson has stages
  console.log('\n🔍 QUERYING STAGES FOR lesson_id:', lesson.id)
  
  const { data: stages, error: stagesError } = await supabase
    .from('lesson_stages')
    .select('id, stage_number, title, slug, content_type, estimated_minutes, difficulty, display_order, is_required, is_published')
    .eq('lesson_id', lesson.id)
    .eq('is_published', true)
    .order('display_order')

  console.log('🔍 STAGES QUERY RESULT:')
  console.log('   - stagesError:', stagesError)
  if (stagesError) {
    console.log('   - ERROR MESSAGE:', stagesError.message)
    console.log('   - ERROR CODE:', stagesError.code)
    console.log('   - ERROR DETAILS:', stagesError.details)
    console.log('   - ERROR HINT:', stagesError.hint)
  }
  console.log('   - stages.length:', stages?.length || 0)
  if (stages && stages.length > 0) {
    console.log('   - First stage:', stages[0])
    console.log('   - Stage IDs:', stages.map(s => s.id))
    console.log('   - Stage numbers:', stages.map(s => s.stage_number))
  }

  // Get user stage progress if stages exist
  let stageProgress: any[] = []
  if (stages && stages.length > 0) {
    const { data: progressData } = await supabase
      .from('user_stage_progress')
      .select('stage_id, completed, completed_at')
      .eq('user_id', user.id)
      .in('stage_id', stages.map(s => s.id))

    stageProgress = progressData || []
  }

  // Get user progress for this lesson
  const { data: progress } = await supabase
    .from('user_progress')
    .select('completed, completed_at')
    .eq('user_id', user.id)
    .eq('lesson_id', id)
    .single()

  const isCompleted = progress?.completed || false
  const hasStages = stages && stages.length > 0

  console.log('\n🎯 RENDERING DECISION:')
  console.log('   - hasStages:', hasStages)
  console.log('   - stages.length:', stages?.length || 0)
  
  if (hasStages) {
    console.log('✅ RENDERING STAGED VIEW')
    console.log('   - StageList will render with', stages.length, 'stages')
    console.log('   - User progress records:', stageProgress.length)
  } else {
    console.log('⚠️ RENDERING TRADITIONAL VIEW (no stages found)')
    console.log('   - Will show monolithic content')
  }
  console.log('========================================\n')

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
              {hasStages && (
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
                  {stages.length} Stages
                </span>
              )}
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

          {/* Conditional Rendering: Stages or Traditional Content */}
          {hasStages ? (
            <StageList
              lessonId={id}
              stages={stages}
              userProgress={stageProgress}
            />
          ) : (
            <>
              {/* Content with Chat Sidebar */}
              <LessonWithChat content={lesson.content} lessonId={id} />

              {/* Complete Button */}
              <div className="flex justify-center mb-12">
                <CompleteButton
                  lessonId={id}
                  userId={user.id}
                  initialCompleted={isCompleted}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
