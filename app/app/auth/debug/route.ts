import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  const response = {
    timestamp: new Date().toISOString(),
    url: request.url,
    cookies: allCookies.map(c => ({
      name: c.name,
      value: c.value.substring(0, 20) + '...' // Don't expose full values
    })),
    hasSBAccessToken: allCookies.some(c => c.name.includes('sb-access')),
    hasSBRefreshToken: allCookies.some(c => c.name.includes('sb-refresh')),
  }

  return NextResponse.json(response)
}
