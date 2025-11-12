'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Sparkles, CheckCircle, Brain, BookOpen } from 'lucide-react'
import { ThemeToggle } from '@/app/components/theme-toggle'

export default function Home() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
    } else {
      setSuccess(true)
    }
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

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20 md:py-32">
        <div className="max-w-5xl mx-auto">
          {/* Main Content */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm font-medium mb-8 border border-slate-200 dark:border-slate-700">
              <Sparkles className="w-3.5 h-3.5" />
              Professional AI Training
            </div>

            <h2 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-gray-100 mb-8 tracking-tight leading-[1.1]">
              Master AI for{' '}
              <span className="text-slate-800 dark:text-slate-300">
                Business Impact
              </span>
            </h2>

            <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Build practical AI skills with hands-on lessons across ChatGPT, Claude, Gemini, and emerging tools. Designed for professionals who need results.
            </p>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-4 mb-16 text-left max-w-4xl mx-auto">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <CheckCircle className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">73 Expert Lessons</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">From foundations to advanced techniques across all major platforms</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <BookOpen className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">5 Learning Paths</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Curated tracks for Business, Creative, Technical, and Leadership roles</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Brain className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Track Progress</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Monitor your advancement with real-time completion tracking</p>
              </div>
            </div>
          </div>

          {/* Sign In Form */}
          <div className="max-w-md mx-auto">
            {!success ? (
              <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-gray-200 dark:border-gray-800">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
                  Get Started
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-center text-sm">
                  Enter your email for instant access
                </p>

                <form onSubmit={handleSignIn} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-gray-400 dark:text-gray-500" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-600 focus:border-slate-900 dark:focus:border-slate-600 transition-colors text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 dark:bg-slate-700 text-white font-medium py-3 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending link...' : 'Continue with Email'}
                  </button>

                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                    No password required. We'll email you a secure link to sign in.
                  </p>
                </form>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Mail className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Check Your Inbox
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  We sent a magic link to <span className="font-medium text-gray-900 dark:text-gray-100">{email}</span>
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Click the link to sign in and begin your learning journey. Link expires in 60 minutes.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 mt-24">
        <div className="container mx-auto px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>© 2025 Master AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
