---
Last-Updated: 2025-12-09
Maintainer: RB
Status: Maintenance Mode - Show Visibility Scoped
---

# Active Context: Chefs

## Current Status
- **Phase**: Maintenance Mode
- **Mode**: Content-focused operation
- **Focus**: Top Chef + Tournament of Champions only

## Recent Changes (Dec 9, 2025)

### Show Visibility Scope Reduction ✅
Reduced public shows from 86 to 19 - focusing only on properly parsed shows:
- **Top Chef** (core) + 13 named seasons + 3 variants
- **Tournament of Champions** (core) + 1 variant
- All other shows set to `is_public=false` (still tracked, just hidden from public UI)

**Reason**: Other shows (Chopped, Iron Chef, etc.) have chefs only due to overlap, not comprehensive parsing. Will re-enable when properly harvested.

### Admin Cascade Toggle ✅
Added family visibility toggle to `/admin/shows`:
- Blue "Users2" icon appears next to parent shows with children
- Clicking toggles `is_public` for parent + all child shows at once
- Confirmation dialog shows affected child count
- API: `cascade_visibility: true` flag in update route

### Season Names UI Cleanup ✅
Fixed duplicate UI showing both named seasons (California, Charleston) AND numbered seasons (13, 14):
- **Season pills now show names**: `13 · California` format for Top Chef
- **Variant tabs filtered**: Only shows actual variants (All-Stars, World All-Stars), not named_season types
- **Hardcoded mapping** in `ShowPageClient.tsx` - `TOP_CHEF_SEASON_NAMES` record
- Top Chef is annual so mapping is stable; update when new seasons air

---

## Show Hierarchy Project ✅ (Completed Dec 9, 2025)

All 9 phases complete:
- Database schema with parent_show_id, show_type, is_public
- Data cleanup: parent-child relationships set
- Ingestion: auto-create non-public shows
- Frontend: show pages with variant tabs, chef pages gray out non-public
- Admin UI: full show management with cascade toggle
- Filters: dropdown shows only public parents, expands to include children

### Project Doc: `memory-bank/projects/show-hierarchy-project.md`

---

## Current Data Summary
- **Chefs**: 238 total (100% bios, 88% photos)
- **Restaurants**: 560 locations (100% Google Places, 72% photos)
- **Cities**: 162 city pages
- **States**: Full US state coverage
- **Countries**: International coverage
- **Public Shows**: 19 (Top Chef + TOC families only)
- **Hidden Shows**: ~142 (tracked but not public-facing)

## Infrastructure Status
- **Production**: Live on Vercel
- **Database**: Supabase PostgreSQL
- **Analytics**: PostHog with session replay
- **Enrichment**: Tavily hybrid + OpenAI LLM

## No Current Blockers

## Deferred/Future Work
1. **Re-enable Other Shows** - Harvest Chopped, Iron Chef, etc. properly then enable
2. **Merge Duplicate Shows** - Part of Phase 6, deferred
3. **Multi-Show UI Display** - Better UI for chefs with many TV appearances
4. **Duplicate Chef Detection** - Migration ready but not deployed
5. **SEO Backfill Script** - Auto-generated descriptions for all pages

## Key Files Reference
- Show hierarchy: `supabase/migrations/037_show_hierarchy.sql`
- Admin shows: `src/app/admin/(protected)/shows/`
- API route: `src/app/api/admin/shows/update/route.ts` (cascade_visibility support)
- Frontend show pages: `src/app/shows/[slug]/`
- Tooltip component: `src/components/ui/Tooltip.tsx`
