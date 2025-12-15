import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    })

    // Always return a generic message to avoid user enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
    }

    // Create a short-lived reset token
    const token = jwt.sign(
      { userId: user.id, type: 'reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    )

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`

    // In a real app, send resetUrl via email here.
    console.log('Password reset link for', user.email, ':', resetUrl)

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      // For local development convenience, return the URL in the payload
      resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined,
    })
  } catch (error) {
    console.error('Error in forgot-password:', error)
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}

