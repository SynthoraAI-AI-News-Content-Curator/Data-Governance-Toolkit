# API Reference

Complete API documentation for the Data Governance Toolkit backend.

**Base URL**: `https://ai-content-curator-backend.vercel.app/api`

**Development**: `http://localhost:3000/api`

## Authentication

Most endpoints require JWT authentication via HTTP-only cookies.

### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64a1f2d3e4b5c6a7d8e9f0",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64a1f2d3e4b5c6a7d8e9f0",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "64a1f2d3e4b5c6a7d8e9f0",
    "email": "user@example.com",
    "name": "John Doe",
    "favorites": ["64a1f2d3e4b5c6a7d8e9f1", "64a1f2d3e4b5c6a7d8e9f2"]
  }
}
```

## Articles

### List Articles

```http
GET /api/articles?page=1&limit=10&source=state.gov&topic=Politics
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `source` (optional): Filter by source
- `topic` (optional): Filter by topic
- `sort` (optional): Sort field (publishedAt, views, ratings)
- `order` (optional): Sort order (asc, desc)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "64a1f2d3e4b5c6a7d8e9f0",
      "title": "New Climate Policy Announced",
      "summary": "The government has announced a comprehensive climate policy...",
      "url": "https://www.state.gov/climate-policy",
      "source": "state.gov",
      "topics": ["Environment & Climate", "Politics & Government"],
      "sentiment": {
        "tone": "neutral",
        "objectivity": 85,
        "urgency": 60,
        "controversy": 30
      },
      "publishedAt": "2025-11-15T10:00:00Z",
      "fetchedAt": "2025-11-16T06:00:00Z",
      "views": 1234,
      "qualityScore": 92
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 543,
    "totalPages": 55
  }
}
```

### Get Article by ID

```http
GET /api/articles/:id
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "64a1f2d3e4b5c6a7d8e9f0",
    "title": "New Climate Policy Announced",
    "content": "Full article content here...",
    "summary": "AI-generated summary...",
    "url": "https://www.state.gov/climate-policy",
    "source": "state.gov",
    "topics": ["Environment & Climate"],
    "sentiment": {
      "tone": "neutral",
      "objectivity": 85,
      "urgency": 60,
      "controversy": 30
    },
    "biasAnalysis": {
      "score": 15,
      "indicators": ["balanced language", "multiple perspectives"],
      "overallAssessment": "Low bias detected..."
    },
    "ratings": {
      "average": 4.5,
      "count": 123
    },
    "comments": [
      {
        "id": "64a1f2d3e4b5c6a7d8e9f1",
        "userId": "64a1f2d3e4b5c6a7d8e9f2",
        "userName": "John Doe",
        "content": "Great article!",
        "upvotes": 5,
        "downvotes": 1,
        "createdAt": "2025-11-16T12:00:00Z"
      }
    ]
  }
}
```

### Create Article (Admin Only)

```http
POST /api/articles
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Breaking News",
  "content": "Full article content...",
  "url": "https://example.com/article",
  "source": "example.com",
  "topics": ["Politics & Government"]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "64a1f2d3e4b5c6a7d8e9f0",
    "title": "Breaking News",
    "summary": "AI-generated summary..."
  }
}
```

### Update Article (Admin Only)

```http
PUT /api/articles/:id
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Updated Title",
  "topics": ["Politics & Government", "Economy & Finance"]
}
```

### Delete Article (Admin Only)

```http
DELETE /api/articles/:id
Authorization: Bearer {admin_token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Article deleted successfully"
}
```

## Article Features

### Toggle Favorite

```http
POST /api/articles/:id/favorite
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "isFavorited": true
  }
}
```

### Rate Article

```http
POST /api/articles/:id/rate
Authorization: Bearer {token}
Content-Type: application/json

{
  "rating": 5
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "average": 4.5,
    "count": 124
  }
}
```

### Add Comment

```http
POST /api/articles/:id/comment
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "This is a great article!"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "64a1f2d3e4b5c6a7d8e9f1",
    "content": "This is a great article!",
    "upvotes": 0,
    "downvotes": 0,
    "createdAt": "2025-11-16T12:00:00Z"
  }
}
```

### Upvote/Downvote Comment

```http
POST /api/articles/:articleId/comment/:commentId/upvote
Authorization: Bearer {token}
```

### Get Related Articles

```http
GET /api/articles/:id/related?limit=6
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "64a1f2d3e4b5c6a7d8e9f1",
      "title": "Related Article 1",
      "summary": "Summary...",
      "similarity": 0.92
    }
  ]
}
```

### Get Bias Analysis

```http
GET /api/articles/:id/bias
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "score": 15,
    "indicators": [
      "balanced language",
      "multiple perspectives cited",
      "fact-based reporting"
    ],
    "overallAssessment": "This article demonstrates low bias with balanced language...",
    "recommendations": [
      "Continue maintaining objectivity",
      "Include diverse viewpoints"
    ]
  }
}
```

### Ask Question (Article Q&A)

```http
POST /api/articles/:id/qa
Authorization: Bearer {token}
Content-Type: application/json

{
  "question": "What are the main points of this policy?"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "question": "What are the main points of this policy?",
    "answer": "The main points of the policy include...",
    "confidence": 0.95,
    "sources": [
      {
        "text": "Relevant excerpt from article...",
        "position": 234
      }
    ]
  }
}
```

## Newsletter

### Subscribe

```http
POST /api/newsletter/subscribe
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Successfully subscribed to newsletter"
}
```

### Unsubscribe

```http
POST /api/newsletter/unsubscribe
Content-Type: application/json

{
  "email": "user@example.com"
}
```

## Search

### Search Articles

```http
GET /api/search?q=climate+policy&filters={"topics":["Environment"]}&page=1&limit=10
```

**Query Parameters**:
- `q` (required): Search query
- `filters` (optional): JSON object with filters
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response** (200 OK):
```json
{
  "success": true,
  "data": [...],
  "pagination": {...},
  "facets": {
    "topics": {
      "Environment & Climate": 45,
      "Politics & Government": 23
    },
    "sources": {
      "state.gov": 34,
      "whitehouse.gov": 12
    }
  }
}
```

## Statistics

### Get Dashboard Stats

```http
GET /api/stats
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "totalArticles": 543,
    "articlesToday": 23,
    "totalUsers": 1234,
    "avgQualityScore": 87.5,
    "topTopics": [
      {"topic": "Politics & Government", "count": 123},
      {"topic": "Economy & Finance", "count": 89}
    ],
    "topSources": [
      {"source": "state.gov", "count": 234},
      {"source": "whitehouse.gov", "count": 123}
    ]
  }
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  }
}
```

### Common Error Codes

- `400 Bad Request`: `VALIDATION_ERROR`, `INVALID_INPUT`
- `401 Unauthorized`: `UNAUTHORIZED`, `INVALID_TOKEN`
- `403 Forbidden`: `FORBIDDEN`, `INSUFFICIENT_PERMISSIONS`
- `404 Not Found`: `NOT_FOUND`, `RESOURCE_NOT_FOUND`
- `409 Conflict`: `DUPLICATE_ENTRY`, `CONFLICT`
- `429 Too Many Requests`: `RATE_LIMIT_EXCEEDED`
- `500 Internal Server Error`: `INTERNAL_ERROR`, `DATABASE_ERROR`

## Rate Limiting

- **Limit**: 100 requests per minute per IP
- **Headers**:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

**429 Response**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
}
```

## Webhooks (Coming Soon)

Subscribe to real-time events:
- `article.created`
- `article.updated`
- `article.deleted`
- `user.registered`
- `comment.created`

---

**API Version**: 1.0
**Last Updated**: November 2025
