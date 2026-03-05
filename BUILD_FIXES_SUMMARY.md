# Build Fixes Summary

## Issues Fixed

### 1. ioredis Version Conflict ✅

**Problem**: BullMQ 5.70.1 requires ioredis 5.10.0, but the API package had ioredis ^5.3.2, causing TypeScript type conflicts.

**Solution**:
- Updated `apps/api/package.json` to use `ioredis: ^5.10.0`
- Added pnpm override in root `package.json` to force all packages to use ioredis 5.10.0:
  ```json
  "pnpm": {
    "overrides": {
      "@swc/helpers": "^0.5.17",
      "ioredis": "^5.10.0"
    }
  }
  ```

### 2. Missing @salon-ops/shared Module ✅

**Problem**: The shared package wasn't being built before the API package tried to import from it.

**Solution**:
- The turbo.json already had proper dependency configuration with `"dependsOn": ["^build"]`
- Ran `pnpm install` to ensure all dependencies are properly linked
- The shared package builds successfully and exports all required types and constants

### 3. Web App Linting Issues (Warnings Only)

**Problem**: Several unused imports in the web app causing linting errors.

**Solution Fixed**:
- Removed unused `SheetDescription` import from `list-filters-sheet.tsx`
- Removed unused `Clock` import from `droppable-slot.tsx`
- Removed unused `Tag` and `cn` imports from `customer-info-popover.tsx`

**Remaining**: The web app has many linting warnings (not errors) related to:
- `@typescript-eslint/no-explicit-any` warnings
- `react-hooks/exhaustive-deps` warnings
- These are warnings and don't block the build, but should be addressed in future iterations

## Build Status

### ✅ API Build: SUCCESS
```bash
pnpm --filter @salon-ops/api build
# Exit Code: 0
```

### ✅ Shared Package Build: SUCCESS
```bash
pnpm --filter @salon-ops/shared build
# Exit Code: 0
```

### ⚠️ Web Build: SLOW (Linting Warnings)
The web build works but takes a long time due to linting. The warnings don't block deployment.

## Files Modified

1. `apps/api/package.json` - Updated ioredis version
2. `package.json` - Added ioredis override
3. `apps/web/src/app/(protected)/appointments/components/list-filters-sheet.tsx` - Removed unused import
4. `apps/web/src/components/ux/calendar/droppable-slot.tsx` - Removed unused import
5. `apps/web/src/components/ux/customer-info-popover.tsx` - Removed unused imports

## Railway Deployment

The build should now succeed on Railway. The key fixes were:
1. ioredis version alignment
2. Proper dependency resolution for @salon-ops/shared

### 4. Checkout Panel panelId Error ✅

**Problem**: TypeScript build error - `panelId` referenced in dependency array but not defined in component scope.

**Solution**:
- Removed undefined `panelId` from the `useCallback` dependency array in `checkout-panel.tsx`
- The variable was a leftover from refactoring

### 5. Next.js Standalone Build Symlink Error (Windows) ✅

**Problem**: Windows permission error when Next.js tries to create symlinks for standalone build output.

**Solution**:
- Removed `output: 'standalone'` from `apps/web/next.config.js`
- Standalone mode isn't required for Railway deployment
- This eliminates the EPERM symlink errors on Windows

### 6. Railway Build - Missing @salon-ops/shared Dependency ✅

**Problem**: Railway build fails because API can't find `@salon-ops/shared` module during TypeScript compilation.

**Root Cause**: Railway's auto-detected build command (`pnpm --filter @salon-ops/api build`) only builds the API package, skipping the shared package dependency.

**Solution**:
- Created `nixpacks.toml` to override Railway's build configuration
- Changed build command to use Turbo: `pnpm turbo run build --filter=@salon-ops/api...`
- The `...` suffix tells Turbo to build all dependencies (including `@salon-ops/shared`) before building the API

## Next Steps

1. Push changes to Railway and verify the build succeeds
2. Address the remaining linting warnings in the web app (optional)
3. Test the deployed application
