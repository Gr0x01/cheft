# Niche Directory Portfolio - Ideas Tracker

**Last Updated:** 2024-12-09  
**Model:** LLM-scraped, always-fresh directories targeting underserved niches with high-intent, low-frequency searches.

---

## The Playbook

### What Makes a Good Niche
1. Information exists but is scattered across outdated blogs, Reddit, Google Sheets
2. Data goes stale (businesses open/close, people move, status changes)
3. Clear search intent with spending attached (trip planning, special occasions, purchases)
4. Geographic/map component OR benefits from structured filtering
5. Enthusiast community who cares about accuracy
6. No dominant, well-maintained competitor
7. High-value ad verticals (travel, dining, gear, services)

### Revenue Targets
- **Display ads:** $500-1000/mo per site (Mediavine/Raptive at scale)
- **Affiliate:** Variable, best for product-based directories
- **SaaS/Listings:** $5-25/mo per listing (for directories where subjects benefit from presence)

### Tech Stack
- Monorepo with config-driven multi-tenancy
- Separate Supabase project per site
- Separate branding/themes (not obviously "one company")
- LLM pipeline for scraping + freshness maintenance

---

## Tier 1: Immediate Builds (Same Template as Chefs)

These use the exact same restaurant-map template. Config + data + deploy.

### ✅ TV Chef Restaurants (cheft.app)
- **Status:** Live, ranking page 1 in 5 days
- **Data size:** ~300 chefs
- **Competition:** Stale Google Sheets, abandoned sites
- **Revenue model:** Display ads
- **Est. revenue:** $500-800/mo at scale

### James Beard Award Winners/Nominees
- **What:** Restaurants run by James Beard winners/nominees, current status
- **Example search:** "James Beard restaurants Seattle", "James Beard winners near me"
- **Why underserved:** Official JB site has terrible UX, no map, doesn't track closures
- **Data size:** ~500-800 restaurants (annual awards + historical)
- **Competition:** Weak - official site sucks
- **Freshness cycle:** Annual awards + ongoing closures
- **Revenue model:** Display ads (affluent foodie audience = high CPM)
- **Est. revenue:** $600-800/mo
- **Time to MVP:** 1 week
- **Notes:** Same exact template as chefs. High-intent special occasion dining.

### Athlete-Owned Restaurants & Bars
- **What:** Restaurants owned by pro athletes (current and retired)
- **Example search:** "Michael Jordan restaurant Chicago", "NFL player restaurants Miami"
- **Why underserved:** Scattered ESPN articles from 2019, dead Yelp links
- **Data size:** ~200-300 restaurants
- **Competition:** Weak - no dedicated directory exists
- **Freshness cycle:** Quarterly (athletes constantly opening/closing ventures)
- **Revenue model:** Display ads
- **Est. revenue:** $500-600/mo
- **Time to MVP:** 1 week
- **Notes:** Direct parallel to chef site. Sports + food crossover audience.

### Diners, Drive-Ins and Dives Locations
- **What:** All 1,500+ DDD restaurants with "still open" tracking
- **Example search:** "Triple D near me", "DDD restaurants Austin"
- **Why underserved:** 15% have closed, most sites don't track accurately
- **Data size:** 1,500+ restaurants
- **Competition:** STRONG - flavortownusa.com (since 2008, 165K IG, mobile apps)
- **Freshness cycle:** Monthly (show still airing, restaurants closing)
- **Revenue model:** Display ads
- **Est. revenue:** $1,500-2,000/mo (if can capture ~50% of market)
- **Time to MVP:** 1-2 weeks
- **Market data:**
  - flavortownusa.com: 86,392 monthly traffic, 23,554 backlinks
  - Active developer, "labor of love" since 2008 - harder to outcompete
  - No affiliate angle (restaurants don't convert to purchases)
- **Notes:** Bigger market but entrenched competitor with passion. Lower priority than Shark Tank despite similar traffic - no affiliate upside and harder fight.

---

## Tier 2: High-Value, Slightly More Work

### 🔥 Shark Tank Products Directory
- **Deep Dive:** [shark-tank.md](./shark-tank.md)
- **What:** All Shark Tank products with availability, pricing, "still in business" status
- **Example search:** "where to buy Scrub Daddy", "Shark Tank products on Amazon"
- **Why underserved:** Existing sites (allsharktankproducts.com, sharktankshopper.com) are AdSense-riddled, slow, not tracking dead products
- **Data size:** 1,100+ products across 17 seasons
- **Competition:** Weak - allsharktankproducts.com has 71k traffic but garbage UX, seems abandoned
- **Freshness cycle:** Monthly (products go out of business, retail availability changes)
- **Revenue model:** **Affiliate links** (Amazon Associates + direct brand programs) + display ads
- **Est. revenue:** $2,500-3,500/mo (71k traffic × $18 CPM + affiliate)
- **Time to MVP:** 2 weeks (affiliate setup adds time)
- **Market data:**
  - allsharktankproducts.com: 71,756 monthly traffic, 40,920 backlinks
  - Traffic volatile (40k-100k range) - real market with seasonal spikes
  - Competitor appears abandoned, poor mobile, slow loads
- **High-value pages:**
  - "[Product] where to buy"
  - "[Product] still in business"
  - "Shark Tank products at Target"
  - "Lori Greiner products list"
  - "Best Shark Tank products under $50"

### Distillery Tasting Rooms & Tours
- **What:** Craft distilleries with tasting rooms, tour availability, by spirit type
- **Example search:** "whiskey distillery tours Kentucky", "craft distilleries near me"
- **Why underserved:** State tourism sites are bad, no filtering by spirit type
- **Data size:** 2,000+ US distilleries
- **Competition:** Weak - scattered, no good aggregator
- **Freshness cycle:** Quarterly (new distilleries, tour offerings change)
- **Revenue model:** Display ads (booze tourism = high spend audience)
- **Est. revenue:** $600-800/mo
- **Time to MVP:** 1-2 weeks

### Hot Springs (Natural/Primitive) With Access Info
- **What:** Natural hot springs with current access status, directions, conditions
- **Example search:** "hot springs near Boise", "natural hot springs California"
- **Why underserved:** Outdated blogs everywhere, many now closed/restricted/private
- **Data size:** ~500-1000 springs
- **Competition:** Weak - all outdated
- **Freshness cycle:** Seasonal (access changes, conditions vary)
- **Revenue model:** Display ads (outdoor/travel audience)
- **Est. revenue:** $600-800/mo
- **Time to MVP:** 1-2 weeks
- **Notes:** Notorious pain point. People get burned by outdated info constantly.

### Dark Sky Certified Locations + Nearby Lodging
- **What:** Dark sky parks/locations with lodging options, best viewing times
- **Example search:** "best stargazing near Denver", "dark sky parks Texas"
- **Why underserved:** Dark sky association site is just a list, no lodging integration
- **Data size:** ~200 certified locations + surrounding areas
- **Competition:** Weak
- **Freshness cycle:** Seasonal (weather, new certifications)
- **Revenue model:** Display ads + lodging affiliate
- **Est. revenue:** $600-800/mo
- **Time to MVP:** 1-2 weeks
- **Notes:** Affluent hobbyist audience, clear spending path (lodging, gear, photography equipment).

---

## Tier 3: SaaS Opportunity (Higher Effort, Higher Ceiling)

### 🔥 Tattoo Artists by Style Specialty
- **What:** Tattoo artists searchable by style (Japanese, fine line, traditional, blackwork, etc.)
- **Example search:** "Japanese tattoo artist Chicago", "fine line tattoo near me"
- **Why underserved:** Instagram discovery is terrible for search, Yelp has no style filtering
- **Data size:** 10,000+ artists potential
- **Competition:** Zero good directories
- **Freshness cycle:** Quarterly (artists move shops, styles evolve)

#### The Model (Permission-Based Scrape)
```
1. Scrape artist data + photos from IG
2. Build full profile page (unpublished)
3. DM artist: "Built this for you, can I publish?"
4. YES → publish | NO → delete photos, keep stub or remove entirely
```

#### Revenue Model (SaaS, Not Ads)
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Name, shop, city, style, link to IG |
| Synced | $5-10/mo | Auto-sync latest IG posts, fresh portfolio |
| Featured | $15-25/mo | Synced + priority placement, badge |

#### Why Artists Pay
- One booking = $200-2000+
- They already pay for IG ads, conventions ($500+), guest spots
- $60-120/year for SEO page that ranks for "[style] tattoo [city]" is a no-brainer

#### Revenue Projections
| Scenario | Artists | Paid % | ARPU | Monthly |
|----------|---------|--------|------|---------|
| Conservative | 2,000 | 5% | $7 | $700 |
| Moderate | 5,000 | 10% | $10 | $5,000 |
| Aggressive | 10,000 | 15% | $12 | $18,000 |

- **Time to MVP:** 3-4 weeks
- **Notes:** This is a real SaaS business, not just an ad site. Artists become marketers ("check out my page"). Build after ad sites are generating baseline revenue.

---

## Tier 4: Backlog (Good Ideas, Revisit Later)

### Record Stores (by genre specialty, buying policy)
- **Example search:** "record stores Austin", "vinyl shops that buy collections"
- **Revenue:** Display ads + potential affiliate (turntables, audio gear)
- **Notes:** Passionate collectors, no good directory. No photos needed.

### Classic/Specialty Car Mechanics by Make
- **Example search:** "Porsche specialist Denver", "classic car restoration near me"
- **Revenue:** Display ads (affluent audience, big transactions)
- **Notes:** Huge pain point, forum threads are all dated.

### Shooting Ranges by Type
- **Example search:** "long range shooting Texas", "outdoor rifle range near me"
- **Revenue:** Display ads (firearms/ammo/gear = high CPM)
- **Notes:** NRA range finder is terrible, Where2Shoot abandoned.

### Public Land / Dispersed Camping
- **Example search:** "free camping near Moab", "dispersed camping Colorado"
- **Revenue:** Display ads (camping gear)
- **Notes:** FreeCampsites.net is user-generated mess. Seasonal access/fire restrictions.

### U-Pick Farms by Crop/Season
- **Example search:** "strawberry picking near me", "apple orchards Oregon"
- **Revenue:** Display ads (family activities, seasonal)
- **Notes:** Very seasonal traffic but high intent when active.

### Culinary School Alumni Restaurants
- **Example search:** "CIA chef restaurants", "culinary institute restaurants"
- **Revenue:** Display ads
- **Notes:** Niche but passionate foodie audience.

---

## Rejected / Deprioritized

| Idea | Reason |
|------|--------|
| Tattoo (original model) | Can't scrape IG photos without permission - moved to SaaS model above |
| Vintage/thrift stores | Photo-dependent, can't differentiate without visuals |
| Christmas lights | Extremely seasonal (6 weeks/year) |
| Filming locations | Photo-dependent, access verification is hard |
| Celebrity brands with stores | Fragmented data, hard to maintain |

---

## Recommended Build Sequence

### Month 1-2
1. ✅ **Chefs** (live, 1,036 restaurants)
2. **James Beard** (same template, 1 week) - weak competitor, affluent audience
3. **Shark Tank** (affiliate model, 2 weeks) - $2.5-3.5k/mo potential, abandoned competitor
4. **Athletes** (same template, 1 week) - no competitor, sports crossover

### Month 3-4
5. **Distilleries** (new template for "tours", 2 weeks)
6. **Hot Springs** (outdoor template, 1-2 weeks) - notorious pain point
7. **Dark Sky** (lodging affiliate angle)

### Month 5-6
8. **DDD** (same template, fight for market share) - deprioritized due to strong competitor
9. **Tattoo Artists** (SaaS MVP, 3-4 weeks) - different business model, build after baseline revenue

### Rationale
- Shark Tank moved up: higher revenue ceiling ($2.5k+/mo vs $500-800), weak competitor, affiliate upside
- DDD moved down: passionate incumbent, no affiliate angle, same effort for harder fight
- Athletes before DDD: zero competition beats strong competition

---

## Site Launch Checklist

Per new site:
- [ ] Domain (whois privacy, unique registrar pattern)
- [ ] Supabase project
- [ ] Vercel project  
- [ ] Site config in monorepo (theme, schema, categories)
- [ ] GA4 property (separate, not unified)
- [ ] Privacy policy (site-specific, use generator)
- [ ] Cloudflare email forward → single inbox
- [ ] Affiliate tracking IDs (if applicable)
- [ ] Google Search Console
- [ ] Initial data scrape + QA

---

## Notes

- No LLC needed until revenue hits ~$5-10k/year total
- Keep sites visually distinct (different themes) so not obviously one "network"
- Don't link sites to each other (no "part of X network" footers)
- Mediavine requires 50k sessions/mo - use AdSense until then
