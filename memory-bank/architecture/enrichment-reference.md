---
Last-Updated: 2025-12-10
Maintainer: RB
Status: Active
---

# Enrichment System: Quick Reference

## What It Is

LLM-powered data discovery system for chef/restaurant enrichment. Uses Wikipedia cache for show data, Tavily for chef-specific searches, and tiered LLM synthesis (accuracy vs creative).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WIKIPEDIA CACHE (Static Show Data)                     │
│  show_source_cache table → fetched once per show, never expires            │
│  Contains: all contestants, seasons, results, restaurants                   │
│  Cost: $0 (direct Wikipedia API)                                            │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SEARCH LAYER (Tavily)                             │
│  Chef-specific searches only (bio, restaurants) → search_cache (TTL)       │
│  Cost: ~$0.01 per query                                                     │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │     search_cache      │
                          │     (PostgreSQL)      │
                          │  - query_hash (key)   │
                          │  - results (jsonb)    │
                          │  - expires_at (TTL)   │
                          └───────────┬───────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
              ▼                                               ▼
┌─────────────────────────────┐               ┌─────────────────────────────┐
│     TIER 1: ACCURACY        │               │     TIER 2: CREATIVE        │
│  gpt-4o-mini (always)       │               │  Local Qwen3 /no_think      │
│                             │               │  Fallback: gpt-4o-mini      │
│  Used for:                  │               │                             │
│  - Chef bios (facts)        │               │  Used for:                  │
│  - Show discovery (names)   │               │  - Blurbs (prose)           │
│  - Restaurant ownership     │               │  - Status (classification)  │
│                             │               │  - Narratives (prose)       │
│  Cost: ~$0.002-0.005/call   │               │  Cost: $0 local             │
└─────────────────────────────┘               └─────────────────────────────┘
```

## Location

**Entry Point:** `scripts/ingestion/processors/llm-enricher.ts` - `createLLMEnricher(supabase, config)`

**Structure:**
```
scripts/ingestion/enrichment/
├── services/         # Business logic
│   ├── chef-bio-service.ts
│   ├── show-discovery-service.ts
│   ├── show-source-service.ts      # Wikipedia cache for shows
│   ├── restaurant-discovery-service.ts
│   ├── blurb-enrichment-service.ts
│   ├── status-verification-service.ts
│   ├── show-description-service.ts
│   └── narrative-service.ts
├── repositories/     # Database access
│   ├── chef-repository.ts
│   ├── restaurant-repository.ts
│   ├── show-repository.ts
│   └── city-repository.ts
├── workflows/        # Multi-step operations
│   ├── base-workflow.ts
│   ├── manual-chef-addition.workflow.ts
│   ├── refresh-stale-chef.workflow.ts
│   ├── partial-update.workflow.ts
│   └── restaurant-status-sweep.workflow.ts
└── shared/           # Utilities
    ├── search-client.ts      # Tavily wrapper with typed queries
    ├── synthesis-client.ts   # Tiered LLM synthesis
    ├── tavily-client.ts      # Raw Tavily API + caching
    ├── token-tracker.ts
    ├── result-parser.ts
    ├── season-parser.ts
    └── retry-handler.ts
```

## When to Use

| Task | Method | Source File |
|------|--------|-------------|
| Add new chef | `workflows.manualChefAddition` | `manual-chef-addition.workflow.ts` |
| Add show with contestants | `add-show.ts --config` | Uses Wikipedia cache for all chefs |
| Refresh old data | `workflows.refreshStaleChef` | `refresh-stale-chef.workflow.ts` |
| Backfill TV shows | `enrichShowsOnly(chefId, name)` | `show-discovery-service.ts` |
| Check restaurant status | `workflows.restaurantStatusSweep` | `restaurant-status-sweep.workflow.ts` |
| Find restaurants | `findAndSaveRestaurants(...)` | `restaurant-discovery-service.ts` |
| Generate narratives | `workflows.partialUpdate` | `partial-update.workflow.ts` |
| Generate show SEO | `generateShowDescription(...)` | `show-description-service.ts` |
| Fetch show Wikipedia | `ShowSourceService.getOrFetchShowSource()` | `show-source-service.ts` |

## Setup

```typescript
import { createClient } from '@supabase/supabase-js';
import { createLLMEnricher } from './scripts/ingestion/processors/llm-enricher';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Use service role
);

const enricher = createLLMEnricher(supabase, { 
  model: 'gpt-4o-mini'  // Accuracy tier model
});
```

## Tiered Synthesis

The system uses two tiers for LLM synthesis:

**Accuracy Tier** (`gpt-4o-mini`):
- Used for facts that must be correct
- Chef bios, show names/seasons, restaurant ownership
- Always uses OpenAI

**Creative Tier** (Local Qwen3 → fallback to OpenAI):
- Used for prose generation
- Blurbs, narratives, status classification
- Uses local LLM if available (`LM_STUDIO_URL`), otherwise falls back to OpenAI

```typescript
import { synthesize, synthesizeRaw } from './shared/synthesis-client';

// Structured output with schema validation
const result = await synthesize('accuracy', systemPrompt, userPrompt, zodSchema);

// Raw text output
const result = await synthesizeRaw('creative', systemPrompt, userPrompt);
```

## Search Client

All web searches go through Tavily with automatic caching:

```typescript
import { searchBio, searchShows, searchRestaurants } from './shared/search-client';

// Typed search functions
const bioResults = await searchBio(chefName, chefId);
const showResults = await searchShows(chefName, chefId);
const restaurantResults = await searchRestaurants(chefName, chefId);

// Combine results for LLM context
import { combineSearchResultsCompact } from './shared/search-client';
const context = combineSearchResultsCompact(results, 12000);
```

**Cache TTLs:**
- Wikipedia show cache: **Never expires** (static after season ends)
- Chef data: 90 days
- Restaurant data: 30 days
- Show data: 180 days
- Status checks: 7 days

## Available Methods

**Single Operations:**
- `enrichChefBioOnly(chefId, name, show, options?)` - Bio enrichment
- `enrichRestaurantsOnly(chefId, name, show, options?)` - Restaurant discovery
- `enrichShowsOnly(chefId, name)` - TV shows only
- `verifyRestaurantStatus(id, name, chef, city, state?, placeId?)` - Status check
- `enrichChefNarrative(id, context)` - Chef narrative
- `enrichRestaurantNarrative(id, context)` - Restaurant narrative
- `enrichCityNarrative(id, context)` - City narrative
- `generateShowDescription(showId, name, network)` - Show SEO
- `generateSeasonDescription(showId, season, context)` - Season SEO

**Workflows:**
- `workflows.manualChefAddition(input)` - Full new chef pipeline
- `workflows.refreshStaleChef(input)` - Conditional refresh (bio/shows/restaurants/status)
- `workflows.restaurantStatusSweep(input)` - Batch status verification
- `workflows.partialUpdate(input)` - Single-concern updates

**Utilities:**
- `getTotalTokensUsed()` - Cumulative usage
- `estimateCost()` - Estimated USD
- `resetTokenCounter()` - Reset counter
- `getSynthesisTierInfo()` - Get active models/tier info

## Result Pattern

All methods return `{ success: boolean, error?: string, ...data }`:

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
4. **Local LLM not used** → Set `LM_STUDIO_URL` env var, ensure model is loaded

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional (for local LLM)
LM_STUDIO_URL=http://10.2.0.10:1234
```

## Cost Model

**Flex Tier Active**: All OpenAI calls use Flex pricing (50% off standard) via `X-Model-Tier: flex` header.

### With Wikipedia Cache + Flex (Current)
Per show import using `add-show.ts`:
- Wikipedia fetch: $0 (direct API, no LLM)
- Per chef (bio + restaurants + shows from cache): ~$0.015-0.02
- **Total for 28-chef show: ~$0.42-0.56**

### Without Optimizations (Legacy)
Per chef (full enrichment, standard pricing):
- Bio search + synthesis: ~$0.012
- Shows (4 queries): ~$0.023
- Restaurants (4 queries): ~$0.025
- Blurbs (creative, local): ~$0.01 (or $0 if local)
- **Total: ~$0.06-0.07 per chef**
- **Total for 28-chef show: ~$1.68-1.96**

**Combined savings (Wikipedia cache + Flex): ~75%**

---

## External Data Sync (Non-LLM)

### Michelin Stars Reference

**Not LLM-based** - Wikipedia HTML scraper populates `michelin_restaurants` reference table.

| Task | Command |
|------|---------|
| Full scrape | `npm run michelin:scrape` |
| Dry run | `npm run michelin:scrape:dry-run` |
| Manual sync | `SELECT * FROM sync_all_michelin_stars()` |

**Files:**
```
supabase/migrations/030_michelin_reference_table.sql
scripts/michelin/scrape-wikipedia-michelin.ts
```

---

## Wikipedia Show Cache

### How It Works
1. `add-show.ts` fetches Wikipedia once per show via `ShowSourceService`
2. Content is cached in `show_source_cache` table (never expires)
3. Wikipedia context is passed to each chef's enrichment workflow
4. Show discovery uses cached context instead of Tavily searches

### ShowSourceService API
```typescript
import { ShowSourceService } from './ingestion/enrichment/services/show-source-service';

const showSourceService = new ShowSourceService(supabase);

// Get cached or fetch fresh
const showSource = await showSourceService.getOrFetchShowSource('top-chef-masters');
// Returns: { showSlug, wikipediaUrl, wikipediaContent, contestants[], fetchedAt }

// Build context for LLM
const context = showSourceService.buildContextForLLM(showSource, chefName);
```

### Supported Shows
Wikipedia URLs configured in `show-source-service.ts`:
- `top-chef`, `top-chef-masters`, `tournament-of-champions`
- `iron-chef-america`, `hells-kitchen`, `masterchef`
- `chopped`, `the-bear`, `chefs-table`

To add a show, add entry to `WIKIPEDIA_SHOW_URLS` in `show-source-service.ts`.

---

## Read More

- **Detailed Architecture:** `memory-bank/projects/enricher-v2.md`
- **Design Patterns:** `memory-bank/architecture/patterns.md`
- **Main Script:** `scripts/add-show.ts`
