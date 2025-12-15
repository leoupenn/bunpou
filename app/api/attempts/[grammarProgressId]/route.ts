import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Get all attempts for a grammar progress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ grammarProgressId: string }> }
) {
  try {
    const { grammarProgressId } = await params
    
    if (!grammarProgressId) {
      return NextResponse.json(
        { error: 'grammarProgressId is required' },
        { status: 400 }
      )
    }

    const attempts = await prisma.attempt.findMany({
      where: {
        grammarProgressId: grammarProgressId,
      },
      include: {
        grammarPoint: {
          select: {
            id: true,
            name: true,
          },
        },
        situation: {
          select: {
            id: true,
            situation: true,
            lessonNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(attempts)
  } catch (error) {
    console.error('Error fetching attempts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attempts', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

