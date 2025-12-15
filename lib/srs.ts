import { addHours, addDays } from 'date-fns'

export interface SRSConfig {
  level: number
  hoursUntilNext: number
}

// SRS timing configuration
// Level 0: New (immediate review)
// Level 1-5: Learning stages
// Level 6: Mastered (1 week review interval)
export const SRS_LEVELS: Record<number, SRSConfig> = {
  0: { level: 0, hoursUntilNext: 0 }, // Immediate
  1: { level: 1, hoursUntilNext: 2 }, // 2 hours
  2: { level: 2, hoursUntilNext: 4 }, // 4 hours
  3: { level: 3, hoursUntilNext: 12 }, // 12 hours
  4: { level: 4, hoursUntilNext: 24 }, // 24 hours (1 day)
  5: { level: 5, hoursUntilNext: 72 }, // 72 hours (3 days)
  6: { level: 6, hoursUntilNext: 168 }, // 168 hours (1 week)
}

export function calculateNextReview(currentLevel: number, isCorrect: boolean): {
  newLevel: number
  nextReviewAt: Date
} {
  let newLevel: number
  if (currentLevel === 6) {
    // Mastered items (level 6) cannot drop below level 6
    // They stay at level 6 regardless of correctness
    newLevel = 6
  } else if (isCorrect) {
    // Move up one level
    newLevel = Math.min(currentLevel + 1, 6)
  } else {
    // Move down one level (minimum 0)
    newLevel = Math.max(currentLevel - 1, 0)
  }

  const config = SRS_LEVELS[newLevel]
  const nextReviewAt = addHours(new Date(), config.hoursUntilNext)

  return {
    newLevel,
    nextReviewAt,
  }
}

export function getReviewsForTimeRange(
  reviews: Array<{ nextReviewAt: Date | null }>,
  startDate: Date,
  endDate: Date
): Map<number, number> {
  const hourlyCounts = new Map<number, number>()

  reviews.forEach((review) => {
    if (!review.nextReviewAt) return

    const reviewDate = new Date(review.nextReviewAt)
    if (reviewDate >= startDate && reviewDate <= endDate) {
      const hour = reviewDate.getHours()
      hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1)
    }
  })

  return hourlyCounts
}

