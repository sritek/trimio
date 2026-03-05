# Railway Backend Setup - Step by Step Guide

Complete walkthrough to deploy your Fastify API backend on Railway.

---

## 📋 Before You Start

### What You Need:
1. ✅ GitHub account with your code pushed
2. ✅ Neon database connection string (see Database Setup below)
3. ✅ 15 minutes of time

### What You'll Get:
- Live API at: `https://your-service.up.railway.app`
- Auto-deploy on git push
- Cost: $5/month

---

## STEP 1: Set Up Neon Database (5 minutes)

### 1.1 Create Neon Account

1. Go to: https://console.neon.tech
2. Click **"Sign Up"**
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

### 1.2 Create Database Project

1. After login, click **"Create a project"** button
2. Fill in details:
   - **Project name:** `salon-ops-production`
   - **Region:** Select **"Asia Pacific (Singapore)"** (closest to India)
   - **PostgreSQL version:** Leave default (16)
3. Click **"Create project"**
4. Wait 10-20 seconds for provisioning

### 1.3 Get Connection String

1. You'll see a "Connection Details" popup
2. Look for **"Connection string"** section
3. You'll see something like:
   ```
   postgresql://neondb_owner:AbCdEf123456@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Click **"Copy"** button next to it
5. **IMPORTANT:** Save this in a text file - you'll need it in Step 2

### 1.4 Enable Connection Pooling (IMPORTANT!)

1. In Neon dashboard, click **"Connection pooling"** in left sidebar
2. Toggle **"Enable connection pooling"** to ON
3. You'll see a new connection string with `-pooler` in the hostname:
   ```
   postgresql://neondb_owner:AbCdEf123456@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Copy this **POOLED** connection string
5. Save it as `DATABASE_URL` - this is what you'll use in Railway

### 1.5 Get Direct Connection String

1. Scroll down to **"Direct connection"** section
2. Copy the direct connection string (without `-pooler`)
3. Save it as `DIRECT_URL` - you'll also need this

**You should now have TWO connection strings:**
- `DATABASE_URL` (with `-pooler`) - for app connections
- `DIRECT_URL` (without `-pooler`) - for migrations

---

## STEP 2: Deploy to Railway (10 minutes)

### 2.1 Create Railway Account

1. Go to: https://railway.app
2. Click **"Login"** in top right
3. Click **"Login with GitHub"**
4. Authorize Railway to access your GitHub
5. You'll be redirected to Railway dashboard

### 2.2 Create New Project

1. Click **"New Project"** button (big purple button)
2. Select **"Deploy from GitHub repo"**
3. If first time:
   - Click **"Configure GitHub App"**
   - Select your GitHub account
   - Choose **"All repositories"** or select specific repo
   - Click **"Install & Authorize"**
4. You'll see a list of your repositories
5. Find and click on **"salon-ops"** (or your repo name)

### 2.3 Wait for Initial Build

1. Railway will automatically start building
2. You'll see build logs in real-time
3. **This will FAIL** - that's expected! We need to add environment variables
4. Don't worry, we'll fix it in the next step

### 2.4 Generate JWT Secret

Before adding environment variables, generate a secure JWT secret:

**Option 1: Using your project (recommended)**
```bash
# In your project directory:
pnpm generate-jwt
```

**Option 2: Using OpenSSL (Mac/Linux)**
```bash
openssl rand -base64 32
```

**Option 3: Using PowerShell (Windows)**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Option 4: Online Generator**
- Go to: https://generate-secret.vercel.app/32
- Click "Generate"
- Copy the secret

**Save this secret** - you'll need it in the next step.

Example output:
```
Kx7vN2mP9qR4sT6uV8wX0yZ1aB3cD5eF7gH9iJ1kL3mN5oP7qR9sT1uV3wX5yZ7
```

### 2.5 Add Environment Variables

1. In Railway dashboard, click on your service (should be selected)
2. Click **"Variables"** tab at the top
3. Click **"RAW Editor"** button (top right of variables section)
4. Delete any existing content
5. Copy and paste this template:

```bash
# Application
NODE_ENV=production
PORT=3000
API_URL=https://TEMP_URL
APP_URL=https://TEMP_URL

# Database (paste your Neon connection strings from Step 1)
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connection_limit=10&pool_timeout=30
DIRECT_URL=postgresql://neondb_owner:PASSWORD@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# JWT Secret (paste your generated secret from Step 2.4)
JWT_SECRET=YOUR_GENERATED_SECRET_HERE
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Logging
LOG_LEVEL=info

# Feature Flags
ENABLE_REDIS=false
ENABLE_INVENTORY=false
ENABLE_MEMBERSHIPS=false
ENABLE_ONLINE_BOOKING=false
ENABLE_MARKETING=false
```

6. **IMPORTANT:** Replace these values:
   - `DATABASE_URL`: Paste your **POOLED** connection string from Step 1.4
   - `DIRECT_URL`: Paste your **DIRECT** connection string from Step 1.5
   - `JWT_SECRET`: Paste your generated secret from Step 2.4
   - Leave `API_URL` and `APP_URL` as `https://TEMP_URL` for now

7. Click **"Update Variables"** button at the bottom

### 2.6 Add Connection Limit to DATABASE_URL (IMPORTANT!)

Your `DATABASE_URL` should end with these query parameters:

```
?sslmode=require&connection_limit=10&pool_timeout=30
```

**Full example:**
```
postgresql://neondb_owner:AbCdEf123456@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connection_limit=10&pool_timeout=30
```

This prevents connection pool exhaustion.

### 2.7 Trigger Redeploy

1. After saving variables, Railway will automatically redeploy
2. Go to **"Deployments"** tab
3. You'll see a new deployment starting
4. Click on it to see live logs
5. Wait 2-3 minutes for build to complete

### 2.8 Check Build Logs

Watch for these success messages:
```
✓ Prisma schema loaded
✓ Database connection successful  
✓ Migrations applied
✓ Server running on http://0.0.0.0:3000
```

If you see errors, jump to **Troubleshooting** section below.

### 2.9 Get Your Railway URL

1. Go to **"Settings"** tab
2. Scroll down to **"Domains"** section
3. Click **"Generate Domain"** button
4. Railway will generate a URL like:
   ```
   https://salon-ops-production.up.railway.app
   ```
5. **Copy this URL** - you'll need it in the next step

### 2.10 Update API_URL and APP_URL

1. Go back to **"Variables"** tab
2. Click **"RAW Editor"**
3. Update these two lines:
   ```bash
   API_URL=https://your-actual-railway-url.up.railway.app
   APP_URL=https://your-actual-railway-url.up.railway.app
   ```
   
   For now, use the same Railway URL for both. You'll update `APP_URL` later when you deploy the frontend.

4. Click **"Update Variables"**
5. Railway will redeploy automatically

### 2.11 Verify Deployment

1. Wait for redeploy to complete (1-2 minutes)
2. Open a new browser tab
3. Go to: `https://your-railway-url.up.railway.app/health`
4. You should see:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-03-05T10:30:00.000Z",
     "environment": "production",
     "features": {
       "redis": false,
       "inventory": false,
       "memberships": false
     }
   }
   ```

5. Also check API docs: `https://your-railway-url.up.railway.app/docs`
6. You should see Swagger UI

**✅ If you see the above, your backend is successfully deployed!**

---

## STEP 3: Verify Database Connection

### 3.1 Check Database Migrations

1. In Railway dashboard, go to **"Deployments"** tab
2. Click on the latest successful deployment
3. Scroll through logs and look for:
   ```
   Running migrations...
   ✓ Migration applied: 20260204111229_initial_migration
   ✓ Migration applied: 20260205065758_add_customer_management_models
   ... (more migrations)
   ✓ All migrations applied successfully
   ```

### 3.2 Verify Tables Created

1. Go back to Neon dashboard: https://console.neon.tech
2. Click on your project
3. Click **"Tables"** in left sidebar
4. You should see tables like:
   - `tenants`
   - `branches`
   - `users`
   - `customers`
   - `appointments`
   - `services`
   - etc.

**✅ If you see these tables, database is set up correctly!**

---

## STEP 4: Test Your API

### 4.1 Test Health Endpoint

```bash
curl https://your-railway-url.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-03-05T10:30:00.000Z",
  "environment": "production"
}
```

### 4.2 Test API Documentation

Open in browser:
```
https://your-railway-url.up.railway.app/docs
```

You should see Swagger UI with all your API endpoints.

### 4.3 Test a Protected Endpoint (Should Fail)

```bash
curl https://your-railway-url.up.railway.app/api/v1/customers
```

Expected response (401 Unauthorized):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No authorization header"
  }
}
```

**✅ This is correct! Protected endpoints require authentication.**

---

## STEP 5: Seed Database (Optional)

If you want to add test data:

### 5.1 Install Railway CLI

```bash
npm install -g @railway/cli
```

### 5.2 Login to Railway

```bash
railway login
```

This will open a browser window. Click "Authorize" to link your CLI.

### 5.3 Link to Your Project

```bash
# Navigate to your project directory
cd /path/to/salon-ops

# Link to Railway project
railway link
```

Select your project from the list.

### 5.4 Run Seed Command

```bash
railway run pnpm --filter @salon-ops/api db:seed
```

This will:
- Create a test tenant
- Create 2 branches
- Create 10-15 users
- Create 25-30 customers
- Create 25-30 services
- Create 50+ appointments
- etc.

**✅ Now you have test data to work with!**

---

## 📊 Complete Environment Variables Reference

Here's the complete list of variables you should have in Railway:

```bash
# ============================================
# APPLICATION
# ============================================
NODE_ENV=production
PORT=3000
API_URL=https://your-service.up.railway.app
APP_URL=https://your-frontend.vercel.app

# ============================================
# DATABASE (Neon PostgreSQL)
# ============================================
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/db?sslmode=require&connection_limit=10&pool_timeout=30
DIRECT_URL=postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/db?sslmode=require

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET=your-secure-random-string-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=info

# ============================================
# FEATURE FLAGS
# ============================================
ENABLE_REDIS=false
ENABLE_INVENTORY=false
ENABLE_MEMBERSHIPS=false
ENABLE_ONLINE_BOOKING=false
ENABLE_MARKETING=false
```

---

## 🔧 Troubleshooting

### Issue 1: Build Fails - "Cannot find module"

**Error in logs:**
```
Error: Cannot find module '@salon-ops/shared'
```

**Solution:**
1. Go to Railway → Settings
2. Scroll to "Danger Zone"
3. Click "Clear Build Cache"
4. Redeploy

### Issue 2: Database Connection Timeout

**Error in logs:**
```
Error: Connection timeout
```

**Solution:**
1. Check your `DATABASE_URL` includes `?sslmode=require`
2. Verify you're using the **POOLED** connection string (with `-pooler`)
3. Check Neon database is running (go to Neon dashboard)
4. Verify connection pooling is enabled in Neon

### Issue 3: Prisma Client Not Generated

**Error in logs:**
```
Error: @prisma/client did not initialize yet
```

**Solution:**
1. Check `nixpacks.toml` exists in your repo root
2. Verify it includes:
   ```toml
   [phases.build]
   cmds = [
     "pnpm --filter @salon-ops/api... build",
     "pnpm --filter @salon-ops/api db:generate"
   ]
   ```
3. Commit and push if missing
4. Redeploy

### Issue 4: Migrations Not Running

**Error in logs:**
```
Error: Migration failed
```

**Solution:**
1. Check `DIRECT_URL` is set correctly (without `-pooler`)
2. Verify `nixpacks.toml` start command includes:
   ```toml
   [start]
   cmd = "cd apps/api && pnpm db:migrate:prod && node dist/server.js"
   ```
3. Check migration files exist in `apps/api/prisma/migrations/`
4. Redeploy

### Issue 5: Port Binding Error

**Error in logs:**
```
Error: Port 3000 is already in use
```

**Solution:**
This shouldn't happen on Railway, but if it does:
1. Check `PORT` variable is set to `3000`
2. Verify your `server.ts` uses `env.PORT`
3. Railway automatically assigns ports, so this is usually not an issue

### Issue 6: JWT Secret Too Short

**Error in logs:**
```
Error: JWT secret must be at least 32 characters
```

**Solution:**
1. Generate a new secret: `pnpm generate-jwt`
2. Update `JWT_SECRET` in Railway variables
3. Ensure it's at least 32 characters long

### Issue 7: CORS Errors (After Frontend Deployment)

**Error in browser console:**
```
Access to fetch at 'https://api...' from origin 'https://app...' has been blocked by CORS
```

**Solution:**
1. Update `APP_URL` in Railway to match your Vercel URL
2. Redeploy Railway
3. Check `server.ts` CORS configuration allows your frontend domain

---

## 📝 Post-Deployment Checklist

After successful deployment:

- [ ] Health check returns 200 OK
- [ ] API docs accessible at `/docs`
- [ ] Database migrations applied
- [ ] Tables created in Neon
- [ ] Test data seeded (optional)
- [ ] Railway URL saved
- [ ] Environment variables documented
- [ ] Ready to deploy frontend

---

## 🎯 Next Steps

1. **Deploy Frontend to Vercel**
   - See `VERCEL_DEPLOYMENT.md`
   - Use your Railway URL as `NEXT_PUBLIC_API_URL`

2. **Update APP_URL**
   - After frontend deployment, update `APP_URL` in Railway
   - Use your Vercel URL

3. **Set Up Monitoring**
   - Add UptimeRobot for uptime monitoring
   - Add Sentry for error tracking (optional)

4. **Custom Domain** (Optional)
   - Purchase domain
   - Add to Railway settings
   - Update DNS records

---

## 💰 Cost Tracking

### Current Usage

Check your Railway usage:
1. Go to Railway dashboard
2. Click your profile (top right)
3. Click "Usage"
4. See current month's cost

### Expected Costs

- **Month 1-3:** $5/month (minimum)
- **Month 4-6:** $5-6/month (low traffic)
- **Month 7-12:** $10-15/month (growing traffic)

### Set Billing Alert

1. Go to Railway → Settings → Billing
2. Set alert at $4 (before hitting $5)
3. Get email when approaching limit

---

## 🎉 Success!

Your Fastify API backend is now live on Railway!

**Your API URL:** `https://your-service.up.railway.app`

**API Documentation:** `https://your-service.up.railway.app/docs`

**Health Check:** `https://your-service.up.railway.app/health`

**Cost:** $5/month

**Performance:** 80-150ms response time

**Capacity:** 5,000+ requests/day

**Next:** Deploy your frontend to Vercel!

---

## 📞 Need Help?

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Railway Status:** https://status.railway.app
- **Neon Docs:** https://neon.tech/docs
- **Neon Discord:** https://discord.gg/neon

---

## 📚 Related Guides

- [Vercel Frontend Deployment](./VERCEL_DEPLOYMENT.md)
- [Complete Deployment Guide](./DEPLOYMENT.md)
- [Deployment Summary](./DEPLOYMENT_SUMMARY.md)
