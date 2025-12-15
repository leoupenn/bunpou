# Vercel Postgres Setup Guide

This guide will help you set up Vercel Postgres for your Bunpou application.

## Step 1: Deploy to Vercel (Without Database First)

1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New Project"
3. Import your repository: `leocluan/bunpou`
4. Configure:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Install Command: `npm install`
5. **Skip environment variables for now** - we'll add them after setting up Postgres
6. Click "Deploy"

## Step 2: Add Vercel Postgres

1. In your Vercel project dashboard, go to the **Storage** tab
2. Click **"Create Database"**
3. Select **"Postgres"**
4. Choose a plan (Hobby/Free tier works for development)
5. Select a region (choose closest to your users)
6. Click **"Create"**

Vercel will automatically:
- Create the database
- Add `POSTGRES_URL` environment variable
- Add `POSTGRES_PRISMA_URL` environment variable (for Prisma)
- Add `POSTGRES_URL_NON_POOLING` environment variable

## Step 3: Configure Environment Variables

1. Go to your project → **Settings** → **Environment Variables**
2. You should see the Postgres URLs already added by Vercel
3. Add these additional variables:

   **Required:**
   - `DATABASE_URL` - Copy the value from `POSTGRES_PRISMA_URL` (this is the Prisma-compatible connection string)
   - `JWT_SECRET` - Generate with: `openssl rand -base64 32`
   - `OPENAI_API_KEY` - Your OpenAI API key

   **Optional:**
   - `NODE_ENV` - Set to `production`

## Step 4: Update Prisma Schema

The schema has been updated to use PostgreSQL. Make sure `prisma/schema.prisma` has:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Step 5: Run Database Migrations

After deployment, you need to run migrations. You have two options:

### Option A: Via Vercel CLI (Recommended)

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
cd /Users/leo/Documents/bunpou
vercel link

# Pull environment variables
vercel env pull .env.local

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### Option B: Via Vercel Dashboard Terminal

1. Go to your project → **Deployments**
2. Click on the latest deployment
3. Click **"View Function Logs"** or use the terminal
4. Run:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

## Step 6: Seed the Database (Optional)

If you want to seed initial data:

```bash
# Pull env vars first
vercel env pull .env.local

# Run seed script
npm run seed
```

Or import your CSV data:
```bash
npm run import-csv
```

## Step 7: Redeploy

After setting up the database and running migrations:

1. Go to your project dashboard
2. Click **"Redeploy"** on the latest deployment
3. Or push a new commit to trigger automatic deployment

## Step 8: Verify Deployment

1. Visit your Vercel deployment URL
2. Test signup/login
3. Verify database operations work
4. Check that data persists

## Step 9: Add Custom Domain

1. Go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `bunpou.com` or `app.bunpou.com`)
4. Follow DNS configuration:
   - **Option 1**: Add DNS records (A record or CNAME) as shown
   - **Option 2**: Use Vercel's nameservers (recommended)
5. Wait for DNS propagation and SSL certificate (1-24 hours)

## Troubleshooting

### Database Connection Issues

If you get connection errors:

1. **Verify DATABASE_URL**: Make sure you're using `POSTGRES_PRISMA_URL` value for `DATABASE_URL`
2. **Check SSL**: Vercel Postgres requires SSL, which Prisma handles automatically
3. **Connection Pooling**: Use `POSTGRES_PRISMA_URL` (not `POSTGRES_URL`) for Prisma

### Migration Errors

If migrations fail:

```bash
# Reset and start fresh (WARNING: Deletes all data)
npx prisma migrate reset

# Or create a new migration
npx prisma migrate dev --name init
npx prisma migrate deploy
```

### Build Errors

- Ensure `DATABASE_URL` is set in environment variables
- Run `npx prisma generate` before building
- Check that Prisma Client is generated: `ls node_modules/.prisma/client`

## Local Development with Vercel Postgres

For local development, you can:

1. **Use Vercel Postgres locally:**
   ```bash
   vercel env pull .env.local
   # This will pull all env vars including DATABASE_URL
   ```

2. **Or use a local PostgreSQL:**
   - Install PostgreSQL locally
   - Update `.env.local` with local connection string
   - Keep `DATABASE_URL` pointing to local DB for development

## Environment Variables Summary

**Production (Vercel):**
- `DATABASE_URL` = `POSTGRES_PRISMA_URL` (from Vercel Postgres)
- `JWT_SECRET` = Your generated secret
- `OPENAI_API_KEY` = Your OpenAI key
- `NODE_ENV` = `production`

**Local Development:**
- `DATABASE_URL` = Local PostgreSQL or SQLite connection string
- `JWT_SECRET` = Any secret (can be same as production)
- `OPENAI_API_KEY` = Your OpenAI key
- `NODE_ENV` = `development`

## Next Steps

After successful deployment:
1. Test all features (signup, login, reviews, etc.)
2. Monitor Vercel dashboard for any errors
3. Set up custom domain
4. Configure any additional settings (analytics, etc.)

## Support

- Vercel Postgres Docs: https://vercel.com/docs/storage/vercel-postgres
- Prisma Deployment: https://www.prisma.io/docs/guides/deployment
- Vercel Support: https://vercel.com/support
