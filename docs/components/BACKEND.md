# Backend Service Documentation

The Backend service is the core API server that handles article storage, retrieval, AI processing, user authentication, and more.

## Technology Stack

- **Framework**: Express.js + Next.js API Routes
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **AI**: Google Generative AI (Gemini)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi / Zod
- **Logging**: Winston
- **Testing**: Jest + Supertest

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── articles/          # Article endpoints
│   │   ├── auth/              # Authentication endpoints
│   │   ├── newsletter/        # Newsletter endpoints
│   │   └── scheduled/         # Cron job endpoints
│   ├── lib/
│   │   ├── db/                # Database connection
│   │   ├── ai/                # AI service (Gemini)
│   │   ├── auth/              # JWT utilities
│   │   └── middleware/        # Express middleware
│   ├── models/                # Mongoose models
│   │   ├── Article.ts
│   │   ├── User.ts
│   │   └── Subscriber.ts
│   └── utils/                 # Utility functions
├── tests/                     # Test files
├── public/                    # Static assets
├── vercel.json                # Vercel configuration
├── package.json
└── tsconfig.json
```

## Core Features

### 1. Article Management

**Model** (`src/models/Article.ts`):

```typescript
import mongoose from 'mongoose';

const ArticleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  summary: { type: String },
  url: { type: String, required: true, unique: true },
  source: { type: String, required: true },
  topics: [{ type: String }],

  sentiment: {
    tone: String,
    objectivity: Number,
    urgency: Number,
    controversy: Number
  },

  biasAnalysis: {
    score: Number,
    indicators: [String],
    overallAssessment: String
  },

  qualityScore: { type: Number, min: 0, max: 100 },

  publishedAt: Date,
  fetchedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  views: { type: Number, default: 0 },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  ratings: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    createdAt: { type: Date, default: Date.now }
  }],

  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now }
  }]
});

// Indexes for performance
ArticleSchema.index({ source: 1, fetchedAt: -1 });
ArticleSchema.index({ topics: 1 });
ArticleSchema.index({ publishedAt: -1 });

export default mongoose.model('Article', ArticleSchema);
```

**API Endpoints**:

```typescript
// src/api/articles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Article from '@/models/Article';
import dbConnect from '@/lib/db';

export async function GET(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const source = searchParams.get('source');
  const topic = searchParams.get('topic');

  const query: any = {};
  if (source) query.source = source;
  if (topic) query.topics = topic;

  const articles = await Article.find(query)
    .sort({ publishedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await Article.countDocuments(query);

  return NextResponse.json({
    success: true,
    data: articles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}
```

### 2. AI Summarization

**Service** (`src/lib/ai/summarize.ts`):

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

export async function generateSummary(content: string): Promise<string> {
  const prompt = `
    ${process.env.AI_INSTRUCTIONS}

    Article content:
    ${content}

    Provide a concise 150-200 word summary focusing on:
    - Main points and key takeaways
    - Important facts and figures
    - Implications for government officials
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export async function analyzeBias(content: string) {
  const prompt = `
    Analyze the following article for bias:
    ${content}

    Provide:
    1. Bias score (0-100, where 0 = no bias)
    2. Specific bias indicators
    3. Overall assessment
    4. Recommendations

    Return as JSON:
    {
      "score": number,
      "indicators": string[],
      "overallAssessment": string,
      "recommendations": string[]
    }
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return JSON.parse(response.text());
}
```

### 3. User Authentication

**Service** (`src/lib/auth/jwt.ts`):

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d';

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}
```

**Middleware** (`src/lib/middleware/auth.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../auth/jwt';
import User from '@/models/User';

export async function authMiddleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { success: false, error: 'Invalid token' },
      { status: 401 }
    );
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
  }

  (req as any).user = user;
  return null; // Continue to route handler
}
```

### 4. Scheduled Jobs

**Cron Handler** (`src/api/scheduled/fetchAndSummarize/route.ts`):

```typescript
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import { generateSummary, analyzeBias } from '@/lib/ai/summarize';

export async function GET() {
  await dbConnect();

  // Fetch articles without summaries
  const articles = await Article.find({ summary: { $exists: false } })
    .limit(50)
    .lean();

  const results = [];

  for (const article of articles) {
    try {
      const summary = await generateSummary(article.content);
      const biasAnalysis = await analyzeBias(article.content);

      await Article.updateOne(
        { _id: article._id },
        {
          $set: {
            summary,
            biasAnalysis,
            updatedAt: new Date()
          }
        }
      );

      results.push({ id: article._id, status: 'success' });
    } catch (error) {
      results.push({ id: article._id, status: 'error', error });
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results
  });
}
```

**Vercel Cron Configuration** (`vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/scheduled/fetchAndSummarize",
      "schedule": "0 6,18 * * *"
    }
  ]
}
```

## Environment Variables

```bash
# Database
MONGODB_URI=mongodb+srv://...

# AI
GOOGLE_AI_API_KEY=your_key_here
GOOGLE_AI_API_KEY1=backup_key_1
GOOGLE_AI_API_KEY2=backup_key_2

# Authentication
JWT_SECRET=your_super_secret_key_min_32_chars

# Server
PORT=3000
NODE_ENV=production

# Newsletter
RESEND_API_KEY=re_...
RESEND_FROM="SynthoraAI <noreply@yourdomain.com>"
```

## Development

### Running Locally

```bash
cd backend
npm install
npm run dev
```

### Running Tests

```bash
# All tests
npm run test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Building for Production

```bash
npm run build
npm start
```

## API Rate Limiting

Implemented using `express-rate-limit`:

```typescript
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
```

## Logging

Using Winston for structured logging:

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

## Error Handling

```typescript
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err: any, req: any, res: any, next: any) {
  logger.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.statusCode
      }
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 500
    }
  });
}
```

---

**Service**: Backend API
**Port**: 3000 (default)
**Live**: https://ai-content-curator-backend.vercel.app/
