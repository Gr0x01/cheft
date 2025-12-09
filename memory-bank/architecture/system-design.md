---
Last-Updated: 2025-12-09
Maintainer: RB
Status: Active Design
---

# TV Chef Map: System Architecture & Flow Design

## Core System Overview

The TV Chef Map is a curated database application that helps fans of cooking TV shows find restaurants owned by their favorite TV chefs. Unlike generic restaurant search, this focuses on the fan experience and achievement collection.

## Key System Components

### 1. Data Layer (Supabase PostgreSQL)

**Core Tables:**
- `shows`: TV shows (Top Chef, Iron Chef, etc.)
- `chefs`: TV chef profiles with show achievements
- `restaurants`: Restaurant details with chef relationships
- `restaurant_embeddings`: Vector embeddings for semantic search

**Data Integrity:**
- Single source of truth for chef/restaurant relationships
- Soft deletes to preserve historical data
- Automated timestamp updates
- Foreign key constraints ensure data consistency

**Reference Tables:**
- `michelin_restaurants`: External Michelin star data (syncs to restaurants)
  - 4,009 restaurants worldwide (195 ★★★, 522 ★★, 3,292 ★)
  - Auto-sync trigger: exact name + flexible city/state matching
  - Source: Wikipedia (66 pages scraped via `npm run michelin:scrape`)
  - Refresh: Yearly (~November when Michelin announces new stars)

### 2. Natural Language Search System

**How It Works:**

```
User Query: "Top Chef winners in Chicago under $50"
                    ↓
        LLM Interpretation (gpt-4o-mini)
                    ↓
Structured Filters: {
  show_names: ["Top Chef"],
  result_priority: ["winner"],
  city: "Chicago",
  price_tiers: ["$", "$$"]
}
                    ↓
        Database Query (Supabase)
                    ↓
        Ranked Results
```

**Key Innovation:** LLM interprets natural language into structured filters against OUR database, not generating restaurant suggestions from training data.

### 3. Data Enrichment Pipeline (Admin-Only)

**Offline LLM Usage:**
```
Raw Restaurant Data → Web Scraping → LLM Processing → Enriched Data
                                          ↓
                              - Normalize cuisine tags
                              - Generate chef mini bios
                              - Extract TV achievements
                              - Standardize price tiers
```

**Cost Control:** LLM runs only during admin enrichment, not per user query.

## Core User Flows

### Flow 1: Natural Language Discovery

1. **User Input**: Types "Gordon Ramsay restaurants in Vegas"
2. **Client Processing**: Sends to `/api/nl-search`
3. **Server Interpretation**: 
   - LLM extracts: chef="Gordon Ramsay", city="Las Vegas"
   - Converts to database query
4. **Database Query**: 
   - Joins restaurants → chefs → shows
   - Filters by interpreted parameters
5. **Response Enhancement**:
   - Adds achievement badges
   - Calculates distances
   - Checks current status
6. **Client Display**:
   - Updates map pins
   - Refreshes restaurant list
   - Shows interpretation: "Showing Gordon Ramsay's 3 restaurants in Las Vegas"

### Flow 2: Achievement Tracking (PLANNED - Not Yet Implemented)

Future feature for tracking restaurant visits and unlocking achievements.

### Flow 3: Trip Planning (PLANNED - Not Yet Implemented)

Future feature for multi-restaurant itinerary building.

## API Architecture

### Public Endpoints

**GET /api/restaurants**
- Returns all public restaurants with chef/show data
- Supports filtering: city, state, show, price
- Includes achievement metadata

**POST /api/nl-search**
```typescript
Request: { query: string }
Response: {
  filters: ParsedFilters,
  results: RestaurantWithDetails[],
  interpretation: string
}
```

### Protected Admin Endpoints

**POST /api/admin/enrich-restaurant**
- Requires auth
- Fetches external data
- Uses LLM to normalize/enhance
- Updates database

## Data Flow Architecture

```
Frontend (Next.js)
    ↓ ↑
API Routes (Next.js Serverless)
    ↓ ↑
Services Layer
  ├── Search Service (LLM interpretation)
  ├── Restaurant Service (CRUD operations)
  ├── Achievement Service (progress tracking)
  └── Enrichment Service (admin only)
    ↓ ↑
Data Layer (Supabase)
  ├── PostgreSQL (structured data)
  └── Vector Store (embeddings)
```

## Caching Strategy

### Client-Side
- Full restaurant dataset cached for instant filtering
- Achievement progress cached per session
- Search history stored locally

### Server-Side
- LLM interpretations cached (15 min)
- Restaurant data cached (5 min)
- Embedding computations cached permanently

## Security Considerations

### Public Access
- Read-only access to restaurant data
- Rate limiting on search endpoints
- No PII collected without auth

### Admin Access
- Supabase Auth required
- Service role key for data modifications
- Audit logging for all changes

## Performance Optimizations

### Initial Load
- Server-side rendering for SEO
- Progressive enhancement
- Lazy load map components

### Runtime
- Client-side filtering for instant results
- Debounced search inputs
- Virtual scrolling for long lists

### Database
- Indexed searches on common fields
- Vector similarity search for semantic queries
- Connection pooling via Supabase

## Deployment Architecture

```
Vercel (Frontend + API)
  ├── Next.js Pages (SSG where possible)
  ├── API Routes (Serverless Functions)
  └── Edge Caching (Static Assets)
      ↓
Supabase (Backend)
  ├── PostgreSQL Database
  ├── Vector Extensions
  ├── Row Level Security
  └── Realtime Subscriptions
      ↓
External Services
  ├── OpenAI API (LLM)
  └── Nominatim (Geocoding)
```

## State Management

### Global State
- Restaurant dataset
- User filters
- Achievement progress
- Selected restaurant

### Local Component State
- Map viewport
- List scroll position
- Form inputs
- UI toggles

### Persistent State
- Visit history (localStorage)
- User preferences
- Search history
- Achievement unlocks

## Error Handling

### Graceful Degradation
- Natural language fails → show traditional filters
- Map fails → list-only view
- LLM unavailable → exact text matching
- Database offline → cached data

### User Feedback
- Clear error messages
- Fallback options
- Retry mechanisms
- Support contact

## Monitoring & Analytics

### Key Metrics
- Search success rate
- Achievement unlock rate
- Restaurant discovery rate
- API response times
- LLM token usage

### User Analytics
- Popular search queries
- Most visited chefs
- Achievement completion rates
- Geographic usage patterns

## Future Extensibility

### Planned Features
- User accounts with saved progress
- Social features (follow other collectors)
- Chef appearance calendar
- Reservation integration
- Mobile app

### Technical Debt Considerations
- Migration path for user accounts
- Scaling vector search
- Multi-region deployment
- Real-time updates

This architecture prioritizes the fan experience while maintaining cost efficiency through strategic LLM usage and smart caching. The system is designed to scale from hundreds to thousands of restaurants while keeping the core discovery experience fast and delightful.