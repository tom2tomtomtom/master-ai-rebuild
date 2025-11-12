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
      // Check if user has selected a path
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('selected_path')
          .eq('id', user.id)
          .single()

        // Redirect to onboarding if no path selected, otherwise to dashboard
        if (!userData?.selected_path) {
          return NextResponse.redirect(`${origin}/onboarding`)
        } else {
          return NextResponse.redirect(`${origin}/dashboard`)
        }
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/`)
}
