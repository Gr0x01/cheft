---
Last-Updated: 2025-12-09
Maintainer: RB
Status: Complete
---

# Enricher V2: Tavily + Tiered Synthesis

## Problem Statement

The current enrichment system has two disconnected flows:
1. **Flow A (broken)**: `add-show.ts` → services → `LLMClient.generateWithWebSearch()` → tries to give local Qwen3 web tools it can't use
2. **Flow B (works separately)**: `harvest-tavily-cache.ts` → cache → `extract-from-cache.ts` → OpenAI synthesis

When local LLM is enabled, `llm-client.ts:61-69` auto-switches to it, but the local model gets the same `webSearch` tool that calls `gpt-4o-search-preview`. Local models can't invoke external tools.

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SEARCH LAYER (Tavily)                             │
│  All web searches go through Tavily API → cached in search_cache table      │
│  Cost: ~$0.01-0.02 per query set                                            │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │     search_cache      │
                          │     (PostgreSQL)      │
                          │  - query_hash (key)   │
                          │  - results (jsonb)    │
                          │  - expires_at         │
                          └───────────┬───────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
              ▼                                               ▼
┌─────────────────────────────┐               ┌─────────────────────────────┐
│     TIER 1: ACCURACY        │               │     TIER 2: CREATIVE        │
│  gpt-5-mini (always)        │               │  Local Qwen3 (if avail)     │
│                             │               │  Fallback: gpt-5-mini       │
│  Used for:                  │               │                             │
│  - Chef bios (facts)        │               │  Used for:                  │
│  - Show discovery (names)   │               │  - Blurbs (prose)           │
│  - Restaurant ownership     │               │  - Status (classification)  │
│                             │               │  - Narratives (prose)       │
│  Cost: ~$0.002-0.005/call   │               │  Cost: $0 local             │
└─────────────────────────────┘               └─────────────────────────────┘
```

## File Inventory

### New Files to Create
- `scripts/ingestion/enrichment/shared/search-client.ts` - Unified Tavily wrapper
- `scripts/ingestion/enrichment/shared/synthesis-client.ts` - Tiered synthesis

### Files to Update
| File | Change |
|------|--------|
| `shared/llm-client.ts` | Deprecate, replace with synthesis-client |
| `shared/local-llm-client.ts` | Merge into synthesis-client |
| `shared/tavily-client.ts` | Keep as-is, wrap in search-client |
| `services/chef-bio-service.ts` | Use search-client + synthesis-client |
| `services/show-discovery-service.ts` | Use search-client + synthesis-client |
| `services/restaurant-discovery-service.ts` | Use search-client + synthesis-client |
| `services/blurb-enrichment-service.ts` | Use search-client + synthesis-client (creative tier) |
| `services/status-verification-service.ts` | Use search-client + synthesis-client (creative tier) |
| `services/narrative-service.ts` | Use synthesis-client only (no search needed) |
| `processors/llm-enricher.ts` | Update to use new clients |

### Files to Archive
- `scripts/harvest-tavily-cache.ts` → logic moves to search-client
- `scripts/extract-from-cache.ts` → logic moves to services

## Service-by-Service Breakdown

### ChefBioService
**Search queries:**
```
"${chefName} chef biography Wikipedia James Beard Michelin star awards"
```
**Synthesis tier:** ACCURACY (gpt-5-mini)
**Output:** `{ miniBio, jamesBeardStatus, notableAwards }`

### ShowDiscoveryService
**Search queries:**
```
"${chefName} Top Chef"
"${chefName} Tournament of Champions"
"${chefName} TV cooking shows"
"${chefName} Food Network appearances"
```
**Synthesis tier:** ACCURACY (gpt-5-mini)
**Output:** `[{ showName, season, result }]`

### RestaurantDiscoveryService
**Search queries:**
```
"${chefName} restaurant"
"${chefName} owns restaurant"
"${chefName} opened restaurant"
"${chefName} chef owner"
```
**Synthesis tier:** ACCURACY (gpt-5-mini)
**Output:** `{ restaurants: [{ name, city, state, ownership, status, ... }] }`

### BlurbEnrichmentService
**Search queries:**
```
"${chefName} ${showName} Season ${season} performance"
```
**Synthesis tier:** CREATIVE (local Qwen3)
**Output:** `[{ showName, season, performanceBlurb }]`

### StatusVerificationService
**Search queries:**
```
"${restaurantName} ${city} restaurant open closed status 2024 2025"
```
**Synthesis tier:** CREATIVE (local Qwen3)
**Output:** `{ status, confidence, reason }`

### NarrativeService
**Search queries:** None (uses existing DB data)
**Synthesis tier:** CREATIVE (local Qwen3)
**Output:** `{ narrative: string }`

## Cost Model

### Per Chef (Full Enrichment)
| Component | Search | Synthesis | Total |
|-----------|--------|-----------|-------|
| Bio | $0.01 | $0.002 | $0.012 |
| Shows (4 queries) | $0.02 | $0.003 | $0.023 |
| Restaurants (4 queries) | $0.02 | $0.005 | $0.025 |
| Blurbs | $0.01 | $0 (local) | $0.01 |
| **Subtotal** | **$0.06** | **$0.01** | **$0.07** |

### Comparison
| Scenario | Current | New |
|----------|---------|-----|
| With OpenAI web search | ~$0.06-0.10 | - |
| With Tavily + gpt-5-mini | - | ~$0.07 |
| With Tavily + local synthesis | - | ~$0.06 |

## Implementation Phases

### Phase 1: Foundation ✓
- [x] Create project doc
- [x] Create `search-client.ts`

### Phase 2: Synthesis Client ✓
- [x] Create `synthesis-client.ts`
- [x] Tiered dispatch (accuracy vs creative)
- [x] Local LLM detection and fallback

### Phase 3: Update Services ✓
- [x] ChefBioService
- [x] ShowDiscoveryService
- [x] RestaurantDiscoveryService
- [x] BlurbEnrichmentService
- [x] StatusVerificationService (+ Google Places priority)
- [x] NarrativeService

### Phase 4: Consolidate ✓
- [x] Update llm-enricher.ts facade
- [x] Update 4 workflows (removed LLMClient dependency)
- [x] add-show.ts works with new system

### Phase 5: Testing ✓
- [x] Type-check passes
- [x] Integration test with add-show.ts (end-to-end)
- [ ] Unit tests for new clients (future)
- [ ] Cost verification (future)

## API Design

### SearchClient

```typescript
interface SearchClient {
  // Individual query types
  searchBio(chefName: string, chefId?: string): Promise<SearchResult>;
  searchShows(chefName: string, chefId?: string): Promise<SearchResult>;
  searchRestaurants(chefName: string, chefId?: string): Promise<SearchResult>;
  searchBlurbDetails(chefName: string, showName: string, season?: string): Promise<SearchResult>;
  searchStatus(restaurantName: string, city: string, restaurantId?: string): Promise<SearchResult>;
  
  // Batch operations
  harvestChef(chefName: string, chefId: string): Promise<HarvestResult>;
  
  // Cache management
  getCacheStats(): Promise<CacheStats>;
  invalidateCache(entityType: string, entityId: string): Promise<number>;
}

interface SearchResult {
  query: string;
  results: TavilyResult[];
  fromCache: boolean;
  cachedAt?: Date;
}
```

### SynthesisClient

```typescript
type SynthesisTier = 'accuracy' | 'creative';

interface SynthesisClient {
  synthesize<T>(
    tier: SynthesisTier,
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodSchema<T>,
    searchContext?: SearchResult[]
  ): Promise<SynthesisResult<T>>;
  
  // Status
  isLocalAvailable(): Promise<boolean>;
  getActiveTier(tier: SynthesisTier): string; // Returns actual model used
}

interface SynthesisResult<T> {
  data: T;
  model: string;
  isLocal: boolean;
  usage: TokenUsage;
}
```

## Migration Notes

### Backward Compatibility
- Keep `llm-enricher.ts` facade API unchanged
- Existing scripts continue to work
- Internal implementation changes only

### Breaking Changes
- `LLMClient.generateWithWebSearch()` deprecated
- Services no longer need LLMClient constructor param
- Token tracking unified through synthesis-client

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Local LLM quality varies | Fallback to gpt-4o-mini if output fails validation |
| Cache staleness | TTL per query type (bio: 90d, status: 7d) |
| Tavily rate limits | Batch with delays, cache aggressively |
| Schema validation fails | Retry with clearer prompt, fall back to accuracy tier |

## Code Review Findings (Dec 9, 2025)

### Critical (Must Fix)
1. **API key in request body** - Tavily API key sent in body instead of header (tavily-client.ts:113-120). Note: This is Tavily's API design, may not be changeable.
2. **Unsafe type assertion** - `undefined as unknown as T` in synthesis error path (synthesis-client.ts:199). Make `data` optional in result type.

### Warnings (Should Fix)
1. **Cache insert error handling** - No try-catch around cache inserts (tavily-client.ts:75-86)
2. **Race condition** - Concurrent local LLM availability checks (synthesis-client.ts:72-91)
3. **Inefficient loop** - combineSearchResultsCompact continues after hitting length limit (search-client.ts:194-210)

### Suggestions (Nice to Have)
1. Duplicate prompt logic across service methods - extract to shared helper
2. Hardcoded console.log - inject logger interface for testability
3. Magic strings for model names - use constants
4. No fallback for total Tavily failure - consider degraded mode

### Architecture Recommendations
1. Add rate limiting for external APIs
2. Add health check service for monitoring
3. Implement batch processing framework for parallel operations
4. Add structured logging with correlation IDs

### Positive Aspects
- Clean separation of concerns ✅
- Proper caching strategy with TTL ✅
- Comprehensive error handling in services ✅
- Type safety with Zod schemas ✅
- Intelligent model selection with fallback ✅
- Overall Grade: A-

## Open Questions

1. Should narratives use any web search, or purely DB context? → Decision: No search, use DB context only
2. Cache TTL per query type - are current values right? → bio: 90d, status: 7d seems reasonable
3. Should we pre-warm cache for all chefs before running enrichment? → Future enhancement
