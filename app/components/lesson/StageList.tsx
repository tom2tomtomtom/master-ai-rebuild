'use client'

import { useRouter } from 'next/navigation'
import { Clock, BookOpen, Dumbbell, CheckCircle2, Lock, Play } from 'lucide-react'

interface Stage {
  id: string
  stage_number: number
  title: string
  content_type: string
  estimated_minutes: number
  difficulty: string
  display_order: number
}

interface StageProgress {
  stage_id: string
  completed: boolean
}

interface StageListProps {
  stages: Stage[]
  lessonId: string
  userProgress?: StageProgress[]
}

export function StageList({ stages, lessonId, userProgress = [] }: StageListProps) {
  const router = useRouter()
  
  // Create progress map
  const progressMap = new Map(
    userProgress.map(p => [p.stage_id, p.completed])
  )
  
  // Calculate stats
  const completedCount = userProgress.filter(p => p.completed).length
  const totalStages = stages.length
  const progressPercent = totalStages > 0 ? (completedCount / totalStages) * 100 : 0
  
  // Find current stage (first incomplete)
  const currentStageNumber = stages.find(
    s => !progressMap.get(s.id)
  )?.stage_number || 1
  
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'reading':
        return <BookOpen className="w-4 h-4" />
      case 'exercise':
      case 'practice':
        return <Dumbbell className="w-4 h-4" />
      case 'quiz':
        return <CheckCircle2 className="w-4 h-4" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }
  
  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'reading':
        return 'Reading'
      case 'exercise':
        return 'Exercise'
      case 'practice':
        return 'Practice'
      case 'quiz':
        return 'Quiz'
      default:
        return type
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {completedCount}/{totalStages} Stages Complete
          </h2>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {Math.round(progressPercent)}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Progress Dots */}
        <div className="flex gap-1.5">
          {stages.map((stage) => {
            const completed = progressMap.get(stage.id)
            const isCurrent = stage.stage_number === currentStageNumber
            
            return (
              <div
                key={stage.id}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  completed ? 'bg-green-500' :
                  isCurrent ? 'bg-blue-500' :
                  'bg-gray-300 dark:bg-gray-700'
                }`}
                title={`Stage ${stage.stage_number}: ${stage.title}`}
              />
            )
          })}
        </div>
      </div>
      
      {/* Stage Cards */}
      <div className="space-y-3">
        {stages.map((stage) => {
          const completed = progressMap.get(stage.id)
          const isCurrent = stage.stage_number === currentStageNumber
          const isLocked = stage.stage_number > currentStageNumber
          
          return (
            <div
              key={stage.id}
              className={`border rounded-xl p-4 transition-all ${
                completed ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                isCurrent ? 'border-blue-500 shadow-lg bg-blue-50 dark:bg-blue-950/20' :
                isLocked ? 'opacity-50 bg-gray-50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700' :
                'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Stage Number Badge */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                    completed ? 'bg-green-600 text-white' :
                    isCurrent ? 'bg-blue-600 text-white' :
                    'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {completed ? '✓' : stage.stage_number}
                </div>
                
                {/* Stage Info */}
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-lg leading-tight text-gray-900 dark:text-gray-100">
                      {stage.title}
                    </h3>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      {getContentTypeIcon(stage.content_type)}
                      {getContentTypeLabel(stage.content_type)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      <Clock className="w-3 h-3" />
                      {stage.estimated_minutes} min
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                      stage.difficulty === 'beginner' ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
                      stage.difficulty === 'intermediate' ? 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' :
                      'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                    }`}>
                      {stage.difficulty}
                    </span>
                  </div>
                </div>
                
                {/* Action Button */}
                <button
                  onClick={() => {
                    if (!isLocked) {
                      router.push(`/lesson/${lessonId}/stage/${stage.stage_number}`)
                    }
                  }}
                  disabled={isLocked}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    isLocked ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' :
                    completed ? 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700' :
                    isCurrent ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {isLocked && (
                    <>
                      <Lock className="w-4 h-4" />
                      Locked
                    </>
                  )}
                  {!isLocked && completed && (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Review
                    </>
                  )}
                  {!isLocked && !completed && (
                    <>
                      <Play className="w-4 h-4" />
                      Start
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Completion Celebration */}
      {completedCount === totalStages && (
        <div className="p-6 rounded-xl bg-green-50 dark:bg-green-950/20 border-2 border-green-500">
          <div className="text-center space-y-3">
            <div className="text-5xl">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Lesson Complete!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You've completed all {totalStages} stages. Great work!
            </p>
            <button
              onClick={() => router.push('/chatbot')}
              className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Continue Learning
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
