# Deployment Guide

This guide covers deploying the Data Governance Toolkit to production environments.

## Deployment Options

1. **Vercel** (Recommended) - Serverless deployment
2. **AWS** - Containerized deployment with ECS/Lambda
3. **Azure** - Azure App Service / Functions
4. **Docker** - Self-hosted containerized deployment

## Vercel Deployment (Recommended)

### Prerequisites

- Vercel account (free tier available)
- GitHub repository
- Environment variables ready

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy Backend

```bash
cd backend

# Configure project
vercel

# Deploy to production
vercel --prod
```

**Configuration** (`backend/vercel.json`):

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ],
  "crons": [
    {
      "path": "/api/scheduled/fetchAndSummarize",
      "schedule": "0 6,18 * * *"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 4. Deploy Frontend

```bash
cd frontend
vercel --prod
```

**Configuration** (`frontend/vercel.json`):

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api-url"
  }
}
```

### 5. Deploy Crawler

```bash
cd crawler
vercel --prod
```

### 6. Deploy Newsletter

```bash
cd newsletters
vercel --prod
```

**Cron Configuration**:

```json
{
  "crons": [
    {
      "path": "/api/newsletter/send-daily",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### 7. Set Environment Variables

In Vercel Dashboard:

1. Go to **Project Settings** → **Environment Variables**
2. Add all variables from `.env`:
   - `MONGODB_URI`
   - `GOOGLE_AI_API_KEY`
   - `NEWS_API_KEY`
   - `RESEND_API_KEY`
   - `PINECONE_API_KEY`
   - `JWT_SECRET`
   - etc.

3. For each variable:
   - Name: Variable name
   - Value: Variable value
   - Environment: Production, Preview, Development

### 8. Configure Custom Domain

1. Go to **Project Settings** → **Domains**
2. Add domain: `synthoraai.yourdomain.com`
3. Update DNS records:
   ```
   Type: CNAME
   Name: synthoraai
   Value: cname.vercel-dns.com
   ```

### 9. Enable HTTPS

Vercel automatically provisions SSL certificates via Let's Encrypt.

## AWS Deployment

### Architecture

```
CloudFront (CDN)
    ↓
Application Load Balancer
    ↓
ECS Fargate Cluster
    ├── Backend Service
    ├── Frontend Service
    ├── Crawler Service
    └── Newsletter Service
    ↓
RDS (MongoDB-compatible DocumentDB)
```

### 1. Build Docker Images

```bash
# Backend
cd backend
docker build -t synthoraai-backend:latest .
docker tag synthoraai-backend:latest <aws-account>.dkr.ecr.<region>.amazonaws.com/synthoraai-backend:latest

# Frontend
cd frontend
docker build -t synthoraai-frontend:latest .
docker tag synthoraai-frontend:latest <aws-account>.dkr.ecr.<region>.amazonaws.com/synthoraai-frontend:latest

# Similar for crawler and newsletter
```

### 2. Push to ECR

```bash
# Authenticate
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws-account>.dkr.ecr.us-east-1.amazonaws.com

# Push images
docker push <aws-account>.dkr.ecr.us-east-1.amazonaws.com/synthoraai-backend:latest
docker push <aws-account>.dkr.ecr.us-east-1.amazonaws.com/synthoraai-frontend:latest
```

### 3. Create ECS Task Definitions

**Backend Task** (`backend-task.json`):

```json
{
  "family": "synthoraai-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<aws-account>.dkr.ecr.us-east-1.amazonaws.com/synthoraai-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_URI",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<account>:secret:aicc/prod/mongodb-uri"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/synthoraai-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 4. Create ECS Services

```bash
aws ecs create-service \
  --cluster synthoraai-cluster \
  --service-name backend-service \
  --task-definition synthoraai-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:xxx:targetgroup/backend-tg,containerName=backend,containerPort=3000"
```

### 5. Set Up CloudWatch Alarms

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name backend-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### 6. Configure Auto Scaling

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/synthoraai-cluster/backend-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10
```

### 7. Deploy AI Pipeline to Lambda

```bash
cd agentic_ai

# Create deployment package
pip install -r requirements.txt -t package/
cd package
zip -r ../deployment.zip .
cd ..
zip -g deployment.zip -r agentic_ai/

# Upload to Lambda
aws lambda update-function-code \
  --function-name synthoraai-ai-pipeline \
  --zip-file fileb://deployment.zip
```

## Azure Deployment

### 1. Create Azure Resources

```bash
# Create resource group
az group create --name synthoraai-rg --location eastus

# Create App Service Plan
az appservice plan create \
  --name synthoraai-plan \
  --resource-group synthoraai-rg \
  --sku B1 \
  --is-linux

# Create Web Apps
az webapp create \
  --resource-group synthoraai-rg \
  --plan synthoraai-plan \
  --name synthoraai-backend \
  --runtime "NODE|18-lts"

az webapp create \
  --resource-group synthoraai-rg \
  --plan synthoraai-plan \
  --name synthoraai-frontend \
  --runtime "NODE|18-lts"
```

### 2. Configure Environment Variables

```bash
az webapp config appsettings set \
  --resource-group synthoraai-rg \
  --name synthoraai-backend \
  --settings \
    MONGODB_URI="@Microsoft.KeyVault(SecretUri=https://synthoraai-kv.vault.azure.net/secrets/mongodb-uri)" \
    GOOGLE_AI_API_KEY="@Microsoft.KeyVault(SecretUri=https://synthoraai-kv.vault.azure.net/secrets/google-ai-key)"
```

### 3. Deploy Code

```bash
# Backend
cd backend
az webapp up \
  --resource-group synthoraai-rg \
  --name synthoraai-backend

# Frontend
cd frontend
az webapp up \
  --resource-group synthoraai-rg \
  --name synthoraai-frontend
```

### 4. Configure Azure Functions for Cron Jobs

```bash
cd crawler
func init --worker-runtime node --language typescript
func azure functionapp publish synthoraai-crawler-func
```

## Docker Compose (Self-Hosted)

### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    networks:
      - synthoraai-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    networks:
      - synthoraai-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/aicc?authSource=admin
      REDIS_URL: redis://redis:6379
    depends_on:
      - mongodb
      - redis
    networks:
      - synthoraai-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3000
    depends_on:
      - backend
    networks:
      - synthoraai-network

  crawler:
    build:
      context: ./crawler
      dockerfile: Dockerfile
    environment:
      MONGODB_URI: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/aicc?authSource=admin
    depends_on:
      - mongodb
    networks:
      - synthoraai-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - synthoraai-network

volumes:
  mongo-data:
  redis-data:

networks:
  synthoraai-network:
    driver: bridge
```

### Deploy

```bash
# Set environment variables
export MONGO_PASSWORD=your_secure_password

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

## Post-Deployment Checklist

- [ ] All services are running
- [ ] Environment variables are set
- [ ] Database connections work
- [ ] API endpoints respond correctly
- [ ] Cron jobs are scheduled
- [ ] SSL/TLS certificates are valid
- [ ] Monitoring is configured
- [ ] Logs are being collected
- [ ] Backups are scheduled
- [ ] CDN is configured
- [ ] Custom domain is set up
- [ ] Email delivery works
- [ ] Rate limiting is active
- [ ] Security headers are set

## Monitoring

### Health Checks

```bash
# Backend
curl https://api.synthoraai.com/api/health

# Frontend
curl https://synthoraai.com/

# Expected: 200 OK
```

### Uptime Monitoring

Use services like:
- **UptimeRobot**: Free tier monitors every 5 minutes
- **Pingdom**: Advanced monitoring with performance metrics
- **StatusCake**: Multi-location checks

### Log Aggregation

- **Vercel**: Built-in logging in dashboard
- **AWS**: CloudWatch Logs
- **Azure**: Application Insights
- **Self-hosted**: ELK Stack (Elasticsearch, Logstash, Kibana)

## Backup & Recovery

### Database Backups

```bash
# MongoDB Atlas: Automatic backups enabled
# Configure backup schedule in Atlas dashboard

# Self-hosted MongoDB backup
mongodump --uri="mongodb://localhost:27017/aicc" --out=/backups/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://localhost:27017/aicc" /backups/20251116
```

### Disaster Recovery

1. **Database**: Daily automated backups retained for 30 days
2. **Code**: GitHub repository with all code
3. **Environment Variables**: Stored in secrets manager
4. **RTO (Recovery Time Objective)**: 1 hour
5. **RPO (Recovery Point Objective)**: 24 hours

## Troubleshooting

### Service Won't Start

```bash
# Check logs
vercel logs <deployment-url>

# Check environment variables
vercel env ls

# Verify build
vercel build
```

### Database Connection Issues

```bash
# Test connection
mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net/" --username youruser

# Check network access in MongoDB Atlas
# Verify IP whitelist includes deployment IPs
```

### High Latency

- Enable CDN caching
- Add Redis caching layer
- Optimize database queries with indexes
- Use connection pooling

---

**Last Updated**: November 2025
**Deployment Guide Version**: 1.0
