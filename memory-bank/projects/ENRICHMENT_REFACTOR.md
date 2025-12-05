# LLM Enrichment System Refactor

**Status**: Planning  
**Type**: Internal Data Pipeline Refactor  
**Complexity**: Large (1337-line monolith → service architecture)

## Problem Statement

The `llm-enricher.ts` file has grown to 1337 lines with 13 exported functions handling:
- Chef bio/restaurant/show enrichment
- Restaurant-only discovery
- Show-only discovery
- Status verification
- Narrative generation (chef/restaurant/city)
- Database operations
- Show name mapping
- Token counting
- Duplicate detection

**Issues**:
1. Single Responsibility Violation - too many concerns in one file
2. Tight coupling - shared token counter, global model config
3. Hard to test - can't mock individual concerns
4. Hard to extend - adding features requires modifying 1337-line file
5. Inconsistent workflows - no clear "new chef" vs "update chef" pattern

**Impact**: Used by 7 scripts + 2 API routes. Breaking changes are acceptable (internal tooling only).

---

## Architecture Design

### Folder Structure

```
scripts/ingestion/enrichment/
├── services/                           # Core single-purpose services
│   ├── chef-enrichment-service.ts     # Chef bio/awards enrichment
│   ├── restaurant-discovery-service.ts # Restaurant finding
│   ├── show-discovery-service.ts      # TV show appearance discovery
│   ├── status-verification-service.ts # Restaurant open/closed status
│   └── narrative-service.ts           # SEO narrative generation
│
├── shared/                            # Reusable utilities
│   ├── llm-client.ts                  # OpenAI client wrapper
│   ├── token-tracker.ts               # Token counting & cost estimation
│   ├── result-parser.ts               # JSON extraction & validation
│   └── retry-handler.ts               # Retry logic with exponential backoff
│
├── repositories/                      # Database access layer
│   ├── chef-repository.ts             # Chef CRUD operations
│   ├── restaurant-repository.ts       # Restaurant CRUD operations
│   └── show-repository.ts             # TV show CRUD & mapping
│
├── workflows/                         # Common multi-step operations
│   ├── new-show-discovery.workflow.ts     # Scrape Wikipedia → enrich new chefs
│   ├── add-show-to-database.workflow.ts   # Update existing chefs with new show
│   ├── manual-chef-addition.workflow.ts   # Admin adds chef → full enrichment
│   ├── refresh-stale-chef.workflow.ts     # Re-enrich old data
│   ├── restaurant-status-sweep.workflow.ts # Batch status checks
│   └── partial-update.workflow.ts         # Update shows/restaurants/bio only
│
├── types/                             # Shared types and schemas
│   ├── enrichment-types.ts            # Result interfaces
│   ├── schemas.ts                     # Zod validation schemas
│   └── config.ts                      # Configuration types
│
└── llm-enricher-facade.ts             # Backward-compatible facade
```

---

## Service Responsibilities

### Core Services (Single Purpose)

**ChefEnrichmentService** (`services/chef-enrichment-service.ts`)
- Extract chef biographical data (2-3 sentence bio)
- Extract James Beard Award status
- Extract notable awards
- Uses: LLM client, result parser, token tracker

**RestaurantDiscoveryService** (`services/restaurant-discovery-service.ts`)
- Find restaurants where chef currently works
- Find all restaurants (including former)
- Validate restaurant data
- Uses: LLM client, duplicate detection, result parser

**ShowDiscoveryService** (`services/show-discovery-service.ts`)
- Find ALL TV show appearances for a chef
- Map show names to database show IDs
- Deduplicate show entries
- Uses: LLM client, show repository, result parser

**StatusVerificationService** (`services/status-verification-service.ts`)
- Verify if restaurant is currently open/closed
- Provide confidence score + reasoning
- Uses: LLM client, result parser

**NarrativeService** (`services/narrative-service.ts`)
- Generate chef career narratives (SEO content)
- Generate restaurant narratives
- Generate city narratives
- Uses: LLM client, result parser

### Shared Utilities

**LLMClient** (`shared/llm-client.ts`)
- Centralized OpenAI API interaction
- Handles model selection
- Applies retry logic
- Tracks token usage automatically

**TokenTracker** (`shared/token-tracker.ts`)
- Singleton instance tracks usage across all services
- Calculate total tokens used
- Estimate cost (input $0.25/1M, output $2.00/1M)
- Reset counter between runs

**ResultParser** (`shared/result-parser.ts`)
- Extract JSON from LLM text responses
- Validate with Zod schemas
- Strip citations from data
- Handle malformed responses

**RetryHandler** (`shared/retry-handler.ts`)
- Exponential backoff retry logic
- Configurable max retries
- Error classification (retryable vs fatal)

### Repository Layer

**ChefRepository** (`repositories/chef-repository.ts`)
- Update chef bio, awards, narrative
- Set enrichment timestamps
- Bulk update operations
- Audit logging integration

**RestaurantRepository** (`repositories/restaurant-repository.ts`)
- Create restaurant records
- Check for duplicates in same city
- Update status + verification timestamp
- Link restaurants to chefs

**ShowRepository** (`repositories/show-repository.ts`)
- Map show names → database show IDs
- Save chef_shows entries
- Check for existing show entries
- Handle show variants (Top Chef Masters, etc.)

---

## Workflow Patterns

### Workflow Interface

Each workflow implements:
```typescript
interface Workflow {
  execute(input: WorkflowInput): Promise<WorkflowResult>
  estimateCost(input: WorkflowInput): Promise<CostEstimate>
  validate(input: WorkflowInput): ValidationResult
}

interface WorkflowResult {
  success: boolean
  workflowId: string
  steps: WorkflowStep[]
  totalCost: { tokens: number; estimatedUSD: number }
  errors: WorkflowError[]
}
```

### Workflow Definitions

**NewShowDiscoveryWorkflow** (`workflows/new-show-discovery.workflow.ts`)
- **Purpose**: Process new show → create new chefs with full enrichment
- **Steps**:
  1. Validate show data
  2. Map to existing show (or create new)
  3. Enrich all chefs (bio + awards) [parallel]
  4. Save all TV shows
  5. Find all restaurants [parallel]
  6. Enrich all photos [parallel]
  7. Final integrity check
- **Cost Limit**: $50
- **Timeout**: 10 minutes
- **Rollback**: Full (undo all changes on failure)

**AddShowToDatabaseWorkflow** (`workflows/add-show-to-database.workflow.ts`)
- **Purpose**: New show added → update existing chefs with new appearances
- **Steps**:
  1. Validate show exists in database
  2. Get all existing chefs
  3. For each chef: run ShowDiscoveryService [parallel]
  4. Save new show appearances
  5. Update enrichment timestamps
- **Cost Limit**: $20
- **Rollback**: Partial

**RefreshStaleChefWorkflow** (`workflows/refresh-stale-chef.workflow.ts`)
- **Purpose**: Re-enrich chef not updated in 90+ days
- **Steps** (conditional based on scope):
  1. Validate chef exists
  2. If scope.bio: Enrich bio
  3. If scope.shows: Find all shows
  4. If scope.restaurants: Find all restaurants
  5. If scope.status: Check all restaurant statuses
  6. Update timestamps
- **Cost Limit**: $10
- **Flexible**: Supports partial updates (shows-only, restaurants-only, etc.)

**RestaurantStatusSweepWorkflow** (`workflows/restaurant-status-sweep.workflow.ts`)
- **Purpose**: Batch check 50 restaurants for open/closed status
- **Steps**:
  1. Get restaurants matching criteria (e.g., not verified in 30 days)
  2. For each restaurant: StatusVerificationService [parallel, batches of 10]
  3. Update status + verification timestamp
  4. Log changes to audit trail
- **Cost Limit**: $5
- **Rollback**: None (status checks are non-destructive)

---

## Migration Plan

### Phase 1: Extract Shared Utilities ✅ COMPLETE
**Goal**: Pull out reusable components without breaking existing code

- [x] Create `shared/llm-client.ts`
  - ✅ Extract OpenAI client initialization
  - ✅ Extract `generateText()` wrapper with web search
  - ✅ Support both `openai.responses()` and `openai()` models
  - ✅ Removed automatic token tracking (kept local tracking in enricher)
- [x] Create `shared/token-tracker.ts`
  - ✅ Singleton class with `trackUsage()`, `getTotalUsage()`, `estimateCost()`, `reset()`
  - ℹ️ Not used by LLMClient (will be used in Phase 2 repositories)
- [x] Create `shared/result-parser.ts`
  - ✅ Extract `extractJsonFromText()`
  - ✅ Extract Zod schema validation with `parseAndValidate()`
  - ✅ Extract `stripCitations()` and `enumWithCitationStrip()` helpers
  - ✅ Added comprehensive error handling (JSON parse, Zod validation)
- [x] Create `shared/retry-handler.ts`
  - ✅ Extract `withRetry()` function
  - ✅ Add exponential backoff logic (3 retries, base 1000ms)
  - ✅ Created `withCustomRetry()` for future flexibility
- [x] Update monolith to use shared utilities
  - ✅ Replaced all 5 LLM call sites with LLMClient
  - ✅ Removed ~60 lines of duplicated code
  - ✅ Fixed search context size consistency ('small' → 'low')
  - ✅ Removed unnecessary type assertions
  - ✅ TypeScript compilation passes
  - ✅ Token tracking verified: 4,082 tokens, $0.0073 cost
  - ✅ All existing scripts backward compatible

**Files Created:**
- `scripts/ingestion/enrichment/shared/llm-client.ts` (77 lines)
- `scripts/ingestion/enrichment/shared/token-tracker.ts` (43 lines)
- `scripts/ingestion/enrichment/shared/result-parser.ts` (46 lines)
- `scripts/ingestion/enrichment/shared/retry-handler.ts` (54 lines)

**Files Modified:**
- `scripts/ingestion/processors/llm-enricher.ts` (refactored, ~1359 lines)

**Code Review Findings Addressed:**
- ✅ CRITICAL: Token tracking dual system resolved (kept local tracking)
- ✅ CRITICAL: Type safety issues fixed (removed unnecessary assertions)
- ✅ CRITICAL: Added error handling to parseAndValidate
- ⏳ DEFER: Token pricing model-awareness (Phase 2)
- ⏳ DEFER: Remove unused `withCustomRetry` (Phase 6 cleanup)

**Next Phase:** Phase 2 - Extract Repository Layer

### Phase 2: Extract Repository Layer
**Goal**: Separate database operations from LLM logic

- [ ] Create `repositories/chef-repository.ts`
  - Extract chef update operations
  - Add `updateBio()`, `updateAwards()`, `setEnrichmentTimestamp()`
- [ ] Create `repositories/restaurant-repository.ts`
  - Extract restaurant CRUD operations
  - Add `createRestaurant()`, `updateStatus()`, `checkDuplicates()`
- [ ] Create `repositories/show-repository.ts`
  - Extract `findShowByName()` logic
  - Extract `saveChefShows()` logic
  - Add show variant mapping
- [ ] Replace direct Supabase calls in monolith
  - Use repository methods instead
  - Test all save/update paths

### Phase 3: Extract Services
**Goal**: Pull out single-purpose enrichment services

- [ ] Create `services/chef-enrichment-service.ts`
  - Extract `enrichChef()` logic
  - Use LLMClient, ResultParser, TokenTracker
- [ ] Create `services/restaurant-discovery-service.ts`
  - Extract `enrichRestaurantsOnly()` logic
  - Use LLMClient, RestaurantRepository
- [ ] Create `services/show-discovery-service.ts`
  - Extract `enrichShowsOnly()` logic
  - Use LLMClient, ShowRepository
- [ ] Create `services/status-verification-service.ts`
  - Extract `verifyRestaurantStatus()` logic
  - Use LLMClient, RestaurantRepository
- [ ] Create `services/narrative-service.ts`
  - Extract narrative generation logic
  - Support chef/restaurant/city narratives
- [ ] Test each service independently
  - Unit tests with mocked dependencies
  - Verify token tracking works

### Phase 4: Create Workflows
**Goal**: Define common multi-step operations

- [ ] Create `workflows/new-show-discovery.workflow.ts`
  - Compose ChefEnrichmentService + RestaurantDiscoveryService + ShowDiscoveryService
  - Add step tracking, cost limits, rollback logic
- [ ] Create `workflows/refresh-stale-chef.workflow.ts`
  - Conditional steps based on refresh scope
  - Support partial updates
- [ ] Create `workflows/partial-update.workflow.ts`
  - Shows-only, restaurants-only, bio-only modes
- [ ] Create `workflows/restaurant-status-sweep.workflow.ts`
  - Batch processing with parallel execution
- [ ] Test workflows end-to-end
  - Verify cost tracking aggregates correctly
  - Test rollback on failures

### Phase 5: Replace Monolith with Facade
**Goal**: Make llm-enricher.ts a thin wrapper

- [ ] Create `llm-enricher-facade.ts`
  - Implement `createLLMEnricher()` using workflows
  - Maintain exact same 13-function interface
- [ ] Replace `llm-enricher.ts` with facade
  - Keep original file for backward compatibility
  - Delegate all functions to workflows/services
- [ ] Update scripts to use facade
  - No code changes needed (same interface)
  - Verify all 7 scripts + 2 API routes work
- [ ] Run full integration test
  - Execute enrichment on real data
  - Verify results match old system

### Phase 6: Cleanup & Documentation
**Goal**: Remove old code, document new architecture

- [ ] Delete old monolith code from facade
  - Archive llm-enricher.ts.bak for reference
- [ ] Update memory bank with architecture docs
- [ ] Add inline documentation to services
- [ ] Create usage examples for workflows
- [ ] Run type-check across codebase

---

## Testing Strategy

### Unit Tests (Per Service)
- Mock LLMClient, repositories, token tracker
- Test service logic in isolation
- Verify error handling, retries

### Integration Tests (Per Workflow)
- Use real Supabase (test database)
- Mock LLM responses
- Test step execution, rollback, cost tracking

### End-to-End Tests
- Run workflows with real LLM calls (limited)
- Verify data correctness
- Compare results to old monolith

---

## Success Criteria

- [ ] All 7 scripts continue working without changes
- [ ] All 2 API routes continue working
- [ ] Token costs match old system (±5%)
- [ ] TypeScript compilation passes
- [ ] No production data changes during migration
- [ ] New architecture documented in memory bank
- [ ] Can add new enrichment service in <100 lines
- [ ] Can create new workflow in <200 lines

---

## Rollback Plan

If migration breaks critical functionality:
1. Revert to `llm-enricher.ts.bak`
2. Update imports in affected scripts
3. Run type-check + test suite
4. Document issues in memory bank

---

## Notes

- **This is internal tooling** - breaking changes during migration are acceptable
- **No end users affected** - only impacts data pipeline execution
- **Progressive approach** - can pause between phases
- **Keep old code** until Phase 5 complete
- **Test with real data** at each phase