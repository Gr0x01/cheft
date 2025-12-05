---
Last-Updated: 2025-12-05
Maintainer: RB
Status: Active Development
---

# Active Context: Chefs

## Current Sprint Goals
- **Sprint**: LLM Enrichment System Refactor
- **Focus**: Refactor 1337-line enrichment monolith into clean service-based architecture

### Primary Objective
**Enrichment System Refactor** (Phase 3 Complete):
- **Problem**: `llm-enricher.ts` is 1337 lines handling too many concerns (chef/restaurant/show enrichment, status verification, narratives, DB ops, token tracking)
- **Issues**: Single Responsibility Violation, tight coupling, hard to test/extend, inconsistent workflows
- **Solution**: Refactor into service-based architecture (services, workflows, repositories, shared utilities)
- **Document**: `/memory-bank/projects/ENRICHMENT_REFACTOR.md` - comprehensive refactor plan with 6 phases
- **Status**: Phase 3 complete (services extracted), ready for Phase 4 (create workflows)

### Deferred Issues
1. **Multi-Show Enrichment Gap**:
   - Current enricher only captures ONE show during import
   - `enrichShowsOnly()` function created to backfill all shows
   - Will address as part of workflow refactor

2. **Multi-Show UI Display**:
   - Need UI component for displaying multiple TV appearances
   - Deferred until after enrichment refactor

3. **Duplicate Chef Detection**:
   - Migration `020_chef_merge_function.sql` ready but not deployed
   - Will integrate into workflows during refactor

## Current Blockers
- None

## In Progress
- None

## Recently Completed (Dec 5, 2025) - Performance Blurbs Feature ✅
- ✅ **Competition Performance Blurbs** - Added 1-2 sentence summaries to TV show appearances
  - **Problem**: Chef pages only showed basic show info (name, season, result badge) without competition context
  - **Solution**: Enhanced LLM enrichment to generate performance narratives for each TV appearance
  - **Database Changes**:
    - Migration `021_add_performance_blurb_to_chef_shows.sql`
    - Added `performance_blurb TEXT` column with CHECK constraint (10-500 chars)
    - Added index `idx_chef_shows_performance_missing` for backfill queries
  - **LLM Enrichment**:
    - Updated `show-discovery-service.ts` prompt to request performance summaries
    - Example: "Won Season 15 after dominating Restaurant Wars, winning 4 elimination challenges"
    - Cost: ~$0.03 per chef (91k tokens)
  - **UI Improvements**:
    - Display performance blurbs below show name in `TVAppearanceBadge.tsx`
    - Re-enabled career narrative section with paragraph formatting
    - Added sanitization via `sanitizeNarrative()` for XSS protection
    - Added error handling for narrative processing
    - Added ARIA labels for accessibility
  - **Scripts**:
    - `backfill-performance-blurbs.ts` - Backfill existing 182 chefs
    - `test-performance-blurbs.ts` - End-to-end testing script
    - New command: `npm run enrich:performance-blurbs`
  - **Code Quality**:
    - Fixed all TypeScript type safety violations in repository layer
    - Removed unsafe `as any` type casts
    - Added proper null handling for season queries
    - Added database CHECK constraints
  - **Testing**: Live test passed with Justin Devillier (found 2 shows, 1 with blurb)
  - **Status**: Ready for deployment - migration + backfill script ready
  - **Files Modified**: 9 files, +315 lines, -27 lines
  - **Commit**: `d33213d feat: Add performance blurbs to TV show appearances`

## Recently Completed (Dec 5, 2025) - Enrichment Refactor Phase 3 COMPLETE ✅
- ✅ **Enrichment Services Extracted & Web Search Fixed** - Refactored monolith + fixed critical OpenAI API issues
  - **Files Created**: 5 service files + 1 repository (~806 lines total)
    - `chef-enrichment-service.ts` (233 lines) - Chef bio/awards enrichment
    - `restaurant-discovery-service.ts` (145 lines) - Restaurant finding
    - `show-discovery-service.ts` (136 lines) - TV show discovery
    - `status-verification-service.ts` (110 lines) - Restaurant status verification
    - `narrative-service.ts` (166 lines) - Chef/restaurant/city narrative generation
    - `city-repository.ts` (25 lines) - City DB operations for repository pattern consistency
  - **Critical Bugs Fixed**:
    - ✅ Show discovery handles single-object LLM responses (array normalization)
    - ✅ **Web search configuration** - Combined system+prompt, removed unsupported maxSteps, fixed useResponseModel
    - ✅ **JSON parser** - Now handles arrays `[...]` before objects `{...}`
  - **Show Name Mappings Expanded**:
    - ✅ Added "Guy Fieri's Tournament of Champions" → "tournament-of-champions"
    - ✅ Added "Top Chef: All-Stars L.A." → "top-chef"
    - ✅ Now supports 33+ show name variants
  - **Monolith Reduced**: `llm-enricher.ts` reduced ~97 lines (from ~500 → ~403 lines)
  - **Token Tracking**: Services use TokenTracker singleton, facade aggregates usage
  - **Testing**: End-to-end tested with Joe Sasto - found 11-13 TV shows, ~$0.02 cost, all working perfectly
  - **TypeScript**: All compilation errors resolved
  - **Architecture**: Clean separation of concerns, repository pattern enforced, no direct Supabase calls
  - **Production Ready**: Web search functional, cost tracking accurate, multi-season handling correct
  - **Status**: Phase 3 COMPLETE - Phase 4 (workflows) optional, current system fully functional

## Recently Completed (Dec 4, 2025) - Enrichment Refactor Planning
- ✅ **Enrichment System Architecture Design** - Comprehensive refactor plan created
  - **Collaborated with**: backend-architect + code-architect subagents
  - **Document**: `/memory-bank/projects/ENRICHMENT_REFACTOR.md` (comprehensive plan)
  - **Architecture**: Service-based with clear separation of concerns
  - **Folder structure**: services/, workflows/, repositories/, shared/, types/
  - **Migration plan**: 6 phases with checkboxes (utilities → repos → services → workflows → facade → cleanup)
  - **Key workflows**: NewShowDiscovery, RefreshStaleChef, RestaurantStatusSweep, PartialUpdate
  - **Testing strategy**: Unit tests per service, integration tests per workflow, E2E with real data
  - **Backward compatibility**: Facade maintains existing 13-function interface for 7 scripts + 2 API routes
  - **Status**: Planning complete, ready to begin implementation

## Recently Completed (Dec 4, 2025) - Shows-Only Enrichment System
- ✅ **Shows-Only Enrichment Function** - Added `enrichShowsOnly()` to LLM enricher for targeted TV show discovery
  - **New function**: `enrichShowsOnly(chefId, chefName)` in llm-enricher.ts (110 lines)
  - **New script**: `scripts/enrich-all-chef-shows.ts` (77 lines)
  - **New command**: `npm run enrich:shows` with optional `--limit` and `--offset` flags
  - **Cost**: Uses gpt-5-mini, ~$0.02-0.05 per chef, 30 max steps
  - **Status**: Function ready, will integrate into refactored workflow system

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
1. **Deploy Performance Blurbs** (IMMEDIATE):
   - Deploy migration `021_add_performance_blurb_to_chef_shows.sql`
   - Run backfill: `npm run enrich:performance-blurbs -- --prioritize=winners`
   - Verify UI displays correctly on chef pages
   - Expected cost: ~$3.64 for all 182 chefs

2. **Fix Multi-Show Data**:
   - Execute `npm run enrich:shows` on all 182 chefs to capture missing TV appearances
   - Test and verify show attribution completeness

3. **Duplicate Chef Management**:
   - Deploy migration `020_chef_merge_function.sql` 
   - Build admin UI for detecting and merging duplicate chef records
   - Run duplicate detection and merge duplicates

4. **Phase 3 Community Features** (Deferred):
   - ✅ Contribution system (suggest chef/restaurant forms)
   - ✅ Data verification UI (thumbs up/down buttons)
   - ✅ Show attribution badges
   - Admin review queue for submissions
   
5. **Data Quality** (Ongoing):
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