---
Last-Updated: 2025-12-09
Maintainer: RB
Status: Phase 3 Complete
---

# Show Hierarchy Project

## Problem Statement

Currently 150+ shows stored flat in the database. "Top Chef: California" (Season 13) is a separate show from "Top Chef" with no relationship. This creates:

1. **Overwhelming UI**: `/shows` page lists 150+ cards
2. **No family browsing**: Can't see "all Top Chef chefs" together
3. **Duplicate shows**: "Chopped: Chopped All-Stars" exists alongside "Chopped All-Stars"
4. **Inconsistent data**: Named seasons treated as separate franchises
5. **Partial data explosion**: Finding one chef discovers many shows, most with incomplete data

## Solution

Add `parent_show_id` and `is_public` to create hierarchical relationships with visibility control:

| Type | Example | parent_show_id | is_public |
|------|---------|---------------|-----------|
| **core** | Top Chef, Chopped | NULL | true |
| **spinoff** | Top Chef Canada, Chopped Jr. | NULL | varies |
| **variant** | Top Chef All-Stars, Chopped Legends | → core | varies |
| **named_season** | Top Chef: California | → core | varies |

---

## Key Design Decisions

### 1. Show Visibility
- `is_public` boolean (not enum - simpler)
- **Public shows**: Clickable, have dedicated pages, appear in search/filters
- **Non-public shows**: Tracked for chef records only, grayed out in UI

### 2. Chef Page Display for Non-Public Shows
- Show ALL TV credits on chef profile (complete data)
- Non-public shows: **grayed out**, non-clickable
- Hover/click shows tooltip: "We don't have this show yet"

### 3. New Show Defaults
- All new shows created during ingestion default to `is_public = false`
- Admin promotes shows to public when ready

### 4. Data Migration Approach
- **Existing data**: Manual SQL to fix (one-time cleanup)
- **Code changes**: Respect visibility in UI, auto-create new shows as non-public

### 5. Key Insight: TV History is Static
- Chefs' TV appearances are historical fact - they don't change
- Once a chef is enriched, their shows are set
- This is primarily a **one-time data cleanup**, not ongoing complexity
- Future: rare new shows auto-create as non-public, admin approves via admin panel

---

## Implementation Checklist

### Phase 1: Database Schema ✅ COMPLETE
- [x] Migration `037_show_hierarchy.sql`
  - [x] Add `parent_show_id UUID REFERENCES shows(id)`
  - [x] Add `show_type TEXT` (core/spinoff/variant/named_season)
  - [x] Add `is_public BOOLEAN DEFAULT false`
  - [x] Add indexes (`idx_shows_parent`, `idx_shows_type`, `idx_shows_public`)
  - [x] Update `get_shows_with_counts()` - filters to public parents, aggregates child counts
  - [x] Update `get_show_with_chef_counts()` - includes parent info + chefs from children
  - [x] Add `get_show_family(UUID)` - returns parent/siblings/children
  - [x] Add `get_show_children(slug)` - for variant tabs

### Phase 2: Manual Data Cleanup (SQL Scripts) ✅ COMPLETE
- [x] Classified 86 shows as public across 4 categories
- [x] Set parent_show_id relationships for variants/named_seasons
- [x] Merged 4 duplicate shows
- [x] Set is_public=true for ready shows
- [x] Fixed `get_show_children` RPC ambiguity bug

**Final counts:**
| Category | Count |
|----------|-------|
| Core | 31 |
| Spinoff | 17 |
| Variant | 25 |
| Named Season | 13 |
| Non-public | 75 |
| **Total** | 161 |

**Duplicates merged:**
- `chopped-chopped-all-stars` → `chopped-all-stars`
- `chopped-next-generation` → `chopped-next-gen`
- `cutthroat-kitchen-all-star-tournament` → `cutthroat-kitchen-all-stars`
- `the-next-food-network-star` → `food-network-star`

### Phase 3: Ingestion Pipeline (Simplified) ✅ COMPLETE
- [x] Update `show-repository.ts`:
  - [x] Auto-create unknown shows with `is_public=false` via upsert
  - [x] Added `createShow()` method with race-condition safe upsert
  - [x] Input validation (empty names, invalid slugs)
  - [x] Unicode-safe `slugify()` helper (NFD normalization)
  - [x] Keep `showNameMap` for known show routing
- [x] Update `database.types.ts` with new show fields
- [x] Update `supabase.ts` Show interface

### Phase 4: TypeScript Types
- [ ] Update `src/lib/supabase.ts` - Show interface with new fields
- [ ] Update `src/lib/database.types.ts` (auto-generated after migration)

### Phase 5: Frontend - Show Pages
- [ ] `/shows` directory - only `is_public=true` AND `parent_show_id IS NULL`
- [ ] `/shows/[slug]` core - aggregate chefs, variant filter tabs
- [ ] `/shows/[slug]` variant - breadcrumb to parent, family banner

### Phase 6: Frontend - Chef Pages
- [ ] `TVAppearanceBadge.tsx` - gray out non-public shows, add tooltip
- [ ] `ShowBadgeCompact.tsx` - same treatment
- [ ] `ShowBadgeStrip.tsx` - same treatment

### Phase 7: Frontend - Filters
- [ ] `ChefFilters.tsx` - only public shows in dropdown
- [ ] `useChefFilters.ts` - expand parent selection to include children

### Phase 8: Admin UI
- [ ] `/admin/shows` - show all (public + non-public)
- [ ] Toggle is_public per show
- [ ] Set parent_show_id dropdown
- [ ] View hierarchy (tree structure)
- [ ] Merge duplicate shows

### Phase 9: Validation
- [ ] Run `npm run type-check`
- [ ] Run `npm run test:e2e`
- [ ] Verify no broken links for public shows

---

## Database Schema

### New Columns on `shows` Table

```sql
ALTER TABLE shows ADD COLUMN parent_show_id UUID REFERENCES shows(id);
ALTER TABLE shows ADD COLUMN show_type TEXT CHECK (show_type IN ('core', 'spinoff', 'variant', 'named_season'));
ALTER TABLE shows ADD COLUMN is_public BOOLEAN DEFAULT false;

CREATE INDEX idx_shows_parent ON shows(parent_show_id);
CREATE INDEX idx_shows_type ON shows(show_type);
CREATE INDEX idx_shows_public ON shows(is_public);
```

---

## Ingestion Pipeline Changes

### Current Flow (Before)
1. `ShowDiscoveryService.findShowsBasic()` - LLM extracts TV appearances
2. Returns: `{showName, season, result, performanceBlurb}`
3. `ShowRepository.saveChefShows()` - looks up show via `showNameMap` then DB
4. If not found → **skipped with warning** (shows NOT auto-created)

### New Flow (After - Simplified)

1. LLM extracts TV appearances (no prompt changes needed)
2. `ShowRepository.saveChefShows()` looks up show:
   - Check `showNameMap` first (routes known variations)
   - Then DB lookup by name
3. If not found → **auto-create** with `is_public=false`
4. Admin reviews new shows in `/admin/shows` and sets type/parent/visibility

#### Update `saveChefShows()` (`show-repository.ts`)

```typescript
async saveChefShows(chefId: string, tvShows: TVShow[]): Promise<SaveResult> {
  for (const show of tvShows) {
    let showId = await this.findShowByName(show.showName);
    
    if (!showId) {
      // AUTO-CREATE with is_public=false
      // Admin will classify later via admin panel
      showId = await this.createShow({
        name: show.showName,
        slug: slugify(show.showName),
        is_public: false,
        show_type: null,      // Admin sets via admin panel
        parent_show_id: null, // Admin sets via admin panel
      });
      console.log(`      📺 Created new show (non-public): ${show.showName}`);
    }
    
    // Create chef_shows record...
  }
}
```

#### `showNameMap` Purpose
Routes known show name variations to correct slugs:
```typescript
const showNameMap = {
  // Normalization (apostrophes, alternate spellings)
  'guy\'s grocery games': 'guys-grocery-games',
  'hell\'s kitchen': 'hells-kitchen',
  
  // Alternate names → canonical
  'guy\'s tournament of champions': 'tournament-of-champions',
  'masterchef us': 'masterchef',
};
```
No need to add every show - just problematic variations. Admin adds new mappings when needed.

---

## Show Classification Guide

### Core Shows (is_public=true, show_type='core')
Main franchises - these should be public:
- Top Chef
- Chopped
- Iron Chef America
- Cutthroat Kitchen
- MasterChef
- Hell's Kitchen
- Beat Bobby Flay
- Tournament of Champions
- Guy's Grocery Games
- Next Level Chef
- Food Network Star
- Worst Cooks in America
- Halloween Baking Championship
- BBQ Brawl

### Spinoffs (is_public=varies, show_type='spinoff')
Independent franchises:
- Top Chef Canada
- Top Chef Masters
- Top Chef Jr.
- Chopped Jr.
- MasterChef Junior
- Last Chance Kitchen
- Iron Chef: Quest for an Iron Legend

### Variants (parent_show_id → core, show_type='variant')
Special editions:
- Top Chef All-Stars → Top Chef
- Top Chef: World All-Stars → Top Chef
- Chopped All-Stars → Chopped
- Chopped Legends → Chopped
- Cutthroat Kitchen All-Stars → Cutthroat Kitchen
- Guy's Grocery Games All-Stars → Guy's Grocery Games

### Named Seasons (parent_show_id → core, show_type='named_season')
Location-named seasons:
- Top Chef: California → Top Chef (Season 13)
- Top Chef: Charleston → Top Chef (Season 14)
- Top Chef: Colorado → Top Chef (Season 15)
- Top Chef: Houston → Top Chef (Season 19)
- Top Chef: Wisconsin → Top Chef (Season 21)
- etc.

### Duplicates to Merge
- `Chopped: Chopped All-Stars` → merge into `Chopped All-Stars`
- `Cutthroat Kitchen All-Stars` + `Cutthroat Kitchen: All-Star Tournament` → keep one
- `Chopped Next Gen` + `Chopped: Next Generation` → keep one
- `The Next Food Network Star` + `Food Network Star` → keep one

---

## UI Changes

### /shows Directory Page
- Only show `is_public = true` AND `parent_show_id IS NULL` (core + public spinoffs)
- ~25-30 cards instead of 150+
- Aggregate counts include all variants

### /shows/[slug] - Core Show Page
- Variant tabs: "All | California | All-Stars | Masters"
- Aggregate stats across all variants
- Season pills work across variants

### /shows/[slug] - Variant Show Page
- Breadcrumb: Shows → Top Chef → California
- "Part of the Top Chef family" banner
- Link to parent and sibling variants

### Chef Page - TV Credits
**Public shows:**
- Full color, clickable
- Links to show/season page

**Non-public shows:**
- Grayed out (opacity, muted colors)
- NOT clickable (no href)
- Hover tooltip: "We don't have this show yet" or "Coming soon"

Example treatment:
```tsx
{show.is_public ? (
  <Link href={`/shows/${show.slug}`}>
    <Badge className="bg-copper-600">{show.name}</Badge>
  </Link>
) : (
  <Tooltip content="We don't have this show yet">
    <Badge className="bg-gray-300 text-gray-500 cursor-default">
      {show.name}
    </Badge>
  </Tooltip>
)}
```

### ChefFilters Show Dropdown
- Only show `is_public = true` shows
- ~25-30 items instead of 150+

---

## Admin UI Changes

### /admin/shows Page

**Features needed:**
1. **Show all** (public + non-public) with visibility indicator
2. **Toggle is_public** per show (button or switch)
3. **Set parent_show_id** dropdown
4. **Set show_type** dropdown
5. **Filter by**: public/non-public, show_type, has_parent
6. **Hierarchy view**: Collapsible tree showing parent→children
7. **Merge shows**: Select duplicate, merge chef_shows into target, delete source

**Table columns:**
- Name
- Slug
- Network
- Type (core/spinoff/variant/named_season)
- Parent (if any)
- Chef count
- Public (toggle)
- Actions (edit, merge)

---

## Files to Modify

### Database
- `supabase/migrations/037_show_hierarchy.sql`

### Ingestion Pipeline
- `scripts/ingestion/enrichment/services/show-discovery-service.ts`
- `scripts/ingestion/enrichment/repositories/show-repository.ts`

### TypeScript Types
- `src/lib/supabase.ts`
- `src/lib/database.types.ts` (auto-generated)

### Frontend Pages
- `src/app/shows/page.tsx`
- `src/app/shows/[slug]/page.tsx`
- `src/app/shows/[slug]/ShowPageClient.tsx`

### Components
- `src/components/chef/TVAppearanceBadge.tsx`
- `src/components/chef/ShowBadgeCompact.tsx`
- `src/components/chef/ShowBadgeStrip.tsx`
- `src/components/chef/ChefFilters.tsx`
- `src/lib/hooks/useChefFilters.ts`

### Admin
- `src/app/admin/(protected)/shows/page.tsx`
- `src/app/admin/(protected)/shows/ShowsClient.tsx`

---

## Manual SQL for Existing Data

User will run these directly (not in migration):

```sql
-- 1. Set core shows
UPDATE shows SET show_type = 'core', is_public = true 
WHERE slug IN ('top-chef', 'chopped', 'iron-chef-america', 'cutthroat-kitchen', ...);

-- 2. Set variants with parents
UPDATE shows SET 
  show_type = 'variant',
  parent_show_id = (SELECT id FROM shows WHERE slug = 'top-chef'),
  is_public = true
WHERE slug IN ('top-chef-all-stars', 'top-chef-world-all-stars');

-- 3. Set named seasons
UPDATE shows SET
  show_type = 'named_season', 
  parent_show_id = (SELECT id FROM shows WHERE slug = 'top-chef'),
  is_public = true
WHERE slug IN ('top-chef-california', 'top-chef-charleston', ...);

-- 4. Merge duplicates
UPDATE chef_shows SET show_id = (SELECT id FROM shows WHERE slug = 'chopped-all-stars')
WHERE show_id = (SELECT id FROM shows WHERE slug = 'chopped-chopped-all-stars');
DELETE FROM shows WHERE slug = 'chopped-chopped-all-stars';
```

---

## RPC Function Updates

### get_shows_with_counts()
Only return public shows with no parent, aggregate child counts:
```sql
SELECT s.*, 
  (SELECT COUNT(DISTINCT cs.chef_id) FROM chef_shows cs 
   JOIN shows child ON cs.show_id = child.id 
   WHERE child.id = s.id OR child.parent_show_id = s.id) as chef_count
FROM shows s
WHERE s.is_public = true AND s.parent_show_id IS NULL
ORDER BY s.name;
```

### get_show_with_chef_counts(slug)
Include children's chefs, return child_shows array

### NEW: get_show_family(show_id)
Returns parent, siblings, and children

---

## Testing Plan

1. Migration runs without errors
2. Manual SQL classifications applied
3. `/shows` shows only public core/spinoffs
4. `/shows/[slug]` aggregates variants for core shows
5. Chef pages show all credits (public clickable, non-public grayed)
6. Filters only offer public shows
7. Admin can toggle visibility, set parents
8. New ingestion creates shows with is_public=false
9. E2E tests pass

---

## Admin Workflow for New Shows

1. **New show appears from ingestion** → auto-created with `is_public=false`
2. **Admin sees it** in `/admin/shows` (can filter to non-public)
3. **Admin classifies**:
   - Set `show_type` (core/spinoff/variant/named_season)
   - Set `parent_show_id` if variant/named_season
   - Toggle `is_public=true` when ready to go live
4. **Optionally** add to `showNameMap` if there are naming variations to route

This is expected to be **rare** after initial data cleanup - TV history is static.
