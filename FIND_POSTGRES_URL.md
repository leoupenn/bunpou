# How to Find POSTGRES_PRISMA_URL on Vercel

## Step-by-Step Instructions

### Option 1: From Environment Variables (Easiest)

1. Go to https://vercel.com and sign in
2. Select your project (bunpou)
3. Go to **Settings** → **Environment Variables**
4. Look for `POSTGRES_PRISMA_URL` in the list
5. Click on it to view the value
6. **Copy this value** and use it for `DATABASE_URL`

### Option 2: From Storage/Database Tab

1. Go to your Vercel project dashboard
2. Click on the **Storage** tab (or **Databases** tab)
3. Find your Postgres database
4. Click on it to open the database details
5. Look for **"Connection String"** or **"Prisma Connection String"**
6. You should see `POSTGRES_PRISMA_URL` listed there
7. Copy the value

### Option 3: From Database Settings

1. Go to **Storage** → Click on your Postgres database
2. Go to the **Settings** tab within the database
3. Look for **"Connection Strings"** section
4. Find **"Prisma"** connection string
5. Copy the value (this is your `POSTGRES_PRISMA_URL`)

## What to Do With It

Once you have the `POSTGRES_PRISMA_URL` value:

1. Go to **Settings** → **Environment Variables**
2. Add or update `DATABASE_URL`:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the `POSTGRES_PRISMA_URL` value here
   - **Environment**: Select all (Production, Preview, Development)
3. Click **Save**
4. **Redeploy** your project

## Important Notes

- `POSTGRES_PRISMA_URL` is automatically created by Vercel when you add Postgres storage
- It includes connection pooling which is required for Prisma
- **DO NOT** use `POSTGRES_URL` - use `POSTGRES_PRISMA_URL` instead
- The format looks like: `postgres://default:xxx@xxx.xxx.xxx.xxx:5432/verceldb?sslmode=require&pgbouncer=true&connect_timeout=15`

## If You Don't Have Postgres Yet

If you don't see `POSTGRES_PRISMA_URL`, you need to create a Postgres database first:

1. Go to **Storage** tab
2. Click **"Create Database"**
3. Select **"Postgres"**
4. Choose a plan (Hobby/Free tier works)
5. Select a region
6. Click **"Create"**
7. Vercel will automatically add `POSTGRES_PRISMA_URL` to your environment variables

