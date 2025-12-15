# How to Check/Set Environment Variables on Vercel

## Quick Check

1. Go to https://vercel.com
2. Select your project (bunpou)
3. Go to **Settings** → **Environment Variables**
4. Verify these are set:
   - `DATABASE_URL` - Should be a PostgreSQL connection string
   - `JWT_SECRET` - Should be a random string (generate with `openssl rand -base64 32`)
   - `OPENAI_API_KEY` - Your OpenAI API key

## If Missing, Add Them:

### DATABASE_URL
- If you have Vercel Postgres: Copy the value from `POSTGRES_PRISMA_URL`
- If not: You need to set up a database first

### JWT_SECRET
Generate a new one:
```bash
openssl rand -base64 32
```
Then copy the output and paste it as the value for `JWT_SECRET`

### OPENAI_API_KEY
Get it from: https://platform.openai.com/api-keys

## After Adding Variables

1. **Redeploy** your project (go to Deployments → click "..." → Redeploy)
2. Or push a new commit to trigger automatic deployment

## Verify They're Working

After redeploy, check the function logs:
1. Go to **Deployments** → Latest deployment
2. Click **"View Function Logs"**
3. Look for any errors related to missing environment variables

