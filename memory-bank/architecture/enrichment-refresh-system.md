---
Last-Updated: 2025-12-03
Maintainer: RB
Status: Phase 3 Complete - Production Ready
Phase: Implementation
---

# Enrichment Refresh System: Architecture Document

## Executive Summary

**Objective**: Build an automated data refresh system with admin controls to keep chef and restaurant data current through monthly re-enrichment and weekly status verification.

**Problem**: Data goes stale over time:
- Restaurants open/close
- Chefs move between restaurants
- Awards and accolades are earned
- Better photos become available

**Solution**: Hybrid automated + manual enrichment system with budget controls, admin monitoring, and flexible scheduling.

**Timeline**: 3-4 days
**Budget Impact**: ~$10-20/month in LLM costs

---

## Current State Assessment

### Existing Enrichment Infrastructure ✅

**Components Already Built**:
1. **Cron Job**: `/api/cron/process-approved-queue`
   - Runs every 5 minutes
   - Processes approved chef submissions
   - Creates and processes enrichment jobs
   - Has retry logic with exponential backoff

2. **LLM Enricher**: `scripts/ingestion/processors/llm-enricher.ts`
   - Full chef enrichment (bio, restaurants, awards, photos)
   - Restaurant-only discovery
   - Restaurant status verification
   - Token usage tracking
   - Cost estimation

3. **Database Tables**:
   - `enrichment_jobs` - Job tracking with status/retry
   - `review_queue` - Community submission queue
   - `chefs` - Chef data with `last_enriched_at`
   - `restaurants` - Restaurant data

4. **Admin Pages**:
   - `/admin/enrichment-jobs` - Job monitoring (existing)
   - `/admin/data` - Data completeness dashboard
   - `/admin/manage` - Photo upload and data editing

### Current Enrichment Flow

```
User Submission → Review Queue (approved) → Create Chef Record 
    → Create Enrichment Job (queued) → Cron Picks Up Job 
    → LLM Enricher Processes → Save Results → Mark Complete
```

**Performance**:
- Max 2 jobs per cron run (5 min intervals)
- 3 retry attempts with exponential backoff
- 10-minute job locks to prevent duplicate processing
- Typical job duration: 15-30 seconds

---

## Problem Statement

### Data Staleness Issues

1. **Restaurant Status Changes** (High Impact)
   - Restaurants close without warning
   - Chefs leave/join restaurants
   - ~10-15% annual churn rate in restaurant industry

2. **Award Updates** (Medium Impact)
   - Michelin stars awarded/revoked annually
   - James Beard awards announced yearly
   - Media accolades accumulate

3. **Photo Quality** (Low Impact)
   - Better professional headshots become available
   - Restaurants update their imagery

4. **New Restaurant Openings** (High Impact)
   - Chefs open new locations
   - Pop-ups become permanent
   - Partnerships and consulting roles

### Current Limitations

- **No automated refresh**: Once enriched, data never updates
- **No staleness tracking**: Can't identify outdated data
- **No budget controls**: Could accidentally overspend on LLM calls
- **Manual-only re-enrichment**: Requires admin to manually trigger scripts
- **No visibility**: Can't see when data was last verified

---

## Proposed Solution

### Three-Tiered Refresh Strategy

#### **Tier 1: Monthly Full Re-enrichment** 💎
**Target**: Top 50-100 chefs by importance
**Frequency**: 1st of each month, 2 AM UTC
**Scope**: Full enrichment (bio, restaurants, awards, photo)
**Cost**: ~$10-15/month
**Priority Scoring**:
- Restaurant count (more restaurants = higher priority)
- Last enriched date (oldest first)
- User feedback flags (if verification system exists)

#### **Tier 2: Weekly Status Verification** ⚡
**Target**: Top 100 restaurants by traffic/importance
**Frequency**: Sunday, 3 AM UTC
**Scope**: Status verification only (open/closed/unknown)
**Cost**: ~$2-5/month
**Focus**: Restaurants marked "open" that are >30 days old

#### **Tier 3: Manual Admin Triggers** 🎯
**Target**: Any chef or restaurant
**Frequency**: On-demand by admin
**Scope**: Configurable (full enrichment, restaurants only, status check)
**Cost**: Tracked separately, no budget limit
**Use Cases**:
- User reports incorrect data
- Admin adds new chef manually
- Spot-checking data quality

---

## Technical Architecture

### Database Schema Changes

#### **1. Enhanced `enrichment_jobs` Table**

```sql
-- Add new columns for tracking and cost management
ALTER TABLE enrichment_jobs ADD COLUMN IF NOT EXISTS
  enrichment_type TEXT CHECK (enrichment_type IN (
    'initial',           -- First-time chef enrichment
    'manual_full',       -- Admin-triggered full re-enrichment
    'manual_restaurants',-- Admin-triggered restaurant discovery only
    'manual_status',     -- Admin-triggered status verification
    'monthly_refresh',   -- Scheduled monthly full refresh
    'weekly_status'      -- Scheduled weekly status check
  )),
  triggered_by TEXT,     -- 'cron' or admin user email
  tokens_used JSONB,     -- {prompt: 1234, completion: 567, total: 1801}
  cost_usd NUMERIC(10, 4), -- Estimated cost in USD
  priority_score INT DEFAULT 0, -- Higher = more important
  
  -- Add index for type filtering
  CREATE INDEX idx_enrichment_jobs_type ON enrichment_jobs(enrichment_type);
  CREATE INDEX idx_enrichment_jobs_triggered_by ON enrichment_jobs(triggered_by);
```

#### **2. New `enrichment_budgets` Table**

```sql
-- Monthly budget tracking and reporting
CREATE TABLE IF NOT EXISTS enrichment_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL UNIQUE, -- YYYY-MM-01 format
  budget_usd NUMERIC(10, 2) DEFAULT 20.00,
  spent_usd NUMERIC(10, 4) DEFAULT 0,
  manual_spent_usd NUMERIC(10, 4) DEFAULT 0, -- Separate tracking
  jobs_completed INT DEFAULT 0,
  jobs_failed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enrichment_budgets_month ON enrichment_budgets(month DESC);

-- Helper function to update budget
CREATE OR REPLACE FUNCTION increment_budget_spend(
  p_month DATE,
  p_amount NUMERIC,
  p_is_manual BOOLEAN DEFAULT FALSE
) RETURNS void AS $$
BEGIN
  INSERT INTO enrichment_budgets (month, spent_usd, manual_spent_usd, jobs_completed)
  VALUES (
    DATE_TRUNC('month', p_month),
    CASE WHEN p_is_manual THEN 0 ELSE p_amount END,
    CASE WHEN p_is_manual THEN p_amount ELSE 0 END,
    1
  )
  ON CONFLICT (month) DO UPDATE SET
    spent_usd = enrichment_budgets.spent_usd + CASE WHEN p_is_manual THEN 0 ELSE p_amount END,
    manual_spent_usd = enrichment_budgets.manual_spent_usd + CASE WHEN p_is_manual THEN p_amount ELSE 0 END,
    jobs_completed = enrichment_budgets.jobs_completed + 1,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;
```

#### **3. Enhanced `chefs` Table**

```sql
-- Better tracking of data freshness
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS
  last_verified_at TIMESTAMPTZ,  -- Last time ANY data was checked
  enrichment_priority INT DEFAULT 50, -- 0-100, higher = refresh sooner
  manual_priority BOOLEAN DEFAULT FALSE; -- Admin flagged for attention

CREATE INDEX idx_chefs_refresh_priority ON chefs(
  enrichment_priority DESC,
  last_enriched_at ASC NULLS FIRST
);
```

#### **4. Enhanced `restaurants` Table**

```sql
-- Already has last_verified_at and verification_source
-- Add priority tracking
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS
  verification_priority INT DEFAULT 50; -- 0-100

CREATE INDEX idx_restaurants_verification_priority ON restaurants(
  verification_priority DESC,
  last_verified_at ASC NULLS FIRST
) WHERE status = 'open';
```

---

### New API Endpoints

#### **Admin Enrichment Controls**

**1. POST `/api/admin/enrichment/trigger-chef`**
```typescript
// Manually trigger enrichment for a specific chef
{
  chefId: string;
  enrichmentType: 'full' | 'restaurants_only' | 'photo_only';
  priority?: number; // Optional override (default: 100)
}

Response:
{
  success: boolean;
  jobId: string;
  estimatedCost: number;
  queuePosition: number;
}
```

**2. POST `/api/admin/enrichment/trigger-restaurant-status`**
```typescript
// Manually verify restaurant status
{
  restaurantId: string;
}

Response:
{
  success: boolean;
  jobId: string;
  currentStatus: 'open' | 'closed' | 'unknown';
}
```

**3. POST `/api/admin/enrichment/bulk-refresh`**
```typescript
// Trigger batch refresh
{
  chefIds: string[];
  enrichmentType: 'full' | 'restaurants_only';
}

Response:
{
  success: boolean;
  jobsCreated: number;
  estimatedCost: number;
  warningIfBudgetExceeded?: string;
}
```

**4. GET `/api/admin/enrichment/stats`**
```typescript
// Get current enrichment stats and budget status
Response:
{
  currentMonth: {
    budgetUsd: 20.00,
    spentUsd: 4.23,
    manualSpentUsd: 1.50,
    jobsCompleted: 42,
    jobsFailed: 3,
    percentUsed: 21.15
  },
  lastRuns: {
    monthlyRefresh: '2025-12-01T02:00:00Z',
    weeklyStatus: '2025-12-01T03:00:00Z'
  },
  nextScheduled: {
    monthlyRefresh: '2026-01-01T02:00:00Z',
    weeklyStatus: '2025-12-08T03:00:00Z'
  },
  queueStatus: {
    queued: 3,
    processing: 1,
    avgProcessingTime: 24.5 // seconds
  }
}
```

**5. PATCH `/api/admin/enrichment/budget`**
```typescript
// Update monthly budget limit
{
  month: '2025-12-01',
  budgetUsd: 25.00
}
```

---

### New Cron Jobs

#### **1. Monthly Refresh Cron**

**File**: `/api/cron/monthly-refresh/route.ts`
**Schedule**: `0 2 1 * *` (1st of month, 2 AM UTC)
**Max Duration**: 600s (10 minutes)

```typescript
export async function GET(request: NextRequest) {
  // 1. Verify cron secret
  // 2. Check monthly budget (stop if >80% used)
  // 3. Calculate priority scores for all chefs
  //    - restaurantCount * 10
  //    - daysSinceLastEnriched * 0.5
  //    - manualPriority ? +50 : 0
  // 4. Select top 50 chefs by priority
  // 5. Create enrichment jobs with type='monthly_refresh'
  // 6. Set reasonable batch limits (5-10 jobs max per run)
  // 7. Return summary stats
}
```

**Priority Scoring Algorithm**:
```typescript
function calculatePriority(chef: Chef): number {
  const restaurantCount = chef.restaurantCount || 0;
  const daysSinceEnriched = chef.last_enriched_at 
    ? daysSince(chef.last_enriched_at) 
    : 365;
  
  let score = 0;
  score += restaurantCount * 10;  // More restaurants = higher priority
  score += Math.min(daysSinceEnriched * 0.5, 100); // Max 100 pts for staleness
  score += chef.manual_priority ? 50 : 0; // Admin flagged
  score += chef.enrichment_priority || 50; // Base priority
  
  return Math.min(score, 200); // Cap at 200
}
```

#### **2. Weekly Status Check Cron**

**File**: `/api/cron/weekly-status-check/route.ts`
**Schedule**: `0 3 * * 0` (Sunday, 3 AM UTC)
**Max Duration**: 300s (5 minutes)

```typescript
export async function GET(request: NextRequest) {
  // 1. Verify cron secret
  // 2. Select restaurants with:
  //    - status = 'open'
  //    - last_verified_at > 30 days ago OR NULL
  //    - verification_priority > 30
  // 3. Order by verification_priority DESC
  // 4. Limit to 100 restaurants
  // 5. Create enrichment jobs with type='weekly_status'
  // 6. Process in batches (10-20 per cron run)
}
```

**Budget Safety Checks**:
```typescript
// Before creating jobs
const currentBudget = await getBudgetForMonth(new Date());
if (currentBudget.spent_usd / currentBudget.budget_usd > 0.8) {
  console.warn('[Cron] Budget 80% used, limiting batch size');
  batchSize = Math.floor(batchSize / 2);
}

if (currentBudget.spent_usd >= currentBudget.budget_usd) {
  console.error('[Cron] Budget exhausted, skipping scheduled refresh');
  return NextResponse.json({ 
    success: false, 
    error: 'Monthly budget exhausted' 
  });
}
```

---

### Enhanced LLM Enricher Integration

#### **Cost Tracking Middleware**

Update `llm-enricher.ts` to save cost data:

```typescript
// After each successful enrichment
const result = await enrichAndSaveChef(...);

if (result.success) {
  // Save token usage and cost
  await supabase
    .from('enrichment_jobs')
    .update({
      tokens_used: result.tokensUsed,
      cost_usd: estimateCost(result.tokensUsed)
    })
    .eq('id', jobId);
  
  // Update monthly budget
  await supabase.rpc('increment_budget_spend', {
    p_month: new Date(),
    p_amount: estimateCost(result.tokensUsed),
    p_is_manual: enrichmentType.startsWith('manual_')
  });
}
```

#### **Budget-Aware Processing**

```typescript
// In cron route, before processing jobs
const budget = await getBudgetForMonth(new Date());
const remainingBudget = budget.budget_usd - budget.spent_usd;
const estimatedCostPerJob = 0.15; // ~$0.10-0.20 per chef enrichment

const maxJobs = Math.floor(remainingBudget / estimatedCostPerJob);
const jobsToProcess = Math.min(jobsAvailable, maxJobs, 10);

console.log(`[Cron] Budget allows ${maxJobs} jobs, processing ${jobsToProcess}`);
```

---

## Admin UI Design

### Enhanced `/admin/enrichment-jobs` Page

#### **Component Structure**

```
EnrichmentControlCenter (Server Component)
├── BudgetTracker (Server Component)
│   ├── Current month spend vs limit
│   ├── Manual spend tracking (separate)
│   ├── Progress bar with warning colors
│   └── Jobs completed this month
│
├── RefreshScheduleStatus (Server Component)
│   ├── Next monthly refresh countdown
│   ├── Last weekly check status
│   └── Quick stats (success rate, avg duration)
│
├── ManualTriggerSection (Client Component)
│   ├── ChefEnrichmentTrigger
│   │   ├── Chef selector (searchable dropdown)
│   │   ├── Type selector (full/restaurants/photo)
│   │   ├── Priority slider (0-100)
│   │   └── Trigger button with cost estimate
│   │
│   ├── RestaurantStatusTrigger
│   │   ├── Restaurant selector (searchable dropdown)
│   │   └── Trigger button
│   │
│   └── BulkRefreshTrigger
│       ├── Chef multi-select
│       ├── Type selector
│       └── Trigger button with total cost estimate
│
├── JobStatsCards (Server Component)
│   ├── Queued count
│   ├── Processing count
│   ├── Completed count (24h)
│   └── Failed count (24h)
│
└── JobHistoryTable (Server Component)
    ├── Filter by type, status, date
    ├── Shows: Chef, Type, Status, Error, Duration, Triggered By
    └── Pagination (100 per page)
```

#### **UI Mockup**

```
┌────────────────────────────────────────────────────────────────────┐
│ 🔄 Enrichment Control Center                                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 💰 Budget Status (December 2025)                                   │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Automated: $4.23 / $20.00 (21% used)                         │   │
│ │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░               │   │
│ │                                                               │   │
│ │ Manual: $1.50 (tracked separately)                           │   │
│ │ Jobs completed: 42 • Failed: 3 • Success rate: 93%           │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ 📅 Scheduled Refresh Status                                        │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Monthly Full Refresh:  Next run in 28 days (Jan 1, 2:00 AM) │   │
│ │ Weekly Status Check:   Last run 2 days ago (94 verified)    │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ 🎯 Manual Triggers                                                 │
│ ┌──────────────┬──────────────────┬─────────────────────┐          │
│ │ Re-enrich    │ Find New         │ Verify Restaurant   │          │
│ │ Chef         │ Restaurants      │ Status              │          │
│ │              │                  │                     │          │
│ │ [Search...]  │ [Search Chef...] │ [Search Rest...]    │          │
│ │ • Full       │                  │                     │          │
│ │ ○ Restaurants│ Only discover    │ Check if still      │          │
│ │ ○ Photo only │ new restaurants  │ open/closed         │          │
│ │              │                  │                     │          │
│ │ Priority: 75 │ Priority: 100    │ Priority: 100       │          │
│ │ ▓▓▓▓▓▓▓▓░░   │                  │                     │          │
│ │              │                  │                     │          │
│ │ Est: ~$0.15  │ Est: ~$0.08      │ Est: ~$0.02         │          │
│ │              │                  │                     │          │
│ │ [Trigger]    │ [Trigger]        │ [Trigger]           │          │
│ └──────────────┴──────────────────┴─────────────────────┘          │
│                                                                     │
│ 📊 Stats: ⏱ Queued (3) • 🔄 Processing (1) • ✅ Done (247) • ❌ Failed (5)│
│                                                                     │
│ 📋 Recent Jobs (Last 100)                                          │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Chef          Type      Status   Cost    Duration  Triggered │   │
│ ├──────────────────────────────────────────────────────────────┤   │
│ │ Chris Crary   Monthly   ✅ Done  $0.14   24s       Cron     │   │
│ │ Sarah Welch   Manual    🔄 Run   -       8s        admin@   │   │
│ │ Tom Colicchio Initial   ❌ Fail  -       -         Cron     │   │
│ │ Brooke W.     Weekly    ✅ Done  $0.02   6s        Cron     │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Database & Infrastructure (Day 1) 🏗️ ✅ COMPLETE

**Tasks**:
- [x] Create migration `010_enrichment_refresh_system.sql`
  - [x] Add columns to `enrichment_jobs` (enrichment_type, triggered_by, tokens_used, cost_usd, priority_score)
  - [x] Create `enrichment_budgets` table
  - [x] Add columns to `chefs` (last_verified_at, enrichment_priority, manual_priority)
  - [x] Add columns to `restaurants` (verification_priority)
  - [x] Create helper function `increment_budget_spend()`
  - [x] Create indexes for new columns
  - [x] Add NOT NULL constraint on enrichment_type (code reviewer suggestion)

- [x] Update TypeScript types
  - [x] Migration applied successfully to database
  - [x] New schema columns available

- [x] Test migration locally
  - [x] Applied migration successfully
  - [x] Schema changes verified
  - [x] Budget function tested

- [x] Code reviews completed
  - [x] **code-architect review**: Grade A- (excellent design, production-ready)
  - [x] **code-reviewer review**: Score 8.5/10 (approved with suggestions)

**Deliverables**:
- ✅ Migration file `010_enrichment_refresh_system.sql` (184 lines)
- ✅ Applied to production database successfully
- ✅ Architecture validated by code-architect subagent
- ✅ Code quality validated by code-reviewer subagent

**Key Improvements Applied**:
- Added NOT NULL constraint on `enrichment_type` after data backfill
- Comprehensive indexing strategy with partial indexes
- Safe concurrent UPSERT in budget function
- Priority-based querying optimized with composite indexes

---

### Phase 2: Budget & Cost Tracking + API Endpoints (Day 2) 🔌 ✅ COMPLETE

**Tasks**:
- [x] Create budget helper library
  - [x] `lib/enrichment/constants.ts` - Config defaults (budget limits, batch sizes, cost estimates, model pricing)
  - [x] `lib/enrichment/budget.ts` - Helper functions
    - [x] `getModelPricing(modelName)` - Get pricing for any model from constants
    - [x] `estimateCostFromTokens(tokensUsed, modelName)` - Calculate cost from token usage
    - [x] `getBudgetForMonth(date)` - Query monthly budget from DB
    - [x] `checkBudgetAvailable(estimatedCost)` - Validate against budget limits
    - [x] `incrementBudgetSpend(month, cost, isManual)` - Update budget tracking
    - [x] `ensureBudgetExists()` - Initialize budget for new month
    - [x] `updateBudgetLimit()` - Admin function to change budget

- [x] Update existing enrichment flow
  - [x] Modified `process-approved-queue/route.ts` to set `enrichment_type='initial'`
  - [x] Updated to save `tokens_used` and `cost_usd` after enrichment
  - [x] Call `incrementBudgetSpend()` after successful enrichment
  - [x] Added logging for cost tracking

- [x] Create `/api/admin/enrichment/*` routes
  - [x] `trigger-chef/route.ts` - Manual chef re-enrichment with type selection
  - [x] `trigger-restaurant-status/route.ts` - Manual restaurant status check
  - [x] `bulk-refresh/route.ts` - Batch operations with budget validation
  - [x] `stats/route.ts` - Budget & job statistics dashboard data
  - [x] `budget/route.ts` - Update budget limits (PATCH endpoint)

- [x] Add auth middleware
  - [x] `lib/auth/admin.ts` - Admin authentication helpers
  - [x] `verifyAdminAuth()` - Verify Supabase Auth token
  - [x] Response helpers for consistent error handling

- [x] Add error handling and validation
  - [x] Zod schemas for all request bodies
  - [x] Comprehensive error responses
  - [x] Budget validation before job creation

**Deliverables**:
- ✅ Budget helper library (2 files: constants.ts, budget.ts)
- ✅ Auth middleware (1 file: lib/auth/admin.ts)
- ✅ Updated cron route with cost tracking
- ✅ 5 new API route files (trigger-chef, trigger-restaurant-status, bulk-refresh, stats, budget)
- ✅ TypeScript types updated for new DB schema
- ✅ Model pricing reference documentation (`memory-bank/architecture/llm-models.md`)
- ✅ All TypeScript compilation errors resolved

**Key Improvements**:
- Centralized model pricing in architecture docs (not hardcoded)
- Budget tracking separated for automated vs manual triggers
- Comprehensive budget validation before expensive operations
- Admin API secured with Supabase Auth
- Cost estimation based on actual model pricing

---

### Phase 3: Scheduled Cron Jobs (Day 2-3) ⏰ ✅ COMPLETE

**Tasks**:
- [x] Create `/api/cron/monthly-refresh/route.ts`
  - [x] Verify cron secret authentication
  - [x] Check monthly budget (stop if >80% used)
  - [x] Implement priority scoring algorithm
    - [x] Calculate scores based on: restaurant count, staleness, manual flags
    - [x] Order chefs by priority DESC
  - [x] Select top 50 chefs by priority
  - [x] Create enrichment jobs with `type='monthly_refresh'`
  - [x] Set batch limits (5 jobs max per run, adaptive)
  - [x] Return summary stats

- [x] Create `/api/cron/weekly-status-check/route.ts`
  - [x] Verify cron secret authentication
  - [x] Select restaurants with status='open' and last_verified_at >30 days old
  - [x] Order by verification_priority DESC
  - [x] Limit to 100 restaurants
  - [x] Create enrichment jobs with `type='weekly_status'`
  - [x] Process in batches (20 jobs per cron run)

- [x] Update `vercel.json` with new cron schedules
  - [x] Add monthly-refresh: `0 2 1 * *` (1st of month, 2 AM UTC)
  - [x] Add weekly-status-check: `0 3 * * 0` (Sunday, 3 AM UTC)

- [x] Test cron jobs locally (manual trigger via curl)

- [x] Code review and fixes
  - [x] **code-reviewer subagent review** completed
  - [x] UUID validation for chef_id added
  - [x] Hard-coded values moved to constants (VERIFICATION_CONFIG)
  - [x] Error handling standardized (continue instead of throw)
  - [x] Error logging consistency improved

**Deliverables**:
- ✅ `/src/app/api/cron/monthly-refresh/route.ts` (215 lines)
- ✅ `/src/app/api/cron/weekly-status-check/route.ts` (181 lines)
- ✅ Updated `vercel.json` with 3 total cron jobs
- ✅ Local cron tests pass (5 jobs + 20 jobs created successfully)
- ✅ TypeScript compilation clean for new files
- ✅ All code review fixes applied

**Key Features Implemented**:
- Priority scoring: `(restaurants × 10) + (staleness × 0.5) + manual_flag + base_priority`
- Budget safety checks with adaptive batch sizing (halves at 80% threshold)
- UUID validation with custom regex function
- Configuration constants (VERIFICATION_CONFIG)
- Graceful error handling without breaking job processing
- Comprehensive logging for monitoring

---

### Phase 4: Admin UI Enhancement (Day 3-4) 🎨

**Tasks**:
- [ ] Create UI components for `/admin/enrichment-jobs/page.tsx`
  - [ ] `BudgetTracker.tsx` (Server Component)
    - [ ] Display current month spend vs limit
    - [ ] Show manual spend separately
    - [ ] Progress bar with warning colors (>80% = yellow, 100% = red)
    - [ ] Jobs completed/failed counts
  
  - [ ] `RefreshScheduleStatus.tsx` (Server Component)
    - [ ] Next monthly refresh countdown
    - [ ] Last weekly check status
    - [ ] Quick stats (success rate, avg duration)
  
  - [ ] `ManualTriggerSection.tsx` (Client Component)
    - [ ] Chef enrichment trigger with searchable dropdown
    - [ ] Restaurant status trigger with searchable dropdown
    - [ ] Bulk refresh trigger with multi-select
    - [ ] Cost estimates for each trigger
    - [ ] Priority slider (0-100)

  - [ ] `ChefSearchDropdown.tsx` (Client Component)
    - [ ] Searchable chef selector using Supabase query
    - [ ] Display chef name + slug

  - [ ] `RestaurantSearchDropdown.tsx` (Client Component)
    - [ ] Searchable restaurant selector
    - [ ] Display restaurant name + city

- [ ] Enhance `/admin/enrichment-jobs/page.tsx`
  - [ ] Add BudgetTracker section at top
  - [ ] Add RefreshScheduleStatus section
  - [ ] Add ManualTriggerSection
  - [ ] Update job history table with new columns:
    - [ ] Enrichment type (initial, manual_full, monthly_refresh, etc.)
    - [ ] Cost (USD)
    - [ ] Triggered by (cron or admin email)
  - [ ] Add type/status filters
  - [ ] Update stats cards with 24h data

- [ ] Update admin navigation
  - [ ] Ensure "Enrichment" link is in AdminNav.tsx
  - [ ] Proper active state highlighting

- [ ] Style with existing Tailwind classes (match design system)

**Deliverables**:
- 5 new React components
- Enhanced enrichment jobs page with full control center UI
- Updated admin navigation
- UI matches existing design system

---

### Phase 5: Testing & Deployment (Day 4) ✨

**Tasks**:
- [ ] End-to-end testing
  - [ ] Manually trigger chef enrichment via admin UI
  - [ ] Verify budget tracking (cost saved to DB)
  - [ ] Test bulk refresh (multiple chefs)
  - [ ] Simulate budget limit scenarios (near 80%, at 100%)
  - [ ] Verify monthly/weekly cron jobs (manual HTTP trigger)

- [ ] UI testing
  - [ ] Test all manual triggers (chef, restaurant, bulk)
  - [ ] Verify cost estimates display correctly
  - [ ] Check responsive design (mobile, tablet, desktop)
  - [ ] Test searchable dropdowns
  - [ ] Verify real-time job status updates

- [ ] Documentation updates
  - [ ] Update `memory-bank/development/activeContext.md` (mark Phase 3 complete)
  - [ ] Update `memory-bank/development/progress.md` (add milestone)
  - [ ] Add operational notes to `memory-bank/development/operations.md`
  - [ ] Document budget defaults and cron schedules

- [ ] Deploy to production
  - [ ] Run `npm run type-check` and `npm run lint`
  - [ ] Merge to main branch
  - [ ] Verify deployment on Vercel
  - [ ] Verify cron jobs scheduled correctly in Vercel dashboard
  - [ ] Monitor first scheduled runs (monthly/weekly)

**Deliverables**:
- All tests passing
- Documentation updated
- Production deployment with 3 active cron jobs
- Monitoring confirmed

---

## Configuration & Settings

### Environment Variables

```bash
# Existing (no changes needed)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
CRON_SECRET=...

# Optional: Future notification system
ADMIN_EMAIL=admin@example.com # For budget warnings
```

### Vercel Cron Configuration

**Update `vercel.json`**:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-approved-queue",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/monthly-refresh",
      "schedule": "0 2 1 * *"
    },
    {
      "path": "/api/cron/weekly-status-check",
      "schedule": "0 3 * * 0"
    }
  ]
}
```

### Budget Defaults

```typescript
// lib/enrichment/constants.ts
export const ENRICHMENT_CONFIG = {
  MONTHLY_BUDGET_USD: 20.00,
  BUDGET_WARNING_THRESHOLD: 0.8, // 80%
  MAX_JOBS_PER_CRON_RUN: 10,
  
  MONTHLY_REFRESH: {
    TOP_CHEFS_COUNT: 50,
    MAX_BATCH_SIZE: 5,
  },
  
  WEEKLY_STATUS: {
    TOP_RESTAURANTS_COUNT: 100,
    MAX_BATCH_SIZE: 20,
  },
  
  COST_ESTIMATES: {
    FULL_ENRICHMENT: 0.15, // $0.10-0.20
    RESTAURANTS_ONLY: 0.08, // $0.05-0.10
    STATUS_CHECK: 0.02,     // $0.01-0.03
  },
};
```

---

## Decision Log

### Decisions Needed from RB

#### 1. Budget & Limits ⚡ **CRITICAL**
- [ ] **Monthly budget limit**: $20/month? $50/month? Other?
- [ ] **Monthly refresh batch size**: 50 chefs? 100 chefs?
- [ ] **Weekly status check count**: 100 restaurants? 200?
- [ ] **Budget overrun behavior**: 
  - Stop all scheduled jobs?
  - Continue manual triggers only?
  - Send alert and continue?

#### 2. Priority Scoring 📊
- [ ] **Priority factors**: Current scoring = `(restaurants * 10) + (staleness * 0.5) + manual_flag`
  - Adjust weights?
  - Add pageview data?
  - Consider user verification flags?
- [ ] **Geographic priority**: Should major cities (NYC, LA, SF) get higher priority?

#### 3. Scheduling 📅
- [ ] **Monthly refresh timing**: 1st of month at 2 AM UTC okay?
- [ ] **Weekly status timing**: Sunday at 3 AM UTC okay?
- [ ] **Batch processing**: Should we spread monthly refresh across multiple days to smooth cost?

#### 4. Manual Triggers 🎯
- [ ] **Budget counting**: Should manual triggers count against monthly budget or separate?
- [ ] **Priority defaults**: Default priority for manual triggers (100? 75?)?
- [ ] **Bulk limits**: Max chefs in a single bulk refresh request (10? 25? 50?)?

#### 5. Notifications 📧
- [ ] **Budget alerts**: Email when reaching 80% budget? 100%?
- [ ] **Failure alerts**: Email when enrichment jobs fail repeatedly?
- [ ] **Success reports**: Weekly summary email of enrichments?
- [ ] **Future feature**: Admin notification system?

#### 6. UI Preferences 🎨
- [ ] **Page organization**: Keep enrichment as separate page or merge into "Manage Data"?
- [ ] **Default view**: Show all jobs or just recent (24h)?
- [ ] **Filtering**: Add filters for job type, status, date range?

---

## Cost Analysis

### Estimated Monthly Costs

**Assumptions**:
- gpt-5-mini pricing: $0.25/1M input, $2.00/1M output
- Average chef enrichment: 6k input, 2k output = ~$0.15
- Average restaurant status: 2k input, 0.5k output = ~$0.02

**Monthly Breakdown**:

| Activity | Frequency | Volume | Cost/Unit | Total |
|----------|-----------|--------|-----------|-------|
| Monthly Refresh | 1x/month | 50 chefs | $0.15 | $7.50 |
| Weekly Status | 4x/month | 100 restaurants | $0.02 | $8.00 |
| Manual Triggers | ~10/month | Variable | $0.15 avg | $1.50 |
| **Total** | | | | **$17.00** |

**Budget with Buffer**: $20/month (15% safety margin)

**Scaling**:
- 100 chefs/month: ~$15/month
- 200 chefs/month: ~$30/month
- 500 restaurants/week: ~$40/month

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LLM API rate limits | Medium | High | Exponential backoff, queue management |
| Budget overrun | Low | Medium | Hard limits, budget checking before jobs |
| Cron timeout (10min) | Low | Medium | Batch processing, resume on next run |
| Data quality degradation | Low | Medium | Manual review, verification system |
| Database load spikes | Low | Low | Batch processing, index optimization |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Missed cron executions | Low | Low | Vercel reliability, monitoring |
| Admin UI complexity | Medium | Low | Simple, clear interface design |
| Cost estimation inaccuracy | Medium | Medium | Track actual costs, adjust estimates |
| Stale data not caught | Low | Medium | User verification system (Phase 3) |

---

## Success Metrics

### Launch Metrics (Week 1)

- [ ] Cron jobs running successfully (0 failures)
- [ ] Budget tracking accurate (±5% of actual cost)
- [ ] Admin UI fully functional (all triggers work)
- [ ] 50 chefs re-enriched in first month
- [ ] 100 restaurant statuses verified in first week

### Ongoing Metrics (Monthly)

- [ ] Data freshness: <30 days average age
- [ ] Enrichment success rate: >90%
- [ ] Budget utilization: 70-90% of limit
- [ ] Admin trigger usage: 5-15 manual triggers/month
- [ ] Cost per enrichment: $0.10-0.20 (target: $0.15)

### Quality Metrics

- [ ] Restaurant status accuracy: >95% (vs. manual checks)
- [ ] Chef bio freshness: All top 50 chefs updated monthly
- [ ] Photo quality improvement: TBD (subjective)
- [ ] New restaurant discovery: 5-10 new restaurants/month

---

## Future Enhancements (Post-Launch)

### Phase 3: User Verification System
- Thumbs up/down buttons on chef/restaurant pages
- Flagged items auto-trigger enrichment jobs
- Community-driven data quality

### Phase 4: Advanced Scheduling
- Smart scheduling based on pageviews
- Geographic-aware refresh (time zones)
- Seasonal adjustments (more frequent before holidays)

### Phase 5: Notification System
- Email alerts for budget warnings
- Slack/Discord integration
- Weekly summary reports

### Phase 6: Analytics Dashboard
- Cost trends over time
- Data quality metrics
- Enrichment effectiveness tracking
- ROI analysis (cost vs. data accuracy)

---

## Rollout Plan

### Pre-Launch Checklist

- [ ] Database migration tested locally
- [ ] All API endpoints tested
- [ ] Cron jobs tested with manual trigger
- [ ] Cost tracking verified accurate
- [ ] Admin UI fully functional
- [ ] Documentation updated
- [ ] Budget limits configured

### Launch Sequence

1. **Day 1**: Deploy database migration (off-peak hours)
2. **Day 1**: Deploy API endpoints (no UI yet)
3. **Day 2**: Deploy cron jobs (monitor first runs)
4. **Day 2**: Deploy admin UI
5. **Day 3**: Monitor first scheduled cron runs
6. **Week 1**: Manual testing, adjust thresholds
7. **Week 2**: Full automated operation

### Monitoring Plan

**First Week**:
- Check cron logs daily
- Verify budget tracking accuracy
- Monitor job success rates
- Test manual triggers

**Ongoing**:
- Weekly budget review
- Monthly cost vs. quality analysis
- Quarterly priority scoring review

---

## Appendix

### Glossary

- **Enrichment**: Process of using LLM to discover/update chef and restaurant data
- **Priority Score**: Calculated value determining which chefs/restaurants to refresh first
- **Staleness**: Number of days since last enrichment or verification
- **Budget Period**: Calendar month (e.g., Dec 1 - Dec 31)
- **Job**: Single enrichment task in the queue

### Related Documents

- `/memory-bank/core/quickstart.md` - Project overview
- `/memory-bank/architecture/techStack.md` - Technology details
- `/memory-bank/development/activeContext.md` - Current work
- `supabase/migrations/007_enrichment_jobs_and_queue_tracking.sql` - Current schema

### Contact & Support

- **Project Owner**: RB
- **System Status**: Development/Planning
- **Questions**: Ask during implementation

---

## Sign-Off

**Document Status**: ✅ Ready for Review
**Next Steps**: 
1. Review with RB
2. Get decisions on open questions
3. Begin Phase 1 implementation

**Approved By**: _[Pending]_
**Date**: _[Pending]_
