# Contributing to Data Governance Toolkit

Thank you for your interest in contributing to the Data Governance Toolkit! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read and follow our community guidelines to ensure a welcoming environment for everyone.

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js v18+
- Python 3.11+ (for AI pipeline)
- MongoDB (local or cloud)
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/AI-Gov-Content-Curator.git
   cd AI-Gov-Content-Curator
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/hoangsonww/AI-Gov-Content-Curator.git
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

## Development Workflow

### 1. Create a Feature Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clean, maintainable code
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm run test

# Run specific service tests
cd backend && npm run test
cd frontend && npm run test:e2e
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add new feature"
```

See [Commit Message Guidelines](#commit-message-guidelines) below.

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

```typescript
/**
 * Fetches articles from the database with pagination
 * @param page - Page number (1-indexed)
 * @param limit - Number of items per page
 * @returns Promise with articles and pagination info
 */
async function fetchArticles(page: number, limit: number): Promise<ArticleResponse> {
  // Implementation
}
```

### Python

- Follow PEP 8 style guide
- Use type hints
- Add docstrings for all functions and classes

```python
def process_article(article: dict) -> dict:
    """
    Process an article through the AI pipeline.

    Args:
        article: Dictionary containing article data

    Returns:
        Processed article with AI-generated metadata
    """
    # Implementation
```

### File Organization

```
backend/
├── src/
│   ├── controllers/    # Request handlers
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── middleware/     # Express middleware
│   └── utils/          # Utility functions
├── tests/              # Test files
└── package.json
```

## Testing Guidelines

### Backend Tests

```typescript
import request from 'supertest';
import app from '../src/app';

describe('GET /api/articles', () => {
  it('should return paginated articles', async () => {
    const response = await request(app)
      .get('/api/articles?page=1&limit=10')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(10);
  });
});
```

### Frontend Tests

```typescript
import { test, expect } from '@playwright/test';

test('should display article list', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('.article-card')).toHaveCount(10);
});
```

### Test Coverage

- Aim for >80% code coverage
- Test both success and error cases
- Test edge cases and boundary conditions

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or modifications
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```bash
feat(backend): add bias detection endpoint

Implement AI-powered bias detection for articles using Google Generative AI.
Adds new endpoint GET /api/articles/:id/bias with caching support.

Closes #123
```

```bash
fix(crawler): handle rate limiting properly

Add exponential backoff for API requests when rate limited.
Prevents crawler from failing on NewsAPI rate limits.
```

```bash
docs(readme): update setup instructions

Add detailed MongoDB Atlas setup steps.
Include troubleshooting section for common errors.
```

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest changes from `main`:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all tests**:
   ```bash
   npm run test
   npm run lint
   ```

3. **Update documentation** if needed

4. **Add or update tests** for your changes

### PR Title

Use the same format as commit messages:
```
feat(backend): add bias detection endpoint
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes have been merged

## Related Issues
Closes #123
```

### Review Process

1. At least one maintainer must review and approve
2. All CI checks must pass
3. All review comments must be addressed
4. Branch must be up-to-date with `main`

### After Approval

- Maintainers will merge using "Squash and merge"
- Delete your feature branch after merging

## Project Structure

### Monorepo Layout

```
AI-Gov-Content-Curator/
├── backend/           # Express.js API
├── frontend/          # Next.js web app
├── crawler/           # Article crawler
├── newsletters/       # Newsletter service
├── agentic_ai/        # AI pipeline
├── docs/              # Documentation
├── .github/           # GitHub workflows
└── package.json       # Root package.json
```

### Adding a New Service

1. Create directory in project root
2. Add `package.json` with necessary dependencies
3. Update root `package.json` scripts:
   ```json
   {
     "scripts": {
       "dev:newservice": "cd newservice && npm run dev"
     }
   }
   ```
4. Add documentation in `docs/components/`

## Getting Help

- **Documentation**: Check the [docs](./docs/) folder
- **Issues**: Search [existing issues](https://github.com/hoangsonww/AI-Gov-Content-Curator/issues)
- **Email**: hoangson091104@gmail.com
- **Jira**: https://ai-content-curator.atlassian.net

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes
- Project README

Thank you for contributing! 🎉
