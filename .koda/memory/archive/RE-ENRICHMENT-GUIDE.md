# Chef Re-Enrichment Guide

This guide explains how to re-enrich all chefs in the database with updated information from the web.

## Quick Start

### 1. Check Current Status

```bash
npx tsx scripts/check-chef-stats.ts
```

This will show:
- Total chefs in database
- How many need re-enrichment (90+ days old)
- Estimated cost and time

### 2. Test with Dry Run

```bash
npx tsx scripts/re-enrich-all-chefs.ts --limit=5 --dry-run
```

Preview what would happen without making changes.

### 3. Run Re-Enrichment

#### Option A: Full Re-Enrichment (Bio + Shows + Restaurants)

**Sequential (default):**
```bash
npx tsx scripts/re-enrich-all-chefs.ts
```
Cost: ~$7.14 for all 238 chefs  
Time: ~80 minutes (20 seconds/chef)

**Parallel (RECOMMENDED):**
```bash
# Process 10 chefs at a time
npx tsx scripts/re-enrich-all-chefs.ts --batch=10
```
Cost: ~$7.14 (same as sequential)  
Time: ~8 minutes (10x faster!)

**Fast parallel:**
```bash
# Process 20 chefs at a time
npx tsx scripts/re-enrich-all-chefs.ts --batch=20
```
Cost: ~$7.14 (same)  
Time: ~4 minutes (20x faster!)

#### Option B: Partial Re-Enrichment (Specific Scope)

**Shows Only:**
```bash
npx tsx scripts/re-enrich-all-chefs.ts --scope=shows
```
Cost: ~$2.38 for all chefs (~$0.01/chef)

**Bio Only:**
```bash
npx tsx scripts/re-enrich-all-chefs.ts --scope=bio
```
Cost: ~$2.38 for all chefs (~$0.01/chef)

**Restaurants Only:**
```bash
npx tsx scripts/re-enrich-all-chefs.ts --scope=restaurants
```
Cost: ~$4.76 for all chefs (~$0.02/chef)

#### Option C: Batched Re-Enrichment

Process in smaller batches to manage cost and time:

```bash
# First 50 chefs
npx tsx scripts/re-enrich-all-chefs.ts --limit=50 --offset=0

# Next 50 chefs  
npx tsx scripts/re-enrich-all-chefs.ts --limit=50 --offset=50

# And so on...
```

## Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `--limit=N` | Process only N chefs | all (999999) |
| `--offset=N` | Skip first N chefs | 0 |
| `--scope=TYPE` | What to enrich: `full`, `bio`, `shows`, `restaurants`, `status` | `full` |
| `--batch=N` | Process N chefs in parallel (recommended: 5-20) | 1 (sequential) |
| `--dry-run` | Preview without making changes | false |

## Cost & Time Estimates

Based on gpt-4o-mini hybrid search (10x faster, 10x cheaper than previous approach):

### Sequential Processing (--batch=1, default)

| Scope | Cost/Chef | Time/Chef | Total (238 chefs) |
|-------|-----------|-----------|-------------------|
| Full (bio + shows + restaurants) | $0.03 | 20s | $7.14, 80 min |
| Shows only | $0.01 | 8s | $2.38, 32 min |
| Bio only | $0.01 | 6s | $2.38, 24 min |
| Restaurants only | $0.02 | 10s | $4.76, 40 min |

### Parallel Processing (RECOMMENDED)

**Batch sizes and time savings:**

| Batch Size | Full (238 chefs) | Shows Only | Bio Only | Restaurants Only |
|------------|------------------|------------|----------|------------------|
| 1 (sequential) | 80 min | 32 min | 24 min | 40 min |
| 5 | **16 min** | 6 min | 5 min | 8 min |
| 10 | **8 min** | 3 min | 2 min | 4 min |
| 20 | **4 min** | 2 min | 1 min | 2 min |

**Cost is the same regardless of batch size!** Parallel processing only affects speed.

## What Gets Updated

### Full Enrichment (`--scope=full`)
- ✅ Chef bio (2-3 sentence summary)
- ✅ James Beard awards status
- ✅ Notable awards
- ✅ All TV show appearances
- ✅ All restaurants (current and past)

### Bio Only (`--scope=bio`)
- ✅ Chef bio
- ✅ James Beard status
- ✅ Notable awards

### Shows Only (`--scope=shows`)
- ✅ All TV show appearances
- ✅ Performance blurbs for each show

### Restaurants Only (`--scope=restaurants`)
- ✅ All restaurants where chef worked/works
- ✅ Restaurant details (name, city, cuisine, etc.)

## Technical Details

### Architecture
- Uses `RefreshStaleChefWorkflow` for orchestrated re-enrichment
- Leverages hybrid LLM search (gpt-4o-mini + gpt-4o-mini-search-preview)
- Automatic cost tracking and reporting
- Error handling with detailed logging

### Safety Features
- Dry-run mode for preview
- Cost estimation before running
- Duplicate detection (prevents re-adding existing data)
- Rollback support for failures
- Rate limiting (2 second delay between chefs)

### Data Quality
- Web search grounded in current information
- Structured JSON validation with Zod schemas
- Citation stripping for clean data
- Show name mapping for consistency

## Troubleshooting

### "Too expensive!"
Use batched approach with `--limit` and `--offset`:
```bash
npx tsx scripts/re-enrich-all-chefs.ts --limit=20 --scope=shows
```

### "Taking too long!"
Run in background:
```bash
nohup npx tsx scripts/re-enrich-all-chefs.ts > enrichment.log 2>&1 &
tail -f enrichment.log
```

### "Need to stop mid-run"
Kill the process with Ctrl+C. Already-enriched chefs are saved, so you can resume with `--offset`.

### "Errors for specific chefs"
Check the console output. Common issues:
- Show name not in mapping → Add to `show-repository.ts`
- LLM timeout → Retry that chef individually
- Network error → Retry with better connection

## Best Practices

1. **Start with dry-run** to understand scope
2. **Test with small batch** (--limit=5) before full run
3. **Choose scope wisely** - only update what's needed
4. **Monitor costs** - check output after each batch
5. **Run during off-peak** - better LLM response times

## Next Steps

After re-enrichment:
1. Check data quality in admin panel
2. Verify restaurant statuses if needed
3. Generate narratives for SEO
4. Update last_enriched_at timestamps (automatic)

## Related Scripts

- `scripts/check-chef-stats.ts` - View database statistics
- `scripts/enrich-all-chef-shows.ts` - Legacy shows-only script
- `scripts/ingestion/processors/llm-enricher.ts` - Core enrichment facade

## References

- `/memory-bank/architecture/enrichment-reference.md` - Quick API reference
- `/memory-bank/architecture/enrichment-system.md` - Detailed architecture
- `/memory-bank/architecture/llm-models.md` - Model pricing and details
