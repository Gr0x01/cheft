---
Last-Updated: 2025-12-09
Maintainer: RB
Status: Complete
---

# Project: Tavily Hybrid Enrichment System

## Overview

Replace expensive OpenAI Responses API with a tiered hybrid approach:
- **Tier 0**: Search cache (avoid repeated API calls)
- **Tier 1**: Tavily for web search (pay-as-you-go $0.008/search)
- **Tier 2**: gpt-5-mini for structured extraction ($)
- **Tier 3**: Local Qwen 3 8B for synthesis (free)

## Goals

1. Reduce enrichment costs from ~$40 to ~$1.50 per full run
2. Enable offline/batch processing with cached search data
3. Add staging layer to prevent uncontrolled data explosion
4. Admin UI for reviewing discoveries before they hit production

## Architecture

```
[Chef Name]
     ↓
[Check search_cache] → miss → [Tavily Search] → [Cache Results]
     ↓ hit
[gpt-5-mini Extract] → [pending_discoveries] (staging)
     ↓
[Admin Review UI]
     ↓ approve
[Production: shows → chefs → restaurants]
```

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Show handling | Stage everything (B) | Approval triggers cascade to chefs/restaurants |
| Season ranges | Year field (B) | `season` for Top Chef S11, `year` for GGG 2021 |
| Local LLM | Everything with fallback (C) | Use 4080 when available, OpenAI backup |
| Tavily pricing | Pay-as-you-go | $0.008/credit, ~$12 for full harvest vs $30/mo plan |
| Query depth | Expanded (4 queries/chef) | Better data coverage worth the cost |

---

## Query Strategy

### Tavily Pricing
- **Pay-as-you-go**: $0.008/credit (1 credit = 1 search)
- **Project plan**: $30/mo for 4,000 credits (only if regular refreshes needed)

### Query Set (4 per chef + 1 per restaurant)

| Query | Purpose | Data Extracted |
|-------|---------|----------------|
| `{name} chef TV shows Top Chef Iron Chef winner finalist season` | TV appearances | Shows, seasons, roles, competition results |
| `{name} chef biography Wikipedia James Beard Michelin star awards` | Bio & accolades | Wikipedia summary, awards, achievements |
| `{name} chef restaurants owner executive chef partner locations` | Restaurant list | Names, cities, ownership type |
| `{restaurant} {city} restaurant open closed menu cuisine price` | Restaurant details | Status, cuisine, price range |

### Extraction Schemas

**Shows Extraction:**
```json
{
  "shows": [{
    "name": "Top Chef",
    "season": 11,
    "year": null,
    "role": "contestant",
    "result": "winner/finalist/eliminated",
    "performance_note": "Won Restaurant Wars"
  }]
}
```

**Bio Extraction:**
```json
{
  "bio_summary": "2-3 sentence bio",
  "awards": ["James Beard 2019", "Michelin Star"],
  "cookbooks": ["Title 1", "Title 2"],
  "training": "CIA, worked under Thomas Keller"
}
```

**Restaurant Extraction:**
```json
{
  "restaurants": [{
    "name": "Restaurant Name",
    "city": "City",
    "state": "State",
    "ownership": "owner/partner/executive_chef/former",
    "status": "open/closed/unknown",
    "cuisine": "Italian",
    "price_range": "$$$/$$$$"
  }]
}
```

### Cost Projections

| Scenario | Queries | Credits | Cost |
|----------|---------|---------|------|
| Initial harvest (293 chefs) | 3/chef | 879 | $7.03 |
| + Restaurant details (~500) | 1/restaurant | 500 | $4.00 |
| **Total initial** | - | ~1,400 | **~$11.20** |
| Monthly refresh (50 chefs) | 4/chef | 200 | $1.60 |

---

## Phase 1: Infrastructure ✅ COMPLETE

### 1.1 Search Cache Table
- [x] Migration `034_search_cache_table.sql`
- [x] Indexes for fast lookup by hash and entity

### 1.2 Tavily Client
- [x] `scripts/ingestion/enrichment/shared/tavily-client.ts`
- [x] Auto-caching with TTL support
- [x] Helper functions: `searchChefShows()`, `searchChefRestaurants()`, `searchChefBio()`, `searchRestaurantStatus()`
- [x] Cache stats and invalidation

### 1.3 Local LLM Client  
- [x] `scripts/ingestion/enrichment/shared/local-llm-client.ts`
- [x] Tier routing: extraction → gpt-5-mini, synthesis → Qwen
- [x] Availability check with fallback
- [x] Cost estimation

### 1.4 Environment Config
- [x] `LM_STUDIO_URL` in `.env.local`
- [x] `TAVILY_API_KEY` configured

### 1.5 Harvest Script
- [x] `scripts/harvest-tavily-cache.ts`
- [x] Bulk fetch with progress logging
- [x] Resume capability (cache hits skip)

### 1.6 Test Scripts
- [x] `scripts/test-extraction-comparison.ts` - Compare models
- [x] `scripts/test-tiered-extraction.ts` - End-to-end test

**Test Results:**
- 5 chefs harvested: 44s fresh, 5.8s cached
- Aaron Cuschieri extraction: $0.006, 7 restaurants, 2 shows
- Qwen bio synthesis: FREE, 3.3s

---

## Phase 2: Staging System ✅ COMPLETE

### 2.1 Database Schema
- [x] Migration `035_pending_discoveries_table.sql`
  ```sql
  pending_discoveries (
    id UUID PRIMARY KEY,
    discovery_type TEXT,      -- 'show', 'chef', 'restaurant'
    source_chef_id UUID,
    source_chef_name TEXT,
    data JSONB,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at, reviewed_at, reviewed_by
  )
  ```

- [x] Migration `036_add_year_to_chef_shows.sql`
  ```sql
  ALTER TABLE chef_shows ADD COLUMN year INTEGER;
  ```

### 2.2 Season/Year Parser
- [x] `scripts/ingestion/enrichment/shared/season-parser.ts`
- Parse formats:
  - "Season 11" → `{season: 11, year: null}`
  - "S3" → `{season: 3, year: null}`
  - "2021" → `{season: null, year: 2021}`
  - "2018-2022" → multiple records with year each
- Also includes `normalizeShowName()` and `resolveShowAlias()` helpers

### 2.3 Serial Queue for Local LLM
- [x] `scripts/ingestion/enrichment/shared/llm-queue.ts`
- Check availability before each job
- One at a time (4080 limitation)
- **No auto-fallback** - queue and wait if local unavailable
- `forceProcessWithOpenAI()` for admin override
- In-memory queue (jobs cheap to re-run)

### 2.4 Pending Discovery Repository
- [x] `scripts/ingestion/enrichment/repositories/pending-discovery-repository.ts`
- CRUD for pending_discoveries
- Dedup check against existing shows/chefs/restaurants
- Batch operations
- Stats by status

### 2.5 Show Normalization (Complete)
- [x] Show name normalization with parenthetical removal
- [x] Alias resolution (TOC → Tournament of Champions, etc.)
- [x] Duplicate show merge via SQL function
- [x] Orphan cleanup (deleted shows with 0 chef links)
- [x] Typo fixes (Beet → Beat, Hells → Hell's, etc.)
- [x] Variant merges (Bobby's Triple Threat → Bobby Flay's Triple Threat, etc.)
- [x] Apostrophe normalization (curly → straight)
- [x] **Final state**: 165 shows, 293 chefs, ~988 chef_shows

---

## Phase 3: Admin UI ✅ COMPLETE

### 3.0 Architecture Decision: Replace Review Queue
- **Decision**: Replace `review_queue` tab with `pending_discoveries`
- **Rationale**: Both are system-generated enrichment staging; Tavily hybrid replaces old OpenAI enrichment
- **Final tabs**: `Discoveries | Duplicates | Feedback`
- **Migration**: 
  - `review_queue` table kept for historical data (read-only)
  - New enrichment writes only to `pending_discoveries`
  - Old queue items can be migrated or archived

### 3.1 Discoveries Tab (replaces Review Queue) ✅
- [x] Modify `/admin/(protected)/review/page.tsx`
- [x] Replace ReviewTable with DiscoveriesClient
- [x] Data source: `pending_discoveries` table
- [x] Bulk actions: approve selected, reject selected (with checkboxes)
- [x] Stats: pending count by discovery_type (show/chef/restaurant)

### 3.2 Discovery Detail Modal ✅
- [x] Create `DiscoveryDetail.tsx` component
- [x] Full data preview with JSON viewer (collapsible raw JSON)
- [x] Approve/Reject buttons with confirmation
- [ ] Edit fields before approval (deferred - v2)
- [ ] Cascade preview (deferred - v2)

### 3.3 Tab Updates ✅
- [x] Rename "Review Queue" → "Discoveries" in ReviewTabs.tsx
- [x] Update stats queries to use pending_discoveries
- [x] Added discoveryCount badge to tab

### 3.4 Show Trigger Section ✅ (NEW)
- [x] `ShowTriggerSection.tsx` component
- [x] Dropdown of existing 165 shows (Combobox with search)
- [x] Option to add NEW show name
- [x] Cost estimate display (~$0.05/chef)
- [x] Confirmation modal with warning before harvest
- [x] API route: `POST /api/admin/harvest-show`
  - Tavily search for show contestants/winners
  - gpt-4o-mini extraction of chef names
  - For each chef: search restaurants
  - Stage all to `pending_discoveries`
  - Returns: chefsFound, restaurantsFound, discoveriesCreated, estimatedCost

### 3.5 TypeScript Types ✅
- [x] Added `pending_discoveries` to `database.types.ts`
- [x] Added `search_cache` to `database.types.ts`

**Files Created (Phase 3):**
- `src/app/admin/(protected)/review/components/DiscoveriesSection.tsx`
- `src/app/admin/(protected)/review/components/DiscoveriesClient.tsx`
- `src/app/admin/(protected)/review/components/DiscoveryDetail.tsx`
- `src/app/admin/(protected)/review/components/ShowTriggerSection.tsx`
- `src/app/api/admin/harvest-show/route.ts`

**Files Modified (Phase 3):**
- `src/app/admin/(protected)/review/page.tsx`
- `src/app/admin/(protected)/review/ReviewTabs.tsx`
- `src/lib/database.types.ts`

---

## Phase 4: Data Extraction ✅ COMPLETE

### 4.1 Chef Show Data Extraction
- [x] Performance blurbs: 988/988 chef_shows (100%) via local Qwen
- [x] Competition results: 282/988 (28.5%) - remaining are episodic shows (Chopped, BBF, GGG) where result doesn't apply
- [x] Parallel extraction: 50 concurrent requests, 240 chefs in 32s
- [x] Total cost: ~$0.02 for all extractions

### 4.2 Scripts Cleaned Up
- Deleted one-off extraction scripts after completion:
  - `extract-chef-show-details.ts`
  - `extract-show-results.ts`
  - `generate-show-blurbs.ts`
  - `test-extraction-comparison.ts`
  - `test-tiered-extraction.ts`

### 4.3 Approval Cascade (Deferred to v2)
- [ ] Approve show → creates show record
- [ ] Approve chef → creates chef, links to show
- [ ] Approve restaurant → creates restaurant, links to chef
- [ ] Enforce protected restaurant rules

---

## Cost Analysis

| Component | Per Chef | 293 Chefs | Notes |
|-----------|----------|-----------|-------|
| Tavily (3 queries) | $0.024 | $7.03 | Pay-as-you-go |
| Tavily (restaurant details) | ~$0.017 | ~$5.00 | ~1.7 restaurants avg |
| gpt-5-mini extraction | $0.006 | $1.76 | Structured data |
| Qwen synthesis | FREE | FREE | Bios, blurbs |
| **Total New Hybrid** | **~$0.047** | **~$13.79** | |

| Approach | 293 Chefs | Notes |
|----------|-----------|-------|
| Current (OpenAI Responses) | ~$44 | Slow, misses data |
| **New Hybrid** | **~$14** | 68% savings, better data |

*Note: Cost increased from original $1.76 estimate due to expanded queries, but data quality significantly improved.*

---

## Files Reference

### Created (Phase 1)
- `supabase/migrations/034_search_cache_table.sql`
- `scripts/ingestion/enrichment/shared/tavily-client.ts`
- `scripts/ingestion/enrichment/shared/local-llm-client.ts`
- `scripts/harvest-tavily-cache.ts`
- `scripts/test-extraction-comparison.ts`
- `scripts/test-tiered-extraction.ts`

### Created (Phase 2)
- `supabase/migrations/035_pending_discoveries_table.sql`
- `supabase/migrations/036_add_year_to_chef_shows.sql`
- `scripts/ingestion/enrichment/shared/season-parser.ts`
- `scripts/ingestion/enrichment/shared/llm-queue.ts`
- `scripts/ingestion/enrichment/repositories/pending-discovery-repository.ts`

### To Create (Phase 3-4)
- `scripts/extract-to-staging.ts`
- `src/app/admin/(protected)/review/components/DiscoveriesSection.tsx`
- `src/app/admin/(protected)/review/components/DiscoveryDetail.tsx`
- `src/app/admin/(protected)/review/DiscoveriesTable.tsx`

### To Modify (Phase 3)
- `src/app/admin/(protected)/review/page.tsx` - swap data source to pending_discoveries
- `src/app/admin/(protected)/review/ReviewTabs.tsx` - rename tab "Review Queue" → "Discoveries"

### To Archive (Phase 3)
- `src/app/admin/(protected)/review/ReviewTable.tsx` - replaced by DiscoveriesTable

---

## Error Handling Strategy

**Keep it simple - fail fast, log clearly, retry manually.**

### Tavily Failures
- **Rate limit (429)**: Wait 60s, retry once, then skip chef and log
- **API down (5xx)**: Skip chef, continue batch, log for manual retry
- **No results**: Cache empty result (prevents re-fetching), flag in staging

### Extraction Failures  
- **Garbage output**: Log raw response, insert to staging with `status: 'needs_review'`
- **Schema validation fail**: Same as above - human reviews bad extractions
- **Partial data**: Accept what we got, flag incomplete fields

### Local LLM Unavailable
- **Default behavior**: Queue job, retry when local available (check every 5 min)
- **Admin override**: "Run with OpenAI" button in UI for urgent batches
- **Never silently degrade** - either complete the enrichment or don't touch the record

### Implementation
```typescript
// Simple retry wrapper - no complex backoff needed for solo project
async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      console.error(`Attempt ${i + 1} failed:`, e.message);
      if (i < retries) await sleep(60000); // 60s wait
    }
  }
  return null; // Caller handles null
}
```

---

## Deduplication Strategy

**Match by normalized name + location, merge by newest-wins.**

### Show Matching
- Normalize: lowercase, strip "the", collapse spaces
- "Tournament of Champions" → "tournament champions"
- "TOC" → manual alias table (5-10 entries, hardcoded)
- **Conflict**: If show exists, check if season is new → add season only

### Restaurant Matching  
- Key: `normalize(name) + city + state`
- "The French Laundry, Yountville, CA" = "french laundry yountville ca"
- **Conflict**: Compare `last_verified_at`, keep newer data
- **Multi-chef**: If restaurant exists under different chef → flag for review

### Chef Matching
- Key: `normalize(name)` 
- Check existing before insert
- **Conflict**: Merge shows/restaurants lists, keep longer bio

### Show Name Aliases (Hardcoded)
```typescript
const SHOW_ALIASES: Record<string, string> = {
  'toc': 'tournament of champions',
  'ggg': "guy's grocery games",
  'ddd': 'diners drive-ins and dives',
  'iron chef america': 'iron chef',
  'top chef masters': 'top chef', // Same show, different format
};
```

---

## Protected Restaurant Behavior

**Protection = verified chef relationship, not frozen data.**

A restaurant with `is_protected = true` means the chef-restaurant link has been manually verified.

### Can Update (via enrichment or admin)
- `status` (open/closed/temporarily_closed)
- `google_place_id`, `google_rating`, `google_review_count`, `google_url`
- `photo_urls`
- `price_tier`, `cuisine_type`
- `address`, `latitude`, `longitude`
- `last_verified_at`

### Cannot Change
- `chef_id` - relationship is locked
- Cannot be deleted or orphaned from chef
- Cannot be reassigned to different chef without removing protection first

### Admin Override
- Admin can unprotect → edit chef_id → re-protect if needed
- Bulk operations skip protected restaurants by default

---

## Approval Cascade Logic

**Simple state machine - approve triggers creation, failure rolls back.**

### States
```
pending → approved → created
        → rejected → (deleted after 30 days)
        → needs_review → (manual intervention)
```

### Cascade Rules

**Approve Show:**
1. Check if show slug exists → if yes, just add season
2. Create show record
3. No further cascade (chefs link to shows, not vice versa)

**Approve Chef:**
1. Check if chef slug exists → if yes, merge data and skip create
2. Create chef record  
3. Link to shows (must already exist or be in same approval batch)
4. **No auto-approve restaurants** - they get their own review

**Approve Restaurant:**
1. Check if restaurant exists (name + city) → if yes, update instead
2. Create restaurant record
3. Link to chef (must already exist)
4. Trigger Google Places lookup (async, doesn't block approval)

### Failure Handling
- **FK violation**: Chef doesn't exist → reject with message "Approve chef first"
- **Duplicate**: Already exists → auto-merge and mark as `status: 'merged'`
- **Validation fail**: Bad data → `status: 'needs_review'` with error message

### Batch Approval
- Admin can approve multiple at once
- Process in order: shows → chefs → restaurants
- If any fails, continue others and report failures

---

## Testing Strategy (Solo-Dev Appropriate)

**Manual testing + one happy-path E2E test per phase.**

### Phase 2 Tests
- [ ] Manual: Run harvest on 5 new chefs, verify cache populated
- [ ] Manual: Run extraction, verify staging table has entries
- [ ] Script: `npm run test:staging` - insert mock data, verify dedup works

### Phase 3 Tests  
- [ ] Manual: Approve a show → verify show created
- [ ] Manual: Approve a chef → verify chef created, shows linked
- [ ] Manual: Reject → verify record marked rejected
- [ ] E2E: `tests/admin-discoveries.spec.ts` - load page, approve one, verify DB

### Phase 4 Tests
- [ ] Manual: Full flow - harvest → extract → approve → verify public page
- [ ] E2E: `tests/enrichment-flow.spec.ts` - end-to-end with mock Tavily

### Test Data
- Keep 5 test chefs in `scripts/test-data/test-chefs.json`
- Mock Tavily responses in `scripts/test-data/mock-tavily-responses.json`
- Can replay without hitting API

---

## Open Questions

1. ~~**Batch size for local LLM queue?**~~ → 1 (serialize, 4080 limitation)
2. **Auto-reject rules?** - Defer until we see patterns in staging data
3. **Merge UI?** - V1: Just show diff, admin picks. No fancy merge tool

---

## Changelog

### 2025-12-09 (Phase 4 Complete - PROJECT COMPLETE)
- Extracted performance_blurb for all 988 chef_shows via local Qwen (FREE)
- Extracted competition results for 282 chef_shows (28.5%) - rest are episodic shows
- Parallelized extraction script: 50 concurrent requests, 32s for 240 chefs
- Cleaned up one-off scripts (5 deleted)
- Final data state:
  - 988 chef_shows with blurbs (100%)
  - 282 chef_shows with results (28.5% - expected for competition shows only)
  - 165 normalized shows
  - 293 chefs in search_cache
- Total project cost: ~$14 Tavily + ~$0.02 OpenAI extraction

### 2025-12-08 (Phase 3 Complete)
- Built complete admin UI for discoveries review
- Created DiscoveriesSection, DiscoveriesClient, DiscoveryDetail components
- Created ShowTriggerSection with show dropdown + harvest trigger
- Created harvest-show API route (Tavily search + gpt-4o-mini extraction)
- Replaced Review Queue tab with Discoveries tab
- Added pending_discoveries and search_cache to database.types.ts
- Type-check passing

### 2025-12-08 (Phase 3 Planning)
- Architecture decision: Replace Review Queue tab with Discoveries
- Rationale: Both are system-generated; consolidate to 3 tabs (Discoveries | Duplicates | Feedback)
- Updated file references for Phase 3 implementation

### 2025-12-08 (continued)
- Expanded query strategy: 4 queries/chef + 1/restaurant
- Added extraction schemas for shows, bio, restaurants
- Updated cost analysis: ~$14 for full harvest (68% savings)
- Chose pay-as-you-go Tavily ($0.008/credit)

### 2025-12-08 (Phase 2 - Show Normalization)
- Normalized 234 shows: 34 merged duplicates, 11 renamed
- Removed all parenthetical suffixes from show names
- Created merge_shows() SQL function for safe duplicate handling
- chef_shows relationships preserved (989 records intact)

### 2025-12-08 (Phase 2)
- Phase 2 complete: staging system
- Created migrations 035 (pending_discoveries) and 036 (year column)
- Created season-parser.ts with year range support
- Created llm-queue.ts with wait-for-local behavior (no auto-fallback)
- Created pending-discovery-repository.ts with dedup checks
- Added searchChefBio() to tavily-client.ts
- Modified local-llm-client.ts to throw LocalUnavailableError instead of fallback

### 2025-12-08 (Phase 1)
- Phase 1 complete: cache, clients, harvest script
- Tested on 5 chefs, end-to-end working
- Began Phase 2 planning
