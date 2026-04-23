import { PrismaClient } from '@prisma/client'
import type { GrammarProgress } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load env like other prisma scripts in this repo.
// If DATABASE_URL was set in the shell (e.g. Railway export), never let .env.local override it.
const databaseUrlFromShell = process.env.DATABASE_URL
dotenv.config()
const localEnvPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true })
}
if (databaseUrlFromShell) {
  process.env.DATABASE_URL = databaseUrlFromShell
}

normalizeDatabaseUrl()

const prisma = new PrismaClient()

// Leading characters that mark a "〜X" duplicate produced by prisma/seed.ts.
// We merge these into their canonical name (the row without the leading mark).
const WAVE_CHARS = ['〜', '～']

/** Trim, strip wrapping quotes, remove newlines — common paste mistakes. */
function normalizeDatabaseUrl(): void {
  let u = process.env.DATABASE_URL
  if (u === undefined || u === null) return

  u = u.trim().replace(/^\uFEFF/, '')
  while (
    (u.startsWith('"') && u.endsWith('"')) ||
    (u.startsWith("'") && u.endsWith("'"))
  ) {
    u = u.slice(1, -1).trim()
  }
  const ldq = '\u201C'
  const rdq = '\u201D'
  if (u.startsWith(ldq) && u.endsWith(rdq)) {
    u = u.slice(1, -1).trim()
  }
  u = u.replace(/[\r\n]+/g, '')

  if (/\u2026/.test(u) || u.includes('…')) {
    console.error(
      'DATABASE_URL contains an ellipsis (…). That usually means placeholder text was pasted instead of the full URL.'
    )
    console.error('In Railway: Postgres (or your service) → Variables → copy DATABASE_URL in full.')
    process.exit(1)
  }
  if (/from\s+railway/i.test(u)) {
    console.error(
      'DATABASE_URL still contains the words "from Railway" — paste only the connection string, not the surrounding instructions.'
    )
    process.exit(1)
  }

  process.env.DATABASE_URL = u
}

function stripLeadingWave(name: string): string {
  let s = name
  while (s.length > 0 && WAVE_CHARS.includes(s[0])) {
    s = s.slice(1)
  }
  return s.trim()
}

const STATUS_RANK: Record<string, number> = {
  new: 0,
  learning: 1,
  achievement_test: 2,
  mastered: 3,
}

type ProgressRow = GrammarProgress

function pickBetterProgress(a: ProgressRow, b: ProgressRow): ProgressRow {
  if (!a) return b
  if (!b) return a
  if (a.srsLevel !== b.srsLevel) return a.srsLevel > b.srsLevel ? a : b
  const ra = STATUS_RANK[a.status] ?? 0
  const rb = STATUS_RANK[b.status] ?? 0
  if (ra !== rb) return ra > rb ? a : b
  if (a.unlockedSituationNumber !== b.unlockedSituationNumber) {
    return a.unlockedSituationNumber > b.unlockedSituationNumber ? a : b
  }
  const ta = a.lastReviewedAt?.getTime?.() ?? 0
  const tb = b.lastReviewedAt?.getTime?.() ?? 0
  return ta >= tb ? a : b
}

function redactDbUrl(url: string): string {
  try {
    const forParse = url.replace(/^postgres(ql)?:/i, 'http:')
    const u = new URL(forParse)
    const host = u.host
    const db = u.pathname.replace(/^\//, '')
    return `${u.protocol}//***:***@${host}/${db}`
  } catch {
    return '(unparseable DATABASE_URL)'
  }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const mode = apply ? 'APPLY' : 'DRY-RUN'
  const dbUrl = process.env.DATABASE_URL || ''

  console.log(`Mode: ${mode}`)
  console.log(`DATABASE_URL: ${redactDbUrl(dbUrl)}`)
  if (!apply) {
    console.log('(Re-run with --apply to actually write changes.)')
  }
  console.log('')

  let all: { id: string; name: string }[]
  try {
    all = await prisma.grammarPoint.findMany({
      select: { id: true, name: true },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (
      msg.includes('database string is invalid') ||
      msg.includes('invalid domain character') ||
      msg.includes('Error parsing connection string')
    ) {
      console.error('\nDATABASE_URL could not be parsed by Prisma. Common causes:\n')
      console.error(
        '  • Pasted placeholder text (… ) or a truncated URL — copy the full value from Railway → Variables.'
      )
      console.error(
        '  • Password contains @ : / ? # % & — those must be percent-encoded in the user:password part.'
      )
      console.error(
        '    Encode the password only:  node -e \'console.log(encodeURIComponent("YOUR_PASSWORD"))\''
      )
      console.error('  • Smart/curly quotes or line breaks inside the URL — use plain ASCII and one line.\n')
    }
    throw e
  }
  const byName = new Map(all.map((gp) => [gp.name, gp]))

  const sources = all.filter(
    (gp) => gp.name.length > 0 && WAVE_CHARS.includes(gp.name[0])
  )
  if (sources.length === 0) {
    console.log('No wave-dash grammar points found. Nothing to merge on this database.')
    console.log('')
    console.log(
      'If the live site still shows seed text like "Practice using 「〜…」 in a natural Japanese sentence",'
    )
    console.log(
      'that deploy is almost certainly using a different DATABASE_URL than this one.'
    )
    console.log('Pull production env (e.g. `npx vercel env pull .env.production --environment=production`)')
    console.log('and run again with: DATABASE_URL="…" npm run merge-duplicates [-- --apply]')
    console.log('')

    const seedLike = await prisma.situation.findMany({
      where: {
        situation: {
          contains: 'Practice using',
          mode: 'insensitive',
        },
      },
      take: 30,
      select: {
        id: true,
        lessonNumber: true,
        situation: true,
        grammarPoint: { select: { id: true, name: true } },
      },
    })
    if (seedLike.length > 0) {
      console.log(
        `Diagnostics: ${seedLike.length} situation(s) on THIS DB match "Practice using" (seed-style):`
      )
      for (const s of seedLike) {
        console.log(
          `  - ${JSON.stringify(s.grammarPoint.name)} (gp=${s.grammarPoint.id}) L${s.lessonNumber} sit=${s.id}`
        )
      }
    } else {
      console.log(
        'Diagnostics: no situations on this DB contain "Practice using" — curriculum looks imported, not seeded.'
      )
    }

    const normalized = new Map<string, string[]>()
    for (const gp of all) {
      const key = stripLeadingWave(gp.name)
      if (!key) continue
      const arr = normalized.get(key) ?? []
      arr.push(gp.name)
      normalized.set(key, arr)
    }
    const dupes = [...normalized.entries()].filter(([, names]) => names.length > 1)
    if (dupes.length > 0) {
      console.log('')
      console.log(
        `Diagnostics: ${dupes.length} normalized name(s) map to multiple GrammarPoint rows (manual review):`
      )
      for (const [key, names] of dupes.slice(0, 25)) {
        console.log(`  - ${JSON.stringify(key)}: ${names.map((n) => JSON.stringify(n)).join(', ')}`)
      }
      if (dupes.length > 25) console.log(`  … and ${dupes.length - 25} more`)
    }

    return
  }

  console.log(`Found ${sources.length} wave-dash grammar points to process.\n`)

  let merged = 0
  let renamed = 0
  let skipped = 0

  for (const source of sources) {
    const canonical = stripLeadingWave(source.name)
    if (!canonical) {
      console.log(
        `SKIP: ${JSON.stringify(source.name)} (id=${source.id}) — canonical name is empty\n`
      )
      skipped++
      continue
    }

    const target = byName.get(canonical)

    // Case A: no canonical counterpart -> just rename.
    if (!target) {
      console.log(
        `RENAME: ${JSON.stringify(source.name)} -> ${JSON.stringify(canonical)} (id=${source.id})`
      )
      if (apply) {
        await prisma.grammarPoint.update({
          where: { id: source.id },
          data: { name: canonical },
        })
        // Keep byName up to date in case another wave variant maps to this name.
        byName.delete(source.name)
        byName.set(canonical, { id: source.id, name: canonical })
      }
      renamed++
      console.log('')
      continue
    }

    if (target.id === source.id) {
      skipped++
      continue
    }

    console.log(
      `MERGE: ${JSON.stringify(source.name)} (${source.id})  ->  ${JSON.stringify(target.name)} (${target.id})`
    )

    const [srcSituations, tgtSituations, srcProgress, tgtProgress, srcAttemptCount] =
      await Promise.all([
        prisma.situation.findMany({ where: { grammarPointId: source.id } }),
        prisma.situation.findMany({ where: { grammarPointId: target.id } }),
        prisma.grammarProgress.findMany({ where: { grammarPointId: source.id } }),
        prisma.grammarProgress.findMany({ where: { grammarPointId: target.id } }),
        prisma.attempt.count({ where: { grammarPointId: source.id } }),
      ])

    console.log(
      `  source: ${srcSituations.length} situations, ${srcProgress.length} progress, ${srcAttemptCount} attempts`
    )
    console.log(
      `  target: ${tgtSituations.length} situations, ${tgtProgress.length} progress`
    )

    const tgtSituationByLesson = new Map(
      tgtSituations.map((s) => [s.lessonNumber, s])
    )
    const tgtProgressByUser = new Map(tgtProgress.map((p) => [p.userId, p]))

    type SituationAction =
      | { kind: 'reparent'; src: (typeof srcSituations)[number] }
      | {
          kind: 'replace'
          src: (typeof srcSituations)[number]
          tgt: (typeof tgtSituations)[number]
        }

    const situationActions: SituationAction[] = srcSituations.map((s) => {
      const existing = tgtSituationByLesson.get(s.lessonNumber)
      if (existing) return { kind: 'replace', src: s, tgt: existing }
      return { kind: 'reparent', src: s }
    })

    type ProgressAction =
      | { kind: 'reparent'; src: (typeof srcProgress)[number] }
      | {
          kind: 'merge'
          src: (typeof srcProgress)[number]
          tgt: (typeof tgtProgress)[number]
          winnerIsSource: boolean
        }

    const progressActions: ProgressAction[] = srcProgress.map((p) => {
      const existing = tgtProgressByUser.get(p.userId)
      if (!existing) return { kind: 'reparent', src: p }
      const winner = pickBetterProgress(p as any, existing as any) as any
      return {
        kind: 'merge',
        src: p,
        tgt: existing,
        winnerIsSource: winner?.id === p.id,
      }
    })

    for (const a of situationActions) {
      if (a.kind === 'replace') {
        console.log(
          `  situation L${a.src.lessonNumber}: KEEP target, delete source (${a.src.id})`
        )
      } else {
        console.log(
          `  situation L${a.src.lessonNumber}: reparent source (${a.src.id}) onto target`
        )
      }
    }
    for (const a of progressActions) {
      if (a.kind === 'merge') {
        console.log(
          `  progress user=${a.src.userId}: merge (winner=${a.winnerIsSource ? 'source' : 'target'}), delete source progress ${a.src.id}`
        )
      } else {
        console.log(
          `  progress user=${a.src.userId}: reparent source progress ${a.src.id} onto target`
        )
      }
    }

    if (!apply) {
      console.log('')
      merged++
      continue
    }

    await prisma.$transaction(async (tx) => {
      // 1. Move all Attempts off the source grammar point first so the final
      //    source-grammarPoint delete does not cascade-destroy them.
      const a1 = await tx.attempt.updateMany({
        where: { grammarPointId: source.id },
        data: { grammarPointId: target.id },
      })
      console.log(`    attempts.grammarPointId repointed: ${a1.count}`)

      // 2. For every lesson collision, move attempts onto the target situation
      //    *before* we delete the source situation (cascade would nuke them).
      for (const a of situationActions) {
        if (a.kind === 'replace') {
          const r = await tx.attempt.updateMany({
            where: { situationId: a.src.id },
            data: { situationId: a.tgt.id },
          })
          if (r.count > 0) {
            console.log(
              `    attempts.situationId ${a.src.id} -> ${a.tgt.id}: ${r.count}`
            )
          }
        }
      }

      // 3. Handle progress rows. For merges we must first repoint attempts,
      //    then delete the source progress so unique(userId, grammarPointId)
      //    won't collide when we repoint the survivors in step 4.
      for (const a of progressActions) {
        if (a.kind === 'merge') {
          if (a.winnerIsSource) {
            // Copy source progress onto target row, then delete source.
            await tx.grammarProgress.update({
              where: { id: a.tgt.id },
              data: {
                srsLevel: a.src.srsLevel,
                status: a.src.status,
                unlockedSituationNumber: Math.max(
                  a.src.unlockedSituationNumber,
                  a.tgt.unlockedSituationNumber
                ),
                lastSituationId: a.src.lastSituationId,
                nextReviewAt: a.src.nextReviewAt,
                lastReviewedAt: a.src.lastReviewedAt,
              },
            })
          }
          const rp = await tx.attempt.updateMany({
            where: { grammarProgressId: a.src.id },
            data: { grammarProgressId: a.tgt.id },
          })
          if (rp.count > 0) {
            console.log(
              `    attempts.grammarProgressId ${a.src.id} -> ${a.tgt.id}: ${rp.count}`
            )
          }
          await tx.grammarProgress.delete({ where: { id: a.src.id } })
        }
      }

      // 4. Reparent surviving source progress rows onto target grammar point.
      for (const a of progressActions) {
        if (a.kind === 'reparent') {
          await tx.grammarProgress.update({
            where: { id: a.src.id },
            data: { grammarPointId: target.id },
          })
        }
      }

      // 5. Handle situations. Replace-collisions get deleted (attempts already moved).
      //    Reparented ones get their grammarPointId changed.
      for (const a of situationActions) {
        if (a.kind === 'replace') {
          await tx.situation.delete({ where: { id: a.src.id } })
        } else {
          await tx.situation.update({
            where: { id: a.src.id },
            data: { grammarPointId: target.id },
          })
        }
      }

      // 6. Clean up any dangling lastSituationId references to now-deleted
      //    source situations on the target grammar point.
      const deletedSituationIds = situationActions
        .filter((a): a is Extract<SituationAction, { kind: 'replace' }> => a.kind === 'replace')
        .map((a) => a.src.id)
      if (deletedSituationIds.length > 0) {
        await tx.grammarProgress.updateMany({
          where: {
            grammarPointId: target.id,
            lastSituationId: { in: deletedSituationIds },
          },
          data: { lastSituationId: null },
        })
      }

      // 7. Finally, remove the now-empty source grammar point.
      await tx.grammarPoint.delete({ where: { id: source.id } })
    })

    console.log(`  merged and deleted ${JSON.stringify(source.name)}\n`)
    merged++
  }

  console.log('----')
  console.log(`Done. merged=${merged} renamed=${renamed} skipped=${skipped}`)
  if (!apply) {
    console.log('(Nothing was written — this was a dry run.)')
  }
}

main()
  .catch((e) => {
    console.error('Merge failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
