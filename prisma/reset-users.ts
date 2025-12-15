import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Resetting user database...')

  // Delete all attempts (these cascade from users, but being explicit)
  const deletedAttempts = await prisma.attempt.deleteMany({})
  console.log(`Deleted ${deletedAttempts.count} attempts`)

  // Delete all grammar progress (these cascade from users, but being explicit)
  const deletedProgress = await prisma.grammarProgress.deleteMany({})
  console.log(`Deleted ${deletedProgress.count} grammar progress entries`)

  // Delete all users
  const deletedUsers = await prisma.user.deleteMany({})
  console.log(`Deleted ${deletedUsers.count} users`)

  console.log('✅ User database reset complete!')
  console.log('Grammar points and situations have been preserved.')
}

main()
  .catch((e) => {
    console.error('Error resetting database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
