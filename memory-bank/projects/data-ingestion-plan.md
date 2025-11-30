---
Last-Updated: 2025-11-30
Maintainer: RB
Status: Active Planning
---

# TV Chef Map: Data Ingestion & Maintenance Plan

## Overview

Before building features, we need a robust data pipeline to:
1. Ingest existing Top Chef restaurant data from spreadsheet
2. Enrich data with additional information (locations, status, chef details)
3. Maintain data freshness through automated updates
4. Expand to other shows (Iron Chef, Tournament of Champions, etc.)

## Data Sources

### Primary Source: Top Chef Spreadsheet
- Google Sheets with Top Chef contestant restaurants
- Likely columns: Chef Name, Season, Restaurant Name, Location, etc.
- Manual curation provides high-quality baseline

### Secondary Sources for Enrichment
- Restaurant websites (official URLs, hours)
- Google Places API (coordinates, current status)
- Wikipedia (chef bios, show appearances)
- Social media (Instagram/Twitter for recent activity)
- Food blogs/press (recent openings/closures)

## Data Ingestion Pipeline

### Phase 1: Initial Spreadsheet Import

#### Step 1: Export & Parse
```typescript
// 1. Export Google Sheets as CSV
// 2. Parse CSV with expected schema
interface RawTopChefData {
  chef_name: string;
  season: string;
  placement: string; // "Winner", "Finalist", "Contestant"
  restaurant_name: string;
  city: string;
  state?: string;
  notes?: string;
}
```

#### Step 2: Data Normalization
```typescript
// Transform raw data to match our schema
async function normalizeChefData(raw: RawTopChefData) {
  return {
    // Generate slug from name
    slug: generateSlug(raw.chef_name),
    name: raw.chef_name,
    primary_show_id: await getShowId('Top Chef'),
    top_chef_season: normalizeSeasonFormat(raw.season),
    top_chef_result: normalizeResult(raw.placement),
    country: 'US' // Assume US for Top Chef
  };
}
```

#### Step 3: Deduplication
- Check for existing chefs by name/slug
- Merge restaurant data for chefs with multiple restaurants
- Handle name variations (e.g., "Mike Isabella" vs "Michael Isabella")

### Phase 2: Automated Enrichment

#### LLM-Powered Enrichment Service
```typescript
class ChefDataEnricher {
  async enrichChef(chef: Chef): Promise<EnrichedChef> {
    // 1. Search for chef information
    const webData = await this.searchChefInfo(chef.name);
    
    // 2. Use LLM to extract structured data
    const enrichmentPrompt = `
      Given this chef information:
      Name: ${chef.name}
      Show: Top Chef Season ${chef.top_chef_season}
      
      And this web data:
      ${webData}
      
      Extract:
      - Mini biography (2-3 sentences)
      - Other TV show appearances
      - Current restaurant ventures
      - Awards and recognition
    `;
    
    const enrichedData = await this.llm.extract(enrichmentPrompt);
    
    // 3. Geocode restaurant locations
    const coordinates = await this.geocodeRestaurant(
      enrichedData.restaurant_address
    );
    
    // 4. Check restaurant status
    const status = await this.checkRestaurantStatus(
      enrichedData.restaurant_name,
      coordinates
    );
    
    return {
      ...chef,
      mini_bio: enrichedData.bio,
      other_shows: enrichedData.other_shows,
      restaurants: enrichedData.restaurants.map(r => ({
        ...r,
        lat: coordinates.lat,
        lng: coordinates.lng,
        status: status,
        cuisine_tags: this.normalizeCuisine(r.cuisine_description)
      }))
    };
  }
}
```

#### Geocoding Service
```typescript
class GeocodingService {
  async geocodeAddress(address: string): Promise<Coordinates> {
    // Use Nominatim (OpenStreetMap) for free geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&q=${encodeURIComponent(address)}`
    );
    
    const results = await response.json();
    if (results.length > 0) {
      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon)
      };
    }
    
    // Fallback: Try with just city/state
    return this.geocodeCity(extractCity(address));
  }
}
```

### Phase 3: Data Quality & Validation

#### Validation Rules
```typescript
const validationRules = {
  chef: {
    name: { required: true, minLength: 2 },
    slug: { required: true, unique: true },
    top_chef_season: { pattern: /^S\d{2}$/ }
  },
  restaurant: {
    name: { required: true },
    city: { required: true },
    price_tier: { enum: ['$', '$$', '$$$', '$$$$'] },
    status: { enum: ['open', 'closed', 'unknown'] },
    coordinates: { 
      validate: (lat, lng) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    }
  }
};
```

#### Quality Checks
1. **Completeness**: Flag records missing critical fields
2. **Accuracy**: Cross-reference with multiple sources
3. **Freshness**: Track last_verified timestamp
4. **Consistency**: Ensure data formats match schema

## Ongoing Maintenance Strategy

### Automated Status Checks

#### Weekly Status Verification
```typescript
class RestaurantStatusChecker {
  async checkAllRestaurants() {
    const restaurants = await db.getRestaurantsForStatusCheck();
    
    for (const restaurant of restaurants) {
      const status = await this.verifyStatus(restaurant);
      
      if (status !== restaurant.status) {
        await db.updateRestaurantStatus(restaurant.id, status, {
          previous_status: restaurant.status,
          changed_at: new Date(),
          verification_source: 'automated_check'
        });
        
        // Flag for manual review if closed
        if (status === 'closed') {
          await this.flagForReview(restaurant, 'Restaurant appears closed');
        }
      }
    }
  }
  
  async verifyStatus(restaurant: Restaurant): Promise<string> {
    // Check multiple signals
    const signals = await Promise.all([
      this.checkGooglePlaces(restaurant),
      this.checkWebsite(restaurant.website_url),
      this.checkSocialMedia(restaurant),
      this.checkRecentReviews(restaurant)
    ]);
    
    // Determine status based on signals
    return this.interpretSignals(signals);
  }
}
```

### New Restaurant Discovery

#### Monitoring for New Openings
```typescript
class NewRestaurantDiscovery {
  async discoverNewRestaurants() {
    const chefs = await db.getAllChefs();
    
    for (const chef of chefs) {
      // Search for recent news
      const news = await this.searchChefNews(chef.name, 'restaurant opening');
      
      // Use LLM to extract restaurant information
      if (news.length > 0) {
        const newRestaurants = await this.extractNewRestaurants(chef, news);
        
        for (const restaurant of newRestaurants) {
          // Add to review queue
          await db.addToReviewQueue({
            type: 'new_restaurant',
            chef_id: chef.id,
            data: restaurant,
            source: news.source,
            confidence: restaurant.confidence
          });
        }
      }
    }
  }
}
```

### Show Expansion Strategy

#### Adding New Shows
```typescript
const showExpansionPlan = [
  {
    show: 'Iron Chef',
    priority: 1,
    source: 'Wikipedia list of Iron Chef contestants',
    estimatedChefs: 50
  },
  {
    show: 'Tournament of Champions',
    priority: 2,
    source: 'Food Network website',
    estimatedChefs: 32
  },
  {
    show: 'Beat Bobby Flay',
    priority: 3,
    source: 'Episode winners list',
    estimatedChefs: 200+
  },
  {
    show: 'Chopped',
    priority: 4,
    source: 'Champions and notable contestants',
    estimatedChefs: 100+
  }
];
```

## Implementation Timeline

### Week 1: Manual Import
- [ ] Export Top Chef spreadsheet to CSV
- [ ] Write import script with data normalization
- [ ] Load initial data into Supabase
- [ ] Manual verification of high-profile chefs

### Week 2: Enrichment Pipeline
- [ ] Implement geocoding service
- [ ] Build LLM enrichment workflow
- [ ] Add restaurant status checking
- [ ] Enrich initial dataset

### Week 3: Automation
- [ ] Set up weekly status checks
- [ ] Implement new restaurant discovery
- [ ] Create admin review interface
- [ ] Add monitoring and alerts

### Week 4: Expansion
- [ ] Add Iron Chef data
- [ ] Expand to Tournament of Champions
- [ ] Implement quality scoring system
- [ ] Deploy automated maintenance

## Admin Tools Required

### Data Management Interface
```typescript
// Admin dashboard pages needed
const adminPages = [
  '/admin/import',        // CSV upload and mapping
  '/admin/review-queue',  // New restaurants for approval
  '/admin/enrichment',    // Trigger enrichment for specific records
  '/admin/status-check',  // Manual status verification
  '/admin/quality',       // Data quality reports
  '/admin/monitoring'     // System health and costs
];
```

### Review Queue Workflow
1. Automated discovery adds items to queue
2. Admin reviews with enrichment suggestions
3. One-click approve with edits
4. Rejected items logged for pattern analysis

## Cost Management

### LLM Usage Optimization
```typescript
const costOptimization = {
  // Use cheaper models for simple tasks
  statusCheck: 'gpt-3.5-turbo',
  enrichment: 'gpt-4',
  
  // Cache all LLM responses
  cacheStrategy: {
    searchInterpretation: '24 hours',
    chefBio: '7 days',
    restaurantEnrichment: '3 days'
  },
  
  // Batch operations
  batchSize: 10,
  dailyLimit: 1000,
  
  // Cost tracking
  budgetAlerts: {
    daily: 10,   // $10/day
    weekly: 50,  // $50/week
    monthly: 150 // $150/month
  }
};
```

## Quality Metrics

### Data Quality KPIs
- **Coverage**: % of TV chefs with restaurants in database
- **Accuracy**: % of restaurants with verified current status
- **Freshness**: Average days since last verification
- **Completeness**: % of restaurants with all required fields
- **Enrichment**: % of chefs with bios and full TV history

### System Health Metrics
- **Import Success Rate**: Successful imports / attempts
- **Enrichment Success Rate**: Successful enrichments / attempts
- **Status Check Accuracy**: Correct status / total checks
- **Discovery Rate**: New restaurants found / week
- **Cost Efficiency**: Cost per restaurant maintained

## Next Steps

1. **Immediate**: Get access to Top Chef spreadsheet data
2. **Day 1**: Create import script for initial data load
3. **Week 1**: Build basic enrichment pipeline
4. **Week 2**: Implement automated maintenance
5. **Month 1**: Expand to 2-3 additional shows

This data pipeline ensures we have accurate, current, and comprehensive chef restaurant data as the foundation for the TV Chef Map application.