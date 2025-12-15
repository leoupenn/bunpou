import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Move grammar point out of achievement test back to regular review pile
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const grammarProgress = await prisma.grammarProgress.findUnique({
      where: {
        userId_grammarPointId: {
          userId,
          grammarPointId: params.id,
        },
      },
    })

    if (!grammarProgress) {
      return NextResponse.json(
        { error: 'Grammar progress not found' },
        { status: 404 }
      )
    }

    // Move back to regular review pile
    const updated = await prisma.grammarProgress.update({
      where: { id: grammarProgress.id },
      data: {
        status: 'learning',
        // Ensure it participates in SRS; keep current level but cap below mastered
        srsLevel: Math.min(grammarProgress.srsLevel, 5),
        nextReviewAt: new Date(), // make it available immediately
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error moving grammar point back to review:', error)
    return NextResponse.json(
      { error: 'Failed to move grammar point back to review' },
      { status: 500 }
    )
  }
}

