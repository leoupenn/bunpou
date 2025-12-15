import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
dotenv.config()
const vercelEnvPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(vercelEnvPath)) {
  dotenv.config({ path: vercelEnvPath, override: true })
}

const prisma = new PrismaClient()

async function main() {
  const dbUrl = process.env.DATABASE_URL || ''
  
  // Check which database we're connecting to
  if (dbUrl.startsWith('file:')) {
    console.log('⚠️  Warning: Connected to local SQLite database')
    console.log('   To reset production database, run: npx vercel env pull .env.local')
  } else if (dbUrl.startsWith('postgres')) {
    console.log('✅ Connected to PostgreSQL database (production)')
  } else {
    console.error('❌ DATABASE_URL not set or invalid!')
    console.log('   Set DATABASE_URL in .env or .env.local')
    process.exit(1)
  }
  
  console.log('\n🗑️  Resetting user database...')
  console.log('   This will delete:')
  console.log('   - All users')
  console.log('   - All attempts')
  console.log('   - All grammar progress')
  console.log('   Grammar points and situations will be preserved.\n')

  // Delete all attempts (these cascade from users, but being explicit)
  const deletedAttempts = await prisma.attempt.deleteMany({})
  console.log(`✅ Deleted ${deletedAttempts.count} attempts`)

  // Delete all grammar progress (these cascade from users, but being explicit)
  const deletedProgress = await prisma.grammarProgress.deleteMany({})
  console.log(`✅ Deleted ${deletedProgress.count} grammar progress entries`)

  // Delete all users
  const deletedUsers = await prisma.user.deleteMany({})
  console.log(`✅ Deleted ${deletedUsers.count} users`)

  console.log('\n✅ User database reset complete!')
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
