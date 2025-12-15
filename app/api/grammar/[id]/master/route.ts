import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Move grammar point to achievement test pile
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const grammarProgress = await prisma.grammarProgress.findUnique({
      where: {
        userId_grammarPointId: {
          userId,
          grammarPointId: params.id,
        },
      },
    })

    if (!grammarProgress) {
      return NextResponse.json(
        { error: 'Grammar progress not found' },
        { status: 404 }
      )
    }

    // Move to achievement test status
    const updated = await prisma.grammarProgress.update({
      where: { id: grammarProgress.id },
      data: {
        status: 'achievement_test',
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error moving to achievement test:', error)
    return NextResponse.json(
      { error: 'Failed to move to achievement test' },
      { status: 500 }
    )
  }
}

