import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUnlockedGroups } from '@/lib/group-progression'

export const dynamic = 'force-dynamic'

// Get all grammar points with their progress status for inventory view
// Shows ALL grammar points, including locked ones (for preview)
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Get all grammar points (including locked ones for preview)
    const allGrammarPoints = await prisma.grammarPoint.findMany({
      include: {
        situations: {
          orderBy: {
            lessonNumber: 'asc',
          },
        },
        grammarProgress: {
          where: {
            userId,
          },
          take: 1, // Only need one progress record per grammar point
        },
      },
      orderBy: {
        group: 'asc',
        name: 'asc',
      },
    })

    // Get unlocked groups to determine which grammar points are locked
    const unlockedGroups = await getUnlockedGroups(userId)
    const unlockedGroupsSet = new Set(unlockedGroups)

    // Format the response to include progress info and lock status
    const inventory = allGrammarPoints.map((gp) => {
      const progress = gp.grammarProgress[0] || null
      const isLocked = !unlockedGroupsSet.has(gp.group)
      
      return {
        id: gp.id,
        name: gp.name,
        description: gp.description,
        group: gp.group,
        jlptLevel: gp.jlptLevel,
        referenceUrl: gp.referenceUrl,
        situationCount: gp.situations.length,
        isLocked,
        progress: progress
          ? {
              id: progress.id,
              srsLevel: progress.srsLevel,
              status: progress.status,
              nextReviewAt: progress.nextReviewAt,
              lastReviewedAt: progress.lastReviewedAt,
            }
          : null,
      }
    })

    console.log(`Inventory: Found ${inventory.length} grammar points for user ${userId}`)
    return NextResponse.json(inventory)
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

