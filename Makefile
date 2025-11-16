# Data Governance Toolkit Makefile

.PHONY: help install dev build test lint format clean docker-up docker-down deploy

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	@echo "Installing dependencies..."
	@npm install
	@cd backend && npm install
	@cd frontend && npm install
	@cd crawler && npm install
	@cd newsletters && npm install
	@cd ai_pipeline && pip install -r requirements.txt
	@echo "✓ All dependencies installed"

dev: ## Start all services in development mode
	@echo "Starting development servers..."
	@npm run dev

dev-backend: ## Start only backend in development mode
	@cd backend && npm run dev

dev-frontend: ## Start only frontend in development mode
	@cd frontend && npm run dev

dev-crawler: ## Start only crawler in development mode
	@cd crawler && npm run dev

dev-ai: ## Start AI pipeline server
	@cd ai_pipeline && python -m uvicorn src.mcp_server:app --reload

build: ## Build all services for production
	@echo "Building all services..."
	@cd backend && npm run build
	@cd frontend && npm run build
	@cd crawler && npm run build
	@echo "✓ All services built"

test: ## Run all tests
	@echo "Running tests..."
	@cd backend && npm run test
	@cd frontend && npm run test
	@cd crawler && npm run test
	@cd ai_pipeline && pytest
	@echo "✓ All tests passed"

test-coverage: ## Run tests with coverage
	@cd backend && npm run test:coverage
	@cd frontend && npm run test:coverage

lint: ## Run linters
	@echo "Linting code..."
	@cd backend && npm run lint
	@cd frontend && npm run lint
	@cd crawler && npm run lint
	@cd ai_pipeline && ruff check src/
	@echo "✓ Linting complete"

format: ## Format code
	@echo "Formatting code..."
	@cd backend && npm run format
	@cd frontend && npm run format
	@cd ai_pipeline && black src/
	@echo "✓ Code formatted"

clean: ## Clean build artifacts and dependencies
	@echo "Cleaning..."
	@rm -rf node_modules
	@cd backend && rm -rf node_modules dist
	@cd frontend && rm -rf node_modules .next
	@cd crawler && rm -rf node_modules dist
	@cd newsletters && rm -rf node_modules dist
	@cd ai_pipeline && rm -rf __pycache__ .pytest_cache
	@echo "✓ Cleaned"

docker-build: ## Build Docker images
	@echo "Building Docker images..."
	@docker-compose build
	@echo "✓ Docker images built"

docker-up: ## Start all services with Docker
	@echo "Starting Docker containers..."
	@docker-compose up -d
	@echo "✓ Containers started"
	@echo "Backend: http://localhost:3001"
	@echo "Frontend: http://localhost:3000"
	@echo "AI Pipeline: http://localhost:8000"

docker-down: ## Stop all Docker containers
	@echo "Stopping Docker containers..."
	@docker-compose down
	@echo "✓ Containers stopped"

docker-logs: ## View Docker logs
	@docker-compose logs -f

deploy-vercel: ## Deploy to Vercel
	@echo "Deploying to Vercel..."
	@cd backend && vercel --prod
	@cd frontend && vercel --prod
	@cd crawler && vercel --prod
	@cd newsletters && vercel --prod
	@echo "✓ Deployed to Vercel"

crawl: ## Run crawler manually
	@cd crawler && npm run crawl

db-seed: ## Seed database with sample data
	@cd backend && npm run db:seed

db-reset: ## Reset database
	@cd backend && npm run db:reset

logs: ## View application logs
	@tail -f backend/logs/combined.log

health: ## Check health of all services
	@echo "Checking service health..."
	@curl -f http://localhost:3001/health || echo "Backend: DOWN"
	@curl -f http://localhost:3000/ || echo "Frontend: DOWN"
	@curl -f http://localhost:8000/health || echo "AI Pipeline: DOWN"
