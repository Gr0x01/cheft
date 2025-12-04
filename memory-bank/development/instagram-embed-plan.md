---
Last-Updated: 2025-12-04
Maintainer: RB
Status: Planning - Phase 5
Priority: HIGH
---

# Instagram Post Embed Implementation Plan

## Overview
Add Instagram post embeds to individual chef detail pages to show actual cooking photos/recent moments using Instagram's official oEmbed API.

## Current State (Dec 4, 2025)

### Database Status
- ✅ `chefs.instagram_handle` column EXISTS (added in migration 003_add_seo_page_fields.sql)
- ❌ `instagram_handle` is **EMPTY** for all chefs (0 populated)
- ❌ `chefs.featured_instagram_post` column DOES NOT EXIST (needs creation)

### UI Status
- ✅ InstagramIcon component exists (used for fallback links)
- ✅ Instagram link fallback works (shows icon + @handle, clickable)
- ❌ NO actual Instagram post embeds implemented
- ❌ NO Instagram post data in database

### Legal Status
- ✅ Instagram official oEmbed/iframe embeds are SAFE (explicitly allowed by Instagram)
- ✅ Embedding (iframe) = Legal ✓
- ❌ Downloading/hosting photos = Illegal ✗

---

## Implementation Plan

### Phase 5A: Database Schema (FIRST)

#### 1. Create Migration: Add featured_instagram_post Column
**File**: `supabase/migrations/016_add_instagram_post.sql`

```sql
-- Add column for featured Instagram post URL
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS featured_instagram_post TEXT;

-- Add constraint to validate Instagram post URL format
ALTER TABLE chefs ADD CONSTRAINT chefs_instagram_post_format 
  CHECK (
    featured_instagram_post IS NULL 
    OR featured_instagram_post ~* '^https://www\.instagram\.com/(p|reel)/[A-Za-z0-9_-]+/?$'
  );

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_chefs_instagram_post 
  ON chefs(featured_instagram_post) 
  WHERE featured_instagram_post IS NOT NULL;

-- Add comment
COMMENT ON COLUMN chefs.featured_instagram_post IS 
  'Instagram post URL to embed on chef page (e.g., https://www.instagram.com/p/ABC123/)';
```

#### 2. Update TypeScript Types
**File**: `src/lib/database.types.ts`

```typescript
chefs: {
  Row: {
    // ... existing fields
    instagram_handle: string | null;
    featured_instagram_post: string | null; // NEW
  }
}
```

### Phase 5B: Instagram oEmbed Component

#### 3. Create InstagramEmbed Component
**File**: `src/components/chef/InstagramEmbed.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';

interface InstagramEmbedProps {
  postUrl: string;
  className?: string;
}

export function InstagramEmbed({ postUrl, className = '' }: InstagramEmbedProps) {
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadEmbed() {
      try {
        // Instagram oEmbed API (no auth required for public posts)
        const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(postUrl)}&maxwidth=500`;
        
        const response = await fetch(oembedUrl);
        if (!response.ok) throw new Error('Failed to fetch embed');
        
        const data = await response.json();
        setEmbedHtml(data.html);
      } catch (err) {
        console.error('Instagram embed error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadEmbed();
  }, [postUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="animate-pulse">
          <div className="w-96 h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !embedHtml) {
    return null; // Silent fail - don't show anything if embed fails
  }

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: embedHtml }}
    />
  );
}
```

**Alternative: Simple iframe approach (no API call needed)**:
```typescript
export function InstagramEmbed({ postUrl }: InstagramEmbedProps) {
  // Extract post ID from URL
  const postId = postUrl.match(/\/([A-Za-z0-9_-]+)\/?$/)?.[1];
  if (!postId) return null;

  return (
    <iframe
      src={`https://www.instagram.com/p/${postId}/embed/`}
      width="500"
      height="700"
      frameBorder="0"
      scrolling="no"
      allowTransparency
      className="mx-auto"
    />
  );
}
```

### Phase 5C: Chef Page Integration

#### 4. Update Chef Detail Page Query
**File**: `src/app/chefs/[slug]/page.tsx`

Add to query (line 60):
```typescript
photo_url,
photo_source,
instagram_handle,
featured_instagram_post, // NEW
```

Add to ChefData interface (line 21):
```typescript
interface ChefData {
  // ... existing fields
  instagram_handle: string | null;
  featured_instagram_post: string | null; // NEW
}
```

#### 5. Add Instagram Section to Chef Page
**File**: `src/app/chefs/[slug]/page.tsx`

Insert after TV Appearances section (around line 310):

```typescript
{/* Instagram Featured Post */}
{chef.featured_instagram_post && (
  <section 
    className="py-12 border-b"
    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
  >
    <div className="max-w-6xl mx-auto px-4">
      <h2 className="font-display text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        From the Kitchen
      </h2>
      <InstagramEmbed 
        postUrl={chef.featured_instagram_post} 
        className="max-w-xl mx-auto"
      />
    </div>
  </section>
)}
```

### Phase 5D: Data Population

#### Option A: Manual Admin UI (Recommended)
**File**: `src/app/admin/manage/page.tsx` (enhance existing admin)

Add Instagram section:
```typescript
<div className="mt-6">
  <label className="block font-mono text-sm mb-2">
    Instagram Handle
  </label>
  <input 
    type="text"
    placeholder="username (without @)"
    className="w-full px-3 py-2 border rounded"
  />
</div>

<div className="mt-4">
  <label className="block font-mono text-sm mb-2">
    Featured Instagram Post URL
  </label>
  <input 
    type="url"
    placeholder="https://www.instagram.com/p/ABC123/"
    className="w-full px-3 py-2 border rounded"
  />
</div>
```

#### Option B: Enrichment Script
**File**: `scripts/populate-instagram-handles.ts`

```typescript
// Use LLM to find Instagram handles from chef names
// Or manual CSV import of known handles
// Update database in bulk
```

---

## Implementation Checklist

### Phase 5A: Schema (PREREQUISITE)
- [ ] Create migration 016_add_instagram_post.sql
- [ ] Apply migration via Supabase dashboard
- [ ] Update database.types.ts with new column
- [ ] Run type-check to verify

### Phase 5B: Component
- [ ] Create InstagramEmbed.tsx component
- [ ] Test with sample Instagram post URL
- [ ] Handle loading/error states gracefully
- [ ] Ensure responsive design

### Phase 5C: Integration
- [ ] Update chef page query to include featured_instagram_post
- [ ] Update ChefData interface
- [ ] Add Instagram section to chef page
- [ ] Position below TV Appearances, above Restaurants
- [ ] Lazy-load component (below fold)

### Phase 5D: Data
- [ ] Populate instagram_handle for top chefs (manual or enrichment)
- [ ] Add featured Instagram post URLs (admin UI or script)
- [ ] Test with 5-10 real chef profiles
- [ ] Verify embeds load correctly

### Phase 5E: Production
- [ ] Run type-check
- [ ] Test on staging
- [ ] Deploy to production
- [ ] Monitor embed performance

---

## Technical Notes

### Instagram oEmbed API
- **Endpoint**: `https://api.instagram.com/oembed/?url={POST_URL}`
- **No auth required** for public posts
- **Max width**: 500px (responsive)
- **Response**: HTML iframe code
- **Docs**: https://developers.facebook.com/docs/instagram/oembed

### Simple Iframe Alternative
- **URL pattern**: `https://www.instagram.com/p/{POST_ID}/embed/`
- **No API call needed**
- **More predictable** (no network dependency)
- **Still legal** (official Instagram embed)

### Performance Considerations
- Lazy-load below fold (Instagram script is ~100KB)
- Only load if `featured_instagram_post` exists
- Consider IntersectionObserver for true lazy loading
- Single embed per page (not in grids)

### Legal Safety
- ✅ Official Instagram embeds explicitly allowed by Instagram
- ✅ No copyright violation (embedding ≠ downloading)
- ✅ No hosting of content on our servers
- ✅ No scraping or unofficial APIs

---

## Success Metrics

### Coverage Goals
- **Phase 1**: 10-20 top chefs with Instagram posts (pilot)
- **Phase 2**: 50-100 chefs (major coverage)
- **Target**: 60%+ of chefs with active Instagram presence

### User Experience
- Embed loads within 2 seconds
- No layout shift (reserve space while loading)
- Graceful fallback (hide section if embed fails)
- Mobile-responsive (500px max width)

### SEO Impact
- Embeds don't hurt SEO (iframes are neutral)
- Fresh content signals to Google (if posts are recent)
- Social proof (shows active chef presence)

---

## Related Files

### Existing Components
- `src/components/icons/InstagramIcon.tsx` - Icon for fallback links
- `src/components/chef/ChefHero.tsx` - Uses Instagram link fallback
- `src/app/chefs/[slug]/page.tsx` - Chef detail page

### Database
- `supabase/migrations/003_add_seo_page_fields.sql` - Added instagram_handle column
- `src/lib/database.types.ts` - TypeScript types

### Documentation
- `/memory-bank/development/photo-legal-compliance.md` - Legal analysis
- `/memory-bank/development/activeContext.md` - Current sprint status

---

## Next Actions (Immediate)

1. **Create migration 016** - Add featured_instagram_post column
2. **Apply migration** - Via Supabase dashboard
3. **Update types** - database.types.ts
4. **Create component** - InstagramEmbed.tsx
5. **Integrate** - Add to chef detail page
6. **Test** - With 2-3 sample Instagram posts
7. **Populate data** - Add handles + posts for 10 top chefs
8. **Deploy** - Production release

**Estimated effort**: 3-4 hours for complete implementation + testing
