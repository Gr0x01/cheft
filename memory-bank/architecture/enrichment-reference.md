---
Last-Updated: 2025-12-07
Maintainer: RB
Status: Active
---

# Enrichment System: Quick Reference

## What It Is

LLM-powered data discovery system for chef/restaurant enrichment. 19-file service architecture (5 services, 4 repos, 4 workflows, 4 utils).

## Location

**Entry Point:** `scripts/ingestion/processors/llm-enricher.ts` - `createLLMEnricher(supabase, config)`

**Structure:**
```
scripts/ingestion/enrichment/
├── services/     # Business logic (chef, restaurant, show, status, narrative)
├── repositories/ # Database access (chef, restaurant, show, city)
├── workflows/    # Multi-step operations (refresh, status sweep, partial update, manual add)
└── shared/       # Utilities (LLM client, token tracker, parser, retry)
```

## When to Use

| Task | Method | Read Source |
|------|--------|-------------|
| Add new chef | `workflows.manualChefAddition` | `workflows/manual-chef-addition.workflow.ts` |
| Refresh old data (90+ days) | `workflows.refreshStaleChef` | `workflows/refresh-stale-chef.workflow.ts` |
| Backfill TV shows | `enrichShowsOnly(chefId, name)` | `services/show-discovery-service.ts` |
| Check restaurant status | `workflows.restaurantStatusSweep` | `workflows/restaurant-status-sweep.workflow.ts` |
| Find restaurants | `enrichRestaurantsOnly(chefId, name, show)` | `services/restaurant-discovery-service.ts` |
| Generate narratives | `workflows.partialUpdate` (mode: chef/restaurant/city) | `workflows/partial-update.workflow.ts` |

## Setup

```typescript
import { createClient } from '@supabase/supabase-js';
import { createLLMEnricher } from './scripts/ingestion/processors/llm-enricher';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Use service role, not anon key
);

const enricher = createLLMEnricher(supabase, { 
  model: 'gpt-4o-mini'  // Uses hybrid search: gpt-4o-mini + gpt-4o-mini-search-preview
});
```

**Hybrid Search**: The enricher uses `gpt-4o-mini` as orchestrator with a `webSearch` tool that calls `gpt-4o-mini-search-preview`. This is 10x faster and 10x cheaper than the previous `gpt-5-mini` + Responses API approach. See `llm-models.md` for details.

## Available Methods

**Read:** `scripts/ingestion/processors/llm-enricher.ts` for current interface

**Single Operations:**
- `enrichChef(chefId, name, show, options?)` - Full enrichment
- `enrichRestaurantsOnly(chefId, name, show, options?)` - Restaurants only
- `enrichShowsOnly(chefId, name)` - TV shows only
- `verifyRestaurantStatus(id, name, chef, city, state?)` - Status check
- `generateChefNarrative(id, name, bio, shows)` - Chef narrative
- `generateRestaurantNarrative(id, name, chef, cuisine)` - Restaurant narrative
- `generateCityNarrative(id, name, state, restaurants, chefs)` - City narrative

**Workflows:**
- `workflows.refreshStaleChef(input)` - Conditional refresh (bio/shows/restaurants/status)
- `workflows.restaurantStatusSweep(input)` - Batch status verification
- `workflows.partialUpdate(input)` - Single-concern updates
- `workflows.manualChefAddition(input)` - Full new chef pipeline

**Utilities:**
- `getTotalTokensUsed()` - Cumulative usage
- `getTotalCost()` - Estimated USD
- `resetTokens()` - Reset counter

## Key Concepts

**Services:** Single-purpose LLM operations (chef bio, restaurant discovery, show discovery, status verification, narratives)

**Repositories:** Database access layer (abstract all Supabase calls)

**Workflows:** Multi-step orchestration with cost limits, timeouts, rollback, step tracking

**Result Pattern:** All methods return `{ success: boolean, error?: string, ...data }`

## Query Database First

Always get IDs before enriching:

```typescript
// Get chef by name
const { data: chef } = await supabase
  .from('chefs')
  .select('id, name')
  .ilike('name', '%Chef Name%')
  .single();

// Get stale chefs
const { data: staleChefs } = await supabase
  .from('chefs')
  .select('id, name')
  .or('enriched_at.is.null,enriched_at.lt.2024-10-01')
  .limit(20);
```

## Handle Results

```typescript
const result = await enricher.enrichShowsOnly(chefId, chefName);

if (!result.success) {
  console.error('Failed:', result.error);
  return;
}

console.log(`Shows saved: ${result.showsSaved}`);
console.log(`Tokens: ${result.tokensUsed.total}`);
```

## Common Issues

1. **"Show name not found"** → Add mapping to `repositories/show-repository.ts` showNameMappings
2. **Permission errors** → Use `SUPABASE_SERVICE_ROLE_KEY` not anon key
3. **High costs** → Use workflow `scope` parameter to limit operations, or `dryRun: true`

## Read More

**Detailed Architecture:** `enrichment-system.md` - Deep dive, extending system, patterns, testing

**Design Patterns:** `patterns.md` - Repository, Service, Workflow, Facade patterns

**Example Scripts:** `scripts/enrich-all-chef-shows.ts`, `scripts/backfill-performance-blurbs.ts`

---

## External Data Sync (Non-LLM)

### Michelin Stars Reference

**Not LLM-based** - Wikipedia HTML scraper populates `michelin_restaurants` reference table which auto-syncs to `restaurants.michelin_stars`.

| Task | Command | Notes |
|------|---------|-------|
| Full scrape | `npm run michelin:scrape` | ~30 seconds, 66 Wikipedia pages worldwide |
| Dry run | `npm run michelin:scrape:dry-run` | Preview without DB changes |
| Manual sync | `SELECT * FROM sync_all_michelin_stars()` | Force re-sync to restaurants table |
| Check table | `npx tsx scripts/michelin/check-table.ts` | Verify table exists |

**Data Stats (Dec 2025):**
- 4,009 restaurants worldwide
- 195 ★★★ | 522 ★★ | 3,292 ★
- 66 countries/regions covered

**Auto-Sync Trigger:**
- On `michelin_restaurants` INSERT/UPDATE → matches `restaurants` by exact name + city
- Updates `restaurants.michelin_stars` automatically
- Handles state abbreviations (NY→New York, CA→California, etc.)
- Handles neighborhood names (Manhattan→New York state match)

**Files:**
```
supabase/migrations/030_michelin_reference_table.sql  # Table + sync functions
scripts/michelin/
├── scrape-wikipedia-michelin.ts  # Main scraper (66 pages)
├── check-table.ts                # Verify table exists
├── run-sync.ts                   # Manual sync trigger
└── check-matches.ts              # Debug matching issues
```

**Refresh Schedule:** Run yearly (~November) when Michelin announces new stars, or when adding new restaurants that might have stars.

**Integration with Restaurant Enrichment:** The Michelin sync is separate from LLM enrichment. When new restaurants are added via enrichment workflows, run `sync_all_michelin_stars()` to check for Michelin matches.

---

## Show Season Mappings

### The Problem

TV shows have multiple ways of identifying seasons:
- **Numbered seasons** (1, 2, 3...) - The actual production season
- **Named seasons** (California, Houston) - Location-based marketing names  
- **Variants** (All-Stars, World All-Stars) - Special editions, not regular numbered seasons

LLM may return either format. UI needs to display cleanly without duplication.

### Top Chef Season → Location Mapping

| Season | Location | Season | Location |
|--------|----------|--------|----------|
| 3 | Miami | 14 | Charleston |
| 6 | Las Vegas | 15 | Colorado |
| 9 | Texas | 16 | Kentucky |
| 10 | Seattle | 18 | Portland |
| 11 | New Orleans | 19 | Houston |
| 13 | California | 21 | Wisconsin |
| | | 22 | Destination Canada |

**Variants (NOT numbered seasons):** All-Stars (S8, S17), World All-Stars (S20), Holiday Special

### Tournament of Champions

Seasons 1-6 (2020-2025). One variant: All-Star Christmas.

### Code Locations

**Frontend display:** `src/app/shows/[slug]/ShowPageClient.tsx`
- `TOP_CHEF_SEASON_NAMES` record - displays `13 · California` format
- Filters `named_season` types out of variant tabs

**Ingestion:** `scripts/ingestion/enrichment/repositories/show-repository.ts`
- `showNameMap` routes LLM output variations to correct slugs

### When to Update

1. **New Top Chef season** → Add to `TOP_CHEF_SEASON_NAMES` in `ShowPageClient.tsx`
2. **New show** → Document here, add UI mapping if has named seasons
3. **Unknown show name from LLM** → Add to `showNameMap` in `show-repository.ts`
