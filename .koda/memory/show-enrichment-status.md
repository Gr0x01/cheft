---
name: show-enrichment-status
description: which TV shows are enriched, which configs are queued, and the command to run one
Last-Updated: 2026-08-02
Maintainer: RB
---

# Show Enrichment Status

Running tracker for per-show data ingestion. Configs live in `shows/*.json`; the
pipeline itself is documented in [[enrichment-reference]].

## Run a queued show

```bash
npx tsx scripts/add-show.ts --config shows/<show>.json
npx tsx scripts/enrich-google-places.ts   # backfill Place IDs afterwards
```

Only enable a show in the UI **after** its data coverage is verified — a
half-enriched show ships thin pages to a site whose whole value is SEO.

## Enriched

| Show | Config | Result |
|------|--------|--------|
| Top Chef Masters | `shows/top-chef-masters.json` | 83 chefs (all pre-existing), 1,237 restaurants total |
| Top Chef: Charlotte (S23) | `shows/top-chef-charlotte.json` | 15 chefs, 15 restaurants — 4 still missing Google Places |

## Queued (configs ready, not yet run)

| Show | Config | Contestants |
|------|--------|-------------|
| Top Chef Canada | `shows/top-chef-canada.json` | 37 |
| Top Chef Just Desserts | `shows/top-chef-just-desserts.json` | 23 |

## Show config format

```json
{
  "showName": "Show Name",
  "network": "Network",
  "contestants": [
    { "name": "Chef Name", "season": "1", "result": "winner" }
  ]
}
```

Cost/time reference: a 32-chef show runs in under 30s on production Tavily for
roughly $0.50.
