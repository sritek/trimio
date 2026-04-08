---
# Local development setup guide - prerequisites, installation, and troubleshooting
inclusion: fileMatch
fileMatchPattern: '.env*, package.json, docker-compose.yml, README.md'
---

# Local Development Setup Guide

## Overview

This guide provides step-by-step instructions for setting up the Salon Management SaaS platform for local development, including prerequisites, installation, configuration, and common troubleshooting.

---

## 1. Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 22.x LTS | Runtime for backend and frontend |
| npm | 10.x | Package manager |
| Docker | 24.x+ | Container runtime for services |
| Docker Compose | 2.x | Multi-container orchestration |
| Git | 2.x | Version control |
| PostgreSQL Client | 15.x | Database CLI (optional) |
| Redis CLI | 7.x | Redis CLI (optional) |

### Recommended IDE Extensions

**VS Code:**
- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- GitLens
- Docker
- Thunder Client (API testing)

### System Requirements

- **RAM:** Minimum 8GB (16GB recommended)
- **Storage:** Minimum 10GB free space
- **OS:** macOS, Linux, or Windows with WSL2

---

## 2. Installation Steps

### Step 1: Clone Repository

```bash
# Clone the monorepo
git clone https://github.com/your-org/trimio.git
cd trimio

# View project structure
ls -la
# Expected:
# trimio-backend/    - Fastify API
# trimio-web/        - Next.js dashboard
# trimio-booking/    - Public booking page (optional)
# infrastructure/       - Docker, Terraform configs
# .cursor/              - Cursor rules and docs
```

### Step 2: Install Dependencies

```bash
# Install backend dependencies
cd trimio-backend
npm install

# Install frontend dependencies
cd ../trimio-web
npm install

# Return to root
cd ..
```

### Step 3: Start Infrastructure Services

```bash
# Start PostgreSQL and Redis using Docker Compose
docker-compose up -d postgres redis

# Verify services are running
docker-compose ps
# Expected output:
# NAME                  STATUS
# trimio-postgres    running (healthy)
# trimio-redis       running (healthy)

# Check PostgreSQL connection
docker exec -it trimio-postgres psql -U postgres -c "SELECT version();"

# Check Redis connection
docker exec -it trimio-redis redis-cli ping
# Expected: PONG
```

### Step 4: Configure Environment Variables

```bash
# Backend environment
cd trimio-backend
cp .env.example .env

# Edit .env with your settings
# Most defaults work for local development
```

**Backend .env file:**

```bash
# trimio-backend/.env

# Application
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
APP_URL=http://localhost:3001

# Database (Docker defaults)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trimio

# Redis (Docker defaults)
REDIS_URL=redis://localhost:6379

# JWT (generate a secure key for production)
JWT_SECRET=local-development-secret-key-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# AWS (optional for local - use mocks)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=local-dev-key
AWS_SECRET_ACCESS_KEY=local-dev-secret
S3_BUCKET_NAME=trimio-local

# Monitoring (optional for local)
# SENTRY_DSN=
LOG_LEVEL=debug

# Feature Flags
ENABLE_ONLINE_BOOKING=true
ENABLE_MARKETING=true
```

**Frontend .env file:**

```bash
# trimio-web/.env.local

NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Step 5: Setup Database

```bash
cd trimio-backend

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database with demo data
npx prisma db seed

# (Optional) Open Prisma Studio to view data
npx prisma studio
# Opens at http://localhost:5555
```

### Step 6: Start Development Servers

**Terminal 1 - Backend API:**

```bash
cd trimio-backend
npm run dev

# Expected output:
# Server listening on http://localhost:3000
# API docs at http://localhost:3000/docs
```

**Terminal 2 - Frontend Dashboard:**

```bash
cd trimio-web
npm run dev

# Expected output:
# ready - started server on http://localhost:3001
```

**Terminal 3 - Background Workers (Optional):**

```bash
cd trimio-backend
npm run dev:worker

# Expected output:
# Started 5 queue workers
# Scheduled jobs configured
```

### Step 7: Verify Setup

```bash
# Test API health
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"..."}

# Test API endpoint
curl http://localhost:3000/api/v1/services \
  -H "Authorization: Bearer <token>"

# Access dashboard
open http://localhost:3001

# Login with demo credentials:
# Email: owner@demo.com
# Password: demo123
```

---

## 3. Project Scripts

### Backend Scripts (trimio-backend)

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run dev:worker       # Start background workers

# Build
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations (dev)
npm run db:migrate:prod  # Run migrations (production)
npm run db:seed          # Seed database
npm run db:reset         # Reset database (drops all data!)
npm run db:studio        # Open Prisma Studio

# Testing
npm run test             # Run all tests
npm run test:unit        # Run unit tests
npm run test:integration # Run integration tests
npm run test:coverage    # Run tests with coverage
npm run test:watch       # Run tests in watch mode

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format with Prettier
npm run type-check       # TypeScript type checking
```

### Frontend Scripts (trimio-web)

```bash
# Development
npm run dev              # Start dev server

# Build
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm run test             # Run tests
npm run test:e2e         # Run Playwright E2E tests

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format with Prettier
npm run type-check       # TypeScript type checking
```

### Docker Scripts (Root)

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d postgres redis

# Stop all services
docker-compose down

# View logs
docker-compose logs -f api
docker-compose logs -f postgres

# Reset volumes (deletes all data!)
docker-compose down -v

# Rebuild images
docker-compose build --no-cache
```

---

## 4. Development Workflow

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin develop

# 2. Update dependencies (if package.json changed)
cd trimio-backend && npm install
cd ../trimio-web && npm install

# 3. Run database migrations (if schema changed)
cd trimio-backend
npx prisma migrate dev

# 4. Start services
docker-compose up -d postgres redis

# 5. Start dev servers (in separate terminals)
# Terminal 1: cd trimio-backend && npm run dev
# Terminal 2: cd trimio-web && npm run dev

# 6. Work on features...

# 7. Run tests before committing
npm run test
npm run lint

# 8. Commit changes
git add .
git commit -m "feat: add appointment reminder feature"
```

### Branch Strategy

```
main        - Production releases
develop     - Development integration
feature/*   - Feature branches
bugfix/*    - Bug fix branches
hotfix/*    - Production hotfixes
```

### Commit Convention

```
feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Code style (formatting, no code change)
refactor: Code refactoring
test:     Adding tests
chore:    Build process, dependencies
perf:     Performance improvements
```

---

## 5. Database Management

### Migrations

```bash
# Create new migration
npx prisma migrate dev --name add_customer_notes

# Apply migrations
npx prisma migrate dev

# Reset database (development only!)
npx prisma migrate reset

# Check migration status
npx prisma migrate status
```

### Seeding

```bash
# Run seed script
npx prisma db seed

# Custom seed for specific data
npx ts-node prisma/seeds/customers.seed.ts
```

### Direct Database Access

```bash
# Connect to PostgreSQL
docker exec -it trimio-postgres psql -U postgres -d trimio

# Common queries
\dt                          # List tables
\d+ appointments             # Describe table
SELECT * FROM tenants;       # Query data

# Exit
\q
```

### Prisma Studio

```bash
# Open visual database browser
npx prisma studio
# Opens at http://localhost:5555
```

---

## 6. API Development

### API Documentation

- **Swagger UI:** http://localhost:3000/docs
- **OpenAPI JSON:** http://localhost:3000/docs/json

### Testing API Endpoints

**Using curl:**

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@demo.com","password":"demo123"}'

# Use returned token for authenticated requests
export TOKEN="<access_token_from_login>"

# Get appointments
curl http://localhost:3000/api/v1/appointments \
  -H "Authorization: Bearer $TOKEN"

# Create appointment
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "<branch-id>",
    "customerId": "<customer-id>",
    "appointmentDate": "2024-01-20",
    "startTime": "10:00",
    "services": [{"serviceId": "<service-id>"}]
  }'
```

**Using Thunder Client (VS Code):**

1. Install Thunder Client extension
2. Import collection from `docs/api/thunder-collection.json`
3. Set environment variables for `BASE_URL` and `TOKEN`

### Adding New Endpoints

1. Create route handler in `src/routes/`
2. Add validation schema in `src/validators/`
3. Implement service logic in `src/services/`
4. Add repository methods in `src/repositories/`
5. Write tests in `tests/`
6. Update API documentation

---

## 7. Frontend Development

### Component Development

```bash
# Add new shadcn/ui component
npx shadcn-ui@latest add <component-name>

# Examples
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add data-table
```

### Page Structure

```
app/
├── (dashboard)/
│   └── appointments/
│       ├── page.tsx          # List page
│       ├── [id]/
│       │   └── page.tsx      # Detail page
│       ├── new/
│       │   └── page.tsx      # Create page
│       └── loading.tsx       # Loading state
```

### Adding New Pages

1. Create page file in `app/(dashboard)/<route>/page.tsx`
2. Add route to sidebar navigation in `components/layout/sidebar.tsx`
3. Implement page component with data fetching
4. Add loading and error states
5. Update permissions if needed

### State Management

```typescript
// Create new store
// stores/example-store.ts
import { create } from 'zustand';

interface ExampleState {
  data: string[];
  addItem: (item: string) => void;
}

export const useExampleStore = create<ExampleState>((set) => ({
  data: [],
  addItem: (item) => set((state) => ({ data: [...state.data, item] })),
}));
```

---

## 8. Testing

### Running Tests

```bash
# Backend tests
cd trimio-backend
npm run test              # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report

# Frontend tests
cd trimio-web
npm run test              # Unit tests
npm run test:e2e          # E2E tests (Playwright)
```

### Writing Tests

```typescript
// Example unit test
describe('AppointmentService', () => {
  it('should calculate end time correctly', () => {
    const service = new AppointmentService();
    expect(service.calculateEndTime('10:00', 60)).toBe('11:00');
  });
});
```

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

---

## 9. Debugging

### Backend Debugging

**VS Code launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/trimio-backend",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Frontend Debugging

- Use React DevTools browser extension
- Use Next.js built-in error overlay
- Check browser console for errors

### Database Debugging

```bash
# Enable Prisma query logging
# Add to .env:
DEBUG=prisma:query

# View slow queries
docker exec -it trimio-postgres psql -U postgres -d trimio \
  -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### Redis Debugging

```bash
# Monitor Redis commands in real-time
docker exec -it trimio-redis redis-cli monitor

# Check Redis memory
docker exec -it trimio-redis redis-cli info memory
```

---

## 10. Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :3000
# or on Windows
netstat -ano | findstr :3000

# Kill process
kill -9 <PID>
```

#### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Verify connection string in .env
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trimio
```

#### Prisma Client Issues

```bash
# Regenerate Prisma Client
npx prisma generate

# Clear node_modules and reinstall
rm -rf node_modules
npm install
npx prisma generate
```

#### Redis Connection Failed

```bash
# Check if Redis is running
docker-compose ps redis

# Restart Redis
docker-compose restart redis

# Test connection
docker exec -it trimio-redis redis-cli ping
```

#### Migration Failed

```bash
# Check migration status
npx prisma migrate status

# Reset database (loses all data!)
npx prisma migrate reset

# Or manually fix and retry
npx prisma migrate dev
```

#### npm Install Fails

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### Docker Issues

```bash
# Reset Docker environment
docker-compose down -v
docker system prune -f
docker-compose up -d

# Check Docker disk space
docker system df
```

#### Frontend Build Fails

```bash
# Clear Next.js cache
rm -rf .next
npm run dev

# Check for TypeScript errors
npm run type-check
```

### Getting Help

1. Check existing documentation in `.cursor/rules/`
2. Search issues in GitHub repository
3. Check logs: `docker-compose logs -f`
4. Ask in team Slack channel

---

## 11. Useful Commands Reference

### Quick Reference

```bash
# === DOCKER ===
docker-compose up -d              # Start services
docker-compose down               # Stop services
docker-compose logs -f <service>  # View logs
docker-compose ps                 # List services
docker-compose restart <service>  # Restart service

# === DATABASE ===
npx prisma studio                 # Visual DB browser
npx prisma migrate dev            # Run migrations
npx prisma db seed                # Seed database
npx prisma generate               # Generate client

# === DEVELOPMENT ===
npm run dev                       # Start dev server
npm run build                     # Build for production
npm run lint                      # Check code quality
npm run test                      # Run tests

# === GIT ===
git status                        # Check changes
git pull origin develop           # Pull latest
git checkout -b feature/xyz       # New branch
git push -u origin <branch>       # Push branch
```

### Aliases (Add to ~/.bashrc or ~/.zshrc)

```bash
# Trimio aliases
alias so-up="docker-compose up -d postgres redis"
alias so-down="docker-compose down"
alias so-logs="docker-compose logs -f"
alias so-api="cd ~/trimio/trimio-backend && npm run dev"
alias so-web="cd ~/trimio/trimio-web && npm run dev"
alias so-db="npx prisma studio"
alias so-migrate="npx prisma migrate dev"
alias so-seed="npx prisma db seed"
```

---

## 12. Environment-Specific Notes

### macOS

```bash
# Install prerequisites via Homebrew
brew install node@22 docker docker-compose git postgresql@15 redis

# Start Docker Desktop before running docker-compose
```

### Linux (Ubuntu/Debian)

```bash
# Install Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install docker-compose
sudo apt install docker-compose-plugin
```

### Windows (WSL2)

```bash
# Install WSL2 with Ubuntu
wsl --install -d Ubuntu

# Inside WSL, follow Linux instructions above

# Ensure Docker Desktop is configured to use WSL2 backend
# Settings > Resources > WSL Integration > Enable Ubuntu
```

---

## 13. Demo Credentials

### Local Development

| Role | Email | Password |
|------|-------|----------|
| Super Owner | owner@demo.com | demo123 |
| Branch Manager | manager@demo.com | demo123 |
| Stylist | stylist@demo.com | demo123 |
| Receptionist | receptionist@demo.com | demo123 |

### Demo Tenant

- **Tenant ID:** demo-salon
- **Branch:** Main Branch
- **Booking URL:** http://localhost:3001/book/demo-salon
