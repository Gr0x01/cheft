---
Last-Updated: 2025-12-03
Maintainer: RB
Status: Active Development
---

# Quickstart: Cheft

## Current Status
- **Phase**: Phase 3 - User Engagement & Community Features
- **Version**: 0.4.0
- **Environment**: Production (Live on Vercel)
- **Next Milestone**: Community contribution system + data verification UI

## Key Commands
```bash
# Development
npm run dev          # Start development server (localhost:3003)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks

# Database (Supabase)
# Set up via Supabase dashboard
# Run migrations when ready

# Testing
npm run test         # Run Jest tests
npm run test:e2e     # Run Playwright tests
```

## Active Focus
- Community contribution forms (suggest chef/restaurant)
- User verification UI (thumbs up/down for data quality)
- Chef show attribution badges (Top Chef, Iron Chef, etc.)
- Admin review workflows for user submissions

## Quick Links
- [Project Brief](./projectbrief.md)
- [Tech Stack](../architecture/techStack.md)  
- [Active Context](../development/activeContext.md)

## Environment Setup
1. ✅ Next.js project initialized
2. ✅ Supabase project setup and MCP integration
3. ✅ Environment variables configured
4. ✅ Database schema deployed with 560 restaurants
5. ✅ SEO pages live (chefs, restaurants, cities)
6. ✅ Admin panel with data management and photo uploads
7. ✅ Data enrichment complete (bios, Google Places)
8. ✅ Site deployed to Vercel production
9. ⏳ User engagement features (contributions, verification)

## Database Status
- **Restaurants**: 560 TV chef locations
- **Chefs**: 182 unique contestants/winners  
- **Coverage**: 162 cities across US
- **Data Quality**: 100% geocoded, 100% bios, 100% Google Places
- **Enrichment**: 88% chef photos, 72% restaurant photos

## Admin Panel
- **Login**: `/admin/login` (Supabase Auth with magic link)
- **Review Queue**: `/admin/review` (pending approvals)
- **Activity Log**: `/admin/activity` (audit trail)
- **Data Dashboard**: `/admin/data` (completeness metrics)
- **Manage Data**: `/admin/manage` (photo upload, re-enrichment)