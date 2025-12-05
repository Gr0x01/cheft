---
Last-Updated: 2025-12-05
Maintainer: RB
Status: Active
---

# Enrichment System: Developer Guide

> **NOTE FOR AI AGENTS:** This document provides conceptual architecture overview. **Always read the actual source files** for current implementations. Code examples here are illustrative - the source code is the source of truth.

## Overview

The enrichment system is a service-based architecture for automated chef/restaurant data discovery and enhancement using LLMs. Refactored from a 1337-line monolith in December 2025, it now consists of 19 focused files with clear separation of concerns.

**Purpose**: Transform basic chef names into rich profiles with bios, TV show appearances, restaurants, awards, and status information through automated web research.

**Key Principles:**
- Single Responsibility - Each service does one thing well
- Repository Pattern - Data access layer abstraction
- Workflow Orchestration - Multi-step operations with rollback
- Cost Management - Built-in token tracking and limits
- Testability - All components mockable and testable in isolation

**For Quick Reference:** See `enrichment-reference.md` for AI agent-focused usage guide with task-to-method mapping and database query patterns.

## Architecture

### Folder Structure

```
scripts/ingestion/enrichment/
├── services/                           # Core single-purpose services
│   ├── chef-enrichment-service.ts     # Chef bio/awards enrichment (233 lines)
│   ├── restaurant-discovery-service.ts # Restaurant finding (145 lines)
│   ├── show-discovery-service.ts      # TV show discovery (136 lines)
│   ├── status-verification-service.ts # Restaurant status checks (110 lines)
│   └── narrative-service.ts           # SEO narratives (166 lines)
│
├── shared/                            # Reusable utilities
│   ├── llm-client.ts                  # OpenAI client wrapper (77 lines)
│   ├── token-tracker.ts               # Token counting (43 lines)
│   ├── result-parser.ts               # JSON extraction (46 lines)
│   └── retry-handler.ts               # Retry logic (54 lines)
│
├── repositories/                      # Database access layer
│   ├── chef-repository.ts             # Chef CRUD (129 lines)
│   ├── restaurant-repository.ts       # Restaurant CRUD (211 lines)
│   ├── show-repository.ts             # TV show operations (135 lines)
│   └── city-repository.ts             # City narrative updates (25 lines)
│
├── workflows/                         # Multi-step operations
│   ├── base-workflow.ts               # Abstract base class (237 lines)
│   ├── refresh-stale-chef.workflow.ts     # Data refresh (304 lines)
│   ├── restaurant-status-sweep.workflow.ts # Batch status (287 lines)
│   ├── partial-update.workflow.ts         # Single updates (267 lines)
│   └── manual-chef-addition.workflow.ts   # New chef pipeline (331 lines)
│
├── types/                             # Shared types
│   └── workflow-types.ts              # Workflow interfaces (77 lines)
│
└── ../processors/
    └── llm-enricher.ts                # Facade (485 lines)
```

**Total:** 19 files, ~2,900 lines (down from 1,337-line monolith)

## Services

Services are single-purpose classes that perform one enrichment operation using LLMs.

### ChefEnrichmentService

**File:** `services/chef-enrichment-service.ts`

**Purpose:** Extract biographical information and awards for a chef.

**Interface (Conceptual - Read source file for current signature):**
```typescript
class ChefEnrichmentService {
  constructor(llmClient: LLMClient, tokenTracker: TokenTracker, maxRestaurants: number)
  
  async enrichChef(
    chefId: string,
    chefName: string,
    showName: string,
    options?: { season?: string; result?: string }
  ): Promise<ChefEnrichmentResult>
}

interface ChefEnrichmentResult {
  chefId: string;
  chefName: string;
  miniBio: string | null;           // 2-3 sentences
  restaurants: Restaurant[];         // Found restaurants
  tvShows: TVShowAppearance[];       // TV appearances
  jamesBeardStatus: string | null;   // winner | nominated | semifinalist
  notableAwards: string[] | null;    // Other culinary awards
  tokensUsed: TokenUsage;
  success: boolean;
  error?: string;
}
```

**Read Source:** `scripts/ingestion/enrichment/services/chef-enrichment-service.ts:39-50` for exported `ChefEnrichmentResult` interface.

**LLM Prompt:** Requests structured JSON with chef bio, restaurants, TV shows, and awards.

**Pattern (not literal code):**
```typescript
const service = new ChefEnrichmentService(llmClient, tokenTracker, 10);
const result = await service.enrichChef('uuid', 'Gordon Ramsay', 'Hell\'s Kitchen');
```

### RestaurantDiscoveryService

**File:** `services/restaurant-discovery-service.ts`

**Purpose:** Find all restaurants where a chef currently works or has worked.

**Interface:**
```typescript
class RestaurantDiscoveryService {
  constructor(llmClient: LLMClient, tokenTracker: TokenTracker, maxRestaurants: number)
  
  async findRestaurants(
    chefId: string,
    chefName: string,
    showName: string,
    options?: { season?: string; result?: string }
  ): Promise<RestaurantOnlyResult>
}

interface RestaurantOnlyResult {
  chefId: string;
  chefName: string;
  restaurants: Restaurant[];
  tokensUsed: TokenUsage;
  success: boolean;
  error?: string;
}
```

**Features:**
- Duplicate detection (same name in same city)
- Restaurant validation (required fields)
- Limited to `maxRestaurants` (default: 10)

**Usage:**
```typescript
const service = new RestaurantDiscoveryService(llmClient, tokenTracker, 10);
const result = await service.findRestaurants('uuid', 'Alice Waters', 'Top Chef');
```

### ShowDiscoveryService

**File:** `services/show-discovery-service.ts`

**Purpose:** Find ALL TV show appearances for a chef.

**Interface:**
```typescript
class ShowDiscoveryService {
  constructor(llmClient: LLMClient, tokenTracker: TokenTracker)
  
  async findShows(
    chefId: string,
    chefName: string
  ): Promise<ShowDiscoveryResult>
}

interface ShowDiscoveryResult {
  chefId: string;
  chefName: string;
  shows: Array<{
    showName: string;
    season: string | null;
    result: 'winner' | 'finalist' | 'contestant' | 'judge';
    performanceBlurb?: string;  // 1-2 sentence competition summary
  }>;
  tokensUsed: TokenUsage;
  success: boolean;
  error?: string;
}
```

**Features:**
- Show name mapping (33 show variants → database slugs)
- Array normalization (handles single-object LLM responses)
- Deduplication
- Performance blurb generation (competition narratives)

**Usage:**
```typescript
const service = new ShowDiscoveryService(llmClient, tokenTracker);
const result = await service.findShows('uuid', 'Gordon Ramsay');
// Returns 10-15 TV show appearances
```

### StatusVerificationService

**File:** `services/status-verification-service.ts`

**Purpose:** Verify if a restaurant is currently open or closed.

**Interface:**
```typescript
class StatusVerificationService {
  constructor(llmClient: LLMClient, tokenTracker: TokenTracker)
  
  async verifyStatus(
    restaurantId: string,
    restaurantName: string,
    chefName: string,
    city: string,
    state?: string
  ): Promise<RestaurantStatusResult>
}

interface RestaurantStatusResult {
  restaurantId: string;
  restaurantName: string;
  status: 'open' | 'closed' | 'unknown';
  confidence: number;        // 0-100
  reasoning: string;         // Explanation
  tokensUsed: TokenUsage;
  success: boolean;
  error?: string;
}
```

**Usage:**
```typescript
const service = new StatusVerificationService(llmClient, tokenTracker);
const result = await service.verifyStatus('uuid', 'Alinea', 'Grant Achatz', 'Chicago', 'IL');
console.log(`${result.status} (${result.confidence}% confidence)`);
```

### NarrativeService

**File:** `services/narrative-service.ts`

**Purpose:** Generate SEO-optimized narrative paragraphs for chefs, restaurants, and cities.

**Interface:**
```typescript
class NarrativeService {
  constructor(tokenTracker: TokenTracker, model?: string)
  
  async generateChefNarrative(chefName: string, bio: string, shows: Show[]): Promise<string>
  async generateRestaurantNarrative(restaurantName: string, chefName: string, cuisine: string[]): Promise<string>
  async generateCityNarrative(cityName: string, state: string, restaurants: Restaurant[], chefs: Chef[]): Promise<string>
}
```

**Model:** Uses `gpt-4.1-mini` (separate from main enrichment model)

**Usage:**
```typescript
const service = new NarrativeService(tokenTracker, 'gpt-4.1-mini');
const narrative = await service.generateChefNarrative(
  'Gordon Ramsay',
  'British chef...',
  [{ showName: 'Hell\'s Kitchen', ... }]
);
```

## Repositories

Repositories abstract database operations and provide a clean interface for data access.

### ChefRepository

**File:** `repositories/chef-repository.ts`

**Purpose:** Chef CRUD operations and enrichment timestamp management.

**Key Methods:**
```typescript
class ChefRepository {
  constructor(supabase: SupabaseClient<Database>)
  
  async updateBio(chefId: string, bio: string): Promise<void>
  async updateAwards(chefId: string, jbStatus: string | null, awards: string[] | null): Promise<void>
  async updateBioAndAwards(chefId: string, bio: string, jbStatus: string | null, awards: string[] | null): Promise<void>
  async setEnrichmentTimestamp(chefId: string, timestamp?: Date): Promise<void>
  async updateNarrative(chefId: string, narrative: string): Promise<void>
}
```

**Features:**
- Audit logging via triggers
- Timestamp management for staleness tracking
- Type-safe database operations

### RestaurantRepository

**File:** `repositories/restaurant-repository.ts`

**Purpose:** Restaurant CRUD, duplicate detection, status updates.

**Key Methods:**
```typescript
class RestaurantRepository {
  constructor(supabase: SupabaseClient<Database>)
  
  async createRestaurant(restaurant: RestaurantInsert): Promise<string>
  async checkDuplicates(name: string, city: string): Promise<boolean>
  async updateStatus(restaurantId: string, status: string, confidence: number, reasoning: string): Promise<void>
  async updateNarrative(restaurantId: string, narrative: string): Promise<void>
}
```

**Duplicate Detection:**
- Checks for same name in same city before insertion
- Case-insensitive comparison
- Prevents data quality issues

### ShowRepository

**File:** `repositories/show-repository.ts`

**Purpose:** TV show mapping and chef_shows record management.

**Key Methods:**
```typescript
class ShowRepository {
  constructor(supabase: SupabaseClient<Database>)
  
  async findShowByName(showName: string): Promise<string | null>
  async saveChefShows(chefId: string, shows: ShowAppearance[]): Promise<void>
  async checkExistingShow(chefId: string, showId: string, season: string | null): Promise<boolean>
}
```

**Show Name Mapping:**
33 show name variants mapped to database slugs:
- "Top Chef" → "top-chef"
- "Top Chef Masters" → "top-chef-masters"
- "Tournament of Champions" → "tournament-of-champions"
- etc.

### CityRepository

**File:** `repositories/city-repository.ts`

**Purpose:** City narrative updates.

**Key Methods:**
```typescript
class CityRepository {
  constructor(supabase: SupabaseClient<Database>)
  
  async updateNarrative(cityId: string, narrative: string): Promise<void>
}
```

## Shared Utilities

### LLMClient

**File:** `shared/llm-client.ts`

**Purpose:** Centralized OpenAI API interaction with web search support.

**Interface:**
```typescript
class LLMClient {
  constructor(config: { model: string })
  
  async generateText(prompt: string, options?: {
    useResponseModel?: boolean;
    searchContext?: 'low' | 'medium' | 'high';
  }): Promise<string>
}
```

**Features:**
- Web search via OpenAI Responses API
- Automatic retry handling
- Supports both chat and response models
- Search context control (low/medium/high)

**Web Search Configuration:**
- Must use `useResponseModel: true` for web search
- Single combined prompt (system + user merged)
- No `maxSteps` parameter (not supported by API)

### TokenTracker

**File:** `shared/token-tracker.ts`

**Purpose:** Singleton token usage tracking and cost estimation.

**Interface:**
```typescript
class TokenTracker {
  static getInstance(): TokenTracker
  
  trackUsage(usage: TokenUsage): void
  getTotalUsage(): TokenUsage
  estimateCost(): number
  reset(): void
}

interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}
```

**Pricing (gpt-5-mini):**
- Input: $0.25 per 1M tokens
- Output: $2.00 per 1M tokens

**Usage:**
```typescript
const tracker = TokenTracker.getInstance();
tracker.trackUsage({ prompt: 1000, completion: 500, total: 1500 });
console.log('Cost:', tracker.estimateCost()); // $0.0015
tracker.reset(); // Reset for next run
```

### ResultParser

**File:** `shared/result-parser.ts`

**Purpose:** JSON extraction from LLM responses and Zod validation.

**Interface:**
```typescript
function extractJsonFromText(text: string): any
function parseAndValidate<T>(text: string, schema: z.ZodSchema<T>): T
function stripCitations(text: string): string
function enumWithCitationStrip<T extends readonly string[]>(values: T): z.ZodEnum<any>
```

**Features:**
- Extracts JSON from markdown code blocks
- Handles both objects `{...}` and arrays `[...]`
- Array extraction prioritized (fixes Phase 3 bug)
- Citation stripping (removes `[1]`, `[citation]` etc.)
- Zod schema validation with error handling

### RetryHandler

**File:** `shared/retry-handler.ts`

**Purpose:** Exponential backoff retry logic for API calls.

**Interface:**
```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries?: number,
  baseDelayMs?: number
): Promise<T>
```

**Default Configuration:**
- Max retries: 3
- Base delay: 1000ms
- Exponential backoff: delay * 2^attempt

**Usage:**
```typescript
const result = await withRetry(
  async () => await apiCall(),
  3,
  1000
);
```

## Workflows

Workflows orchestrate multi-step enrichment operations with cost limits, timeouts, and rollback support.

### Base Workflow

**File:** `workflows/base-workflow.ts`

**Purpose:** Abstract base class providing workflow infrastructure.

**Features:**
- Step tracking (pending → running → completed/failed/skipped)
- Cost estimation and limits
- Timeout handling
- Error aggregation (fatal vs non-fatal)
- Rollback coordination
- Dry-run mode

**Key Methods:**
```typescript
abstract class BaseWorkflow<TInput, TOutput> {
  abstract executeSteps(input: TInput): Promise<TOutput>
  abstract estimateCost(input: TInput): Promise<CostEstimate>
  abstract validate(input: TInput): ValidationResult
  
  async execute(input: TInput): Promise<WorkflowResult<TOutput>>
  protected async executeStep(name: string, fn: () => Promise<void>): Promise<void>
  protected createErrorResult(code: string, message: string, fatal: boolean): WorkflowResult<TOutput>
}
```

**Configuration:**
```typescript
interface WorkflowConfig {
  workflowName: string;
  maxCostUsd: number;
  timeoutMs: number;
  allowRollback: boolean;
  retryFailedSteps?: boolean;
  maxRetries?: number;
}
```

### RefreshStaleChefWorkflow

**File:** `workflows/refresh-stale-chef.workflow.ts`

**Purpose:** Re-enrich chef data that hasn't been updated in 90+ days.

**Input:**
```typescript
interface RefreshStaleChefInput {
  chefId: string;
  chefName: string;
  scope: {
    bio?: boolean;
    shows?: boolean;
    restaurants?: boolean;
    restaurantStatus?: boolean;
  };
  dryRun?: boolean;
}
```

**Steps (Conditional):**
1. Validate chef exists
2. If scope.bio: Enrich bio/awards
3. If scope.shows: Find all TV shows
4. If scope.restaurants: Find all restaurants
5. If scope.restaurantStatus: Verify all restaurant statuses
6. Update enrichment timestamp

**Configuration:**
- Max cost: $10
- Timeout: 600s (10 min)
- Rollback: No (updates are idempotent)

**Usage:**
```typescript
const workflow = new RefreshStaleChefWorkflow(services, repositories);
const result = await workflow.execute({
  chefId: 'uuid',
  chefName: 'Gordon Ramsay',
  scope: { bio: true, shows: true }
});
```

### RestaurantStatusSweepWorkflow

**File:** `workflows/restaurant-status-sweep.workflow.ts`

**Purpose:** Batch verification of restaurant open/closed status.

**Input:**
```typescript
interface RestaurantStatusSweepInput {
  restaurantIds?: string[];  // Specific IDs
  criteria?: {               // Or criteria-based selection
    minDaysSinceVerified?: number;
    city?: string;
    state?: string;
  };
  batchSize?: number;        // Parallel batch size (default: 10)
  minConfidence?: number;    // Minimum confidence to accept (default: 70)
}
```

**Steps:**
1. Get restaurant list (IDs or criteria)
2. For each restaurant: StatusVerificationService (parallel batches)
3. Update status + verification timestamp
4. Log changes to audit trail

**Configuration:**
- Max cost: $5
- Timeout: 300s (5 min)
- Rollback: No (status checks are non-destructive)

**Usage:**
```typescript
const workflow = new RestaurantStatusSweepWorkflow(services, repositories);
const result = await workflow.execute({
  criteria: { minDaysSinceVerified: 30 },
  batchSize: 20
});
```

### PartialUpdateWorkflow

**File:** `workflows/partial-update.workflow.ts`

**Purpose:** Single-concern updates (shows, restaurants, or narratives only).

**Modes:**
- `shows` - Update TV show appearances for chef
- `restaurants` - Find new restaurants for chef
- `chef-narrative` - Generate chef narrative
- `restaurant-narrative` - Generate restaurant narrative
- `city-narrative` - Generate city narrative

**Input:**
```typescript
interface PartialUpdateInput {
  mode: 'shows' | 'restaurants' | 'chef-narrative' | 'restaurant-narrative' | 'city-narrative';
  targetId: string;
  targetName: string;
  additionalContext?: Record<string, any>;
}
```

**Usage:**
```typescript
const workflow = new PartialUpdateWorkflow(services, repositories);

// Update shows only
const result = await workflow.execute({
  mode: 'shows',
  targetId: 'chef-uuid',
  targetName: 'Gordon Ramsay'
});

// Generate restaurant narrative
const result = await workflow.execute({
  mode: 'restaurant-narrative',
  targetId: 'restaurant-uuid',
  targetName: 'Alinea',
  additionalContext: { chefName: 'Grant Achatz', cuisine: ['Modern American'] }
});
```

### ManualChefAdditionWorkflow

**File:** `workflows/manual-chef-addition.workflow.ts`

**Purpose:** Full pipeline for adding a new chef (admin use case).

**Input:**
```typescript
interface ManualChefAdditionInput {
  chefName: string;
  showName: string;
  season?: string;
  result?: 'winner' | 'finalist' | 'contestant' | 'judge';
  generateNarrative?: boolean;
}
```

**Steps:**
1. Create chef record
2. Enrich bio + awards
3. Find all TV shows
4. Save chef_shows records
5. Find all restaurants
6. Create restaurant records
7. (Optional) Generate chef narrative
8. Final validation

**Configuration:**
- Max cost: $10
- Timeout: 900s (15 min)
- Rollback: Yes (deletes created restaurants on failure)

**Usage:**
```typescript
const workflow = new ManualChefAdditionWorkflow(services, repositories);
const result = await workflow.execute({
  chefName: 'New Chef',
  showName: 'Top Chef',
  season: 'Season 21',
  result: 'winner',
  generateNarrative: true
});

if (result.success) {
  console.log('Chef ID:', result.output.chefId);
  console.log('Restaurants:', result.output.restaurantCount);
}
```

## Extending the System

> **NOTE FOR AI AGENTS:** These are conceptual examples showing the pattern. Read existing service files (`scripts/ingestion/enrichment/services/*.ts`) to see real implementations before creating new ones.

### Adding a New Service

1. **Create service file** in `enrichment/services/`
2. **Define result interface**
3. **Implement service class**
4. **Add to facade** in `llm-enricher.ts`

**Conceptual Example:** Adding a photo enrichment service

```typescript
// services/photo-enrichment-service.ts
import { LLMClient } from '../shared/llm-client';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';

export interface PhotoEnrichmentResult {
  chefId: string;
  photoUrl: string | null;
  photoSource: 'wikipedia' | 'instagram' | 'website';
  tokensUsed: TokenUsage;
  success: boolean;
  error?: string;
}

export class PhotoEnrichmentService {
  constructor(
    private llmClient: LLMClient,
    private tokenTracker: TokenTracker
  ) {}

  async findPhoto(chefId: string, chefName: string): Promise<PhotoEnrichmentResult> {
    const prompt = `Find the official Wikipedia photo URL for chef ${chefName}...`;
    
    try {
      const response = await this.llmClient.generateText(prompt, {
        useResponseModel: true,
        searchContext: 'low'
      });
      
      // Parse response, extract URL
      // Track tokens
      // Return result
      
      return {
        chefId,
        photoUrl: extractedUrl,
        photoSource: 'wikipedia',
        tokensUsed: { prompt: 100, completion: 50, total: 150 },
        success: true
      };
    } catch (error) {
      return {
        chefId,
        photoUrl: null,
        photoSource: 'wikipedia',
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        success: false,
        error: error.message
      };
    }
  }
}
```

**Add to facade:**
```typescript
// llm-enricher.ts
const photoEnrichmentService = new PhotoEnrichmentService(llmClient, tokenTracker);

async function enrichPhoto(chefId: string, chefName: string): Promise<PhotoEnrichmentResult> {
  const result = await photoEnrichmentService.findPhoto(chefId, chefName);
  totalTokensUsed.total += result.tokensUsed.total;
  return result;
}

return {
  enrichChef,
  enrichPhoto,  // New function
  // ... other functions
};
```

### Creating a New Workflow

1. **Create workflow file** in `enrichment/workflows/`
2. **Extend BaseWorkflow**
3. **Implement required methods**
4. **Add to facade workflows object**

**Read First:** `scripts/ingestion/enrichment/workflows/base-workflow.ts` for abstract base class and required methods.

**Conceptual Example:** Photo refresh workflow

```typescript
// workflows/photo-refresh.workflow.ts
import { BaseWorkflow } from './base-workflow';

interface PhotoRefreshInput {
  chefIds: string[];
  batchSize?: number;
}

interface PhotoRefreshOutput {
  successCount: number;
  failedCount: number;
  chefIds: string[];
}

export class PhotoRefreshWorkflow extends BaseWorkflow<PhotoRefreshInput, PhotoRefreshOutput> {
  constructor(
    private photoService: PhotoEnrichmentService,
    private chefRepo: ChefRepository
  ) {
    super({
      workflowName: 'photo-refresh',
      maxCostUsd: 5,
      timeoutMs: 300000, // 5 min
      allowRollback: false
    });
  }

  validate(input: PhotoRefreshInput): ValidationResult {
    if (!input.chefIds?.length) {
      return { valid: false, errors: ['No chef IDs provided'] };
    }
    return { valid: true, errors: [] };
  }

  async estimateCost(input: PhotoRefreshInput): Promise<CostEstimate> {
    const tokensPerChef = 200; // Estimate
    const estimatedTokens = input.chefIds.length * tokensPerChef;
    return {
      estimatedTokens,
      estimatedUsd: estimatedTokens * 0.00025, // gpt-5-mini input price
      maxTokens: estimatedTokens * 1.5,
      maxUsd: this.config.maxCostUsd
    };
  }

  async executeSteps(input: PhotoRefreshInput): Promise<PhotoRefreshOutput> {
    const batchSize = input.batchSize ?? 10;
    let successCount = 0;
    let failedCount = 0;

    await this.executeStep('Photo enrichment batch', async () => {
      for (let i = 0; i < input.chefIds.length; i += batchSize) {
        const batch = input.chefIds.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(id => this.photoService.findPhoto(id, 'Chef Name'))
        );
        
        successCount += results.filter(r => r.success).length;
        failedCount += results.filter(r => !r.success).length;
      }
    });

    return { successCount, failedCount, chefIds: input.chefIds };
  }
}
```

**Add to facade:**
```typescript
// llm-enricher.ts
const photoRefreshWorkflow = new PhotoRefreshWorkflow(photoEnrichmentService, chefRepo);

return {
  // ... existing functions
  workflows: {
    refreshStaleChef,
    restaurantStatusSweep,
    partialUpdate,
    manualChefAddition,
    photoRefresh: (input) => photoRefreshWorkflow.execute(input) // New workflow
  }
};
```

## How to Use

### Setup Pattern

Standard script setup for enrichment operations:

```typescript
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createLLMEnricher } from './scripts/ingestion/processors/llm-enricher';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // IMPORTANT: Service role, not anon
);

const enricher = createLLMEnricher(supabase, {
  model: 'gpt-5-mini',  // DO NOT change without authorization
  maxRestaurantsPerChef: 10  // Optional, default: 10
});
```

### Database Queries

Always query for IDs before enriching:

```typescript
// Single chef by name
const { data: chef } = await supabase
  .from('chefs')
  .select('id, name')
  .ilike('name', '%Gordon Ramsay%')
  .single();

// All chefs for batch processing
const { data: chefs } = await supabase
  .from('chefs')
  .select('id, name')
  .order('name');

// Stale chefs (not enriched in 90+ days)
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

const { data: staleChefs } = await supabase
  .from('chefs')
  .select('id, name')
  .or(`enriched_at.is.null,enriched_at.lt.${ninetyDaysAgo.toISOString()}`)
  .limit(20);

// Restaurants needing status check
const { data: restaurants } = await supabase
  .from('restaurants')
  .select('id, name, city, state, chef:chefs(name)')
  .or('status_verification_date.is.null,status_verification_date.lt.2024-11-01')
  .limit(50);
```

### Result Handling

All operations return structured results with `success` boolean:

```typescript
const result = await enricher.enrichShowsOnly(chefId, chefName);

if (!result.success) {
  console.error(`Enrichment failed for ${chefName}:`, result.error);
  return;
}

console.log(`✅ ${chefName}: ${result.showsSaved} shows saved`);
console.log(`📊 Tokens: ${result.tokensUsed.total}`);
```

Workflow results include step tracking:

```typescript
const result = await enricher.workflows.refreshStaleChef({
  chefId: chef.id,
  chefName: chef.name,
  scope: { bio: true, shows: true }
});

if (!result.success) {
  console.error('Workflow failed:', result.errors);
  return;
}

for (const step of result.steps) {
  console.log(`${step.name}: ${step.status}`);
}

console.log(`Total cost: $${result.totalCost.estimatedUsd.toFixed(4)}`);
console.log(`Duration: ${result.durationMs}ms`);
```

### Cost Tracking

```typescript
enricher.resetTokens();  // Start fresh

await enricher.enrichChef(chefId, chefName, showName);
await enricher.enrichShowsOnly(chefId, chefName);

const totalTokens = enricher.getTotalTokensUsed();
const totalCost = enricher.getTotalCost();

console.log(`Total tokens: ${totalTokens.total}`);
console.log(`Estimated cost: $${totalCost.toFixed(4)}`);
```

### Cost Estimates (gpt-5-mini)

**Per-Chef Operations:**
- Full enrichment (bio + restaurants + shows): ~$0.02-0.05 (~40k-100k tokens)
- Show discovery only: ~$0.02 (~40k tokens with web search)
- Restaurant discovery only: ~$0.01-0.03 (~20k-60k tokens)
- Status verification (single): ~$0.001-0.005 (~2k-10k tokens)
- Narrative generation: ~$0.01-0.02 (~20k-40k tokens)

**Batch Operations:**
- 182 chefs, show discovery: ~$3.64 (91k tokens/chef avg)
- 50 restaurants, status sweep: ~$0.05-0.25

**Workflow Limits:**
- `refreshStaleChef`: Max $10
- `restaurantStatusSweep`: Max $5
- `partialUpdate`: Max $5
- `manualChefAddition`: Max $10

## Testing Strategy

### Unit Tests (Services)

Mock dependencies and test service logic in isolation:

```typescript
describe('ChefEnrichmentService', () => {
  let service: ChefEnrichmentService;
  let mockLLMClient: jest.Mocked<LLMClient>;
  let mockTokenTracker: jest.Mocked<TokenTracker>;

  beforeEach(() => {
    mockLLMClient = {
      generateText: jest.fn().mockResolvedValue('{"miniBio": "Test bio", ...}')
    };
    mockTokenTracker = {
      trackUsage: jest.fn()
    };
    service = new ChefEnrichmentService(mockLLMClient, mockTokenTracker, 10);
  });

  it('should enrich chef successfully', async () => {
    const result = await service.enrichChef('uuid', 'Test Chef', 'Top Chef');
    expect(result.success).toBe(true);
    expect(result.miniBio).toBe('Test bio');
    expect(mockTokenTracker.trackUsage).toHaveBeenCalled();
  });
});
```

### Integration Tests (Workflows)

Use real Supabase (test database) with mocked LLM responses:

```typescript
describe('RefreshStaleChefWorkflow', () => {
  let workflow: RefreshStaleChefWorkflow;
  let testSupabase: SupabaseClient;

  beforeAll(async () => {
    testSupabase = createClient(TEST_URL, TEST_KEY);
    // Mock LLM services but use real repositories
  });

  it('should refresh chef data', async () => {
    const result = await workflow.execute({
      chefId: 'test-uuid',
      chefName: 'Test Chef',
      scope: { bio: true }
    });
    
    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(3);
  });
});
```

### End-to-End Tests

Run workflows with real LLM calls (limited):

```typescript
describe('E2E: Chef Enrichment', () => {
  it('should enrich real chef', async () => {
    const enricher = createLLMEnricher(supabase, { model: 'gpt-5-mini' });
    const result = await enricher.enrichChef('uuid', 'Gordon Ramsay', 'Hell\'s Kitchen');
    
    expect(result.success).toBe(true);
    expect(result.miniBio).toBeTruthy();
    expect(result.restaurants.length).toBeGreaterThan(0);
  }, 60000); // 60s timeout
});
```

## Performance Considerations

### Token Optimization

- **Prompt engineering**: Concise prompts reduce input tokens
- **Response format**: Request structured JSON (more predictable output length)
- **Batch operations**: Use workflows to consolidate LLM calls
- **Caching**: Cache frequently used data (show mappings, etc.)

### Database Optimization

- **Duplicate detection**: Check before insertion (restaurant repo)
- **Batch updates**: Repository methods support batch operations
- **Indexes**: Ensure proper indexing on chef_id, restaurant_id, show_id
- **Audit logging**: Use database triggers (not application-level)

### Concurrency

- **Parallel workflows**: Run independent workflows concurrently
- **Batch processing**: StatusSweepWorkflow processes batches in parallel
- **Rate limiting**: Respect OpenAI rate limits (handled by LLMClient)

## Migration Notes

### From Old Monolith

The refactor maintained backward compatibility. All scripts using the old `llm-enricher.ts` continue to work unchanged.

**Key Changes:**
1. Monolith → Facade pattern (same interface)
2. Direct Supabase calls → Repository pattern
3. Inline logic → Service classes
4. Ad-hoc operations → Workflows

**Breaking Changes:** None (internal API preserved)

**Removed:**
- `llm-enricher.ts.bak` (1,045-line backup)
- Duplicate code (~200 lines)
- Unused helper functions

**Cost Comparison:**
- Old system: ~91k tokens, $0.03 per chef
- New system: ~91k tokens, $0.03 per chef (within 1% accuracy)

## Troubleshooting

### Common Issues

**Issue:** LLM returns single object instead of array  
**Solution:** Services auto-normalize: `Array.isArray(parsed) ? parsed : [parsed]`

**Issue:** Show name not found in database  
**Solution:** Add mapping to `show-repository.ts` showNameMappings

**Issue:** Token costs exceed limits  
**Solution:** Reduce scope, use `dryRun: true` to preview, set lower `maxCostUsd`

**Issue:** Restaurant duplicates created  
**Solution:** Repository checks duplicates automatically. Review logs for "Duplicate detected"

**Issue:** Web search API errors  
**Solution:** Ensure LLMClient config: `useResponseModel: true`, combined prompt, no `maxSteps`

**Issue:** Workflow timeout  
**Solution:** Increase `timeoutMs` in WorkflowConfig or reduce batch size

### Debugging

**Enable verbose logging:**
```typescript
const enricher = createLLMEnricher(supabase, { model: 'gpt-5-mini' });
// Add logging to services/workflows as needed
```

**Check token usage:**
```typescript
const result = await enricher.enrichChef(...);
console.log('Tokens:', result.tokensUsed);
console.log('Total cost:', enricher.getTotalCost());
```

**Dry-run workflows:**
```typescript
const result = await enricher.workflows.refreshStaleChef({
  chefId: 'uuid',
  chefName: 'Test',
  scope: { bio: true },
  dryRun: true  // Preview without DB changes
});
```

## Best Practices

### Service Development
- Keep services focused (single responsibility)
- Return structured results with `success`, `error`, `tokensUsed`
- Use Zod schemas for LLM response validation
- Handle errors gracefully (don't throw, return error in result)

### Repository Development
- Abstract all Supabase operations
- Use type-safe database types from `database.types.ts`
- Include error handling and logging
- Support batch operations where applicable

### Workflow Development
- Extend `BaseWorkflow` for infrastructure
- Implement cost estimation accurately
- Use `executeStep()` for step tracking
- Add rollback logic for data-modifying operations
- Set appropriate cost limits and timeouts

### Testing
- Mock external dependencies (LLM, database)
- Test error cases and edge cases
- Use integration tests for workflows
- Limit E2E tests (expensive LLM calls)

## References

- **Quick Reference**: `architecture/enrichment-reference.md` - Entry points and common operations
- **Design Patterns**: `architecture/patterns.md` - Architectural patterns used
- **Tech Stack**: `architecture/techStack.md` - Technology decisions
- **LLM Models**: `architecture/llm-models.md` - Model reference and pricing
