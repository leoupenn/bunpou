import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { evaluateSentence } from '@/lib/openai'
import { calculateNextReview } from '@/lib/srs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, grammarPointId, situationId, userSentence, attemptType = 'practice' } = body

    if (!userId || !grammarPointId || !userSentence) {
      return NextResponse.json(
        { error: 'userId, grammarPointId, and userSentence are required' },
        { status: 400 }
      )
    }

    // Get grammar point details
    const grammarPoint = await prisma.grammarPoint.findUnique({
      where: { id: grammarPointId },
      include: {
        situations: true,
      },
    })

    if (!grammarPoint) {
      return NextResponse.json(
        { error: 'Grammar point not found' },
        { status: 404 }
      )
    }

    // Get situation if provided, otherwise use first situation
    let situation = null
    if (situationId) {
      situation = await prisma.situation.findUnique({
        where: { id: situationId },
      })
      if (!situation || situation.grammarPointId !== grammarPointId) {
        return NextResponse.json(
          { error: 'Situation not found or does not belong to grammar point' },
          { status: 404 }
        )
      }
    } else if (grammarPoint.situations.length > 0) {
      // Use first situation if none specified
      situation = grammarPoint.situations[0]
    }

    if (!situation) {
      return NextResponse.json(
        { error: 'No situations found for this grammar point' },
        { status: 404 }
      )
    }

    // Get or create grammar progress
    let grammarProgress = await prisma.grammarProgress.findUnique({
      where: {
        userId_grammarPointId: {
          userId,
          grammarPointId,
        },
      },
    })

    if (!grammarProgress) {
      // New grammar point - start with first situation unlocked
      grammarProgress = await prisma.grammarProgress.create({
        data: {
          userId,
          grammarPointId,
          srsLevel: 0,
          status: 'new',
          unlockedSituationNumber: 1, // First situation unlocked
        },
      })
    }

    // Verify the situation is unlocked (skip for achievement_test as they can use any situation)
    if (attemptType !== 'achievement_test' && situation.lessonNumber > grammarProgress.unlockedSituationNumber) {
      return NextResponse.json(
        { error: 'This situation is not yet unlocked. Complete previous situations first.' },
        { status: 403 }
      )
    }

    // Evaluate sentence using OpenAI
    const evaluation = await evaluateSentence(
      grammarPoint.name,
      situation.situation,
      userSentence
    )

    // Create attempt record
    const attempt = await prisma.attempt.create({
      data: {
        userId,
        grammarPointId,
        situationId: situation.id,
        grammarProgressId: grammarProgress.id,
        userSentence,
        isCorrect: evaluation.isCorrect,
        feedback: evaluation.feedback,
        hints: evaluation.hints,
        corrections: evaluation.corrections,
        attemptType,
      },
    })

    // Update grammar progress based on attempt type
    if (attemptType === 'achievement_test') {
      // For achievement test, we'll handle the scoring in a separate endpoint
      // Just record the attempt here
    } else {
      // For practice and review, update SRS level
      const { newLevel, nextReviewAt } = calculateNextReview(
        grammarProgress.srsLevel,
        evaluation.isCorrect
      )

      let newStatus = grammarProgress.status
      if (grammarProgress.status === 'new' && evaluation.isCorrect) {
        newStatus = 'learning'
      }
      // If reaching level 6, set status to mastered
      if (newLevel === 6 && grammarProgress.status !== 'mastered') {
        newStatus = 'mastered'
      }

      // Unlock next situation if this was the highest unlocked situation
      // Completing any situation (regardless of correctness) unlocks the next one
      let newUnlockedSituationNumber = grammarProgress.unlockedSituationNumber
      if (situation.lessonNumber === grammarProgress.unlockedSituationNumber) {
        // Find the highest lessonNumber available
        const maxLessonNumber = Math.max(
          ...grammarPoint.situations.map((s) => s.lessonNumber),
          0
        )
        // Unlock the next situation if available
        if (grammarProgress.unlockedSituationNumber < maxLessonNumber) {
          newUnlockedSituationNumber = grammarProgress.unlockedSituationNumber + 1
        } else {
          // All situations already unlocked - keep at max for recycling
          newUnlockedSituationNumber = maxLessonNumber
        }
      }

      await prisma.grammarProgress.update({
        where: { id: grammarProgress.id },
        data: {
          srsLevel: newLevel,
          status: newStatus,
          unlockedSituationNumber: newUnlockedSituationNumber,
          lastSituationId: situation.id, // Track last situation for avoiding repetition
          nextReviewAt,
          lastReviewedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      attempt,
      evaluation,
    })
  } catch (error: any) {
    console.error('Error creating attempt:', error)
    
    // Return more detailed error information
    const errorMessage = error?.message || 'Failed to create attempt'
    const errorCode = error?.code || 'UNKNOWN_ERROR'
    
    // Handle specific Prisma errors
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate attempt detected', details: errorMessage },
        { status: 409 }
      )
    }
    
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference (foreign key constraint)', details: errorMessage },
        { status: 400 }
      )
    }
    
    // Handle OpenAI API errors
    if (error?.response?.status || error?.status) {
      return NextResponse.json(
        { error: 'OpenAI API error', details: errorMessage },
        { status: 502 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create attempt', 
        details: errorMessage,
        code: errorCode
      },
      { status: 500 }
    )
  }
}

