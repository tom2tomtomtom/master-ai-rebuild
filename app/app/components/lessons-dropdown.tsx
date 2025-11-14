'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Lesson {
  id: string
  lesson_number: number
  title: string
}

interface LessonsByCategory {
  [key: string]: Lesson[]
}

export function LessonsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch lessons from database
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('lessons')
          .select('id, lesson_number, title')
          .order('lesson_number', { ascending: true })

        if (!error && data) {
          setLessons(data)
        }
      } catch (err) {
        console.error('Error fetching lessons:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLessons()
  }, [])

  // Categorize lessons
  const categorizeLesson = (lessonNumber: number): string => {
    if (lessonNumber < 10) return 'Getting Started'
    if (lessonNumber < 20) return 'Claude Lessons'
    if (lessonNumber < 28) return 'Gemini Lessons'
    if (lessonNumber < 40) return 'AI Creation Tools'
    if (lessonNumber < 52) return 'Development & Code'
    if (lessonNumber < 61) return 'Business Applications'
    if (lessonNumber < 74) return 'Tools & Platforms'
    return 'Reference'
  }

  // Organize lessons by category
  const lessonsByCategory: LessonsByCategory = lessons.reduce((acc, lesson) => {
    const category = categorizeLesson(lesson.lesson_number)
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(lesson)
    return acc
  }, {} as LessonsByCategory)

  // Filter lessons based on search
  const filteredLessons = lessons.filter(lesson =>
    lesson.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group filtered lessons
  const filteredByCategory: LessonsByCategory = filteredLessons.reduce((acc, lesson) => {
    const category = categorizeLesson(lesson.lesson_number)
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(lesson)
    return acc
  }, {} as LessonsByCategory)

  const displayedLessons = searchQuery ? filteredByCategory : lessonsByCategory

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        Lessons
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-50">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search lessons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Lessons List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading lessons...</div>
            ) : Object.keys(displayedLessons).length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No lessons found</div>
            ) : (
              Object.entries(displayedLessons).map(([category, categoryLessons]) => (
                <div key={category}>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide sticky top-0">
                    {category}
                  </div>
                  {categoryLessons.map(lesson => (
                    <Link
                      key={lesson.id}
                      href={`/lesson/${lesson.id}`}
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {lesson.id}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                            {lesson.title}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
            {filteredLessons.length} of {lessons.length} lessons
          </div>
        </div>
      )}
    </div>
  )
}
