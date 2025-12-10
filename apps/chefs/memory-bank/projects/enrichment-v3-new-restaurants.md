---
Created: 2025-12-10
Status: Planning
Maintainer: RB
---

# Enrichment v3: New Restaurant Discovery

## Problem Statement

The current v2 enrichment system excels at discovering established restaurants with rich web presence but fails for newly announced restaurants where:

1. **Information is fragmented**: Name announced on Instagram, address revealed weeks later, Google Maps not updated for months
2. **Sources are non-traditional**: Instagram stories/posts, chef's personal website, local food blogs — not Wikipedia or established review sites
3. **Data is incomplete by nature**: A restaurant announced 2 months ago may only have a name and target neighborhood, no address yet
4. **Google Places is stale or wrong**: May point to chef's previous location, or not exist at all
5. **The LLM hallucinates**: Tries to fill in missing data with plausible but wrong information

### Real-World Example

Chef announces on Instagram: "Excited to share I'm opening a new spot in Brooklyn this spring!"

**What we know:** Chef name, borough (Brooklyn), timeframe (spring 2025)
**What we don't know:** Restaurant name, exact neighborhood, address, cuisine, price point

**Current v2 behavior:** Either ignores this entirely OR hallucinates details
**Desired v3 behavior:** Creates record with `maturity: 'announced'`, schedules re-check in 2 weeks

## Design Goals

1. **Accept incomplete data**: Save what we know, track what's missing
2. **Progressive enrichment**: Re-check incomplete records on schedule until verified
3. **Source-appropriate search**: Instagram/social for new, Google Places for established
4. **No hallucination**: Mark unknown fields as null, never invent data
5. **Clear data quality signals**: Admin knows which records need attention

## Data Model Changes

### New Fields on `restaurants` Table

```sql
-- Data maturity lifecycle
data_maturity TEXT CHECK (data_maturity IN ('announced', 'partial', 'verified')) DEFAULT 'verified',

-- Expanded status options
-- Modify existing status enum to add: 'coming_soon', 'announced'

-- Discovery tracking
first_discovered_at TIMESTAMPTZ DEFAULT NOW(),
discovery_source TEXT, -- 'instagram', 'press_release', 'food_blog', 'chef_website', etc.

-- Progressive enrichment
incomplete_fields TEXT[], -- ['address', 'cuisine', 'price_tier']
next_enrichment_at TIMESTAMPTZ, -- When to re-check incomplete records
enrichment_attempts INTEGER DEFAULT 0,
last_enrichment_note TEXT, -- "Found address, still missing price tier"

-- Announcement details (for coming_soon restaurants)
announced_opening TEXT, -- "Spring 2025", "Q1 2025", "Early 2025"
announced_neighborhood TEXT, -- "Brooklyn", "West Loop" (when we don't have exact address)
```

### Data Maturity States

| State | Meaning | Required Fields | Next Action |
|-------|---------|-----------------|-------------|
| `announced` | Just discovered, minimal info | name, chef_id, city/neighborhood | Re-check in 1-2 weeks |
| `partial` | Some data, key fields missing | + some of: address, cuisine, status | Re-check in 1 week |
| `verified` | Complete, confirmed data | All core fields populated | Normal refresh cycle (30+ days) |

### Status Expansion

Current: `'open' | 'closed' | 'unknown'`
Proposed: `'open' | 'closed' | 'unknown' | 'coming_soon' | 'announced'`

- `announced`: Chef has announced plans, no opening date
- `coming_soon`: Has announced opening timeframe
- `open`: Confirmed operating
- `closed`: Confirmed closed
- `unknown`: Can't determine

## Search Strategy

### Current v2 Queries (for established restaurants)
```
"{chef} restaurant"
"{chef} owns restaurant"
"{chef} opened restaurant"
"{chef} chef owner"
```

### New v3 Queries (for recent announcements)

**Key Insight:** Tavily cannot directly crawl Instagram (auth-walled), but food journalists pick up chef announcements quickly. We search for *coverage of* announcements, not the posts themselves.

```
"{chef}" new restaurant 2024 2025
"{chef}" opening restaurant announcement
"{chef}" "excited to announce" restaurant
"{chef}" restaurant eater OR "bon appetit" OR "food & wine"
"{chef}" restaurant opening "coming soon"
"{chef}" new project restaurant city
```

**Why this works:**
- Food blogs (Eater, Bon Appétit, local publications) cover chef announcements within days
- Articles often quote/embed Instagram posts, giving us the key info
- Press releases and industry news pick up openings
- Top Chef contestants get extra media attention

### Source Priority by Maturity

**For announced/partial records:**
1. Food news sites (Eater, local food blogs) — fastest coverage of announcements
2. Industry publications (Restaurant Hospitality, Food & Wine)
3. Local news outlets
4. Chef's personal website

**For verified records:**
1. Google Places (authoritative for operational details)
2. Official website
3. Review aggregators (Yelp, TripAdvisor)
4. Wikipedia (for notable establishments)

### Manual Fallback

When automated search finds nothing:
- Admin UI shows "No restaurants found — check Instagram?" prompt
- Admin can manually add announced restaurant with partial data
- System handles progressive enrichment from there

## Service Architecture

### New Components

```
scripts/ingestion/enrichment/
├── services/
│   ├── new-restaurant-discovery-service.ts  # NEW: Instagram/social focused
│   └── restaurant-discovery-service.ts      # EXISTING: unchanged
├── workflows/
│   ├── incomplete-restaurant-refresh.workflow.ts  # NEW: Progressive enrichment
│   └── ...existing workflows...
└── shared/
    └── search-client.ts  # MODIFIED: Add new query types
```

### NewRestaurantDiscoveryService

Purpose: Find recently announced restaurants that traditional search misses.

```typescript
interface AnnouncedRestaurant {
  name: string | null;  // May not know name yet
  chefId: string;
  
  // Location (may be partial)
  city: string | null;
  neighborhood: string | null;  // "Brooklyn", "West Village"
  address: string | null;
  state: string | null;
  
  // Announcement details
  announcedOpening: string | null;  // "Spring 2025"
  discoverySource: 'instagram' | 'press' | 'chef_website' | 'food_blog';
  sourceUrl: string | null;
  
  // What we're missing
  incompleteFields: string[];
  
  // Confidence in what we found
  confidence: number;  // 0-1
}
```

### LLM Prompt Strategy

**Current v2 (strict, factual):**
> "Extract restaurants that chef OWNS from these search results. Only include confirmed ownership."

**New v3 (permissive, announcement-aware):**
> "Extract ANY restaurant announcements, plans, or openings mentioned for this chef. Include:
> - Confirmed restaurants they own
> - Announced but not yet open restaurants  
> - Rumored or planned restaurants (mark as low confidence)
> 
> For each, note what information is confirmed vs. what is missing.
> DO NOT invent or guess missing details — mark them as null."

### IncompleteRestaurantRefreshWorkflow

Purpose: Periodically re-check incomplete records until verified.

```typescript
interface RefreshInput {
  // Query criteria
  maxRecords?: number;
  maturityFilter?: ('announced' | 'partial')[];
  maxAttempts?: number;  // Stop after N failed attempts
}

interface RefreshOutput {
  checked: number;
  upgraded: number;  // announced → partial, or partial → verified
  unchanged: number;
  abandoned: number;  // Exceeded max attempts, flagged for manual review
}
```

**Refresh Schedule:**
- `announced` records: Check every 7-14 days
- `partial` records: Check every 7 days
- After 5 failed attempts: Flag for manual review, stop auto-checking

## Admin UI Changes

### Entity List Enhancements
- Filter dropdown: "Data Maturity" (Announced, Partial, Verified)
- Badge on incomplete records showing missing fields
- Sort by `next_enrichment_at` to prioritize attention

### Dashboard Widget
```
┌─────────────────────────────────────┐
│ Data Completeness                   │
├─────────────────────────────────────┤
│ ● Verified: 1,180 (95%)             │
│ ● Partial: 42 (3%)                  │
│ ● Announced: 15 (1%)                │
│                                     │
│ 12 records due for re-check         │
│ [Run Refresh Now]                   │
└─────────────────────────────────────┘
```

### Manual Actions
- "Force Refresh" button on individual records
- "Mark as Verified" to manually confirm incomplete record
- "Abandon" to stop auto-checking a record that's likely false positive

## Implementation Plan

### Phase 1: Database Schema
- [ ] Migration: Add new fields to restaurants table
- [ ] Migration: Expand status enum
- [ ] Update database.types.ts

### Phase 2: Search Enhancements
- [ ] Add `searchNewAnnouncements()` to search-client.ts
- [ ] Add `searchRecentNews()` with date filtering
- [ ] Configure TTLs for announcement searches (shorter, 3-7 days)

### Phase 3: New Discovery Service
- [ ] Create `new-restaurant-discovery-service.ts`
- [ ] Implement announcement-aware LLM prompts
- [ ] Handle partial data extraction
- [ ] Track incomplete fields

### Phase 4: Progressive Enrichment Workflow
- [ ] Create `incomplete-restaurant-refresh.workflow.ts`
- [ ] Implement maturity state transitions
- [ ] Add cron job for scheduled refreshes
- [ ] Handle max attempts / abandonment

### Phase 5: Admin UI
- [ ] Add maturity filter to entity list
- [ ] Create completeness dashboard widget
- [ ] Add manual refresh/verify/abandon actions

### Phase 6: Integration
- [ ] Update `add-show.ts` to use v3 for recent shows
- [ ] Add flag to choose v2 vs v3 discovery mode
- [ ] Documentation updates

## Cost Estimates

**Per chef (v3 mode):**
- Instagram-focused searches: ~4 queries × $0.01 = $0.04
- Announcement extraction LLM: ~$0.01
- Total: ~$0.05 per chef (vs ~$0.02 for v2)

**Progressive refresh (per incomplete record):**
- Re-search: ~$0.02
- Re-extraction: ~$0.01
- Total: ~$0.03 per refresh attempt

**Monthly maintenance:**
- Assuming 50 incomplete records, 4 refreshes each: ~$6/month

## Success Metrics

1. **Discovery rate**: % of announced restaurants found within 2 weeks of announcement
2. **Completion rate**: % of announced records reaching verified within 60 days
3. **False positive rate**: % of announced records that turn out to be incorrect
4. **Time to verified**: Average days from first discovery to verified status

## Open Questions

1. **Should we track the source URL for discoveries?** (Helps verify, but adds complexity)
2. **How to handle restaurants announced but never opened?** (Chef changed plans)
3. **Should partial records be visible on public site?** (Probably not, but admin should see them)
4. **Integration with existing status verification workflow?** (v3 partial → v2 status check once verified)

## References

- [Enrichment System v2](../architecture/enrichment-system.md)
- [Enrichment Quick Reference](../architecture/enrichment-reference.md)
- [Search Client](../../scripts/ingestion/enrichment/shared/search-client.ts)
