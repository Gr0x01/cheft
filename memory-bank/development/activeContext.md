---
Last-Updated: 2025-12-07
Maintainer: RB
Status: SEO Auto-Enrichment Implementation In Progress
---

# Active Context: Chefs

## Current Sprint Goals
- **Sprint**: SEO Content & Auto-Enrichment
- **Focus**: Automated SEO description generation for show/season pages

### COMPLETED: Full Production Re-enrichment (Dec 6, 2025) ✅
**All 238 chefs successfully re-enriched with clean data**:
- ✅ **Production Run**: 238/238 chefs enriched successfully (0 failures)
- ✅ **Cost**: $39.43 (includes SEO description generation)
- ✅ **Time**: 24 minutes with batch=50 parallel processing
- ✅ **Data Quality**: Fresh bios, complete TV show history, current restaurants
- ✅ **Duplicates Resolved**: Nuclear reset of chef_shows + unique constraint prevents future duplicates
- ✅ **Schema Fixes**: performanceBlurb now accepts null values
- ✅ **Pricing Fix**: Corrected token costs from $0.25/$2.00 to $0.15/$0.60 per 1M tokens

**Bug Fixes Applied**:
- Added unique constraint to `chef_shows(chef_id, show_id, season)` via migration `022_add_chef_shows_unique_constraint.sql`
- Fixed schema validation: `performanceBlurb: z.string().nullable().optional()` in both repositories
- Corrected pricing in `token-tracker.ts` to match gpt-4o-mini rates ($0.15 input, $0.60 output per 1M tokens)

**Scripts Created**:
- `scripts/re-enrich-all-chefs.ts` - Main re-enrichment with parallel batching (tested at batch=50)
- `scripts/nuke-chef-shows.ts` - Nuclear option: delete all chef_shows for clean slate
- `scripts/cleanup-duplicate-chef-shows.ts` - Identify and remove duplicates
- `scripts/apply-chef-shows-fix.ts` - Apply deduplication fixes
- Migration: `022_add_chef_shows_unique_constraint.sql` - Database-level duplicate prevention

### Recently Completed: LLM Enrichment System Refactor ✅
**Enrichment System Refactor** (ALL PHASES COMPLETE - Dec 5, 2025):
- **Problem**: 1337-line monolith with too many concerns
- **Solution**: Refactored into 19-file service-based architecture
- **Architecture**:
  - 5 services (chef, restaurant, show, status, narrative)
  - 4 shared utilities (LLM client, token tracker, result parser, retry handler)
  - 4 repositories (chef, restaurant, show, city)
  - 4 workflows (refresh stale chef, status sweep, partial update, manual addition)
  - 1 facade (485-line backward-compatible interface)
- **Result**: 64% code reduction (1337 → 485 lines), fully testable, maintainable
- **Document**: `/memory-bank/projects/ENRICHMENT_REFACTOR.md`
- **Status**: ✅ Production-ready, all tests passing, backward compatible

### Deferred Issues
1. **Multi-Show UI Display**:
   - Need UI component for displaying multiple TV appearances
   - Deferred until after enrichment refactor

3. **Duplicate Chef Detection**:
   - Migration `020_chef_merge_function.sql` ready but not deployed
   - Will integrate into workflows during refactor

## Current Blockers
None

## In Progress (Dec 6, 2025) - SEO Auto-Enrichment System
### Automated SEO Description Generation (CORE COMPLETE - Dec 6)
**Goal**: Generate unique SEO descriptions for all show/season pages automatically to avoid Google thin content penalties

**Implementation Status**:
- ✅ **Database Schema** - Migration 026 adds description columns to shows table
  - `description TEXT` - 2-3 sentence show overview
  - `season_descriptions JSONB` - Season-specific descriptions keyed by season
  - `seo_generated_at TIMESTAMPTZ` - Generation timestamp
  - Index `idx_shows_seo_missing` for backfill queries
- ✅ **ShowDescriptionService** - New service following existing enrichment patterns
  - Model: `gpt-4.1-mini` with web search (low context)
  - `ensureShowDescription()` - Checks if exists, generates if missing
  - `ensureSeasonDescription()` - Same for season descriptions
  - Token tracking and error handling
  - File: `scripts/ingestion/enrichment/services/show-description-service.ts` (175 lines)
- ✅ **System Prompts** - SEO-optimized prompts added to `src/lib/narratives/prompts.ts`
  - `SHOW_DESCRIPTION_SYSTEM_PROMPT` - 2-3 sentence show descriptions
  - `SEASON_DESCRIPTION_SYSTEM_PROMPT` - 1-2 sentence season highlights
  - `buildShowDescriptionPrompt()` and `buildSeasonDescriptionPrompt()` helpers
- ✅ **ShowRepository Enhanced** - Description CRUD + new combination detection
  - Modified `saveChefShows()` to detect first-time show/season combinations
  - Checks if description exists (not if any chef exists) to avoid race condition
  - Added 4 new methods: `getShowDescription()`, `saveShowDescription()`, `getSeasonDescription()`, `saveSeasonDescription()`
  - Database validation ensures show exists before saving descriptions
- ✅ **Auto-Enrichment Hooks** - Integrated into all 3 chef enrichment workflows
  - When new show/season combo discovered → auto-generates description
  - Fetches show metadata, winner info, builds context
  - Integrated in: `refresh-stale-chef.workflow.ts`, `manual-chef-addition.workflow.ts`, `partial-update.workflow.ts`
  - Logs cost estimates (hardcoded ~$0.02 per description)
- ✅ **LLM Enricher Facade** - Exposed service via facade pattern
  - `generateShowDescription()` and `generateSeasonDescription()` methods
  - Token tracking integrated
  - File: `scripts/ingestion/processors/llm-enricher.ts`
- ✅ **Code Review** - All critical issues fixed
  - Fixed race condition in newCombinations detection (check description exists, not chef count)
  - Added database validation for show existence before updates
  - Type safety verified, compilation passing

**Architecture**:
- Service Layer: ShowDescriptionService (LLM generation logic)
- Repository Layer: ShowRepository (database CRUD)
- Workflow Integration: Auto-enrichment hooks in 3 workflows
- Facade: llm-enricher.ts exposes service methods

**Next Steps** (DEFERRED):
- Create backfill script `enrich-all-seo-descriptions.ts` (~$4-5 one-time cost for ~220 pages)
- Update `src/app/shows/[slug]/page.tsx` metadata to use show.description
- Update `src/app/shows/[slug]/[season]/page.tsx` metadata to use season_descriptions
- Test auto-enrichment with new chef addition
- Run backfill script on production

**Files Modified**: 8 files (+~600 lines)
- Created: `026_add_show_seo_descriptions.sql`, `show-description-service.ts`
- Modified: `prompts.ts`, `show-repository.ts`, 3 workflow files, `llm-enricher.ts`, `database.types.ts`

**Testing**: Type-check passing, critical issues fixed, ready for backfill script creation

## Recently Completed (Dec 7, 2025) - PostHog Analytics Setup ✅
- ✅ **PostHog Installation**: Product analytics + session replay
  - Package: `posthog-js` v1.302+
  - Files: `src/lib/posthog.ts`, `src/components/PostHogProvider.tsx`
  - Session replay enabled globally, **disabled on /admin routes** for privacy
  - Privacy: person_profiles='identified_only', password masking
  - Autocapture: pageviews, clicks, user paths
- ✅ **Documentation**: `/memory-bank/architecture/analytics-setup.md`
  - Dashboard setup guide (Core Metrics + Session Replay Insights)
  - Key metrics to monitor (traffic, engagement, content, user journey)
  - Best practices and troubleshooting
- **Next Steps**: Create PostHog dashboards in UI (no code needed)

## Recently Completed (Dec 7, 2025) - Michelin Reference System ✅
- ✅ **Database Table**: `michelin_restaurants` with 4,009 worldwide entries
  - 195 ★★★ | 522 ★★ | 3,292 ★ across 66 countries
- ✅ **Wikipedia Scraper**: `npm run michelin:scrape` parses 66 Wikipedia pages
  - Star count extracted from image filenames (`Etoile_Michelin-1/2/3`)
  - Handles closed restaurants, deduplication, country mapping
- ✅ **Auto-Sync Trigger**: On michelin table insert/update → matches restaurants by exact name + city
  - Handles state abbreviations (NY→New York, CA→California, etc.)
  - Function `sync_all_michelin_stars()` for manual bulk sync
- ✅ **Scripts**: `scrape-wikipedia-michelin.ts`, `check-table.ts`, `run-sync.ts`, `check-matches.ts`
- ✅ **Migration**: `030_michelin_reference_table.sql`
- **Note**: Low overlap with TV chef restaurants (expected) - data ready for future Michelin filter or spinoff site
- **Refresh Schedule**: Run yearly (~November when Michelin announces new stars)

## Recently Completed (Dec 5, 2025) - Multi-Show Discovery Fix ✅
- **Problem**: LLM only found 1 show per chef despite 6+ actual appearances
- **Root Cause**: Vague prompts caused model to summarize instead of extracting all shows
- **Solution**: Hybrid model approach with explicit extraction prompts
  - Updated `show-discovery-service.ts` with step-by-step search instructions
  - Prompt now explicitly tells model to search 4 different queries
  - Changed from "find shows" to "extract EVERY show from ALL search results"
  - Required JSON-only output to prevent summarization
- **Results**:
  - Joe Sasto: 1 show → 12 shows (Top Chef, TOC, Chopped, GGG, etc.)
  - Brooke Williamson: 1 show → 11 shows
  - Time: ~12s per chef (was 2min with old approach)
  - Cost: $0.0014 per chef (was $0.03)
  - Tokens: ~3k (was 91k)
- **Files Modified**: `show-discovery-service.ts`
- **Status**: ✅ Ready for production backfill

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

## Recently Completed (Dec 5, 2025) - Enrichment Refactor COMPLETE ✅
- ✅ **Enrichment System Refactor (Phases 1-6)** - Complete architectural transformation
  - **Phase 1**: Extracted shared utilities (LLM client, token tracker, result parser, retry handler)
  - **Phase 2**: Extracted repository layer (chef, restaurant, show, city repositories)
  - **Phase 3**: Extracted services (chef, restaurant, show, status, narrative)
  - **Phase 4**: Created workflows (refresh stale chef, status sweep, partial update, manual addition)
  - **Phase 5**: Facade already existed (llm-enricher.ts delegates to services/workflows)
  - **Phase 6**: Cleanup complete (deleted .bak backup, removed test scripts)
  - **Final Architecture**: 19 files, 485-line facade, fully tested
  - **Testing**: All scripts/routes work unchanged, token costs within 1%
  - **Status**: Production-ready, refactor complete

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

## Recently Completed (Dec 5, 2025) - Admin Panel Phase 1 ✅
- ✅ **Unified Entity Editors** - Full-page editors for chefs and restaurants
  - **Problem**: No way to edit all database fields in one place, scattered actions across modals
  - **Solution**: Built 5 reusable form components + 2 full-page editors
  - **Components Created**:
    - `FieldSection.tsx` - Collapsible section wrapper with Industrial Editorial design
    - `TextField.tsx` - Validated text inputs with error states
    - `TextArea.tsx` - Multi-line inputs with character counting
    - `SelectField.tsx` - Dropdowns with custom copper styling
    - `MultiInput.tsx` - Array field editor (cookbook titles, awards, etc.) with validation
  - **Editor Pages**:
    - `/admin/manage/chefs/[id]` - Edit all 20+ chef fields
    - `/admin/manage/restaurants/[id]` - Edit all 18+ restaurant fields
  - **Security**:
    - XSS protection via `sanitizeForDisplay()` function
    - Array input validation (200 char max, special char filtering)
    - Error sanitization (no internal details exposed)
  - **UI/UX**:
    - Edit buttons added to ChefTable and RestaurantTable (copper accent)
    - Sticky save bar with unsaved changes indicator
    - "View Live" link to public page
    - Organized sections: Identity, Biography, Media, Accolades, etc.
  - **Code Quality**:
    - Reviewed by code-reviewer subagent (3 critical issues fixed)
    - All TypeScript type checks passing
    - 11 files, +1,386 lines
  - **Commit**: `b241a52 feat: Phase 1 admin panel entity editors`
  - **Status**: ✅ Shipped and production-ready

## Next Steps
1. **Test Admin Panel Editors** (IMMEDIATE):
   - Test chef editor: navigate to `/admin/manage`, click Edit on a chef
   - Test restaurant editor: click Edit on a restaurant
   - Verify all fields save correctly
   - Check XSS protection works (try entering `<script>alert('test')</script>` in name)

2. **Deploy Performance Blurbs**:
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