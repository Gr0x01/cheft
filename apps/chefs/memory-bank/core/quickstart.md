---
Last-Updated: 2025-12-10
Maintainer: RB
Status: Pre-Launch - Final Polish
---

# Quickstart: Cheft

## Current Status
- **Phase**: Pre-Launch
- **Version**: 0.6.0
- **Environment**: Production (Live on Vercel)
- **Focus**: UI polish, testing, then launch

## Key Commands
```bash
# Development
npm run dev          # Start development server (localhost:3003)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks

# Testing
npm run test:e2e     # Run Playwright tests
npm run test:e2e:ui  # Interactive test mode

# Enrichment (if needed)
npx tsx scripts/harvest-tavily-cache.ts   # Populate Tavily search cache
npx tsx scripts/extract-from-cache.ts     # Extract restaurants from cache
npx tsx scripts/enrich-google-places.ts   # Backfill Google Place IDs

# Adding New Shows (fully automated)
npx tsx scripts/add-show.ts --show "Show Name" --network "Network" --contestants "Name:season:result,..."
npx tsx scripts/add-show.ts --config path/to/show-config.json
```

## Adding a New TV Show
Use `scripts/add-show.ts` to add a new show with contestants. It handles everything:
1. Creates/makes show public in database
2. Creates chef records for each contestant
3. Runs full enrichment (bio, restaurants, other TV appearances)
4. Generates show and season SEO descriptions
5. Reports Google Places status (run `enrich-google-places.ts` after)

**Config file format** (`shows/example.json`):
```json
{
  "showName": "Holiday Baking Championship",
  "network": "Food Network",
  "contestants": [
    { "name": "Melissa Yanc", "season": "6", "result": "winner" },
    { "name": "Ashley Landerman", "season": "10", "result": "winner" }
  ]
}
```

**Local LLM**: Auto-detects `LM_STUDIO_URL` env var and uses local LLM if available.

## Active Focus
- UI polish and cleanup
- E2E testing before launch
- Mobile responsiveness verification

## Quick Links
- [Project Brief](./projectbrief.md)
- [Tech Stack](../architecture/techStack.md)  
- [Active Context](../development/activeContext.md)

## Environment Setup
1. ✅ Next.js project initialized
2. ✅ Supabase project setup and MCP integration
3. ✅ Environment variables configured
4. ✅ Database schema deployed
5. ✅ SEO pages live (chefs, restaurants, cities, states, countries)
6. ✅ Admin panel with data management and photo uploads
7. ✅ Data enrichment complete (bios, Google Places)
8. ✅ Site deployed to Vercel production
9. ✅ PostHog analytics with session replay
10. ✅ Tavily hybrid enrichment system
11. ✅ Geographic navigation (states, countries)
12. ✅ Fresh restaurant data via Tavily migration

## Database Status
- **Restaurants**: 1,036 TV chef locations
- **Chefs**: 238 unique contestants/winners  
- **Coverage**: 162+ cities, 50+ states, 10+ countries
- **Data Quality**: 98.5% Google Places, ~98% photos
- **Michelin**: 4,009 reference restaurants from Wikipedia

## Admin Panel
- **Login**: `/admin/login` (Supabase Auth with magic link)
- **Entities**: `/admin/entities` (chef/restaurant management)
- **Review Queue**: `/admin/review` (pending approvals)
- **Activity Log**: `/admin/activity` (audit trail)
- **Data Dashboard**: `/admin/data` (completeness metrics)
- **Shows**: `/admin/shows` (show visibility management)
- **Enrichment Jobs**: `/admin/enrichment-jobs` (job monitoring)
