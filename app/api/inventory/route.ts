import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Get all grammar points with their progress status for inventory view
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Get all grammar points
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

    // Format the response to include progress info
    const inventory = allGrammarPoints.map((gp) => {
      const progress = gp.grammarProgress[0] || null
      return {
        id: gp.id,
        name: gp.name,
        description: gp.description,
        group: gp.group,
        situationCount: gp.situations.length,
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

    return NextResponse.json(inventory)
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

