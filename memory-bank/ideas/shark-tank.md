# Shark Tank Products Directory - Research

**Last Updated:** 2025-12-09  
**Status:** Research / Planning  
**Overview:** [niche-directory.md](./niche-directory.md#-shark-tank-products-directory)

---

## Competitor Analysis: allsharktankproducts.com

**Domain Stats:**
- Monthly Traffic: 71,756
- Backlinks: 40,920
- Keywords Gap: 20,107 (opportunities they're missing)

### Top Ranking Keywords

| Keyword | Volume | Position | Est. Visits | CPC | SEO Difficulty |
|---------|--------|----------|-------------|-----|----------------|
| shark tank the show | 135,000 | 44 | 284 | $9.25 | 82 |
| shark tank | 135,000 | 12 | 2,660 | $9.25 | 90 |
| guardian bikes | 110,000 | 67 | 231 | $0.40 | 41 |
| guardians bicycle | 110,000 | 92 | 231 | $0.40 | 37 |
| foodie company | 74,000 | 66 | 155 | $3.60 | 28 |
| co alition | 49,500 | 21 | 163 | $11.58 | 50 |
| tank shark cast | 49,500 | 8 | 2,322 | $6.02 | 36 |
| casting for shark tank | 49,500 | 6 | 2,322 | $6.02 | 30 |
| shark tank cast | 49,500 | 8 | 3,262 | $6.02 | 33 |
| cast shark tank | 49,500 | 9 | 2,322 | $6.02 | 36 |

### Key Insights

1. **Head terms are hard** - "shark tank" (pos 12, difficulty 90) is tough, but they're ranking
2. **Product names are gold** - "guardian bikes" (110k volume, difficulty 41) - individual product pages rank well
3. **Cast pages drive traffic** - Multiple cast-related keywords bringing 2-3k visits each
4. **Low difficulty opportunities** - "foodie company" (difficulty 28), product-specific terms

### Page Types That Work
- Homepage (brand terms)
- Individual product pages (product name searches)
- Cast/Shark pages (celebrity association)
- "How to get on Shark Tank" (aspirational content)

### What They Do Well
- **Narrative product pages** - Full backstory, pitch details, post-show updates
- **Comprehensive coverage** - 17 seasons, 1,100+ products
- **Cast page rankings** - Position 6-12 for cast keywords (2-3k visits)
- **Evergreen content** - "How to get on Shark Tank" drives consistent traffic

### Where They're Weak (Our Opportunities)

1. **No "still in business" tracking** - THE killer feature. Users want to know if products are still available. Not surfaced prominently.

2. **No deal filtering** - Can't filter by: got a deal, no deal, which shark, deal size, equity %

3. **Cast pages are shallow** - Just photos and seasons. No portfolio stats, no "Lori's best investments", no success rates.

4. **No price/availability** - No current pricing, no "where to buy" aggregation (Amazon, Target, Costco, direct)

5. **No freshness signals** - "Last verified: [date]" would build trust. They show "updated" dates but not verification.

6. **Mobile UX is garbage** - Slow, cluttered, ad-heavy

7. **No affiliate optimization** - Links exist but not prominent. No price comparison, no "best deal" highlighting.

8. **No "failed products" angle** - "Shark Tank products that failed" is a real search. They don't lean into it.

9. **Slow on new episodes** - Episode airs Friday, they take days/weeks to update. First 24-48 hours is the land grab.

---

## Content Strategy

### High-Priority Pages
1. **Product pages** - Every product gets a page with:
   - Current availability (Amazon, website, retail)
   - "Still in business" status
   - Deal details (shark, amount, equity)
   - Price tracking
   
2. **Shark pages** - Each shark's portfolio:
   - All their deals
   - Success rate
   - Total invested
   - Best performers

3. **Category pages** - Browse by:
   - Product category (food, tech, pets, fitness)
   - Season
   - Deal status (deal made, no deal, out of business)
   - Shark
   - Price range

4. **"Where to buy" pages** - Retail aggregation:
   - "Shark Tank products at Amazon"
   - "Shark Tank products at Target"
   - "Shark Tank products at Costco"

### Long-tail Opportunities
- "[Product name] where to buy"
- "[Product name] still in business"
- "[Product name] net worth"
- "[Product name] after shark tank"
- "best shark tank products under $50"
- "shark tank products that failed"
- "most successful shark tank products"

---

## Affiliate Strategy

### Primary Programs
- **Amazon Associates** - Most products available, 1-4% commission
- **Direct brand programs** - Higher commission (5-15%) for active companies
- **ShareASale/CJ** - Some brands have dedicated programs

### High-Value Products
- Recurring consumables (food, supplements, pet products)
- High-ticket items (tech, fitness equipment)
- Gift-friendly products (seasonal spikes)

---

## Data Model (Draft)

```
products
  - id
  - name
  - slug
  - season
  - episode
  - air_date
  - description
  - category
  - asking_amount
  - asking_equity
  - deal_amount
  - deal_equity
  - sharks (array)
  - status (active, out_of_business, acquired, unknown)
  - website_url
  - amazon_url
  - retail_availability (json)
  - price_range
  - last_verified
  - photo_url

sharks
  - id
  - name
  - slug
  - bio
  - photo_url
  - seasons_active
  - total_deals
  - total_invested

product_updates (freshness tracking)
  - product_id
  - field_changed
  - old_value
  - new_value
  - updated_at
  - source
```

---

## Freshness Strategy

### What Goes Stale
- Business status (companies fail constantly)
- Website URLs (domains expire)
- Amazon availability (products get delisted)
- Retail availability (stores drop products)
- Pricing (inflation, sales)

### Verification Cadence
- **Weekly**: Top 100 products by traffic
- **Monthly**: All products with affiliate links
- **Quarterly**: Full database sweep
- **On-demand**: User reports, news triggers

---

## Open Questions

- [ ] Amazon Associates approval - need live site first?
- [ ] Scraping strategy for initial data (Wikipedia has episode lists)
- [ ] Photo sourcing - product photos from Amazon API? Brand websites?
- [ ] How to handle international versions (Shark Tank UK, Australia, etc.)?

---

## Site Architecture (Scaffolding)

### Core Pages
```
/                           Homepage (trending, recent episodes, quick filters)
/products                   All products (filterable grid)
/products/[slug]            Individual product page
/sharks                     All sharks overview
/sharks/[slug]              Shark portfolio page
/seasons                    Season archive
/seasons/[number]           Season page with all products
/episodes/[season]/[ep]     Individual episode page
/categories/[slug]          Category pages (food, tech, pets, etc.)
```

### High-Value Content Pages
```
/where-to-buy               Retail aggregation ("at Amazon", "at Target")
/still-in-business          Products confirmed active (freshness = trust)
/out-of-business            Failed products (morbid curiosity traffic)
/best-deals                 Curated lists by shark, category, price
/how-to-apply               Casting guide (steal their 2k visits)
/success-stories            Biggest wins (Scrub Daddy, Bombas, etc.)
/episodes/latest            Always-current "this week's products"
```

### Product Page Must-Haves
```
- Status badge: ✅ Active | ⚠️ Unknown | ❌ Out of Business
- Last verified date (builds trust)
- Deal details: Shark, amount, equity, valuation
- Current pricing (pulled from affiliate APIs)
- Where to buy: Amazon, official site, retail
- Product line expansion (if they've grown)
- Competitor products (internal links)
- "Similar products" from other episodes
```

### Shark Page Must-Haves
```
- Total deals made
- Total $ invested
- Success rate (% still in business)
- Best performers
- Categories they favor
- Deal size range
- Full portfolio list (filterable)
```

### Filters We Need (They Don't Have)
```
- Status: Active / Out of Business / Unknown
- Deal: Got Deal / No Deal
- Shark: Multi-select
- Season: Range slider or multi-select
- Category: Multi-select
- Price range: Of product
- Deal size: Investment amount
```

---

## Latest Episode Strategy (Speed Advantage)

### The Opportunity
- Episode airs **Friday night** → Search volume spikes for every product shown
- **First 24-48 hours** = land grab for "[product name]" rankings
- Competitor is slow - probably manual updates, days/weeks behind
- We can be fast - automated monitoring + quick publish workflow

### The Flywheel
1. Episode airs → We publish within hours
2. Capture the "[product name]" searches while they're hot
3. Those pages age into evergreen "[product name] shark tank" traffic
4. Rinse, repeat weekly during season

### Episode Page Structure
```
/episodes/latest            Always redirects to most recent
/episodes/s16e12            Permanent episode page

Each episode page shows:
- Air date
- All products featured (with deals/no deals)
- Quick status: "Where to buy NOW"
- Affiliate links ready day-of
- Updates as deals close/fall through
```

### Intel Sources
- **r/sharktank** - Live episode threads, real-time product identification
- **ABC press releases** - Sometimes announce products ahead
- **Social media** - Brands post when their episode airs
- **Wikipedia** - Updated quickly by fans

---

## Notes

- Season 16 currently airing (2024-2025) - good timing for fresh content
- Wikipedia has comprehensive episode/product lists - good seed data
- r/sharktank subreddit is active - potential for community engagement
- Show airs Fridays on ABC - key timing for new episode workflow
