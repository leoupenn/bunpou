import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const grammarPoint = await prisma.grammarPoint.findUnique({
      where: { id: params.id },
      include: {
        situations: {
          orderBy: {
            lessonNumber: 'asc',
          },
        },
        grammarProgress: {
          where: {
            userId: request.nextUrl.searchParams.get('userId') || undefined,
          },
        },
      },
    })

    if (!grammarPoint) {
      return NextResponse.json(
        { error: 'Grammar point not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(grammarPoint)
  } catch (error) {
    console.error('Error fetching grammar point:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grammar point' },
      { status: 500 }
    )
  }
}

