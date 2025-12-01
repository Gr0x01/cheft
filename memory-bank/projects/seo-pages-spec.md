---
Last-Updated: 2025-12-01
Maintainer: RB
Status: Draft - Planning
Next-Action: Review and approve spec, then run enrichment pipeline
---

# SEO Pages Architecture Spec

## Overview

Create individual, ad-ready pages for chefs and restaurants with rich interlinking for maximum SEO value. Each entity gets a dedicated, crawlable page optimized for search engines and ad monetization.

## Goals

1. **Organic Traffic**: Rank for "chef name restaurant", "top chef winner restaurants", "best restaurants [city]"
2. **Rich Snippets**: Schema.org markup for Google knowledge panels and rich results
3. **Ad Revenue Ready**: Strategic placements that don't harm UX
4. **Internal Linking**: Strong link graph between related entities

---

## 1. URL Structure

```
/                             # Homepage with map
/chefs                        # Chef directory listing
/chefs/[slug]                 # Individual chef page (e.g., /chefs/stephanie-izard)
/restaurants                  # Restaurant directory listing  
/restaurants/[slug]           # Individual restaurant page (e.g., /restaurants/girl-and-the-goat-chicago)
/cities/[city-slug]           # City landing page (e.g., /cities/chicago-il)
/shows/[show-slug]            # Show landing page (e.g., /shows/top-chef)
```

### Slug Format
- **Chefs**: `{first-last}` → `stephanie-izard`
- **Restaurants**: `{name}-{city}` → `girl-and-the-goat-chicago`
- **Cities**: `{city}-{state}` → `chicago-il`
- **Shows**: `{show-name}` → `top-chef`

---

## 2. Chef Page (`/chefs/[slug]`)

### Wireframe
```
┌─────────────────────────────────────────────────────────┐
│  [Photo]  CHEF NAME                                     │
│           ⭐ James Beard Winner                          │
│           🏆 Top Chef Season 4 Winner                    │
├─────────────────────────────────────────────────────────┤
│  ABOUT                                                  │
│  Mini bio paragraph 1...                                │
│  Mini bio paragraph 2...                                │
│                                                         │
│  [Social Links: Instagram, Twitter, Website]            │
├─────────────────────────────────────────────────────────┤
│  TV APPEARANCES                                         │
│  ┌──────────────────┐ ┌──────────────────┐              │
│  │ Top Chef S4      │ │ Iron Chef        │              │
│  │ Winner           │ │ Competitor       │              │
│  └──────────────────┘ └──────────────────┘              │
├─────────────────────────────────────────────────────────┤
│  RESTAURANTS (3)                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ [Photo]     │ │ [Photo]     │ │ [Photo]     │        │
│  │ Girl & Goat │ │ Duck Duck   │ │ Little Goat │        │
│  │ Chicago, IL │ │ Chicago, IL │ │ Chicago, IL │        │
│  │ ⭐ 4.6 (2k) │ │ ⭐ 4.5 (1k) │ │ ⭐ 4.4 (3k) │        │
│  └─────────────┘ └─────────────┘ └─────────────┘        │
├─────────────────────────────────────────────────────────┤
│  [AD SLOT]                                              │
├─────────────────────────────────────────────────────────┤
│  RELATED CHEFS                                          │
│  Other Top Chef Season 4 contestants...                 │
│  Other chefs in Chicago...                              │
└─────────────────────────────────────────────────────────┘
```

### Content Sections
| Section | Data Source | Priority |
|---------|-------------|----------|
| Hero with photo | `chefs.photo_url` (Wikipedia/TMDB) | P0 |
| Name & badges | `chefs.name`, `james_beard_status`, `chef_shows.result` | P0 |
| Mini bio | `chefs.mini_bio` (LLM enriched) | P0 |
| Social links | `chefs.social_links` (new field) | P1 |
| TV appearances | `chef_shows` joined with `shows` | P0 |
| Restaurants grid | `restaurants` where `chef_id` matches | P0 |
| Related chefs | Same show/season OR same city | P1 |

### SEO Elements
```html
<title>Stephanie Izard - Top Chef Season 4 Winner | ChefMap</title>
<meta name="description" content="Stephanie Izard is a James Beard Award-winning chef and Top Chef Season 4 winner. Owner of Girl & the Goat, Duck Duck Goat, and Little Goat in Chicago.">
<link rel="canonical" href="https://chefmap.com/chefs/stephanie-izard">
```

### Schema.org (JSON-LD)
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Stephanie Izard",
  "jobTitle": "Chef",
  "image": "https://...",
  "description": "Top Chef Season 4 winner...",
  "award": ["James Beard Award", "Top Chef Winner"],
  "worksFor": [
    {
      "@type": "Restaurant",
      "name": "Girl & the Goat",
      "url": "https://chefmap.com/restaurants/girl-and-the-goat-chicago"
    }
  ],
  "sameAs": [
    "https://instagram.com/stefizard",
    "https://twitter.com/stefizard"
  ]
}
```

---

## 3. Restaurant Page (`/restaurants/[slug]`)

### Wireframe
```
┌─────────────────────────────────────────────────────────┐
│  [Photo Carousel - 3 Google Places photos]              │
├─────────────────────────────────────────────────────────┤
│  RESTAURANT NAME                          $$$ │ Open    │
│  ⭐ 4.6 (2,847 reviews)                                 │
│  Italian, Contemporary American                         │
├─────────────────────────────────────────────────────────┤
│  LOCATION                    │  QUICK INFO              │
│  123 Main St                 │  Price: $$$              │
│  Chicago, IL 60601           │  Cuisine: Italian        │
│  [Embedded Map]              │  [Reserve] [Directions]  │
│                              │                          │
├──────────────────────────────┴──────────────────────────┤
│  ABOUT THE CHEF                                         │
│  ┌──────────┐                                           │
│  │ [Photo]  │  Stephanie Izard                          │
│  │          │  🏆 Top Chef S4 Winner                     │
│  │          │  ⭐ James Beard Winner                     │
│  └──────────┘  [View Chef Profile →]                    │
├─────────────────────────────────────────────────────────┤
│  [AD SLOT - SIDEBAR OR IN-CONTENT]                      │
├─────────────────────────────────────────────────────────┤
│  MORE FROM THIS CHEF                                    │
│  [Duck Duck Goat] [Little Goat Diner]                   │
├─────────────────────────────────────────────────────────┤
│  OTHER RESTAURANTS IN CHICAGO                           │
│  [Alinea] [Oriole] [Smyth]                              │
└─────────────────────────────────────────────────────────┘
```

### Content Sections
| Section | Data Source | Priority |
|---------|-------------|----------|
| Photo carousel | `restaurants.google_photos` | P0 |
| Name, rating, price | `name`, `google_rating`, `price_tier` | P0 |
| Cuisine tags | `cuisine_tags` | P0 |
| Status badge | `status` (open/closed) | P0 |
| Address + map | `address`, `city`, `state`, `lat`, `lng` | P0 |
| Description | `restaurants.description` (new, LLM enriched) | P1 |
| Chef card | Join to `chefs` table | P0 |
| Reservation link | `restaurants.reservation_url` (new) | P1 |
| Related: same chef | `restaurants` where same `chef_id` | P0 |
| Related: same city | `restaurants` where same `city` | P1 |

### SEO Elements
```html
<title>Girl & the Goat by Stephanie Izard - Chicago | ChefMap</title>
<meta name="description" content="Contemporary American restaurant by Top Chef winner Stephanie Izard in Chicago. ⭐ 4.6 (2,847 reviews). $$$. Italian-inspired dishes with bold flavors.">
<link rel="canonical" href="https://chefmap.com/restaurants/girl-and-the-goat-chicago">
```

### Schema.org (JSON-LD)
```json
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "Girl & the Goat",
  "image": ["https://...photo1", "https://...photo2"],
  "url": "https://chefmap.com/restaurants/girl-and-the-goat-chicago",
  "telephone": "+1-312-492-6262",
  "priceRange": "$$$",
  "servesCuisine": ["Italian", "Contemporary American"],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "809 W Randolph St",
    "addressLocality": "Chicago",
    "addressRegion": "IL",
    "postalCode": "60607",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 41.8842,
    "longitude": -87.6478
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.6",
    "reviewCount": "2847"
  },
  "openingHoursSpecification": [...],
  "founder": {
    "@type": "Person",
    "name": "Stephanie Izard",
    "url": "https://chefmap.com/chefs/stephanie-izard"
  }
}
```

---

## 4. Directory Pages

### `/chefs` - Chef Directory

**Purpose**: Browsable, filterable list of all chefs. Internal linking hub.

**Features**:
- Grid of chef cards (photo, name, show badge, restaurant count)
- Filters: Show, James Beard status, City
- Search: Name search
- Pagination or infinite scroll
- Links to: individual chef pages

**SEO**: 
- Title: `All TV Chefs - Top Chef, Iron Chef & More | ChefMap`
- Each chef card links to their page (spreading PageRank)

### `/restaurants` - Restaurant Directory

**Purpose**: Browsable, filterable list of all restaurants.

**Features**:
- Grid of restaurant cards (photo, name, chef, city, rating)
- Filters: City, Price tier, Cuisine, Show
- Search: Name, chef, city
- Sort: Rating, review count, newest
- Pagination

**SEO**:
- Title: `TV Chef Restaurants - 311 Locations Nationwide | ChefMap`

### `/cities/[slug]` - City Landing Pages

**Purpose**: Local SEO targeting. Rank for "[city] restaurants by TV chefs".

**Features**:
- All restaurants in that city
- Featured chefs in that city
- City hero image (if available)
- Aggregate stats (X restaurants, Y chefs)

**SEO**:
- Title: `TV Chef Restaurants in Chicago, IL (24 Locations) | ChefMap`
- Schema: `ItemList` of restaurants

**Generate for top cities**:
- Chicago, IL (24 restaurants)
- New York, NY (18 restaurants)
- Los Angeles, CA (15 restaurants)
- Austin, TX (8 restaurants)
- etc.

### `/shows/[slug]` - Show Landing Pages

**Purpose**: Fan traffic. Rank for "Top Chef restaurants" searches.

**Features**:
- All chefs from that show
- Winners spotlight
- Season breakdown
- Link to all restaurants

**SEO**:
- Title: `Top Chef Restaurants - Where Winners & Contestants Cook | ChefMap`

---

## 5. Enrichment Data Requirements

### Chef Table Additions

| Field | Type | Source | Priority | Notes |
|-------|------|--------|----------|-------|
| `photo_url` | TEXT | Wikipedia/TMDB | P0 | Already enriching, 8 done |
| `mini_bio` | TEXT | GPT-5-mini | P0 | Already enriching, 5 done |
| `social_links` | JSONB | LLM web search | P1 | `{instagram, twitter, website}` |
| `notable_awards` | TEXT[] | Wikipedia/LLM | P1 | Beyond James Beard |
| `instagram_handle` | TEXT | LLM web search | P1 | Social proof, embeds |
| `cookbook_titles` | TEXT[] | Wikipedia/Amazon | P2 | Authority signal, affiliate potential |
| `youtube_channel` | TEXT | LLM web search | P2 | Video content |
| `current_role` | TEXT | LLM web search | P1 | "Executive Chef at X" |
| `mentor` | TEXT | LLM/Wikipedia | P2 | "Trained under Thomas Keller" |

### Restaurant Table Additions

| Field | Type | Source | Priority | Notes |
|-------|------|--------|----------|-------|
| `description` | TEXT | LLM from website | P0 | 2-3 sentence description |
| `google_place_id` | TEXT | Google Places | P0 | Already enriching, 10 done |
| `google_rating` | DECIMAL(2,1) | Google Places | P0 | Already enriching |
| `google_review_count` | INTEGER | Google Places | P0 | Already enriching |
| `google_photos` | JSONB | Google Places | P0 | Array of photo URLs, 3 per restaurant |
| `phone` | TEXT | Google Places | P1 | Contact info |
| `hours` | JSONB | Google Places | P2 | Complex structure |
| `reservation_url` | TEXT | LLM web search | P1 | OpenTable/Resy/direct link |
| `signature_dishes` | TEXT[] | LLM from reviews/website | P1 | Long-tail SEO gold |
| `michelin_stars` | INTEGER | LLM/Wikipedia | P1 | Premium filter + rich snippets |
| `year_opened` | INTEGER | LLM web search | P1 | Freshness queries |
| `vibe_tags` | TEXT[] | LLM from reviews | P2 | "date night", "family friendly" |
| `dietary_options` | TEXT[] | Google Places/LLM | P2 | Vegan, gluten-free filters |
| `awards` | TEXT[] | LLM web search | P2 | "Best New Restaurant 2024" |
| `gift_card_url` | TEXT | LLM web search | P2 | Direct revenue link |

### Affiliate & Revenue Fields

| Field | Entity | Source | Revenue Potential |
|-------|--------|--------|-------------------|
| `cookbook_amazon_links` | Chef | Amazon Product API | Affiliate commission |
| `reservation_url` | Restaurant | OpenTable/Resy | Referral fees |
| `gift_card_url` | Restaurant | Direct link | User convenience |
| `merch_url` | Chef | LLM web search | Some chefs sell merch |

### Long-Tail SEO Content Opportunities

| Content Type | Source | Example Query | Implementation |
|--------------|--------|---------------|----------------|
| Signature dishes | `signature_dishes` field | "what to order at girl and the goat" | Restaurant page section |
| Season recaps | `chef_shows` + Wikipedia | "top chef season 4 contestants" | Show pages |
| City guides | Aggregated data | "top chef restaurants chicago" | City pages |
| Award winners | `michelin_stars`, `awards` | "michelin star restaurants by tv chefs" | Filter + landing page |
| New openings | `year_opened` | "new top chef restaurants 2024" | Filter + landing page |

### New Cities Table

```sql
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT,
  country TEXT DEFAULT 'US',
  slug TEXT UNIQUE NOT NULL,
  restaurant_count INTEGER DEFAULT 0,
  chef_count INTEGER DEFAULT 0,
  hero_image_url TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. Ad Placement Strategy

### Placement Locations

| Location | Page Type | Position | Priority |
|----------|-----------|----------|----------|
| Chef sidebar | Chef page | After restaurants section | P0 |
| Restaurant sidebar | Restaurant page | After map/location | P0 |
| Directory in-grid | Directory pages | Every 8th card | P1 |
| City banner | City page | Top of page | P1 |
| Mobile sticky | All pages | Bottom sticky (mobile only) | P2 |

### Implementation Pattern

```tsx
// components/AdSlot.tsx
interface AdSlotProps {
  position: 'chef-sidebar' | 'restaurant-sidebar' | 'directory-grid' | 'city-banner' | 'mobile-sticky';
  className?: string;
}

export function AdSlot({ position, className }: AdSlotProps) {
  return (
    <div 
      className={cn("ad-slot", `ad-slot--${position}`, className)}
      data-ad-position={position}
      style={{ minHeight: AD_HEIGHTS[position] }} // Prevent CLS
    >
      {/* Ad network script loads here */}
    </div>
  );
}
```

### Core Web Vitals Considerations
- Define explicit dimensions for ad containers (prevent layout shift)
- Lazy load ads below the fold
- Use `loading="lazy"` on ad iframes
- Consider ad placeholder skeleton during load

---

## 7. Database Migration

```sql
-- Migration: add_seo_page_fields
-- Run after approving this spec

-- ============================================
-- CHEF ENRICHMENT FIELDS
-- ============================================
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS notable_awards TEXT[];
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS cookbook_titles TEXT[];
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS youtube_channel TEXT;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS current_role TEXT;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS mentor TEXT;

-- ============================================
-- RESTAURANT ENRICHMENT FIELDS
-- ============================================
-- Core (P0) - some may exist from Places enrichment
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_review_count INTEGER;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_photos JSONB DEFAULT '[]';

-- SEO & Discovery (P1)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS reservation_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS signature_dishes TEXT[];
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS michelin_stars INTEGER DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS year_opened INTEGER;

-- Nice to Have (P2)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hours JSONB;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS vibe_tags TEXT[];
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS dietary_options TEXT[];
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS awards TEXT[];
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS gift_card_url TEXT;

-- ============================================
-- CITIES TABLE (for landing pages)
-- ============================================
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT,
  country TEXT DEFAULT 'US',
  slug TEXT UNIQUE NOT NULL,
  restaurant_count INTEGER DEFAULT 0,
  chef_count INTEGER DEFAULT 0,
  hero_image_url TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chefs_photo ON chefs(photo_url) WHERE photo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chefs_instagram ON chefs(instagram_handle) WHERE instagram_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_google_rating ON restaurants(google_rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_restaurants_michelin ON restaurants(michelin_stars DESC) WHERE michelin_stars > 0;
CREATE INDEX IF NOT EXISTS idx_restaurants_year_opened ON restaurants(year_opened DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_restaurants_city_state ON restaurants(city, state);
CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);

-- ============================================
-- POPULATE CITIES FROM EXISTING DATA
-- ============================================
INSERT INTO cities (name, state, country, slug, restaurant_count, chef_count)
SELECT 
  city,
  state,
  country,
  LOWER(REGEXP_REPLACE(city || '-' || COALESCE(state, ''), '[^a-zA-Z0-9]+', '-', 'g')),
  COUNT(DISTINCT id) as restaurant_count,
  COUNT(DISTINCT chef_id) as chef_count
FROM restaurants
WHERE is_public = true
GROUP BY city, state, country
ON CONFLICT (slug) DO UPDATE SET
  restaurant_count = EXCLUDED.restaurant_count,
  chef_count = EXCLUDED.chef_count,
  updated_at = now();
```

---

## 8. Content Protection (Anti-AI Scraping)

### The Problem
AI crawlers (GPTBot, ClaudeBot, CCBot, etc.) scrape websites to train LLMs. Our curated chef/restaurant data has value - we want Google to index it, but not AI training bots to harvest it.

### Protection Layers

#### Layer 1: robots.txt (Baseline)
Polite bots respect this. Many don't.

```txt
# /public/robots.txt

# Allow search engines
User-agent: Googlebot
User-agent: Bingbot
User-agent: Slurp
Allow: /

# Block AI training crawlers
User-agent: GPTBot
User-agent: ChatGPT-User
User-agent: CCBot
User-agent: anthropic-ai
User-agent: ClaudeBot
User-agent: Claude-Web
User-agent: Google-Extended
User-agent: GoogleOther
User-agent: PerplexityBot
User-agent: Bytespider
User-agent: FacebookBot
User-agent: Meta-ExternalAgent
User-agent: Meta-ExternalFetcher
User-agent: cohere-ai
User-agent: cohere-training-data-crawler
User-agent: Diffbot
User-agent: Omgilibot
User-agent: YouBot
User-agent: AI2Bot
User-agent: Amazonbot
User-agent: ImagesiftBot
Disallow: /

# Sitemap for allowed crawlers
Sitemap: https://chefmap.com/sitemap.xml
```

#### Layer 2: Cloudflare (Recommended)
Free tier includes AI bot blocking.

**Setup**:
1. Add site to Cloudflare (free plan)
2. Point DNS to Cloudflare
3. Dashboard → Security → Bots → Enable "AI Scrapers and Crawlers"

**Benefits**:
- One-click toggle blocks known AI bots
- Auto-updated as new bots emerge
- Blocks bots that ignore robots.txt
- Rate limiting included
- 1M+ sites already using this

#### Layer 3: Vercel Edge Middleware (Optional)
Block datacenter IPs where AI bots typically run.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AI_BOT_PATTERNS = [
  /gptbot/i,
  /chatgpt/i,
  /ccbot/i,
  /anthropic/i,
  /claude/i,
  /perplexity/i,
  /bytespider/i,
  /cohere/i,
  /diffbot/i,
];

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Block known AI bot user agents
  if (AI_BOT_PATTERNS.some(pattern => pattern.test(userAgent))) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/chefs/:path*', '/restaurants/:path*'],
};
```

#### Layer 4: HTTP Headers (Signal Intent)
Won't stop scrapers, but establishes legal position.

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-Robots-Tag',
    value: 'noai, noimageai',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### Recommended Setup for ChefMap

| Layer | Implementation | Effort | Effectiveness |
|-------|---------------|--------|---------------|
| robots.txt | Add to `/public/robots.txt` | 5 min | Low (polite bots) |
| **Cloudflare** | Free plan + toggle | 15 min | **Good** |
| Vercel middleware | Optional hardening | 30 min | Medium |
| HTTP headers | Legal signal | 5 min | Minimal |

**Priority**: Cloudflare free tier is the best ROI. robots.txt as baseline.

### What We're NOT Protecting Against
- Determined scrapers using residential proxies
- Manual copying
- Scrapers that spoof user agents

**Reality check**: Our data is curated from public sources (Wikipedia, topchef.fyi, Google Places). The value is in our curation, UX, and freshness - not secrecy. Basic protection is sufficient.

### Implementation Checklist
- [ ] Create `/public/robots.txt` with AI bot blocks
- [ ] Set up Cloudflare free tier
- [ ] Enable "AI Scrapers and Crawlers" toggle
- [ ] Add `X-Robots-Tag: noai` header
- [ ] (Optional) Add Vercel middleware for user-agent blocking

---

## 9. Implementation Phases

Focus: Chefs, Restaurants, and Cities. Shows/seasons can come later.

---

### Phase 1: Schema & Core Enrichment (1 day)

**Goal**: Get database ready and run P0 enrichment.

#### 1.1 Database Migration
- [ ] Run migration for new chef fields (`instagram_handle`, `current_role`, `cookbook_titles`)
- [ ] Run migration for new restaurant fields (`signature_dishes`, `michelin_stars`, `year_opened`)
- [ ] Create `cities` table and populate from existing restaurant data

#### 1.2 Enrichment Pipeline Updates
- [ ] Add `signature_dishes` extraction to restaurant enricher (LLM from reviews/website)
- [ ] Add `michelin_stars` lookup to restaurant enricher (Wikipedia/LLM)
- [ ] Add `instagram_handle` extraction to chef enricher (LLM web search)

#### 1.3 Run Enrichment
- [ ] Complete remaining 172 chef photos (Wikipedia/TMDB)
- [ ] Complete remaining 175 chef bios (GPT-5-mini)
- [ ] Complete remaining 301 restaurant Google Places data
- [ ] Run new P1 enrichment fields on full dataset

**Estimated cost**: ~$35 (Google Places + LLM calls)

---

### Phase 2: Chef Pages (1-2 days)

**Goal**: `/chefs` directory + `/chefs/[slug]` individual pages live.

#### 2.1 Chef Directory (`/chefs/page.tsx`)
- [ ] Server component with all chefs from DB
- [ ] Grid layout with `ChefCard` component
- [ ] Filters: Show, James Beard status, Has restaurants
- [ ] Search: Name
- [ ] Pagination (or load more)
- [ ] SEO: Title, meta description, canonical

#### 2.2 Chef Detail Page (`/chefs/[slug]/page.tsx`)
- [ ] `generateStaticParams` for all chef slugs
- [ ] `generateMetadata` with dynamic title/description
- [ ] Hero section: Photo, name, badges (James Beard, show result)
- [ ] Bio section: `mini_bio` content
- [ ] TV Appearances: List from `chef_shows`
- [ ] Restaurants grid: All restaurants by this chef
- [ ] Schema.org JSON-LD (`Person` type)

#### 2.3 Shared Components
- [ ] `ChefCard` - reusable card for grids
- [ ] `ChefHero` - hero section for detail page
- [ ] `TVAppearanceBadge` - show/season/result display
- [ ] `SchemaOrg` - JSON-LD wrapper component

#### 2.4 Internal Linking
- [ ] Each restaurant card links to `/restaurants/[slug]`
- [ ] Breadcrumbs: Home > Chefs > Chef Name

---

### Phase 3: Restaurant Pages (1-2 days)

**Goal**: `/restaurants` directory + `/restaurants/[slug]` individual pages live.

#### 3.1 Restaurant Directory (`/restaurants/page.tsx`)
- [ ] Server component with all restaurants from DB
- [ ] Grid layout with `RestaurantCard` component
- [ ] Filters: City, Price tier, Cuisine, Michelin stars
- [ ] Search: Name, chef, city
- [ ] Sort: Rating, review count, newest
- [ ] Pagination
- [ ] SEO: Title, meta description, canonical

#### 3.2 Restaurant Detail Page (`/restaurants/[slug]/page.tsx`)
- [ ] `generateStaticParams` for all restaurant slugs
- [ ] `generateMetadata` with dynamic title/description
- [ ] Photo carousel (Google Places photos)
- [ ] Quick info: Rating, price, cuisine, status
- [ ] Location section: Address, embedded map, directions link
- [ ] Signature dishes section (if available)
- [ ] Chef card: Photo, name, show badge, link to chef page
- [ ] More from this chef: Other restaurants grid
- [ ] Schema.org JSON-LD (`Restaurant` type with rating)

#### 3.3 Shared Components
- [ ] `RestaurantCard` - reusable card for grids
- [ ] `PhotoCarousel` - Google Places photos display
- [ ] `MiniMap` - embedded Leaflet map for single location
- [ ] `RatingStars` - star display with review count
- [ ] `PriceTier` - $ display component
- [ ] `SignatureDishes` - dish list display

#### 3.4 Internal Linking
- [ ] Chef card links to `/chefs/[slug]`
- [ ] City name links to `/cities/[slug]`
- [ ] Breadcrumbs: Home > Restaurants > Restaurant Name

---

### Phase 4: City Pages (1 day)

**Goal**: `/cities/[slug]` landing pages for top cities.

#### 4.1 City Detail Page (`/cities/[slug]/page.tsx`)
- [ ] `generateStaticParams` for cities with 3+ restaurants
- [ ] `generateMetadata` with city-specific SEO
- [ ] Hero: City name, restaurant count, chef count
- [ ] Featured restaurants grid (top rated)
- [ ] All restaurants list with filters
- [ ] Featured chefs in this city
- [ ] Schema.org JSON-LD (`ItemList` of restaurants)

#### 4.2 SEO Optimization
- [ ] Title: `TV Chef Restaurants in {City}, {State} ({N} Locations) | ChefMap`
- [ ] Meta: Focus on local search intent
- [ ] Internal links from restaurant pages

---

### Phase 5: SEO Polish & Ads (1 day)

**Goal**: Production-ready with monetization.

#### 5.1 Technical SEO
- [ ] `sitemap.xml` via Next.js generateSitemap
- [ ] `robots.txt` with AI bot blocks + sitemap reference
- [ ] `X-Robots-Tag: noai` header in next.config.js
- [ ] Canonical URLs on all pages
- [ ] Open Graph meta tags for social sharing

#### 5.2 Content Protection
- [ ] Set up Cloudflare (free tier)
- [ ] Enable "AI Scrapers and Crawlers" toggle
- [ ] Test bot blocking

#### 5.3 Ad Infrastructure
- [ ] Create `AdSlot` component with CLS-safe placeholders
- [ ] Add ad slots to chef pages (after restaurants section)
- [ ] Add ad slots to restaurant pages (sidebar/after map)
- [ ] Add ad slots to directory pages (every 8th card)

#### 5.4 Internal Linking Polish
- [ ] "Related Chefs" section on chef pages (same show/city)
- [ ] "Other Restaurants in {City}" on restaurant pages
- [ ] Breadcrumbs component on all pages

---

### Phase 6: Testing & Launch

**Goal**: Validate everything works, submit to Google.

#### 6.1 Quality Assurance
- [ ] Lighthouse audit all page types (target 90+ performance)
- [ ] Mobile responsiveness check
- [ ] Test all internal links
- [ ] Validate Schema.org with Google Rich Results Test

#### 6.2 Launch
- [ ] Deploy to production
- [ ] Submit sitemap to Google Search Console
- [ ] Set up Google Analytics / Plausible
- [ ] Monitor Core Web Vitals

---

### Future Phases (Deferred)

#### Shows Pages (`/shows/[slug]`)
- Season breakdowns
- Winner spotlights
- Contestant lists per season

#### Enhanced Features
- Natural language search
- "Compare restaurants" feature
- User favorites/bookmarks
- Email newsletter signup

---

### Timeline Summary

| Phase | Focus | Duration | Depends On |
|-------|-------|----------|------------|
| 1 | Schema & Enrichment | 1 day | - |
| 2 | Chef Pages | 1-2 days | Phase 1 |
| 3 | Restaurant Pages | 1-2 days | Phase 1 |
| 4 | City Pages | 1 day | Phase 2, 3 |
| 5 | SEO & Ads | 1 day | Phase 2, 3, 4 |
| 6 | Testing & Launch | 0.5 day | Phase 5 |

**Total: 5-8 days**

Phases 2 and 3 can run in parallel once Phase 1 is complete.

---

## 10. Current Enrichment Status

### Chefs (180 total)

| Data Point | Completed | Remaining | Source |
|------------|-----------|-----------|--------|
| Basic info | 180 | 0 | topchef.fyi |
| Photos | 8 | 172 | Wikipedia/TMDB |
| Mini bios | 5 | 175 | GPT-5-mini |
| Social links | 0 | 180 | New - LLM web search |

### Restaurants (311 total)

| Data Point | Completed | Remaining | Source |
|------------|-----------|-----------|--------|
| Basic info | 311 | 0 | topchef.fyi |
| Google Place ID | 10 | 301 | Google Places API |
| Rating & reviews | 10 | 301 | Google Places API |
| Photos | 10 | 301 | Google Places API |
| Description | 0 | 311 | New - LLM |
| Reservation URL | 0 | 311 | New - LLM web search |

### Estimated Enrichment Costs

| Task | Quantity | Cost/Unit | Total |
|------|----------|-----------|-------|
| Google Places (remaining) | 301 | $0.075 | $22.58 |
| Chef photos (Wikipedia) | 172 | Free | $0 |
| Chef bios (GPT-5-mini) | 175 | $0.02 | $3.50 |
| Social links (GPT-5-mini) | 180 | $0.01 | $1.80 |
| Restaurant descriptions | 311 | $0.01 | $3.11 |
| Reservation URLs | 311 | $0.01 | $3.11 |
| **Total** | | | **~$34** |

---

## 10. Success Metrics

### SEO KPIs
- **Indexed pages**: All chef + restaurant pages in Google index within 2 weeks
- **Rich snippets**: 50%+ of restaurant pages showing star ratings in SERPs
- **Organic traffic**: Baseline → growth tracking after launch

### Technical KPIs
- **Lighthouse Performance**: 90+ on all page types
- **Core Web Vitals**: All green (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- **Time to First Byte**: < 200ms (static generation)

### Ad Revenue KPIs
- **Ad viewability**: 70%+ viewable impressions
- **Page RPM**: Track baseline, optimize placement over time
- **CLS from ads**: < 0.1 (no layout shift from ad loading)

---

## Appendix: Sample Generated Pages

### Chef Page Example: `/chefs/stephanie-izard`
- Photo from Wikipedia
- Bio: "Stephanie Izard is an American chef and restaurateur who won Season 4 of Top Chef, becoming the first female winner in the show's history. She is a James Beard Award winner and owns Girl & the Goat, Duck Duck Goat, and Little Goat in Chicago."
- 3 restaurant cards with Google ratings
- Related: Other S4 contestants, other Chicago chefs

### Restaurant Page Example: `/restaurants/girl-and-the-goat-chicago`
- 3 Google Places photos in carousel
- Rating: 4.6 (2,847 reviews)
- Price: $$$
- Cuisine: Contemporary American, Italian
- Chef card linking to Stephanie Izard
- Related: Duck Duck Goat, Little Goat (same chef), Alinea (same city)
