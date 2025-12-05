---
Last-Updated: 2025-12-05
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
  model: 'gpt-5-mini'  // DO NOT change model names without authorization
});
```

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
