# Trimio

A multi-tenant SaaS platform for salon management. Built with Next.js, Fastify, Prisma, and PostgreSQL.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS, shadcn/ui
- **Backend**: Fastify, Prisma ORM, Zod validation
- **Database**: PostgreSQL 15
- **Cache**: Redis
- **Package Manager**: pnpm (monorepo with Turborepo)

## Prerequisites

- Node.js >= 22.0.0
- pnpm >= 9.0.0
- PostgreSQL 15+
- Redis

### Install Prerequisites (macOS)

```bash
# Install Node.js via nvm
nvm install 22
nvm use 22

# Install pnpm
npm install -g pnpm@9

# Install PostgreSQL and Redis via Homebrew
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis
```

### Install Prerequisites (Windows)

#### Option 1: Using Chocolatey (Recommended)

```powershell
# Install Chocolatey (run PowerShell as Administrator)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Node.js
choco install nodejs-lts --version=22.0.0

# Install pnpm
npm install -g pnpm@9

# Install PostgreSQL
choco install postgresql15
# Default credentials: postgres/postgres
# Add to PATH: C:\Program Files\PostgreSQL\15\bin

# Install Redis (via Memurai - Redis-compatible for Windows)
choco install memurai-developer
```

#### Option 2: Manual Installation

1. **Node.js**: Download from https://nodejs.org (v22 LTS)
2. **pnpm**: Run `npm install -g pnpm@9`
3. **PostgreSQL**: Download from https://www.postgresql.org/download/windows/
4. **Redis**: Use one of these options:
   - [Memurai](https://www.memurai.com/) (Redis-compatible, recommended)
   - [Redis for Windows](https://github.com/microsoftarchive/redis/releases) (older, v3.x)
   - Docker (see below)

#### Create Database (Windows)

```powershell
# Open PowerShell and connect to PostgreSQL
psql -U postgres

# In psql prompt, create the database
CREATE DATABASE trimio;
\q
```

### Install Prerequisites (Docker - All Platforms)

Docker is the easiest way to run PostgreSQL and Redis on any platform.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)

2. Start PostgreSQL and Redis:

```bash
# Start PostgreSQL
docker run -d \
  --name trimio-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=trimio \
  -p 5432:5432 \
  postgres:15

# Start Redis
docker run -d \
  --name trimio-redis \
  -p 6379:6379 \
  redis:7
```

Or use Docker Compose (create `docker-compose.yml` in project root):

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: trimio
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - '6379:6379'

volumes:
  postgres_data:
```

Then run:

```bash
docker-compose up -d
```

## Getting Started

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd trimio
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` with your database credentials:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trimio
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-at-least-32-characters-long
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed demo data
pnpm db:seed
```

### 4. Start Development Servers

```bash
# Start both API and Web in parallel
pnpm dev
```

This starts:

- **API**: http://localhost:3000
- **Web**: http://localhost:3001

### 5. Login

Open http://localhost:3001/login and use the demo credentials:

```
Email: owner@glamourstudio.com
Password: demo123
```

## Project Structure

```
trimio/
├── apps/
│   ├── api/                 # Fastify backend
│   │   ├── prisma/          # Database schema & migrations
│   │   └── src/
│   │       ├── modules/     # Feature modules
│   │       ├── lib/         # Shared utilities
│   │       └── middleware/  # Auth, validation
│   └── web/                 # Next.js frontend
│       └── src/
│           ├── app/         # App router pages
│           ├── components/  # UI components
│           ├── hooks/       # React hooks
│           └── stores/      # Zustand stores
├── packages/
│   ├── shared/              # Shared types & constants
│   └── config/              # Shared configs
└── package.json
```

## Available Scripts

### Root Level

```bash
pnpm dev          # Start all apps in development
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm type-check   # TypeScript check
pnpm clean        # Clean all build artifacts
```

### Database

```bash
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run migrations
pnpm db:seed      # Seed demo data
pnpm db:studio    # Open Prisma Studio
pnpm db:reset     # Reset database (WARNING: deletes all data)
```

### Individual Apps

```bash
# Run specific app
pnpm --filter api dev
pnpm --filter web dev

# Build specific app
pnpm --filter api build
pnpm --filter web build
```

## API Documentation

Swagger UI is available at http://localhost:3000/docs when the API is running.

## Troubleshooting

### Styles not loading

```bash
# Clear Next.js cache and restart
rm -rf apps/web/.next
pnpm dev
```

### Database connection issues

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check Redis is running
redis-cli ping
```

### Port already in use

```bash
# Kill process on port 3000 (API)
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001 (Web)
lsof -ti:3001 | xargs kill -9
```

### Reset everything

```bash
# Nuclear option - reset all
pnpm clean
rm -rf node_modules apps/*/node_modules
pnpm install
pnpm db:reset
pnpm db:seed
pnpm dev
```

## License

Private - All rights reserved.
