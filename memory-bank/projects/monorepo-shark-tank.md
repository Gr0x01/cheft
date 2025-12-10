# Monorepo + Shark Tank Product Directory

**Last Updated:** 2025-12-10  
**Status:** Planning  
**Priority:** High (Next major project after show expansion stabilizes)  
**Related:** [niche-directory.md](../ideas/niche-directory.md), [shark-tank.md](../ideas/shark-tank.md)

---

## Executive Summary

Transform the current Chefs app into a monorepo architecture that supports multiple niche directory sites. First additional app: **Shark Tank Products Directory** - targeting 71k+ monthly searches with affiliate revenue potential of $2.5-3.5k/mo.

**Why now?**
- Chefs app stable and proven
- Shark Tank competitor (allsharktankproducts.com) appears abandoned, poor UX
- Affiliate angle provides higher revenue ceiling than pure display ads
- Same core patterns (entity pages, filtering, freshness tracking) transfer directly

---

## Part 1: Monorepo Architecture

### 1.1 Why Turborepo?

| Consideration | Decision |
|---------------|----------|
| Build system | **Turborepo** - native npm workspace support, incremental builds, Vercel integration |
| Package manager | **pnpm** - faster than npm, better workspace support, disk efficient |
| Alternatives considered | Nx (overkill for 2-3 apps), Lerna (deprecated patterns), plain workspaces (no caching) |

### 1.2 What's Shared vs App-Specific

| Layer | Shared? | Rationale |
|-------|---------|-----------|
| UI Components | **No** | Each site owns its visual identity. Avoids over-abstraction. |
| Database utilities | Yes | Supabase client patterns, type helpers |
| Analytics | Yes | PostHog integration is identical |
| SEO utilities | Yes | JsonLd, meta tags, sitemap generation |
| Enrichment pipeline | Yes | Tavily + LLM patterns reusable |
| Config (eslint, ts) | Yes | Consistency across apps |

### 1.3 Proposed Directory Structure

```
tv-directories/                     # Root monorepo
├── apps/
│   ├── chefs/                      # Migrated from current repo
│   │   ├── src/
│   │   │   ├── app/                # Next.js App Router pages
│   │   │   ├── components/         # Chefs-specific UI (NOT shared)
│   │   │   └── lib/                # App-specific utilities
│   │   ├── scripts/                # Chefs-specific scripts
│   │   ├── public/
│   │   ├── tailwind.config.ts      # App-specific theme
│   │   └── package.json
│   │
│   └── shark-tank/                 # New Shark Tank app
│       ├── src/
│       │   ├── app/                # Routes: /products, /sharks, /seasons
│       │   ├── components/         # Shark Tank UI (NOT shared)
│       │   └── lib/                # App-specific utilities
│       ├── scripts/                # Product enrichment scripts
│       ├── public/
│       ├── tailwind.config.ts      # App-specific theme
│       └── package.json
│
├── packages/
│   ├── database/                   # Supabase utilities
│   │   ├── src/
│   │   │   ├── client.ts           # createClient factory
│   │   │   ├── server.ts           # Server-side client
│   │   │   └── types.ts            # Shared type utilities
│   │   └── package.json
│   │
│   ├── analytics/                  # PostHog integration
│   │   ├── src/
│   │   │   ├── provider.tsx
│   │   │   ├── events.ts
│   │   │   └── config.ts
│   │   └── package.json
│   │
│   ├── seo/                        # SEO utilities
│   │   ├── src/
│   │   │   ├── JsonLd.tsx
│   │   │   ├── meta.ts
│   │   │   └── sitemap.ts
│   │   └── package.json
│   │
│   ├── enrichment/                 # LLM pipeline utilities
│   │   ├── src/
│   │   │   ├── tavily.ts           # Search client
│   │   │   ├── llm.ts              # LLM synthesis patterns
│   │   │   └── cache.ts            # Search cache utilities
│   │   └── package.json
│   │
│   └── config/                     # Shared configs
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/               # Base config (apps extend)
│
├── turbo.json                      # Turborepo configuration
├── pnpm-workspace.yaml             # Workspace definition
├── package.json                    # Root package.json
└── README.md
```

### 1.4 Package Dependencies

```
@tv-directories/database
  └── dependencies: @supabase/supabase-js, @supabase/ssr

@tv-directories/analytics
  └── dependencies: posthog-js

@tv-directories/seo
  └── dependencies: (none - pure utilities)

@tv-directories/enrichment
  └── dependencies: openai, zod

@tv-directories/config
  └── dependencies: eslint, typescript, tailwindcss
```

### 1.4 Root Configuration Files

**turbo.json**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "lint": {},
    "type-check": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**pnpm-workspace.yaml**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

## Part 2: Shark Tank Data Model

### 2.1 Core Tables

```sql
-- =====================================================
-- PRODUCTS (equivalent to restaurants in Chefs)
-- =====================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  
  -- Episode info
  season INTEGER NOT NULL,
  episode INTEGER NOT NULL,
  air_date DATE,
  
  -- Category
  category_id UUID REFERENCES categories(id),
  
  -- Deal details
  asking_amount INTEGER,          -- in dollars
  asking_equity DECIMAL(5,2),     -- percentage
  deal_amount INTEGER,            -- null if no deal
  deal_equity DECIMAL(5,2),       -- null if no deal
  deal_valuation INTEGER,         -- calculated: deal_amount / (deal_equity/100)
  got_deal BOOLEAN DEFAULT false,
  
  -- Current status
  status TEXT DEFAULT 'unknown' CHECK (status IN ('active', 'out_of_business', 'acquired', 'unknown')),
  
  -- Links
  website_url TEXT,
  amazon_url TEXT,
  amazon_asin TEXT,               -- for API price tracking
  
  -- Retail availability
  retail_availability JSONB DEFAULT '{}',  -- {"amazon": true, "target": false, "costco": true, "walmart": false}
  
  -- Pricing
  price_min INTEGER,              -- lowest known price in cents
  price_max INTEGER,              -- highest known price in cents
  current_price INTEGER,          -- current price in cents
  
  -- Media
  photo_url TEXT,
  video_url TEXT,                 -- pitch clip if available
  
  -- Freshness
  last_verified TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- SHARKS (equivalent to chefs)
-- =====================================================
CREATE TABLE sharks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  photo_url TEXT,
  
  -- Shark info
  seasons_active INTEGER[],       -- [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
  net_worth TEXT,                 -- "$400 million"
  company TEXT,                   -- "FUBU", "QVC", etc.
  specialty TEXT,                 -- "fashion", "licensing", "tech"
  
  -- Calculated stats (denormalized for performance)
  total_deals INTEGER DEFAULT 0,
  total_invested INTEGER DEFAULT 0,  -- in dollars
  success_rate DECIMAL(5,2),         -- % of deals still active
  avg_equity DECIMAL(5,2),           -- average equity taken
  
  -- Social/contact
  twitter_url TEXT,
  instagram_url TEXT,
  website_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PRODUCT_SHARKS (junction table for deals)
-- =====================================================
CREATE TABLE product_sharks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shark_id UUID NOT NULL REFERENCES sharks(id) ON DELETE CASCADE,
  
  -- Deal terms (can differ per shark in multi-shark deals)
  equity_percentage DECIMAL(5,2),
  investment_amount INTEGER,
  
  -- Special terms
  royalty_deal BOOLEAN DEFAULT false,
  royalty_percentage DECIMAL(5,2),
  notes TEXT,                     -- "contingent on meeting sales goals"
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(product_id, shark_id)
);

-- =====================================================
-- CATEGORIES
-- =====================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,                      -- lucide icon name
  parent_id UUID REFERENCES categories(id),  -- for subcategories
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Initial categories
INSERT INTO categories (name, slug, icon) VALUES
  ('Food & Beverage', 'food-beverage', 'utensils'),
  ('Health & Fitness', 'health-fitness', 'heart-pulse'),
  ('Technology', 'technology', 'cpu'),
  ('Fashion & Apparel', 'fashion-apparel', 'shirt'),
  ('Pet Products', 'pet-products', 'dog'),
  ('Home & Garden', 'home-garden', 'home'),
  ('Children & Baby', 'children-baby', 'baby'),
  ('Beauty & Personal Care', 'beauty-personal-care', 'sparkles'),
  ('Automotive', 'automotive', 'car'),
  ('Sports & Outdoors', 'sports-outdoors', 'tent'),
  ('Business Services', 'business-services', 'briefcase'),
  ('Entertainment', 'entertainment', 'gamepad-2'),
  ('Cleaning & Organization', 'cleaning-organization', 'spray-can'),
  ('Accessories', 'accessories', 'watch');

-- =====================================================
-- EPISODES (for tracking and navigation)
-- =====================================================
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  air_date DATE,
  title TEXT,
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(season, episode_number)
);

-- =====================================================
-- PRODUCT_UPDATES (freshness audit trail)
-- =====================================================
CREATE TABLE product_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  field_changed TEXT NOT NULL,    -- 'status', 'website_url', 'amazon_url', etc.
  old_value TEXT,
  new_value TEXT,
  source TEXT,                    -- 'manual', 'scrape', 'user_report', 'api'
  
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_season ON products(season);
CREATE INDEX idx_products_got_deal ON products(got_deal);
CREATE INDEX idx_sharks_slug ON sharks(slug);
CREATE INDEX idx_product_sharks_product ON product_sharks(product_id);
CREATE INDEX idx_product_sharks_shark ON product_sharks(shark_id);
CREATE INDEX idx_episodes_season ON episodes(season);

-- =====================================================
-- VIEWS
-- =====================================================

-- Products with shark names (common query)
CREATE VIEW products_with_sharks AS
SELECT 
  p.*,
  c.name as category_name,
  c.slug as category_slug,
  array_agg(s.name) as shark_names,
  array_agg(s.slug) as shark_slugs
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN product_sharks ps ON p.id = ps.product_id
LEFT JOIN sharks s ON ps.shark_id = s.id
GROUP BY p.id, c.name, c.slug;

-- Shark portfolio stats
CREATE VIEW shark_stats AS
SELECT 
  s.*,
  COUNT(DISTINCT ps.product_id) as deal_count,
  SUM(ps.investment_amount) as total_invested,
  COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_products,
  COUNT(DISTINCT CASE WHEN p.status = 'out_of_business' THEN p.id END) as failed_products
FROM sharks s
LEFT JOIN product_sharks ps ON s.id = ps.shark_id
LEFT JOIN products p ON ps.product_id = p.id
GROUP BY s.id;
```

### 2.2 RLS Policies (Public Read, Admin Write)

```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharks ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sharks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_updates ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read sharks" ON sharks FOR SELECT USING (true);
CREATE POLICY "Public read product_sharks" ON product_sharks FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read episodes" ON episodes FOR SELECT USING (true);

-- Admin write access (via service role key)
CREATE POLICY "Admin write products" ON products FOR ALL 
  USING (auth.role() = 'service_role');
CREATE POLICY "Admin write sharks" ON sharks FOR ALL 
  USING (auth.role() = 'service_role');
-- ... etc
```

---

## Part 3: Shark Tank Site Architecture

### 3.1 Route Structure

```
/                                   Homepage (trending, latest episode, filters)
├── /products                       All products (filterable grid)
│   └── /products/[slug]            Individual product page
├── /sharks                         All sharks overview
│   └── /sharks/[slug]              Shark portfolio page
├── /seasons                        Season archive
│   └── /seasons/[number]           Season page
├── /episodes                       Episode list
│   ├── /episodes/latest            Redirect to most recent
│   └── /episodes/s[season]e[ep]    Individual episode
├── /categories                     Category list
│   └── /categories/[slug]          Category page
├── /where-to-buy                   Retail aggregation
│   ├── /where-to-buy/amazon
│   ├── /where-to-buy/target
│   └── /where-to-buy/costco
├── /still-in-business              Active products (trust signal)
├── /out-of-business                Failed products (morbid curiosity)
├── /success-stories                Biggest wins (Scrub Daddy, Bombas)
├── /about
└── /privacy
```

### 3.2 Page Components

**Homepage**
- Hero with search
- Latest episode products (if in season)
- Trending products (by traffic)
- Featured sharks
- Category quick links
- Stats bar (total products, active %, total deals made)

**Product Listing (`/products`)**
- Filter panel (sidebar on desktop, sheet on mobile):
  - Status: Active / Out of Business / Unknown
  - Deal: Got Deal / No Deal
  - Shark: Multi-select
  - Season: Range or multi-select
  - Category: Multi-select
  - Price range
- Sort: Recent, A-Z, Season, Deal size
- Grid of ProductCards

**Product Detail (`/products/[slug]`)**
```
┌─────────────────────────────────────────────────────────┐
│ [Status Badge] PRODUCT NAME                             │
│ Season X, Episode Y • Aired Month DD, YYYY              │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐  Description text goes here...          │
│ │             │                                         │
│ │   PHOTO     │  THE DEAL                               │
│ │             │  ✅ Got a deal from [Shark Names]       │
│ └─────────────┘  $XXX,XXX for XX% equity                │
│                  Valuation: $X.XM                       │
│                                                         │
│  WHERE TO BUY                                           │
│  ┌────────┐ ┌────────┐ ┌────────┐                      │
│  │ Amazon │ │Official│ │ Target │  ← affiliate links   │
│  │ $XX.XX │ │  Site  │ │ $XX.XX │                      │
│  └────────┘ └────────┘ └────────┘                      │
│                                                         │
│  Last verified: December 10, 2025                       │
├─────────────────────────────────────────────────────────┤
│  ABOUT [SHARK NAME]                                     │
│  [Brief bio, link to portfolio page]                    │
├─────────────────────────────────────────────────────────┤
│  SIMILAR PRODUCTS                                       │
│  [Grid of related products in same category]            │
└─────────────────────────────────────────────────────────┘
```

**Shark Portfolio (`/sharks/[slug]`)**
```
┌─────────────────────────────────────────────────────────┐
│ [PHOTO]  SHARK NAME                                     │
│          Company: XXXX                                  │
│          Net Worth: $XXX million                        │
├─────────────────────────────────────────────────────────┤
│  STATS                                                  │
│  Total Deals: XX  |  Total Invested: $X.XM             │
│  Success Rate: XX%  |  Avg Equity: XX%                 │
│                                                         │
│  Categories They Favor                                  │
│  [Tag] [Tag] [Tag]                                      │
├─────────────────────────────────────────────────────────┤
│  FILTER: [All] [Active] [Out of Business]              │
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │Product 1│ │Product 2│ │Product 3│ │Product 4│      │
│  │ $XXk    │ │ $XXk    │ │ $XXk    │ │ $XXk    │      │
│  │ XX%     │ │ XX%     │ │ XX%     │ │ XX%     │      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 3.3 SEO Strategy

#### Keyword Targeting by Page Type

| Page Type | Primary Keywords | Volume | Difficulty |
|-----------|------------------|--------|------------|
| Product | "[product name]", "[product] shark tank" | 1k-110k | Low-Med (28-41) |
| Product | "[product] where to buy", "[product] still in business" | 100-1k | Low |
| Shark | "[shark name] investments", "[shark] net worth" | 10k-50k | Med (33-36) |
| Shark | "[shark name] shark tank deals" | 1k-5k | Low |
| Category | "shark tank [category] products" | 500-2k | Low |
| Aggregate | "shark tank products that failed" | 5k+ | Med |
| Aggregate | "best shark tank products", "most successful" | 2k-5k | Med |
| Where-to-buy | "shark tank products at amazon/target/costco" | 1k-3k | Low |
| Episode | "shark tank season [X] episode [Y]" | 500-2k | Low |

#### Page-by-Page SEO Templates

**Product Page (`/products/[slug]`)**
```
Title: {Product Name} - Where to Buy, Price & Shark Tank Update ({Year})
Description: Is {Product Name} still in business? {Status}. {Shark} invested ${Amount} for {Equity}%. Buy at Amazon for ${Price}. Last verified {Date}.

H1: {Product Name}
H2: The Deal | Where to Buy | About {Product} | Similar Products
```

**Shark Page (`/sharks/[slug]`)**
```
Title: {Shark Name} Shark Tank Investments - Full Portfolio & Stats
Description: {Shark Name} has made {X} deals totaling ${Y}M on Shark Tank. {Z}% success rate. See all investments, best performers, and deal history.

H1: {Shark Name} - Shark Tank Portfolio
H2: Investment Stats | Best Performers | All Deals | Categories
```

**Category Page (`/categories/[slug]`)**
```
Title: Shark Tank {Category} Products - {Count} Companies, {Active}% Still Active
Description: Browse {Count} {Category} products from Shark Tank. Filter by status, shark, deal size. Find what's still in business and where to buy.

H1: Shark Tank {Category} Products
H2: Active Products | Out of Business | Filter by Shark
```

**Season Page (`/seasons/[number]`)**
```
Title: Shark Tank Season {X} Products - All {Count} Companies & Updates
Description: Complete list of Season {X} Shark Tank products. {Deals} got deals, {Active} still in business. Episode guide with where to buy links.

H1: Shark Tank Season {X}
H2: Episodes | Products That Got Deals | No Deal | Status Updates
```

**Where-to-Buy Page (`/where-to-buy/amazon`)**
```
Title: Shark Tank Products on Amazon - {Count} Items Available Now
Description: Shop {Count} Shark Tank products available on Amazon. Verified in-stock items with current prices. Updated {Date}.

H1: Shark Tank Products on Amazon
H2: Best Sellers | Under $25 | By Category | Recently Added
```

**Still-in-Business Page (`/still-in-business`)**
```
Title: Shark Tank Products Still in Business ({Year}) - {Count} Active Companies
Description: Verified list of {Count} Shark Tank companies still operating in {Year}. Last updated {Date}. Filter by shark, category, and season.

H1: Shark Tank Products Still in Business
H2: Recently Verified | By Shark | By Category | Closed This Year
```

**Failed Products Page (`/out-of-business`)**
```
Title: Shark Tank Products That Failed - {Count} Companies No Longer Operating
Description: {Count} Shark Tank products that went out of business. See what happened, when they closed, and lessons learned.

H1: Shark Tank Products That Failed
H2: Recent Closures | By Season | By Category | What Went Wrong
```

#### Schema.org Markup

**Product Page**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{Product Name}",
  "description": "{Description}",
  "image": "{Photo URL}",
  "brand": {
    "@type": "Brand",
    "name": "{Product Name}"
  },
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": "{Price Min}",
    "highPrice": "{Price Max}",
    "priceCurrency": "USD",
    "availability": "{In Stock | Out of Stock}",
    "offerCount": "{Retailer Count}"
  },
  "review": {
    "@type": "Review",
    "author": {
      "@type": "Organization", 
      "name": "{Site Name}"
    },
    "datePublished": "{Last Verified}",
    "reviewBody": "{Status} as of {Date}"
  },
  "isRelatedTo": {
    "@type": "TVEpisode",
    "name": "Season {X} Episode {Y}",
    "partOfSeries": {
      "@type": "TVSeries",
      "name": "Shark Tank"
    }
  }
}
```

**Shark Page**
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "{Shark Name}",
  "description": "{Bio}",
  "image": "{Photo URL}",
  "jobTitle": "Investor",
  "worksFor": {
    "@type": "Organization",
    "name": "{Company}"
  },
  "sameAs": ["{Twitter}", "{Instagram}", "{Website}"],
  "knowsAbout": ["{Specialty 1}", "{Specialty 2}"]
}
```

**Episode Page**
```json
{
  "@context": "https://schema.org",
  "@type": "TVEpisode",
  "name": "Season {X} Episode {Y}",
  "episodeNumber": "{Y}",
  "partOfSeason": {
    "@type": "TVSeason",
    "seasonNumber": "{X}",
    "partOfSeries": {
      "@type": "TVSeries",
      "name": "Shark Tank",
      "network": "ABC"
    }
  },
  "datePublished": "{Air Date}",
  "description": "{Episode Description}"
}
```

#### Internal Linking Strategy

| From | To | Anchor Pattern |
|------|-----|----------------|
| Product | Shark(s) | "{Shark Name}'s portfolio" |
| Product | Category | "More {Category} products" |
| Product | Season | "Season {X} products" |
| Product | Similar | "Similar to {Product}" |
| Shark | Products | "{Product Name}" |
| Shark | Categories | "{Category} investments" |
| Category | Products | Individual product links |
| Season | Episodes | "Episode {Y}" |
| Episode | Products | "{Product Name}" |
| Where-to-buy | Products | "{Product} - ${Price}" |
| Homepage | High-traffic pages | Featured sections |

#### Freshness Signals (Trust Builders)

Every page should display:
- **Last verified date** - "Information verified {Date}"
- **Update count** - "Updated {X} times since air date"
- **Status badge** - Visual indicator (green/yellow/red)
- **Change log** (product pages) - "Status changed from Active to Closed on {Date}"

#### Competitive Advantages Over allsharktankproducts.com

| Feature | Them | Us |
|---------|------|-----|
| Status tracking | Hidden/inconsistent | Prominent badges |
| Last verified | Not shown | On every page |
| Shark portfolios | Basic lists | Stats, success rates, filters |
| Where to buy | Single links | Price comparison, multi-retailer |
| Failed products | Not highlighted | Dedicated section |
| Mobile UX | Slow, cluttered | Fast, clean |
| New episodes | Days/weeks late | Same-day coverage |
| Filtering | None | Status, shark, category, price, deal |

---

## Part 4: Monetization (Future)

> **Deferred until site has traffic.** Focus on content and SEO first.

When ready:
- **Affiliate**: Amazon Associates, direct brand programs
- **Display ads**: Mediavine/Raptive (requires 50k sessions/mo)
- **Price tracking**: Amazon Product Advertising API for live prices

---

## Part 5: Data Sourcing

### 5.1 Initial Data Sources

| Source | Data | Quality |
|--------|------|---------|
| Wikipedia | Episode lists, product names, deal details | High |
| Official ABC site | Episode descriptions, air dates | Medium |
| allsharktankproducts.com | Product details, updates | Medium (verify) |
| Product websites | Current status, pricing | High |
| Amazon | Availability, pricing, reviews | High |

### 5.2 Scraping Strategy

**Phase 1: Wikipedia Seed**
```
Source: https://en.wikipedia.org/wiki/List_of_Shark_Tank_episodes
Data: Season, episode, air date, product names, sharks involved, deal details
```

**Phase 2: Enrichment**
- For each product, search for official website
- Check Amazon for ASIN
- Verify current status (active/closed)
- Pull product photos

**Phase 3: Ongoing Freshness**
- Weekly: Check top 100 products by traffic
- Monthly: Full database sweep for status changes
- Real-time: New episode data within 24-48 hours of airing

### 5.3 Enrichment Script Pattern

```typescript
// scripts/enrich-product.ts
async function enrichProduct(productName: string, season: number, episode: number) {
  // 1. Search for official website
  const websiteResults = await tavily.search(`${productName} official website`);
  
  // 2. Search Amazon
  const amazonResults = await tavily.search(`${productName} amazon`);
  
  // 3. Check if still in business
  const statusResults = await tavily.search(`${productName} still in business ${currentYear}`);
  
  // 4. LLM synthesis
  const enriched = await synthesize({
    productName,
    websiteResults,
    amazonResults,
    statusResults
  });
  
  return enriched;
}
```

---

## Part 6: Migration Plan

### Phase 1: Monorepo Foundation
- [ ] Initialize Turborepo at `~/tv-directories`
- [ ] Setup pnpm workspaces
- [ ] Create `packages/ui` with shared components from Chefs
- [ ] Create `packages/database` with Supabase utilities
- [ ] Create `packages/analytics` with PostHog
- [ ] Create `packages/seo` with JsonLd utilities
- [ ] Create `packages/config` with shared configs

### Phase 2: Migrate Chefs
- [ ] Move Chefs repo to `apps/chefs`
- [ ] Update imports to use `@tv-directories/*` packages
- [ ] Test thoroughly (all pages, admin, enrichment)
- [ ] Verify Vercel deployment still works

### Phase 3: Shark Tank Foundation
- [ ] Create new Supabase project for Shark Tank
- [ ] Run database migrations (schema above)
- [ ] Scaffold `apps/shark-tank` with Next.js
- [ ] Setup environment variables

### Phase 4: Shark Tank MVP
- [ ] Build core pages (home, products, sharks)
- [ ] Implement filtering
- [ ] Add product detail pages
- [ ] Add shark portfolio pages

### Phase 5: Data & Launch
- [ ] Scrape Wikipedia for initial data
- [ ] Enrich top 100 products
- [ ] Setup Amazon Associates (if approved)
- [ ] Deploy to Vercel
- [ ] Submit to Google Search Console

### Rollback Plan

If migration causes issues:
1. Chefs app has its own git history (can revert)
2. Keep current Chefs deployment active during migration
3. Only switch DNS after new deployment verified

---

## Part 7: Open Questions & Decisions

### Deployment Strategy
**Options:**
1. **Separate Vercel projects** - Each app gets own project
   - Pros: Independent deployments, separate analytics
   - Cons: More projects to manage
2. **Single Vercel project with path routing**
   - Pros: Single deployment
   - Cons: Blast radius for bugs, coupled releases

**Decision:** Separate Vercel projects (independence > convenience)

### Domain Strategy
**Options:**
- sharktankproducts.com (descriptive, may have trademark issues)
- tankedproducts.com (playful, no trademark)
- sharktankfinder.com (action-oriented)
- afterthetak.com (post-show focus)

**Decision:** TBD - need to check availability and trademark implications

### Data Licensing
- Wikipedia data is CC BY-SA (attribution required)
- Product photos: need to source from Amazon API or brand sites
- Shark photos: headshots are widely available, fair use for editorial

---

## Part 8: Success Metrics

### Launch Criteria (MVP)
- [ ] 200+ products with complete data
- [ ] All 6 main sharks with portfolios
- [ ] Product search and filtering working
- [ ] Mobile responsive
- [ ] Lighthouse score > 90
- [ ] Basic affiliate links (Amazon at minimum)

### 30-Day Goals
- [ ] 1,000+ organic sessions
- [ ] 50+ pages indexed
- [ ] Top 20 ranking for 5+ product names
- [ ] First affiliate commission

### 90-Day Goals
- [ ] 10,000+ organic sessions
- [ ] All 1,100+ products in database
- [ ] $500+/mo affiliate revenue
- [ ] Featured snippet for 3+ queries

---

## Appendix: Shark Reference Data

### Main Sharks (Seasons 1-16)
| Name | Seasons | Focus Areas | Net Worth |
|------|---------|-------------|-----------|
| Mark Cuban | 2-present | Tech, sports | $5.1B |
| Barbara Corcoran | 1-present | Real estate, consumer | $100M |
| Lori Greiner | 3-present | Consumer products, QVC | $150M |
| Robert Herjavec | 1-present | Tech, security | $200M |
| Daymond John | 1-present | Fashion, lifestyle | $350M |
| Kevin O'Leary | 1-present | Licensing, royalties | $400M |

### Guest Sharks (Frequent)
- Rohan Oza
- Daniel Lubetzky
- Sara Blakely
- Bethenny Frankel
- Ashton Kutcher
- Alex Rodriguez
- Kendra Scott
- Emma Grede
- Tony Xu
- Nirav Tolia

---

## Next Actions

1. Research domain availability
2. Start Turborepo setup in separate branch
3. Begin extracting shared packages
4. Scaffold Shark Tank app
5. Initial data scrape and MVP pages
