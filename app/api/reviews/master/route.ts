import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { grammarProgressWhere, resolveDemoSliceForUser } from '@/lib/demo-mode'

export const dynamic = 'force-dynamic'

// Get available master reviews (level 6, nextReviewAt <= now)
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const slice = await resolveDemoSliceForUser(userId)
    const now = new Date()

    const grammarProgress = await prisma.grammarProgress.findMany({
      where: grammarProgressWhere(
        {
          userId,
          srsLevel: 6, // Only level 6 (mastered) items
          status: 'mastered', // Ensure status is also mastered
          OR: [
            { nextReviewAt: { lte: now } },
            { nextReviewAt: null },
          ],
        },
        slice
      ),
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
        { nextReviewAt: 'asc' }, // Primary: earliest reviews first
        { grammarPoint: { group: 'asc' } }, // Secondary: by difficulty level
        { grammarPoint: { name: 'asc' } }, // Tertiary: by name
      ],
    })

    // Filter situations to only include unlocked ones and add selection info
    const filteredProgress = grammarProgress.map((gp) => ({
      ...gp,
      grammarPoint: {
        ...gp.grammarPoint,
        situations: gp.grammarPoint.situations.filter(
          (s) => s.lessonNumber <= gp.unlockedSituationNumber
        ),
      },
      unlockedSituationNumber: gp.unlockedSituationNumber,
      lastSituationId: gp.lastSituationId,
    }))

    return NextResponse.json(filteredProgress)
  } catch (error) {
    console.error('Error fetching master reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch master reviews' },
      { status: 500 }
    )
  }
}

