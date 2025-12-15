import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { addHours } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    // Initialize user with group 1 grammar points only (if they exist)
    // Users start with first situation (lessonNumber 1) unlocked for each grammar point
    try {
      const group1GrammarPoints = await prisma.grammarPoint.findMany({
        where: {
          group: 1, // Only group 1 (first sublevel)
        },
        orderBy: {
          name: 'asc',
        },
      })

      // Only create progress entries if grammar points exist
      if (group1GrammarPoints.length > 0) {
        // Create grammar progress entries for group 1 grammar points
        // unlockedSituationNumber: 1 means only the first situation is available
        // nextReviewAt: immediately available
        const now = new Date()
        const nextReviewAt = new Date(now.getTime() - 1000) // 1 second ago to ensure it's available

        // SQLite doesn't support skipDuplicates, so we'll create them individually
        await Promise.allSettled(
          group1GrammarPoints.map((gp) =>
            prisma.grammarProgress.create({
              data: {
                userId: user.id,
                grammarPointId: gp.id,
                srsLevel: 0, // Start at level 0 (new), not level 1
                status: 'new', // Start as 'new', not 'learning'
                unlockedSituationNumber: 1, // Only first situation unlocked
                nextReviewAt: nextReviewAt,
              },
            }).catch((error: any) => {
              // Ignore unique constraint violations (shouldn't happen for new user)
              if (error.code !== 'P2002') {
                console.error(`Error creating progress for ${gp.id}:`, error)
              }
            })
          )
        )
      }
    } catch (progressError) {
      // Log but don't fail signup if grammar progress initialization fails
      console.error('Error initializing grammar progress (non-fatal):', progressError)
    }

    // Generate token
    const token = generateToken(user.id)

    // Set cookie
    const response = NextResponse.json({
      user,
      token,
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Error signing up:', error)
    
    // Handle specific Prisma errors
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }
    
    // Return more detailed error message
    const errorMessage = error?.message || 'Failed to create account'
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined 
      },
      { status: 500 }
    )
  }
}
