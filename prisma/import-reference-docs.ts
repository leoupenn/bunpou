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

interface CSVRow {
  grammarPoint: string
  referenceUrl: string
  additionalUrls: string[]
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
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

    if (fields.length >= 3) {
      const grammarPoint = fields[0].replace(/^"|"$/g, '').trim()
      const referenceUrl = fields[2].replace(/^"|"$/g, '').trim()
      const additionalUrls = fields
        .slice(3, 6)
        .map((url) => url.replace(/^"|"$/g, '').trim())
        .filter((url) => url && url.length > 0)

      if (grammarPoint && referenceUrl) {
        rows.push({
          grammarPoint,
          referenceUrl,
          additionalUrls,
        })
      } else {
        console.warn(`Skipping row ${i + 1}: Missing grammar point or URL`, {
          grammarPoint,
          referenceUrl,
        })
      }
    } else {
      console.warn(`Skipping row ${i + 1}: Insufficient fields (${fields.length})`, fields)
    }
  }

  return rows
}

async function main() {
  const fromEnv = process.env.REFERENCE_DOCS_CSV_PATH?.trim()
  const fromArgv = process.argv[2]?.trim()
  const csvPath =
    fromEnv ||
    fromArgv ||
    path.join(process.cwd(), 'reference-docs.csv')

  console.log('Reading reference-docs CSV from:', csvPath)

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}`)
    console.error('\nUsage:')
    console.error('  REFERENCE_DOCS_CSV_PATH=/path/to.csv npm run import-reference-docs')
    console.error('  npm run import-reference-docs -- /path/to.csv')
    console.error('\nUse public DATABASE_URL for production (Railway TCP proxy).')
    console.error('\nCSV format:')
    console.error('  Column 1: Grammar point name (should match sheet / DB; 〜 variants resolved)')
    console.error('  Column 2: Outdated names — ignored')
    console.error('  Column 3: Primary reference URL (https://...)')
    console.error('  Columns 4–6: Optional extra URLs (not stored yet; logged only)')
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content)

  console.log(`Parsed ${rows.length} rows from CSV\n`)

  let updated = 0
  let notFound = 0
  let errors = 0
  const notFoundList: string[] = []

  for (const row of rows) {
    try {
      const grammarPoint = await findGrammarPointBySheetName(prisma, row.grammarPoint)

      if (grammarPoint) {
        await prisma.grammarPoint.update({
          where: { id: grammarPoint.id },
          data: {
            referenceUrl: row.referenceUrl,
          },
        })
        const additionalInfo =
          row.additionalUrls.length > 0
            ? ` (${row.additionalUrls.length} additional URLs in CSV)`
            : ''
        const matched =
          grammarPoint.name !== row.grammarPoint
            ? ` (matched DB name ${JSON.stringify(grammarPoint.name)})`
            : ''
        console.log(`✓ Updated: ${row.grammarPoint}${matched}${additionalInfo}`)
        updated++
      } else {
        console.warn(`✗ Not found: ${row.grammarPoint}`)
        notFoundList.push(row.grammarPoint)
        notFound++
      }
    } catch (error) {
      console.error(`✗ Error updating ${row.grammarPoint}:`, error)
      errors++
    }
  }

  console.log('\n=== Summary ===')
  console.log(`✓ Updated: ${updated}`)
  console.log(`✗ Not found: ${notFound}`)
  if (notFoundList.length > 0) {
    console.log('\nGrammar points not found in database:')
    notFoundList.forEach((name) => console.log(`  - ${name}`))
  }
  console.log(`⚠ Errors: ${errors}`)
  console.log(`📊 Total processed: ${rows.length}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
