# Halcyon RCM Partner Assistant - Deployment Notes

## Overview

This document summarizes the deployment work completed on February 2, 2026, including fixes, configurations, and next steps for testing.

---

## Deployment Architecture

| Component | Platform | URL |
|-----------|----------|-----|
| **API (Backend)** | Railway | `https://web-production-51dc9.up.railway.app` |
| **Web (Frontend)** | Vercel | `https://halcyon-rcm-assistant.vercel.app` |
| **Database** | Railway (PostgreSQL) | Internal: `postgres.railway.internal:5432` |

### GitHub Repository
- **Repo:** `https://github.com/lawguy21/Halcyon-RCM-Partner-Assistant`
- **Branch:** `master`
- **Auto-deploy:** Both Railway and Vercel are connected to GitHub for automatic deployments on push

---

## Admin Accounts

| Email | Name | Role | Status |
|-------|------|------|--------|
| `freddie@effingerlaw.com` | Freddie Effinger | SUPER_ADMIN | Active |
| `naomi@effingerlaw.com` | Naomi Effinger | SUPER_ADMIN | Active |

*Passwords are configured in `packages/api/scripts/setup-admin-user.js`*

---

## Fixes Completed (Feb 2, 2026)

### 1. ESM/CommonJS Module Compatibility
- Added `"type": "module"` to `packages/core/package.json`
- Added submodule exports for `/claims`, `/transparency`, `/analytics`
- Fixed import paths in API services to use submodule imports

### 2. Eligibility Controller Fixes
- Fixed `MAGICalculatorInput` structure (stateCode in household object)
- Fixed `PresumptiveEligibilityInput` properties
- Fixed `RetroactiveCoverageInput` properties
- Fixed `MedicareAgeInput` properties (hasESRD, ssdiStatus enum)
- Fixed `DualEligibleInput` properties (MedicarePartStatus, MedicaidStatus enums)

### 3. Frontend Fixes
- Fixed `useAuth` hook: Changed HTTP method for change-password from POST to PUT
- Fixed `useAssessments` hook: Corrected query parameters (pathway→primaryRecoveryPath, page→offset)
- Fixed `AssessmentCard` routing: Changed from `/assessments/[id]` to `/assessments/detail?id=[id]`
- Added `credentials: 'include'` to fetch calls for proper authentication

### 4. Middleware Fixes
- Added deployment platform patterns to `DEFAULT_DOMAIN_PATTERNS` (.vercel.app, .railway.app, etc.)
- Eliminates "No tenant found" warnings on standard deployment domains

### 5. Demo Data Toggle Feature
- Added `isDemoData` Boolean field to 28 business data models
- Added `showDemoData` preference to User model
- Created user preferences API endpoint (`/api/user/preferences`)
- Added "Data Display" settings tab with toggle switch
- Demo data can be toggled on/off per user

### 6. White-Label Configuration
- Fixed API URL in branding page (was calling Next.js instead of Express)
- Added `NEXT_PUBLIC_API_URL` environment variable support

### 7. Admin User Auto-Setup
- Created `setup-admin-user.js` script that runs on deployment
- Automatically creates/updates admin users with SUPER_ADMIN role
- Configures organization, white-label settings, and all permissions

---

## Environment Variables

### Vercel (Frontend)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://web-production-51dc9.up.railway.app` |
| `NEXTAUTH_SECRET` | `[your-secret-key]` |
| `NEXTAUTH_URL` | `https://halcyon-rcm-assistant.vercel.app` |

### Railway (Backend)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (auto-configured) |
| `JWT_SECRET` | JWT signing secret |
| `NODE_ENV` | `production` |
| `PORT` | `3001` (or Railway-assigned) |

---

## Features Status

### Working ✅
- [x] **Eligibility Calculator** - MAGI, Presumptive, Retroactive, Medicare Age, Dual Eligible
- [x] **User Authentication** - Login, logout, session management
- [x] **Admin User Setup** - Auto-configured on deployment
- [x] **Demo Data Toggle** - Settings → Data Display
- [x] **White-Label Branding** - Settings → Branding (for admins)

### Needs Testing 🧪
- [ ] **Assessments** - Create, view, list, export
- [ ] **Batch Import** - CSV upload and processing
- [ ] **Denials Management** - Denial analysis and appeals
- [ ] **Compliance** - 501(r) compliance tracking
- [ ] **Work Queue** - Task management
- [ ] **Collections** - Collection workflow management
- [ ] **Payments** - ERA 835 processing
- [ ] **Claims Submission** - X12 837 generation
- [ ] **Price Transparency** - Good Faith Estimates, MRF generation
- [ ] **Productivity** - Staff productivity tracking
- [ ] **Reports** - Analytics and reporting

---

## Testing Checklist

### Assessment Module
1. Navigate to Assessments → New Assessment
2. Fill out all required fields:
   - Patient Information (name, account number)
   - Encounter Details (date of service, encounter type, charges)
   - Location (state of residence, state of service)
   - Insurance Status
   - Income/Household Information
3. Submit and verify assessment is created
4. View assessment details
5. Export assessment to CSV

### Batch Import
1. Navigate to Batch Import
2. Upload a test CSV file with patient data
3. Map columns to fields
4. Process import
5. Verify assessments are created

### Eligibility Calculator
1. Navigate to Eligibility
2. Test MAGI calculation with sample data
3. Test Presumptive Eligibility screening
4. Verify results display correctly

### Demo Data Toggle
1. Go to Settings → Data Display
2. Toggle "Show Demo Data" off
3. Verify demo data is hidden from lists
4. Toggle back on and verify demo data appears

---

## Utility Scripts

Located in `packages/api/scripts/`:

| Script | Command | Description |
|--------|---------|-------------|
| `setup-admin-user.js` | Runs on deploy | Sets up admin accounts automatically |
| `grant-super-admin.js` | `npm run grant-admin <email>` | Grant admin access to a user |
| `set-password.js` | `npm run set-password <email> <password>` | Set user password |
| `clear-data.js` | `npm run db:clear` | Clear test data (preserves users) |

---

## Troubleshooting

### Login Issues
1. Check Vercel environment variables are set correctly
2. Verify Railway is running and healthy (`/health` endpoint)
3. Check browser console for CORS or network errors

### API 404 Errors
1. Verify `NEXT_PUBLIC_API_URL` points to Railway URL
2. Check Railway deployment logs for errors
3. Ensure database is connected

### Database Connection Issues
1. Check Railway PostgreSQL service is running
2. Verify `DATABASE_URL` is set in Railway
3. Run `npx prisma db push` if schema is out of sync

### "No tenant found" Warnings
- These are informational only and don't affect functionality
- Occur when accessing from non-configured domains
- Fixed to not appear for standard deployment platform domains

---

## Next Steps

1. **Complete Feature Testing** - Work through testing checklist above
2. **Add Real Data** - Import actual patient data for testing
3. **Configure SFTP** (optional) - Set up SFTP connections for automated imports
4. **Set Up Custom Domain** (optional) - Configure custom domain in Vercel/Railway
5. **Enable AI Features** (optional) - Add API keys for AI-powered features:
   - `ANTHROPIC_API_KEY` for Claude
   - `OPENAI_API_KEY` for GPT
   - `GOOGLE_AI_API_KEY` for Gemini

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/lawguy21/Halcyon-RCM-Partner-Assistant/issues
- Check deployment logs in Railway/Vercel dashboards

---

*Last updated: February 2, 2026*
