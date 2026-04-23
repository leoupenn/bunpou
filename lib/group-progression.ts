import { prisma } from './prisma'
import type { DemoSliceFlag } from './demo-mode'
import { grammarPointWhere } from './demo-mode'

/**
 * Calculate the required number of mastered grammar points to unlock the next group
 * Rules:
 * - 5 total → need 4 (4/5 = 80%)
 * - 4 total → need 3 (3/4 = 75%)
 * - 3 total → need 2 (2/3 = 66.67%)
 * - 2 total → need 2 (2/2 = 100%)
 * - 1 total → need 1 (1/1 = 100%)
 */
export function getRequiredMasteryCount(totalCount: number): number {
  if (totalCount >= 5) {
    return totalCount - 1 // 4 out of 5, 5 out of 6, etc.
  } else if (totalCount === 4) {
    return 3 // 3 out of 4
  } else if (totalCount === 3) {
    return 2 // 2 out of 3
  } else {
    return totalCount // For 1 or 2, need all of them
  }
}

/**
 * Check if a user has unlocked access to a specific group
 * A group is unlocked if the user has mastered the required number of grammar points
 * from the previous group (group - 1)
 */
export async function canAccessGroup(
  userId: string,
  targetGroup: number,
  slice: DemoSliceFlag
): Promise<boolean> {
  // Group 1 is always accessible
  if (targetGroup === 1) {
    return true
  }

  // To access group N, need to master required amount from group (N-1)
  const previousGroup = targetGroup - 1

  // Get all grammar points in the previous group
  const previousGroupGrammarPoints = await prisma.grammarPoint.findMany({
    where: grammarPointWhere(
      {
        group: previousGroup,
      },
      slice
    ),
    select: {
      id: true,
    },
  })

  const totalCount = previousGroupGrammarPoints.length

  // If no grammar points in previous group, allow access (edge case)
  if (totalCount === 0) {
    return true
  }

  // Calculate required mastery count
  const requiredCount = getRequiredMasteryCount(totalCount)

  // Get user's progress for grammar points in previous group
  const grammarPointIds = previousGroupGrammarPoints.map((gp) => gp.id)

  const masteredCount = await prisma.grammarProgress.count({
    where: {
      userId,
      grammarPointId: {
        in: grammarPointIds,
      },
      status: 'mastered', // Must be fully mastered
    },
  })

  return masteredCount >= requiredCount
}

/**
 * Get all unlocked groups for a user
 */
export async function getUnlockedGroups(
  userId: string,
  slice: DemoSliceFlag
): Promise<number[]> {
  // Get all unique groups from grammar points
  const allGroups = await prisma.grammarPoint.findMany({
    where: grammarPointWhere({}, slice),
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

  const unlockedGroups: number[] = []

  // Check each group sequentially (groups must be unlocked in order)
  for (const group of uniqueGroups) {
    const canAccess = await canAccessGroup(userId, group, slice)
    if (canAccess) {
      unlockedGroups.push(group)
    } else {
      // Once we hit a locked group, stop (groups must be sequential)
      break
    }
  }

  return unlockedGroups
}

/**
 * Get progress information for a specific group
 */
export async function getGroupProgress(
  userId: string,
  group: number,
  slice: DemoSliceFlag
): Promise<{
  total: number
  mastered: number
  inProgress: number
  required: number
  unlocked: boolean
  progress: number // Percentage
  grammarPoints: Array<{
    id: string
    name: string
    srsLevel: number | null
    status: string | null
  }>
}> {
  const grammarPoints = await prisma.grammarPoint.findMany({
    where: grammarPointWhere({ group }, slice),
    select: { id: true, name: true },
  })

  const total = grammarPoints.length
  const grammarPointIds = grammarPoints.map((gp) => gp.id)

  // Get all progress for this group
  const allProgress = await prisma.grammarProgress.findMany({
    where: {
      userId,
      grammarPointId: { in: grammarPointIds },
    },
    select: {
      grammarPointId: true,
      srsLevel: true,
      status: true,
    },
  })

  // Create a map of grammar point ID to progress
  const progressMap = new Map(
    allProgress.map((p) => [p.grammarPointId, { srsLevel: p.srsLevel, status: p.status }])
  )

  const mastered = allProgress.filter((p) => p.status === 'mastered').length
  const inProgress = allProgress.filter(
    (p) => p.status === 'learning' || (p.status === 'new' && p.srsLevel > 0)
  ).length

  // Get grammar points with their SRS levels
  const grammarPointsWithProgress = grammarPoints.map((gp) => {
    const progress = progressMap.get(gp.id)
    return {
      id: gp.id,
      name: gp.name,
      srsLevel: progress?.srsLevel ?? null,
      status: progress?.status ?? null,
    }
  })

  const required = getRequiredMasteryCount(total)
  const unlocked = await canAccessGroup(userId, group + 1, slice) // Check if next group is unlocked
  const progress = total > 0 ? (mastered / total) * 100 : 0

  return {
    total,
    mastered,
    inProgress,
    required,
    unlocked: group === 1 ? true : unlocked, // Group 1 is always unlocked
    progress,
    grammarPoints: grammarPointsWithProgress,
  }
}
