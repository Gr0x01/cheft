---
Last-Updated: 2025-11-30
Maintainer: RB
Status: Active Planning
---

# TV Chef Map Implementation Plan

## Executive Summary

Based on the user journey research and UI design work, this document outlines the implementation approach for TV Chef Map - a fan-focused application for discovering restaurants owned by TV chefs. This is NOT a generic restaurant finder; it's an achievement-based discovery platform for cooking show enthusiasts.

## Core User Insights (from visual-storyteller)

### Primary User Motivations
1. **Fan Connection** - Creating parasocial bonds by eating at their TV hero's restaurant
2. **Achievement Collection** - "Gotta catch 'em all" mentality for visiting chef restaurants  
3. **Discovery Surprise** - "Holy shit, that Chopped champion is 20 minutes away!"
4. **Social Currency** - Bragging rights within fan communities
5. **Pilgrimage Planning** - Building trips around chef restaurant visits

### Key Success Moments
- **The "Holy Shit" Moment** - Discovering a favorite chef has a nearby restaurant
- **The Easy Find** - Getting accurate answers vs. outdated blog chaos
- **The Perfect Plan** - Successfully visiting multiple chef restaurants on a trip
- **The Social Win** - Being first in friend group to visit new chef spot
- **The Real Connection** - Meeting the actual chef at their restaurant

## UI/UX Design Direction (from ui-designer)

### Design Philosophy: "Editorial Meets Gaming"
- Sophisticated editorial design with achievement mechanics
- TV show credentials take center stage (not generic restaurant data)
- Gamification elements for completionist behavior
- Social sharing optimized for bragging rights

### Visual System
- **Primary Gold (#F59E0B)** - Achievement/trophy feel for badges
- **Secondary Emerald (#10B981)** - Success states, "open" status
- **Tertiary Violet (#8B5CF6)** - Premium/special indicators
- **Error Red (#EF4444)** - Closed/unavailable status

### Key UI Components
1. **Achievement Badges** - Visual rewards for visiting restaurants
2. **Progress Tracking** - "12/47 Top Chef Winners visited"
3. **Discovery Animations** - Confetti for finding nearby favorites
4. **Chef-First Cards** - TV achievements prominent, not just restaurant info
5. **Natural Language Search** - With fan-focused example queries

## Implementation Phases

### Phase 1: Core Discovery Experience (MVP)

#### 1.1 Data Foundation
- [ ] Set up Supabase project with schema
- [ ] Create seed data with 20-30 high-profile TV chef restaurants
- [ ] Focus on Top Chef winners in major cities initially
- [ ] Implement basic CRUD operations

#### 1.2 Basic Search & Display
- [ ] Restaurant list view with chef achievements prominent
- [ ] Simple text-based search (no LLM yet)
- [ ] Filter by show, city, open/closed status
- [ ] Chef profile cards showing TV history

#### 1.3 Achievement System Foundation
- [ ] Track visited restaurants in localStorage
- [ ] Calculate basic progress metrics
- [ ] Display achievement badges
- [ ] "Restaurants near me" discovery feature

### Phase 2: Enhanced Discovery & Gamification

#### 2.1 Natural Language Search
- [ ] Implement LLM query interpretation
- [ ] Cache interpreted queries for efficiency
- [ ] Fallback to keyword search on failure
- [ ] Display interpretation to user ("Showing Top Chef winners in Chicago")

#### 2.2 Map Integration
- [ ] Interactive map with chef location pins
- [ ] Cluster view for cities with multiple restaurants
- [ ] Chef photo avatars on pins
- [ ] Mobile toggle between map/list views

#### 2.3 Advanced Gamification
- [ ] Unlockable achievements with animations
- [ ] Shareable achievement images
- [ ] Progress tracking across multiple dimensions
- [ ] Suggested "next targets" based on location

### Phase 3: Social & Trip Planning Features

#### 3.1 Trip Planning Tools
- [ ] Multi-restaurant itinerary builder
- [ ] Optimal route suggestions
- [ ] Export to calendar functionality
- [ ] "Chef likely present" scheduling info

#### 3.2 Social Features
- [ ] Share achievements to social media
- [ ] Compare progress with friends
- [ ] Community leaderboards
- [ ] "First to visit" badges

#### 3.3 Data Enrichment
- [ ] Admin interface for adding/updating restaurants
- [ ] LLM-powered data normalization
- [ ] Automated status checking
- [ ] User-submitted corrections

## Technical Implementation Approach

### Frontend Architecture

```
src/
├── app/                      # Next.js app directory
│   ├── page.tsx             # Main discovery page
│   ├── chef/[slug]/         # Chef profile pages
│   └── api/                 # API routes
├── components/
│   ├── discovery/           # Search, filters, results
│   ├── achievements/        # Badges, progress, unlocks
│   ├── restaurant/          # Cards, details, status
│   └── map/                 # Map view, clustering
├── hooks/
│   ├── useRestaurantData.ts # Data fetching/caching
│   ├── useAchievements.ts   # Progress tracking
│   └── useNaturalSearch.ts  # NL search integration
└── services/
    ├── restaurants.ts       # Restaurant CRUD
    ├── search.ts           # Search logic
    └── achievements.ts     # Achievement calculations
```

### Component Hierarchy

```
<HomePage>
  <Header>
    <Logo />
    <AchievementProgress />
  </Header>
  
  <SearchSection>
    <NaturalLanguageSearch />
    <QuickFilters />
    <SearchExamples />
  </SearchSection>
  
  <DiscoveryView>
    <MapView>
      <ChefMarkers />
      <ClusterView />
    </MapView>
    
    <ListView>
      <RestaurantCard>
        <ChefPhoto />
        <TVAchievements />
        <RestaurantInfo />
        <ActionButtons />
      </RestaurantCard>
    </ListView>
  </DiscoveryView>
  
  <AchievementModal />
</HomePage>
```

### State Management Strategy

```typescript
// Global app state (React Context)
interface AppState {
  // Discovery
  restaurants: RestaurantWithDetails[]
  filteredRestaurants: RestaurantWithDetails[]
  searchQuery: string
  filters: SearchFilters
  
  // User progress
  visitedRestaurants: Set<string>
  achievements: Achievement[]
  
  // UI state
  selectedRestaurant: RestaurantWithDetails | null
  mapViewport: MapViewport
  showAchievementModal: boolean
}

// Local component state
- Form inputs
- Hover states  
- Animation triggers
- Temporary UI states
```

### Data Flow

```
User Input (Natural Language)
    ↓
NL Search Component
    ↓
API Route (/api/search/natural)
    ↓
LLM Interpretation Service
    ↓
Structured Filters
    ↓
Database Query
    ↓
Results with Achievement Context
    ↓
Update UI (Map + List)
    ↓
Track User Progress
    ↓
Check Achievement Unlocks
    ↓
Display Celebration
```

## Priority Features by User Value

### Must Have (MVP)
1. Accurate, current TV chef restaurant data
2. Search by show/chef/city
3. Clear open/closed status
4. Chef TV achievements visible
5. Mobile-responsive design
6. Basic progress tracking

### Should Have (Phase 2)
1. Natural language search
2. Interactive map
3. Achievement unlocks with animations
4. Trip planning tools
5. Social sharing

### Nice to Have (Future)
1. User accounts
2. Community features
3. Chef appearance calendar
4. Reservation integration
5. Mobile app

## Success Metrics

### User Engagement
- Discovery rate: How many users find a restaurant near them?
- Achievement unlock rate: Are users tracking visits?
- Return user rate: Do people come back to track progress?
- Social share rate: Are achievements being shared?

### Data Quality
- Accuracy: Are restaurants correctly mapped to chefs/shows?
- Freshness: How current is the open/closed status?
- Coverage: What percentage of TV chefs are represented?

### Technical Performance
- Search success rate: How often does NL search work correctly?
- Page load time: Is discovery instant?
- LLM cost per user: Are we staying within budget?

## Risk Mitigation

### Technical Risks
- **LLM failures**: Implement robust fallback to keyword search
- **Data quality**: Start with curated subset, expand carefully
- **Performance**: Client-side filtering for instant results
- **Costs**: Cache aggressively, use LLM sparingly

### User Experience Risks
- **Empty results**: Always show nearby alternatives
- **Stale data**: Clear indicators of last update time
- **Complexity**: Progressive disclosure of features
- **Mobile experience**: List-first design with optional map

## Development Principles

1. **Fan-First Design**: Every decision should enhance the fan experience
2. **Achievement Psychology**: Tap into completionist behavior
3. **Discovery Delight**: Make finding restaurants feel magical
4. **Data Accuracy**: Better to have less data that's correct
5. **Performance**: Discovery should feel instant
6. **Mobile-First**: Most discovery happens on phones

## Next Steps

1. Finalize initial restaurant dataset (20-30 high-profile entries)
2. Set up Supabase project and run migrations
3. Implement core React components with static data
4. Add achievement tracking logic
5. Integrate with Supabase for dynamic data
6. Implement search and filtering
7. Add map view
8. Implement natural language search
9. Add animations and polish
10. Deploy MVP for testing

This implementation plan prioritizes the authentic fan experience identified through user research, using gamification and achievement mechanics to create a compelling alternative to generic restaurant search.