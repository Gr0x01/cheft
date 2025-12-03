---
Last-Updated: 2025-12-03
Maintainer: RB
Status: Phase 3 Complete - Phase 4 Enrichment Admin UI Complete
---

# Active Context: Chefs

## Current Sprint Goals
- **Sprint**: User Engagement & Community Features
- **Duration**: 1-2 weeks
- **Focus**: Add contribution system, data verification, and chef show attribution

### Primary Objectives (Phase 3: Community Engagement)
1. **Contribution System**:
   - Add "Suggest a Chef" form on chef directory page
   - Add "Suggest a Restaurant" form on restaurant pages (linked to chef)
   - Create admin review queue for community submissions
   
2. **Data Verification UI**:
   - Add thumbs up/down buttons on chef pages (triggers verification check)
   - Add thumbs up/down buttons on restaurant pages (status/info validation)
   - Create admin dashboard showing items flagged for review
   
3. **Show Attribution Badges**:
   - Add visual badges on chef cards/pages ("Top Chef S4", "Iron Chef", etc.)
   - Add filter by show/TV personality on chef directory
   - Enhance Schema.org awards markup for SEO

### Secondary Objectives
- Improve mobile responsiveness for new UI elements
- Add analytics tracking for user engagement
- Create user feedback loop documentation

## Current Blockers
- None

## In Progress
- Planning contribution and verification systems

## Recently Completed (Dec 3, 2025)
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
1. **Phase 3 Implementation** (Priority):
   - Design and implement chef/restaurant suggestion forms
   - Add thumbs up/down verification UI to pages
   - Create database schema for user contributions and verification flags
   - Build admin review workflows for community input
   - Implement show attribution badge system
   
2. **Data Quality** (Ongoing):
   - User manually adding chefs via admin interface
   - Run enrichment on newly added chefs as needed
   - Monitor and respond to user verification signals
   
3. **Optional Polish**:
   - City directory index page `/cities`
   - Remaining 22 chef photos (88% complete)
   - Enhanced mobile optimizations

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