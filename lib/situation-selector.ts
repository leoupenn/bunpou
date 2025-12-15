import { prisma } from './prisma'

interface Situation {
  id: string
  lessonNumber: number
  situation: string
  wordBank: string
  difficulty: number
}

/**
 * Get the next situation to use for a grammar point
 * - Returns unlocked situations only
 * - If all situations unlocked, randomly selects avoiding direct repetition
 */
export async function getNextSituation(
  grammarProgressId: string,
  grammarPointId: string,
  unlockedSituationNumber: number,
  lastSituationId: string | null
): Promise<Situation | null> {
  // Get all situations for this grammar point, ordered by lessonNumber
  const allSituations = await prisma.situation.findMany({
    where: { grammarPointId },
    orderBy: { lessonNumber: 'asc' },
  })

  if (allSituations.length === 0) {
    return null
  }

  // Get unlocked situations (lessonNumber <= unlockedSituationNumber)
  const unlockedSituations = allSituations.filter(
    (s) => s.lessonNumber <= unlockedSituationNumber
  )

  if (unlockedSituations.length === 0) {
    return null
  }

  // If not all situations are unlocked, return the highest unlocked situation
  // (This is the one they should complete to unlock the next)
  if (unlockedSituationNumber < allSituations.length) {
    // Return the highest unlocked situation (lessonNumber == unlockedSituationNumber)
    const highestUnlocked = unlockedSituations.find(
      (s) => s.lessonNumber === unlockedSituationNumber
    )
    return highestUnlocked || unlockedSituations[unlockedSituations.length - 1]
  }

  // All situations unlocked - random recycling
  // Filter out the last situation used to avoid direct repetition
  const availableSituations = lastSituationId
    ? unlockedSituations.filter((s) => s.id !== lastSituationId)
    : unlockedSituations

  // If only one situation or all were filtered out, allow any
  if (availableSituations.length === 0) {
    // Fallback: if last situation was the only one, allow it
    return unlockedSituations[Math.floor(Math.random() * unlockedSituations.length)]
  }

  // Randomly select from available situations
  const randomIndex = Math.floor(Math.random() * availableSituations.length)
  return availableSituations[randomIndex]
}

/**
 * Get all unlocked situations for a grammar point
 */
export function getUnlockedSituations(
  allSituations: Situation[],
  unlockedSituationNumber: number
): Situation[] {
  return allSituations.filter((s) => s.lessonNumber <= unlockedSituationNumber)
}
