'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react'
import LessonContent from '@/components/lesson-content'
import { DashboardHeader } from '@/app/components/dashboard-header'
import { createClient } from '@/lib/supabase/client'

interface Stage {
  id: string
  stage_number: number
  title: string
  content: string
  content_type: string
  estimated_minutes: number
  difficulty: string
}

interface Lesson {
  id: string
  title: string
  lesson_number: number
}

interface Progress {
  completed: boolean
  started_at: string
  completed_at?: string
  time_spent_seconds: number
}

interface StageContentProps {
  stage: Stage
  lesson: Lesson
  progress: Progress | null
  totalStages: number
  isLastStage: boolean
  userId: string
}

export function StageContent({
  stage,
  lesson,
  progress,
  totalStages,
  isLastStage,
  userId
}: StageContentProps) {
  const router = useRouter()
  const [isCompleted, setIsCompleted] = useState(progress?.completed || false)
  const [isLoading, setIsLoading] = useState(false)
  const [startTime] = useState(Date.now())
  
  const supabase = createClient()
  
  // Track time spent
  useEffect(() => {
    return () => {
      // Save time spent when component unmounts
      const timeSpent = Math.floor((Date.now() - startTime) / 1000)
      saveTimeSpent(timeSpent)
    }
  }, [startTime])
  
  const saveTimeSpent = async (seconds: number) => {
    if (seconds < 1) return
    
    try {
      const { data: existing } = await supabase
        .from('user_stage_progress')
        .select('time_spent_seconds')
        .eq('user_id', userId)
        .eq('stage_id', stage.id)
        .single()
      
      const totalTime = (existing?.time_spent_seconds || 0) + seconds
      
      await supabase
        .from('user_stage_progress')
        .upsert({
          user_id: userId,
          lesson_id: lesson.id,
          stage_id: stage.id,
          time_spent_seconds: totalTime,
          last_viewed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,stage_id'
        })
    } catch (error) {
      console.error('Error saving time:', error)
    }
  }
  
  const handleMarkComplete = async () => {
    setIsLoading(true)
    
    try {
      const { error } = await supabase
        .from('user_stage_progress')
        .upsert({
          user_id: userId,
          lesson_id: lesson.id,
          stage_id: stage.id,
          completed: true,
          completed_at: new Date().toISOString(),
          last_viewed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,stage_id'
        })
      
      if (error) throw error
      
      setIsCompleted(true)
      
      // Auto-navigate to next stage after a brief delay
      setTimeout(() => {
        if (!isLastStage) {
          router.push(`/lesson/${lesson.id}/stage/${stage.stage_number + 1}`)
        } else {
          router.push(`/lesson/${lesson.id}`)
        }
      }, 1000)
      
    } catch (error) {
      console.error('Error marking complete:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handlePrevious = () => {
    if (stage.stage_number > 1) {
      router.push(`/lesson/${lesson.id}/stage/${stage.stage_number - 1}`)
    } else {
      router.push(`/lesson/${lesson.id}`)
    }
  }
  
  const handleNext = () => {
    if (!isLastStage) {
      router.push(`/lesson/${lesson.id}/stage/${stage.stage_number + 1}`)
    } else {
      router.push(`/lesson/${lesson.id}`)
    }
  }
  
  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'reading':
        return 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      case 'exercise':
        return 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
      case 'practice':
        return 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
      case 'quiz':
        return 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700'
    }
  }
  
  return (
    <>
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
        {/* Breadcrumb */}
        <button
          onClick={() => router.push(`/lesson/${lesson.id}`)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Lesson Overview
        </button>
        
        {/* Stage Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white text-sm font-bold">
                {stage.stage_number}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Stage {stage.stage_number} of {totalStages}
              </span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  Completed
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {stage.title}
            </h1>
            
            {/* Meta badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium border ${getContentTypeColor(stage.content_type)}`}>
                {stage.content_type.charAt(0).toUpperCase() + stage.content_type.slice(1)}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                <Clock className="w-4 h-4" />
                {stage.estimated_minutes} minutes
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${
                stage.difficulty === 'beginner' ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
                stage.difficulty === 'intermediate' ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' :
                'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
              }`}>
                {stage.difficulty.charAt(0).toUpperCase() + stage.difficulty.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8">
        <LessonContent content={stage.content} />
      </div>
      
      {/* Navigation Footer */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 -mx-4 px-4 py-4 mt-8">
        <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          
          {/* Complete Button */}
          {!isCompleted && (
            <button
              onClick={handleMarkComplete}
              disabled={isLoading}
              className="flex-1 max-w-xs inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium transition-colors"
            >
              {isLoading ? (
                'Saving...'
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Mark Complete & Continue
                </>
              )}
            </button>
          )}
          
          {isCompleted && (
            <div className="flex-1 max-w-xs inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-medium">
              <CheckCircle className="w-5 h-5" />
              Completed
            </div>
          )}
          
          {/* Next Button */}
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {isLastStage ? 'Finish Lesson' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      </div>
    </>
  )
}
