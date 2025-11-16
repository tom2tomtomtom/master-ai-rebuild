import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StageContent } from '@/components/lesson/StageContent'

interface StagePageProps {
  params: Promise<{ id: string; number: string }>
}

export default async function StagePage({ params }: StagePageProps) {
  const { id, number } = await params
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/')
  }
  
  const stageNumber = parseInt(number)
  
  if (isNaN(stageNumber) || stageNumber < 1) {
    redirect(`/lesson/${id}`)
  }
  
  // Get lesson
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title, lesson_number, description')
    .eq('id', id)
    .single()
  
  if (lessonError || !lesson) {
    console.error('Lesson not found:', lessonError)
    redirect('/chatbot')
  }
  
  // Get this stage
  const { data: stage, error: stageError } = await supabase
    .from('lesson_stages')
    .select('*')
    .eq('lesson_id', id)
    .eq('stage_number', stageNumber)
    .single()
  
  if (stageError || !stage) {
    console.error('Stage not found:', stageError)
    redirect(`/lesson/${id}`)
  }
  
  // Get all stages (for navigation)
  const { data: allStages } = await supabase
    .from('lesson_stages')
    .select('id, stage_number')
    .eq('lesson_id', id)
    .eq('is_published', true)
    .order('display_order')
  
  // Get user progress for this stage
  const { data: progress } = await supabase
    .from('user_stage_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('stage_id', stage.id)
    .single()
  
  const totalStages = allStages?.length || 0
  const isLastStage = stageNumber === totalStages
  
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950">
      <StageContent
        stage={stage}
        lesson={lesson}
        progress={progress}
        totalStages={totalStages}
        isLastStage={isLastStage}
        userId={user.id}
      />
    </div>
  )
}
