'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle, Circle } from 'lucide-react'

interface CompleteButtonProps {
  lessonId: string
  userId: string
  initialCompleted: boolean
}

export default function CompleteButton({ lessonId, userId, initialCompleted }: CompleteButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const toggleComplete = async () => {
    setLoading(true)

    try {
      if (completed) {
        // Mark as incomplete
        const { error } = await supabase
          .from('user_progress')
          .update({ completed: false, completed_at: null })
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)

        if (error) throw error
        setCompleted(false)
        router.refresh()
      } else {
        // Mark as complete (upsert in case record doesn't exist)
        const { error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: userId,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,lesson_id'
          })

        if (error) throw error
        setCompleted(true)
        
        // Redirect back to dashboard to pick another lesson
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error updating progress:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleComplete}
      disabled={loading}
      className={`inline-flex items-center gap-2.5 px-8 py-3.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        completed
          ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600'
          : 'bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white'
      }`}
    >
      {completed ? (
        <>
          <CheckCircle className="w-5 h-5" />
          Mark as Incomplete
        </>
      ) : (
        <>
          <Circle className="w-5 h-5" />
          {loading ? 'Saving...' : 'Mark as Complete'}
        </>
      )}
    </button>
  )
}
