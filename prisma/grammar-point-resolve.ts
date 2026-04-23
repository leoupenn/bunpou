import type { PrismaClient } from '@prisma/client'

const WAVE_CHARS = ['〜', '～']

export function stripLeadingWave(name: string): string {
  let s = name
  while (s.length > 0 && WAVE_CHARS.includes(s[0])) {
    s = s.slice(1)
  }
  return s.trim()
}

/**
 * Match a CSV / sheet grammar label to an existing GrammarPoint (e.g. てください ↔ 〜てください).
 */
export async function findGrammarPointBySheetName(
  prisma: PrismaClient,
  sheetName: string
) {
  const exact = await prisma.grammarPoint.findUnique({
    where: { name: sheetName },
  })
  if (exact) return exact

  const candidates: string[] = []
  if (sheetName.length > 0 && !WAVE_CHARS.includes(sheetName[0])) {
    candidates.push(`〜${sheetName}`, `～${sheetName}`)
  }
  const stripped = stripLeadingWave(sheetName)
  if (stripped && stripped !== sheetName) {
    candidates.push(stripped)
  }
  for (const c of candidates) {
    const g = await prisma.grammarPoint.findUnique({ where: { name: c } })
    if (g) return g
  }

  const key = stripLeadingWave(sheetName)
  if (!key) return null
  const all = await prisma.grammarPoint.findMany({
    select: { id: true, name: true },
  })
  return all.find((g) => stripLeadingWave(g.name) === key) ?? null
}
