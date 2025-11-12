'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import { Copy, Check } from 'lucide-react'

interface LessonContentProps {
  content: string
}

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <pre className={className}>
        <code>{children}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-gray-700 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )
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
        components={{
          pre: ({ children, ...props }) => {
            const codeContent = (children as any)?.props?.children || ''
            const className = (children as any)?.props?.className || ''
            return <CodeBlock className={className}>{codeContent}</CodeBlock>
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
