# Security Guide

Comprehensive security documentation for the Data Governance Toolkit.

## Table of Contents

- [Security Architecture](#security-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Data Protection](#data-protection)
- [API Security](#api-security)
- [Infrastructure Security](#infrastructure-security)
- [Compliance](#compliance)
- [Security Best Practices](#security-best-practices)
- [Incident Response](#incident-response)
- [Security Auditing](#security-auditing)

## Security Architecture

### Defense in Depth Strategy

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Edge Security (CDN, WAF, DDoS Protection)      │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Application Security (Input Validation, Auth)  │
├─────────────────────────────────────────────────────────┤
│ Layer 3: API Security (Rate Limiting, JWT, CORS)        │
├─────────────────────────────────────────────────────────┤
│ Layer 4: Data Security (Encryption, Access Control)     │
├─────────────────────────────────────────────────────────┤
│ Layer 5: Infrastructure (Network Isolation, Secrets)    │
└─────────────────────────────────────────────────────────┘
```

## Authentication & Authorization

### JWT Implementation

**Token Generation**:

```typescript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface TokenPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

export class JWTService {
  private static readonly SECRET = process.env.JWT_SECRET!;
  private static readonly EXPIRES_IN = '7d';
  private static readonly REFRESH_EXPIRES_IN = '30d';

  static generateAccessToken(user: any): string {
    return jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      this.SECRET,
      { expiresIn: this.EXPIRES_IN }
    );
  }

  static generateRefreshToken(user: any): string {
    const token = crypto.randomBytes(64).toString('hex');
    // Store in database with expiry
    return token;
  }

  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.SECRET) as TokenPayload;
    } catch (error) {
      return null;
    }
  }
}
```

**Secure Cookie Configuration**:

```typescript
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
  domain: process.env.COOKIE_DOMAIN
};

// Set cookie
response.setHeader(
  'Set-Cookie',
  `token=${token}; ${Object.entries(cookieOptions)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')}`
);
```

### Role-Based Access Control (RBAC)

```typescript
export enum Permission {
  READ_ARTICLES = 'read:articles',
  CREATE_ARTICLES = 'create:articles',
  UPDATE_ARTICLES = 'update:articles',
  DELETE_ARTICLES = 'delete:articles',
  MANAGE_USERS = 'manage:users',
  VIEW_ANALYTICS = 'view:analytics'
}

export const RolePermissions = {
  user: [
    Permission.READ_ARTICLES
  ],
  admin: [
    Permission.READ_ARTICLES,
    Permission.CREATE_ARTICLES,
    Permission.UPDATE_ARTICLES,
    Permission.DELETE_ARTICLES,
    Permission.MANAGE_USERS,
    Permission.VIEW_ANALYTICS
  ]
};

export function hasPermission(role: string, permission: Permission): boolean {
  return RolePermissions[role]?.includes(permission) || false;
}

// Middleware
export function requirePermission(permission: Permission) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    next();
  };
}
```

### Password Security

```typescript
import bcrypt from 'bcrypt';
import zxcvbn from 'zxcvbn';

export class PasswordService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly MIN_STRENGTH = 3;

  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static checkStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const result = zxcvbn(password);
    return {
      score: result.score,
      feedback: result.feedback.suggestions,
      isStrong: result.score >= this.MIN_STRENGTH
    };
  }

  static validate(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    const strength = this.checkStrength(password);
    if (!strength.isStrong) {
      errors.push('Password is too weak. ' + strength.feedback.join('. '));
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

## Data Protection

### Encryption at Rest

**Database Encryption** (MongoDB):

```javascript
// MongoDB Atlas: Enable encryption at rest
// Settings → Security → Encryption at Rest → Enable

// For self-hosted MongoDB
mongod --enableEncryption \
  --encryptionKeyFile /path/to/keyfile \
  --encryptionCipherMode AES256-CBC
```

**Field-Level Encryption**:

```typescript
import crypto from 'crypto';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted
    ].join(':');
  }

  static decrypt(encrypted: string): string {
    const [ivHex, authTagHex, encryptedData] = encrypted.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.KEY, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Usage in model
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    set: (value: string) => EncryptionService.encrypt(value),
    get: (value: string) => EncryptionService.decrypt(value)
  }
});
```

### Encryption in Transit

**TLS Configuration**:

```javascript
// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// HSTS (HTTP Strict Transport Security)
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
});
```

## API Security

### Input Validation

```typescript
import { z } from 'zod';

// Define schemas
const ArticleCreateSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(10).max(50000),
  url: z.string().url(),
  source: z.string().min(1).max(200),
  topics: z.array(z.string()).min(1).max(5)
});

const UserRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
  name: z.string().min(1).max(100)
});

// Validation middleware
export function validate(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors
          }
        });
      }
      next(error);
    }
  };
}

// Usage
app.post('/api/articles', validate(ArticleCreateSchema), createArticle);
```

### SQL Injection Prevention

```typescript
// ALWAYS use parameterized queries
// BAD (vulnerable to injection):
const query = `SELECT * FROM users WHERE email = '${email}'`;

// GOOD (use Mongoose or parameterized queries):
const user = await User.findOne({ email });

// For raw queries, use parameters:
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
```

### XSS Prevention

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize user input
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
    ALLOWED_ATTR: ['href']
  });
}

// Content Security Policy
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://ai-content-curator-backend.vercel.app"
  );
  next();
});
```

### CSRF Protection

```typescript
import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

app.use(csrfProtection);

// Include CSRF token in forms
app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

// Verify on POST
app.post('/submit', csrfProtection, (req, res) => {
  // Token automatically verified
  res.json({ success: true });
});
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Global rate limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    client: redis,
    prefix: 'rl:global:'
  })
});

// Stricter limiter for authentication
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  })
});

// Apply middleware
app.use('/api/', globalLimiter);
app.use('/api/auth/', authLimiter);
```

## Infrastructure Security

### Secrets Management

**AWS Secrets Manager**:

```typescript
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

export class SecretsService {
  private static client = new SecretsManager({
    region: process.env.AWS_REGION
  });

  static async getSecret(secretName: string): Promise<any> {
    try {
      const response = await this.client.getSecretValue({
        SecretId: secretName
      });

      return JSON.parse(response.SecretString!);
    } catch (error) {
      console.error('Error retrieving secret:', error);
      throw error;
    }
  }

  static async loadSecrets(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      const secrets = await this.getSecret('aicc/production/api-keys');

      process.env.MONGODB_URI = secrets.MONGODB_URI;
      process.env.GOOGLE_AI_API_KEY = secrets.GOOGLE_AI_API_KEY;
      process.env.JWT_SECRET = secrets.JWT_SECRET;
    }
  }
}

// Load on startup
SecretsService.loadSecrets().then(() => {
  console.log('Secrets loaded successfully');
});
```

### Network Security

```yaml
# AWS Security Group Rules
SecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Backend security group
    VpcId: !Ref VPC
    SecurityGroupIngress:
      # Allow HTTPS from anywhere
      - IpProtocol: tcp
        FromPort: 443
        ToPort: 443
        CidrIp: 0.0.0.0/0

      # Allow HTTP (will redirect to HTTPS)
      - IpProtocol: tcp
        FromPort: 80
        ToPort: 80
        CidrIp: 0.0.0.0/0

      # Allow MongoDB from app servers only
      - IpProtocol: tcp
        FromPort: 27017
        ToPort: 27017
        SourceSecurityGroupId: !Ref AppSecurityGroup
```

## Compliance

### GDPR Compliance

**Data Subject Rights**:

```typescript
export class GDPRService {
  // Right to Access
  static async exportUserData(userId: string): Promise<any> {
    const user = await User.findById(userId);
    const articles = await Article.find({ 'favorites': userId });
    const comments = await Article.find({
      'comments.userId': userId
    });

    return {
      personalInfo: {
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      },
      favorites: articles,
      comments: comments
    };
  }

  // Right to Deletion
  static async deleteUserData(userId: string): Promise<void> {
    await User.findByIdAndDelete(userId);
    await Article.updateMany(
      {},
      {
        $pull: {
          favorites: userId,
          comments: { userId }
        }
      }
    );
  }

  // Right to Portability
  static async generateDataExport(userId: string): Promise<Buffer> {
    const data = await this.exportUserData(userId);
    return Buffer.from(JSON.stringify(data, null, 2));
  }
}
```

### Audit Logging

```typescript
interface AuditLog {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  result: 'success' | 'failure';
  details?: any;
}

export class AuditLogger {
  static async log(log: AuditLog): Promise<void> {
    await AuditLog.create(log);

    // Also send to external logging service
    if (process.env.NODE_ENV === 'production') {
      await this.sendToCloudWatch(log);
    }
  }

  private static async sendToCloudWatch(log: AuditLog): Promise<void> {
    // Implementation
  }
}

// Middleware
export function auditMiddleware(action: string) {
  return async (req: any, res: any, next: any) => {
    const originalSend = res.send;

    res.send = function (data: any) {
      AuditLogger.log({
        userId: req.user?._id || 'anonymous',
        action,
        resource: req.path,
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date(),
        result: res.statusCode < 400 ? 'success' : 'failure',
        details: { statusCode: res.statusCode }
      });

      return originalSend.call(this, data);
    };

    next();
  };
}
```

## Security Best Practices

### Environment Variables

```bash
# NEVER commit .env files
# Use environment-specific files
.env.development
.env.production
.env.test

# Add to .gitignore
echo ".env*" >> .gitignore

# Use strong secrets
# Generate JWT secret:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate encryption key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Dependency Security

```bash
# Regular security audits
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated

# Use Snyk for advanced scanning
npm install -g snyk
snyk test
snyk monitor
```

### Docker Security

```dockerfile
# Use specific versions, not 'latest'
FROM node:18.17.0-alpine

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Remove unnecessary packages
RUN apk del build-dependencies

# Use .dockerignore
# .dockerignore content:
node_modules
npm-debug.log
.env*
.git
```

## Incident Response

### Incident Response Plan

1. **Detection**: Monitoring alerts, user reports
2. **Containment**: Isolate affected systems
3. **Eradication**: Remove threat
4. **Recovery**: Restore services
5. **Post-Incident**: Review and improve

### Security Incident Template

```yaml
Incident Report:
  ID: INC-2025-001
  Date: 2025-11-16
  Severity: High | Medium | Low
  Status: Open | Investigating | Resolved

  Description: |
    Brief description of the incident

  Timeline:
    - 2025-11-16 10:00: Incident detected
    - 2025-11-16 10:15: Team notified
    - 2025-11-16 10:30: Containment measures applied

  Impact:
    - Users affected: X
    - Data compromised: Yes/No
    - Services disrupted: List

  Actions Taken:
    - Action 1
    - Action 2

  Lessons Learned:
    - Lesson 1
    - Lesson 2

  Recommendations:
    - Recommendation 1
    - Recommendation 2
```

## Security Auditing

### Regular Security Checks

```bash
#!/bin/bash
# security-audit.sh

echo "Running security audit..."

# 1. Dependency vulnerabilities
echo "Checking dependencies..."
npm audit

# 2. Code quality
echo "Running linter..."
npm run lint

# 3. Secret scanning
echo "Scanning for secrets..."
git secrets --scan

# 4. OWASP ZAP scan
echo "Running OWASP ZAP..."
zap-cli quick-scan https://synthoraai.vercel.app

# 5. SSL/TLS check
echo "Checking SSL/TLS..."
testssl.sh synthoraai.vercel.app

echo "Security audit complete!"
```

---

**Last Updated**: November 2025
**Security Version**: 1.0
**Owner**: SynthoraAI Security Team
