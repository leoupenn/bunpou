import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Get grammar points ready for achievement test
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const grammarProgress = await prisma.grammarProgress.findMany({
      where: {
        userId,
        status: 'achievement_test',
      },
      include: {
        grammarPoint: {
          include: {
            situations: {
              orderBy: {
                lessonNumber: 'asc',
              },
            },
          },
        },
      },
      orderBy: [
        { grammarPoint: { group: 'asc' } }, // Primary: by difficulty level
        { grammarPoint: { name: 'asc' } }, // Secondary: by name
        { updatedAt: 'asc' }, // Tertiary: by update time
      ],
    })

    return NextResponse.json(grammarProgress)
  } catch (error) {
    console.error('Error fetching achievement test items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch achievement test items' },
      { status: 500 }
    )
  }
}

// Complete achievement test (5 reviews, need 3 correct to master)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, grammarProgressId, results } = body

    if (!userId || !grammarProgressId || !results) {
      return NextResponse.json(
        { error: 'userId, grammarProgressId, and results are required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(results) || results.length !== 5) {
      return NextResponse.json(
        { error: 'results must be an array of 5 boolean values' },
        { status: 400 }
      )
    }

    const correctCount = results.filter((r: boolean) => r === true).length
    const isMastered = correctCount >= 3

    // Calculate next review date for mastered items (1 week from now)
    let nextReviewAt: Date | null = null
    if (isMastered) {
      const oneWeekFromNow = new Date()
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)
      nextReviewAt = oneWeekFromNow
    } else {
      nextReviewAt = new Date() // Immediate review if not mastered
    }

    const grammarProgress = await prisma.grammarProgress.update({
      where: { id: grammarProgressId },
      data: {
        status: isMastered ? 'mastered' : 'achievement_test', // Keep in achievement_test if not mastered so user can retry
        srsLevel: isMastered ? 6 : 0, // Set to level 6 if mastered, reset to 0 if not
        nextReviewAt,
        lastReviewedAt: new Date(),
      },
    })

    return NextResponse.json({
      grammarProgress,
      isMastered,
      correctCount,
    })
  } catch (error) {
    console.error('Error completing achievement test:', error)
    return NextResponse.json(
      { error: 'Failed to complete achievement test' },
      { status: 500 }
    )
  }
}

