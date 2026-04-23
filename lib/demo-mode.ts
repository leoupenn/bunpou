import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Vertical-slice demo: when set (e.g. on Railway), only this grammar point name
 * is loaded for lists, sublevels, learn, inventory, dashboard, reviews, etc.
 * Must match the `name` field on `GrammarPoint` exactly (e.g. `てください`).
 *
 * Example: DEMO_ONLY_GRAMMAR_NAME=てください
 *
 * Optional per-user restriction (everyone else sees the full curriculum):
 * - DEMO_SLICE_USER_IDS=comma-separated user cuid(s)
 * - DEMO_SLICE_EMAILS=comma-separated email(s), case-insensitive
 * If neither list is set, the demo name applies to all users (legacy behavior).
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

export function demoGrammarName(): string | undefined {
  return DEMO_ONLY_GRAMMAR_NAME || undefined
}

export function isDemoGrammarSlice(): boolean {
  return Boolean(DEMO_ONLY_GRAMMAR_NAME)
}

function sliceAllowlistConfigured(): boolean {
  return DEMO_SLICE_USER_IDS.length > 0 || DEMO_SLICE_EMAILS.length > 0
}

/**
 * Whether this user should see the demo grammar slice only.
 * - No DEMO_ONLY_GRAMMAR_NAME → false
 * - Demo name set, no allowlist → true for everyone
 * - Demo name + allowlist → true only for listed user id or email
 */
export async function resolveDemoSliceForUser(userId: string): Promise<boolean> {
  if (!DEMO_ONLY_GRAMMAR_NAME) return false
  if (!sliceAllowlistConfigured()) return true
  if (DEMO_SLICE_USER_IDS.includes(userId)) return true
  if (DEMO_SLICE_EMAILS.length > 0) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    if (u?.email && DEMO_SLICE_EMAILS.includes(u.email.toLowerCase())) return true
  }
  return false
}

export function grammarPointWhere(
  base: Prisma.GrammarPointWhereInput = {},
  demoActiveForUser: boolean
): Prisma.GrammarPointWhereInput {
  if (!DEMO_ONLY_GRAMMAR_NAME || !demoActiveForUser) return base
  return { ...base, name: DEMO_ONLY_GRAMMAR_NAME }
}

export function grammarProgressWhere(
  base: Prisma.GrammarProgressWhereInput,
  demoActiveForUser: boolean
): Prisma.GrammarProgressWhereInput {
  if (!DEMO_ONLY_GRAMMAR_NAME || !demoActiveForUser) return base
  return {
    AND: [base, { grammarPoint: { name: DEMO_ONLY_GRAMMAR_NAME } }],
  }
}
