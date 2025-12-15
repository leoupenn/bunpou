import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

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

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const fields = parseCSVLine(line)

    if (fields.length >= 3) {
      // Column 1: Grammar Point (live names)
      const grammarPoint = fields[0].replace(/^"|"$/g, '').trim()
      // Column 3: First reference URL (column 2 is outdated names, skip it)
      const referenceUrl = fields[2].replace(/^"|"$/g, '').trim()
      // Columns 4-6: Additional URLs (optional)
      const additionalUrls = fields.slice(3, 6)
        .map(url => url.replace(/^"|"$/g, '').trim())
        .filter(url => url && url.length > 0)

      if (grammarPoint && referenceUrl) {
        rows.push({
          grammarPoint,
          referenceUrl,
          additionalUrls,
        })
      } else {
        console.warn(`Skipping row ${i + 1}: Missing grammar point or URL`, { grammarPoint, referenceUrl })
      }
    } else {
      console.warn(`Skipping row ${i + 1}: Insufficient fields (${fields.length})`, fields)
    }
  }

  return rows
}

async function main() {
  // Default path - user can modify this or pass as argument
  const csvPath = process.argv[2] || path.join(process.cwd(), 'reference-docs.csv')

  console.log('Reading CSV file from:', csvPath)

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}`)
    console.error('Usage: npm run import-reference-docs <path-to-csv>')
    console.error('Or: npx tsx prisma/import-reference-docs.ts <path-to-csv>')
    console.error('\nCSV format expected:')
    console.error('  Column 1: Grammar Point (live names)')
    console.error('  Column 2: Grammar Point (outdated names) - ignored')
    console.error('  Column 3: Reference URL (primary)')
    console.error('  Columns 4-6: Additional URLs (optional) - only first URL is used')
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content)

  console.log(`Parsed ${rows.length} rows from CSV\n`)

  let updated = 0
  let notFound = 0
  let errors = 0
  const notFoundList: string[] = []

  // Process each row
  for (const row of rows) {
    try {
      const grammarPoint = await prisma.grammarPoint.findUnique({
        where: { name: row.grammarPoint },
      })

      if (grammarPoint) {
        // Use the first URL as the primary referenceUrl
        // If there are additional URLs, we could store them separately in the future
        await prisma.grammarPoint.update({
          where: { id: grammarPoint.id },
          data: {
            referenceUrl: row.referenceUrl,
          },
        })
        const additionalInfo = row.additionalUrls.length > 0 
          ? ` (${row.additionalUrls.length} additional URLs available)` 
          : ''
        console.log(`✓ Updated: ${row.grammarPoint}${additionalInfo}`)
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
    notFoundList.forEach(name => console.log(`  - ${name}`))
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
