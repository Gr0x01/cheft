---
Last-Updated: 2025-12-10
Maintainer: RB
Status: Pre-Launch - Ready for Show Expansion
---

# Active Context: Chefs

## Current Status
- **Phase**: Pre-Launch
- **Mode**: Ready to expand show coverage
- **Focus**: Add Top Chef Masters and other shows

## Enrichment System v2 Complete
The enrichment system has been fully refactored and hardened:
- **Search**: All web searches through Tavily API with caching (search-client.ts, tavily-client.ts)
- **Synthesis**: Two-tier model - accuracy (gpt-4o-mini) for facts, creative (local Qwen3 with `/no_think`) for prose
- **Wikipedia Cache**: Shows fetched once from Wikipedia, reused for all contestants (~50% cost savings)
- **Status**: Google Places API checked first, Tavily fallback
- **Workflows**: All 4 workflows updated, all 8 services migrated
- **Code review**: A- grade, critical null safety and env var validation issues fixed
- **Dead code**: Old LLMClient files archived to scripts/archive/enricher-v1/

**New: Wikipedia Show Cache** - `show_source_cache` table stores Wikipedia content per show (never expires). `add-show.ts` fetches once and passes context to all chef enrichments.

See `memory-bank/architecture/enrichment-reference.md` for quick reference.

---

## Show Coverage Analysis (Dec 9, 2025)

### Currently Public Shows (5 core)
- Top Chef (main) + 14 season variants
- Top Chef Masters
- Tournament of Champions + All-Star Christmas
- Holiday Baking Championship

### Shows Ready to Enable (configs created, data incomplete)
| Show | Config File | Chefs to Add | Status |
|------|-------------|--------------|--------|
| Top Chef Masters | `shows/top-chef-masters.json` | 28 | Config ready, needs enrichment |

### Shows Needing Research + Config
- Top Chef Canada (12 seasons)
- Top Chef: Just Desserts (2 seasons)
- Top Chef Duels (1 season)
- Halloween Baking Championship (11 seasons)
- Other Top Chef international variants

### Gap Analysis
Current chef_shows links vs expected:
- Top Chef Masters: 11 links, need ~28 more
- Top Chef Canada: 5 links, need ~50+ more
- Holiday Baking: 6 links, need ~20+ (only those with restaurants)
- Halloween Baking: 1 link, need ~10+ (only those with restaurants)

---

## Current Data Summary
- **Chefs**: 300 total (100% bios, 88% photos)
- **Restaurants**: 1,036 locations (98.5% Google Places)
- **Cities**: 162+ city pages
- **Public Shows**: 5 core (Top Chef, Top Chef Masters, TOC, Holiday Baking)

## Infrastructure Status
- **Production**: Live on Vercel
- **Database**: Supabase PostgreSQL
- **Analytics**: PostHog with session replay
- **Enrichment**: Needs cleanup before expansion

## Next Steps (In Order)
1. ~~**Fix enrichment system**~~ - ✅ Complete, code reviewed
2. **Test with Top Chef Masters** - Use `shows/top-chef-masters.json` as pilot
3. **Expand to other shows** - Create configs, run enrichment
4. **Enable shows** - Only after proper data coverage

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
