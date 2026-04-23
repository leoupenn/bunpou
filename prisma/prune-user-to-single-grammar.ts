/**
 * Optional DB hygiene: for one user, delete GrammarProgress + Attempt rows
 * that are not for a single grammar point (e.g. てください).
 *
 * The app can already hide other curriculum via DEMO_ONLY_GRAMMAR_NAME +
 * DEMO_SLICE_EMAILS; this script shrinks rows in the database.
 *
 * Usage (public DATABASE_URL from Railway):
 *   export DATABASE_URL='postgresql://…'
 *   USER_EMAIL=lluan@andrew.cmu.edu GRAMMAR_NAME=てください npx tsx prisma/prune-user-to-single-grammar.ts
 *   … same with --apply
 */
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

const databaseUrlFromShell = process.env.DATABASE_URL
dotenv.config()
const localEnvPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true })
}
if (databaseUrlFromShell) {
  process.env.DATABASE_URL = databaseUrlFromShell
}

const prisma = new PrismaClient()

async function main() {
  const apply = process.argv.includes('--apply')
  const email = process.env.USER_EMAIL?.trim()
  const grammarName = (process.env.GRAMMAR_NAME ?? 'てください').trim()

  if (!email) {
    console.error('Set USER_EMAIL (e.g. USER_EMAIL=lluan@andrew.cmu.edu)')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user with email: ${email}`)
    process.exit(1)
  }

  const gp = await prisma.grammarPoint.findUnique({ where: { name: grammarName } })
  if (!gp) {
    console.error(
      `No GrammarPoint with name ${JSON.stringify(grammarName)}. List names in Prisma Studio or DB.`
    )
    process.exit(1)
  }

  const otherProgress = await prisma.grammarProgress.findMany({
    where: { userId: user.id, NOT: { grammarPointId: gp.id } },
    select: { id: true, grammarPointId: true },
  })
  const otherAttempts = await prisma.attempt.count({
    where: { userId: user.id, NOT: { grammarPointId: gp.id } },
  })

  console.log(`User: ${user.email} (${user.id})`)
  console.log(`Keep grammar point: ${grammarName} (${gp.id})`)
  console.log(`Would delete ${otherProgress.length} GrammarProgress rows (other points)`)
  console.log(`Would delete ${otherAttempts} Attempt rows (other points)`)

  const existingTarget = await prisma.grammarProgress.findUnique({
    where: {
      userId_grammarPointId: { userId: user.id, grammarPointId: gp.id },
    },
  })
  console.log(
    existingTarget
      ? `Target progress exists (${existingTarget.id}), status=${existingTarget.status}`
      : 'No progress row yet for target — will create on --apply'
  )

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to execute.')
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.attempt.deleteMany({
      where: { userId: user.id, NOT: { grammarPointId: gp.id } },
    })
    await tx.grammarProgress.deleteMany({
      where: { userId: user.id, NOT: { grammarPointId: gp.id } },
    })
    await tx.grammarProgress.upsert({
      where: {
        userId_grammarPointId: { userId: user.id, grammarPointId: gp.id },
      },
      create: {
        userId: user.id,
        grammarPointId: gp.id,
        srsLevel: 0,
        status: 'new',
        unlockedSituationNumber: 1,
      },
      update: {},
    })
  })

  const sitCount = await prisma.situation.count({ where: { grammarPointId: gp.id } })
  console.log(`\nDone. User now has only ${grammarName} (${sitCount} situations in DB).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
