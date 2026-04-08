---
# DevOps & Infrastructure patterns - Docker, CI/CD, Terraform, and deployment
inclusion: fileMatch
fileMatchPattern: 'infrastructure/**/*.*, .github/**/*.*, docker-compose.yml, Dockerfile'
---

# DevOps & Infrastructure Guide

## Overview

This document provides infrastructure setup, deployment patterns, and operational guides for the Salon Management SaaS platform including Docker configuration, CI/CD pipelines, Terraform infrastructure, and deployment procedures.

---

## 1. Docker Configuration

### Project Docker Structure

```
infrastructure/
├── docker/
│   ├── api/
│   │   └── Dockerfile
│   ├── web/
│   │   └── Dockerfile
│   ├── booking/
│   │   └── Dockerfile
│   └── worker/
│       └── Dockerfile
├── docker-compose.yml           # Local development
├── docker-compose.prod.yml      # Production reference
└── .dockerignore
```

### API Dockerfile (Fastify Backend)

```dockerfile
# infrastructure/docker/api/Dockerfile

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# ============================================
# Stage 2: Builder
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
RUN npm run build

# ============================================
# Stage 3: Runner
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 api

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Set ownership
RUN chown -R api:nodejs /app

USER api

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

### Web Dockerfile (Next.js Frontend)

```dockerfile
# infrastructure/docker/web/Dockerfile

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

# ============================================
# Stage 2: Builder
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Build Next.js
RUN npm run build

# ============================================
# Stage 3: Runner
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

### Worker Dockerfile (BullMQ Workers)

```dockerfile
# infrastructure/docker/worker/Dockerfile

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production
RUN npx prisma generate

# Copy worker code
COPY dist/workers ./dist/workers
COPY dist/lib ./dist/lib
COPY dist/services ./dist/services

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker
RUN chown -R worker:nodejs /app

USER worker

# No port exposure - workers don't serve HTTP

CMD ["node", "dist/workers/index.js"]
```

### Docker Compose (Local Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: trimio-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: trimio
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    container_name: trimio-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # API Service
  api:
    build:
      context: ./trimio-backend
      dockerfile: ../infrastructure/docker/api/Dockerfile
    container_name: trimio-api
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/trimio
      REDIS_URL: redis://redis:6379
      JWT_SECRET: development-secret-key-min-32-chars
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./trimio-backend/src:/app/src:ro
    command: npm run dev

  # Web Frontend
  web:
    build:
      context: ./trimio-web
      dockerfile: ../infrastructure/docker/web/Dockerfile
    container_name: trimio-web
    ports:
      - "3001:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000/api/v1
    depends_on:
      - api
    volumes:
      - ./trimio-web/app:/app/app:ro
      - ./trimio-web/components:/app/components:ro

  # BullMQ Worker
  worker:
    build:
      context: ./trimio-backend
      dockerfile: ../infrastructure/docker/worker/Dockerfile
    container_name: trimio-worker
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/trimio
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # BullMQ Dashboard (Development only)
  bull-board:
    image: deadly0/bull-board
    container_name: trimio-bull-board
    ports:
      - "3002:3000"
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - redis

volumes:
  postgres_data:
  redis_data:
```

### .dockerignore

```
# .dockerignore
node_modules
npm-debug.log
.git
.gitignore
.env
.env.*
!.env.example
dist
.next
coverage
.nyc_output
*.log
.DS_Store
Thumbs.db
*.md
!README.md
tests
__tests__
*.test.ts
*.spec.ts
.vscode
.idea
```

---

## 2. CI/CD Pipeline (GitHub Actions)

### Main CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '22'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ============================================
  # Lint and Type Check
  # ============================================
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript check
        run: npm run type-check

  # ============================================
  # Unit Tests
  # ============================================
  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

  # ============================================
  # Integration Tests
  # ============================================
  test-integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: trimio_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/trimio_test

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/trimio_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret-key-min-32-characters

  # ============================================
  # Build Docker Images
  # ============================================
  build:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: [lint, test-unit, test-integration]
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      # Build API Image
      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: ./trimio-backend
          file: ./infrastructure/docker/api/Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # Build Web Image
      - name: Build and push Web image
        uses: docker/build-push-action@v5
        with:
          context: ./trimio-web
          file: ./infrastructure/docker/web/Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-web:${{ github.sha }}
          build-args: |
            NEXT_PUBLIC_API_URL=${{ secrets.API_URL }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # Build Worker Image
      - name: Build and push Worker image
        uses: docker/build-push-action@v5
        with:
          context: ./trimio-backend
          file: ./infrastructure/docker/worker/Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-worker:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ============================================
  # Deploy to Staging
  # ============================================
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster trimio-staging \
            --service api \
            --force-new-deployment

          aws ecs update-service \
            --cluster trimio-staging \
            --service web \
            --force-new-deployment

          aws ecs update-service \
            --cluster trimio-staging \
            --service worker \
            --force-new-deployment

  # ============================================
  # Deploy to Production
  # ============================================
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1

      - name: Run database migrations
        run: |
          # Run migrations via ECS task
          aws ecs run-task \
            --cluster trimio-production \
            --task-definition trimio-migrate \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[${{ secrets.PRIVATE_SUBNET_IDS }}],securityGroups=[${{ secrets.SECURITY_GROUP_ID }}]}"

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster trimio-production \
            --service api \
            --force-new-deployment

          aws ecs update-service \
            --cluster trimio-production \
            --service web \
            --force-new-deployment

          aws ecs update-service \
            --cluster trimio-production \
            --service worker \
            --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster trimio-production \
            --services api web worker
```

### Database Migration Workflow

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to run migration'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  migrate:
    name: Run Migrations
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1

      - name: Get database URL from Secrets Manager
        id: secrets
        run: |
          DATABASE_URL=$(aws secretsmanager get-secret-value \
            --secret-id trimio/${{ inputs.environment }}/database \
            --query SecretString --output text | jq -r .DATABASE_URL)
          echo "::add-mask::$DATABASE_URL"
          echo "DATABASE_URL=$DATABASE_URL" >> $GITHUB_ENV

      - name: Run migrations
        run: npx prisma migrate deploy

      - name: Notify on success
        if: success()
        run: |
          echo "Migrations completed successfully on ${{ inputs.environment }}"
```

---

## 3. Terraform Infrastructure

### Directory Structure

```
infrastructure/terraform/
├── environments/
│   ├── staging/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   └── production/
│       ├── main.tf
│       ├── variables.tf
│       └── terraform.tfvars
├── modules/
│   ├── vpc/
│   ├── ecs/
│   ├── rds/
│   ├── elasticache/
│   ├── s3/
│   ├── cloudfront/
│   ├── alb/
│   └── secrets/
└── shared/
    └── backend.tf
```

### VPC Module

```hcl
# infrastructure/terraform/modules/vpc/main.tf

variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["ap-south-1a", "ap-south-1b"]
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "trimio-${var.environment}-vpc"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "trimio-${var.environment}-igw"
    Environment = var.environment
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "trimio-${var.environment}-public-${count.index + 1}"
    Environment = var.environment
    Type        = "public"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + length(var.availability_zones))
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "trimio-${var.environment}-private-${count.index + 1}"
    Environment = var.environment
    Type        = "private"
  }
}

# NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name        = "trimio-${var.environment}-nat-eip"
    Environment = var.environment
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "trimio-${var.environment}-nat"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "trimio-${var.environment}-public-rt"
    Environment = var.environment
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name        = "trimio-${var.environment}-private-rt"
    Environment = var.environment
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# Outputs
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
```

### ECS Module

```hcl
# infrastructure/terraform/modules/ecs/main.tf

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_target_group_arn" {
  type = string
}

variable "api_image" {
  type = string
}

variable "web_image" {
  type = string
}

variable "worker_image" {
  type = string
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "trimio-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Environment = var.environment
  }
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_execution" {
  name = "trimio-${var.environment}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role
resource "aws_iam_role" "ecs_task" {
  name = "trimio-${var.environment}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Task role policies (S3, Secrets Manager, etc.)
resource "aws_iam_role_policy" "ecs_task" {
  name = "trimio-${var.environment}-ecs-task-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::trimio-${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:ap-south-1:*:secret:trimio/${var.environment}/*"
      }
    ]
  })
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "trimio-${var.environment}-ecs-tasks"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "trimio-${var.environment}-ecs-tasks"
    Environment = var.environment
  }
}

# API Task Definition
resource "aws_ecs_task_definition" "api" {
  family                   = "trimio-${var.environment}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "api"
      image = var.api_image
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = var.environment }
      ]
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "arn:aws:secretsmanager:ap-south-1:${data.aws_caller_identity.current.account_id}:secret:trimio/${var.environment}/database:DATABASE_URL::"
        },
        {
          name      = "REDIS_URL"
          valueFrom = "arn:aws:secretsmanager:ap-south-1:${data.aws_caller_identity.current.account_id}:secret:trimio/${var.environment}/redis:REDIS_URL::"
        },
        {
          name      = "JWT_SECRET"
          valueFrom = "arn:aws:secretsmanager:ap-south-1:${data.aws_caller_identity.current.account_id}:secret:trimio/${var.environment}/app:JWT_SECRET::"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/trimio-${var.environment}-api"
          "awslogs-region"        = "ap-south-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Environment = var.environment
  }
}

# API Service
resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.environment == "production" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "api"
    container_port   = 3000
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  tags = {
    Environment = var.environment
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/trimio-${var.environment}-api"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = {
    Environment = var.environment
  }
}

# Auto Scaling
resource "aws_appautoscaling_target" "api" {
  max_capacity       = var.environment == "production" ? 10 : 2
  min_capacity       = var.environment == "production" ? 2 : 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "trimio-${var.environment}-api-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

data "aws_caller_identity" "current" {}
```

### RDS Module

```hcl
# infrastructure/terraform/modules/rds/main.tf

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "trimio-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "trimio-${var.environment}-db-subnet"
    Environment = var.environment
  }
}

# Security Group
resource "aws_security_group" "rds" {
  name        = "trimio-${var.environment}-rds"
  description = "Security group for RDS"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
  }

  tags = {
    Name        = "trimio-${var.environment}-rds"
    Environment = var.environment
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "trimio-${var.environment}"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "trimio"
  username = "postgres"
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az               = var.environment == "production"
  publicly_accessible    = false
  deletion_protection    = var.environment == "production"
  skip_final_snapshot    = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "trimio-${var.environment}-final" : null

  backup_retention_period = var.environment == "production" ? 7 : 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  performance_insights_enabled = var.environment == "production"

  tags = {
    Name        = "trimio-${var.environment}"
    Environment = var.environment
  }
}

# Random password for DB
resource "random_password" "db_password" {
  length  = 32
  special = false
}

# Store in Secrets Manager
resource "aws_secretsmanager_secret" "db" {
  name = "trimio/${var.environment}/database"

  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://${aws_db_instance.main.username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
    DB_HOST      = aws_db_instance.main.address
    DB_PORT      = aws_db_instance.main.port
    DB_NAME      = aws_db_instance.main.db_name
    DB_USER      = aws_db_instance.main.username
    DB_PASSWORD  = random_password.db_password.result
  })
}

output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}
```

### Production Environment

```hcl
# infrastructure/terraform/environments/production/main.tf

terraform {
  required_version = ">= 1.0"

  backend "s3" {
    bucket         = "trimio-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "trimio-terraform-locks"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-south-1"

  default_tags {
    tags = {
      Project     = "trimio"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  environment = "production"
}

# VPC
module "vpc" {
  source      = "../../modules/vpc"
  environment = local.environment
  vpc_cidr    = "10.0.0.0/16"
}

# RDS
module "rds" {
  source             = "../../modules/rds"
  environment        = local.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  instance_class     = "db.t3.small"
}

# ElastiCache
module "elasticache" {
  source             = "../../modules/elasticache"
  environment        = local.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  node_type          = "cache.t3.micro"
}

# S3
module "s3" {
  source      = "../../modules/s3"
  environment = local.environment
}

# CloudFront
module "cloudfront" {
  source           = "../../modules/cloudfront"
  environment      = local.environment
  s3_bucket_domain = module.s3.bucket_domain
}

# ALB
module "alb" {
  source            = "../../modules/alb"
  environment       = local.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = var.certificate_arn
}

# ECS
module "ecs" {
  source               = "../../modules/ecs"
  environment          = local.environment
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  alb_target_group_arn = module.alb.target_group_arn
  api_image            = var.api_image
  web_image            = var.web_image
  worker_image         = var.worker_image
}
```

---

## 4. Environment Configuration

### AWS Secrets Manager Structure

```
trimio/
├── production/
│   ├── database        # DATABASE_URL, DB_HOST, DB_PASSWORD
│   ├── redis           # REDIS_URL
│   ├── app             # JWT_SECRET, API_KEY
│   ├── aws             # S3 credentials (if not using IAM roles)
│   ├── payment/        # Payment gateway credentials
│   │   ├── razorpay
│   │   └── payu
│   └── messaging/      # Messaging provider credentials
│       ├── gupshup
│       ├── msg91
│       └── sendgrid
└── staging/
    └── (same structure)
```

### Environment Variables by Service

```bash
# API Service
NODE_ENV=production
PORT=3000
API_URL=https://api.trimio.com
APP_URL=https://app.trimio.com

# From Secrets Manager
DATABASE_URL=
REDIS_URL=
JWT_SECRET=

# AWS (from IAM role or explicit)
AWS_REGION=ap-south-1
S3_BUCKET_NAME=trimio-production

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info

# Web Service
NEXT_PUBLIC_API_URL=https://api.trimio.com/api/v1
NEXT_PUBLIC_APP_URL=https://app.trimio.com

# Worker Service
# Same as API (DATABASE_URL, REDIS_URL, etc.)
```

---

## 5. SSL/TLS Configuration

### ACM Certificate Request

```hcl
# Request certificate for all domains
resource "aws_acm_certificate" "main" {
  domain_name               = "trimio.com"
  subject_alternative_names = [
    "*.trimio.com",
    "api.trimio.com",
    "app.trimio.com",
    "book.trimio.com"
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = var.environment
  }
}

# DNS validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

---

## 6. DNS Configuration

### Route 53 Records

```hcl
# infrastructure/terraform/modules/dns/main.tf

data "aws_route53_zone" "main" {
  name = "trimio.com"
}

# API subdomain
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.trimio.com"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# App subdomain
resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.trimio.com"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Booking subdomain (CloudFront)
resource "aws_route53_record" "book" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "book.trimio.com"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain
    zone_id                = var.cloudfront_zone_id
    evaluate_target_health = false
  }
}

# CDN subdomain
resource "aws_route53_record" "cdn" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "cdn.trimio.com"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain
    zone_id                = var.cloudfront_zone_id
    evaluate_target_health = false
  }
}
```

---

## 7. Backup & Disaster Recovery

### RDS Automated Backups

```hcl
# Backup configuration in RDS module
backup_retention_period = 7          # Keep backups for 7 days
backup_window           = "03:00-04:00"  # Backup window (UTC)

# Enable automated snapshots
copy_tags_to_snapshot = true
```

### Manual Snapshot Script

```bash
#!/bin/bash
# scripts/backup-rds.sh

ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DB_IDENTIFIER="trimio-${ENVIRONMENT}"
SNAPSHOT_ID="${DB_IDENTIFIER}-manual-${TIMESTAMP}"

echo "Creating snapshot: ${SNAPSHOT_ID}"

aws rds create-db-snapshot \
  --db-instance-identifier "${DB_IDENTIFIER}" \
  --db-snapshot-identifier "${SNAPSHOT_ID}" \
  --tags Key=Type,Value=manual Key=Environment,Value=${ENVIRONMENT}

echo "Waiting for snapshot to complete..."
aws rds wait db-snapshot-available \
  --db-snapshot-identifier "${SNAPSHOT_ID}"

echo "Snapshot ${SNAPSHOT_ID} completed successfully"
```

### S3 Cross-Region Replication

```hcl
# Enable versioning and replication
resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_replication_configuration" "main" {
  count  = var.environment == "production" ? 1 : 0
  bucket = aws_s3_bucket.main.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.replica.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

### Disaster Recovery Runbook

```markdown
# Disaster Recovery Runbook

## RTO: 4 hours | RPO: 1 hour

### Database Recovery

1. Identify latest snapshot:
   ```bash
   aws rds describe-db-snapshots \
     --db-instance-identifier trimio-production \
     --query 'DBSnapshots | sort_by(@, &SnapshotCreateTime) | [-1]'
   ```

2. Restore from snapshot:
   ```bash
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier trimio-production-restored \
     --db-snapshot-identifier <snapshot-id> \
     --db-instance-class db.t3.small \
     --vpc-security-group-ids <security-group-id> \
     --db-subnet-group-name trimio-production
   ```

3. Update DNS/secrets to point to new instance

### Redis Recovery

1. Redis is ephemeral - restart ECS service to reconnect
2. Cache will rebuild automatically

### Application Recovery

1. Verify ECS services are healthy
2. Force new deployment if needed:
   ```bash
   aws ecs update-service \
     --cluster trimio-production \
     --service api \
     --force-new-deployment
   ```
```

---

## 8. Monitoring & Alerts

### CloudWatch Alarms

```hcl
# API High CPU
resource "aws_cloudwatch_metric_alarm" "api_cpu_high" {
  alarm_name          = "trimio-${var.environment}-api-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "API CPU utilization is too high"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.api.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# RDS High CPU
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "trimio-${var.environment}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization is too high"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# RDS Low Storage
resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "trimio-${var.environment}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5000000000  # 5GB
  alarm_description   = "RDS free storage is below 5GB"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# API 5XX Errors
resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "trimio-${var.environment}-api-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API returning too many 5XX errors"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.api.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

### SNS Alert Topic

```hcl
resource "aws_sns_topic" "alerts" {
  name = "trimio-${var.environment}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
```
