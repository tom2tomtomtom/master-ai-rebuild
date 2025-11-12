'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LEARNING_PATHS, type PathId } from '@/lib/learning-paths'
import { Brain, ArrowRight, Briefcase, Palette, Code, Users, Layers } from 'lucide-react'
import { ThemeToggle } from '@/app/components/theme-toggle'

const iconMap = {
  briefcase: Briefcase,
  palette: Palette,
  code: Code,
  users: Users,
  layers: Layers,
}

export default function OnboardingPage() {
  const router = useRouter()
  const [selectedPath, setSelectedPath] = useState<PathId | null>(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleSelectPath = async () => {
    if (!selectedPath || !user) return

    setLoading(true)

    // Upsert user's selected path (insert if not exists, update if exists)
    const { error } = await supabase
      .from('users')
      .upsert({ 
        id: user.id,
        email: user.email,
        selected_path: selectedPath 
      }, {
        onConflict: 'id'
      })

    if (error) {
      console.error('Error updating path:', error)
      setLoading(false)
      return
    }

    // Redirect to dashboard
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Master AI</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Onboarding Content */}
      <main className="container mx-auto px-6 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 tracking-tight">
              Choose Your Learning Path
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Select the track that aligns with your role. Each path includes curated lessons tailored to your professional needs.
            </p>
          </div>

          {/* Path Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            {Object.entries(LEARNING_PATHS).map(([pathId, path]) => {
              const Icon = iconMap[path.icon as keyof typeof iconMap]
              const isSelected = selectedPath === pathId
              return (
                <button
                  key={pathId}
                  onClick={() => setSelectedPath(pathId as PathId)}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-slate-900 dark:border-slate-600 bg-slate-50 dark:bg-slate-800'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-slate-900 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {path.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 leading-relaxed">{path.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {path.lessons.length} lessons
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Continue Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSelectPath}
              disabled={!selectedPath || loading}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 dark:bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up your path...' : 'Continue to Dashboard'}
              <ArrowRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
