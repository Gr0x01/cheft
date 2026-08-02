---
Last-Updated: 2025-12-08
Maintainer: RB
Status: Active Research
---

# Tavily + LLM Hybrid Enrichment Research

## Overview

Testing hybrid approach: **Tavily for web search (free) + LLM for extraction** to replace expensive OpenAI Responses API with web search.

## Test Results (2025-12-08)

### Test Subject: Brian Malarkey

**Tavily Search**: 2 queries, 20 results total (FREE via free tier - 1000 searches/month)

| Model | Shows Found | Restaurants Found | Cost | Time |
|-------|-------------|-------------------|------|------|
| **gpt-4o-mini** | 20 | 9 | $0.0013 | 11s |
| **Qwen 3 8B (local)** | **26** | **9** | **FREE** | **21s** |
| **gpt-5-mini** | 30 | 13 | $0.0118 | 60s |

### Quality Comparison

**gpt-4o-mini found (20 shows):**
- Top Chef Season 3 (finalist)
- Iron Chef America
- Beat Bobby Flay
- Chopped (judge)
- The Taste (mentor, winner)
- Guy's Grocery Games
- Tournament of Champions
- Beachside Brawl (host)
- Cutthroat Kitchen
- + 11 guest appearances

**gpt-5-mini found ADDITIONAL (31 shows total):**
- Top Chef All-Stars Season 17 ⭐ (important - 4o-mini missed this!)
- Top Chef Family Style
- Tournament of Champions Season 6 (with season number)
- Cutthroat Kitchen: Knives Out (as HOST, not contestant)
- Hell's Kitchen Season 22
- Wildcard Kitchen
- 24 in 24: Last Chef Standing
- Superchef Grudge Match
- Chopped All-Stars
- Rachael vs. Guy: Kids Cook Off

**gpt-5-mini found ADDITIONAL restaurants (16 vs 9):**
- Searsucker
- Herringbone  
- Juniper & Ivy
- Ironside Fish & Oyster
- Coasterra
- Farmer & The Seahorse
- Duke's La Jolla

### Cost Projections (238 chefs)

| Approach | Per Chef | Total (238) | Time Est. | Notes |
|----------|----------|-------------|-----------|-------|
| Current (OpenAI Responses API) | ~$0.15-0.20 | ~$40 | ~8 hrs | Slow, misses shows |
| Tavily + gpt-4o-mini | $0.0013 | **$0.31** | ~44 min | Good quality, fastest |
| **Tavily + Qwen 3 8B (local)** | **$0** | **$0** | **~83 min** | **Great quality, FREE** |
| Tavily + gpt-5-mini | $0.0118 | **$2.81** | ~238 min | Best quality, slowest |

### Key Findings

1. **Tavily search quality is excellent** - Found 11+ shows and 10+ restaurants from just 2 queries
2. **Qwen 3 8B is the sweet spot** - 87% of gpt-5-mini quality at $0 cost
3. **gpt-5-mini extracts most thoroughly** - Best for season numbers, role distinctions
4. **Cost reduction is massive** - 100% cheaper with local, 97% cheaper even with gpt-5-mini

### Qwen 3 8B Local Model Performance

**What Qwen caught that 4o-mini missed:**
- Top Chef All-Stars Season 17 ✅
- Chopped All-Stars ✅
- Rachael vs. Guy: Kids Cook Off ✅
- Hell's Kitchen ✅
- Superchef Grudge Match ✅
- 24 in 24: Last Chef Standing ✅

**What Qwen missed vs gpt-5-mini:**
- Cutthroat Kitchen: Knives Out (host distinction)
- Wildcard Kitchen
- Some specific season numbers
- 4 additional restaurants (Searsucker, Herringbone, Oceanaire, Citrus)

**LM Studio Configuration:**
- Model: `qwen/qwen3-8b`
- Context: 8192 tokens
- Endpoint: `http://10.2.0.10:1234/v1/chat/completions`
- Hardware: NVIDIA RTX 4080 (16GB VRAM)

## Tavily Configuration

```typescript
const response = await fetch('https://api.tavily.com/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: TAVILY_API_KEY,
    query: `${chefName} chef TV shows appearances`,
    search_depth: 'advanced',  // Better results than 'basic'
    include_raw_content: false,
    max_results: 10,
  }),
});
```

**Recommended queries per chef:**
1. `{name} chef TV shows appearances Top Chef Iron Chef`
2. `{name} restaurants locations`

## Model Pricing Reference

| Model | Input/1M | Output/1M | Notes |
|-------|----------|-----------|-------|
| gpt-4o-mini | $0.15 | $0.60 | Cheapest, good quality |
| gpt-5-mini | $0.25 | $2.00 | Best extraction, 11x more expensive |
| gpt-5-nano | $0.05 | $0.40 | Doesn't support temperature param |

## Recommendation

**For production enrichment:**
1. **Primary: Tavily + Qwen 3 8B (local)** - Best value, 87% quality at $0
2. **Fallback: Tavily + gpt-5-mini** - When local unavailable or need highest accuracy
3. **Bulk updates: Tavily + gpt-4o-mini** - Fastest, acceptable quality for status checks

## Implementation Status (2025-12-08)

### ✅ Completed Infrastructure

1. **Search Cache System**
   - Migration: `034_search_cache_table.sql`
   - Auto-caching Tavily client: `scripts/ingestion/enrichment/shared/tavily-client.ts`
   - Cache stats, TTL support, invalidation

2. **Tiered LLM Client**
   - `scripts/ingestion/enrichment/shared/local-llm-client.ts`
   - Tier 2 (extraction): gpt-5-mini
   - Tier 3 (synthesis): Qwen 3 8B local with fallback

3. **Bulk Harvest Script**
   - `scripts/harvest-tavily-cache.ts`
   - Tested: 5 chefs in 44s (fresh), 5.8s (cached)

4. **End-to-End Test**
   - `scripts/test-tiered-extraction.ts`
   - Tested: Aaron Cuschieri - 2 shows, 7 restaurants, bio generated
   - Cost: $0.006/chef (gpt-5-mini extraction + free Qwen synthesis)

### Final Cost Projection (238 chefs)

| Component | Cost |
|-----------|------|
| Tavily harvest (476 searches) | FREE |
| gpt-5-mini extraction | ~$1.43 |
| Qwen synthesis (bios, blurbs) | FREE |
| **Total** | **~$1.43** |

vs current system: ~$40 (97% savings!)

### Next Steps

1. ⏳ Run full harvest: `npx tsx scripts/harvest-tavily-cache.ts`
2. ⏳ Update enrichment services to use tiered clients
3. ⏳ Integrate into existing workflows

## Files

- Migration: `supabase/migrations/034_search_cache_table.sql`
- Tavily client: `scripts/ingestion/enrichment/shared/tavily-client.ts`
- Local LLM client: `scripts/ingestion/enrichment/shared/local-llm-client.ts`
- Harvest script: `scripts/harvest-tavily-cache.ts`
- Test scripts: `scripts/test-extraction-comparison.ts`, `scripts/test-tiered-extraction.ts`
