# Quick Start Guide

Get the Data Governance Toolkit up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- MongoDB connection string (free tier from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- Google AI API key (free from [Google AI Studio](https://ai.google.dev/))

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/hoangsonww/AI-Gov-Content-Curator.git
cd AI-Gov-Content-Curator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

Create `.env` file in the root:

```bash
MONGODB_URI=your_mongodb_connection_string
GOOGLE_AI_API_KEY=your_google_ai_api_key
NEWS_API_KEY=your_newsapi_key
AICC_API_URL=http://localhost:3000
PORT=3000
```

Get your API keys:
- **MongoDB**: [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) (free tier)
- **Google AI**: [https://ai.google.dev/](https://ai.google.dev/) (free tier)
- **NewsAPI**: [https://newsapi.org/](https://newsapi.org/) (free tier: 100 requests/day)

### 4. Run the Application

```bash
npm run dev
```

This starts all services:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Crawler**: http://localhost:3002
- **Newsletter**: http://localhost:3003

## First Steps

### 1. Browse Articles

Open http://localhost:3000 in your browser to see the article listing.

### 2. Trigger a Crawl

Fetch the latest articles:

```bash
cd crawler
npm run crawl
```

This will:
- Crawl government websites and news sources
- Extract article content
- Generate AI summaries
- Store in MongoDB

### 3. Create an Account

1. Go to http://localhost:3000/auth/register
2. Sign up with your email
3. Login to access features:
   - Mark articles as favorites
   - Rate articles
   - Add comments
   - Subscribe to newsletter

### 4. Try Article Q&A

1. Open any article
2. Scroll to the Q&A section
3. Ask questions like:
   - "What are the main points?"
   - "What policies are mentioned?"
   - "Who are the key people involved?"

## Using the CLI

The `aicc` command provides a unified interface:

```bash
# Link the CLI
npm link

# Start all services
aicc dev

# Create an article
aicc article create \
  --title "Sample Article" \
  --content "Article content here..." \
  --topics politics government

# List articles
aicc article list --limit 10

# Get article by ID
aicc article get <article-id>
```

## Common Tasks

### Run Tests

```bash
# All tests
npm run test

# Specific service
cd backend && npm run test
cd frontend && npm run test:e2e
```

### Lint and Format

```bash
# Lint all code
npm run lint

# Format all code
npm run format
```

### Build for Production

```bash
# Build all services
npm run build

# Build specific service
cd backend && npm run build
```

## Next Steps

- **Full Setup**: See [SETUP.md](./docs/SETUP.md) for detailed configuration
- **Architecture**: Read [ARCHITECTURE.md](./docs/ARCHITECTURE.md) to understand the system
- **API Reference**: Check [API_REFERENCE.md](./docs/API_REFERENCE.md) for API documentation
- **Deploy**: Follow [DEPLOYMENT.md](./docs/DEPLOYMENT.md) to deploy to production

## Troubleshooting

### MongoDB Connection Error

```
Error: connect ECONNREFUSED
```

**Solution**: Verify your `MONGODB_URI` is correct and MongoDB Atlas network access allows your IP.

### Port Already in Use

```
Error: listen EADDRINUSE :::3000
```

**Solution**: Change the port in `.env`:
```bash
PORT=3005
```

### API Key Invalid

```
Error: API key not valid
```

**Solution**: Verify your API keys in `.env` are correct and active.

## Getting Help

- **Documentation**: [Full docs](./README.md)
- **GitHub Issues**: [Report issues](https://github.com/hoangsonww/AI-Gov-Content-Curator/issues)
- **Email**: hoangson091104@gmail.com

---

**You're all set!** Start exploring the Data Governance Toolkit. 🚀
