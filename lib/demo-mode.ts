import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Curriculum slice (e.g. on Railway):
 *
 * 1) Everyone sees only `DEMO_ONLY_GRAMMAR_NAME` when it is set and no allowlist vars.
 *
 * 2) Only some users see that slice when you set:
 *    - DEMO_SLICE_USER_IDS=cuid1,cuid2  and/or
 *    - DEMO_SLICE_EMAILS=email1,email2
 *
 * 3) Per-email grammar (e.g. Leo sees only だ・です while others use the global name):
 *    DEMO_SLICE_EMAIL_GRAMMAR_MAP=lluan@andrew.cmu.edu:だ・です
 *    (comma-separated pairs; grammar `name` must match Postgres exactly, e.g. だ・です with ・ U+30FB)
 *
 * For (2)+(3), `DEMO_ONLY_GRAMMAR_NAME` is the default grammar for allowlisted users
 * without a map entry. Map entry overrides for that email.
 */
const DEMO_ONLY_GRAMMAR_NAME = process.env.DEMO_ONLY_GRAMMAR_NAME?.trim()

const DEMO_SLICE_USER_IDS = (process.env.DEMO_SLICE_USER_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const DEMO_SLICE_EMAILS = (process.env.DEMO_SLICE_EMAILS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export type DemoSliceFlag = false | { grammarName: string }

export function demoGrammarName(): string | undefined {
  return DEMO_ONLY_GRAMMAR_NAME || undefined
}

export function isDemoGrammarSlice(): boolean {
  return Boolean(
    DEMO_ONLY_GRAMMAR_NAME || process.env.DEMO_SLICE_EMAIL_GRAMMAR_MAP?.trim()
  )
}

function sliceAllowlistConfigured(): boolean {
  return DEMO_SLICE_USER_IDS.length > 0 || DEMO_SLICE_EMAILS.length > 0
}

function parseEmailGrammarMap(): Map<string, string> {
  const raw = process.env.DEMO_SLICE_EMAIL_GRAMMAR_MAP?.trim()
  if (!raw) return new Map()
  const m = new Map<string, string>()
  for (const part of raw.split(',')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const idx = trimmed.indexOf(':')
    if (idx === -1) continue
    const email = trimmed.slice(0, idx).trim().toLowerCase()
    const grammar = trimmed.slice(idx + 1).trim()
    if (email && grammar) {
      m.set(email, grammar)
    }
  }
  return m
}

/**
 * Resolved grammar filter for this user, or false when they see the full curriculum.
 */
export async function resolveDemoSliceForUser(userId: string): Promise<DemoSliceFlag> {
  const globalName = demoGrammarName()
  const emailGrammar = parseEmailGrammarMap()

  if (!sliceAllowlistConfigured()) {
    if (!globalName) return false
    return { grammarName: globalName }
  }

  let userEmail: string | null = null
  let onList = false

  if (DEMO_SLICE_USER_IDS.includes(userId)) {
    onList = true
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    userEmail = u?.email?.toLowerCase() ?? null
  } else if (DEMO_SLICE_EMAILS.length > 0) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    if (u?.email && DEMO_SLICE_EMAILS.includes(u.email.toLowerCase())) {
      onList = true
      userEmail = u.email.toLowerCase()
    }
  }

  if (!onList) return false

  const mapped = userEmail ? emailGrammar.get(userEmail) : undefined
  const name = mapped ?? globalName
  if (!name) {
    // Allowlisted but no grammar to filter on → slice is off and this user sees the full catalog.
    console.warn(
      '[demo-mode] User is on DEMO_SLICE_* allowlist but no grammar name resolved. ' +
        'Set DEMO_ONLY_GRAMMAR_NAME and/or DEMO_SLICE_EMAIL_GRAMMAR_MAP for their email.'
    )
    return false
  }

  return { grammarName: name }
}

export function grammarPointWhere(
  base: Prisma.GrammarPointWhereInput = {},
  slice: DemoSliceFlag
): Prisma.GrammarPointWhereInput {
  if (slice === false) return base
  return { ...base, name: slice.grammarName }
}

export function grammarProgressWhere(
  base: Prisma.GrammarProgressWhereInput,
  slice: DemoSliceFlag
): Prisma.GrammarProgressWhereInput {
  if (slice === false) return base
  return {
    AND: [base, { grammarPoint: { name: slice.grammarName } }],
  }
}
