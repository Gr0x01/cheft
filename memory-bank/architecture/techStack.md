---
Last-Updated: 2025-11-30
Maintainer: RB
Status: Defined
---

# Technology Stack: TV Chef Map

## Core Technologies
Modern web stack optimized for rapid development and minimal operational overhead.

### Backend
- **Runtime**: Node.js 18+ (via Next.js API routes)
- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL with vector extensions)
- **Storage**: Supabase Storage (for chef/restaurant photos)
- **Authentication**: Supabase Auth (for admin tools)
- **LLM**: OpenAI API (GPT-4 for enrichment, GPT-3.5-turbo for query interpretation)

### Frontend
- **Framework**: Next.js 14+ with React 18
- **State Management**: React Context + useState/useReducer (simple state, no external store needed initially)
- **Styling**: Tailwind CSS
- **Maps**: Leaflet.js with OpenStreetMap (free alternative to Google Maps)
- **UI Components**: Headless UI + custom components
- **Build Tool**: Built into Next.js

### Infrastructure
- **Hosting**: Vercel (seamless Next.js integration)
- **Database Hosting**: Supabase (managed Postgres with vector support)
- **File Storage**: Supabase Storage (photo uploads with RLS policies)
- **CDN**: Vercel Edge Network (included)
- **Monitoring**: Vercel Analytics + Supabase monitoring

## Development Tools

### Code Quality
- **Linting**: ESLint with Next.js config
- **Formatting**: Prettier with Tailwind plugin
- **Type Checking**: TypeScript (strict mode)
- **Testing**: Jest + React Testing Library (unit tests), Playwright (e2e)

### Development Environment
- **Package Manager**: npm (comes with Node.js, simple and reliable)
- **Version Control**: Git
- **CI/CD**: Vercel automated deployments + GitHub Actions (for tests)
- **Environment**: Local development with Next.js dev server + Supabase local

### Specialized Tools
- **Vector Search**: Supabase vector/embeddings support
- **Geocoding**: Nominatim (OpenStreetMap geocoding service)
- **Data Validation**: Zod for runtime type checking
- **Environment Variables**: Next.js built-in env support

## Architecture Decisions

### Database Design
- **PostgreSQL**: Relational structure for chef/restaurant relationships
- **Vector Extensions**: Supabase pgvector for semantic search capabilities  
- **Normalized Schema**: Separate tables for shows, chefs, restaurants to avoid duplication
- **Soft Deletes**: `status` field instead of hard deletes for restaurants

### API Design
- **Next.js API Routes**: Server-side API endpoints within same codebase
- **RESTful Design**: Simple GET/POST endpoints for restaurants and search
- **Admin API Routes**: Photo upload/delete, data enrichment triggers
- **Type Safety**: Shared TypeScript types between client and server
- **Error Handling**: Consistent error responses with proper HTTP status codes
- **Input Validation**: UUID validation, file type/size checks, URL sanitization

### Security Considerations
- **Environment Variables**: All API keys stored in Vercel env vars
- **CORS**: Next.js default CORS handling for same-origin requests
- **Input Validation**: Zod schemas for all user inputs, UUID validation for admin operations
- **File Upload Security**: Type/size validation (5MB max, jpg/png/webp only), URL sanitization
- **Admin Auth**: Supabase Auth for admin-only enrichment endpoints
- **Rate Limiting**: Vercel automatic rate limiting + custom LLM call limits
- **Storage Security**: RLS policies on Supabase Storage buckets

### Performance Considerations
- **Static Generation**: Pre-generate pages where possible
- **Client-Side Filtering**: Cache full dataset client-side for instant filtering
- **Vector Search Caching**: Cache embeddings, don't regenerate on every query
- **Lazy Loading**: Load restaurant details on demand
- **Bundle Optimization**: Tree-shaking with ES modules, minimize bundle size

## Dependencies
```json
{
  "next": "14+",
  "react": "18+", 
  "typescript": "5+",
  "tailwindcss": "3+",
  "leaflet": "^1.9.0",
  "react-leaflet": "^4.2.0", 
  "@headlessui/react": "^1.7.0",
  "@supabase/supabase-js": "^2.38.0",
  "openai": "^4.20.0",
  "zod": "^3.22.0"
}
```

## Environment Configuration
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI  
OPENAI_API_KEY=your_openai_key

# Optional: External APIs
NOMINATIM_USER_AGENT=your_app_name_for_geocoding
```

## Deployment Architecture
- **Frontend**: Static generation + ISR where possible on Vercel Edge
- **API Routes**: Vercel serverless functions (Node.js runtime)
- **Database**: Supabase managed PostgreSQL with global CDN
- **Assets**: Vercel CDN for static assets
- **Monitoring**: Vercel Analytics + Supabase monitoring dashboard