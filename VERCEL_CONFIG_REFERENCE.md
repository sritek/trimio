# Vercel Configuration Reference Card

## Quick Copy-Paste Settings for Vercel Dashboard

### Project Settings

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Root Directory** | `apps/web` |
| **Build Command** | `cd ../.. && pnpm turbo run build --filter=@salon-ops/web` |
| **Output Directory** | `.next` |
| **Install Command** | `pnpm install --frozen-lockfile` |
| **Node.js Version** | 22.x |

---

## Environment Variables

### Required Variables

Copy and paste these into Vercel's Environment Variables section:

```env
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app/api/v1
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_ENABLE_REALTIME=false
NEXT_PUBLIC_ENABLE_INVENTORY=false
NEXT_PUBLIC_ENABLE_MEMBERSHIPS=false
```

**Important**: 
- Replace `your-api.up.railway.app` with your actual Railway API URL
- Replace `your-app.vercel.app` with your Vercel URL (you'll get this after first deployment)
- After first deployment, update `NEXT_PUBLIC_APP_URL` with the actual Vercel URL and redeploy

---

## Step-by-Step Vercel Setup

### 1. Import Project
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select `sritek/salon-ops`
4. Branch: `railway-deployment`

### 2. Configure Build Settings
In the "Configure Project" screen:

**Framework Preset**: Select "Next.js" from dropdown

**Root Directory**: 
- Click "Edit" next to Root Directory
- Enter: `apps/web`
- Click "Continue"

**Build & Development Settings**:
- Click "Override" for Build Command
- Enter: `cd ../.. && pnpm turbo run build --filter=@salon-ops/web`
- Click "Override" for Output Directory
- Enter: `.next`
- Click "Override" for Install Command
- Enter: `pnpm install --frozen-lockfile`

### 3. Add Environment Variables
Click "Environment Variables" section:

For each variable, click "Add" and enter:

**Variable 1**:
- Key: `NEXT_PUBLIC_API_URL`
- Value: `https://your-api.up.railway.app/api/v1`
- Environment: Production, Preview, Development (all checked)

**Variable 2**:
- Key: `NEXT_PUBLIC_APP_URL`
- Value: `https://your-app.vercel.app`
- Environment: Production, Preview, Development (all checked)

**Variable 3**:
- Key: `NEXT_PUBLIC_ENABLE_REALTIME`
- Value: `false`
- Environment: Production, Preview, Development (all checked)

**Variable 4**:
- Key: `NEXT_PUBLIC_ENABLE_INVENTORY`
- Value: `false`
- Environment: Production, Preview, Development (all checked)

**Variable 5**:
- Key: `NEXT_PUBLIC_ENABLE_MEMBERSHIPS`
- Value: `false`
- Environment: Production, Preview, Development (all checked)

### 4. Deploy
- Click "Deploy" button
- Wait 2-3 minutes for build to complete
- Copy your Vercel URL from the success screen

### 5. Update Environment Variable
After first deployment:
1. Go to Project Settings → Environment Variables
2. Edit `NEXT_PUBLIC_APP_URL`
3. Replace `your-app.vercel.app` with your actual Vercel URL
4. Save and redeploy

---

## Vercel.json Configuration

The `vercel.json` file in your repository root contains:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd ../.. && pnpm turbo run build --filter=@salon-ops/web",
  "devCommand": "cd apps/web && pnpm dev",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

This file is automatically detected by Vercel and provides default settings. You can override these in the Vercel dashboard if needed.

---

## Troubleshooting

### Build Command Not Working?
Make sure you're using the exact command:
```bash
cd ../.. && pnpm turbo run build --filter=@salon-ops/web
```

The `cd ../..` is crucial because Vercel sets the working directory to `apps/web`, but we need to run turbo from the repository root.

### Output Directory Error?
Ensure Output Directory is set to `.next` (relative to Root Directory `apps/web`)

**Not**: `apps/web/.next` ❌  
**Correct**: `.next` ✅

### Environment Variables Not Working?
- Check that all variables start with `NEXT_PUBLIC_` (required for client-side access)
- Verify Railway URL is correct and includes `/api/v1` suffix
- Make sure all environments are checked (Production, Preview, Development)

### Build Succeeds but App Doesn't Work?
- Check browser console for errors
- Verify `NEXT_PUBLIC_API_URL` points to correct Railway URL
- Test Railway API health endpoint: `https://your-api.up.railway.app/health`
- Check for CORS errors (update Railway `APP_URL` to match Vercel URL)

---

## Post-Deployment Checklist

After successful deployment:

- [ ] Vercel URL is accessible
- [ ] Login page loads without errors
- [ ] Browser console shows no errors
- [ ] Update Railway `APP_URL` to Vercel URL
- [ ] Test login functionality
- [ ] Test API calls (check Network tab)
- [ ] Verify no CORS errors
- [ ] Update `NEXT_PUBLIC_APP_URL` in Vercel to actual URL
- [ ] Redeploy Vercel after updating URL

---

## Useful Vercel Commands

### Vercel CLI (Optional)
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from command line
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls
```

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support
- **Community**: https://github.com/vercel/vercel/discussions

---

## Summary

✅ **vercel.json** is configured correctly  
✅ **Build command** builds from monorepo root  
✅ **Output directory** is relative to root directory  
✅ **Environment variables** are documented  
✅ **Ready to deploy!**

Just follow the step-by-step guide above and you'll be live in ~5 minutes! 🚀
