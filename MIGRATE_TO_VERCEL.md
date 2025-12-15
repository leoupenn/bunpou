# How to Migrate Local Database to Vercel Postgres

**Simple one-command migration!** No schema changes needed.

## Quick Start

### Step 1: Install SQLite3 CLI

**macOS:**
```bash
brew install sqlite3
```

**Linux:**
```bash
sudo apt-get install sqlite3
```

**Windows:**
Download from https://www.sqlite.org/download.html

### Step 2: Get Vercel Database Connection

```bash
# Login to Vercel (first time only)
npx vercel login

# Link your project (first time only)
npx vercel link

# Pull environment variables (creates .env.local)
npx vercel env pull .env.local
```

**Note:** If you prefer, you can also manually copy the `DATABASE_URL` from Vercel dashboard:
1. Go to your Vercel project → Settings → Environment Variables
2. Find `POSTGRES_PRISMA_URL` and copy its value
3. Create `.env.local` with: `DATABASE_URL="<paste value here>"`

### Step 3: Run Migration

```bash
npm run migrate:to-vercel
```

That's it! The script will:
1. ✅ Read all data from your local SQLite database (`prisma/dev.db`)
2. ✅ Import everything to your Vercel PostgreSQL database
3. ✅ Preserve all relationships, IDs, and timestamps

## How It Works

The migration script uses:
- **`sqlite3` CLI** to read directly from SQLite (no native compilation needed!)
- **Prisma** to write to PostgreSQL (using your existing schema)

No need to change your schema back and forth! No npm packages to compile!

## What Gets Migrated

- ✅ Users (with passwords preserved)
- ✅ GrammarPoints
- ✅ Situations
- ✅ GrammarProgress (all SRS levels and statuses)
- ✅ Attempts (all practice history)

All relationships and foreign keys are preserved.

## Prerequisites

1. **Local SQLite database** at `prisma/dev.db` (or set `LOCAL_DB_PATH` env var)
2. **Vercel Postgres** database set up
3. **DATABASE_URL** in `.env.local` pointing to Vercel Postgres

## Environment Variables

You can customize the local database path:

```bash
LOCAL_DB_PATH="./prisma/dev.db" npm run migrate:to-vercel
```

## Verification

After migration, verify your data:

```bash
# Open Prisma Studio with Vercel connection
npx vercel env pull .env.local
npx prisma studio
```

Or test your Vercel deployment:
- Sign in with migrated user accounts
- Verify grammar points appear
- Check that progress is preserved

## Troubleshooting

### "sqlite3 CLI not found"

**macOS:**
```bash
brew install sqlite3
```

**Linux:**
```bash
sudo apt-get install sqlite3
```

**Verify installation:**
```bash
sqlite3 --version
```

### "DATABASE_URL not found"

Make sure you've pulled Vercel environment variables:
```bash
npx vercel env pull .env.local
```

Or manually set it:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Copy the value of `POSTGRES_PRISMA_URL`
3. Create `.env.local` file with: `DATABASE_URL="<paste value>"`

### "SQLite database not found"

Check that your local database exists at `prisma/dev.db`, or set:
```bash
LOCAL_DB_PATH="/path/to/your/database.db" npm run migrate:to-vercel
```

### "Table does not exist" in Vercel

Make sure tables are created first:
```bash
npx vercel env pull .env.local
npx prisma db push
```

### Connection errors

- Verify `DATABASE_URL` in `.env.local` matches `POSTGRES_PRISMA_URL` from Vercel
- Ensure you're using `POSTGRES_PRISMA_URL` (not `POSTGRES_URL`)
- Check that SSL is enabled (Vercel Postgres requires it)

### Duplicate key errors

The script uses `upsert` which handles duplicates automatically. If you still get errors:
- The data might already be migrated
- Check for ID conflicts
- Verify foreign key relationships exist

## Export to JSON (Backup)

If you want to export data to JSON file first:

```bash
npm run migrate:export
```

This creates `prisma/exported-data.json` with all your data (useful for backup).

## Notes

- ⚡ **Fast**: Direct SQLite reading, no schema changes
- 🔒 **Safe**: Uses `upsert` to handle duplicates
- 📊 **Progress**: Shows real-time import progress
- 🎯 **Accurate**: Preserves all IDs, timestamps, and relationships
- 🚀 **One command**: Everything happens automatically

## After Migration

1. **Test your Vercel deployment** to verify everything works
2. **Keep local database** as backup (don't delete it yet)
3. **Optional**: Use Vercel Postgres for local dev too:
   ```bash
   npx vercel env pull .env.local
   # Use DATABASE_URL from .env.local
   ```

## Alternative: Manual Migration

If you prefer manual control, you can use Prisma Studio:

1. **Export from local:**
   - Temporarily change schema to SQLite
   - `npx prisma generate`
   - `npx prisma studio` (with local DATABASE_URL)
   - Copy data manually

2. **Import to Vercel:**
   - Change schema back to PostgreSQL
   - `vercel env pull .env.local`
   - `npx prisma generate`
   - `npx prisma studio` (with Vercel DATABASE_URL)
   - Paste data manually

But the automated script is much easier! 🎉
