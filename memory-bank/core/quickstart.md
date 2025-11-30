---
Last-Updated: 2025-11-30
Maintainer: RB
Status: Active Development
---

# Quickstart: TV Chef Map

## Current Status
- **Phase**: Phase 2 - Frontend Development
- **Version**: 0.2.0
- **Environment**: Development (Database Ready)
- **Next Milestone**: Interactive map + restaurant browsing UI

## Key Commands
```bash
# Development
npm run dev          # Start development server (localhost:3003)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks

# Database (Supabase)
# Set up via Supabase dashboard
# Run migrations when ready

# Testing
npm run test         # Run Jest tests
npm run test:e2e     # Run Playwright tests
```

## Active Focus
- Building interactive map component with Leaflet.js
- Creating restaurant list and filtering interface
- Developing chef profile pages
- Implementing search functionality

## Quick Links
- [Project Brief](./projectbrief.md)
- [Tech Stack](../architecture/techStack.md)  
- [Active Context](../development/activeContext.md)

## Environment Setup
1. ✅ Next.js project initialized
2. ✅ Supabase project setup and MCP integration
3. ✅ Environment variables configured
4. ✅ Database schema deployed with 311 restaurants
5. ⏳ Frontend components (map, restaurant list, search)

## Database Status
- **Restaurants**: 311 Top Chef locations
- **Chefs**: 180 unique contestants/winners  
- **Coverage**: 162 cities across 45 US states
- **Data Quality**: 100% geocoded with complete metadata