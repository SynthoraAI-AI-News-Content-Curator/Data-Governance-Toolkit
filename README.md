# Data Governance Toolkit for Government Officials

> **SynthoraAI - Synthesizing the world's news & information through AI**

[![Live App](https://img.shields.io/badge/Live-synthoraai.vercel.app-blue)](https://synthoraai.vercel.app/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Backend](https://img.shields.io/badge/Backend-Live-success)](https://ai-content-curator-backend.vercel.app/)

## Overview

The **Data Governance Toolkit** is a comprehensive, AI-powered system designed to help government officials access, analyze, and govern the latest information through automated content curation, summarization, and intelligent recommendation systems. Built on the SynthoraAI platform, this toolkit provides end-to-end solutions for data governance, content management, and information accessibility.

## 🎯 Purpose

This toolkit serves as a complete data governance framework for:

- **Information Aggregation**: Automatically collect and curate content from trusted government sources and news outlets
- **AI-Powered Analysis**: Leverage advanced AI models for summarization, bias detection, and sentiment analysis
- **Content Governance**: Implement robust data quality checks, classification, and metadata management
- **Accessibility**: Provide government officials with streamlined access to verified, summarized information
- **Compliance**: Ensure data governance best practices with audit trails and quality assurance

## 🏗️ Architecture

The toolkit consists of five integrated microservices:

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Governance Toolkit                   │
├─────────────────────────────────────────────────────────────┤
│  Backend API  │  Crawler  │  Frontend  │  Newsletter  │  AI  │
│   (Express)   │ (Puppeteer)│  (Next.js) │  (Resend)   │Pipeline│
└─────────────────────────────────────────────────────────────┘
         │              │           │            │          │
         ├──────────────┴───────────┴────────────┴──────────┤
         │              MongoDB + Pinecone + Redis           │
         └──────────────────────────────────────────────────┘
```

### Components

1. **Backend Service** - RESTful API with AI summarization
   - Live: https://ai-content-curator-backend.vercel.app/
   - Tech: Express.js, MongoDB, Google Generative AI

2. **Crawler Service** - Automated content extraction
   - Live: https://ai-content-curator-crawler.vercel.app/
   - Tech: Puppeteer, Cheerio, Axios

3. **Frontend Application** - User interface for officials
   - Live: https://synthoraai.vercel.app/
   - Tech: Next.js, React, TypeScript, Tailwind CSS

4. **Newsletter Service** - Daily updates delivery
   - Live: https://ai-content-curator-newsletters.vercel.app/
   - Tech: Resend API, Nodemailer

5. **Agentic AI Pipeline** - Multi-agent content processing
   - Tech: LangGraph, LangChain, Python

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- MongoDB instance
- Python 3.11+ (for AI pipeline)
- API Keys: Google AI, NewsAPI, Resend

### Installation

```bash
# Clone the main project repository
git clone https://github.com/hoangsonww/AI-Gov-Content-Curator.git
cd AI-Gov-Content-Curator

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys

# Start all services
npm run dev
```

## 📚 Documentation Structure

### Core Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Detailed system architecture and design patterns
- **[SETUP.md](./docs/SETUP.md)** - Complete setup and installation guide
- **[API_REFERENCE.md](./docs/API_REFERENCE.md)** - API endpoints and usage
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Production deployment guide
- **[DATA_GOVERNANCE.md](./docs/DATA_GOVERNANCE.md)** - Data governance policies and practices

### Component Documentation

- **[Backend Guide](./docs/components/BACKEND.md)** - Backend service documentation
- **[Crawler Guide](./docs/components/CRAWLER.md)** - Crawler service documentation
- **[Frontend Guide](./docs/components/FRONTEND.md)** - Frontend application documentation
- **[Newsletter Guide](./docs/components/NEWSLETTER.md)** - Newsletter service documentation
- **[AI Pipeline Guide](./docs/components/AI_PIPELINE.md)** - Agentic AI pipeline documentation

### Feature Documentation

- **[Article Q&A](./docs/features/ARTICLE_QA.md)** - RAG-based question answering
- **[Recommendation System](./docs/features/RECOMMENDATIONS.md)** - Vector similarity and ML-based recommendations
- **[Bias Detection](./docs/features/BIAS_DETECTION.md)** - AI-powered bias analysis
- **[User Authentication](./docs/features/AUTHENTICATION.md)** - JWT-based auth system

## 🔑 Key Features

### Data Governance Capabilities

- ✅ **Automated Data Collection** - Scheduled crawling from trusted sources
- ✅ **Quality Assurance** - Multi-agent validation and quality checking
- ✅ **Metadata Management** - Comprehensive article classification and tagging
- ✅ **Audit Trails** - Complete tracking of data lineage and processing
- ✅ **Access Control** - JWT-based authentication and authorization
- ✅ **Data Privacy** - Secure handling of user data and preferences

### AI-Powered Features

- 🤖 **Content Summarization** - Google Generative AI (Gemini)
- 🤖 **Bias Detection** - AI-powered bias analysis and scoring
- 🤖 **Sentiment Analysis** - Emotional tone and objectivity assessment
- 🤖 **Topic Classification** - Automatic categorization into 15+ topics
- 🤖 **RAG-based Q&A** - ArticleIQ chatbot for article queries
- 🤖 **Vector Similarity Search** - Semantic article recommendations via Pinecone

### User Features

- 📱 **Responsive UI** - Mobile and desktop optimized
- 🌓 **Dark Mode** - Enhanced readability
- ⭐ **Favorites** - Personal article bookmarking
- 💬 **Discussions** - Comment and engage with articles
- 📧 **Daily Newsletter** - Automated email updates
- 🔍 **Advanced Search** - Filter by source, topic, sentiment

## 📊 Use Cases for Government Officials

### 1. Daily Intelligence Briefing
- Receive automated daily newsletters with latest government announcements
- AI-generated summaries for quick consumption
- Bias detection to identify potential misinformation

### 2. Policy Research
- Search and filter articles by topic (legislation, healthcare, education, etc.)
- Access related articles through vector similarity search
- Ask questions about specific articles via ArticleIQ chatbot

### 3. Public Sentiment Analysis
- Monitor public sentiment on government initiatives
- Analyze controversy scores and emotional tone
- Track trending topics and emerging issues

### 4. Data Compliance & Governance
- Audit trail of all content processing
- Quality scores for data integrity
- Structured metadata for easy classification

## 🛠️ Technology Stack

### Backend
- **Framework**: Express.js, Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **AI/ML**: Google Generative AI (Gemini), LangChain, LangGraph
- **Vector DB**: Pinecone for semantic search
- **Cache**: Redis

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI
- **State Management**: React Context, SWR

### Infrastructure
- **Hosting**: Vercel (serverless functions)
- **Scheduling**: Vercel Cron Jobs
- **Email**: Resend API
- **Monitoring**: Winston, Prometheus

### DevOps
- **CI/CD**: GitHub Actions
- **Containerization**: Docker, Docker Compose
- **Testing**: Jest, Playwright, Supertest
- **Linting**: ESLint, Prettier

## 📈 System Metrics

- **Sources**: 10+ government and news sources
- **Articles Processed**: 1000+ articles
- **AI Summarization**: 95%+ success rate
- **Classification**: 15+ topic categories
- **Response Time**: <500ms average API latency
- **Uptime**: 99.9%+ availability

## 🔐 Security & Compliance

- **Authentication**: JWT-based with HTTP-only cookies
- **Secrets Management**: AWS Secrets Manager, Azure Key Vault
- **Data Encryption**: In-transit and at-rest encryption
- **GDPR Compliance**: User data privacy and right to deletion
- **Audit Logging**: Complete activity tracking

## 🤝 Contributing

We welcome contributions from the community! Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "feat: description"`
3. Push to branch: `git push origin feature/your-feature`
4. Create Pull Request

## 📞 Support & Contact

- **Project Lead**: David Nguyen
- **Email**: hoangson091104@gmail.com
- **Website**: https://synthoraai.vercel.app/
- **GitHub**: https://github.com/hoangsonww/AI-Gov-Content-Curator
- **LinkedIn**: [David Nguyen](https://www.linkedin.com/in/hoangsonw/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Generative AI for summarization capabilities
- Vercel for hosting and serverless infrastructure
- MongoDB for data persistence
- Pinecone for vector search
- All open-source contributors

---

**Built with ❤️ for government officials and public servants**

*Empowering informed decision-making through AI-powered data governance*
