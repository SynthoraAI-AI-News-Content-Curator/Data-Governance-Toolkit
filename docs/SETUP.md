# Complete Setup Guide

This guide will walk you through setting up the entire Data Governance Toolkit from scratch.

## Prerequisites

### Required Software

- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later (comes with Node.js)
- **Python**: v3.11 or later (for AI pipeline)
- **Git**: v2.30 or later
- **MongoDB**: v6.0 or later (local or cloud)

### Optional Software

- **Docker**: v24.0+ (for containerized development)
- **Docker Compose**: v2.20+ (for multi-container setup)
- **Vercel CLI**: For deployment

### Required Accounts & API Keys

1. **MongoDB Atlas** (Free tier available)
   - Sign up at: https://www.mongodb.com/cloud/atlas
   - Create a cluster and get connection string

2. **Google AI API** (Gemini)
   - Sign up at: https://ai.google.dev/
   - Generate API key

3. **NewsAPI** (Free tier: 100 requests/day)
   - Sign up at: https://newsapi.org/
   - Get API key

4. **Resend** (Email service)
   - Sign up at: https://resend.com/
   - Get API key and configure domain

5. **Pinecone** (Vector database, free tier available)
   - Sign up at: https://www.pinecone.io/
   - Create index with 1536 dimensions

6. **Vercel** (Hosting, free tier available)
   - Sign up at: https://vercel.com/

## Step 1: Clone the Repository

```bash
# Clone the main project
git clone https://github.com/hoangsonww/AI-Gov-Content-Curator.git
cd AI-Gov-Content-Curator

# Verify the structure
ls -la
# Should see: backend/ crawler/ frontend/ newsletters/ agentic_ai/
```

## Step 2: Install Dependencies

### Install Root Dependencies

```bash
# Install monorepo dependencies
npm install

# This installs:
# - Husky (Git hooks)
# - ESLint (Linting)
# - Prettier (Formatting)
# - Concurrently (Run multiple commands)
```

### Install Service Dependencies

```bash
# Backend
cd backend
npm install
cd ..

# Crawler
cd crawler
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..

# Newsletter
cd newsletters
npm install
cd ..

# AI Pipeline
cd agentic_ai
pip install -r requirements.txt
cd ..
```

## Step 3: Configure Environment Variables

### Create Root .env File

```bash
# Create .env in project root
touch .env
```

Add the following variables:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/aicc?retryWrites=true&w=majority

# Google AI (Gemini)
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
GOOGLE_AI_API_KEY1=optional_backup_key_1
GOOGLE_AI_API_KEY2=optional_backup_key_2
GOOGLE_AI_API_KEY3=optional_backup_key_3

# AI Instructions
AI_INSTRUCTIONS=Summarize the articles concisely and naturally, focusing on key points for government officials.

# NewsAPI
NEWS_API_KEY=your_newsapi_key_here
NEWS_API_KEY1=optional_backup_key

# Server
PORT=3000

# Crawl URLs (comma-separated)
CRAWL_URLS=https://www.state.gov/press-releases/,https://www.whitehouse.gov/briefing-room/,https://www.congress.gov/,https://www.bbc.com/news,https://www.nytimes.com/

# API URL (for frontend)
AICC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000

# Resend (Newsletter)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM="SynthoraAI <noreply@yourdomain.com>"
UNSUBSCRIBE_BASE_URL=http://localhost:3000/api/newsletter/unsubscribe

# Pinecone (Vector Database)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=synthoraai-articles

# Redis (Optional, for caching)
REDIS_URL=redis://localhost:6379

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long

# Environment
NODE_ENV=development
```

### Create Service-Specific .env Files (Optional)

Some services may need their own `.env` files:

```bash
# Frontend .env.local
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local
cd ..

# AI Pipeline .env
cd agentic_ai
cp .env.example .env
# Edit with your API keys
cd ..
```

## Step 4: Set Up MongoDB

### Option A: MongoDB Atlas (Cloud - Recommended)

1. **Create Account & Cluster**
   ```
   Go to: https://www.mongodb.com/cloud/atlas
   Sign up → Create Free Cluster → Choose region → Create
   ```

2. **Configure Network Access**
   ```
   Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)
   ```

3. **Create Database User**
   ```
   Database Access → Add New Database User
   Username: aicc_admin
   Password: [generate strong password]
   Database User Privileges: Read and write to any database
   ```

4. **Get Connection String**
   ```
   Clusters → Connect → Connect your application → Copy connection string
   Replace <password> with your actual password
   Update MONGODB_URI in .env
   ```

### Option B: Local MongoDB

```bash
# Install MongoDB (macOS)
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0

# Install MongoDB (Ubuntu)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod

# Connection string for local MongoDB
MONGODB_URI=mongodb://localhost:27017/aicc
```

### Initialize Database

```bash
# Run database seeding script (if available)
cd backend
npm run db:seed
cd ..
```

## Step 5: Set Up Pinecone

1. **Create Account**
   ```
   Go to: https://www.pinecone.io/
   Sign up for free tier
   ```

2. **Create Index**
   ```
   Dashboard → Create Index
   Name: synthoraai-articles
   Dimensions: 1536
   Metric: cosine
   Pod Type: p1.x1 (free tier)
   ```

3. **Get API Key**
   ```
   API Keys → Copy API Key and Environment
   Update .env:
   PINECONE_API_KEY=your_api_key
   PINECONE_ENVIRONMENT=us-west1-gcp
   PINECONE_INDEX_NAME=synthoraai-articles
   ```

## Step 6: Configure Resend (Newsletter)

1. **Create Account**
   ```
   Go to: https://resend.com/
   Sign up → Verify email
   ```

2. **Add Domain**
   ```
   Domains → Add Domain → Enter your domain (e.g., yourdomain.com)
   Add DNS records to your domain registrar:
   - TXT record for verification
   - MX records for receiving
   ```

3. **Get API Key**
   ```
   API Keys → Create API Key
   Copy and add to .env:
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   RESEND_FROM="SynthoraAI <noreply@yourdomain.com>"
   ```

## Step 7: Run the Application

### Option A: Run All Services Together

```bash
# From project root
npm run dev

# This starts:
# - Frontend on http://localhost:3000
# - Backend on http://localhost:3001
# - Crawler on http://localhost:3002
# - Newsletter on http://localhost:3003
```

### Option B: Run Services Individually

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Crawler
cd crawler
npm run dev

# Terminal 4: Newsletter
cd newsletters
npm run dev

# Terminal 5: AI Pipeline (Python)
cd agentic_ai
python -m agentic_ai.mcp_server.server
```

### Option C: Docker Compose

```bash
# Build and run all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Step 8: Verify Installation

### 1. Test Backend API

```bash
# Health check
curl http://localhost:3001/api/health

# Get articles
curl http://localhost:3001/api/articles

# Expected response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### 2. Test Frontend

```
Open browser: http://localhost:3000
You should see the SynthoraAI home page with article listings
```

### 3. Test Crawler

```bash
# Trigger manual crawl
cd crawler
npm run crawl

# Or via API
curl -X POST http://localhost:3002/api/scheduled/fetchAndSummarize
```

### 4. Test AI Pipeline

```bash
cd agentic_ai
python -c "
from agentic_ai.core.pipeline import AgenticPipeline
import asyncio

async def test():
    pipeline = AgenticPipeline()
    result = await pipeline.process_article({
        'id': 'test-001',
        'content': 'Test article content here...',
        'url': 'https://example.com/test',
        'source': 'test'
    })
    print(result)

asyncio.run(test())
"
```

## Step 9: Run Tests

### Backend Tests

```bash
cd backend
npm run test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Frontend Tests

```bash
cd frontend
npm run test:e2e

# Headed mode
npm run test:e2e:headed

# View report
npm run test:e2e:report
```

### Crawler Tests

```bash
cd crawler
npm run test
```

### AI Pipeline Tests

```bash
cd agentic_ai
pytest tests/ -v
```

## Step 10: Set Up Git Hooks (Optional)

```bash
# Install Husky
npm run prepare

# This sets up pre-commit hooks that:
# - Run ESLint
# - Run Prettier
# - Run tests
```

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check MongoDB is running
mongosh

# Test connection
mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net/" --username youruser

# Check network access in MongoDB Atlas
# Ensure your IP is whitelisted
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3005 npm run dev
```

### API Key Issues

```bash
# Verify environment variables are loaded
node -e "require('dotenv').config(); console.log(process.env.GOOGLE_AI_API_KEY)"

# Should print your API key (not undefined)
```

### Dependency Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Docker Issues

```bash
# Rebuild containers
docker-compose up --build --force-recreate

# Remove volumes
docker-compose down -v

# View logs
docker-compose logs -f backend
```

## Next Steps

1. **Explore the Application**
   - Browse articles at http://localhost:3000
   - Create an account and test authentication
   - Mark favorites, rate articles, add comments

2. **Trigger a Crawl**
   - Run the crawler to fetch latest articles
   - Check MongoDB for new articles
   - Verify AI summarization is working

3. **Customize Configuration**
   - Add more crawl URLs in .env
   - Adjust AI instructions
   - Configure newsletter schedule

4. **Deploy to Production**
   - Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel deployment
   - Set up production environment variables
   - Configure custom domain

## Getting Help

- **Documentation**: [Full docs](../README.md)
- **GitHub Issues**: [Report bugs](https://github.com/hoangsonww/AI-Gov-Content-Curator/issues)
- **Email**: hoangson091104@gmail.com
- **Jira Board**: https://ai-content-curator.atlassian.net

---

**Setup Complete!** 🎉

You now have a fully functional Data Governance Toolkit running locally.
