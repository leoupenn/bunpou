import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface JLPTStats {
  total: number
  mastered: number
  inProgress: number
  notStarted: number
  percentage: number
}

interface SublevelStats {
  group: number
  total: number
  mastered: number
  inProgress: number
  notStarted: number
  percentage: number
  projectedCompletion: Date | null
}

interface DashboardStats {
  jlptLevels: {
    N5: JLPTStats
    N4: JLPTStats
    N3: JLPTStats
    N2: JLPTStats
    N1: JLPTStats
  }
  sublevels: SublevelStats[]
  overall: {
    totalGrammarPoints: number
    mastered: number
    inProgress: number
    notStarted: number
    overallPercentage: number
    learningVelocity: {
      perDay: number
      perWeek: number
    }
    estimatedCompletionDate: Date | null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Get all grammar points with their progress
    const allGrammarPoints = await prisma.grammarPoint.findMany({
      include: {
        grammarProgress: {
          where: { userId },
          take: 1,
        },
      },
      orderBy: [
        { jlptLevel: 'asc' },
        { group: 'asc' },
        { name: 'asc' },
      ],
    })

    // Initialize JLPT level stats
    const jlptStats: Record<string, JLPTStats> = {
      N5: { total: 0, mastered: 0, inProgress: 0, notStarted: 0, percentage: 0 },
      N4: { total: 0, mastered: 0, inProgress: 0, notStarted: 0, percentage: 0 },
      N3: { total: 0, mastered: 0, inProgress: 0, notStarted: 0, percentage: 0 },
      N2: { total: 0, mastered: 0, inProgress: 0, notStarted: 0, percentage: 0 },
      N1: { total: 0, mastered: 0, inProgress: 0, notStarted: 0, percentage: 0 },
    }

    // Initialize sublevel stats map
    const sublevelMap = new Map<number, SublevelStats>()

    // Process each grammar point
    for (const gp of allGrammarPoints) {
      const progress = gp.grammarProgress[0] || null
      const jlptLevel = gp.jlptLevel || 'N5'

      // Update JLPT stats
      if (jlptStats[jlptLevel]) {
        jlptStats[jlptLevel].total++
        if (!progress) {
          jlptStats[jlptLevel].notStarted++
        } else if (progress.status === 'mastered' || progress.srsLevel === 6) {
          jlptStats[jlptLevel].mastered++
        } else {
          jlptStats[jlptLevel].inProgress++
        }
      }

      // Update sublevel stats
      if (!sublevelMap.has(gp.group)) {
        sublevelMap.set(gp.group, {
          group: gp.group,
          total: 0,
          mastered: 0,
          inProgress: 0,
          notStarted: 0,
          percentage: 0,
          projectedCompletion: null,
        })
      }
      const sublevel = sublevelMap.get(gp.group)!
      sublevel.total++
      if (!progress) {
        sublevel.notStarted++
      } else if (progress.status === 'mastered' || progress.srsLevel === 6) {
        sublevel.mastered++
      } else {
        sublevel.inProgress++
      }
    }

    // Calculate percentages for JLPT levels
    for (const level of Object.keys(jlptStats)) {
      const stats = jlptStats[level]
      stats.percentage = stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0
    }

    // Calculate percentages and projected completion for sublevels
    const sublevels: SublevelStats[] = Array.from(sublevelMap.values())
      .map((sublevel) => {
        sublevel.percentage = sublevel.total > 0 ? (sublevel.mastered / sublevel.total) * 100 : 0
        return sublevel
      })
      .sort((a, b) => a.group - b.group)

    // Calculate learning velocity from mastered grammar points
    const masteredProgress = await prisma.grammarProgress.findMany({
      where: {
        userId,
        OR: [{ status: 'mastered' }, { srsLevel: 6 }],
      },
      orderBy: {
        updatedAt: 'asc',
      },
    })

    let learningVelocity = { perDay: 0, perWeek: 0 }
    let estimatedCompletionDate: Date | null = null

    if (masteredProgress.length > 0) {
      const firstMastered = masteredProgress[0].updatedAt || masteredProgress[0].createdAt
      const lastMastered = masteredProgress[masteredProgress.length - 1].updatedAt || masteredProgress[masteredProgress.length - 1].createdAt
      
      if (firstMastered && lastMastered) {
        const timeDiff = lastMastered.getTime() - firstMastered.getTime()
        const daysDiff = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)))

        if (daysDiff > 0) {
          learningVelocity.perDay = masteredProgress.length / daysDiff
          learningVelocity.perWeek = learningVelocity.perDay * 7

          // Calculate estimated completion date
          const totalMastered = masteredProgress.length
          const totalGrammarPoints = allGrammarPoints.length
          const remaining = totalGrammarPoints - totalMastered

          if (learningVelocity.perDay > 0 && remaining > 0) {
            const daysToComplete = Math.ceil(remaining / learningVelocity.perDay)
            estimatedCompletionDate = new Date()
            estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + daysToComplete)
          }
        } else if (masteredProgress.length === 1) {
          // If only one mastered item, use a default velocity estimate
          // Assume it took at least 1 day to master
          learningVelocity.perDay = 1
          learningVelocity.perWeek = 7
        }
      }
    }

    // Calculate projected completion for each sublevel
    for (const sublevel of sublevels) {
      if (learningVelocity.perDay > 0 && sublevel.notStarted + sublevel.inProgress > 0) {
        const remainingInSublevel = sublevel.notStarted + sublevel.inProgress
        const daysToComplete = Math.ceil(remainingInSublevel / learningVelocity.perDay)
        sublevel.projectedCompletion = new Date()
        sublevel.projectedCompletion.setDate(sublevel.projectedCompletion.getDate() + daysToComplete)
      }
    }

    // Calculate overall stats
    const totalGrammarPoints = allGrammarPoints.length
    const mastered = allGrammarPoints.filter(
      (gp) => gp.grammarProgress[0] && (gp.grammarProgress[0].status === 'mastered' || gp.grammarProgress[0].srsLevel === 6)
    ).length
    const inProgress = allGrammarPoints.filter(
      (gp) => gp.grammarProgress[0] && gp.grammarProgress[0].status !== 'mastered' && gp.grammarProgress[0].srsLevel !== 6
    ).length
    const notStarted = totalGrammarPoints - mastered - inProgress
    const overallPercentage = totalGrammarPoints > 0 ? (mastered / totalGrammarPoints) * 100 : 0

    const stats: DashboardStats = {
      jlptLevels: {
        N5: jlptStats.N5,
        N4: jlptStats.N4,
        N3: jlptStats.N3,
        N2: jlptStats.N2,
        N1: jlptStats.N1,
      },
      sublevels,
      overall: {
        totalGrammarPoints,
        mastered,
        inProgress,
        notStarted,
        overallPercentage,
        learningVelocity,
        estimatedCompletionDate,
      },
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}

