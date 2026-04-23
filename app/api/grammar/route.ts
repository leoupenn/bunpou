import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUnlockedGroups } from '@/lib/group-progression'
import type { Situation } from '@prisma/client'

export const dynamic = 'force-dynamic'

/** Prefer lesson 1; if missing (some imports), use the lowest lesson so Learn is not empty. */
function situationsForNewLearner(situations: Situation[]): Situation[] {
  const sorted = [...situations].sort((a, b) => a.lessonNumber - b.lessonNumber)
  const lesson1 = sorted.filter((s) => s.lessonNumber === 1)
  if (lesson1.length > 0) return lesson1
  if (sorted.length > 0) return [sorted[0]]
  return []
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // If status is 'new', return grammar points in unlocked groups that are still "new":
    // no progress row yet, OR progress.status === 'new' (signup creates rows; old logic hid them).
    if (status === 'new') {
      const unlockedGroups = await getUnlockedGroups(userId)

      if (unlockedGroups.length === 0) {
        return NextResponse.json([])
      }

      const unlockedGrammarPoints = await prisma.grammarPoint.findMany({
        where: {
          group: {
            in: unlockedGroups,
          },
        },
        include: {
          situations: {
            orderBy: {
              lessonNumber: 'asc',
            },
          },
        },
        orderBy: [{ group: 'asc' }, { name: 'asc' }],
      })

      if (unlockedGrammarPoints.length === 0) {
        return NextResponse.json([])
      }

      const gpIds = unlockedGrammarPoints.map((gp) => gp.id)

      const progressRows = await prisma.grammarProgress.findMany({
        where: {
          userId,
          grammarPointId: { in: gpIds },
        },
      })

      const progressByGrammarPointId = new Map(
        progressRows.map((p) => [p.grammarPointId, p])
      )

      const stillNew = unlockedGrammarPoints.filter((gp) => {
        const p = progressByGrammarPointId.get(gp.id)
        return !p || p.status === 'new'
      })

      const result = stillNew
        .map((gp) => {
          const p = progressByGrammarPointId.get(gp.id)
          const situationsForLearn = situationsForNewLearner(gp.situations)
          if (situationsForLearn.length === 0) {
            return null
          }

        if (p) {
          return {
            id: p.id,
            grammarPoint: {
              ...gp,
              situations: situationsForLearn,
            },
            srsLevel: p.srsLevel,
            status: p.status,
            unlockedSituationNumber: p.unlockedSituationNumber,
            lastSituationId: p.lastSituationId,
            nextReviewAt: p.nextReviewAt,
            lastReviewedAt: p.lastReviewedAt,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          }
        }

        return {
          id: `new-${gp.id}`,
          grammarPoint: {
            ...gp,
            situations: situationsForLearn,
          },
          srsLevel: 0,
          status: 'new',
          unlockedSituationNumber: 1,
          lastSituationId: null,
          nextReviewAt: null,
          lastReviewedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)

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

