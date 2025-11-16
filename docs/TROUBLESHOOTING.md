# Troubleshooting Guide

Common issues and solutions for the Data Governance Toolkit.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Database Issues](#database-issues)
- [API Issues](#api-issues)
- [Frontend Issues](#frontend-issues)
- [Crawler Issues](#crawler-issues)
- [Deployment Issues](#deployment-issues)
- [Performance Issues](#performance-issues)

## Installation Issues

### npm install fails

**Problem**: `npm install` fails with permission errors

**Solution**:
```bash
# Option 1: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Option 2: Use sudo (not recommended)
sudo npm install

# Option 3: Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Python dependencies fail to install

**Problem**: `pip install -r requirements.txt` fails

**Solution**:
```bash
# Upgrade pip
python -m pip install --upgrade pip

# Install build tools (Ubuntu/Debian)
sudo apt-get install python3-dev build-essential

# Install build tools (macOS)
xcode-select --install

# Use virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Database Issues

### MongoDB connection refused

**Problem**: `MongoServerError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution**:
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Enable MongoDB on boot
sudo systemctl enable mongod

# Check connection string
# Ensure MONGODB_URI in .env is correct
MONGODB_URI=mongodb://localhost:27017/aicc
```

### MongoDB Atlas connection timeout

**Problem**: Connection times out with MongoDB Atlas

**Solution**:
1. **Check Network Access**:
   - Go to MongoDB Atlas → Network Access
   - Add your IP address or `0.0.0.0/0` (for testing only)

2. **Verify connection string**:
   ```bash
   # Correct format
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/aicc?retryWrites=true&w=majority

   # Test connection
   mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net/" --username youruser
   ```

3. **Check firewall**:
   ```bash
   # Allow MongoDB port
   sudo ufw allow 27017
   ```

### Database queries are slow

**Problem**: Database queries taking >1s

**Solution**:
```javascript
// 1. Add indexes
db.articles.createIndex({ source: 1, publishedAt: -1 });
db.articles.createIndex({ topics: 1 });

// 2. Use explain() to analyze queries
db.articles.find({ source: 'state.gov' }).explain('executionStats');

// 3. Use projection to limit fields
db.articles.find(
  { source: 'state.gov' },
  { title: 1, summary: 1 }
);

// 4. Enable query profiling
db.setProfilingLevel(1, { slowms: 100 });
db.system.profile.find().limit(5).sort({ ts: -1 });
```

## API Issues

### API returns 401 Unauthorized

**Problem**: API requests return 401 even with valid credentials

**Solution**:
```typescript
// 1. Check JWT token
const token = req.cookies.token;
console.log('Token:', token);

// 2. Verify JWT_SECRET matches
console.log('JWT_SECRET:', process.env.JWT_SECRET);

// 3. Check token expiration
import jwt from 'jsonwebtoken';
const decoded = jwt.decode(token);
console.log('Token expires:', new Date(decoded.exp * 1000));

// 4. Clear cookies and login again
document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
```

### API returns 429 Too Many Requests

**Problem**: Rate limit exceeded

**Solution**:
```bash
# 1. Wait for rate limit window to reset (usually 1 minute)

# 2. Increase rate limit (in backend config)
# backend/src/lib/middleware/rateLimiter.ts
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200 // Increase from 100
});

# 3. Use Redis for distributed rate limiting
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:'
  })
});

# 4. Implement request batching on client side
```

### CORS errors

**Problem**: `Access-Control-Allow-Origin` errors

**Solution**:
```typescript
// backend/src/lib/middleware/cors.ts
import cors from 'cors';

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://synthoraai.vercel.app']
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Frontend Issues

### Page loads but shows blank screen

**Problem**: React app renders blank page

**Solution**:
```bash
# 1. Check browser console for errors
# Open DevTools → Console

# 2. Check for JavaScript errors
# Look for:
# - Module not found
# - Unexpected token
# - Failed to compile

# 3. Clear Next.js cache
rm -rf .next
npm run dev

# 4. Check for hydration errors
# Look for: "Text content does not match server-rendered HTML"
# Fix: Ensure server and client render the same content
```

### Images not loading

**Problem**: Images return 404 or don't display

**Solution**:
```typescript
// 1. Use Next.js Image component
import Image from 'next/image';

<Image
  src="/images/logo.png"  // Must be in public/images/
  alt="Logo"
  width={200}
  height={100}
/>

// 2. For external images, add to next.config.js
module.exports = {
  images: {
    domains: ['example.com', 'cdn.example.com']
  }
};

// 3. Check file path
// ✅ Correct: public/images/logo.png → src="/images/logo.png"
// ❌ Wrong: src="public/images/logo.png"
```

### Build fails with TypeScript errors

**Problem**: `npm run build` fails with type errors

**Solution**:
```bash
# 1. Check TypeScript configuration
cat tsconfig.json

# 2. Run type check
npm run type-check

# 3. Fix type errors
# Common issues:
# - Missing type definitions: npm install @types/package-name
# - Incorrect imports: Check import paths
# - Any types: Replace 'any' with proper types

# 4. Ignore specific errors (last resort)
// @ts-ignore
const problematicCode = ...;
```

## Crawler Issues

### Crawler returns empty results

**Problem**: Crawler runs but finds no articles

**Solution**:
```typescript
// 1. Check if website structure changed
// Inspect HTML of target website
// Update selectors in crawler

// 2. Check for rate limiting
// Add delays between requests
await new Promise(resolve => setTimeout(resolve, 2000));

// 3. Use Puppeteer instead of Axios
// Some sites require JavaScript execution
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto(url);
const content = await page.content();

// 4. Check robots.txt
// Ensure crawling is allowed
curl https://example.com/robots.txt
```

### Puppeteer fails to launch

**Problem**: `Error: Failed to launch the browser process`

**Solution**:
```bash
# 1. Install dependencies (Ubuntu/Debian)
sudo apt-get install -y \
  gconf-service libasound2 libatk1.0-0 libc6 libcairo2 \
  libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 \
  libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 \
  libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 \
  libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
  libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
  libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 \
  libnss3 lsb-release xdg-utils wget

# 2. Install Chromium
npx @puppeteer/browsers install chrome@stable

# 3. Run in headless mode
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

### API key errors with NewsAPI

**Problem**: `NewsAPI error: Unauthorized`

**Solution**:
```bash
# 1. Verify API key
curl "https://newsapi.org/v2/top-headlines?country=us&apiKey=YOUR_API_KEY"

# 2. Check rate limits
# Free tier: 100 requests/day
# Upgrade if needed: https://newsapi.org/pricing

# 3. Use multiple API keys
NEWS_API_KEY=key1
NEWS_API_KEY1=key2
NEWS_API_KEY2=key3

# 4. Implement key rotation
const keys = [
  process.env.NEWS_API_KEY,
  process.env.NEWS_API_KEY1,
  process.env.NEWS_API_KEY2
];
const currentKey = keys[Math.floor(Math.random() * keys.length)];
```

## Deployment Issues

### Vercel deployment fails

**Problem**: Deployment fails on Vercel

**Solution**:
```bash
# 1. Check build logs
vercel logs <deployment-url>

# 2. Common issues:

# Missing environment variables
# Fix: Add in Vercel Dashboard → Settings → Environment Variables

# Build timeout (10 minutes on free tier)
# Fix: Optimize build process or upgrade plan

# Out of memory
# Fix: Add to vercel.json:
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next",
      "config": {
        "maxLambdaSize": "50mb"
      }
    }
  ]
}

# 3. Test locally first
vercel dev
```

### Docker container won't start

**Problem**: `docker-compose up` fails

**Solution**:
```bash
# 1. Check logs
docker-compose logs -f backend

# 2. Verify environment variables
docker-compose config

# 3. Rebuild containers
docker-compose up --build --force-recreate

# 4. Check port conflicts
lsof -i :3000
kill -9 <PID>

# 5. Clean Docker cache
docker system prune -a
```

## Performance Issues

### Slow API responses

**Problem**: API responses take >2s

**Solution**:
```bash
# 1. Enable query profiling
db.setProfilingLevel(1, { slowms: 100 });

# 2. Add indexes (see Database Issues)

# 3. Implement caching
# Use Redis for frequently accessed data

# 4. Optimize queries
# Use projection, limit results

# 5. Enable compression
app.use(compression());

# 6. Use CDN for static assets
```

### High memory usage

**Problem**: Application using >512MB memory

**Solution**:
```typescript
// 1. Monitor memory
process.memoryUsage();
// { rss, heapTotal, heapUsed, external }

// 2. Avoid memory leaks
// - Close database connections
// - Remove event listeners
// - Clear intervals/timeouts

// 3. Use streaming for large data
import { pipeline } from 'stream';
import { createReadStream } from 'fs';

pipeline(
  createReadStream('large-file.json'),
  transformStream,
  writeStream,
  (err) => console.error(err)
);

// 4. Limit concurrent operations
import pLimit from 'p-limit';
const limit = pLimit(10);

const promises = urls.map(url =>
  limit(() => fetch(url))
);
```

## Getting Help

If you can't find a solution here:

1. **Search existing issues**: https://github.com/hoangsonww/AI-Gov-Content-Curator/issues
2. **Create new issue**: Include:
   - Error message
   - Steps to reproduce
   - Environment (OS, Node version, etc.)
   - Relevant logs
3. **Email support**: hoangson091104@gmail.com
4. **Check documentation**: [Full docs](../README.md)

---

**Last Updated**: November 2025
**Version**: 1.0
