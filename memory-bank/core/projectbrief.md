---
Last-Updated: 2025-11-30
Maintainer: RB
Status: Defined
---

# Project Brief: TV Chef Map + Directory

## Project Overview
A curated web application that maps and catalogs restaurants owned/operated by TV chefs, with natural-language search capabilities powered by a structured database rather than generic web content.

## Core Purpose
Solve the problem of finding reliable information about TV chef restaurants without the noise of outdated blog posts, closed establishments, or inaccurate data found through general web search.

## Target Users
- **Food enthusiasts** seeking authentic TV chef dining experiences
- **Travelers** wanting to visit celebrity chef establishments in new cities  
- **Fans of cooking shows** (Top Chef, Iron Chef, etc.) looking to dine at contestant/winner restaurants
- **Locals** discovering high-quality chef-driven restaurants in their area

## Key Features
### Core Functionality
- **Global restaurant map** with TV chef locations
- **Advanced filtering** by city, chef, show, price tier, cuisine type
- **Natural-language search** ("Top Chef winners in Chicago under $50")
- **Curated database** with verified, up-to-date information
- **Show integration** linking chefs to their TV appearances and results

### LLM Integration Points
- **Admin enrichment**: Normalize and enhance restaurant data offline
- **Query interpretation**: Convert natural language to structured filters
- **Data quality**: Generate chef bios and cuisine tags from source material

## Success Metrics
- **User engagement**: Time spent browsing, searches performed
- **Data quality**: Accuracy of restaurant information vs. competitors
- **Search effectiveness**: Natural language query success rate
- **Coverage growth**: Number of chefs and restaurants in database

## Scope & Boundaries
### In Scope
- TV chef restaurants (Top Chef, Iron Chef, Tournament of Champions, etc.)
- Global coverage with initial focus on major US cities
- Basic restaurant info: location, price tier, cuisine, status
- Natural language search over curated data
- Admin tools for data enrichment

### Out of Scope
- Full itinerary planning
- General restaurant recommendations (non-TV chefs)
- Real-time availability/reservations
- User reviews/ratings system
- Social features

## Timeline & Phases
### Phase 1: MVP (4-6 weeks)
- Core database schema and initial data load
- Basic Next.js app with map and list views
- Simple filtering and search
- Admin enrichment tools

### Phase 2: Enhancement (2-3 weeks)
- Natural language search API
- Advanced filtering and semantic search
- Data expansion to more shows/chefs

### Phase 3: Polish (1-2 weeks)
- Performance optimization
- UI/UX improvements
- Additional admin features

## Technical Constraints
- **Budget-conscious LLM usage**: Primarily offline/admin, minimal user-facing
- **Data accuracy requirements**: No hallucinated restaurants or outdated info
- **Performance**: Fast search and filtering for good UX
- **Scalability**: Architecture should support growth to thousands of restaurants

## Business Constraints
- Small project scope (solo or small team)
- Minimal ongoing costs (Vercel/Supabase free tiers initially)
- Focus on execution speed over feature completeness

## Risks & Assumptions
### Key Risks
- **Data sourcing challenges**: Finding reliable, up-to-date restaurant information
- **Maintenance overhead**: Keeping restaurant status current as places open/close
- **LLM cost creep**: Ensuring AI usage stays within budget

### Assumptions
- **Market demand**: People want curated TV chef restaurant information
- **Data availability**: Sufficient public information exists to build meaningful database
- **Technical feasibility**: Next.js/Supabase stack can handle requirements efficiently