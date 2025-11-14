import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const cookieStore = await cookies()

    // Create server client with response management for route handlers
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      // Create response and set cookies explicitly
      const response = NextResponse.redirect(`${origin}/chatbot`, {
        status: 302,
      })

      // Copy cookies from cookieStore to response
      cookieStore.getAll().forEach(({ name, value }) => {
        response.cookies.set(name, value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 365, // 1 year for session
        })
      })

      return response
    } else {
      console.error('[Auth Callback] Session exchange failed:', error?.message)
    }
  } else {
    console.error('[Auth Callback] No code parameter provided')
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/`)
}
