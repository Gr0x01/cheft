# Duplicate Chef Detection & Merge System

## Overview
Automated system to detect and merge duplicate chef records using LLM-powered verification and intelligent data merging.

## Problem Solved
- Chefs appearing on multiple TV shows were entered as separate records
- Example: Joe Sasto appeared on Top Chef AND Tournament of Champions, creating 2 chef records
- Each duplicate had different restaurants attached, splitting their inventory
- Incomplete show history across duplicate profiles

## Solution Components

### 1. Multi-Show Enrichment (Fixed)
**File**: `scripts/ingestion/processors/llm-enricher.ts`

**Changes**:
- Added `TVShowAppearanceSchema` to extract all TV show appearances
- Updated `ChefEnrichmentSchema` to include `tvShows` array
- Modified system prompt to request ALL TV cooking show appearances
- Created `findShowByName()` to map LLM show names → database shows
- Created `saveChefShows()` to save multiple chef_shows entries
- Updated `enrichAndSaveChef()` to call saveChefShows

**Result**: Enrichment now discovers and saves all TV appearances for a chef

### 2. Show Variants Database (Expanded)
**File**: `supabase/migrations/019_add_show_variants.sql`

**Added shows**:
- Top Chef variants: Masters, Just Desserts, Junior, Duels, Amateurs, Family Style, Estrellas, VIP, Canada
- Other competitions: Great British Bake Off, Guy's Grocery Games, Cutthroat Kitchen, etc.
- Baking shows: Spring/Halloween/Holiday Baking Championship, Kids Baking Championship
- Netflix shows: Final Table, Chef Show, Nailed It!, Is It Cake?, etc.

**Total**: ~30+ shows added

### 3. Duplicate Detection & Merge Script
**File**: `scripts/detect-and-merge-duplicate-chefs.ts`

**Features**:
1. **Name Similarity Filter** (Fast)
   - Calculates similarity score between chef names
   - Only checks pairs with ≥0.7 similarity

2. **LLM Verification** (gpt-4o-mini with search)
   - Uses web search to verify if chefs are same person
   - Checks: social media, restaurant websites, news, LinkedIn, show lists
   - Returns confidence score (0.9-1.0 = definitely same, 0.7-0.9 = likely)

3. **LLM Merge Strategy** (gpt-4.1)
   - Decides which chef record to keep (more restaurants/better data)
   - Merges metadata: best bio, photo, Instagram, James Beard status
   - Deduplicates TV shows (same show + season = one entry)
   - Marks most prestigious appearance as primary

4. **Automated Execution**
   - Transfers all restaurants from loser → keeper
   - Updates keeper with merged data
   - Saves deduplicated chef_shows entries
   - Deletes duplicate chef record

**Safety Features**:
- `--dry-run` flag to preview without changes
- `--min-confidence=0.9` threshold for automatic merge
- `--interactive` flag for manual confirmation (future)
- Detailed logging of all merge decisions

## Usage

### Step 0: Enrich All Chef Shows (NEW - Required First)
Before running duplicate detection, populate all TV show appearances for existing chefs:

```bash
# Enrich ALL chefs with complete TV show history
npm run enrich:shows

# Enrich with limit (e.g., first 50 chefs)
npm run enrich:shows -- --limit=50

# Enrich with offset (e.g., skip first 100, process next 50)
npm run enrich:shows -- --offset=100 --limit=50
```

**What it does**:
- Uses LLM with web search to find ALL TV show appearances for each chef
- Saves deduplicated show entries to `chef_shows` table
- Skips shows already in database
- Updates `last_enriched_at` timestamp
- Uses gpt-5-mini model (cost: ~$0.02-0.05 per chef)

**Expected output**:
```
[1/182] Enriching shows for: Gordon Ramsay
   ✅ Success: 8 shows saved, 2 skipped
   📊 Tokens: 4,523
```

### Step 1: Run Migrations
```bash
# Apply migrations via Supabase dashboard or CLI:
# 1. Migration 019: Add show variants (Top Chef Masters, etc.)
# 2. Migration 020: Add atomic merge function for transaction safety
```

### Step 2: Detect & Merge Duplicates
```bash
# Dry run (preview only, no changes)
npm run merge-duplicate-chefs -- --dry-run

# Live run with default 0.9 confidence threshold
npm run merge-duplicate-chefs

# Custom confidence threshold
npm run merge-duplicate-chefs -- --min-confidence=0.85

# Dry run with lower threshold
npm run merge-duplicate-chefs -- --dry-run --min-confidence=0.8
```

## How It Works

### Step 1: Detection
```
For each pair of chefs:
  1. Calculate name similarity
  2. If similarity ≥ 0.7:
     - Query LLM with web search
     - LLM verifies if same person
     - If confidence ≥ threshold:
       → Mark as duplicate pair
```

### Step 2: Merge Strategy
```
For each duplicate pair:
  1. Send both chef records to LLM
  2. LLM decides:
     - Which record to keep (keeper)
     - Best name, bio, photo, etc.
     - Deduplicated show list
     - Which show is primary
  3. Return merge strategy JSON
```

### Step 3: Execution (Atomic Transaction)
```
For each merge:
  → Call PostgreSQL function: merge_duplicate_chefs()
    1. Validate inputs (keeper/loser exist, not same ID)
    2. Update keeper with merged metadata
    3. Transfer restaurants: loser → keeper
    4. Delete old chef_shows for keeper
    5. Insert deduplicated chef_shows
    6. Delete loser chef record
    7. Return success with stats
  → All steps are atomic (rollback on any failure)
```

## Example Output

```bash
🔍 Scanning for duplicate chefs...

   Mode: DRY RUN
   Min confidence: 0.9
   Interactive: false

📊 Found 182 chefs

🔍 Checking: "Joe Sasto" vs "Joe Sasto" (similarity: 1.00)
   ✅ DUPLICATE CONFIRMED (confidence: 0.95)
      Both chefs have identical names and overlapping show appearances.
      Chef 1 appeared on Top Chef Season 15 as finalist.
      Chef 2 appeared on Tournament of Champions Season 3.
      Social media confirms same person (@chefjoes on Instagram).

================================================================================
DUPLICATE: "Joe Sasto" ↔ "Joe Sasto"
Confidence: 0.95
Both chefs are the same person with split TV appearances

  🔀 Merging: "Joe Sasto" (2 restaurants) → "Joe Sasto" (3 restaurants)
     Keeper ID: abc123...
     Loser ID: def456...
     Reasoning: Kept Chef A as base because it has more restaurants and a complete bio.
                Merged photo from B, combined all TV shows.
     
     [DRY RUN] Would transfer 2 restaurants
     [DRY RUN] Would merge 5 show appearances:
       - Top Chef Season 15 (finalist) [PRIMARY]
       - Tournament of Champions Season 3 (contestant)
       - Beat Bobby Flay Season 8 (contestant)
       - Chopped Season 42 (contestant)
       - Guy's Grocery Games Season 15 (contestant)

✅ Processing complete!
   Duplicates found: 1
   Mode: DRY RUN (no changes made)
```

## Future Enhancements

1. **Interactive Mode**: Prompt user to confirm each merge
2. **Undo Capability**: Track merges in audit table for rollback
3. **Manual Flagging**: Admin UI to manually flag potential duplicates
4. **Automatic Scheduling**: Run detection monthly via cron job
5. **Similarity Tuning**: ML-based name matching instead of simple word overlap

## Database Impact

**Tables Modified** (via atomic transaction):
- `chefs`: Updated with merged metadata, loser deleted
- `restaurants`: chef_id updated to keeper
- `chef_shows`: Deleted for keeper, re-inserted with deduplicated list
- `enrichment_jobs`: Auto-cleaned via ON DELETE CASCADE

**Tables Unaffected**:
- `shows`: Read-only
- `review_queue`: No impact

**Transaction Safety**:
- All operations execute in single PostgreSQL function
- Automatic rollback if any step fails
- No partial merges possible
- Data integrity guaranteed

## Cost Estimation

**Per duplicate pair**:
- Detection (gpt-4o-mini + search): ~$0.01-0.02
- Merge strategy (gpt-4.1): ~$0.05-0.10
- **Total per pair**: ~$0.06-0.12

**For 10 duplicate pairs**: ~$0.60-1.20
**For 50 duplicate pairs**: ~$3.00-6.00

## Security & Safety Features

### SQL Injection Prevention
- All LLM-generated show names sanitized before database queries
- Input validation in PostgreSQL merge function
- Parameterized queries throughout

### Transaction Safety
- All merge operations wrapped in atomic PostgreSQL function
- Automatic rollback on any failure
- No possibility of partial merges or orphaned data

### Data Validation
- Validates both chefs exist before merge
- Prevents merging chef with itself
- Type safety via Zod schemas
- Error tracking for failed show insertions

### LLM Safeguards
- Confidence thresholds (default 0.9)
- Web search verification for duplicates
- Dry-run mode for previewing changes
- Detailed reasoning logged for all decisions

## Testing Checklist

- [ ] Run migration 019_add_show_variants.sql
- [ ] Run migration 020_chef_merge_function.sql
- [ ] Test enrichment on multi-show chef (verify all shows saved)
- [ ] Run detection script with --dry-run
- [ ] Verify merge strategy looks correct
- [ ] Test atomic merge function with known duplicate
- [ ] Verify rollback works on simulated failure
- [ ] Verify restaurants transferred correctly
- [ ] Verify shows deduplicated properly
- [ ] Check chef page shows all restaurants + shows
- [ ] Verify deleted chef is gone
- [ ] Test with edge cases (no bio, no shows, etc.)
