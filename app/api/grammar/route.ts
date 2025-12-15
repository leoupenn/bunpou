import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUnlockedGroups } from '@/lib/group-progression'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // If status is 'new', return grammar points from unlocked groups that don't have progress yet
    if (status === 'new') {
      // Get all unlocked groups for this user
      const unlockedGroups = await getUnlockedGroups(userId)

      if (unlockedGroups.length === 0) {
        return NextResponse.json([])
      }

      // Get grammar points from all unlocked groups
      const unlockedGrammarPoints = await prisma.grammarPoint.findMany({
        where: {
          group: {
            in: unlockedGroups, // Only from unlocked groups
          },
        },
        include: {
          situations: {
            orderBy: {
              lessonNumber: 'asc',
            },
          },
        },
        orderBy: [
          { group: 'asc' }, // Order by group first
          { name: 'asc' }, // Then by name
        ],
      })

      // Get all grammar points that have progress for this user
      const grammarPointsWithProgress = await prisma.grammarProgress.findMany({
        where: { userId },
        select: { grammarPointId: true },
      })

      const progressIds = new Set(grammarPointsWithProgress.map((gp) => gp.grammarPointId))

      // Filter to only grammar points without progress
      const newGrammarPoints = unlockedGrammarPoints.filter((gp) => !progressIds.has(gp.id))

      // Format as GrammarProgress objects with null progress
      // Only show first situation (lessonNumber 1) for new grammar points
      const result = newGrammarPoints.map((gp) => ({
        id: `new-${gp.id}`, // Temporary ID for frontend
        grammarPoint: {
          ...gp,
          situations: gp.situations.filter((s) => s.lessonNumber === 1), // Only first situation
        },
        srsLevel: 0,
        status: 'new',
        unlockedSituationNumber: 1, // First situation unlocked
        lastSituationId: null,
        nextReviewAt: null,
        lastReviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      return NextResponse.json(result)
    }

    // Otherwise, return grammar progress records as before
    const where: any = {
      userId,
    }

    if (status) {
      where.status = status
    }

    const grammarProgress = await prisma.grammarProgress.findMany({
      where,
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
        { grammarPoint: { group: 'asc' } },
        { grammarPoint: { name: 'asc' } },
        { createdAt: 'asc' },
      ],
    })

    // Filter situations to only include unlocked ones
    const filteredProgress = grammarProgress.map((gp) => ({
      ...gp,
      grammarPoint: {
        ...gp.grammarPoint,
        situations: gp.grammarPoint.situations.filter(
          (s) => s.lessonNumber <= gp.unlockedSituationNumber
        ),
      },
    }))

    return NextResponse.json(filteredProgress)
  } catch (error) {
    console.error('Error fetching grammar points:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grammar points' },
      { status: 500 }
    )
  }
}

