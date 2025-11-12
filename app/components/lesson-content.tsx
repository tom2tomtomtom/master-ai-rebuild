'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

interface LessonContentProps {
  content: string
}

export default function LessonContent({ content }: LessonContentProps) {
  return (
    <div className="prose prose-lg max-w-none 
      prose-headings:text-gray-900 dark:prose-headings:text-gray-100
      prose-p:text-gray-700 dark:prose-p:text-gray-300
      prose-a:text-blue-600 dark:prose-a:text-blue-400
      prose-strong:text-gray-900 dark:prose-strong:text-gray-100
      prose-code:text-blue-600 dark:prose-code:text-blue-400
      prose-pre:bg-gray-50 dark:prose-pre:bg-gray-800
      prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700
      prose-ul:text-gray-700 dark:prose-ul:text-gray-300
      prose-ol:text-gray-700 dark:prose-ol:text-gray-300
      prose-li:text-gray-700 dark:prose-li:text-gray-300
      prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300
      prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-700
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
