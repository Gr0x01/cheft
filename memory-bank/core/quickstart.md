---
Last-Updated: 2025-12-09
Maintainer: RB
Status: Phase 3 Complete - Maintenance Mode
---

# Quickstart: Cheft

## Current Status
- **Phase**: Phase 3 Complete - Maintenance Mode
- **Version**: 0.5.0
- **Environment**: Production (Live on Vercel)
- **Focus**: Bug fixes, performance tuning, content expansion

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

# Enrichment (Tavily Hybrid System)
npx tsx scripts/harvest-tavily-cache.ts          # Populate Tavily search cache
npx tsx scripts/extract-from-cache.ts            # Extract restaurants from cache
npx tsx scripts/extract-from-cache.ts --limit 5  # Test on 5 chefs
```

## Active Focus
- Maintenance mode: bug fixes and incremental improvements
- Content expansion: adding new chefs and restaurants
- Performance monitoring via PostHog

## Quick Links
- [Project Brief](./projectbrief.md)
- [Tech Stack](../architecture/techStack.md)  
- [Active Context](../development/activeContext.md)

## Environment Setup
1. ✅ Next.js project initialized
2. ✅ Supabase project setup and MCP integration
3. ✅ Environment variables configured
4. ✅ Database schema deployed with 560 restaurants
5. ✅ SEO pages live (chefs, restaurants, cities, states, countries)
6. ✅ Admin panel with data management and photo uploads
7. ✅ Data enrichment complete (bios, Google Places)
8. ✅ Site deployed to Vercel production
9. ✅ PostHog analytics with session replay
10. ✅ Tavily hybrid enrichment system
11. ✅ Geographic navigation (states, countries)

## Database Status
- **Restaurants**: 560 TV chef locations
- **Chefs**: 238 unique contestants/winners  
- **Coverage**: 162 cities, 50+ states, 10+ countries
- **Data Quality**: 100% geocoded, 100% bios, 100% Google Places
- **Enrichment**: 88% chef photos, 72% restaurant photos
- **Michelin**: 4,009 reference restaurants from Wikipedia

## Admin Panel
- **Login**: `/admin/login` (Supabase Auth with magic link)
- **Review Queue**: `/admin/review` (pending approvals)
- **Activity Log**: `/admin/activity` (audit trail)
- **Data Dashboard**: `/admin/data` (completeness metrics)
- **Manage Data**: `/admin/manage` (photo upload, re-enrichment)
- **Shows**: `/admin/shows` (harvest trigger for show data)
- **Enrichment Jobs**: `/admin/enrichment-jobs` (job monitoring)
