---
Last-Updated: 2025-12-03
Maintainer: RB
Status: Phase 2 Complete - Ready for Re-enrichment
Priority: MEDIUM
---

# Chef Photo Legal Compliance Plan

## Emergency Context

**Issue**: Downloaded chef photos from Google Images may be copyrighted material, creating legal liability.

**Immediate Action Required**: Wipe all existing chef photos to eliminate legal risk.

**Timeline**: ASAP (photo wipe) + 2-3 hours (pipeline fix)

---

## Current State Assessment

### Database Status (Updated 2025-12-03)
- **Chefs with photos**: 0/239 (0%) ✅ CLEARED
- **Photo sources**: All NULL ✅ CLEARED
- **Legal risk**: ELIMINATED ✅ - all copyrighted images removed
- **Cache status**: Vercel redeployed ✅ - static pages regenerated

### Existing Infrastructure ✅
- `scripts/clear-chef-photos.ts` - Ready to run, sets photo_url=NULL, photo_source=NULL
- `scripts/ingestion/services/wikipedia-images.ts` - Wikipedia/Wikimedia service (already implemented)
- `chefs.instagram_handle` - Column exists for ~60% of chefs
- `src/app/api/admin/upload-photo/route.ts` - Manual upload capability

### Schema Fields
```sql
chefs.photo_url TEXT (Supabase storage URL or external URL)
chefs.photo_source TEXT CHECK (photo_source IN ('wikipedia', 'tmdb', 'llm_search', 'manual'))
chefs.instagram_handle TEXT
```

---

## Legal-Safe Photo Strategy (Updated 2025-12-03)

### APPROVED STRATEGY: Mixed Model (Wikipedia + Instagram Links)

#### For Chef Directory/Cards (Grid Views)
**Priority order:**
1. **Wikipedia/Wikimedia Commons** (PRIMARY)
   - **License**: CC-BY-SA or Public Domain
   - **Commercial use**: ✅ Allowed with attribution
   - **Quality**: High (professional headshots)
   - **Coverage**: ~60-70% of high-profile chefs (140-160 of 239)
   - **Cost**: $0 (free API)
   - **Performance**: Fast (static images, SEO-friendly)
   - **Implementation**: Already exists in `media-enricher.ts`

2. **Instagram Icon Link** (FALLBACK for missing photos)
   - **Method**: Link to Instagram profile with icon (NOT embed)
   - **Legal**: ✅ No copyright issue (just linking)
   - **Coverage**: ~60% of chefs have instagram_handle
   - **UX**: `<a href="https://instagram.com/{handle}"><InstagramIcon />@{handle}</a>`
   - **Performance**: Zero impact (just a link)

3. **Chef Initials Avatar** (LAST RESORT)
   - **Method**: Generic avatar with chef's initials (e.g., "GR" for Gordon Ramsay)
   - **Legal**: ✅ No copyright issue
   - **UX**: Consistent fallback for missing data
   - **Performance**: SVG or CSS (instant render)

#### For Individual Chef Pages (Detail Views - FUTURE ENHANCEMENT)
**Optional "Featured Moment" section:**
- **Instagram Post Embed** (below bio, lazy-loaded)
- **Method**: Official Instagram oEmbed API
- **Legal**: ✅ Explicitly allowed by Instagram
- **UX**: Shows cooking action shot, dish, or recent moment
- **Performance**: Lazy-loaded below fold (minimal impact)
- **Personality**: Adds "living kitchen" vibe
- **Implementation**: Phase 3 (post-launch enhancement)

### REJECTED OPTIONS (Documented for Reference)

#### ❌ Instagram Profile Photo Embedding (Undocumented API)
- Pattern: `https://www.instagram.com/api/v1/users/web_profile_info/?username={handle}`
- **Legal gray area**: Not official API, publicly accessible but unauthorized
- **Risk**: Medium - could break if Instagram changes endpoint
- **Decision**: REJECTED - too risky, prefer official embedding only

#### ❌ Downloading Instagram Post Images (Self-Hosting)
- **Legal risk**: HIGH - copyright infringement even with credit
- **Rule**: Embedding = safe, Downloading = not safe
- **Decision**: REJECTED - violates copyright law

#### ❌ Instagram Embeds in Grid Views
- **Performance risk**: HIGH - 239 iframes on `/chefs` page = disaster
- **SEO impact**: Negative - iframes don't provide OpenGraph images
- **Decision**: REJECTED - reserve embeds for detail pages only

### Manual Upload Option (Editorial Use)
**Source**: Press kit photos (editorial use doctrine)  
**Legal**: ✅ Editorial use on commercial site with ads is allowed  
**Process**: Admin uploads via `/admin/manage`  
**Attribution**: Store in alt text or separate field
**Use case**: High-priority chefs missing Wikipedia photos

---

## Phase 1: Emergency Photo Wipe ⚡ PRIORITY

**Execute immediately to eliminate legal risk**

```bash
cd /Users/rb/Documents/coding_projects/chefs
npm run tsx scripts/clear-chef-photos.ts
```

**Impact**:
- Sets `photo_url=NULL` and `photo_source=NULL` for 160 chefs
- Removes all hosted photos from Supabase storage (optional cleanup)
- **Zero legal risk after this step**

---

## Phase 2: Fix Enrichment Pipeline (NEXT)

**Goal**: Remove all Google Images code and ensure only Wikipedia photos are used

### Phase 2A: Remove Unsafe Code

#### 1. Delete Google Images Service
**File**: `scripts/ingestion/services/google-images.ts`  
**Action**: DELETE entire file (102 lines)
**Reason**: Uses Google Custom Search API without license validation

#### 2. Update LLM Enricher
**File**: `scripts/ingestion/processors/llm-enricher.ts`  
**Changes**:
- **Line 8**: Remove `import { createGoogleImageSearchTool } from '../services/google-images';`
- **Tool registration**: Remove `googleImageSearch` tool from LLM tools array
- **Prompt**: Remove instructions about using `google_image_search` tool
- **Schema/Types**: Update `photoSource` type from `'show_website' | 'llm_search' | null` to `'wikipedia' | null`
- **Logic**: Remove any photo fetching logic that uses Google Images

#### 3. Verify Media Enricher (Already Safe)
**File**: `scripts/ingestion/processors/media-enricher.ts`  
**Current state**: Lines 78-82 already use Wikipedia-only approach ✅
**Verification needed**:
- Confirm no Google Images fallback in `enrichChefImage()` function
- Verify return type: `photoSource: 'wikipedia' | null` (not 'llm_search')
- Check that only `wikipediaService.getChefWikipediaImage()` is called

### Phase 2B: Database Schema Updates

#### 4. Create Migration: Remove Unsafe Photo Sources
**File**: `supabase/migrations/015_remove_unsafe_photo_sources.sql` (NEW)
```sql
-- Remove unsafe photo sources from constraint
ALTER TABLE chefs DROP CONSTRAINT IF EXISTS chefs_photo_source_check;
ALTER TABLE chefs ADD CONSTRAINT chefs_photo_source_check 
  CHECK (photo_source IN ('wikipedia', 'manual'));

-- Clean up any legacy values (should be NULL already after Phase 1 wipe)
UPDATE chefs SET photo_source = NULL 
WHERE photo_source IN ('llm_search', 'tmdb', 'show_website');

-- Add comment for documentation
COMMENT ON COLUMN chefs.photo_source IS 
  'Source of chef photo: wikipedia (Wikimedia Commons CC-BY-SA), manual (admin upload), or NULL';
```

#### 5. Update TypeScript Database Types
**File**: `src/lib/database.types.ts`  
**Changes**:
- **Line 69**: Change `photo_source: "wikipedia" | "tmdb" | "llm_search" | "manual" | null;`
- **To**: `photo_source: "wikipedia" | "manual" | null;`

**Note**: May need to regenerate types after migration:
```bash
# If using Supabase CLI type generation
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

---

## Phase 3: Re-Enrich with Wikipedia-Only Photos

**Goal**: Populate chef photos using only Wikipedia/Wikimedia Commons (legal + safe)

### Option A: Admin UI Bulk Trigger (Recommended)
```
1. Navigate to /admin/enrichment-jobs
2. Use "Bulk Refresh" section
3. Select all 239 chefs
4. Choose enrichment type: "Photo only" or "Full"
5. Click "Trigger"
6. Monitor job queue progress
```

**Cost**: ~$0-5 (Wikipedia API is free, minimal LLM cost for validation)
**Time**: 20-30 minutes for 239 chefs

### Option B: Manual Script Execution
```bash
# Run enrichment script directly
cd /Users/rb/Documents/coding_projects/chefs
npm run tsx scripts/enrich-chefs-photos.ts --all

# Or use existing admin API programmatically
curl -X POST https://cheft.app/api/admin/enrichment/bulk-refresh \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"enrichmentType": "photo_only", "chefIds": ["all"]}'
```

### Expected Coverage Results

**Best case** (60-70% coverage):
- Wikipedia photos: **140-167 chefs** (high-profile chefs with Wikipedia pages)
- Missing photos: **72-99 chefs** (newer/regional chefs without Wikipedia presence)

**Realistic case** (50-60% coverage):
- Wikipedia photos: **120-143 chefs**
- Missing photos: **96-119 chefs**

### Post-Enrichment Verification
```bash
# Run verification script
npm run tsx scripts/verify-photos-cleared.ts

# Check coverage stats
# Should show: X chefs with photo_url, all with photo_source='wikipedia'
```

---

## Phase 4: Fallback UI for Missing Photos (FUTURE)

**Goal**: Graceful degradation for chefs without Wikipedia photos

### Component Updates Required

#### 1. ChefCard.tsx (Grid View)
```typescript
export function ChefCard({ chef }: { chef: ChefData }) {
  return (
    <div className="chef-card">
      {chef.photo_url ? (
        // Priority 1: Wikipedia photo
        <img 
          src={chef.photo_url} 
          alt={`${chef.name} - Chef`}
          className="chef-photo"
        />
      ) : chef.instagram_handle ? (
        // Priority 2: Instagram link with icon
        <a 
          href={`https://instagram.com/${chef.instagram_handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="instagram-link-placeholder"
        >
          <InstagramIcon className="w-12 h-12" />
          <span className="text-sm">@{chef.instagram_handle}</span>
        </a>
      ) : (
        // Priority 3: Initials avatar
        <div className="initials-avatar">
          {getInitials(chef.name)}
        </div>
      )}
      {/* Rest of card content */}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
```

#### 2. ChefHero.tsx (Detail View)
```typescript
// Similar pattern but larger avatar/icon
{chef.photo_url ? (
  <img src={chef.photo_url} className="w-48 h-48 rounded-full" />
) : chef.instagram_handle ? (
  <a href={`https://instagram.com/${chef.instagram_handle}`}>
    <div className="w-48 h-48 rounded-full bg-stone-100 flex items-center justify-center">
      <InstagramIcon className="w-24 h-24" />
    </div>
  </a>
) : (
  <div className="w-48 h-48 rounded-full bg-copper-100 text-copper-900 text-4xl font-bold flex items-center justify-center">
    {getInitials(chef.name)}
  </div>
)}
```

### Design System Components to Create

#### InstagramIcon.tsx
```typescript
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      {/* Instagram logo SVG path */}
    </svg>
  );
}
```

#### InitialsAvatar.tsx (Reusable)
```typescript
export function InitialsAvatar({ 
  name, 
  size = 'md' 
}: { 
  name: string; 
  size?: 'sm' | 'md' | 'lg' 
}) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-24 h-24 text-2xl',
    lg: 'w-48 h-48 text-4xl',
  };

  return (
    <div className={`
      ${sizeClasses[size]}
      rounded-full 
      bg-copper-100 
      text-copper-900 
      font-bold 
      flex items-center justify-center
      border-2 border-copper-300
    `}>
      {getInitials(name)}
    </div>
  );
}
```

### Styling Considerations (Industrial Editorial)
- **Wikipedia photos**: Clean white border, subtle shadow
- **Instagram links**: Stone-100 background, copper accent on hover
- **Initials avatars**: Copper gradient, bold typography
- **Consistent spacing**: All variants same size in grid

### Files to Modify
- `src/components/chef/ChefCard.tsx`
- `src/components/chef/ChefHero.tsx`
- `src/components/chef/FeaturedChefHero.tsx` (if exists)
- `src/components/chef/RelatedChefs.tsx`
- `src/components/icons/InstagramIcon.tsx` (NEW)
- `src/components/ui/InitialsAvatar.tsx` (NEW)

---

## Implementation Checklist

### Immediate (Today) - ✅ PHASE 1 COMPLETE
- [x] Run `scripts/clear-chef-photos.ts` to wipe existing photos (236 photos cleared)
- [x] Verify all chef photo_url fields are NULL (confirmed: 0 chefs with photos)
- [x] Clear Vercel cache (redeployed)
- [ ] Delete `scripts/ingestion/services/google-images.ts`
- [ ] Update `llm-enricher.ts` (remove Google Images tool)
- [ ] Update `media-enricher.ts` (verify Wikipedia-only)

### Phase 2: Pipeline Cleanup (✅ COMPLETE)
- [x] Delete `scripts/ingestion/services/google-images.ts` ✅
- [x] Update `scripts/ingestion/processors/llm-enricher.ts` (removed Google Images tool) ✅
  - Removed import and imageStorageService usage
  - Updated prompt to not request photo URLs
  - Changed photo handling to return null (handled by media-enricher)
  - Updated photoSource type: 'wikipedia' | null
- [x] Verify `scripts/ingestion/processors/media-enricher.ts` (Wikipedia-only) ✅
  - Confirmed: Only uses wikipediaService (lines 78-82)
- [x] Create migration `015_remove_unsafe_photo_sources.sql` ✅
- [x] Apply migration via Supabase Dashboard SQL Editor ✅
- [x] Update `src/lib/database.types.ts` TypeScript types ✅
  - Changed photo_source: "wikipedia" | "manual" | null
- [x] Run `npm run type-check` (passed with no errors) ✅

**Result**: Enrichment pipeline now only uses Wikipedia photos (legally safe, CC-BY-SA licensed)

### Phase 3: Re-enrichment (NEXT SESSION)
- [ ] Trigger photo enrichment for all 239 chefs via admin UI or script
- [ ] Monitor job queue and success rate
- [ ] Verify coverage (target: 60-70% = 140-167 chefs)
- [ ] Document missing photo chefs for manual review

### Phase 4: Fallback UI (FUTURE - OPTIONAL)
- [ ] Create `InstagramIcon` component
- [ ] Create `InitialsAvatar` component  
- [ ] Update `ChefCard.tsx` with fallback logic
- [ ] Update `ChefHero.tsx` with fallback logic
- [ ] Update `FeaturedChefHero.tsx` if needed
- [ ] Test responsive design across all fallback states
- [ ] Deploy and verify production

### Long-term Enhancements (BACKLOG)
- [ ] Instagram post embeds on individual chef pages (Phase 5)
- [ ] Manual upload workflow for high-priority chefs
- [ ] Attribution system for Wikipedia photos (footer or image caption)
- [ ] Automated email outreach to chefs for press kit photos

---

## Decision Log

### Decisions Made
- ✅ **Wikipedia-first strategy**: Safe, high-quality, good coverage
- ✅ **Remove Google Images entirely**: Too much legal risk
- ✅ **Instagram links (not embeds)**: Safe fallback for missing photos

### Decisions Pending
- [ ] **Instagram profile photo hack**: Use undocumented API? (risky)
- [ ] **Press kit photo uploads**: Proactive outreach to chefs? (time-intensive)
- [ ] **Placeholder design**: Generic chef icon vs. Instagram link?
- [ ] **Attribution display**: Where to show Wikipedia photo credits?

---

## Risk Assessment

| Photo Source | Legal Risk | Quality | Coverage | Cost |
|--------------|-----------|---------|----------|------|
| **Google Images** | 🔴 HIGH | High | 90% | API costs |
| **Wikipedia** | 🟢 SAFE | High | 60-70% | $0 |
| **Instagram Link** | 🟢 SAFE | N/A (link only) | 60% | $0 |
| **Instagram Embed** | 🟡 MEDIUM | Medium | 60% | $0 |
| **Press Kit Manual** | 🟢 SAFE | High | Variable | Time |

---

## Success Metrics

### Legal Compliance (CRITICAL)
- [ ] Zero copyrighted images hosted on our servers
- [ ] All photo sources have clear legal basis (CC-BY-SA, editorial use, or linking)
- [ ] Attribution provided for Wikipedia photos

### Coverage Goals
- **Target**: 60-70% of chefs with Wikipedia photos
- **Acceptable**: 50%+ coverage
- **Fallback**: Instagram links for remaining 30-40%

### User Experience
- [ ] No broken image links
- [ ] Consistent placeholder for missing photos
- [ ] Clear visual hierarchy (photo > Instagram > placeholder)

---

## Related Documents

- `/memory-bank/architecture/enrichment-refresh-system.md` - Enrichment infrastructure
- `scripts/ingestion/processors/media-enricher.ts` - Current implementation
- `scripts/ingestion/services/wikipedia-images.ts` - Wikipedia service

---

## Next Steps

**IMMEDIATE (Today)**:
1. Run photo wipe script
2. Remove Google Images code
3. Test enrichment pipeline

**THIS WEEK**:
1. Apply database migration
2. Re-enrich all chefs with Wikipedia-only
3. Monitor coverage results

**DECISION NEEDED FROM RB**:
- Instagram profile photo hack: Implement or skip?
- Press kit outreach: Manually contact chefs for photos?
- Placeholder design: Generic icon or Instagram link?
