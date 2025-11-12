'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react'

interface AIPathNavigatorProps {
  currentLessonId: string
}

interface LearningPathLesson {
  id: string
  lesson_number: number
  title: string
  duration_minutes: number
  category?: string
  difficulty?: string
}

interface LearningPath {
  lessons: LearningPathLesson[]
  createdAt: string
  prompt: string
}

export function AIPathNavigator({ currentLessonId }: AIPathNavigatorProps) {
  const searchParams = useSearchParams()
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null)
  const [currentIndex, setCurrentIndex] = useState(-1)

  useEffect(() => {
    // Check if we came from AI chatbot
    const fromAI = searchParams.get('fromAI')
    const pathIndexParam = searchParams.get('pathIndex')

    if (fromAI === 'true') {
      // Load the AI learning path from localStorage
      const storedPath = localStorage.getItem('aiLearningPath')
      if (storedPath) {
        try {
          const path = JSON.parse(storedPath) as LearningPath
          setLearningPath(path)

          // Find current lesson index
          const index = path.lessons.findIndex((l) => l.id === currentLessonId)
          setCurrentIndex(index !== -1 ? index : parseInt(pathIndexParam || '0'))
        } catch (error) {
          console.error('Error loading AI path:', error)
        }
      }
    }
  }, [currentLessonId, searchParams])

  const handleDismiss = () => {
    setLearningPath(null)
    localStorage.removeItem('aiLearningPath')
  }

  if (!learningPath || currentIndex === -1) return null

  const prevLesson = currentIndex > 0 ? learningPath.lessons[currentIndex - 1] : null
  const nextLesson =
    currentIndex < learningPath.lessons.length - 1
      ? learningPath.lessons[currentIndex + 1]
      : null

  return (
    <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              AI Learning Path
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Lesson {currentIndex + 1} of {learningPath.lessons.length}
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          aria-label="Dismiss AI path"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / learningPath.lessons.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3">
        {prevLesson ? (
          <Link
            href={`/lesson/${prevLesson.id}?fromAI=true&pathIndex=${currentIndex - 1}`}
            className="flex-1 flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-600 dark:hover:border-blue-500 transition-all group"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            <div className="flex-1 text-left">
              <p className="text-xs text-gray-500 dark:text-gray-400">Previous</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                {prevLesson.title}
              </p>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        {nextLesson ? (
          <Link
            href={`/lesson/${nextLesson.id}?fromAI=true&pathIndex=${currentIndex + 1}`}
            className="flex-1 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all group"
          >
            <div className="flex-1 text-left">
              <p className="text-xs text-blue-100">Next</p>
              <p className="text-sm font-medium line-clamp-1">{nextLesson.title}</p>
            </div>
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <Link
            href="/chatbot"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Get More Recommendations</span>
          </Link>
        )}
      </div>
    </div>
  )
}

