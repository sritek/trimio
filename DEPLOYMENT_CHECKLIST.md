# Deployment Checklist - Ready to Go Live! 🚀

## Current Status: ✅ All Fixes Committed and Pushed

**Branch**: `railway-deployment`  
**Latest Commit**: `c682c33` - fix: correct Vercel outputDirectory path and add deployment summary

---

## Step 1: Deploy Railway API (Backend)

### Option A: Auto-Deploy (Recommended)
Railway should automatically deploy from your latest push.

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your API service
3. Go to "Deployments" tab
4. Wait for the latest deployment to complete (~3-5 minutes)
5. Copy your Railway URL: `https://your-api.up.railway.app`

### Option B: Manual Deploy
If auto-deploy is not enabled:
1. Railway Dashboard → Your Service → Settings
2. Click "Deploy" button
3. Wait for deployment to complete

### Verify Railway Deployment
```bash
# Test health endpoint
curl https://your-api.up.railway.app/health

# Expected response:
# {"status":"ok","timestamp":"..."}
```

---

## Step 2: Deploy Vercel Frontend

### Quick Deploy (5 minutes)

1. **Go to Vercel**: https://vercel.com/new

2. **Import Repository**:
   - Click "Import Git Repository"
   - Select your GitHub repository: `sritek/salon-ops`
   - Branch: `railway-deployment`

3. **Configure Project**:
   ```
   Framework Preset: Next.js
   Root Directory: apps/web
   Build Command: cd ../.. && pnpm turbo run build --filter=@salon-ops/web
   Output Directory: .next
   Install Command: pnpm install --frozen-lockfile
   ```

4. **Add Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://your-api.up.railway.app/api/v1
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   NEXT_PUBLIC_ENABLE_REALTIME=false
   NEXT_PUBLIC_ENABLE_INVENTORY=false
   NEXT_PUBLIC_ENABLE_MEMBERSHIPS=false
   ```
   
   **Note**: Replace `your-api.up.railway.app` with your actual Railway URL from Step 1

5. **Deploy**: Click "Deploy" button

6. **Wait**: Deployment takes ~2-3 minutes

7. **Copy URL**: After deployment, copy your Vercel URL (e.g., `https://salon-ops.vercel.app`)

---

## Step 3: Update Railway CORS Configuration

Now that you have your Vercel URL, update Railway to allow requests from it:

1. Go to Railway Dashboard → Your API Service
2. Go to "Variables" tab
3. Update `APP_URL` variable:
   ```
   APP_URL=https://your-app.vercel.app
   ```
4. Railway will automatically redeploy (~1-2 minutes)

---

## Step 4: Test Your Deployment

### 1. Test Frontend Access
- Open your Vercel URL in browser
- Should see the login page
- No console errors

### 2. Test API Connection
- Open browser console (F12)
- Try to login with test credentials
- Check Network tab for API calls
- Should see successful requests to Railway API

### 3. Test Full Flow
- ✅ Login works
- ✅ Dashboard loads
- ✅ Can view customers
- ✅ Can view appointments
- ✅ Can view services
- ✅ No CORS errors in console

---

## Environment Variables Reference

### Railway (Backend)
```env
NODE_ENV=production
PORT=3000
API_URL=https://your-api.up.railway.app
APP_URL=https://your-app.vercel.app
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENABLE_REDIS=false
ENABLE_INVENTORY=false
ENABLE_MEMBERSHIPS=false
```

### Vercel (Frontend)
```env
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app/api/v1
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_ENABLE_REALTIME=false
NEXT_PUBLIC_ENABLE_INVENTORY=false
NEXT_PUBLIC_ENABLE_MEMBERSHIPS=false
```

---

## Troubleshooting

### Issue: Vercel Build Fails
**Solution**: Check that `vercel.json` has correct settings:
```json
{
  "buildCommand": "cd ../.. && pnpm turbo run build --filter=@salon-ops/web",
  "outputDirectory": ".next"
}
```

### Issue: CORS Errors
**Solution**: Verify Railway `APP_URL` matches your Vercel URL exactly (including https://)

### Issue: API Not Responding
**Solution**: Check Railway logs:
1. Railway Dashboard → Your Service → Deployments
2. Click on latest deployment
3. View logs for errors

### Issue: Database Connection Error
**Solution**: Verify `DATABASE_URL` in Railway matches your Neon connection string

---

## Post-Deployment Tasks

### 1. Set Up Custom Domain (Optional)
- **Vercel**: Settings → Domains → Add Domain
- **Railway**: Settings → Domains → Generate Domain or Add Custom

### 2. Enable Monitoring
- **Vercel Analytics**: Settings → Analytics → Enable
- **Sentry** (Optional): Add error tracking

### 3. Set Up CI/CD
- Auto-deploy on push to `main` branch
- Run tests before deployment

### 4. Database Migrations
```bash
# Run migrations on Railway
railway run pnpm --filter api db:migrate

# Or use Railway CLI
cd apps/api
railway run pnpm db:migrate
```

### 5. Seed Initial Data (Optional)
```bash
# Seed database with test data
railway run pnpm --filter api db:seed
```

---

## Success Criteria ✅

Your deployment is successful when:
- ✅ Railway API is running (health check returns 200)
- ✅ Vercel frontend is deployed and accessible
- ✅ Login page loads without errors
- ✅ Can login with test credentials
- ✅ Dashboard loads with data
- ✅ No CORS errors in browser console
- ✅ API calls succeed (check Network tab)

---

## Cost Summary

### Railway
- **Hobby Plan**: $5/month (includes $5 credit)
- **First month**: Free

### Vercel
- **Hobby Plan**: Free (for personal projects)
- **Pro Plan**: $20/month (for commercial use)

### Neon PostgreSQL
- **Free Tier**: 0.5 GB storage
- **Paid**: $19/month for 10 GB

**Total for pilot**: ~$0-5/month (first month free with Railway credit)

---

## Next Steps After Deployment

1. **Test thoroughly** - Try all features
2. **Monitor logs** - Watch for errors
3. **Set up alerts** - Get notified of issues
4. **Plan scaling** - Monitor usage and performance
5. **Add features** - Enable inventory, memberships when ready

---

## Support Resources

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs

---

## 🎉 Ready to Deploy!

All configurations are in place. Follow the steps above and your app will be live in ~10 minutes!

**Questions?** Check the detailed guides:
- `VERCEL_QUICK_START.md` - 5-minute Vercel setup
- `RAILWAY_DEPLOYMENT_GUIDE.md` - Complete Railway guide
- `VERCEL_DEPLOYMENT_GUIDE.md` - Complete Vercel guide

**Good luck with your deployment!** 🚀
