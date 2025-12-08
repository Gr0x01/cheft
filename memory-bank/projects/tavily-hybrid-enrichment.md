---
Last-Updated: 2025-12-08
Maintainer: RB
Status: In Progress
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
- [x] Helper functions: `searchChefShows()`, `searchChefRestaurants()`
- [x] Cache stats and invalidation
- [ ] **TODO**: Add expanded query functions:
  - `searchChefBio()` - Wikipedia, awards, training
  - `searchRestaurantDetails()` - Status, cuisine, price

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

## Phase 2: Staging System (IN PROGRESS)

### 2.1 Database Schema
- [ ] Migration `035_pending_discoveries_table.sql`
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

- [ ] Migration `036_add_year_to_chef_shows.sql`
  ```sql
  ALTER TABLE chef_shows ADD COLUMN year INTEGER;
  ```

### 2.2 Season/Year Parser
- [ ] `scripts/ingestion/enrichment/shared/season-parser.ts`
- Parse formats:
  - "Season 11" → `{season: 11, year: null}`
  - "S3" → `{season: 3, year: null}`
  - "2021" → `{season: null, year: 2021}`
  - "2018-2022" → multiple records with year each

### 2.3 Serial Queue for Local LLM
- [ ] `scripts/ingestion/enrichment/shared/llm-queue.ts`
- Check availability before each job
- One at a time (4080 limitation)
- Graceful fallback to OpenAI
- Job persistence for resume

### 2.4 Pending Discovery Repository
- [ ] `scripts/ingestion/enrichment/repositories/pending-discovery-repository.ts`
- CRUD for pending_discoveries
- Dedup check against existing data
- Batch operations

---

## Phase 3: Admin UI

### 3.1 Discoveries Dashboard
- [ ] `/admin/discoveries/page.tsx`
- Table with filters (type, status, source chef)
- Bulk actions (approve all, reject all)
- Stats: pending count by type

### 3.2 Discovery Detail Page
- [ ] `/admin/discoveries/[id]/page.tsx`
- Full data preview
- Edit before approval
- "This will trigger..." cascade preview
- Approve/Reject buttons

### 3.3 Navigation
- [ ] Add "Discoveries" to AdminNav

---

## Phase 4: Integration

### 4.1 Extract to Staging Script
- [ ] `scripts/extract-to-staging.ts`
- Read from search_cache
- Extract with gpt-5-mini
- Insert to pending_discoveries
- NO production writes

### 4.2 Approval Cascade
- [ ] Approve show → creates show record
- [ ] Approve chef → creates chef, links to show
- [ ] Approve restaurant → creates restaurant, links to chef

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

### Created
- `supabase/migrations/034_search_cache_table.sql`
- `scripts/ingestion/enrichment/shared/tavily-client.ts`
- `scripts/ingestion/enrichment/shared/local-llm-client.ts`
- `scripts/harvest-tavily-cache.ts`
- `scripts/test-extraction-comparison.ts`
- `scripts/test-tiered-extraction.ts`

### To Create
- `supabase/migrations/035_pending_discoveries_table.sql`
- `supabase/migrations/036_add_year_to_chef_shows.sql`
- `scripts/ingestion/enrichment/shared/season-parser.ts`
- `scripts/ingestion/enrichment/shared/llm-queue.ts`
- `scripts/ingestion/enrichment/repositories/pending-discovery-repository.ts`
- `scripts/extract-to-staging.ts`
- `src/app/admin/discoveries/page.tsx`
- `src/app/admin/discoveries/[id]/page.tsx`

### To Modify
- `src/components/admin/AdminNav.tsx`
- `scripts/ingestion/enrichment/shared/local-llm-client.ts`

---

## Open Questions

1. **Batch size for local LLM queue?** - Probably 1 (serialize)
2. **Auto-reject rules?** - Shows with <2 chefs? Restaurants already closed?
3. **Merge UI?** - When discovery matches existing but has more data?

---

## Changelog

### 2025-12-08 (continued)
- Expanded query strategy: 4 queries/chef + 1/restaurant
- Added extraction schemas for shows, bio, restaurants
- Updated cost analysis: ~$14 for full harvest (68% savings)
- Chose pay-as-you-go Tavily ($0.008/credit)

### 2025-12-08
- Phase 1 complete: cache, clients, harvest script
- Tested on 5 chefs, end-to-end working
- Began Phase 2 planning
