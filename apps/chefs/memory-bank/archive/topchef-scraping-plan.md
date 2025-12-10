---
Last-Updated: 2025-11-30
Maintainer: RB
Status: Active Planning
---

# Top Chef Data Scraping Plan

## Data Source: topchef.fyi

The site https://topchef.fyi/top-chef-map/ contains comprehensive Top Chef restaurant data with approximately 100-150 entries.

## Available Data Fields

Each restaurant entry contains:
- **Restaurant name**
- **Chef name(s)** 
- **Top Chef season(s)**
- **Location details**: Country, State, City, Full address
- **Coordinates**: Latitude/Longitude (already geocoded!)
- **Website URL**
- **Google Maps directions link**
- **James Beard Award status** (for some chefs)

## Scraping Strategy

### Option 1: Direct JavaScript Data Extraction

The data is loaded client-side in a `tcm_map_data` object. We can:

```javascript
// Browser console approach to extract data
const data = tcm_map_data.locations;
console.log(JSON.stringify(data, null, 2));
// Copy the output
```

### Option 2: API Endpoint Access

The site uses an AJAX endpoint:
```
POST https://topchef.fyi/wp-admin/admin-ajax.php
```

We might be able to call this directly to get the data.

### Option 3: Puppeteer/Playwright Scraping

```typescript
import { chromium } from 'playwright';

async function scrapeTopChefMap() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://topchef.fyi/top-chef-map/');
  
  // Wait for map data to load
  await page.waitForFunction(() => window.tcm_map_data);
  
  // Extract the data
  const restaurants = await page.evaluate(() => {
    return window.tcm_map_data.locations;
  });
  
  await browser.close();
  return restaurants;
}
```

## Data Transformation Pipeline

### Step 1: Extract Raw Data

```typescript
interface RawTopChefData {
  restaurant: string;
  chef: string;
  seasons: string[];
  country: string;
  state?: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  website?: string;
  jamesBeard?: boolean;
}
```

### Step 2: Transform to Our Schema

```typescript
async function transformToOurSchema(raw: RawTopChefData[]) {
  const shows = await ensureShowExists('Top Chef');
  const transformedData = {
    chefs: new Map(),
    restaurants: []
  };

  for (const item of raw) {
    // Create or update chef
    const chefSlug = generateSlug(item.chef);
    
    if (!transformedData.chefs.has(chefSlug)) {
      transformedData.chefs.set(chefSlug, {
        name: item.chef,
        slug: chefSlug,
        primary_show_id: shows.id,
        top_chef_seasons: [],
        restaurants: []
      });
    }
    
    const chef = transformedData.chefs.get(chefSlug);
    
    // Add seasons
    item.seasons.forEach(season => {
      if (!chef.top_chef_seasons.includes(season)) {
        chef.top_chef_seasons.push(season);
      }
    });
    
    // Create restaurant
    const restaurant = {
      name: item.restaurant,
      slug: generateSlug(item.restaurant),
      chef_slug: chefSlug,
      city: item.city,
      state: item.state,
      country: item.country || 'US',
      lat: item.lat,
      lng: item.lng,
      address: item.address,
      website_url: item.website,
      maps_url: `https://maps.google.com/?q=${item.lat},${item.lng}`,
      status: 'unknown', // Will enrich later
      price_tier: null, // Will enrich later
      cuisine_tags: [], // Will enrich later
      source_notes: 'Scraped from topchef.fyi',
      is_public: true
    };
    
    transformedData.restaurants.push(restaurant);
    chef.restaurants.push(restaurant.slug);
  }
  
  return transformedData;
}
```

### Step 3: Enrich with Additional Data

After initial import, use LLM to enrich:

```typescript
async function enrichRestaurantData(restaurant: Restaurant) {
  // Use restaurant name + chef name + location to search for:
  // 1. Current operating status
  // 2. Price tier
  // 3. Cuisine type
  // 4. Chef achievements/results
  
  const searchQuery = `${restaurant.name} ${restaurant.city} chef restaurant`;
  
  // Search for recent information
  const webData = await searchWeb(searchQuery);
  
  // Use LLM to extract structured data
  const enriched = await llm.extract({
    prompt: `
      Restaurant: ${restaurant.name}
      Location: ${restaurant.city}, ${restaurant.state}
      Chef: ${restaurant.chef.name}
      
      From this web data, extract:
      - Current status (open/closed)
      - Price tier ($-$$$$)
      - Cuisine type
      - Any recent news about the restaurant
    `,
    data: webData
  });
  
  return {
    ...restaurant,
    status: enriched.status || 'unknown',
    price_tier: enriched.price_tier || '$$',
    cuisine_tags: enriched.cuisine_tags || ['American']
  };
}
```

## Implementation Steps

### Immediate Actions

1. **Manual Browser Extraction** (Fastest for MVP)
   - Open https://topchef.fyi/top-chef-map/ in browser
   - Open console and extract `tcm_map_data.locations`
   - Save as JSON file
   - Parse and import to Supabase

2. **Create Import Script**
```typescript
// scripts/import-topchef-data.ts
import { supabase } from '@/lib/supabase';
import topChefData from './data/topchef-raw.json';

async function importData() {
  const transformed = await transformToOurSchema(topChefData);
  
  // Insert shows
  const { data: show } = await supabase
    .from('shows')
    .upsert({ name: 'Top Chef', network: 'Bravo' })
    .select()
    .single();
  
  // Insert chefs
  for (const chef of transformed.chefs.values()) {
    await supabase
      .from('chefs')
      .upsert({
        ...chef,
        primary_show_id: show.id
      });
  }
  
  // Insert restaurants
  for (const restaurant of transformed.restaurants) {
    // Get chef ID
    const { data: chef } = await supabase
      .from('chefs')
      .select('id')
      .eq('slug', restaurant.chef_slug)
      .single();
    
    await supabase
      .from('restaurants')
      .upsert({
        ...restaurant,
        chef_id: chef.id
      });
  }
}
```

### Data Quality Checks

1. **Duplicate Detection**
   - Same restaurant name + location = likely duplicate
   - Same chef + different spellings = merge records

2. **Status Verification**
   - Check if coordinates are valid
   - Verify website URLs still work
   - Search for "permanently closed" mentions

3. **Missing Data**
   - Flag restaurants without coordinates for geocoding
   - Flag chefs without season information
   - Flag restaurants without websites for research

## Advantages of This Approach

1. **Already Geocoded** - Lat/lng coordinates provided
2. **Structured Data** - Clean JSON format
3. **Comprehensive** - 100-150 restaurants is a solid start
4. **Authoritative** - topchef.fyi appears well-maintained
5. **Additional Metadata** - James Beard awards included

## Next Steps

1. Extract data from topchef.fyi (manual browser method)
2. Create transformation script
3. Load into Supabase
4. Run enrichment on subset (10-20 high-profile restaurants)
5. Verify data quality
6. Build UI to display the data

## Future Expansion

Once we have Top Chef data working:
1. Look for similar sites for Iron Chef
2. Check Food Network sites for Tournament of Champions
3. Build our own scraper for ongoing updates
4. Create community submission system

This gives us a quick path to getting real data into the system!