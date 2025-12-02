---
Last-Updated: 2025-12-02
Maintainer: RB
Status: Active Development
---

# Quickstart: TV Chef Map

## Current Status
- **Phase**: Phase 2 - SEO Pages + Admin Tooling Complete
- **Version**: 0.3.0
- **Environment**: Development (Database Ready, Admin Panel Live)
- **Next Milestone**: Data enrichment completion + technical SEO

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
- Completing data enrichment (photos, bios, Google Places)
- Admin panel for data management and photo uploads
- Technical SEO optimization (sitemap, robots.txt)
- City landing pages and internal linking

## Quick Links
- [Project Brief](./projectbrief.md)
- [Tech Stack](../architecture/techStack.md)  
- [Active Context](../development/activeContext.md)

## Environment Setup
1. ✅ Next.js project initialized
2. ✅ Supabase project setup and MCP integration
3. ✅ Environment variables configured
4. ✅ Database schema deployed with 311 restaurants
5. ✅ SEO pages live (chefs, restaurants, cities)
6. ✅ Admin panel with data management and photo uploads
7. ⏳ Data enrichment (photos, bios, ratings)

## Database Status
- **Restaurants**: 311 Top Chef locations
- **Chefs**: 180 unique contestants/winners  
- **Coverage**: 162 cities across 45 US states
- **Data Quality**: 100% geocoded with complete metadata
- **Enrichment**: 26% chef photos, 19% restaurant Google Places

## Admin Panel
- **Login**: `/admin/login` (Supabase Auth with magic link)
- **Review Queue**: `/admin/review` (pending approvals)
- **Activity Log**: `/admin/activity` (audit trail)
- **Data Dashboard**: `/admin/data` (completeness metrics)
- **Manage Data**: `/admin/manage` (photo upload, re-enrichment)