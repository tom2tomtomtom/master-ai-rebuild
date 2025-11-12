'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Sparkles, CheckCircle, Brain } from 'lucide-react'

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

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          {/* Main Content */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Professional AI Training Platform
            </div>

            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Master AI for
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {' '}Business Impact
              </span>
            </h2>

            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Learn ChatGPT, Claude, Gemini, and the latest AI tools with hands-on lessons designed for professionals. Choose your path and start building real skills today.
            </p>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mb-12 text-left">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">73 Expert Lessons</h3>
                <p className="text-gray-600 text-sm">From foundations to advanced techniques across all major AI platforms</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">5 Learning Paths</h3>
                <p className="text-gray-600 text-sm">Business, Creative, Technical, Leadership, or Complete curriculum</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Track Your Progress</h3>
                <p className="text-gray-600 text-sm">Mark lessons complete and see your advancement in real-time</p>
              </div>
            </div>
          </div>

          {/* Sign In Form */}
          <div className="max-w-md mx-auto">
            {!success ? (
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                  Get Started
                </h3>
                <p className="text-gray-600 mb-6 text-center">
                  Enter your email to receive a magic link
                </p>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending Magic Link...' : 'Send Magic Link'}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    No password needed. Click the link in your email to sign in.
                  </p>
                </form>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Check Your Email
                </h3>
                <p className="text-gray-600 mb-4">
                  We sent a magic link to <strong>{email}</strong>
                </p>
                <p className="text-sm text-gray-500">
                  Click the link in your email to sign in and start learning. The link expires in 1 hour.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600 text-sm">
          <p>© 2025 Master AI Learning Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
