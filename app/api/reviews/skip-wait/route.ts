import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { grammarProgressWhere, resolveDemoSliceForUser } from '@/lib/demo-mode'

export const dynamic = 'force-dynamic'

// Skip SRS wait time - make all upcoming reviews available immediately
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const slice = await resolveDemoSliceForUser(userId)
    const now = new Date()
    // Set nextReviewAt to 1 second ago to make reviews immediately available
    const pastTime = new Date(now.getTime() - 1000)

    // Update all grammar progress items with future nextReviewAt
    const result = await prisma.grammarProgress.updateMany({
      where: grammarProgressWhere(
        {
          userId,
          nextReviewAt: {
            gt: now, // Only update items with future review times
          },
        },
        slice
      ),
      data: {
        nextReviewAt: pastTime,
      },
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
      message: `Made ${result.count} review${result.count !== 1 ? 's' : ''} immediately available`,
    })
  } catch (error) {
    console.error('Error skipping wait time:', error)
    return NextResponse.json(
      { error: 'Failed to skip wait time' },
      { status: 500 }
    )
  }
}
