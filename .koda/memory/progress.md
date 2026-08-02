---
name: progress
description: shipped-milestone log — what landed and when
Last-Updated: 2026-08-02
Maintainer: RB
Status: Phase 3 Complete
---

# Progress Log: TV Chef Map

## Project Timeline

**Phases 0-2 (Nov 2025)**: Setup → MVP → SEO Pages. Foundation complete, deployed to Vercel.

**Phase 3 (Dec 2025)**: User engagement & admin tools. ✅ COMPLETE

## Key Milestones

| # | Name | Date | Status |
|---|------|------|--------|
| 1 | Database Foundation | Nov 30 | ✅ 311 restaurants, 180 chefs imported |
| 2 | SEO Pages Launch | Dec 1 | ✅ Chef/restaurant pages live |
| 3 | City Pages & Linking | Dec 2 | ✅ 652+ pages with internal links |
| 4 | Admin Panel | Dec 2 | ✅ Data management + enrichment |
| 5 | Production Launch | Dec 3 | ✅ Vercel deployment live |
| 6 | Enrichment Refactor | Dec 5 | ✅ 19-file service architecture |
| 7 | Full Re-enrichment | Dec 6 | ✅ 238 chefs refreshed ($39.43) |
| 8 | PostHog Analytics | Dec 7 | ✅ Session replay + custom events |
| 9 | Geographic Pages | Dec 7 | ✅ States + Countries navigation |
| 10 | Tavily Enrichment | Dec 7 | ✅ Hybrid web search system |
| 11 | Admin Shows Page | Dec 8 | ✅ Harvest trigger for show data |
| 12 | Top Chef Charlotte (S23) | Mar 14 | ✅ 15 chefs + 15 restaurants enriched |
| 13 | Restaurant Photo Self-Hosting | Jun 12 | ✅ ~1,190 repaired, 0 expired URLs; photos now in Supabase storage |
| 14 | SEO Recovery | Aug 2 | ✅ Crawlability, thin-content thresholds, 313 redirects, 478 orphaned restaurants given city pages — see [[seo-recovery]] |
| 15 | Homepage Performance | Aug 2 | ✅ 45.9MB API payload → 2.5MB; Lighthouse desktop 68 → 96, mobile 39 → ~74-80 |

## Current Status (counted from the database 2026-08-02)

**Production Site**: Live on Vercel
- 458 chefs (13% photos — 6 accent-duplicate profiles merged Aug 2)
- 1,293 public restaurants (100% Google Places data, 96% photos)
- 414 city rows, **101 indexable** (≥3 restaurants)
- 51 state rows, **40 indexable**
- 36 country rows, **17 indexable**
- 75 public shows (192 total in the database)
- Sitemap: **2,159 URLs**
- Full admin panel with entity editors, enrichment tools, show management

The gap between rows and indexable pages is deliberate: locations below three restaurants are
`noindex, follow` so they stay crawlable without adding thin pages. See [[seo-recovery]].

Earlier revisions of this file claimed 238 chefs at 88% photo coverage. The roster
has since roughly doubled through show enrichment runs, and photo coverage did not
keep pace — see [[active-context]].

**Tech Stack**: Next.js 16, Supabase, Tailwind CSS, Leaflet maps, PostHog analytics, Schema.org SEO

**Enrichment**: Tavily hybrid + OpenAI LLM with staging/review workflow

## Phase 3 Deliverables (All Complete)

1. ✅ **Unified Entity Editors** - Full-page editors for chefs/restaurants
2. ✅ **Performance Blurbs** - TV show appearance narratives
3. ✅ **Multi-Show Discovery** - Hybrid model finds all TV appearances
4. ✅ **Photo Fallback UI** - Instagram links, initials for missing photos
5. ✅ **Enrichment Admin UI** - Budget tracking, manual triggers
6. ✅ **Scheduled Cron Jobs** - Monthly refresh, weekly status checks
7. ✅ **N+1 Query Elimination** - 95% database query reduction
8. ✅ **Show/Season SEO Pages** - 60+ new indexable pages
9. ✅ **Michelin Reference System** - 4,009 restaurants from Wikipedia
10. ✅ **PostHog Analytics** - Session replay, custom events
11. ✅ **Geographic Navigation** - State and country pages
12. ✅ **Tavily Hybrid Enrichment** - Web search + LLM staging
13. ✅ **Admin Shows Page** - Harvest trigger for show data

(Detailed phase histories archived in `archive/`)
