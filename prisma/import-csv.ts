import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

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
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Add last field
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

async function main() {
  const csvPath = path.join(
    '/Users/leo/Downloads',
    'Bunpou sublevels - N5 Situation and Vocab - Master Sheet.csv'
  )

  console.log('Reading CSV file from:', csvPath)

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at: ${csvPath}`)
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content)

  console.log(`Parsed ${rows.length} rows from CSV`)

  // Group rows by grammar point name
  const grammarPointMap = new Map<string, CSVRow[]>()
  for (const row of rows) {
    if (!grammarPointMap.has(row.grammarPoint)) {
      grammarPointMap.set(row.grammarPoint, [])
    }
    grammarPointMap.get(row.grammarPoint)!.push(row)
  }

  console.log(`Found ${grammarPointMap.size} unique grammar points`)

  let grammarPointsCreated = 0
  let grammarPointsUpdated = 0
  let situationsCreated = 0
  let situationsSkipped = 0
  let errors = 0

  // Process each grammar point
  for (const [grammarPointName, situations] of grammarPointMap.entries()) {
    try {
      // Get the group from the first situation (all should have the same group)
      const group = situations[0].group

      // Create or update grammar point
      let grammarPoint = await prisma.grammarPoint.findUnique({
        where: { name: grammarPointName },
      })

      // Determine JLPT level from filename (N5 in this case)
      // For future: could be extracted from filename or passed as parameter
      const jlptLevel = 'N5' // Default to N5 for current CSV

      if (grammarPoint) {
        // Update if exists
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
      } else {
        // Create new grammar point
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

      // Create situations for this grammar point
      for (const situationRow of situations) {
        try {
          const existingSituation = await prisma.situation.findFirst({
            where: {
              grammarPointId: grammarPoint.id,
              lessonNumber: situationRow.lessonNumber,
            },
          })

          if (existingSituation) {
            // Update existing situation
            await prisma.situation.update({
              where: { id: existingSituation.id },
              data: {
                situation: situationRow.situation,
                wordBank: situationRow.wordBank,
                difficulty: situationRow.difficulty,
              },
            })
            situationsSkipped++
          } else {
            // Create new situation
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

      if (grammarPointsCreated + grammarPointsUpdated % 10 === 0) {
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
  console.log(`- Situations Updated: ${situationsSkipped}`)
  console.log(`- Errors: ${errors}`)
  console.log(`- Total Grammar Points: ${grammarPointMap.size}`)
  console.log(`- Total Situations: ${rows.length}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

