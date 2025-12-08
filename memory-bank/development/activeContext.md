---
Last-Updated: 2025-12-08
Maintainer: RB
Status: Show Hierarchy Project - Phase 2 Complete
---

# Active Context: Chefs

## Current Status
- **Phase**: Show Hierarchy Project
- **Mode**: Active development
- **Focus**: Frontend updates for show hierarchy

## In Progress: Show Hierarchy Project

### Phase 1: Database Schema ✅ COMPLETE
- Created `supabase/migrations/037_show_hierarchy.sql`
- Added columns: `parent_show_id`, `show_type`, `is_public`
- Added indexes for query performance
- Updated RPCs: `get_shows_with_counts()`, `get_show_with_chef_counts()`
- New RPCs: `get_show_family()`, `get_show_children()`

### Phase 2: Data Cleanup ✅ COMPLETE
- Applied migration to production database
- Classified 86 shows as public (31 core, 17 spinoff, 25 variant, 13 named_season)
- 75 shows remain non-public (obscure/incomplete)
- Merged 4 duplicate shows
- Fixed `get_show_children()` RPC ambiguity bug
- `/shows` page will now display ~49 shows instead of 148+

### Next: Phase 3+ - Frontend Updates
- Update TypeScript types in `src/lib/supabase.ts`
- Update `/shows` page to use new RPC
- Gray out non-public shows on chef pages
- Update show filters to only show public shows

### Project Doc: `memory-bank/projects/show-hierarchy-project.md`

---

## Recently Completed (Dec 8, 2025)

### Tavily Cache Extraction Script ✅
- **New script**: `scripts/extract-from-cache.ts` - Extracts restaurants from cached Tavily search results
- **Flow**: Tavily cache → gpt-5-mini extraction → RestaurantRepository (with staging)
- **Cost**: ~$0.006/chef (~$1.76 for all 293 chefs)
- **Tested**: 5 chefs processed, 2 new restaurants, 1 staged for review

### Restaurant Enrichment Flow Improvements ✅
- **Safer stale handling**: `deleteStaleRestaurants()` → `handleStaleRestaurants()` - stages for admin review instead of auto-deleting
- **Duplicate detection with review**: Suspected duplicates now staged to `pending_discoveries` with `needs_review` status
- **Protected restaurant support**: Protected restaurants are never modified; unprotected get status-only updates
- **Admin visibility**: All questionable cases (not found by LLM, potential duplicates) go to `/admin/review`
- **Files modified**: `restaurant-repository.ts`, `refresh-stale-chef.workflow.ts`, `manual-chef-addition.workflow.ts`, `pending-discovery-repository.ts`

## Recently Completed (Dec 7-8, 2025)

### Admin Shows Page with Harvest Trigger ✅
- Built `/admin/shows` page for managing TV show data
- Harvest trigger for importing show data from Wikipedia
- Phase 3 admin tooling complete

### Tavily Hybrid Enrichment System ✅
- **Phase 1**: Core Tavily integration for web search enrichment
- **Phase 2**: Staging system for review before committing changes
- Improved data quality through hybrid LLM + web search approach

### Geographic Navigation Pages ✅
- **State Pages**: `/states` directory + `/states/[slug]` detail pages
- **Country Pages**: `/countries` directory + `/countries/[slug]` detail pages
- Full geographic hierarchy: Countries → States → Cities → Restaurants
- New components: `StateCard.tsx`, `CountryCard.tsx`
- Location utilities in `src/lib/utils/location.ts`

### Chef's Table Show Import ✅
- Wikipedia scraper for Chef's Table series data
- All Chef's Table variants imported (France, Pastry, BBQ, Pizza, Noodles, Legends)

### PostHog Analytics Improvements ✅
- Fixed session recording issues
- Fixed stack overflow bug in provider
- Added 2025 defaults configuration
- Session replay disabled on /admin routes for privacy

### Database Migrations (032-036) ✅
- `032_add_chefs_table_shows.sql` - Show linkage
- `033_create_states_table.sql` - Geographic data (230+ lines)
- `034_search_cache_table.sql` - Caching layer
- `035_pending_discoveries_table.sql` - Staging for enrichment
- `036_add_year_to_chef_shows.sql` - Year field for appearances

### Security & Quality Improvements ✅
- Removed onClick handlers from Server Components
- Improved sanitization (replaced isomorphic-dompurify with regex)
- Various admin panel fixes

## Current Data Summary
- **Chefs**: 238 total (100% bios, 88% photos)
- **Restaurants**: 560 locations (100% Google Places, 72% photos)
- **Cities**: 162 city pages
- **States**: Full US state coverage
- **Countries**: International coverage
- **Shows**: All major TV chef competition shows

## Infrastructure Status
- **Production**: Live on Vercel
- **Database**: Supabase PostgreSQL
- **Analytics**: PostHog with session replay
- **Enrichment**: Tavily hybrid + OpenAI LLM

## No Current Blockers

## Deferred/Future Work
1. **Multi-Show UI Display** - Better UI for chefs with many TV appearances
2. **Duplicate Chef Detection** - Migration ready but not deployed
3. **SEO Backfill Script** - Auto-generated descriptions for all pages
4. **Community Features** - User contributions and verification (if needed)

## Key Files Reference
- Geographic pages: `src/app/states/`, `src/app/countries/`
- Enrichment: `scripts/ingestion/enrichment/` (19-file service architecture)
- Admin: `src/app/admin/`
- Analytics: `src/lib/posthog.ts`, `src/components/PostHogProvider.tsx`
