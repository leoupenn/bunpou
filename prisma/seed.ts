import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a test user with a specific ID to match the app
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'dummy-hash-for-seed',
    },
  })

  console.log('Created user:', user.email)

  // Create sample grammar points
  const grammarPoints = [
    {
      name: '〜てください',
      description: 'Polite request form. Used to ask someone to do something politely.',
      referenceUrl: 'https://example.com/te-kudasai',
      group: 1,
      jlptLevel: 'N5',
    },
    {
      name: '〜たい',
      description: 'Expresses desire or want to do something.',
      referenceUrl: 'https://example.com/tai',
      group: 1,
      jlptLevel: 'N5',
    },
    {
      name: '〜なければならない',
      description: 'Expresses obligation or necessity. Must do something.',
      referenceUrl: 'https://example.com/nakereba-naranai',
      group: 1,
      jlptLevel: 'N5',
    },
    {
      name: '〜てもいい',
      description: 'Asking for or giving permission. "May I..." or "It\'s okay to..."',
      referenceUrl: 'https://example.com/temo-ii',
      group: 1,
      jlptLevel: 'N5',
    },
    {
      name: '〜ながら',
      description: 'Expresses doing two actions simultaneously. "While doing..."',
      referenceUrl: 'https://example.com/nagara',
      group: 1,
      jlptLevel: 'N5',
    },
  ]

  for (const gp of grammarPoints) {
    // Create grammar point
    const grammarPoint = await prisma.grammarPoint.upsert({
      where: { name: gp.name },
      update: {},
      create: {
        name: gp.name,
        description: gp.description,
        referenceUrl: gp.referenceUrl,
        group: gp.group,
        jlptLevel: gp.jlptLevel,
      },
    })

    // Learn / attempts require at least one Situation per grammar point (lesson 1).
    const hasLesson1 = await prisma.situation.findFirst({
      where: { grammarPointId: grammarPoint.id, lessonNumber: 1 },
    })
    if (!hasLesson1) {
      await prisma.situation.create({
        data: {
          grammarPointId: grammarPoint.id,
          lessonNumber: 1,
          situation: `Practice using 「${grammarPoint.name}」 in a natural Japanese sentence for this pattern.`,
          wordBank: `${grammarPoint.name}: pattern`,
          difficulty: 1,
        },
      })
      console.log(`Created situation (lesson 1) for: ${grammarPoint.name}`)
    }

    // Create initial progress for user (status: new) if it doesn't exist
    const existingProgress = await prisma.grammarProgress.findUnique({
      where: {
        userId_grammarPointId: {
          userId: user.id,
          grammarPointId: grammarPoint.id,
        },
      },
    })

    if (!existingProgress) {
      await prisma.grammarProgress.create({
        data: {
          userId: user.id,
          grammarPointId: grammarPoint.id,
          srsLevel: 0,
          status: 'new',
        },
      })
      console.log(`Created grammar point: ${grammarPoint.name}`)
    } else {
      console.log(`Grammar point already exists: ${grammarPoint.name}`)
    }
  }

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

