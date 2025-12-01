---
Last-Updated: 2025-12-01
Next-Action: Run initial full enrichment, then add daily enrichment to GitHub Actions
LLM-Models: gpt-5-mini (enrichment + web search via Responses API), gpt-5-nano (filtering)
Maintainer: RB
Status: Phase 5 Complete - Bio Enrichment with Web Search Working
---

# TV Chef Map: Autonomous Data Ingestion System

## Current Status

### ✅ Completed
- **Schema v2 deployed** with all tables (shows, chefs, chef_shows, restaurants, embeddings, review_queue, data_changes, excluded_names)
- **Initial data imported**: 180 chefs, 311 restaurants, 311 embeddings
- **James Beard status** tracking: 10 winners, 18 nominated, 36 semifinalists
- **RLS policies** configured for public read / admin write
- **chef_shows junction table** supports multiple shows per chef
- **Pipeline infrastructure** complete:
  - Orchestrator with CLI args (`--discovery`, `--status-check`, `--dry-run`)
  - Review queue CRUD with batch operations and validation
  - Audit log with change tracking and source attribution
  - Retry logic with exponential backoff + jitter
  - Show registry with JSON config
  - Slug generation and validation utilities
- **TypeScript compilation**: 0 errors (all type issues resolved)
- **Code review**: Critical issues addressed (type safety, error handling, input validation, batch limits)
- **GitHub Actions workflow** for scheduled discovery (weekly) and status checks (daily)
- **Wikipedia scraper** (Phase 2): Generic Playwright scraper for contestant discovery
  - Scrapes wikitables from any configured show's Wikipedia page
  - Extracts name, season, result, hometown
  - Deduplicates with priority scoring (winner > finalist > contestant)
  - Browser instance reuse for performance
- **Change detection** (Phase 2): Diff logic against existing chefs
  - Detects new chefs, season updates, result promotions
  - Auto-applies high-confidence updates (≥0.8) with audit logging
  - Queues low-confidence changes for admin review
- **First live run**: 12 new chefs queued, 3 season updates auto-applied

### ✅ First Enrichment Test Run (2025-12-01)
- **CLI enhancement**: Added `--limit N` flag for batch size control (default: 10)
- **Chef photos**: 10 processed, 8 found (80% hit rate from Wikipedia)
- **Restaurant Places**: 10 processed, 10 matched (100% match rate)
- **Google Places cost**: $0.75 for 10 restaurants (~$0.075/restaurant)
- **Duration**: 36 seconds for 20 total items
- **Data quality**: Ratings 4.3-4.9, review counts 139-7,737
- **Low-confidence warnings**: 2 matches flagged but data still valid

### ✅ Bio Enrichment with Web Search (2025-12-01)
- **Fixed LLM enricher** to use `openai.responses('gpt-5-mini')` with `web_search_preview` tool
- **Added `--enrich-bios` CLI flag** for chef bio generation
- **Increased maxTokens to 8000** (reasoning models need more for web search)
- **Schema made flexible** with `.passthrough()` to handle varying LLM output formats
- **Test results**: 2 chefs processed, both got web-sourced bios with citations
- **Cost**: ~$0.02/chef with web search (~$0.04 for 2 chefs)
- **Duration**: ~100 seconds per chef (web search is slower)
- **Quality**: Bios include current info, citations like `([source.com](url))`

### Current Enrichment Status
| Data Type | Completed | Remaining |
|-----------|-----------|----------|
| Chef bios | 5 | 175 |
| Chef photos | 8 | 172 |
| Restaurant Google Places | 10 | 301 |

### ⏳ Remaining Work
1. **Initial full enrichment** (one-time):
   - Chef bios: 175 remaining × $0.02 = ~$3.50, ~5 hours
   - Chef photos: 172 remaining × Free = $0, ~15 min
   - Restaurant Places: 301 remaining × $0.075 = ~$22.50, ~30 min
   - **Total: ~$26, run in batches of 50**

2. **Add daily enrichment to GitHub Actions**:
   - Catches newly approved chefs automatically
   - Limit 20 bios/day (~$0.40) + 50 restaurants/day (~$3.75)
   - Max daily cost: ~$4 (only if new items exist)

### Crash Safety
- Each chef/restaurant saved immediately after enrichment (not batched)
- Queries skip already-enriched items (`WHERE mini_bio IS NULL`)
- If crashes at item #47, restart picks up at #48
- All changes logged to `data_changes` audit table

### ✅ Phase 3 Complete: Admin Review UI
- Supabase Auth with magic link login
- Email allowlist protection: `rbaten@gmail.com`, `gr0x01@pm.me`
- Middleware-based route protection for `/admin/*`
- `/admin/login` - Magic link authentication
- `/admin/review` - Pending queue with approve/reject
- `/admin/review/[id]` - Individual item detail view
- `/admin/activity` - Audit log of all changes
- RLS policy migration ready: `scripts/migrations/add-admin-rls-policies.sql`

---

## Overview

A hands-off data pipeline that automatically discovers, validates, and maintains TV chef restaurant data with minimal human intervention. Human approval required only for:
- New chefs added to database
- New restaurants discovered
- New shows/sources added to system
- Low-confidence changes

## Architecture

```
┌────────────────────────────────────────────────────────┐
│              GITHUB ACTIONS (daily/weekly)             │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                   SOURCE REGISTRY                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ shows.json - Configure show → Wikipedia mapping  │  │
│  │ Example:                                          │  │
│  │ {                                                 │  │
│  │   "Top Chef": {                                   │  │
│  │     "wikipedia": "List_of_Top_Chef_contestants", │  │
│  │     "enabled": true                               │  │
│  │   },                                              │  │
│  │   "Iron Chef America": {                          │  │
│  │     "wikipedia": "List_of_Iron_Chef_America...", │  │
│  │     "enabled": true                               │  │
│  │   }                                               │  │
│  │ }                                                 │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                 DISCOVERY PIPELINE                      │
│                                                         │
│  1. Scrape Wikipedia contestant lists                  │
│  2. Diff against existing chefs table                  │
│  3. LLM Filter: "Is this person a chef with            │
│     restaurants, or crew/producer/judge-only?"         │
│  4. Filter out → excluded_names table (don't ask again)│
│  5. Passes filter → LLM Enrichment                     │
│                                                         │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                  LLM ENRICHMENT                         │
│           (gpt-5-mini + web_search tool)                │
│                                                         │
│  For new chefs:                                        │
│  - Web search for current restaurants                  │
│  - Generate mini bio (2-3 sentences)                   │
│  - Extract address, city, state                        │
│  - Geocode locations                                   │
│  - Determine cuisine tags, price tier                  │
│  - Verify restaurant status (open/closed)              │
│                                                         │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                 CHANGE DETECTION                        │
│                                                         │
│  Compare enriched data against existing DB records     │
│  Assign confidence score to each change                │
│                                                         │
└─────────────────────────┬──────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
   ┌─────────────────┐        ┌─────────────────┐
   │ HIGH CONFIDENCE  │        │ LOW CONFIDENCE   │
   │ (auto-apply)     │        │ (queue for review)│
   │                  │        │                  │
   │ • Website URL    │        │ • New chef       │
   │   updates        │        │ • New restaurant │
   │ • Address        │        │ • Status: closed │
   │   corrections    │        │ • Major data     │
   │ • Coordinate     │        │   changes        │
   │   refinements    │        │ • Ambiguous info │
   └────────┬─────────┘        └────────┬─────────┘
            │                           │
            ▼                           ▼
   ┌─────────────────┐        ┌─────────────────┐
   │ SUPABASE        │        │ REVIEW QUEUE    │
   │ Auto-update +   │        │ table           │
   │ data_changes    │        │                 │
   │ audit log       │        │ Notification    │
   └─────────────────┘        │ sent to admin   │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ ADMIN REVIEW UI │
                              │ /admin/review   │
                              │ Approve/Reject  │
                              └─────────────────┘
```

## Trigger Mechanism: GitHub Actions

**Why GitHub Actions over alternatives:**

| Option | Pros | Cons |
|--------|------|------|
| **GitHub Actions** | Free unlimited cron, full Node runtime, logs, can run Playwright | Slightly more setup |
| Vercel Cron | Simple | Free tier = 1/day, 10s timeout |
| Supabase Edge | Integrated | 50ms CPU limit, no Playwright |

**Schedule:**
- Discovery pipeline: Weekly (Sunday 2am UTC)
- Status verification: Daily (3am UTC)
- Enrichment for pending items: After discovery completes

## Admin Review Interface

Protected route at `/admin/review` using Supabase Auth:
- Email allowlist (single admin email in RLS policy)
- Simple table view of pending items
- One-click approve/reject/edit
- Activity log of all changes (auto and manual)

```
/admin/review
├── Pending Queue
│   ├── New Chefs (approve/reject/edit)
│   ├── New Restaurants (approve/reject/edit)
│   └── Low-Confidence Updates (approve/reject)
├── Activity Log
│   ├── Auto-applied changes
│   ├── LLM enrichment results
│   └── Scrape run history
└── System Status
    ├── Last run timestamps
    ├── Error counts
    └── Cost tracking
```

## Database Schema v2

Complete schema rebuild for flexibility and future expansion.

### Core Tables

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Shows table
CREATE TABLE shows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    network TEXT,
    wikipedia_source TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Chefs table (show-specific fields moved to junction table)
CREATE TABLE chefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    mini_bio TEXT,
    country TEXT DEFAULT 'US',
    james_beard_status TEXT CHECK (james_beard_status IN ('semifinalist', 'nominated', 'winner')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chef-Show junction (handles multiple shows/seasons per chef)
CREATE TABLE chef_shows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
    show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    season TEXT,              -- "S11", "S05"
    season_name TEXT,         -- "New Orleans", "New York"
    result TEXT CHECK (result IN ('winner', 'finalist', 'contestant', 'judge')),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(chef_id, show_id, season)
);

-- Restaurants table (enhanced with verification tracking)
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
    chef_role TEXT DEFAULT 'owner' CHECK (chef_role IN ('owner', 'executive_chef', 'partner', 'consultant')),
    address TEXT,
    city TEXT NOT NULL,
    state TEXT,
    country TEXT DEFAULT 'US',
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    price_tier TEXT CHECK (price_tier IN ('$', '$$', '$$$', '$$$$')),
    cuisine_tags TEXT[],
    status TEXT DEFAULT 'unknown' CHECK (status IN ('open', 'closed', 'unknown')),
    website_url TEXT,
    maps_url TEXT,
    source_notes TEXT,
    last_verified_at TIMESTAMPTZ,
    verification_source TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Semantic Search (Embeddings)

```sql
-- Restaurant embeddings for semantic search
CREATE TABLE restaurant_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    embedding vector(1536),   -- OpenAI text-embedding-3-small
    text_content TEXT,        -- What was embedded (for debugging)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Vector similarity search index
CREATE INDEX idx_restaurant_embeddings_vector 
    ON restaurant_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

**Embedding text format:**
```
"{restaurant_name} by {chef_name} in {city}, {state}. 
{cuisine_tags}. {price_tier}. 
Chef appeared on {show_name} Season {X}."
```

**Cost:** ~$0.01 for 311 restaurants (text-embedding-3-small)

### Ingestion Pipeline Tables

```sql
-- Review queue for pending approvals
CREATE TABLE review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'new_chef', 'new_restaurant', 'update', 'status_change'
    data JSONB NOT NULL,
    source TEXT, -- 'wikipedia', 'llm_discovery', 'status_check'
    confidence FLOAT, -- 0.0 to 1.0
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    notes TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log for all data changes
CREATE TABLE data_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    change_type TEXT NOT NULL, -- 'insert', 'update', 'delete'
    old_data JSONB,
    new_data JSONB,
    source TEXT NOT NULL, -- 'auto_update', 'llm_enrichment', 'admin_review', 'manual'
    confidence FLOAT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Names filtered out as non-chefs (prevent re-processing)
CREATE TABLE excluded_names (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    show_id UUID REFERENCES shows(id),
    reason TEXT, -- 'not_a_chef', 'no_restaurants', 'judge_only', etc.
    source TEXT, -- 'llm_filter', 'admin_manual'
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Indexes

```sql
-- Core table indexes
CREATE INDEX idx_chefs_slug ON chefs(slug);
CREATE INDEX idx_chef_shows_chef ON chef_shows(chef_id);
CREATE INDEX idx_chef_shows_show ON chef_shows(show_id);
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_chef ON restaurants(chef_id);
CREATE INDEX idx_restaurants_location ON restaurants(city, state, country);
CREATE INDEX idx_restaurants_status ON restaurants(status);

-- Pipeline table indexes
CREATE INDEX idx_review_queue_status ON review_queue(status);
CREATE INDEX idx_review_queue_created ON review_queue(created_at DESC);
CREATE INDEX idx_data_changes_table ON data_changes(table_name, created_at DESC);
CREATE INDEX idx_excluded_names_name ON excluded_names(name);
```

### Triggers

```sql
-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chefs_updated_at 
    BEFORE UPDATE ON chefs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at 
    BEFORE UPDATE ON restaurants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Schema Design Rationale

| Feature | Implementation | Benefit |
|---------|----------------|---------|
| Multiple restaurants per chef | `chef_id` FK in restaurants | Gordon Ramsay can have 50+ restaurants |
| Multiple shows per chef | `chef_shows` junction table | Track appearances across Top Chef, Iron Chef, etc. |
| Season + placement per show | `season`, `result` in chef_shows | "Won S5, competed S3" |
| Chef role at restaurant | `chef_role` column | Owner vs consultant vs executive chef |
| Verification tracking | `last_verified_at`, `verification_source` | Know when data was last confirmed |
| Semantic search | `restaurant_embeddings` with vector | Natural language queries |
| Audit trail | `data_changes` table | Rollback capability, debugging |

## File Structure

```
scripts/
  ingestion/
    orchestrator.ts          # Main entry point for GitHub Action
    config/
      shows.json             # Show → Wikipedia source mappings
    sources/
      wikipedia.ts           # Generic Wikipedia list scraper
      registry.ts            # Load and validate show configs
    processors/
      change-detector.ts     # Diff scraped vs DB, assign confidence
      llm-filter.ts          # Filter non-chefs (gpt-5-nano)
      llm-enricher.ts        # Generate bios, find restaurants (gpt-5-mini)
      geocoder.ts            # Nominatim geocoding service
    queue/
      review-queue.ts        # CRUD for review_queue table
      audit-log.ts           # Write to data_changes table
    utils/
      slug.ts                # Slug generation
      validation.ts          # Data validation rules

app/
  admin/
    layout.tsx               # Auth wrapper (Supabase Auth, email allowlist)
    review/
      page.tsx               # Pending items queue
      [id]/
        page.tsx             # Single item review/edit
    activity/
      page.tsx               # Activity log view
    status/
      page.tsx               # System health dashboard

.github/
  workflows/
    data-ingestion.yml       # Cron: weekly discovery, daily status checks
```

## LLM Usage & Cost Estimates

### Model Selection
| Task | Model | Tools | Input/1M | Output/1M | Est. Cost/Call |
|------|-------|-------|----------|-----------|----------------|
| Chef filter (is this a chef?) | gpt-5-nano | - | $0.05 | $0.40 | ~$0.0001 |
| Chef enrichment (bio, restaurants) | gpt-5-mini | web_search | $0.25 | $2.00 | ~$0.01-0.02 |
| Status verification | gpt-5-mini | web_search | $0.25 | $2.00 | ~$0.005 |

### Web Search via Responses API
OpenAI's Responses API provides a built-in `web_search` tool that GPT-5-mini can use natively.
No separate search API (SerpAPI, Perplexity) needed.

**Vercel AI SDK Integration:**
```typescript
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const result = await generateText({
  model: openai.responses("gpt-5-mini"),
  tools: {
    web_search_preview: openai.tools.webSearchPreview({
      searchContextSize: "medium",
    }),
  },
  prompt: `Find current restaurants owned by chef ${chefName}`,
});
```

### Monthly Cost Projection
| Component | Frequency | Est. Cost |
|-----------|-----------|-----------|
| Discovery filtering | ~50 new names/week | ~$0.02 |
| Chef enrichment (w/ web search) | ~10 approved/week | ~$0.50 |
| Status checks (w/ web search) | 311+ restaurants/month | ~$1.50 |
| **Total** | | **~$5-10/month** |

**Note:** Web search costs more than pure LLM calls but provides accurate, current data.

**Budget:** $20-50/month acceptable. Current estimates well under budget (~90% margin).

### Cost Controls
- Daily/weekly limits on LLM calls
- Caching of LLM responses (7-day TTL for bios)
- Batch processing to reduce overhead
- Alerts if approaching budget thresholds

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1) ✅ COMPLETE
- [x] Database migrations (review_queue, data_changes, excluded_names)
- [x] Basic orchestrator script structure
- [x] Review queue and audit log modules with retry logic
- [x] Show registry with JSON configuration
- [x] Slug generation and validation utilities
- [x] TypeScript compilation clean (0 errors)
- [x] Environment/secrets setup
- [x] GitHub Action workflow skeleton

### Phase 2: Change Detection & Auto-Updates (Week 2) ✅ COMPLETE
- [x] Wikipedia scraper for contestant lists
- [x] Diff logic against existing chefs table
- [x] Auto-apply high-confidence changes
- [x] Audit logging to data_changes

### Phase 3: Admin Review UI (Week 3) ✅ COMPLETE
- [x] Supabase Auth setup with email allowlist
- [x] `/admin/review` pending queue page
- [x] Approve/reject/edit workflow
- [x] Activity log view

### Phase 4: Discovery Pipeline (Week 4) ✅ COMPLETE
- [x] LLM filter integration (gpt-4o-mini)
- [x] excluded_names table population
- [x] Queue new chefs for review (with filter bypass for already-excluded)
- [x] Dynamic confidence scoring (Wikipedia structured: 85% base + boosts)
- [x] Cost tracking (tokens, estimated cost per run)

### Phase 5: LLM Enrichment & Media Pipeline (Week 5) 🔄 IN PROGRESS
- [x] Vercel AI SDK setup with `@ai-sdk/openai`
- [x] GPT-5-mini + web_search tool for restaurant discovery
- [x] Bio generation for approved chefs (llm-enricher.ts)
- [x] Structured output parsing (name, address, cuisine, price)
- [x] Status verification pipeline with web search
- [x] Cost tracking and rate limiting
- [x] Chef photo pipeline (Wikipedia → TMDB fallback)
- [x] Google Places API integration (rating, reviews, photos)
- [x] Media enricher pipeline orchestration
- [x] Database migration for enrichment fields
- [ ] Run enrichment on production data
- [ ] Geocoding integration (Nominatim) - deferred

#### New Files Created
```
scripts/ingestion/
  services/
    google-places.ts      # Google Places API (New) wrapper
    wikipedia-images.ts   # Wikimedia Commons API for chef photos
    tmdb.ts               # TMDB API for celebrity chef photos
  processors/
    llm-enricher.ts       # GPT-5-mini + web_search for bios/restaurants
    media-enricher.ts     # Orchestrates photo/places enrichment

scripts/migrations/
  add-enrichment-fields.sql  # Schema for photos, Google Places data
```

#### Enrichment Data Sources
| Data Type | Primary Source | Fallback | Cost |
|-----------|---------------|----------|------|
| Chef Photos | Wikipedia/Commons | TMDB | Free |
| Restaurant Photos | Google Places | - | ~$0.007/photo |
| Ratings/Reviews | Google Places | - | ~$0.022/place |
| Chef Bios | GPT-5-mini + web_search | - | ~$0.01-0.02/chef |
| Status Verification | GPT-5-mini + web_search | - | ~$0.005/restaurant |

## Show Configuration

New shows are added by updating `scripts/ingestion/config/shows.json`:

```json
{
  "shows": [
    {
      "name": "Top Chef",
      "slug": "top-chef",
      "network": "Bravo",
      "wikipedia_source": "List_of_Top_Chef_contestants",
      "enabled": true,
      "priority": 1
    },
    {
      "name": "Iron Chef America",
      "slug": "iron-chef-america",
      "network": "Food Network",
      "wikipedia_source": "List_of_Iron_Chef_America_episodes",
      "enabled": false,
      "priority": 2
    },
    {
      "name": "Tournament of Champions",
      "slug": "tournament-of-champions",
      "network": "Food Network",
      "wikipedia_source": "Tournament_of_Champions_(TV_series)",
      "enabled": false,
      "priority": 3
    }
  ]
}
```

To add a new show:
1. Add entry to shows.json with Wikipedia source
2. Set `enabled: true`
3. Pipeline will pick it up on next run
4. New chefs go to review queue for approval

## Success Metrics

### Data Quality
- **Coverage**: % of TV chefs with restaurants in database
- **Accuracy**: % of restaurants with verified current status
- **Freshness**: Average days since last verification
- **Completeness**: % of chefs with bios and full metadata

### System Health
- **Discovery Success Rate**: Valid chefs found / names processed
- **Filter Accuracy**: Correct chef/non-chef classifications
- **Enrichment Quality**: % of enrichments requiring no edits
- **Cost Efficiency**: Cost per chef maintained per month

## Future Enhancements

- **Slack/Discord notifications** for pending reviews
- **Bulk approve** for high-confidence batches
- **Source priority ranking** when multiple sources conflict
- **Scheduled enrichment refresh** for stale bios
- **API rate limiting** for external services
- **Rollback capability** using data_changes audit log
- **Outscraper integration** for unlimited Google reviews (if needed)
- **Yelp Fusion API** for additional review data (paid)
- **Image CDN** for optimized photo delivery
