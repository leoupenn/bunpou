import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'

// Load environment variables
dotenv.config()
const vercelEnvPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(vercelEnvPath)) {
  dotenv.config({ path: vercelEnvPath, override: true })
}

const vercelDbUrl = process.env.DATABASE_URL
const localDbPath = process.env.LOCAL_DB_PATH || path.join(process.cwd(), 'prisma', 'dev.db')

/**
 * Read data from SQLite using sqlite3 CLI (no native compilation needed!)
 */
function readFromSQLite() {
  console.log(`📖 Reading from SQLite: ${localDbPath}`)
  
  if (!fs.existsSync(localDbPath)) {
    throw new Error(`SQLite database not found at: ${localDbPath}`)
  }
  
  // Check if sqlite3 CLI is available
  try {
    execSync('which sqlite3', { stdio: 'ignore' })
  } catch {
    throw new Error('sqlite3 CLI not found. Install with: brew install sqlite3')
  }
  
  console.log('   Reading tables...')
  
  // Use sqlite3 CLI to export data as JSON
  const tables = ['User', 'GrammarPoint', 'Situation', 'GrammarProgress', 'Attempt']
  const data: any = {}
  
  for (const table of tables) {
    try {
      // Export table as JSON using sqlite3 CLI
      const jsonOutput = execSync(
        `sqlite3 -json "${localDbPath}" "SELECT * FROM ${table}"`,
        { encoding: 'utf-8' }
      )
      
      // Handle empty results
      const trimmed = jsonOutput.trim()
      let rows: any[] = []
      
      if (trimmed) {
        try {
          // sqlite3 -json outputs a JSON array that may span multiple lines
          // Format: [{...},\n{...}]
          // Simply remove all newlines and parse as JSON
          const normalized = trimmed.replace(/\n/g, '')
          rows = JSON.parse(normalized)
          
          // Ensure it's an array
          if (!Array.isArray(rows)) {
            console.warn(`   ⚠️  Expected array but got: ${typeof rows}`)
            rows = []
          }
        } catch (parseError: any) {
          console.error(`   ❌ Failed to parse ${table} data: ${parseError.message}`)
          console.error(`   First 200 chars: ${trimmed.substring(0, 200)}...`)
          rows = []
        }
      }
      
      // Convert date strings to Date objects and integers to booleans
      const processedRows = rows.map((row: any) => {
        const processed: any = { ...row }
        // Convert date fields
        if (processed.createdAt) processed.createdAt = new Date(processed.createdAt)
        if (processed.updatedAt) processed.updatedAt = new Date(processed.updatedAt)
        if (processed.nextReviewAt) processed.nextReviewAt = new Date(processed.nextReviewAt)
        if (processed.lastReviewedAt) processed.lastReviewedAt = new Date(processed.lastReviewedAt)
        // Convert boolean fields (SQLite stores as 0/1, PostgreSQL needs true/false)
        if (processed.isCorrect !== undefined && processed.isCorrect !== null) {
          // Convert integer 0/1 to boolean true/false
          processed.isCorrect = processed.isCorrect === 1 || processed.isCorrect === true
        }
        // Convert empty strings to null for optional fields
        if (processed.corrections === '') processed.corrections = null
        if (processed.hints === '') processed.hints = null
        if (processed.feedback === '') processed.feedback = null
        return processed
      })
      
      data[table.toLowerCase()] = processedRows
      console.log(`   ✅ Read ${processedRows.length} ${table} records`)
    } catch (error: any) {
      console.warn(`   ⚠️  Could not read ${table}: ${error.message}`)
      data[table.toLowerCase()] = []
    }
  }
  
  const result = {
    users: data.user || [],
    grammarPoints: data.grammarpoint || [],
    situations: data.situation || [],
    grammarProgress: data.grammarprogress || [],
    attempts: data.attempt || [],
  }
  
  // Debug: Show what was read
  console.log('\n📊 Data read summary:')
  console.log(`   - Users: ${result.users.length}`)
  console.log(`   - GrammarPoints: ${result.grammarPoints.length}`)
  console.log(`   - Situations: ${result.situations.length}`)
  console.log(`   - GrammarProgress: ${result.grammarProgress.length}`)
  console.log(`   - Attempts: ${result.attempts.length}`)
  
  return result
}

/**
 * Import data to Vercel PostgreSQL database
 */
async function importToVercel(data: {
  users: any[]
  grammarPoints: any[]
  situations: any[]
  grammarProgress: any[]
  attempts: any[]
}) {
  console.log('\n📥 Importing to Vercel PostgreSQL database...')
  
  if (!vercelDbUrl) {
    console.error('❌ DATABASE_URL not found!')
    console.log('Please run: vercel env pull .env.local')
    return
  }
  
  if (!vercelDbUrl.startsWith('postgres')) {
    console.error('❌ DATABASE_URL must be a PostgreSQL connection string')
    console.log(`Current: ${vercelDbUrl.substring(0, 50)}...`)
    return
  }
  
  process.env.DATABASE_URL = vercelDbUrl
  const prisma = new PrismaClient()
  
  try {
    await prisma.$connect()
    console.log('✅ Connected to Vercel database')
    
    console.log('\n📝 Importing data (this may take a few minutes)...\n')
    
    // Import in correct order (respecting foreign keys)
    
    // 1. GrammarPoints (no dependencies)
    if (data.grammarPoints.length > 0) {
      console.log(`   📦 Importing ${data.grammarPoints.length} grammar points...`)
      let imported = 0
      let errors = 0
      for (const gp of data.grammarPoints) {
        try {
          await prisma.grammarPoint.upsert({
            where: { id: gp.id },
            update: {
              name: gp.name,
              description: gp.description,
              referenceUrl: gp.referenceUrl,
              group: gp.group,
              jlptLevel: gp.jlptLevel,
              updatedAt: gp.updatedAt,
            },
            create: gp,
          })
          imported++
          if (imported % 10 === 0) {
            process.stdout.write(`\r   Progress: ${imported}/${data.grammarPoints.length}`)
          }
        } catch (error: any) {
          errors++
          if (errors <= 5) {
            console.error(`\n   ❌ Error importing grammar point ${gp.id}: ${error.message}`)
          }
        }
      }
      console.log(`\r   ✅ Imported ${imported} grammar points${errors > 0 ? ` (${errors} errors)` : ''}`)
    } else {
      console.log('   ⚠️  No grammar points to import')
    }
    
    // 2. Situations (depends on GrammarPoints)
    if (data.situations.length > 0) {
      console.log(`   📦 Importing ${data.situations.length} situations...`)
      let imported = 0
      let errors = 0
      for (const sit of data.situations) {
        try {
          await prisma.situation.upsert({
            where: {
              grammarPointId_lessonNumber: {
                grammarPointId: sit.grammarPointId,
                lessonNumber: sit.lessonNumber,
              },
            },
            update: {
              situation: sit.situation,
              wordBank: sit.wordBank,
              difficulty: sit.difficulty,
              updatedAt: sit.updatedAt,
            },
            create: sit,
          })
          imported++
          if (imported % 10 === 0) {
            process.stdout.write(`\r   Progress: ${imported}/${data.situations.length}`)
          }
        } catch (error: any) {
          errors++
          if (errors <= 5) {
            console.error(`\n   ❌ Error importing situation: ${error.message}`)
          }
        }
      }
      console.log(`\r   ✅ Imported ${imported} situations${errors > 0 ? ` (${errors} errors)` : ''}`)
    } else {
      console.log('   ⚠️  No situations to import')
    }
    
    // 3. Users (no dependencies)
    if (data.users.length > 0) {
      console.log(`   📦 Importing ${data.users.length} users...`)
      let imported = 0
      for (const user of data.users) {
        await prisma.user.upsert({
          where: { id: user.id },
          update: {
            email: user.email,
            name: user.name,
            passwordHash: user.passwordHash,
            updatedAt: user.updatedAt,
          },
          create: user,
        })
        imported++
        process.stdout.write(`\r   Progress: ${imported}/${data.users.length}`)
      }
      console.log(`\r   ✅ Imported ${imported} users`)
    }
    
    // 4. GrammarProgress (depends on User and GrammarPoint)
    if (data.grammarProgress.length > 0) {
      console.log(`   📦 Importing ${data.grammarProgress.length} grammar progress entries...`)
      let imported = 0
      for (const gp of data.grammarProgress) {
        await prisma.grammarProgress.upsert({
          where: {
            userId_grammarPointId: {
              userId: gp.userId,
              grammarPointId: gp.grammarPointId,
            },
          },
          update: {
            srsLevel: gp.srsLevel,
            status: gp.status,
            unlockedSituationNumber: gp.unlockedSituationNumber,
            lastSituationId: gp.lastSituationId,
            nextReviewAt: gp.nextReviewAt,
            lastReviewedAt: gp.lastReviewedAt,
            updatedAt: gp.updatedAt,
          },
          create: gp,
        })
        imported++
        if (imported % 10 === 0) {
          process.stdout.write(`\r   Progress: ${imported}/${data.grammarProgress.length}`)
        }
      }
      console.log(`\r   ✅ Imported ${imported} grammar progress entries`)
    }
    
    // 5. Attempts (depends on User, GrammarPoint, Situation, GrammarProgress)
    if (data.attempts.length > 0) {
      console.log(`   📦 Importing ${data.attempts.length} attempts...`)
      const batchSize = 50
      let imported = 0
      for (let i = 0; i < data.attempts.length; i += batchSize) {
        const batch = data.attempts.slice(i, i + batchSize)
        const result = await prisma.attempt.createMany({
          data: batch,
          skipDuplicates: true,
        })
        imported += result.count
        process.stdout.write(`\r   Progress: ${imported}/${data.attempts.length} attempts`)
      }
      console.log(`\r   ✅ Imported ${imported} attempts`)
    }
    
    console.log('\n\n✅ Migration complete!')
    console.log('\n📊 Summary:')
    console.log(`   - ${data.users.length} users`)
    console.log(`   - ${data.grammarPoints.length} grammar points`)
    console.log(`   - ${data.situations.length} situations`)
    console.log(`   - ${data.grammarProgress.length} grammar progress entries`)
    console.log(`   - ${data.attempts.length} attempts`)
    
  } catch (error) {
    console.error('\n❌ Error importing data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Main migration function - does everything in one go!
 */
async function migrate() {
  console.log('🚀 Starting database migration from SQLite to Vercel Postgres\n')
  
  try {
    // Step 1: Read from SQLite
    const data = readFromSQLite()
    
    // Step 2: Import to Vercel
    await importToVercel(data)
    
    console.log('\n🎉 Migration successful!')
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    if (error.message.includes('sqlite3 CLI not found')) {
      console.log('\n💡 Install sqlite3 CLI:')
      console.log('   macOS: brew install sqlite3')
      console.log('   Linux: sudo apt-get install sqlite3')
      console.log('   Or use: npm install -g sqlite3')
    }
    process.exit(1)
  }
}

async function main() {
  const command = process.argv[2]
  
  if (command === 'migrate' || !command) {
    await migrate()
  } else if (command === 'export') {
    // Just export to JSON (for backup)
    const data = readFromSQLite()
    const exportPath = path.join(process.cwd(), 'prisma', 'exported-data.json')
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2))
    console.log(`\n💾 Data exported to: ${exportPath}`)
  } else {
    console.log('📦 Database Migration Tool\n')
    console.log('Usage:')
    console.log('  npm run migrate:to-vercel  - Migrate from local SQLite to Vercel Postgres (one command!)')
    console.log('  npm run migrate:export     - Export to JSON file only\n')
    console.log('Prerequisites:')
    console.log('  1. Install sqlite3 CLI: brew install sqlite3')
    console.log('  2. Pull Vercel env: vercel env pull .env.local')
    console.log('  3. Run: npm run migrate:to-vercel\n')
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
