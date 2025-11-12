import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Forwardheaders ensure cookies are set
      const response = NextResponse.redirect(`${origin}/chatbot`)
      
      // Redirect directly to chatbot - the main interface
      return response
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/`)
}
