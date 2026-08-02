---
name: runbook
description: day-to-day commands, admin panel URLs, and how to add a new TV show
Last-Updated: 2026-08-02
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
npm run build        # Build for production — fails locally on /_global-error, see below
npm run lint         # Run ESLint (~237 pre-existing `any` warnings; judge by the delta)
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

**Local gate before shipping**: `npx tsc --noEmit` + `npm run test:e2e`. Don't use
`npm run build` as the gate — it fails locally on `/_global-error` for environment reasons
while Vercel builds the same code fine ([[seo-recovery]] has the detail).

**If a CSS edit doesn't appear**, restart the dev server. Turbopack serves stale `globals.css`
through both file touches and query-string cache-busting.

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
- Search Console: resubmit the sitemap, validate the 404 fixes (see [[active-context]])
- UI polish and cleanup
- E2E testing before launch — `npm run test:e2e` is green at 55/55
- Mobile responsiveness verification

## Quick Links
- [[project-brief]]
- [[tech-stack]]
- [[active-context]]

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
Counted directly from the Cheft Supabase project (`clktrvyieegouggrpfaj`) on 2026-08-02.
Re-count rather than trusting this block if it's more than a few months old.

- **Restaurants**: 1,293 (all public) — 100% Google Places, 96% have photos
- **Chefs**: 458 — 86% have bios, **13% have photos** (61 rows carry `photo_url`)
- **Shows**: 192 total, 75 public
- **Coverage**: 414 city rows / 101 indexable, 51 states / 40, 36 countries / 17
- **Michelin**: 4,846 reference restaurants from Wikipedia

Locations need **≥3 restaurants** to be indexed (`MIN_INDEXABLE_LOCATION_RESTAURANTS` in
`src/lib/locationIndexing.ts`), which is why row counts and indexable counts differ. The
sitemap keys off the same constant — change both together. See [[seo-recovery]].

To re-count: `select count(*) from chefs;` etc., or use `/admin/data`.

## Admin Panel
- **Login**: `/admin/login` (Supabase Auth with magic link)
- **Entities**: `/admin/entities` (chef/restaurant management)
- **Review Queue**: `/admin/review` (pending approvals)
- **Activity Log**: `/admin/activity` (audit trail)
- **Data Dashboard**: `/admin/data` (completeness metrics)
- **Shows**: `/admin/shows` (show visibility management)
- **Enrichment Jobs**: `/admin/enrichment-jobs` (job monitoring)
