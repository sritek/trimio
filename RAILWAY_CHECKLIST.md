# Railway Deployment Checklist

Use this checklist to track your Railway backend deployment progress.

---

## 🗄️ STEP 1: Neon Database Setup

- [ ] **1.1** Created Neon account at console.neon.tech
- [ ] **1.2** Created project named "salon-ops-production"
- [ ] **1.3** Selected region: Asia Pacific (Singapore)
- [ ] **1.4** Copied connection string
- [ ] **1.5** Enabled connection pooling
- [ ] **1.6** Copied POOLED connection string (with `-pooler`)
- [ ] **1.7** Copied DIRECT connection string (without `-pooler`)
- [ ] **1.8** Saved both connection strings in text file

**Connection Strings Saved:**
```
DATABASE_URL (pooled): postgresql://...@ep-xxx-pooler...
DIRECT_URL (direct):   postgresql://...@ep-xxx...
```

---

## 🚂 STEP 2: Railway Deployment

- [ ] **2.1** Created Railway account at railway.app
- [ ] **2.2** Logged in with GitHub
- [ ] **2.3** Authorized Railway to access GitHub
- [ ] **2.4** Created new project
- [ ] **2.5** Selected "Deploy from GitHub repo"
- [ ] **2.6** Selected salon-ops repository
- [ ] **2.7** Waited for initial build (will fail - expected)

---

## 🔐 STEP 3: Generate JWT Secret

Choose one method:

- [ ] **Option A:** Ran `pnpm generate-jwt` in project
- [ ] **Option B:** Ran `openssl rand -base64 32` in terminal
- [ ] **Option C:** Used PowerShell command
- [ ] **Option D:** Used online generator

**JWT Secret Generated:**
```
JWT_SECRET=_______________________________________________
```

---

## ⚙️ STEP 4: Configure Environment Variables

- [ ] **4.1** Clicked "Variables" tab in Railway
- [ ] **4.2** Clicked "RAW Editor" button
- [ ] **4.3** Pasted environment variables template
- [ ] **4.4** Replaced `DATABASE_URL` with pooled connection string
- [ ] **4.5** Replaced `DIRECT_URL` with direct connection string
- [ ] **4.6** Replaced `JWT_SECRET` with generated secret
- [ ] **4.7** Verified `DATABASE_URL` ends with `?sslmode=require&connection_limit=10&pool_timeout=30`
- [ ] **4.8** Clicked "Update Variables"
- [ ] **4.9** Waited for automatic redeploy

---

## 🌐 STEP 5: Get Railway URL

- [ ] **5.1** Went to "Settings" tab
- [ ] **5.2** Scrolled to "Domains" section
- [ ] **5.3** Clicked "Generate Domain"
- [ ] **5.4** Copied Railway URL

**Railway URL:**
```
https://_____________________________.up.railway.app
```

---

## 🔄 STEP 6: Update URLs

- [ ] **6.1** Went back to "Variables" tab
- [ ] **6.2** Clicked "RAW Editor"
- [ ] **6.3** Updated `API_URL` with Railway URL
- [ ] **6.4** Updated `APP_URL` with Railway URL (temporary)
- [ ] **6.5** Clicked "Update Variables"
- [ ] **6.6** Waited for redeploy

---

## ✅ STEP 7: Verify Deployment

- [ ] **7.1** Opened `https://your-railway-url.up.railway.app/health`
- [ ] **7.2** Saw `{"status":"ok"}` response
- [ ] **7.3** Opened `https://your-railway-url.up.railway.app/docs`
- [ ] **7.4** Saw Swagger UI with API documentation
- [ ] **7.5** Checked Railway logs for success messages
- [ ] **7.6** Verified no errors in logs

---

## 🗃️ STEP 8: Verify Database

- [ ] **8.1** Checked Railway logs for migration messages
- [ ] **8.2** Saw "All migrations applied successfully"
- [ ] **8.3** Went to Neon dashboard
- [ ] **8.4** Clicked "Tables" in sidebar
- [ ] **8.5** Verified tables exist (tenants, users, customers, etc.)

---

## 🧪 STEP 9: Test API (Optional)

- [ ] **9.1** Tested health endpoint with curl
- [ ] **9.2** Tested API docs in browser
- [ ] **9.3** Tested protected endpoint (should return 401)

---

## 🌱 STEP 10: Seed Database (Optional)

- [ ] **10.1** Installed Railway CLI: `npm i -g @railway/cli`
- [ ] **10.2** Logged in: `railway login`
- [ ] **10.3** Linked project: `railway link`
- [ ] **10.4** Ran seed: `railway run pnpm --filter @salon-ops/api db:seed`
- [ ] **10.5** Verified test data in Neon dashboard

---

## 📊 Environment Variables Checklist

Verify all these are set in Railway:

### Required Variables
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `API_URL=https://your-railway-url.up.railway.app`
- [ ] `APP_URL=https://your-railway-url.up.railway.app`
- [ ] `DATABASE_URL=postgresql://...pooler...?sslmode=require&connection_limit=10&pool_timeout=30`
- [ ] `DIRECT_URL=postgresql://...?sslmode=require`
- [ ] `JWT_SECRET=<32+ character random string>`
- [ ] `JWT_ACCESS_EXPIRY=15m`
- [ ] `JWT_REFRESH_EXPIRY=7d`
- [ ] `LOG_LEVEL=info`

### Feature Flags
- [ ] `ENABLE_REDIS=false`
- [ ] `ENABLE_INVENTORY=false`
- [ ] `ENABLE_MEMBERSHIPS=false`
- [ ] `ENABLE_ONLINE_BOOKING=false`
- [ ] `ENABLE_MARKETING=false`

---

## 🎯 Success Criteria

Your deployment is successful when ALL of these are true:

- [ ] ✅ Health check returns `{"status":"ok"}`
- [ ] ✅ API docs accessible at `/docs`
- [ ] ✅ Railway logs show "Server running"
- [ ] ✅ Railway logs show "Migrations applied"
- [ ] ✅ Neon dashboard shows tables created
- [ ] ✅ No errors in Railway logs
- [ ] ✅ Railway URL is accessible
- [ ] ✅ Response time < 200ms

---

## 🚨 Troubleshooting Checklist

If something doesn't work, check these:

### Build Fails
- [ ] `nixpacks.toml` exists in repo root
- [ ] `railway.json` exists in repo root
- [ ] Code is pushed to GitHub
- [ ] Cleared Railway build cache

### Database Connection Fails
- [ ] `DATABASE_URL` includes `?sslmode=require`
- [ ] Using POOLED connection string (with `-pooler`)
- [ ] Connection pooling enabled in Neon
- [ ] Neon database is running

### Migrations Fail
- [ ] `DIRECT_URL` is set (without `-pooler`)
- [ ] Migration files exist in `apps/api/prisma/migrations/`
- [ ] `nixpacks.toml` includes migration command

### JWT Errors
- [ ] `JWT_SECRET` is at least 32 characters
- [ ] `JWT_SECRET` is set in Railway variables
- [ ] No spaces or special characters causing issues

---

## 📝 Post-Deployment Tasks

After successful deployment:

- [ ] Saved Railway URL in documentation
- [ ] Saved environment variables in secure location
- [ ] Documented deployment date
- [ ] Set up billing alert in Railway
- [ ] Ready to deploy frontend

---

## 🎉 Deployment Complete!

When all checkboxes above are checked, your backend is successfully deployed!

**Your API:** `https://_____________________________.up.railway.app`

**Cost:** $5/month

**Next Step:** Deploy frontend to Vercel

---

## 📞 Quick Links

- **Railway Dashboard:** https://railway.app/dashboard
- **Neon Dashboard:** https://console.neon.tech
- **Your API Health:** https://your-url.up.railway.app/health
- **Your API Docs:** https://your-url.up.railway.app/docs

---

## 📚 Related Guides

- [Step-by-Step Guide](./RAILWAY_SETUP_STEP_BY_STEP.md) - Detailed instructions
- [Vercel Deployment](./VERCEL_DEPLOYMENT.md) - Deploy frontend next
- [Complete Guide](./DEPLOYMENT.md) - Full deployment documentation
