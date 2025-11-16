# System Architecture

## High-Level Architecture

The Data Governance Toolkit is built on a microservices architecture with five independent services that communicate through well-defined APIs and shared data stores.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                │
├─────────────────────────────────────────────────────────────────────┤
│  Web Browser  │  Mobile Browser  │  CLI Tool  │  External APIs      │
└────────┬──────────────┬───────────────┬────────────────┬────────────┘
         │              │               │                │
         ▼              ▼               ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway / CDN (Vercel)                  │
└────────┬──────────────┬───────────────┬────────────────┬────────────┘
         │              │               │                │
         ▼              ▼               ▼                ▼
┌─────────────┐  ┌──────────┐  ┌──────────────┐  ┌─────────────┐
│  Frontend   │  │ Backend  │  │   Crawler    │  │ Newsletter  │
│  (Next.js)  │  │(Express) │  │ (Puppeteer)  │  │  (Resend)   │
└─────────────┘  └──────────┘  └──────────────┘  └─────────────┘
         │              │               │                │
         │              ▼               │                │
         │       ┌─────────────┐        │                │
         │       │  AI Pipeline│        │                │
         │       │ (LangGraph) │        │                │
         │       └─────────────┘        │                │
         │              │               │                │
         └──────────────┴───────────────┴────────────────┘
                        │
         ┌──────────────┼──────────────┬────────────┐
         ▼              ▼              ▼            ▼
    ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐
    │ MongoDB │  │ Pinecone │  │  Redis   │  │  Logs   │
    └─────────┘  └──────────┘  └──────────┘  └─────────┘
```

## Microservices Architecture

### 1. Frontend Service

**Technology**: Next.js 14, React 18, TypeScript, Tailwind CSS

**Responsibilities**:
- Render user interface for browsing articles
- Handle user authentication (login, registration)
- Display article details, summaries, bias analysis
- Manage user favorites and preferences
- Provide search and filtering capabilities
- Support dark mode and responsive design

**Key Routes**:
```
/                    → Home page with article listings
/articles/:id        → Article detail page
/favorites           → User's favorite articles
/newsletter          → Newsletter subscription
/auth/login          → Login page
/auth/register       → Registration page
/search              → Search results
```

**API Communication**:
```typescript
// Example API call from frontend
const fetchArticles = async (page = 1, limit = 10) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/articles?page=${page}&limit=${limit}`
  );
  return response.json();
};
```

**State Management**:
- React Context for global state (auth, theme)
- SWR for data fetching and caching
- Local storage for user preferences

### 2. Backend Service

**Technology**: Express.js, Next.js API Routes, MongoDB, Mongoose

**Responsibilities**:
- RESTful API for article CRUD operations
- User authentication and authorization (JWT)
- AI-powered summarization (Google Generative AI)
- Bias detection and sentiment analysis
- Article rating and commenting system
- Scheduled content updates (cron jobs)

**API Endpoints**:

```javascript
// Article Management
GET    /api/articles           → List articles (paginated)
GET    /api/articles/:id       → Get article by ID
POST   /api/articles           → Create article (admin)
PUT    /api/articles/:id       → Update article (admin)
DELETE /api/articles/:id       → Delete article (admin)

// User Management
POST   /api/auth/register      → Register new user
POST   /api/auth/login         → Login user
POST   /api/auth/logout        → Logout user
GET    /api/auth/me            → Get current user
POST   /api/auth/reset-password → Reset password

// Features
POST   /api/articles/:id/favorite    → Toggle favorite
POST   /api/articles/:id/rate        → Rate article
POST   /api/articles/:id/comment     → Add comment
GET    /api/articles/:id/related     → Get related articles
POST   /api/articles/:id/qa          → Ask question about article
GET    /api/articles/:id/bias        → Get bias analysis

// Newsletter
POST   /api/newsletter/subscribe     → Subscribe to newsletter
POST   /api/newsletter/unsubscribe   → Unsubscribe
```

**Database Schema**:

```typescript
// Article Schema
{
  _id: ObjectId,
  title: String,
  content: String,
  summary: String,
  url: String,
  source: String,
  topics: [String],
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
  qualityScore: Number,
  publishedAt: Date,
  fetchedAt: Date,
  updatedAt: Date,
  views: Number,
  favorites: [ObjectId],
  ratings: [{
    userId: ObjectId,
    rating: Number,
    createdAt: Date
  }],
  comments: [{
    userId: ObjectId,
    content: String,
    upvotes: [ObjectId],
    downvotes: [ObjectId],
    createdAt: Date
  }]
}

// User Schema
{
  _id: ObjectId,
  email: String,
  password: String, // hashed
  name: String,
  role: String, // 'user' | 'admin'
  favorites: [ObjectId],
  preferences: {
    theme: String,
    newsletter: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Crawler Service

**Technology**: Puppeteer, Cheerio, Axios, TypeScript

**Responsibilities**:
- Crawl government and news websites for articles
- Extract article metadata (title, URL, content)
- Handle both static and dynamic content
- Implement retry logic for failed requests
- Schedule daily crawls via Vercel cron

**Crawling Strategy**:

```typescript
// Hybrid crawling approach
async function crawlArticles(url: string) {
  try {
    // 1. Try static crawling first (faster)
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const articles = extractArticles($);

    if (articles.length > 0) return articles;

    // 2. Fallback to dynamic crawling (slower but handles JS)
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const content = await page.content();
    const articles = extractArticles(cheerio.load(content));
    await browser.close();

    return articles;
  } catch (error) {
    // 3. Retry with exponential backoff
    return retryWithBackoff(() => crawlArticles(url));
  }
}
```

**Sources Crawled**:
- https://www.state.gov/press-releases/
- https://www.whitehouse.gov/briefing-room/
- https://www.congress.gov/
- NewsAPI (for additional sources)
- BBC News, NY Times, local news outlets

**Scheduling**:
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

### 4. Newsletter Service

**Technology**: Resend API, Nodemailer, MongoDB

**Responsibilities**:
- Manage email subscriptions
- Send daily newsletters with latest articles
- Handle unsubscribe requests
- Template management for emails

**Email Template**:
```html
<!DOCTYPE html>
<html>
<head>
  <title>SynthoraAI Daily Digest</title>
</head>
<body>
  <h1>Your Daily News Summary</h1>
  <p>Here are today's top articles:</p>

  {{#each articles}}
  <div style="margin-bottom: 20px;">
    <h3>{{title}}</h3>
    <p>{{summary}}</p>
    <a href="{{url}}">Read More</a>
  </div>
  {{/each}}

  <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
</body>
</html>
```

**Subscription Flow**:
```
User enters email → Validate email → Save to DB → Send confirmation
                                              ↓
                                        Add to Resend list
                                              ↓
                                     Daily cron sends newsletter
```

### 5. Agentic AI Pipeline

**Technology**: LangGraph, LangChain, Python 3.11+, Redis

**Responsibilities**:
- Multi-agent content processing
- Content analysis and extraction
- Summarization with quality checks
- Topic classification
- Sentiment analysis
- Quality assurance and validation

**Agent Architecture**:

```python
from langgraph.graph import StateGraph

# Define the processing graph
workflow = StateGraph(ArticleState)

# Add nodes (agents)
workflow.add_node("intake", intake_node)
workflow.add_node("analyze", content_analyzer_agent)
workflow.add_node("summarize", summarizer_agent)
workflow.add_node("classify", classifier_agent)
workflow.add_node("sentiment", sentiment_analyzer_agent)
workflow.add_node("quality_check", quality_checker_agent)
workflow.add_node("output", output_node)

# Define edges (flow)
workflow.add_edge("intake", "analyze")
workflow.add_edge("analyze", "summarize")
workflow.add_edge("summarize", "classify")
workflow.add_edge("classify", "sentiment")
workflow.add_edge("sentiment", "quality_check")

# Conditional routing based on quality
workflow.add_conditional_edges(
    "quality_check",
    should_retry,
    {
        "retry": "analyze",  # Retry if quality is low
        "output": "output"   # Proceed if quality is good
    }
)

# Set entry and exit points
workflow.set_entry_point("intake")
workflow.set_finish_point("output")

# Compile the graph
app = workflow.compile()
```

**Agent Specifications**:

```python
# Content Analyzer Agent
class ContentAnalyzerAgent:
    def __init__(self, llm):
        self.llm = llm

    def analyze(self, article: dict) -> dict:
        """Extract structure, entities, dates, and writing style"""
        prompt = f"""
        Analyze the following article:
        {article['content']}

        Extract:
        1. Key entities (people, organizations, locations)
        2. Important dates and events
        3. Writing style and tone
        4. Main arguments and claims
        """
        return self.llm.invoke(prompt)

# Summarizer Agent
class SummarizerAgent:
    def __init__(self, llm):
        self.llm = llm

    def summarize(self, article: dict, analysis: dict) -> str:
        """Generate 150-200 word summary"""
        prompt = f"""
        Based on this analysis: {analysis}

        Summarize the article in 150-200 words, focusing on:
        - Main points and key takeaways
        - Important facts and figures
        - Implications for government officials
        """
        return self.llm.invoke(prompt)

# Classifier Agent
class ClassifierAgent:
    TOPICS = [
        "Politics & Government", "International Relations",
        "Economy & Finance", "Healthcare", "Education",
        # ... 15+ topics
    ]

    def classify(self, article: dict) -> list[str]:
        """Classify article into relevant topics"""
        # ML-based classification
        return self.model.predict(article['content'])

# Sentiment Analyzer Agent
class SentimentAnalyzerAgent:
    def analyze(self, article: dict) -> dict:
        """Analyze sentiment, objectivity, urgency, controversy"""
        return {
            "tone": self.analyze_tone(article),
            "objectivity": self.score_objectivity(article),
            "urgency": self.score_urgency(article),
            "controversy": self.score_controversy(article)
        }

# Quality Checker Agent
class QualityCheckerAgent:
    def check(self, processed_article: dict) -> tuple[bool, int]:
        """Validate processing quality and return pass/fail + score"""
        score = 0

        # Check completeness
        if all(processed_article.get(field) for field in REQUIRED_FIELDS):
            score += 25

        # Check summary quality
        if self.is_coherent(processed_article['summary']):
            score += 25

        # Check metadata accuracy
        if self.validate_metadata(processed_article):
            score += 25

        # Check source credibility
        if self.is_credible_source(processed_article['source']):
            score += 25

        return (score >= 80, score)
```

**MCP Server** (Model Context Protocol):

```python
from fastmcp import FastMCP

mcp = FastMCP("SynthoraAI Agent Pipeline")

@mcp.tool()
async def process_article(article_id: str) -> dict:
    """Process an article through the AI pipeline"""
    article = await fetch_article(article_id)
    result = await app.ainvoke({"article": article})
    return result

@mcp.tool()
async def reprocess_failed_articles() -> list[dict]:
    """Reprocess articles that failed quality checks"""
    failed = await get_failed_articles()
    results = []
    for article in failed:
        result = await app.ainvoke({"article": article})
        results.append(result)
    return results

# Run MCP server
if __name__ == "__main__":
    mcp.run()
```

## Data Flow

### Article Processing Flow

```
1. Crawling Phase
   Crawler → Extract URLs → Fetch Content → Store Raw Data → MongoDB

2. Processing Phase
   MongoDB → AI Pipeline → Multi-Agent Processing → Quality Check
                                                           ↓
                                                     Pass? → MongoDB
                                                           ↓
                                                     Fail? → Retry (max 3x)

3. Serving Phase
   MongoDB → Backend API → Frontend → User

4. Recommendation Phase
   Article → Generate Embeddings → Pinecone → Vector Similarity Search
```

### User Authentication Flow

```
1. Registration
   User → Frontend → POST /api/auth/register → Backend
                                                  ↓
                                          Hash Password
                                                  ↓
                                           Store in MongoDB
                                                  ↓
                                        Generate JWT Token
                                                  ↓
                                     Set HTTP-Only Cookie
                                                  ↓
                                       Frontend ← Response

2. Login
   User → Frontend → POST /api/auth/login → Backend
                                               ↓
                                       Verify Password
                                               ↓
                                        Generate JWT
                                               ↓
                                    Set HTTP-Only Cookie
                                               ↓
                                      Frontend ← Response

3. Protected Requests
   User → Frontend → Request + Cookie → Backend
                                          ↓
                                    Verify JWT
                                          ↓
                                   Allow/Deny Access
```

### Newsletter Flow

```
1. Daily Cron Trigger (9:00 AM UTC)
   Vercel Cron → Newsletter Service
                       ↓
                Fetch Latest Articles (last 24h)
                       ↓
                Get All Subscribers
                       ↓
                Generate Email HTML
                       ↓
                Send via Resend API
                       ↓
                Log Results
```

## Deployment Architecture

### Vercel Serverless

All services are deployed on Vercel as serverless functions:

```
Frontend:  synthoraai.vercel.app
Backend:   ai-content-curator-backend.vercel.app
Crawler:   ai-content-curator-crawler.vercel.app
Newsletter: ai-content-curator-newsletters.vercel.app
```

**Benefits**:
- Auto-scaling
- Global CDN
- Built-in SSL/TLS
- Zero server management
- Cron job scheduling

### Cloud Services

**AWS Integration**:
- **S3**: Article media storage
- **CloudWatch**: Logging and monitoring
- **Secrets Manager**: API key management
- **Lambda**: Alternative for AI pipeline
- **SQS**: Message queue for async processing

**Azure Integration**:
- **Blob Storage**: Media storage
- **Application Insights**: Monitoring
- **Key Vault**: Secrets management
- **Functions**: Alternative for AI pipeline
- **Storage Queues**: Message queue

### Database Architecture

**MongoDB Atlas**:
- Shared cluster for development
- Dedicated cluster for production
- Replica set for high availability
- Automatic backups
- Connection pooling via Mongoose

**Pinecone**:
- Vector database for semantic search
- 1536-dimensional embeddings
- Cosine similarity search
- Metadata filtering support

**Redis**:
- Caching layer for frequently accessed data
- Session storage
- Rate limiting
- Real-time analytics

## Security Architecture

### Authentication & Authorization

```
User → Frontend → Backend API
                      ↓
                 JWT Middleware
                      ↓
              Verify Token Signature
                      ↓
              Extract User Claims
                      ↓
           Check User Permissions (RBAC)
                      ↓
          Allow/Deny Access to Resource
```

### API Security

- **Rate Limiting**: 100 requests/minute per IP
- **CORS**: Whitelist trusted domains only
- **Input Validation**: Sanitize all user inputs
- **SQL Injection Prevention**: Use parameterized queries
- **XSS Prevention**: Content Security Policy headers
- **CSRF Protection**: SameSite cookies

### Secrets Management

```javascript
// Development: .env files
MONGODB_URI=mongodb://localhost:27017/aicc
GOOGLE_AI_API_KEY=dev-key-123

// Production: Secrets Manager
const secrets = await getSecretValue("aicc/production/api-keys");
const MONGODB_URI = secrets.MONGODB_URI;
const GOOGLE_AI_API_KEY = secrets.GOOGLE_AI_API_KEY;
```

## Monitoring & Observability

### Logging

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

logger.info('Article processed', {
  articleId: '64a1f2d3',
  duration: 1234,
  qualityScore: 92
});
```

### Metrics

```javascript
import prometheus from 'prom-client';

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const articlesProcessed = new prometheus.Counter({
  name: 'articles_processed_total',
  help: 'Total number of articles processed'
});
```

### Alerting

- API error rate >1% → Slack notification
- Database connection failures → PagerDuty alert
- Quality score <80 for >10% of articles → Email admin
- Newsletter send failures → Slack notification

## Scalability Considerations

### Horizontal Scaling
- Serverless functions auto-scale with demand
- Database read replicas for read-heavy operations
- CDN caching for static assets

### Vertical Scaling
- Increase MongoDB cluster tier for more storage/memory
- Use larger Vercel function size for AI processing
- Increase Pinecone pod size for faster vector search

### Performance Optimizations
- Database indexing on frequently queried fields
- Redis caching for hot data
- Lazy loading images in frontend
- Code splitting and tree shaking
- API response compression (gzip)

---

**Last Updated**: November 2025
**Version**: 1.0
**Architecture Owner**: SynthoraAI Team
