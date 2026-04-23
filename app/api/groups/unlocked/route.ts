import { NextRequest, NextResponse } from 'next/server'
import { getUnlockedGroups, getGroupProgress, canAccessGroup } from '@/lib/group-progression'
import { prisma } from '@/lib/prisma'
import { grammarPointWhere, resolveDemoSliceForUser } from '@/lib/demo-mode'

export const dynamic = 'force-dynamic'

/**
 * Get all groups with their unlock status and progress for a user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const demoActive = await resolveDemoSliceForUser(userId)

    // Get all unique groups from grammar points
    const allGroups = await prisma.grammarPoint.findMany({
      where: grammarPointWhere({}, demoActive),
      select: {
        group: true,
      },
      distinct: ['group'],
      orderBy: {
        group: 'asc',
      },
    })

    const uniqueGroups = Array.from(new Set(allGroups.map((g) => g.group))).sort(
      (a, b) => a - b
    )

    // Get unlocked groups
    const unlockedGroups = await getUnlockedGroups(userId, demoActive)

    // Get progress for each group (both locked and unlocked)
    const groupProgressData = await Promise.all(
      uniqueGroups.map(async (group) => {
        const progress = await getGroupProgress(userId, group, demoActive)
        const isUnlocked = await canAccessGroup(userId, group, demoActive)
        return {
          group,
          ...progress,
          unlocked: isUnlocked,
        }
      })
    )

    return NextResponse.json({
      unlockedGroups,
      groupProgress: groupProgressData,
    })
  } catch (error) {
    console.error('Error fetching group progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group progress' },
      { status: 500 }
    )
  }
}
