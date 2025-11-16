'use client'

import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import 'highlight.js/styles/atom-one-dark.css'

interface ChatMessageProps {
  content: string
  role: 'user' | 'assistant'
}

export function ChatMessage({ content, role }: ChatMessageProps) {
  if (role === 'user') {
    // User messages stay simple - just plain text
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-sm px-4 py-2 rounded-lg bg-blue-600 text-white rounded-br-none text-sm">
          {content}
        </div>
      </div>
    )
  }

  // Assistant messages use markdown formatting
  return (
    <div className="flex gap-3 justify-start">
      <div className="max-w-md px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none text-sm overflow-hidden">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Root wrapper
            div: ({ node, ...props }) => <div {...props} />,
            // Paragraphs with proper spacing
            p: ({ node, ...props }) => (
              <p className="mb-2 leading-relaxed last:mb-0" {...props} />
            ),
            // Unordered lists
            ul: ({ node, ...props }) => (
              <ul className="list-disc list-inside mb-2 space-y-1 last:mb-0" {...props} />
            ),
            // Ordered lists
            ol: ({ node, ...props }) => (
              <ol className="list-decimal list-inside mb-2 space-y-1 last:mb-0" {...props} />
            ),
            // List items
            li: ({ node, ...props }) => (
              <li className="ml-0" {...props} />
            ),
            // Bold text
            strong: ({ node, ...props }) => (
              <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />
            ),
            // Italic text
            em: ({ node, ...props }) => (
              <em className="italic text-gray-800 dark:text-gray-200" {...props} />
            ),
            // Code blocks
            code: ({ node, inline, className, children, ...props }: any) => {
              if (inline) {
                return (
                  <code
                    className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-nowrap"
                    {...props}
                  >
                    {children}
                  </code>
                )
              }
              return (
                <code
                  className="block bg-gray-900 text-gray-100 p-2 rounded-md overflow-x-auto text-xs font-mono mb-2 last:mb-0"
                  {...props}
                >
                  {children}
                </code>
              )
            },
            // Pre blocks
            pre: ({ node, children, ...props }) => (
              <pre className="bg-gray-900 text-gray-100 p-2 rounded-md overflow-x-auto mb-2 last:mb-0 text-xs" {...props}>
                {children}
              </pre>
            ),
            // Headings
            h1: ({ node, ...props }) => (
              <h1 className="text-base font-bold mb-2 mt-2 text-gray-900 dark:text-gray-100 first:mt-0" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-sm font-bold mb-2 mt-2 text-gray-900 dark:text-gray-100 first:mt-0" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-xs font-bold mb-2 mt-2 text-gray-900 dark:text-gray-100 first:mt-0" {...props} />
            ),
            // Blockquotes
            blockquote: ({ node, ...props }) => (
              <blockquote
                className="border-l-4 border-blue-400 dark:border-blue-500 pl-3 italic text-gray-700 dark:text-gray-300 mb-2 last:mb-0"
                {...props}
              />
            ),
            // Horizontal rule
            hr: ({ node, ...props }) => (
              <hr className="my-2 border-gray-300 dark:border-gray-600 last:mb-0" {...props} />
            ),
            // Links
            a: ({ node, ...props }) => (
              <a
                className="text-blue-600 dark:text-blue-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            ),
            // Tables
            table: ({ node, ...props }) => (
              <table className="border-collapse border border-gray-300 dark:border-gray-600 mb-2 last:mb-0 text-xs" {...props} />
            ),
            thead: ({ node, ...props }) => (
              <thead className="bg-gray-200 dark:bg-gray-700" {...props} />
            ),
            tbody: ({ node, ...props }) => (
              <tbody {...props} />
            ),
            tr: ({ node, ...props }) => (
              <tr className="border-b border-gray-300 dark:border-gray-600" {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className="border-r border-gray-300 dark:border-gray-600 px-2 py-1 last:border-r-0" {...props} />
            ),
            th: ({ node, ...props }) => (
              <th className="border-r border-gray-300 dark:border-gray-600 px-2 py-1 last:border-r-0 font-semibold" {...props} />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
