/**
 * Wipe all Attempt + GrammarProgress for one user, then create a single fresh
 * GrammarProgress row for the demo grammar point (matches production slice).
 *
 * Railway demo env stays unchanged — this only resets DB progress for the user.
 *
 * Resolve grammar name (first match wins):
 *   1. GRAMMAR_NAME=…
 *   2. DEMO_SLICE_EMAIL_GRAMMAR_MAP entry for USER_EMAIL (same format as app)
 *   3. DEMO_ONLY_GRAMMAR_NAME
 *
 * Usage (public DATABASE_URL):
 *   export DATABASE_URL='postgresql://…'
 *   USER_EMAIL=lluan@andrew.cmu.edu GRAMMAR_NAME=だ・です npm run reset-user-demo-progress -- --apply
 *
 * Or pull grammar from the same env vars as Railway (no GRAMMAR_NAME):
 *   USER_EMAIL=lluan@andrew.cmu.edu DEMO_ONLY_GRAMMAR_NAME=だ・です npm run reset-user-demo-progress -- --apply
 */
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { findGrammarPointBySheetName } from './grammar-point-resolve'

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

function grammarFromEmailMap(email: string): string | undefined {
  const raw = process.env.DEMO_SLICE_EMAIL_GRAMMAR_MAP?.trim()
  if (!raw) return undefined
  const lower = email.toLowerCase()
  for (const part of raw.split(',')) {
    const t = part.trim()
    const idx = t.indexOf(':')
    if (idx === -1) continue
    const e = t.slice(0, idx).trim().toLowerCase()
    const g = t.slice(idx + 1).trim()
    if (e === lower && g) return g
  }
  return undefined
}

function resolveGrammarName(email: string): string | undefined {
  const explicit = process.env.GRAMMAR_NAME?.trim()
  if (explicit) return explicit
  const mapped = grammarFromEmailMap(email)
  if (mapped) return mapped
  const demo = process.env.DEMO_ONLY_GRAMMAR_NAME?.trim()
  if (demo) return demo
  return undefined
}

async function main() {
  const apply = process.argv.includes('--apply')
  const email = process.env.USER_EMAIL?.trim()

  if (!email) {
    console.error('Set USER_EMAIL (e.g. USER_EMAIL=lluan@andrew.cmu.edu)')
    process.exit(1)
  }

  const grammarName = resolveGrammarName(email)
  if (!grammarName) {
    console.error(
      'Could not resolve grammar point name. Set one of: GRAMMAR_NAME, DEMO_SLICE_EMAIL_GRAMMAR_MAP (for this email), or DEMO_ONLY_GRAMMAR_NAME'
    )
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user with email: ${email}`)
    process.exit(1)
  }

  const gp = await findGrammarPointBySheetName(prisma, grammarName)
  if (!gp) {
    console.error(
      `No GrammarPoint matching ${JSON.stringify(grammarName)}. Check DB names (e.g. だ・です vs 〜).`
    )
    process.exit(1)
  }

  const attemptCount = await prisma.attempt.count({ where: { userId: user.id } })
  const progressCount = await prisma.grammarProgress.count({ where: { userId: user.id } })

  console.log(`User: ${user.email} (${user.id})`)
  console.log(`Demo grammar (resolved): ${JSON.stringify(grammarName)} → DB ${JSON.stringify(gp.name)} (${gp.id})`)
  console.log(`Would delete ${attemptCount} attempts, ${progressCount} grammar progress rows`)
  console.log(`Would create fresh GrammarProgress for that grammar point (new, lesson 1 unlocked)`)

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to execute.')
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.attempt.deleteMany({ where: { userId: user.id } })
    await tx.grammarProgress.deleteMany({ where: { userId: user.id } })
    const now = new Date()
    const nextReviewAt = new Date(now.getTime() - 1000)
    await tx.grammarProgress.create({
      data: {
        userId: user.id,
        grammarPointId: gp.id,
        srsLevel: 0,
        status: 'new',
        unlockedSituationNumber: 1,
        lastSituationId: null,
        nextReviewAt,
        lastReviewedAt: null,
      },
    })
  })

  console.log('\nDone. Progress reset; demo slice unchanged (Railway env).')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
