# Deployment Guide

This guide will help you deploy Bunpou to Vercel with a custom domain.

## Prerequisites

1. A GitHub account with your repository pushed
2. A Vercel account (free tier works)
3. A custom domain (optional, but recommended)
4. A database provider (see Database Setup below)

## Important: Database Migration

**Your app currently uses SQLite, which won't work on Vercel's serverless functions.** You need to migrate to a hosted database.

### Recommended: PostgreSQL on Vercel Postgres or Railway

1. **Option A: Vercel Postgres** (Easiest)
   - Go to your Vercel project dashboard
   - Add "Postgres" integration
   - Vercel will provide connection string automatically

2. **Option B: Railway** (Free tier available)
   - Visit https://railway.app
   - Create a new PostgreSQL database
   - Copy the connection string

3. **Update Prisma Schema**
   - Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`
   - Update `DATABASE_URL` in environment variables

## Deployment Steps

### 1. Install Vercel CLI (Optional but Recommended)

```bash
npm i -g vercel
```

### 2. Deploy to Vercel

**Option A: Via Vercel Dashboard (Easiest)**
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository: `leocluan/bunpou`
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add Environment Variables (see below)
6. Click "Deploy"

**Option B: Via CLI**
```bash
cd /Users/leo/Documents/bunpou
vercel login
vercel
```

Follow the prompts to deploy.

### 3. Environment Variables

Add these in Vercel Dashboard → Project Settings → Environment Variables:

**Required:**
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - A random secret string for JWT tokens (generate with `openssl rand -base64 32`)
- `OPENAI_API_KEY` - Your OpenAI API key

**Optional:**
- `NODE_ENV` - Set to `production`

### 4. Database Migration

After deployment, run migrations:

```bash
# Via Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy

# Or via Vercel dashboard terminal
npx prisma migrate deploy
```

### 5. Custom Domain Setup

1. **In Vercel Dashboard:**
   - Go to your project → Settings → Domains
   - Click "Add Domain"
   - Enter your custom domain (e.g., `bunpou.com` or `app.bunpou.com`)

2. **DNS Configuration:**
   - Vercel will show you DNS records to add
   - Add these records to your domain registrar:
     - **A Record**: `@` → Vercel's IP (shown in dashboard)
     - **CNAME Record**: `www` → `cname.vercel-dns.com`
     - Or use Vercel's nameservers (recommended)

3. **SSL Certificate:**
   - Vercel automatically provisions SSL certificates via Let's Encrypt
   - Wait 1-24 hours for DNS propagation and SSL setup

### 6. Post-Deployment

1. **Seed Database** (if needed):
   ```bash
   vercel env pull .env.local
   npm run seed
   ```

2. **Verify Deployment:**
   - Visit your custom domain
   - Test login/signup
   - Check that API routes work

## Database Migration Script

If you need to migrate from SQLite to PostgreSQL:

```bash
# Export from SQLite
npx prisma db pull
npx prisma migrate dev --name init

# Update schema.prisma to use postgresql
# Then push to new database
npx prisma db push
```

## Troubleshooting

### Build Errors
- Check that all environment variables are set
- Verify `DATABASE_URL` is correct
- Ensure Prisma client is generated: `npx prisma generate`

### Database Connection Issues
- Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Check database is accessible from Vercel's IP ranges
- Ensure SSL is enabled if required

### Custom Domain Not Working
- Wait 24-48 hours for DNS propagation
- Verify DNS records are correct
- Check SSL certificate status in Vercel dashboard

## Alternative Hosting Options

If you prefer not to use Vercel:

1. **Railway** - Full-stack hosting with PostgreSQL
2. **Render** - Similar to Vercel, supports PostgreSQL
3. **Fly.io** - Good for full-stack apps
4. **AWS/GCP/Azure** - More complex but more control

## Support

For issues, check:
- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Prisma Deployment: https://www.prisma.io/docs/guides/deployment
