# Performance Optimization Guide

Comprehensive guide for optimizing performance across all services of the Data Governance Toolkit.

## Performance Goals

- **API Response Time**: <500ms (p95)
- **Page Load Time**: <2s (First Contentful Paint)
- **Time to Interactive**: <3.5s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **Database Query Time**: <100ms (p95)

## Database Optimization

### MongoDB Indexing

```javascript
// Article indexes
db.articles.createIndex({ source: 1, fetchedAt: -1 });
db.articles.createIndex({ topics: 1 });
db.articles.createIndex({ publishedAt: -1 });
db.articles.createIndex({ url: 1 }, { unique: true });
db.articles.createIndex({ "sentiment.objectivity": 1 });
db.articles.createIndex({ qualityScore: -1 });

// Compound indexes for common queries
db.articles.createIndex({ source: 1, publishedAt: -1 });
db.articles.createIndex({ topics: 1, publishedAt: -1 });

// Text search index
db.articles.createIndex(
  { title: "text", content: "text", summary: "text" },
  { weights: { title: 3, summary: 2, content: 1 } }
);

// User indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });
```

### Query Optimization

```typescript
// BAD: Fetching all fields
const articles = await Article.find({ source: 'state.gov' });

// GOOD: Select only needed fields
const articles = await Article.find(
  { source: 'state.gov' },
  { title: 1, summary: 1, publishedAt: 1, topics: 1 }
)
.lean() // Return plain JavaScript objects
.limit(10);

// BAD: Multiple separate queries
const article = await Article.findById(id);
const user = await User.findById(userId);
const comments = await Comment.find({ articleId: id });

// GOOD: Use aggregation pipeline
const result = await Article.aggregate([
  { $match: { _id: ObjectId(id) } },
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'user'
    }
  },
  {
    $lookup: {
      from: 'comments',
      localField: '_id',
      foreignField: 'articleId',
      as: 'comments'
    }
  }
]);

// Use projection to limit returned data
db.articles.find(
  { source: 'state.gov' },
  { content: 0 } // Exclude large content field
);
```

### Connection Pooling

```typescript
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGODB_URI!, {
  maxPoolSize: 50,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
  retryWrites: true,
  w: 'majority'
});

// Monitor pool events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});
```

## Caching Strategies

### Redis Caching

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000
});

// Cache article by ID
export async function getArticle(id: string) {
  const cacheKey = `article:${id}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const article = await Article.findById(id).lean();

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(article));

  return article;
}

// Cache article list with pagination
export async function getArticles(page: number, limit: number) {
  const cacheKey = `articles:page:${page}:limit:${limit}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const articles = await Article.find()
    .sort({ publishedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(articles));

  return articles;
}

// Invalidate cache on update
export async function updateArticle(id: string, data: any) {
  const article = await Article.findByIdAndUpdate(id, data, { new: true });

  // Invalidate specific article cache
  await redis.del(`article:${id}`);

  // Invalidate list caches (could be more targeted)
  const keys = await redis.keys('articles:page:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }

  return article;
}
```

### HTTP Caching

```typescript
// Cache-Control headers
app.use((req, res, next) => {
  if (req.method === 'GET') {
    if (req.path.startsWith('/api/articles/')) {
      // Cache individual articles for 1 hour
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else if (req.path === '/api/articles') {
      // Cache article lists for 5 minutes
      res.setHeader('Cache-Control', 'public, max-age=300');
    } else if (req.path.startsWith('/static/')) {
      // Cache static assets for 1 year
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
  next();
});

// ETag support
import etag from 'etag';

app.use((req, res, next) => {
  const originalSend = res.send;

  res.send = function(data) {
    if (req.method === 'GET' && res.statusCode === 200) {
      const tag = etag(data);
      res.setHeader('ETag', tag);

      if (req.headers['if-none-match'] === tag) {
        res.status(304);
        return res.end();
      }
    }

    return originalSend.call(this, data);
  };

  next();
});
```

## API Optimization

### Response Compression

```typescript
import compression from 'compression';

app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

### Request Batching

```typescript
// Client-side request batching
class APIBatcher {
  private batch: Array<{ endpoint: string; resolve: Function; reject: Function }> = [];
  private timeout: NodeJS.Timeout | null = null;

  async fetch(endpoint: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.batch.push({ endpoint, resolve, reject });

      if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), 10);
      }
    });
  }

  private async flush() {
    const currentBatch = this.batch.splice(0);
    this.timeout = null;

    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: currentBatch.map(r => r.endpoint)
        })
      });

      const results = await response.json();

      currentBatch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      currentBatch.forEach(item => item.reject(error));
    }
  }
}

// Server-side batch endpoint
app.post('/api/batch', async (req, res) => {
  const { requests } = req.body;

  const results = await Promise.all(
    requests.map(async (endpoint: string) => {
      try {
        return await fetchEndpoint(endpoint);
      } catch (error) {
        return { error: error.message };
      }
    })
  );

  res.json(results);
});
```

### Pagination Optimization

```typescript
// Cursor-based pagination (more efficient than offset)
export async function getArticlesCursor(
  cursor?: string,
  limit: number = 20
) {
  const query = cursor
    ? { _id: { $lt: cursor } }
    : {};

  const articles = await Article.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = articles.length > limit;
  const items = hasMore ? articles.slice(0, -1) : articles;

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]._id : null,
    hasMore
  };
}
```

## Frontend Optimization

### Code Splitting

```typescript
// Next.js dynamic imports
import dynamic from 'next/dynamic';

// Lazy load heavy components
const ArticleChart = dynamic(() => import('@/components/ArticleChart'), {
  loading: () => <Skeleton />,
  ssr: false
});

const BiasAnalysis = dynamic(() => import('@/components/BiasAnalysis'), {
  loading: () => <Spinner />
});

// Route-based code splitting
const ArticleDetail = dynamic(() => import('@/pages/articles/[id]'));
```

### Image Optimization

```typescript
import Image from 'next/image';

// Use Next.js Image component
<Image
  src="/article-thumbnail.jpg"
  alt="Article thumbnail"
  width={400}
  height={300}
  quality={85}
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>

// Responsive images
<Image
  src="/hero.jpg"
  alt="Hero"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority
/>
```

### Bundle Size Optimization

```javascript
// next.config.js
module.exports = {
  // Enable SWC minification
  swcMinify: true,

  // Analyze bundle size
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20
          },
          // Common chunk
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true
          }
        }
      };
    }

    return config;
  },

  // Remove unused code
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@mui/material', 'lodash']
  }
};
```

### Performance Monitoring

```typescript
// Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  const body = JSON.stringify(metric);
  const url = '/api/analytics';

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, { body, method: 'POST', keepalive: true });
  }
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## AI Pipeline Optimization

### Batch Processing

```python
from typing import List
import asyncio

class BatchProcessor:
    def __init__(self, batch_size: int = 10):
        self.batch_size = batch_size
        self.batch = []

    async def process_articles(self, articles: List[dict]):
        """Process articles in batches"""
        results = []

        for i in range(0, len(articles), self.batch_size):
            batch = articles[i:i + self.batch_size]

            # Process batch concurrently
            batch_results = await asyncio.gather(*[
                self.process_article(article)
                for article in batch
            ])

            results.extend(batch_results)

        return results

    async def process_article(self, article: dict):
        """Process single article"""
        # Implementation
        pass
```

### Model Caching

```python
from functools import lru_cache
from langchain_google_genai import ChatGoogleGenerativeAI

@lru_cache(maxsize=1)
def get_llm():
    """Cached LLM instance"""
    return ChatGoogleGenerativeAI(
        model="gemini-pro",
        google_api_key=os.getenv("GOOGLE_AI_API_KEY"),
        temperature=0.7,
        max_output_tokens=2048
    )

# Use cached instance
llm = get_llm()
result = await llm.ainvoke(prompt)
```

### Async Processing

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=10)

async def process_articles_async(articles: List[dict]):
    """Process articles asynchronously"""
    loop = asyncio.get_event_loop()

    tasks = [
        loop.run_in_executor(
            executor,
            process_article,
            article
        )
        for article in articles
    ]

    results = await asyncio.gather(*tasks)
    return results
```

## CDN Configuration

### Vercel Edge Network

```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## Performance Testing

### Load Testing with k6

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp to 100
    { duration: '3m', target: 100 }, // Stay at 100
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  const response = http.get('https://synthoraai.vercel.app/api/articles');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

Run test:
```bash
k6 run --vus 10 --duration 30s load-test.js
```

---

**Last Updated**: November 2025
**Version**: 1.0
**Owner**: SynthoraAI Performance Team
