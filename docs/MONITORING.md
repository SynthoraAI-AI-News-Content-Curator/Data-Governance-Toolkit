# Monitoring & Observability Guide

Comprehensive monitoring, logging, and observability setup for production environments.

## Overview

The Data Governance Toolkit implements a three-pillar observability strategy:

1. **Metrics** - Quantitative measurements (Prometheus)
2. **Logs** - Event records (Winston, CloudWatch)
3. **Traces** - Request flow tracking (OpenTelemetry)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Backend  │  │ Frontend │  │ Crawler  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │              │                     │
└───────┼─────────────┼──────────────┼─────────────────────┘
        │             │              │
        ▼             ▼              ▼
┌─────────────────────────────────────────────────────────┐
│                  Metrics Collection                      │
│  ┌──────────────────────────────────────────┐           │
│  │         Prometheus Exporter              │           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│                  Monitoring Stack                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │Prometheus│  │ Grafana  │  │ AlertMgr │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

## Metrics

### Prometheus Setup

**Installation**:

```bash
# Docker Compose
docker-compose -f monitoring/docker-compose.yml up -d

# Kubernetes
kubectl apply -f monitoring/k8s/prometheus.yaml
```

**Configuration** (`prometheus.yml`):

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - "alerts/*.yml"

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3000']

  - job_name: 'frontend'
    static_configs:
      - targets: ['frontend:3000']

  - job_name: 'crawler'
    static_configs:
      - targets: ['crawler:3000']
```

### Application Metrics

**Backend Metrics** (`src/lib/metrics.ts`):

```typescript
import client from 'prom-client';

// Create registry
export const register = new client.Registry();

// Default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

export const articlesProcessed = new client.Counter({
  name: 'articles_processed_total',
  help: 'Total number of articles processed',
  labelNames: ['source', 'status']
});

export const articleQualityScore = new client.Histogram({
  name: 'article_quality_score',
  help: 'Distribution of article quality scores',
  buckets: [0, 20, 40, 60, 80, 100]
});

export const activeUsers = new client.Gauge({
  name: 'active_users',
  help: 'Number of currently active users'
});

export const databaseConnectionPool = new client.Gauge({
  name: 'database_connection_pool_size',
  help: 'Current database connection pool size',
  labelNames: ['state']
});

export const aiApiCalls = new client.Counter({
  name: 'ai_api_calls_total',
  help: 'Total number of AI API calls',
  labelNames: ['provider', 'model', 'status']
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(articlesProcessed);
register.registerMetric(articleQualityScore);
register.registerMetric(activeUsers);
register.registerMetric(databaseConnectionPool);
register.registerMetric(aiApiCalls);

// Metrics endpoint
export function metricsHandler(req: any, res: any) {
  res.setHeader('Content-Type', register.contentType);
  res.send(register.metrics());
}
```

**Middleware** (`src/lib/middleware/metrics.ts`):

```typescript
import { httpRequestDuration } from '../metrics';

export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });

  next();
}
```

### Business Metrics

```typescript
import { articlesProcessed, articleQualityScore } from '../metrics';

// Track article processing
export async function processArticle(article: any) {
  try {
    const result = await aiPipeline.process(article);

    articlesProcessed
      .labels(article.source, 'success')
      .inc();

    articleQualityScore
      .observe(result.qualityScore);

    return result;
  } catch (error) {
    articlesProcessed
      .labels(article.source, 'error')
      .inc();

    throw error;
  }
}

// Track AI API usage
export async function callAI(provider: string, model: string, prompt: string) {
  try {
    const result = await ai.generate(prompt);

    aiApiCalls
      .labels(provider, model, 'success')
      .inc();

    return result;
  } catch (error) {
    aiApiCalls
      .labels(provider, model, 'error')
      .inc();

    throw error;
  }
}
```

## Logging

### Winston Configuration

```typescript
import winston from 'winston';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';

// Create logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'backend',
    environment: process.env.NODE_ENV
  },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Combined logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    }),

    // Console (development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// CloudWatch in production
if (process.env.NODE_ENV === 'production') {
  const CloudWatchTransport = require('winston-cloudwatch');

  logger.add(
    new CloudWatchTransport({
      logGroupName: '/aicc/backend',
      logStreamName: process.env.HOSTNAME || 'default',
      awsRegion: process.env.AWS_REGION || 'us-east-1'
    })
  );
}
```

### Structured Logging

```typescript
// Log with context
logger.info('Article processed', {
  articleId: article._id,
  source: article.source,
  duration: processingTime,
  qualityScore: result.qualityScore,
  userId: user?._id
});

// Error logging with stack trace
try {
  await processArticle(article);
} catch (error) {
  logger.error('Failed to process article', {
    articleId: article._id,
    error: error.message,
    stack: error.stack,
    userId: user?._id
  });
}

// HTTP request logging
app.use((req, res, next) => {
  logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  const start = Date.now();

  res.on('finish', () => {
    logger.http('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: Date.now() - start
    });
  });

  next();
});
```

### Log Levels

```typescript
logger.error('Critical error occurred');   // Production issues
logger.warn('Potential problem detected');  // Warning signs
logger.info('Normal operation');            // Important events
logger.http('HTTP request details');        // HTTP traffic
logger.debug('Detailed debugging info');    // Development only
logger.silly('Very verbose debugging');     // Very detailed
```

## Distributed Tracing

### OpenTelemetry Setup

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.error('Error shutting down tracing', error));
});
```

### Custom Spans

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('aicc-backend');

export async function processArticleWithTracing(article: any) {
  const span = tracer.startSpan('process_article', {
    attributes: {
      'article.id': article._id,
      'article.source': article.source
    }
  });

  try {
    // Analyze content
    const analysisSpan = tracer.startSpan('analyze_content', {
      parent: span
    });
    const analysis = await analyzeContent(article.content);
    analysisSpan.end();

    // Generate summary
    const summarySpan = tracer.startSpan('generate_summary', {
      parent: span
    });
    const summary = await generateSummary(article.content);
    summarySpan.end();

    span.setStatus({ code: 1 }); // OK
    return { analysis, summary };
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message }); // ERROR
    throw error;
  } finally {
    span.end();
  }
}
```

## Alerting

### Alert Rules

**Prometheus Alerts** (`alerts/backend.yml`):

```yaml
groups:
  - name: backend_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status_code=~"5.."}[5m])
          /
          rate(http_requests_total[5m])
          > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Slow response time
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket[5m])
          ) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time"
          description: "95th percentile is {{ $value }}s"

      # Low article quality
      - alert: LowArticleQuality
        expr: |
          avg_over_time(article_quality_score[1h]) < 70
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low article quality detected"
          description: "Average quality score is {{ $value }}"

      # Database connection issues
      - alert: DatabaseConnectionPoolExhausted
        expr: |
          database_connection_pool_size{state="active"}
          /
          database_connection_pool_size{state="total"}
          > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool near exhaustion"
          description: "{{ $value | humanizePercentage }} of connections in use"

      # AI API failures
      - alert: HighAIAPIFailureRate
        expr: |
          rate(ai_api_calls_total{status="error"}[5m])
          /
          rate(ai_api_calls_total[5m])
          > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High AI API failure rate"
          description: "{{ $value | humanizePercentage }} of AI API calls failing"
```

### AlertManager Configuration

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: '${SLACK_WEBHOOK_URL}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true

    - match:
        severity: warning
      receiver: 'slack'

receivers:
  - name: 'default'
    email_configs:
      - to: 'alerts@synthoraai.com'

  - name: 'slack'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'
```

## Dashboards

### Grafana Dashboards

**System Overview Dashboard**:

```json
{
  "dashboard": {
    "title": "SynthoraAI - System Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Active Users",
        "targets": [
          {
            "expr": "active_users"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

**Article Processing Dashboard**:

```json
{
  "dashboard": {
    "title": "Article Processing Metrics",
    "panels": [
      {
        "title": "Articles Processed",
        "targets": [
          {
            "expr": "rate(articles_processed_total[5m])"
          }
        ]
      },
      {
        "title": "Quality Score Distribution",
        "targets": [
          {
            "expr": "article_quality_score"
          }
        ],
        "type": "heatmap"
      },
      {
        "title": "Processing by Source",
        "targets": [
          {
            "expr": "sum(rate(articles_processed_total[5m])) by (source)"
          }
        ],
        "type": "pie"
      }
    ]
  }
}
```

## Health Checks

```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      ai: await checkAI()
    }
  };

  const allHealthy = Object.values(health.checks).every(c => c.status === 'ok');

  res.status(allHealthy ? 200 : 503).json(health);
});

async function checkDatabase(): Promise<any> {
  try {
    await mongoose.connection.db.admin().ping();
    return { status: 'ok', latency: 0 };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

async function checkRedis(): Promise<any> {
  try {
    const start = Date.now();
    await redis.ping();
    return { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

async function checkAI(): Promise<any> {
  try {
    // Test AI endpoint
    await genAI.testConnection();
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}
```

## Performance Monitoring

### APM (Application Performance Monitoring)

```typescript
import apm from 'elastic-apm-node';

apm.start({
  serviceName: 'synthoraai-backend',
  secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
  serverUrl: process.env.ELASTIC_APM_SERVER_URL,
  environment: process.env.NODE_ENV
});

// Custom transactions
export async function monitoredFunction(data: any) {
  const transaction = apm.startTransaction('custom-operation');

  try {
    const result = await expensiveOperation(data);
    transaction.result = 'success';
    return result;
  } catch (error) {
    apm.captureError(error);
    transaction.result = 'error';
    throw error;
  } finally {
    transaction.end();
  }
}
```

---

**Last Updated**: November 2025
**Version**: 1.0
**Owner**: SynthoraAI DevOps Team
