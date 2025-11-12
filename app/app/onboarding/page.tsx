'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LEARNING_PATHS, type PathId } from '@/lib/learning-paths'
import { Brain, ArrowRight } from 'lucide-react'

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

    // Update user's selected path
    const { error } = await supabase
      .from('users')
      .update({ selected_path: selectedPath })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating path:', error)
      setLoading(false)
      return
    }

    // Redirect to dashboard
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Master AI</h1>
          </div>
        </div>
      </header>

      {/* Onboarding Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Choose Your Learning Path
            </h2>
            <p className="text-xl text-gray-600">
              Select the path that best fits your role and goals. You'll get a curated set of lessons focused on your needs.
            </p>
          </div>

          {/* Path Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {Object.entries(LEARNING_PATHS).map(([pathId, path]) => (
              <button
                key={pathId}
                onClick={() => setSelectedPath(pathId as PathId)}
                className={`p-6 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] ${
                  selectedPath === pathId
                    ? 'border-blue-600 bg-blue-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-5xl">{path.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {path.name}
                    </h3>
                    <p className="text-gray-600 mb-3">{path.description}</p>
                    <p className="text-sm text-gray-500">
                      {path.lessons.length} lessons
                    </p>
                  </div>
                  {selectedPath === pathId && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Continue Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSelectPath}
              disabled={!selectedPath || loading}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up your path...' : 'Continue to Dashboard'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
