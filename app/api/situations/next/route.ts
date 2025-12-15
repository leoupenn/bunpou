import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextSituation } from '@/lib/situation-selector'

export const dynamic = 'force-dynamic'

// Get the next situation to use for a grammar point
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const grammarProgressId = searchParams.get('grammarProgressId')

    if (!userId || !grammarProgressId) {
      return NextResponse.json(
        { error: 'userId and grammarProgressId are required' },
        { status: 400 }
      )
    }

    // Get grammar progress
    const grammarProgress = await prisma.grammarProgress.findUnique({
      where: { id: grammarProgressId },
      include: {
        grammarPoint: true,
      },
    })

    if (!grammarProgress || grammarProgress.userId !== userId) {
      return NextResponse.json(
        { error: 'Grammar progress not found' },
        { status: 404 }
      )
    }

    // Get next situation using the selector
    const nextSituation = await getNextSituation(
      grammarProgressId,
      grammarProgress.grammarPointId,
      grammarProgress.unlockedSituationNumber,
      grammarProgress.lastSituationId
    )

    if (!nextSituation) {
      return NextResponse.json(
        { error: 'No situations available' },
        { status: 404 }
      )
    }

    return NextResponse.json(nextSituation)
  } catch (error) {
    console.error('Error fetching next situation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch next situation' },
      { status: 500 }
    )
  }
}
