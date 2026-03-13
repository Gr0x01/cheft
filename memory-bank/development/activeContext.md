---
Last-Updated: 2026-03-14
Maintainer: RB
Status: Pre-Launch - Show Enrichment Complete
---

# Active Context: Chefs

## Current Status
- **Phase**: Pre-Launch
- **Mode**: Show enrichment complete
- **Focus**: Final polish before launch

## Enrichment Progress

### ✅ Completed
| Show | Config | Chefs | Restaurants | Status |
|------|--------|-------|-------------|--------|
| Top Chef Masters | `shows/top-chef-masters.json` | 83 chefs (all existed) | 1,237 total | ✅ Complete |
| Top Chef: Charlotte (S23) | `shows/top-chef-charlotte.json` | 15 chefs | 15 restaurants | ✅ Complete (4 missing Google Places) |

### 🚧 Pending (Configs Ready)
| Show | Config | Contestants | Status |
|------|--------|-------------|--------|
| Top Chef Canada | `shows/top-chef-canada.json` | 37 | Config ready |
| Top Chef Just Desserts | `shows/top-chef-just-desserts.json` | 23 | Config ready |

## Enrichment System v2 Complete
The enrichment system has been fully refactored and hardened:
- **Search**: All web searches through Tavily API with caching (search-client.ts, tavily-client.ts)
- **Synthesis**: OpenAI gpt-4o-mini with Flex tier for all calls (local LLM disabled by default)
- **Wikipedia Cache**: Shows fetched once from Wikipedia, reused for all contestants
- **Flex Tier**: OpenAI calls use `X-Model-Tier: flex` for 50% cost savings
- **Parallelization**: p-queue with 100 concurrent workers (Tavily production 1000 RPM)
- **Status**: Google Places API checked first, Tavily fallback

**Performance**: 32-chef show in <30 seconds with production Tavily, ~$0.50 cost.

See `memory-bank/architecture/enrichment-reference.md` for quick reference.

---

## Current Data Summary
- **Chefs**: ~420 total (100% bios, most have photos — S23 chefs do not)
- **Restaurants**: ~1,250 locations
- **Cities**: 162+ city pages
- **Public Shows**: 5 core (Top Chef, Top Chef Masters, TOC, Holiday Baking)

## Infrastructure Status
- **Production**: Live on Vercel
- **Database**: Supabase PostgreSQL (⚠️ experiencing 522 timeouts as of Dec 10)
- **Analytics**: PostHog with session replay
- **Enrichment**: System working, blocked by infrastructure

## Next Steps
1. **Run Canada enrichment**: `npx tsx scripts/add-show.ts --config shows/top-chef-canada.json`
2. **Run Desserts enrichment**: `npx tsx scripts/add-show.ts --config shows/top-chef-just-desserts.json`
3. **Google Places backfill**: `npx tsx scripts/enrich-google-places.ts`
4. **Enable shows in UI** - Only after proper data coverage

## Key Scripts
- `scripts/add-show.ts` - Add show with contestants (uses Wikipedia cache + enricher v2)
- `scripts/enrich-google-places.ts` - Backfill Google Place IDs
- `scripts/michelin/scrape-wikipedia-michelin.ts` - Refresh Michelin data
- `scripts/test-enricher.ts` - Smoke test for enrichment components

## Show Config Format
Location: `shows/*.json`
```json
{
  "showName": "Show Name",
  "network": "Network",
  "contestants": [
    { "name": "Chef Name", "season": "1", "result": "winner" }
  ]
}
```
