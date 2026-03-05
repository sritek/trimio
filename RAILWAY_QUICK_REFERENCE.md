# Railway Deployment - Quick Reference Card

One-page reference for Railway backend deployment.

---

## 🎯 Quick Links

| Resource | URL |
|----------|-----|
| Railway Dashboard | https://railway.app/dashboard |
| Neon Dashboard | https://console.neon.tech |
| Your API Health | https://your-service.up.railway.app/health |
| Your API Docs | https://your-service.up.railway.app/docs |

---

## 📋 Required Environment Variables

Copy this to Railway → Variables → Raw Editor:

```bash
NODE_ENV=production
PORT=3000
API_URL=https://your-service.up.railway.app
APP_URL=https://your-frontend.vercel.app
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.aws.neon.tech/db?sslmode=require&connection_limit=10&pool_timeout=30
DIRECT_URL=postgresql://user:pass@ep-xxx.aws.neon.tech/db?sslmode=require
JWT_SECRET=<generate-with-pnpm-generate-jwt>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
LOG_LEVEL=info
ENABLE_REDIS=false
ENABLE_INVENTORY=false
ENABLE_MEMBERSHIPS=false
ENABLE_ONLINE_BOOKING=false
ENABLE_MARKETING=false
```

---

## 🔐 Generate JWT Secret

```bash
# Option 1: Using project
pnpm generate-jwt

# Option 2: Using OpenSSL (Mac/Linux)
openssl rand -base64 32

# Option 3: Using PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## 🗄️ Neon Database Setup

1. Go to: https://console.neon.tech
2. Create project: "salon-ops-production"
3. Region: Asia Pacific (Singapore)
4. Enable connection pooling
5. Copy TWO connection strings:
   - **DATABASE_URL:** With `-pooler` (for app)
   - **DIRECT_URL:** Without `-pooler` (for migrations)

---

## 🚂 Railway Deployment Steps

1. Go to: https://railway.app
2. New Project → Deploy from GitHub
3. Select your repository
4. Add environment variables (see above)
5. Settings → Generate Domain
6. Update `API_URL` with generated domain
7. Wait for deployment

---

## ✅ Verification Commands

```bash
# Test health endpoint
curl https://your-service.up.railway.app/health

# Expected response:
# {"status":"ok","timestamp":"...","environment":"production"}

# Test API docs (open in browser)
open https://your-service.up.railway.app/docs
```

---

## 🌱 Seed Database (Optional)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link
railway login
railway link

# Run seed
railway run pnpm --filter @salon-ops/api db:seed
```

---

## 🔧 Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Build fails | Railway → Settings → Clear Build Cache |
| DB connection timeout | Check `DATABASE_URL` has `?sslmode=require` |
| Migrations fail | Verify `DIRECT_URL` is set (without `-pooler`) |
| JWT error | Ensure `JWT_SECRET` is 32+ characters |
| CORS error | Update `APP_URL` to match frontend URL |

---

## 📊 Cost Tracking

| Phase | Cost/Month | Capacity |
|-------|------------|----------|
| MVP | $5 | 5,000 req/day |
| Growth | $5-15 | 10,000-25,000 req/day |
| Scale | $15-30 | 50,000+ req/day |

---

## 🎯 Success Checklist

- [ ] Health check returns 200 OK
- [ ] API docs accessible
- [ ] Database migrations applied
- [ ] Tables created in Neon
- [ ] No errors in logs
- [ ] Response time < 200ms

---

## 📞 Support

- **Railway:** [docs.railway.app](https://docs.railway.app) | [Discord](https://discord.gg/railway)
- **Neon:** [neon.tech/docs](https://neon.tech/docs) | [Discord](https://discord.gg/neon)

---

## 📚 Full Guides

- [Step-by-Step Guide](./RAILWAY_SETUP_STEP_BY_STEP.md) - Detailed walkthrough
- [Deployment Checklist](./RAILWAY_CHECKLIST.md) - Track your progress
- [Complete Guide](./DEPLOYMENT.md) - Full documentation

---

## 🎉 Next Steps

After Railway deployment:

1. Deploy frontend to Vercel
2. Update `APP_URL` in Railway with Vercel URL
3. Set up monitoring (UptimeRobot, Sentry)
4. Configure custom domain (optional)

---

**Deployment Time:** 15 minutes
**Cost:** $5/month
**Performance:** 80-150ms response time
**Capacity:** 5,000+ requests/day
