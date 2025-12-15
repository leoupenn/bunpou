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
    },
  })

  console.log('Created user:', user.email)

  // Create sample grammar points
  const grammarPoints = [
    {
      name: '〜てください',
      description: 'Polite request form. Used to ask someone to do something politely.',
      referenceUrl: 'https://example.com/te-kudasai',
      situation: 'You want to ask your teacher to repeat the question.',
    },
    {
      name: '〜たい',
      description: 'Expresses desire or want to do something.',
      referenceUrl: 'https://example.com/tai',
      situation: 'You want to express that you want to eat sushi.',
    },
    {
      name: '〜なければならない',
      description: 'Expresses obligation or necessity. Must do something.',
      referenceUrl: 'https://example.com/nakereba-naranai',
      situation: 'You need to express that you must study for the exam.',
    },
    {
      name: '〜てもいい',
      description: 'Asking for or giving permission. "May I..." or "It\'s okay to..."',
      referenceUrl: 'https://example.com/temo-ii',
      situation: 'You want to ask if you can leave early.',
    },
    {
      name: '〜ながら',
      description: 'Expresses doing two actions simultaneously. "While doing..."',
      referenceUrl: 'https://example.com/nagara',
      situation: 'You want to say you listen to music while studying.',
    },
  ]

  for (const gp of grammarPoints) {
    // Create grammar point
    const grammarPoint = await prisma.grammarPoint.upsert({
      where: { id: `gp-${gp.name.replace(/[^a-zA-Z0-9]/g, '-')}` },
      update: {},
      create: {
        id: `gp-${gp.name.replace(/[^a-zA-Z0-9]/g, '-')}`,
        ...gp,
      },
    })

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

