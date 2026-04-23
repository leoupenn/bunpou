import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const user = await getUserFromToken(token)

    if (!user) {
      const response = NextResponse.json({ user: null }, { status: 200 })
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      })
      return response
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error checking session:', error)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
