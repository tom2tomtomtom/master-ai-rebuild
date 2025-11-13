'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Lightbulb, X } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface LessonChatbotSidebarProps {
  lessonId: string
  selectedText?: string
  onSelectText?: (text: string) => void
}

export function LessonChatbotSidebar({
  lessonId,
  selectedText,
  onSelectText
}: LessonChatbotSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load suggested questions on mount
  useEffect(() => {
    const loadSuggestedQuestions = async () => {
      try {
        setIsSuggestionsLoading(true)
        const response = await fetch('/api/lesson-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId })
        })

        if (response.ok) {
          const data = await response.json()
          setSuggestedQuestions(data.suggestedQuestions || [])
        }
      } catch (error) {
        console.error('Error loading suggestions:', error)
      } finally {
        setIsSuggestionsLoading(false)
      }
    }

    loadSuggestedQuestions()
  }, [lessonId])

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return

    // Add user message to chat
    const userMessage: Message = { role: 'user', content: messageText }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/lesson-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          lessonId,
          selectedText,
          conversationHistory: messages
        })
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // Add error message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    handleSendMessage(question)
  }

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden shadow-lg h-96">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
          Lesson Assistant
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
          Ask questions about this lesson
        </p>
      </div>

      {/* Messages Area - Fixed height with internal scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {/* Highlighted Text Display - Show when text is selected */}
        {selectedText && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mb-2">Highlighted text:</p>
            <p className="text-sm text-amber-800 dark:text-amber-100 italic">"{selectedText}"</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">💡 Ask a question about this text below</p>
          </div>
        )}

        {messages.length === 0 && !isSuggestionsLoading && suggestedQuestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Lightbulb className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Suggested questions:</span>
            </div>
            <div className="space-y-2">
              {suggestedQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedQuestion(question)}
                  disabled={isLoading}
                  className="w-full text-left px-3 py-2 text-sm rounded-md bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 border border-blue-200 dark:border-blue-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Always visible at bottom */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type question..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage(inputValue)
              }
            }}
            disabled={isLoading}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={isLoading || !inputValue.trim()}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
