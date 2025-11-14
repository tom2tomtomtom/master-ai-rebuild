import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/chatbot'

  if (code) {
    const supabase = await createClient()

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('❌ [Auth Callback] Exchange failed:', error.message)
        return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
      }

      console.log('✅ [Auth Callback] Session exchanged successfully')
      // The session cookies are automatically set by exchangeCodeForSession
      // Redirect to chatbot or next parameter
      return NextResponse.redirect(new URL(next, request.url))
    } catch (err) {
      console.error('❌ [Auth Callback] Error:', err)
      return NextResponse.redirect(new URL('/?error=server_error', request.url))
    }
  }

  // No code provided - redirect home
  console.warn('⚠️  [Auth Callback] No code parameter')
  return NextResponse.redirect(new URL('/', request.url))
}
