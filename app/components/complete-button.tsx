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
      }

      // Refresh the page data
      router.refresh()
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
      className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        completed
          ? 'bg-green-600 hover:bg-green-700 text-white'
          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
      }`}
    >
      {completed ? (
        <>
          <CheckCircle className="w-6 h-6" />
          Mark as Incomplete
        </>
      ) : (
        <>
          <Circle className="w-6 h-6" />
          {loading ? 'Marking as Complete...' : 'Mark as Complete'}
        </>
      )}
    </button>
  )
}
