# Bunpou - Japanese Grammar Learning Application

A Japanese grammar learning application utilizing spaced repetition system (SRS) and AI to enable students open-ended practice and consistent memorization.

## Features

### Learning Workflow
- Review all new grammar points with reference documents (links to external sites)
- Create one sentence given a situation for each grammar point until correct
- Grammar points move to the level review pile after correct completion
- Option to mark grammar points as mastered and move them to achievement test

### Level Review Pile
- Review available grammar points according to SRS timing
- Create one sentence given a situation for each grammar point
- SRS score increments on correct answers, decreases on incorrect answers
- Option to mark grammar points as mastered and move them to achievement test

### Achievement Test
- Students can mark grammar points as mastered from learning or review workflows
- 5 reviews back-to-back for each grammar point
- If student gets 3 correct, grammar is mastered and set to SRS level 6
- If student gets less than 3 correct, grammar point resets to level 0

### History Page
- Hover over purple grammar box to see arrow and "past attempt" text
- Click to view detailed history of feedback, hints, and corrections
- Accessible from review, master review, and My Progress pages

### My Progress
- View all grammar points you have learned/are learning
- See SRS level for each grammar point
- Hover over grammar points to see next review time
- Access history page from each grammar point

### Review Forecast
- Displays number of current reviews (available immediately)
- Shows future reviews by hour of day within the next week
- Shows number of reviews scheduled at each time

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database:

Ensure PostgreSQL is installed and running on your system. If you need to install PostgreSQL, see the [official installation guide](https://www.postgresql.org/download/).

Create the database:
```bash
createdb bunpou
```

If the `createdb` command fails with a connection error, ensure PostgreSQL is running. See the [PostgreSQL documentation](https://www.postgresql.org/docs/current/server-start.html) for how to start PostgreSQL on your system.

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure the following:
```
# Update DATABASE_URL with your PostgreSQL connection string
# Format: postgresql://USERNAME@localhost:5432/bunpou
# Replace USERNAME with your system username
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/bunpou"

# Add your OpenAI API key
OPENAI_API_KEY=your_openai_api_key_here

# Generate a JWT secret with: openssl rand -base64 32
JWT_SECRET="your-generated-secret-here"
```

4. Set up the database schema:
```bash
npx prisma generate
npx prisma db push
```

5. (Optional) Seed the database with sample data:
```bash
npm run seed
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Technology Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **SQLite** - Database (can be easily migrated to PostgreSQL)
- **OpenAI API** - Sentence evaluation using GPT-4
- **date-fns** - Date manipulation for SRS timing

## Database Schema

- **User** - User accounts
- **GrammarPoint** - Grammar points with descriptions and reference URLs
- **GrammarProgress** - User progress tracking with SRS levels
- **Attempt** - All sentence attempts with feedback and corrections

## SRS Levels

- Level 0: New (immediate review)
- Level 1: 4 hours until next review
- Level 2: 24 hours (1 day)
- Level 3: 72 hours (3 days)
- Level 4: 168 hours (1 week)
- Level 5: 336 hours (2 weeks)
- Level 6: Mastered (no more reviews)

## API Routes

- `GET /api/grammar` - Get grammar points for user
- `GET /api/grammar/[id]` - Get specific grammar point
- `POST /api/grammar/[id]/master` - Move grammar point to achievement test
- `POST /api/attempt` - Submit sentence attempt
- `GET /api/achievement-test` - Get grammar points ready for achievement test
- `POST /api/achievement-test` - Complete achievement test
- `GET /api/attempts/[grammarProgressId]` - Get attempt history
- `GET /api/reviews/available` - Get available reviews
- `GET /api/reviews/forecast` - Get review forecast

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:studio` - Open Prisma Studio to view database

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions with custom domain setup.

Quick start:
1. Push code to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy and configure custom domain

