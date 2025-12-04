---
Last-Updated: 2025-12-04
Maintainer: RB
Status: Phase 3 Complete - Fixing Multi-Show Data Issues
---

# Active Context: Chefs

## Current Sprint Goals
- **Sprint**: Multi-Show Attribution & Duplicate Chef Management
- **Duration**: 1 week
- **Focus**: Fix multi-show enrichment, enhance UI display, merge duplicate chef records

### Critical Issues (In Progress)
1. **Multi-Show Enrichment Gap**:
   - **Problem**: Current enricher only captures chefs from ONE season/show during initial import
   - **Impact**: Many chefs appeared on multiple shows (e.g., "Top Chef" + "Iron Chef") but only 1 show is recorded
   - **Solution**: Created `enrichShowsOnly()` function to re-enrich ALL 182 chefs for TV show appearances
   - **Status**: Function ready, need to execute `npm run enrich:shows` on all chefs
   
2. **Multi-Show UI Display**:
   - **Problem**: No UI component to display multiple TV show appearances per chef
   - **Current UI**: Only shows primary show badge on chef cards
   - **Needed**: Full TV appearance timeline/list on chef detail pages
   - **Status**: Need to design and implement multi-show display component

### Secondary Issues
3. **Duplicate Chef Detection**:
   - Multiple chef records exist for same person (different show seasons imported separately)
   - Need merge functionality to consolidate duplicate records
   - Migration `020_chef_merge_function.sql` created but not yet deployed

## Current Blockers
- None

## In Progress
- Fixing multi-show enrichment and UI display issues

## Recently Completed (Dec 4, 2025) - Shows-Only Enrichment System
- ✅ **Shows-Only Enrichment Function** - Added `enrichShowsOnly()` to LLM enricher for targeted TV show discovery
  - **New function**: `enrichShowsOnly(chefId, chefName)` in llm-enricher.ts (110 lines)
  - **Purpose**: Re-enrich existing chefs ONLY for TV show appearances (no bio/photo/restaurant changes)
  - **LLM prompt**: Focuses exclusively on finding ALL TV cooking show appearances
  - **Show mapping**: Uses existing `findShowByName()` and `saveChefShows()` helpers
  - **Deduplication**: Skips shows already in database, saves only new appearances
  - **Cost**: Uses gpt-5-mini, ~$0.02-0.05 per chef, 30 max steps
  - **New script**: `scripts/enrich-all-chef-shows.ts` (77 lines)
  - **New command**: `npm run enrich:shows` with optional `--limit` and `--offset` flags
  - **Integration**: Ready to run on all 182 chefs before duplicate detection
  - **UI**: Already supports displaying all shows (TVAppearanceList component)
  - **Status**: Ready to execute, documented in DUPLICATE_CHEF_SYSTEM.md

## Recently Completed (Dec 4, 2025) - Phase 4 Photo Fallback UI
- ✅ **Photo Fallback UI Complete** - Professional fallback for 206 chefs without Wikipedia photos
  - **InstagramIcon component** created (16 lines) - recolorable SVG from official Instagram logo
  - **Fallback hierarchy**: Wikipedia photo → Instagram link (icon + @handle) → Two-initial text
  - **ChefHero.tsx**: Added `getInitials()` helper, Instagram link fallback, kept original gradient design
  - **FeaturedChefHero.tsx**: Same pattern for homepage hero
  - **RelatedChefs.tsx**: Two-initial fallback for cards
  - **ChefCard.tsx**: Reverted to info-only (no circular avatars per user feedback)
  - **Chef detail pages**: Wikipedia photo attribution banner ("Photo: Wikimedia Commons (CC BY-SA)")
  - **Design decision**: No circular avatars - kept original text-based initials (e.g., "GR" for Gordon Ramsay)
  - **Instagram link**: Shows icon + handle, clickable to profile (NOT embedded photo - just link)
  - **Coverage**: 33 Wikipedia photos (14%), 206 with text fallback (86%)
  - **Type safety**: Added `photo_source` to ChefData interface and all queries
  - **Files modified**: 5 components (InstagramIcon new, 4 updated), 1 page (attribution), ~200 lines total
  - **Testing**: TypeScript compilation passes
  - **Status**: Production-ready

## Recently Completed (Dec 3, 2025) - Phase 4
- ✅ **Enrichment Admin UI Complete** - Full control center for data refresh management
  - **5 new components** created with Industrial Editorial aesthetic:
    - `BudgetTracker` - SVG progress ring, budget visualization, warning states
    - `RefreshScheduleStatus` - Countdown timers, schedule monitoring
    - `ChefSearchDropdown` - Typeahead search with keyboard navigation
    - `RestaurantSearchDropdown` - Filtered search for open restaurants
    - `ManualTriggerSection` - Manual enrichment triggers with auth
  - **Enhanced enrichment-jobs page**: Integrated all sections with enhanced table (Type, Cost, Triggered By columns)
  - **Authentication integration**: Created client-auth helper for Bearer token extraction from Supabase sessions
  - **Button contrast fixed**: Darker copper-600 for selected states, white with borders for unselected
  - **Header styling improved**: Added drop shadows and dark overlay for readability
  - **Type safety**: Removed all `as any` casts, proper null handling
  - **Error handling**: Specific messages for 401, 400, network errors with auto-redirect on auth failure
  - **Navigation updated**: Added "Enrichment" link to AdminNav
  - **Files**: 5 new components (~780 lines), 1 auth helper (24 lines), 4 modified files
  - **Testing**: TypeScript compilation passes, all integration points verified
  - **Status**: Production-ready, fully functional

## Recently Completed (Dec 3, 2025) - Phase 3
- ✅ **Enrichment Refresh System Phase 3: Scheduled Cron Jobs** - Automated data refresh
  - **Monthly refresh cron**: Re-enriches top 50 chefs on 1st of month (2 AM UTC)
  - **Weekly status check cron**: Verifies restaurant status every Sunday (3 AM UTC)
  - **Features**:
    - Priority scoring: `(restaurants × 10) + (staleness × 0.5) + manual_flag + base_priority`
    - Budget safety with adaptive batch sizing (halves at 80% threshold)
    - UUID validation for data integrity
    - Configuration constants (VERIFICATION_CONFIG)
    - Standardized error handling for resilience
  - **Files**: `monthly-refresh/route.ts` (215 lines), `weekly-status-check/route.ts` (181 lines)
  - **Testing**: 5 monthly jobs + 20 weekly jobs created successfully
  - **Code review**: All critical/warning issues addressed
  - **Status**: Ready for Vercel deployment

## Recently Completed (Dec 3, 2025) - Earlier
- ✅ **Performance Optimization: N+1 Query Elimination** - Critical database optimization
  - **Fixed SQL injection vulnerability** in search query (input sanitization)
  - **Added 4 critical indexes**: `idx_shows_slug`, `idx_chef_shows_show_season`, `idx_chef_shows_season`, `idx_restaurants_chef_public`
  - **Created 5 optimized PostgreSQL functions** replacing N+1 patterns:
    - `get_shows_with_counts()`: 25 queries → 1 query (~96% reduction)
    - `get_show_with_chef_counts()`: N+1 → 2 queries
    - `get_show_seasons()`: N+1 → 1 query
    - `get_show_season_data()`: N+1 → 1 query  
    - `get_all_show_seasons_for_sitemap()`: N queries → 1 query
  - **Result**: ~95% database query reduction on show/season pages
  - Migration: `006_add_show_indexes_and_functions.sql`

- ✅ **Show & Season SEO Pages** - Complete show/season directory implementation
  - Created `/shows` directory page listing all TV shows with chef/restaurant counts
  - Built `/shows/[slug]` pages for individual shows (e.g., `/shows/top-chef`)
  - Implemented `/shows/[slug]/[season]` pages for seasons (e.g., `/shows/top-chef/season-4`)
  - Updated sitemap.ts to include ~8 show pages + ~50+ season pages
  - Made TV appearance badges on chef pages clickable (link to show/season pages)
  - **SEO Impact**: ~60+ new pages for search indexing

## Recently Completed (Dec 2, 2025)
- ✅ **Multi-Show Attribution Badge System** - Complete show badge overhaul for chef cards
  - Created utility functions for show abbreviation and formatting
  - Built `ShowBadgeCompact` and `ShowBadgeStrip` components
  - Updated `ChefCard` to display primary show (abbreviated) + secondary shows
  - Primary badge now shows "TC • S4" instead of just "Season 4"
  - Secondary badge strip shows 2-3 additional shows with overflow indicator
  - Responsive: 2 badges on mobile, 3 on desktop
  
- ✅ **Michelin Star Badges** - Restaurant prestige display
  - Created `MichelinStar` icon component with official Michelin SVG
  - Added Michelin star badges to restaurant cards (white stars on red #D3072B)
  - Updated queries and TypeScript types for `michelin_stars` field
  - Displays 1-3 stars on restaurant photos (top-right corner)

- ✅ **Site Deployed to Vercel** (Dec 3) - Production live with 652+ SEO pages
- ✅ **Data Enrichment Complete** (Dec 2) - 100% bios, 100% Google Places, 88% chef photos
- ✅ **Phase 2 Complete** (Dec 1-2) - Chef/restaurant/city pages, admin panel, internal linking

## Next Steps
1. **Fix Multi-Show Data** (URGENT):
   - Execute `npm run enrich:shows` on all 182 chefs to capture missing TV appearances
   - Implement multi-show display UI component on chef detail pages
   - Test and verify show attribution completeness

2. **Duplicate Chef Management**:
   - Deploy migration `020_chef_merge_function.sql` 
   - Build admin UI for detecting and merging duplicate chef records
   - Run duplicate detection and merge duplicates

3. **Phase 3 Community Features** (Deferred):
   - ✅ Contribution system (suggest chef/restaurant forms)
   - ✅ Data verification UI (thumbs up/down buttons)
   - ✅ Show attribution badges
   - Admin review queue for submissions
   
4. **Data Quality** (Ongoing):
   - User manually adding chefs via admin interface
   - Run enrichment on newly added chefs as needed
   - Monitor and respond to user verification signals

## Data Summary (as of 2025-12-02)
- **Chefs**: 182 total
  - Bios: 182/182 (100%) ✅
  - Photos: 160/182 (88%)
  - Restaurant enrichment: 182/182 (100%) ✅
- **Restaurants**: 560 locations
  - Google Place IDs: 560/560 (100%) ✅
  - Photos: 405/560 (72%)
  - Ratings/URLs: 560/560 (100%) ✅
- **Cities**: 162 cities with restaurant counts
- **Enrichment Status**: ✅ COMPLETE (except 22 chef photos)