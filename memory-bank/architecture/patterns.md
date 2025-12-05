---
Last-Updated: 2025-12-05
Maintainer: RB
Status: Active
---

# Architecture Patterns: Chefs

## Design Principles

### SOLID Principles
- **Single Responsibility**: Each class/module has one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Derived classes must be substitutable for base classes
- **Interface Segregation**: Clients shouldn't depend on interfaces they don't use
- **Dependency Inversion**: Depend on abstractions, not concretions

### Additional Principles
- **DRY (Don't Repeat Yourself)**: Avoid code duplication
- **KISS (Keep It Simple, Stupid)**: Favor simplicity over complexity
- **YAGNI (You Aren't Gonna Need It)**: Don't build features until needed
- **Separation of Concerns**: Separate different aspects of functionality

## Code Organization Patterns

### Directory Structure

**Enrichment System Structure:**
```
scripts/ingestion/enrichment/
├── services/          # Single-purpose business logic
├── repositories/      # Data access layer
├── workflows/         # Multi-step orchestration
├── shared/           # Reusable utilities
└── types/            # Shared TypeScript types
```

**Principles:**
- Group by feature/concern (not by file type)
- Services contain business logic, no direct DB access
- Repositories encapsulate all database operations
- Workflows orchestrate services for complex operations
- Shared utilities are framework-agnostic

### Naming Conventions

**Files:**
- Services: `{domain}-{purpose}-service.ts` (e.g., `chef-enrichment-service.ts`)
- Repositories: `{entity}-repository.ts` (e.g., `chef-repository.ts`)
- Workflows: `{operation}.workflow.ts` (e.g., `refresh-stale-chef.workflow.ts`)
- Utilities: `{purpose}.ts` (e.g., `token-tracker.ts`)

**Classes:**
- PascalCase with descriptive suffix (e.g., `ChefEnrichmentService`, `BaseWorkflow`)
- Repository suffix for data access (e.g., `ChefRepository`)
- Service suffix for business logic (e.g., `StatusVerificationService`)

**Interfaces:**
- PascalCase with Result/Input/Output/Config suffix
- Example: `ChefEnrichmentResult`, `WorkflowConfig`, `RefreshStaleChefInput`

## Common Implementation Patterns

### Repository Pattern

**Purpose:** Abstract data access layer from business logic

**Implementation:**
```typescript
export class ChefRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async updateBio(chefId: string, bio: string): Promise<void> {
    const { error } = await this.supabase
      .from('chefs')
      .update({ mini_bio: bio })
      .eq('id', chefId);
    
    if (error) throw new Error(`Failed to update chef bio: ${error.message}`);
  }
}
```

**Benefits:**
- Testable (mock repository in tests)
- Single source of truth for data operations
- Type-safe with database types
- Encapsulates query logic

**Usage in Enrichment System:**
- `ChefRepository` - Chef CRUD operations
- `RestaurantRepository` - Restaurant CRUD + duplicate detection
- `ShowRepository` - TV show mapping + chef_shows records
- `CityRepository` - City narrative updates

### Service Layer Pattern

**Purpose:** Encapsulate business logic in single-purpose services

**Implementation:**
```typescript
export class ChefEnrichmentService {
  constructor(
    private llmClient: LLMClient,
    private tokenTracker: TokenTracker,
    private maxRestaurants: number
  ) {}

  async enrichChef(
    chefId: string,
    chefName: string,
    showName: string,
    options?: { season?: string; result?: string }
  ): Promise<ChefEnrichmentResult> {
    const prompt = this.buildPrompt(chefName, showName, options);
    const response = await this.llmClient.generateText(prompt);
    const parsed = parseAndValidate(response, ChefEnrichmentSchema);
    
    this.tokenTracker.trackUsage(/* tokens */);
    
    return {
      chefId,
      chefName,
      miniBio: parsed.miniBio,
      restaurants: parsed.restaurants,
      tokensUsed: /* usage */,
      success: true
    };
  }
}
```

**Benefits:**
- Single responsibility (one service = one concern)
- Testable in isolation
- Reusable across workflows
- Clear interface and result types

**Usage in Enrichment System:**
- `ChefEnrichmentService` - Bio/awards enrichment
- `RestaurantDiscoveryService` - Restaurant finding
- `ShowDiscoveryService` - TV show discovery
- `StatusVerificationService` - Restaurant status checks
- `NarrativeService` - SEO narrative generation

### Workflow Orchestration Pattern

**Purpose:** Coordinate multi-step operations with cost tracking, timeouts, and rollback

**Implementation:**
```typescript
export abstract class BaseWorkflow<TInput, TOutput> {
  protected config: WorkflowConfig;
  protected steps: WorkflowStep[] = [];
  
  async execute(input: TInput): Promise<WorkflowResult<TOutput>> {
    const validation = this.validate(input);
    if (!validation.valid) return this.createErrorResult(/* ... */);
    
    const costEstimate = await this.estimateCost(input);
    if (costEstimate.estimatedUsd > this.config.maxCostUsd) {
      return this.createErrorResult(/* cost exceeded */);
    }
    
    try {
      const output = await this.executeSteps(input);
      return this.createSuccessResult(output);
    } catch (error) {
      if (this.config.allowRollback) await this.rollback();
      return this.createErrorResult(error);
    }
  }
  
  protected async executeStep(name: string, fn: () => Promise<void>) {
    const step = { name, status: 'running', startedAt: new Date() };
    this.steps.push(step);
    
    try {
      await fn();
      step.status = 'completed';
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    } finally {
      step.completedAt = new Date();
    }
  }
}
```

**Benefits:**
- Cost management (estimate before execution)
- Step tracking (visibility into progress)
- Timeout handling (prevent runaway operations)
- Rollback support (data integrity)
- Error aggregation (fatal vs non-fatal)

**Usage in Enrichment System:**
- `RefreshStaleChefWorkflow` - Conditional data refresh
- `RestaurantStatusSweepWorkflow` - Batch status verification
- `PartialUpdateWorkflow` - Single-concern updates
- `ManualChefAdditionWorkflow` - Full chef addition pipeline

### Facade Pattern

**Purpose:** Provide simplified interface to complex subsystem

**Implementation:**
```typescript
export function createLLMEnricher(
  supabase: SupabaseClient<Database>,
  config: LLMEnricherConfig = {}
) {
  const llmClient = new LLMClient({ model: config.model ?? 'gpt-5-mini' });
  const tokenTracker = TokenTracker.getInstance();
  
  const chefService = new ChefEnrichmentService(llmClient, tokenTracker);
  const restaurantService = new RestaurantDiscoveryService(llmClient, tokenTracker);
  
  const chefRepo = new ChefRepository(supabase);
  const restaurantRepo = new RestaurantRepository(supabase);
  
  async function enrichChef(chefId: string, chefName: string, showName: string) {
    return await chefService.enrichChef(chefId, chefName, showName);
  }
  
  return {
    enrichChef,
    enrichRestaurantsOnly,
    enrichShowsOnly,
    verifyRestaurantStatus,
    workflows: {
      refreshStaleChef,
      restaurantStatusSweep,
      partialUpdate,
      manualChefAddition
    },
    getTotalTokensUsed,
    getTotalCost,
    resetTokens
  };
}
```

**Benefits:**
- Backward compatibility (same interface as old monolith)
- Simplified API for common operations
- Internal complexity hidden from consumers
- Token tracking aggregation across all operations

**Usage in Enrichment System:**
- `llm-enricher.ts` - Main facade for all enrichment operations

### Singleton Pattern

**Purpose:** Ensure single instance for shared state (token tracking)

**Implementation:**
```typescript
export class TokenTracker {
  private static instance: TokenTracker;
  private totalUsage: TokenUsage = { prompt: 0, completion: 0, total: 0 };
  
  private constructor() {}
  
  static getInstance(): TokenTracker {
    if (!TokenTracker.instance) {
      TokenTracker.instance = new TokenTracker();
    }
    return TokenTracker.instance;
  }
  
  trackUsage(usage: TokenUsage): void {
    this.totalUsage.prompt += usage.prompt;
    this.totalUsage.completion += usage.completion;
    this.totalUsage.total += usage.total;
  }
  
  getTotalUsage(): TokenUsage {
    return { ...this.totalUsage };
  }
  
  reset(): void {
    this.totalUsage = { prompt: 0, completion: 0, total: 0 };
  }
}
```

**Benefits:**
- Global state management (token counts)
- Single source of truth
- Easy access from all services
- Reset capability between runs

**Usage in Enrichment System:**
- `TokenTracker` - Tracks LLM token usage across all services

### Retry with Exponential Backoff

**Purpose:** Handle transient failures with intelligent retry logic

**Implementation:**
```typescript
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```

**Benefits:**
- Handles transient API failures
- Exponential backoff reduces API load
- Configurable retry count
- Preserves original error if all retries fail

**Usage in Enrichment System:**
- `withRetry` - Used by LLMClient for API calls

### Result Type Pattern

**Purpose:** Explicit success/failure handling without exceptions

**Implementation:**
```typescript
export interface ChefEnrichmentResult {
  chefId: string;
  chefName: string;
  miniBio: string | null;
  restaurants: Restaurant[];
  tokensUsed: TokenUsage;
  success: boolean;
  error?: string;
}

const result = await service.enrichChef(/* ... */);

if (!result.success) {
  console.error('Enrichment failed:', result.error);
  // Handle error
} else {
  console.log('Bio:', result.miniBio);
  // Process success
}
```

**Benefits:**
- Explicit error handling (no try/catch)
- Type-safe error checking
- Structured error information
- Consistent across all operations

**Usage in Enrichment System:**
- All services return Result types
- All workflows return WorkflowResult types

### Schema Validation Pattern

**Purpose:** Runtime type validation for external data (LLM responses)

**Implementation:**
```typescript
import { z } from 'zod';

const ChefEnrichmentSchema = z.object({
  miniBio: z.string().transform(val => stripCitations(val)),
  restaurants: z.array(RestaurantSchema).default([]),
  jamesBeardStatus: enumWithCitationStrip(['winner', 'nominated', 'semifinalist'] as const),
  notableAwards: z.array(z.string()).nullable().optional()
});

export function parseAndValidate<T>(text: string, schema: z.ZodSchema<T>): T {
  const json = extractJsonFromText(text);
  try {
    return schema.parse(json);
  } catch (error) {
    throw new Error(`Validation failed: ${error.message}`);
  }
}
```

**Benefits:**
- Runtime type safety for LLM responses
- Automatic data transformation (citation stripping)
- Clear validation errors
- Type inference from schemas

**Usage in Enrichment System:**
- All services validate LLM responses with Zod schemas

## Error Handling

### Service Error Handling

**Pattern:** Return error in result, don't throw

```typescript
async enrichChef(/* ... */): Promise<ChefEnrichmentResult> {
  try {
    const response = await this.llmClient.generateText(prompt);
    const parsed = parseAndValidate(response, schema);
    
    return {
      success: true,
      chefId,
      miniBio: parsed.miniBio,
      tokensUsed: /* ... */
    };
  } catch (error) {
    return {
      success: false,
      chefId,
      miniBio: null,
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      error: error.message
    };
  }
}
```

### Workflow Error Handling

**Pattern:** Aggregate errors, distinguish fatal vs non-fatal

```typescript
protected addError(code: string, message: string, fatal: boolean = true) {
  this.errors.push({
    step: this.steps[this.steps.length - 1]?.name,
    code,
    message,
    fatal
  });
  
  if (fatal) {
    throw new Error(message);
  }
}
```

## Data Access Patterns

### Type-Safe Database Operations

**Pattern:** Use generated database types for type safety

```typescript
import { Database } from '@/lib/database.types';

export class ChefRepository {
  constructor(private supabase: SupabaseClient<Database>) {}
  
  async updateBio(chefId: string, bio: string): Promise<void> {
    const { error } = await this.supabase
      .from('chefs')  // Type-safe table name
      .update({ mini_bio: bio })  // Type-safe column name
      .eq('id', chefId);
    
    if (error) throw new Error(`Failed to update chef bio: ${error.message}`);
  }
}
```

### Duplicate Detection Pattern

**Pattern:** Check before insert to prevent data quality issues

```typescript
async createRestaurant(restaurant: RestaurantInsert): Promise<string> {
  const isDuplicate = await this.checkDuplicates(
    restaurant.name,
    restaurant.city
  );
  
  if (isDuplicate) {
    console.log(`Duplicate restaurant detected: ${restaurant.name} in ${restaurant.city}`);
    return null;
  }
  
  const { data, error } = await this.supabase
    .from('restaurants')
    .insert(restaurant)
    .select('id')
    .single();
  
  return data?.id;
}

async checkDuplicates(name: string, city: string): Promise<boolean> {
  const { data } = await this.supabase
    .from('restaurants')
    .select('id')
    .ilike('name', name)
    .ilike('city', city)
    .limit(1);
  
  return data && data.length > 0;
}
```

## Testing Patterns

### Service Testing with Mocks

**Pattern:** Mock dependencies, test logic in isolation

```typescript
describe('ChefEnrichmentService', () => {
  let service: ChefEnrichmentService;
  let mockLLMClient: jest.Mocked<LLMClient>;
  let mockTokenTracker: jest.Mocked<TokenTracker>;

  beforeEach(() => {
    mockLLMClient = {
      generateText: jest.fn().mockResolvedValue('{"miniBio": "Test bio"}')
    } as any;
    
    mockTokenTracker = {
      trackUsage: jest.fn()
    } as any;
    
    service = new ChefEnrichmentService(mockLLMClient, mockTokenTracker, 10);
  });

  it('should enrich chef successfully', async () => {
    const result = await service.enrichChef('uuid', 'Test Chef', 'Top Chef');
    
    expect(result.success).toBe(true);
    expect(result.miniBio).toBe('Test bio');
    expect(mockLLMClient.generateText).toHaveBeenCalledTimes(1);
    expect(mockTokenTracker.trackUsage).toHaveBeenCalled();
  });
});
```

### Workflow Testing with Real Database

**Pattern:** Integration tests with test database, mocked LLM

```typescript
describe('RefreshStaleChefWorkflow', () => {
  let workflow: RefreshStaleChefWorkflow;
  let testSupabase: SupabaseClient;

  beforeAll(async () => {
    testSupabase = createClient(TEST_URL, TEST_KEY);
    await seedTestData(testSupabase);
  });

  it('should refresh chef data', async () => {
    const result = await workflow.execute({
      chefId: 'test-uuid',
      chefName: 'Test Chef',
      scope: { bio: true }
    });
    
    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(3);
    expect(result.totalCost.estimatedUsd).toBeLessThan(1);
  });
});
```

## Anti-patterns to Avoid

### ❌ Direct Database Access in Services

**Wrong:**
```typescript
class ChefEnrichmentService {
  async enrichChef(chefId: string) {
    // DON'T: Direct Supabase access in service
    await this.supabase.from('chefs').update({ bio: 'test' });
  }
}
```

**Right:**
```typescript
class ChefEnrichmentService {
  async enrichChef(chefId: string) {
    // DO: Use repository
    await this.chefRepository.updateBio(chefId, 'test');
  }
}
```

### ❌ Throwing Exceptions for Business Logic

**Wrong:**
```typescript
async enrichChef(chefId: string): Promise<ChefEnrichmentResult> {
  const response = await this.llmClient.generateText(prompt);
  if (!response) throw new Error('No response'); // DON'T
}
```

**Right:**
```typescript
async enrichChef(chefId: string): Promise<ChefEnrichmentResult> {
  const response = await this.llmClient.generateText(prompt);
  if (!response) {
    return { success: false, error: 'No response', /* ... */ }; // DO
  }
}
```

### ❌ Monolithic Services

**Wrong:**
```typescript
class EnrichmentService {
  async enrichChef() { /* ... */ }
  async findRestaurants() { /* ... */ }
  async verifyStatus() { /* ... */ }
  async generateNarrative() { /* ... */ }
  // 1000+ lines of mixed concerns
}
```

**Right:**
```typescript
class ChefEnrichmentService { /* 200 lines - bio/awards only */ }
class RestaurantDiscoveryService { /* 150 lines - restaurants only */ }
class StatusVerificationService { /* 100 lines - status only */ }
class NarrativeService { /* 160 lines - narratives only */ }
```

### ❌ Global Mutable State

**Wrong:**
```typescript
let totalTokens = 0; // Global variable

function enrichChef() {
  totalTokens += 1000; // Mutating global state
}
```

**Right:**
```typescript
class TokenTracker {
  private totalUsage: TokenUsage = { /* ... */ };
  
  trackUsage(usage: TokenUsage) {
    this.totalUsage.total += usage.total;
  }
}
```

## Pattern Examples

See `enrichment-system.md` for complete examples of:
- Service implementation (ChefEnrichmentService)
- Repository pattern (ChefRepository)
- Workflow orchestration (RefreshStaleChefWorkflow)
- Result type pattern (ChefEnrichmentResult)
- Facade pattern (createLLMEnricher)

See `enrichment-reference.md` for usage examples and quick reference.