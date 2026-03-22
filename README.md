# Pear Travel 🍐

AI-powered travel itineraries that respect your time and budget.

## About

Pear Travel generates hyper-optimized, day-by-day itineraries for your trips. Simply tell us where you want to go and what you love doing—we handle the rest, factoring in transit times, respecting opening hours, and ensuring a perfectly routed experience.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org)
- **Database**: PostgreSQL with [Prisma](https://www.prisma.io)
- **Styling**: Tailwind CSS
- **Maps**: Google Maps API
- **AI**: Google Generative AI
- **State Management**: Zustand
- **UI Components**: React DnD Kit for drag-and-drop

## Project Structure

- `/src/app` - Next.js app directory with routes and layouts
- `/src/components` - React components organized by feature
- `/src/lib` - Utility functions and shared code
- `/src/store` - Zustand state management
- `/src/types` - TypeScript type definitions
- `/prisma` - Database schema and migrations

## Development

Install dependencies:
```bash
npm install
```

Set up environment variables:
```bash
cp .env.example .env.local
```

Run database migrations:
```bash
npx prisma migrate dev
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
