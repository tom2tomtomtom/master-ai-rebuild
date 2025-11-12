'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, BookOpen, Clock, BarChart3, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RecommendedLesson {
  id: string;
  lesson_number: number;
  title: string;
  category: string;
  difficulty: string;
  duration_minutes: number;
}

export default function ChatbotPage() {
  const initialMessage = {
    role: 'assistant' as const,
    content: "👋 Hi! I'm your AI learning assistant. Tell me what you'd like to learn or what topics interest you, and I'll recommend the perfect lessons for you. For example, you could say 'I want to learn about research' or 'I'm interested in marketing with AI'.",
  };

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedLessons, setRecommendedLessons] = useState<RecommendedLesson[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load persisted conversation on mount
  useEffect(() => {
    const storedMessages = localStorage.getItem('chatbotMessages');
    const storedLessons = localStorage.getItem('chatbotRecommendations');

    if (storedMessages) {
      try {
        const parsed = JSON.parse(storedMessages);
        setMessages(parsed.length > 0 ? parsed : [initialMessage]);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }

    if (storedLessons) {
      try {
        const parsed = JSON.parse(storedLessons);
        setRecommendedLessons(parsed);
      } catch (error) {
        console.error('Error loading lessons:', error);
      }
    }

    setIsHydrated(true);
  }, []);

  // Persist messages whenever they change
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('chatbotMessages', JSON.stringify(messages));
    }
  }, [messages, isHydrated]);

  // Persist recommended lessons whenever they change
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('chatbotRecommendations', JSON.stringify(recommendedLessons));
    }
  }, [recommendedLessons, isHydrated]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to chat
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add assistant message to chat
      setMessages([...newMessages, { role: 'assistant', content: data.message }]);

      // Update recommended lessons and save as AI learning path
      if (data.recommendedLessons && data.recommendedLessons.length > 0) {
        setRecommendedLessons(data.recommendedLessons);
        
        // Save to localStorage as an AI-recommended learning path
        const learningPath = {
          lessons: data.recommendedLessons,
          createdAt: new Date().toISOString(),
          prompt: userMessage,
        };
        localStorage.setItem('aiLearningPath', JSON.stringify(learningPath));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: "I'm sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = () => {
    if (confirm('Are you sure you want to clear your conversation and start fresh?')) {
      setMessages([initialMessage]);
      setRecommendedLessons([]);
      localStorage.removeItem('chatbotMessages');
      localStorage.removeItem('chatbotRecommendations');
      localStorage.removeItem('aiLearningPath');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'text-green-600 bg-green-50';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-50';
      case 'advanced':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AI Learning Assistant</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Discover the perfect lessons for your learning goals
                </p>
              </div>
            </div>
            <button
              onClick={handleClearConversation}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-gray-200 dark:border-gray-800 hover:border-red-300 dark:hover:border-red-800"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg overflow-hidden flex flex-col h-[600px] border border-gray-200 dark:border-gray-800">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-blue-600'
                          : 'bg-gradient-to-r from-purple-600 to-blue-600'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="h-5 w-5 text-white" />
                      ) : (
                        <Bot className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div
                      className={`flex-1 max-w-[80%] ${
                        message.role === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`inline-block px-4 py-3 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="inline-block px-4 py-3 rounded-2xl bg-gray-100 dark:bg-slate-800">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-200" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-slate-800">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="What would you like to learn?"
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Recommended Lessons Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 sticky top-8 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Recommended Lessons
                </h2>
              </div>

              {recommendedLessons.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-gray-100 dark:bg-slate-800 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Tell me what you&apos;d like to learn, and I&apos;ll recommend the perfect lessons!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto">
                  {recommendedLessons.map((lesson, index) => (
                    <Link
                      key={lesson.id}
                      href={`/lesson/${lesson.id}?fromAI=true&pathIndex=${index}`}
                      className="block p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-600 dark:hover:border-blue-500 hover:shadow-md transition-all group bg-white dark:bg-slate-800"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                          Lesson {lesson.lesson_number}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${getDifficultyColor(
                            lesson.difficulty
                          )}`}
                        >
                          {lesson.difficulty}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {lesson.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{lesson.duration_minutes} min</span>
                        </div>
                        {lesson.category && (
                          <div className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            <span>{lesson.category}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Not sure what to ask? Try these:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              'I want to learn about research',
              'Show me lessons on marketing with AI',
              'I need to learn API integration',
              'What about creative design tools?',
              'Help me with software development',
              'I want to build AI teams',
            ].map((prompt, index) => (
              <button
                key={index}
                onClick={() => setInput(prompt)}
                className="text-left px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-sm text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400"
              >
                &quot;{prompt}&quot;
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
