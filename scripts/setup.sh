#!/bin/bash

# Setup script for Data Governance Toolkit
set -e

echo "========================================="
echo "Data Governance Toolkit - Setup"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js v18+ from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠ Python 3 is not installed (optional for AI pipeline)${NC}"
else
    echo -e "${GREEN}✓ Python $(python3 --version)${NC}"
fi

# Check Docker (optional)
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker is not installed (optional)${NC}"
else
    echo -e "${GREEN}✓ Docker $(docker --version)${NC}"
fi

echo ""
echo "Installing dependencies..."

# Install root dependencies
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install crawler dependencies
echo "Installing crawler dependencies..."
cd crawler
npm install
cd ..

# Install newsletter dependencies
if [ -d "newsletters" ]; then
    echo "Installing newsletter dependencies..."
    cd newsletters
    npm install
    cd ..
fi

# Install AI pipeline dependencies
if [ -d "ai_pipeline" ] && command -v python3 &> /dev/null; then
    echo "Installing AI pipeline dependencies..."
    cd ai_pipeline
    pip3 install -r requirements.txt
    cd ..
fi

echo ""
echo "Setting up environment..."

# Copy .env.example to .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}⚠ Please update .env with your API keys${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Update .env file with your API keys"
echo "2. Start development server: npm run dev"
echo "3. Or use Docker: docker-compose up"
echo ""
echo "For more information, see README.md"
