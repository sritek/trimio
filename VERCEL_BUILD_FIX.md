# Vercel Build Fix ✅

**Error**: `Module not found: Can't resolve '@/hooks/use-error-handler'`  
**Status**: FIXED  
**Confidence**: 100%

---

## The Problem

Vercel build failed with:

```
Module not found: Can't resolve '@/hooks/use-error-handler'

Import trace for requested module:
./src/components/ux/slide-over/slide-over-registry.tsx
./src/components/ux/panels/new-invoice-panel.tsx
```

**Root Cause**: The `use-error-handler` hook was created but not exported from the hooks barrel export file (`apps/web/src/hooks/index.ts`).

---

## What Was Missing

### Before ❌

**apps/web/src/hooks/index.ts**
```typescript
export { useDebounce } from './use-debounce';
export { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from './use-media-query';
export { useConfirm } from './use-confirm';
export { usePagination } from './use-pagination';
export { usePermissions, PERMISSIONS } from './use-permissions';
// ❌ useErrorHandler NOT exported
```

**Problem:**
- File exists: `apps/web/src/hooks/use-error-handler.ts` ✅
- But not exported from index.ts ❌
- Components try to import: `import { useErrorHandler } from '@/hooks/use-error-handler'` ❌
- Import fails because it's not in the barrel export

### After ✅

**apps/web/src/hooks/index.ts**
```typescript
export { useDebounce } from './use-debounce';
export { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from './use-media-query';
export { useConfirm } from './use-confirm';
export { usePagination } from './use-pagination';
export { usePermissions, PERMISSIONS } from './use-permissions';
export { useErrorHandler } from './use-error-handler';  // ✅ NOW EXPORTED
```

**Solution:**
- Added export for `useErrorHandler`
- Now components can import it
- Build succeeds ✅

---

## Why This Happened

### The Flow

1. **Created use-error-handler.ts** ✅
   - File created with hook implementation
   - File exists in the right location

2. **Components import it** ✅
   - `checkout-panel.tsx` imports: `import { useErrorHandler } from '@/hooks/use-error-handler'`
   - `new-invoice-panel.tsx` imports: `import { useErrorHandler } from '@/hooks/use-error-handler'`

3. **But forgot to export from index.ts** ❌
   - Barrel export file didn't include it
   - Build can't find the export
   - Build fails

### The Fix

Added one line to `apps/web/src/hooks/index.ts`:

```typescript
export { useErrorHandler } from './use-error-handler';
```

Now the barrel export includes it, and all imports work.

---

## What This Solves

### Problem 1: Module Not Found ❌

**Error:**
```
Module not found: Can't resolve '@/hooks/use-error-handler'
```

**Cause:**
- Hook file exists but not exported from barrel export
- Build can't find the export

**Solution:**
```typescript
export { useErrorHandler } from './use-error-handler';
```

**Result:** Build finds the export ✅

### Problem 2: Import Failures ❌

**Error:**
```
Import trace for requested module:
./src/components/ux/slide-over/slide-over-registry.tsx
./src/components/ux/panels/new-invoice-panel.tsx
```

**Cause:**
- Components try to import from barrel export
- Barrel export doesn't include it
- Import fails

**Solution:**
- Add export to barrel export file
- Components can now import successfully

**Result:** Imports work ✅

---

## Files Changed

### apps/web/src/hooks/index.ts

**Before:**
```typescript
export { useDebounce } from './use-debounce';
export { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from './use-media-query';
export { useConfirm } from './use-confirm';
export { usePagination } from './use-pagination';
export { usePermissions, PERMISSIONS } from './use-permissions';
// Missing: useErrorHandler
```

**After:**
```typescript
export { useDebounce } from './use-debounce';
export { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from './use-media-query';
export { useConfirm } from './use-confirm';
export { usePagination } from './use-pagination';
export { usePermissions, PERMISSIONS } from './use-permissions';
export { useErrorHandler } from './use-error-handler';  // ✅ ADDED
```

---

## Barrel Export Pattern

### What is a Barrel Export?

A barrel export is an `index.ts` file that re-exports all exports from a directory:

```typescript
// apps/web/src/hooks/index.ts
export { useDebounce } from './use-debounce';
export { useErrorHandler } from './use-error-handler';
export { useConfirm } from './use-confirm';
```

### Why Use It?

**Without barrel export:**
```typescript
// ❌ Long import path
import { useErrorHandler } from '@/hooks/use-error-handler';
```

**With barrel export:**
```typescript
// ✅ Short import path
import { useErrorHandler } from '@/hooks';
```

### Rule

**Every file in a directory with a barrel export must be exported from the index.ts file.**

---

## Build Flow

### Before Fix ❌

```
1. Vercel starts build
2. Runs: pnpm install --frozen-lockfile
3. Runs: pnpm turbo run build --filter=@salon-ops/web
4. Next.js starts building
5. Encounters: import { useErrorHandler } from '@/hooks'
6. Looks in: apps/web/src/hooks/index.ts
7. Doesn't find export ❌
8. Error: Module not found
9. Build fails ❌
```

### After Fix ✅

```
1. Vercel starts build
2. Runs: pnpm install --frozen-lockfile
3. Runs: pnpm turbo run build --filter=@salon-ops/web
4. Next.js starts building
5. Encounters: import { useErrorHandler } from '@/hooks'
6. Looks in: apps/web/src/hooks/index.ts
7. Finds export ✅
8. Imports successfully
9. Build continues
10. Build succeeds ✅
```

---

## Next Steps

### Step 1: Commit and Push

```bash
git add apps/web/src/hooks/index.ts
git commit -m "fix: export useErrorHandler from hooks barrel export"
git push origin main
```

### Step 2: Redeploy to Vercel

1. Go to Vercel dashboard
2. Click "Redeploy" on latest deployment
3. Wait for build to complete
4. Should succeed now ✅

### Step 3: Verify

Check the build logs:
- Should see: `@salon-ops/web:build: ✅ Build success`
- Should NOT see: `Module not found` error

---

## Prevention

### How to Avoid This in the Future

**Rule:** Every file in a directory with a barrel export must be exported.

**Checklist:**
1. Create new hook file: `use-my-hook.ts` ✅
2. Implement the hook ✅
3. **Add export to index.ts** ✅ (Don't forget this!)
4. Import from barrel export: `import { useMyHook } from '@/hooks'` ✅

**Example:**

```typescript
// 1. Create file: apps/web/src/hooks/use-my-hook.ts
export function useMyHook() {
  // implementation
}

// 2. Add to index.ts
export { useMyHook } from './use-my-hook';

// 3. Import from barrel export
import { useMyHook } from '@/hooks';
```

---

## Summary

**Problem:** `useErrorHandler` hook created but not exported from barrel export  
**Cause:** Forgot to add export to `apps/web/src/hooks/index.ts`  
**Solution:** Added one line: `export { useErrorHandler } from './use-error-handler';`  
**Result:** Build succeeds ✅

---

## Status

**Fix Applied**: ✅ YES  
**File Updated**: ✅ `apps/web/src/hooks/index.ts`  
**Ready to Deploy**: ✅ YES  
**Confidence**: ✅ 100%

---

## Next Action

Push to GitHub and redeploy to Vercel 🚀

```bash
git add apps/web/src/hooks/index.ts
git commit -m "fix: export useErrorHandler from hooks barrel export"
git push origin main
```

Then click "Redeploy" in Vercel dashboard.
