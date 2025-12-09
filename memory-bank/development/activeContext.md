---
Last-Updated: 2025-12-09
Maintainer: RB
Status: Pre-Launch - UI Polish & Testing
---

# Active Context: Chefs

## Current Status
- **Phase**: Pre-Launch
- **Mode**: UI cleanup and testing
- **Focus**: Final polish before public launch

## Recent Changes (Dec 9, 2025)

### Tavily Fresh Start Migration ✅
Complete restaurant data refresh using Tavily web search + LLM extraction:
- **997 restaurants** from fresh Tavily extraction (clean, LLM-verified ownership)
- **1,021 with Google Places** data (98.5% coverage)
- **15 missing Place IDs** - mostly closed/coming soon/international (acceptable)
- Old stale data purged, backup saved to `deleted_restaurants_backup.json`

### Admin Completeness Logic Fix ✅
- Closed/unknown restaurants no longer trigger "missing Google Places" warning
- Updated `EntitiesClient.tsx` - `getRestaurantCompleteness()` function

### Show Visibility Scope Reduction ✅
- 19 public shows (Top Chef + TOC families only)
- Other shows hidden until properly harvested

---

## Current Data Summary
- **Chefs**: 238 total (100% bios, 88% photos)
- **Restaurants**: 1,036 locations (98.5% Google Places, ~98% photos)
- **Cities**: 162+ city pages
- **States**: Full US state coverage
- **Countries**: International coverage
- **Public Shows**: 19 (Top Chef + TOC families only)

## Infrastructure Status
- **Production**: Live on Vercel
- **Database**: Supabase PostgreSQL
- **Analytics**: PostHog with session replay
- **Enrichment**: Tavily hybrid + OpenAI LLM

## Pre-Launch Checklist
- [ ] UI polish and cleanup
- [ ] E2E testing (`npm run test:e2e`)
- [ ] Mobile responsiveness check
- [ ] Final review of public pages

## Key Scripts (Active)
- `scripts/harvest-tavily-cache.ts` - Populate web search cache
- `scripts/extract-from-cache.ts` - Extract restaurants from cache
- `scripts/enrich-google-places.ts` - Backfill Google Place IDs
- `scripts/find-duplicates.ts` - Detect duplicate restaurants

## Deferred/Future Work
1. **Re-enable Other Shows** - Harvest Chopped, Iron Chef, etc. properly
2. **Multi-Show UI Display** - Better UI for chefs with many TV appearances
3. **SEO Backfill Script** - Auto-generated descriptions for all pages
