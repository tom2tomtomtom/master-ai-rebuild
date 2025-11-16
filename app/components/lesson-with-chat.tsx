'use client'

import { useState, useCallback } from 'react'
import LessonContent from '@/components/lesson-content'
import { LessonChatbotSidebar } from '@/components/lesson-chatbot-sidebar'

interface LessonWithChatProps {
  content: string
  lessonId: string
}

export function LessonWithChat({ content, lessonId }: LessonWithChatProps) {
  const [selectedText, setSelectedText] = useState<string>('')

  const handleTextSelection = useCallback(() => {
    // Add a small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection()
      if (selection && selection.toString().length > 0) {
        setSelectedText(selection.toString())
        console.log('Text selected:', selection.toString())
      }
    }, 50)
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Main Content - 60% width on desktop */}
      <div className="lg:col-span-3" onMouseUp={handleTextSelection}>
        <div className={`bg-white dark:bg-slate-900 rounded-xl border-2 p-10 md:p-12 mb-8 transition-colors ${
          selectedText
            ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/20'
            : 'border-gray-200 dark:border-gray-800'
        }`}>
          <LessonContent content={content} />
        </div>
        {selectedText && (
          <div className="text-center text-sm text-blue-600 dark:text-blue-400 font-medium">
            ✓ Text selected - Check the chat sidebar →
          </div>
        )}
      </div>

      {/* Chatbot Sidebar - 40% width on desktop, full width on mobile */}
      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-20 max-h-[calc(100vh-100px)]">
          <LessonChatbotSidebar
            lessonId={lessonId}
            selectedText={selectedText}
            onSelectText={setSelectedText}
            lessonContent={content}
          />
        </div>
      </div>
    </div>
  )
}
