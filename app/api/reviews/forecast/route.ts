import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { grammarProgressWhere, resolveDemoSliceForUser } from '@/lib/demo-mode'
import { addDays, startOfDay, endOfDay, format, isSameDay } from 'date-fns'

export const dynamic = 'force-dynamic'

// Get review forecast
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const slice = await resolveDemoSliceForUser(userId)
    const now = new Date()
    const weekFromNow = addDays(now, 7)

    // Get regular reviews (levels 0-5)
    const grammarProgress = await prisma.grammarProgress.findMany({
      where: grammarProgressWhere(
        {
          userId,
          status: {
            in: ['learning', 'new'],
          },
          nextReviewAt: {
            not: null,
          },
        },
        slice
      ),
      include: {
        grammarPoint: true,
      },
    })

    // Get master reviews (level 6)
    const masterProgress = await prisma.grammarProgress.findMany({
      where: grammarProgressWhere(
        {
          userId,
          srsLevel: 6,
          status: 'mastered',
          nextReviewAt: {
            not: null,
          },
        },
        slice
      ),
      include: {
        grammarPoint: true,
      },
    })

    // Count current reviews (available now)
    const currentReviews = grammarProgress.filter(
      (gp) => gp.nextReviewAt && new Date(gp.nextReviewAt) <= now
    ).length

    const currentMasterReviews = masterProgress.filter(
      (gp) => gp.nextReviewAt && new Date(gp.nextReviewAt) <= now
    ).length

    // Organize regular reviews by day and hour
    const dailyForecast: Record<string, Record<number, number>> = {}
    
    grammarProgress.forEach((gp) => {
      if (!gp.nextReviewAt) return
      
      const reviewDate = new Date(gp.nextReviewAt)
      if (reviewDate > now && reviewDate <= weekFromNow) {
        const dayKey = format(reviewDate, 'yyyy-MM-dd')
        const hour = reviewDate.getHours()
        
        if (!dailyForecast[dayKey]) {
          dailyForecast[dayKey] = {}
        }
        dailyForecast[dayKey][hour] = (dailyForecast[dayKey][hour] || 0) + 1
      }
    })

    // Organize master reviews by day and hour
    const masterDailyForecast: Record<string, Record<number, number>> = {}
    
    masterProgress.forEach((gp) => {
      if (!gp.nextReviewAt) return
      
      const reviewDate = new Date(gp.nextReviewAt)
      if (reviewDate > now && reviewDate <= weekFromNow) {
        const dayKey = format(reviewDate, 'yyyy-MM-dd')
        const hour = reviewDate.getHours()
        
        if (!masterDailyForecast[dayKey]) {
          masterDailyForecast[dayKey] = {}
        }
        masterDailyForecast[dayKey][hour] = (masterDailyForecast[dayKey][hour] || 0) + 1
      }
    })

    // Calculate totals for each day
    const dailyTotals: Record<string, number> = {}
    Object.keys(dailyForecast).forEach((day) => {
      dailyTotals[day] = Object.values(dailyForecast[day]).reduce((sum, count) => sum + count, 0)
    })

    const masterDailyTotals: Record<string, number> = {}
    Object.keys(masterDailyForecast).forEach((day) => {
      masterDailyTotals[day] = Object.values(masterDailyForecast[day]).reduce((sum, count) => sum + count, 0)
    })

    return NextResponse.json({
      currentReviews,
      currentMasterReviews,
      dailyForecast,
      dailyTotals,
      masterDailyForecast,
      masterDailyTotals,
    })
  } catch (error) {
    console.error('Error fetching review forecast:', error)
    return NextResponse.json(
      { error: 'Failed to fetch review forecast' },
      { status: 500 }
    )
  }
}

