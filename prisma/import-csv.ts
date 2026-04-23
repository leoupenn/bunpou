import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

const WAVE_CHARS = ['〜', '～']

function stripLeadingWave(name: string): string {
  let s = name
  while (s.length > 0 && WAVE_CHARS.includes(s[0])) {
    s = s.slice(1)
  }
  return s.trim()
}

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

interface CSVRow {
  group: number
  grammarPoint: string
  lessonNumber: number
  situation: string
  wordBank: string
  difficulty: number
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n').filter((line) => line.trim())
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const fields = parseCSVLine(line)

    if (fields.length >= 6) {
      try {
        const group = parseInt(fields[0], 10)
        const grammarPoint = fields[1]
        const lessonNumber = parseInt(fields[2], 10)
        const situation = fields[3]
        const wordBank = fields[4]
        const difficulty = parseInt(fields[5], 10)

        if (!isNaN(group) && !isNaN(lessonNumber) && !isNaN(difficulty)) {
          rows.push({
            group,
            grammarPoint,
            lessonNumber,
            situation,
            wordBank,
            difficulty,
          })
        } else {
          console.warn(`Skipping row ${i + 1}: Invalid numeric values`, fields)
        }
      } catch (error) {
        console.warn(`Error parsing row ${i + 1}:`, error)
      }
    } else {
      console.warn(`Skipping row ${i + 1}: Insufficient fields (${fields.length})`, fields)
    }
  }

  return rows
}

/**
 * Match CSV grammar name to an existing row (e.g. CSV `てください` ↔ DB `〜てください`).
 * Does not rename the row; situations attach to the matched id.
 */
async function findGrammarPointForCsvName(csvName: string) {
  const exact = await prisma.grammarPoint.findUnique({
    where: { name: csvName },
  })
  if (exact) return exact

  const candidates: string[] = []
  if (!WAVE_CHARS.includes(csvName[0])) {
    candidates.push(`〜${csvName}`, `～${csvName}`)
  }
  const stripped = stripLeadingWave(csvName)
  if (stripped && stripped !== csvName) {
    candidates.push(stripped)
  }
  for (const c of candidates) {
    const g = await prisma.grammarPoint.findUnique({ where: { name: c } })
    if (g) return g
  }

  const key = stripLeadingWave(csvName)
  if (!key) return null
  const all = await prisma.grammarPoint.findMany({
    select: { id: true, name: true, description: true, group: true, jlptLevel: true },
  })
  return all.find((g) => stripLeadingWave(g.name) === key) ?? null
}

function grammarNameFilterSet(): Set<string> | null {
  const raw = process.env.GRAMMAR_NAME_FILTER?.trim()
  if (!raw) return null
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
}

function csvRowMatchesFilter(csvGrammarName: string, filter: Set<string>): boolean {
  for (const f of Array.from(filter)) {
    if (csvGrammarName === f) return true
    if (stripLeadingWave(csvGrammarName) === stripLeadingWave(f)) return true
  }
  return false
}

async function main() {
  const defaultCsvPath = path.join(
    '/Users/leo/Downloads',
    'Bunpou sublevels - N5 Situation and Vocab - Master Sheet.csv'
  )
  const csvPath = process.env.CSV_PATH?.trim() || defaultCsvPath

  console.log('Reading CSV file from:', csvPath)

  if (!fs.existsSync(csvPath)) {
    throw new Error(
      `CSV file not found at: ${csvPath}\nSet CSV_PATH to your Master Sheet, e.g. CSV_PATH=/path/to/sheet.csv`
    )
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content)

  console.log(`Parsed ${rows.length} rows from CSV`)

  const grammarPointMap = new Map<string, CSVRow[]>()
  for (const row of rows) {
    if (!grammarPointMap.has(row.grammarPoint)) {
      grammarPointMap.set(row.grammarPoint, [])
    }
    grammarPointMap.get(row.grammarPoint)!.push(row)
  }

  const filter = grammarNameFilterSet()
  if (filter) {
    for (const key of Array.from(grammarPointMap.keys())) {
      if (!csvRowMatchesFilter(key, filter)) {
        grammarPointMap.delete(key)
      }
    }
    console.log(`GRAMMAR_NAME_FILTER active — processing ${grammarPointMap.size} grammar point(s)`)
  }

  console.log(`Found ${grammarPointMap.size} unique grammar points`)

  let grammarPointsCreated = 0
  let grammarPointsUpdated = 0
  let situationsCreated = 0
  let situationsUpdated = 0
  let errors = 0

  const jlptLevel = process.env.JLPT_LEVEL?.trim() || 'N5'

  for (const [grammarPointName, situations] of Array.from(grammarPointMap.entries())) {
    try {
      const group = situations[0].group

      let grammarPoint = await findGrammarPointForCsvName(grammarPointName)

      if (grammarPoint) {
        grammarPoint = await prisma.grammarPoint.update({
          where: { id: grammarPoint.id },
          data: {
            description: grammarPointName,
            referenceUrl: '',
            group: group,
            jlptLevel: jlptLevel,
          },
        })
        grammarPointsUpdated++
        if (grammarPoint.name !== grammarPointName) {
          console.log(
            `  Matched CSV "${grammarPointName}" → existing DB name ${JSON.stringify(grammarPoint.name)} (${grammarPoint.id})`
          )
        }
      } else {
        grammarPoint = await prisma.grammarPoint.create({
          data: {
            name: grammarPointName,
            description: grammarPointName,
            referenceUrl: '',
            group: group,
            jlptLevel: jlptLevel,
          },
        })
        grammarPointsCreated++
      }

      for (const situationRow of situations) {
        try {
          const existingSituation = await prisma.situation.findFirst({
            where: {
              grammarPointId: grammarPoint.id,
              lessonNumber: situationRow.lessonNumber,
            },
          })

          if (existingSituation) {
            await prisma.situation.update({
              where: { id: existingSituation.id },
              data: {
                situation: situationRow.situation,
                wordBank: situationRow.wordBank,
                difficulty: situationRow.difficulty,
              },
            })
            situationsUpdated++
          } else {
            await prisma.situation.create({
              data: {
                grammarPointId: grammarPoint.id,
                lessonNumber: situationRow.lessonNumber,
                situation: situationRow.situation,
                wordBank: situationRow.wordBank,
                difficulty: situationRow.difficulty,
              },
            })
            situationsCreated++
          }
        } catch (error) {
          console.error(
            `Error importing situation for "${grammarPointName}" lesson ${situationRow.lessonNumber}:`,
            error
          )
          errors++
        }
      }

      if ((grammarPointsCreated + grammarPointsUpdated) % 10 === 0) {
        console.log(
          `Progress: ${grammarPointsCreated + grammarPointsUpdated}/${grammarPointMap.size} grammar points processed...`
        )
      }
    } catch (error) {
      console.error(`Error importing grammar point "${grammarPointName}":`, error)
      errors++
    }
  }

  console.log('\nImport completed!')
  console.log(`- Grammar Points Created: ${grammarPointsCreated}`)
  console.log(`- Grammar Points Updated: ${grammarPointsUpdated}`)
  console.log(`- Situations Created: ${situationsCreated}`)
  console.log(`- Situations Updated: ${situationsUpdated}`)
  console.log(`- Errors: ${errors}`)
  console.log(`- Total Grammar Points: ${grammarPointMap.size}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
