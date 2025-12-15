# Environment Setup Guide

Follow these steps to set up your Bunpou development environment:

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- OpenAI API key (get one from https://platform.openai.com/api-keys)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including Next.js, Prisma, OpenAI SDK, and other dependencies.

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Or manually create a `.env` file with the following content:

```env
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="your_openai_api_key_here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Important:** Replace `your_openai_api_key_here` with your actual OpenAI API key.

### 3. Set Up the Database

Generate Prisma Client:
```bash
npm run db:generate
```

Create the database and apply the schema:
```bash
npm run db:push
```

This will create a SQLite database file at `prisma/dev.db`.

### 4. (Optional) Seed Sample Data

To populate the database with sample grammar points and a test user:

```bash
npm run seed
```

This creates:
- A test user with email `test@example.com` and ID `user-1`
- 5 sample Japanese grammar points
- Initial progress entries for the test user

### 5. Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Verify Setup

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. You should see the Bunpou homepage with navigation links
3. Click on "Learning Workflow" to see grammar points (if you ran the seed script)
4. Click on "My Progress" to see your grammar progress

## Troubleshooting

### Database Issues

If you encounter database errors:
```bash
# Delete the database and recreate it
rm prisma/dev.db
npm run db:push
npm run seed
```

### OpenAI API Errors

- Make sure your API key is correct in the `.env` file
- Check that you have credits/usage available on your OpenAI account
- Verify the API key has the necessary permissions

### Port Already in Use

If port 3000 is already in use:
```bash
# Use a different port
PORT=3001 npm run dev
```

## Additional Commands

- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:studio` - Open Prisma Studio to view/edit database
- `npm run lint` - Run ESLint

## Next Steps

After setup:
1. Review the grammar points in "Learning Workflow"
2. Practice creating sentences
3. Move grammar points to "Achievement Test" when ready
4. Track your progress in "My Progress"

