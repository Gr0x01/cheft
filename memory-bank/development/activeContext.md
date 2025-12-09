---
Last-Updated: 2025-12-09
Maintainer: RB
Status: Show Hierarchy Project - COMPLETE
---

# Active Context: Chefs

## Current Status
- **Phase**: Show Hierarchy Project - COMPLETE
- **Mode**: Maintenance mode
- **Focus**: Bug fixes, content expansion

## Show Hierarchy Project - COMPLETE

### All Phases Complete
- **Phase 1**: Database Schema ✅
- **Phase 2**: Data Cleanup ✅
- **Phase 3**: Ingestion Pipeline ✅
- **Phase 4**: TypeScript Types ✅
- **Phase 5**: Frontend - Show Pages ✅
- **Phase 6**: Admin UI ✅ (Dec 9)
- **Phase 7**: Frontend - Chef Pages ✅ (Dec 9)
- **Phase 8**: Frontend - Filters ✅ (Dec 9)
- **Phase 9**: Validation ✅ (Dec 9)

### Phase 8 Summary (Frontend Filters)
- `/chefs` dropdown now shows only public parent shows
- Selecting a parent show includes chefs from all child shows
- Chef counts aggregate parent + children
- Files: `page.tsx`, `ChefsPageClient.tsx`, `ChefFilters.tsx`

### Project Doc: `memory-bank/projects/show-hierarchy-project.md`

---

## Recently Completed (Dec 9, 2025)

### Show Hierarchy Phase 5 & 6 ✅
- **Phase 5**: Frontend show pages with variant tabs, parent breadcrumbs
- **Phase 6**: Admin UI for managing show hierarchy

### Key Changes
- `get_shows_with_counts()` - Only returns public parent shows
- `get_show_with_chef_counts()` - Aggregates chefs from child shows
- `get_show_children()` - New RPC for variant tabs
- `/shows/[slug]` - Variant tabs for core shows, parent breadcrumbs for variants
- `/admin/shows` - Full show management with hierarchy editing

---

## Current Data Summary
- **Chefs**: 238 total (100% bios, 88% photos)
- **Restaurants**: 560 locations (100% Google Places, 72% photos)
- **Cities**: 162 city pages
- **States**: Full US state coverage
- **Countries**: International coverage
- **Shows**: ~160 shows (mix of public/non-public, core/variant types)

## Infrastructure Status
- **Production**: Live on Vercel
- **Database**: Supabase PostgreSQL
- **Analytics**: PostHog with session replay
- **Enrichment**: Tavily hybrid + OpenAI LLM

## No Current Blockers

## Deferred/Future Work
1. **Merge Duplicate Shows** - Part of Phase 6, deferred
2. **Multi-Show UI Display** - Better UI for chefs with many TV appearances
3. **Duplicate Chef Detection** - Migration ready but not deployed
4. **SEO Backfill Script** - Auto-generated descriptions for all pages

## Key Files Reference
- Show hierarchy: `supabase/migrations/037_show_hierarchy.sql`
- Admin shows: `src/app/admin/(protected)/shows/`
- API route: `src/app/api/admin/shows/update/route.ts`
- Frontend show pages: `src/app/shows/[slug]/`
- Tooltip component: `src/components/ui/Tooltip.tsx`
