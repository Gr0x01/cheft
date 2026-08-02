---
Last-Updated: 2025-12-05
Maintainer: RB
Status: Phase 1 Complete
Phase: 1 - Entity Editors (✅ SHIPPED)
---

# Admin Panel UI/UX Overhaul

## Project Overview

Comprehensive redesign of the admin panel to transform it from basic table views into a full-featured editorial control center with unified entity editing, advanced data quality tools, and bulk operations.

## Problem Statement

The current admin panel was built incrementally and has several pain points:

1. **No unified edit page** - Cannot edit all chef/restaurant fields in one place
2. **Missing fields in UI** - Many database fields not exposed (career_narrative, cookbook_titles, youtube_channel, current_role, mentor, notable_awards, james_beard_status, etc.)
3. **Scattered actions** - Photo upload, bio enrichment, Instagram editing in separate modals
4. **Limited data discovery** - Can't filter by field completeness or data quality
5. **No bulk operations** - Must edit items one at a time
6. **Inconsistent design** - Some pages use Industrial Editorial aesthetic, others don't

**Most-Used Pages:**
- `/admin/data` - Data completeness dashboard (read-only)
- `/admin/manage` - Chef/restaurant management (basic tables with limited inline actions)

## Design Philosophy: Industrial Editorial

**Vision:** Publication control center meets data factory

**Aesthetic:**
- Copper accent colors (#B87333) for primary actions
- Slate backgrounds with subtle grid patterns
- Monospace typography (JetBrains Mono) for data fields
- Display font for headings
- Layered cards with drop shadows
- Icon-driven UI with semantic color coding
- Status badges with clear visual hierarchy

**Inspiration:** Matches the `/admin/enrichment-jobs` page aesthetic

## Architecture

### Database Schema (Reference)

**Chefs Table (20+ fields):**
```typescript
{
  // Identity
  id: string
  name: string
  slug: string
  country: string | null
  current_role: string | null
  mentor: string | null
  
  // Biography
  mini_bio: string | null
  career_narrative: string | null
  
  // Media
  photo_url: string | null
  photo_source: "wikipedia" | "manual" | null
  instagram_handle: string | null
  featured_instagram_post: string | null
  
  // Accolades
  james_beard_status: "semifinalist" | "nominated" | "winner" | null
  notable_awards: string[] | null
  
  // Content
  cookbook_titles: string[] | null
  youtube_channel: string | null
  
  // Metadata
  enrichment_priority: number | null
  manual_priority: boolean | null
  last_verified_at: string | null
  narrative_generated_at: string | null
  created_at: string
  updated_at: string
}
```

**Restaurants Table (18+ fields):**
```typescript
{
  // Identity
  id: string
  name: string
  slug: string
  chef_id: string | null
  
  // Location
  address: string | null
  city: string
  state: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  
  // Details
  cuisine_type: string | null
  price_tier: "$" | "$$" | "$$$" | "$$$$" | null
  status: "open" | "closed" | "temporarily_closed" | null
  is_public: boolean
  
  // Google Data
  google_place_id: string | null
  google_rating: number | null
  google_review_count: number | null
  google_url: string | null
  photo_urls: string[] | null
  
  // Prestige
  michelin_stars: number | null
  
  // Metadata
  last_verified_at: string | null
}
```

## Implementation Plan

### Phase 1: Unified Entity Editors (✅ COMPLETE - Dec 5, 2025)

**Goal:** Single-page editing for all entity fields ✅

**Shipped Routes:**
- `/admin/manage/chefs/[id]` - Full chef editor (20+ fields)
- `/admin/manage/restaurants/[id]` - Full restaurant editor (18+ fields)

**Implemented Features:**
1. ✅ **Organized field sections** with collapsible panels (FieldSection component)
2. ✅ **Real-time validation** with field-level error states (TextField, TextArea, SelectField, MultiInput)
3. ✅ **Quick actions bar** (Save, Discard, View Live)
4. ✅ **XSS protection** via input sanitization
5. ✅ **Array validation** (max length, special char filtering)
6. ✅ **Edit buttons** added to ChefTable and RestaurantTable

**Components Shipped:**
```
/src/components/admin/forms/
  ✅ FieldSection.tsx          - Collapsible section wrapper (68 lines)
  ✅ TextField.tsx             - Text input with validation (97 lines)
  ✅ TextArea.tsx              - Textarea with character count (128 lines)
  ✅ MultiInput.tsx            - Array field editor with validation (163 lines)
  ✅ SelectField.tsx           - Dropdown with custom styling (99 lines)
  ❌ RichTextEditor.tsx        - Deferred (not needed for MVP)
```

**Total:** 5 components, 555 lines

### Phase 1 Results

**Commit:** `b241a52` - Dec 5, 2025  
**Files Changed:** 11 files, +1,386 lines  
**Security Hardened:** XSS protection, array validation, error sanitization  
**Type Safety:** All TypeScript checks passing  

**Code Review:** Reviewed by code-reviewer subagent
- 3 critical security issues identified and fixed
- 3 medium issues acknowledged (intentionally deferred for MVP)
- Verdict: "Robust admin panel for internal use"

### Phase 2: Enhanced Data Dashboard (NEXT)

**Goal:** Interactive data quality control center

**Improvements to `/admin/data`:**
1. **Interactive charts** - SVG donut charts showing completeness (not just bars)
2. **Drill-down views** - Click any stat to see which entities need work
3. **Quick-fix actions** - "Enrich Missing 10" buttons
4. **Field-level breakdown** - See completeness per field, not just per category
5. **Export functionality** - Download data quality reports as CSV

**New Components:**
```
/src/components/admin/data-quality/
  ├── CompletenessChart.tsx     - SVG donut chart with animations
  ├── FieldBreakdown.tsx        - Drill-down list component
  └── QuickFixButton.tsx        - One-click enrichment trigger
```

### Phase 3: Advanced Manage Features

**Goal:** Power-user tools for batch operations

**Enhancements to `/admin/manage`:**
1. **Multi-select mode** - Checkbox selection with bulk actions
2. **Advanced filters sidebar** - Filter by completeness, status, source, dates
3. **List/Grid toggle** - Visual card view vs. data table view
4. **Column customization** - Show/hide columns, save layouts
5. **Inline editing** - Double-click cells to edit simple fields
6. **Quick preview** - Hover cards showing entity details

**Bulk Actions:**
- Bulk enrich (photos, bios, shows, restaurants)
- Bulk priority update
- Bulk export to CSV
- Bulk delete/archive

**New Components:**
```
/src/components/admin/table/
  ├── BulkActionBar.tsx         - Floating bar for multi-select
  ├── ColumnCustomizer.tsx      - Show/hide column picker
  ├── FilterSidebar.tsx         - Advanced filter panel
  └── InlineEditor.tsx          - Double-click cell editing
```

### Phase 4: Design Polish & Testing

**Goal:** Production-ready, accessible, performant

**Tasks:**
1. Design system consistency pass (all pages match Industrial Editorial)
2. Accessibility audit (ARIA labels, keyboard nav, screen reader testing)
3. Playwright E2E tests for critical flows
4. Performance optimization (lazy loading, virtualization for long lists)
5. Mobile responsiveness check (admin panel is desktop-first, but should degrade gracefully)

## Success Metrics

- ✅ All 20+ chef fields and 18+ restaurant fields exposed in UI
- ✅ Single-page editing reduces clicks from ~15 to ~3 per entity
- ✅ Bulk operations reduce manual work by 70%
- ✅ Field completeness visible at a glance in dashboard
- ✅ 100% design consistency across all admin pages
- ✅ Sub-2s page load times for all admin routes
- ✅ Zero accessibility violations in Lighthouse audit

## File Structure

### New Files
```
/src/app/admin/(protected)/manage/
  ├── chefs/
  │   └── [id]/
  │       ├── page.tsx                    - Server component (data fetching)
  │       ├── ChefEditorForm.tsx          - Client form component
  │       └── ChefEditorSections.tsx      - Collapsible sections
  ├── restaurants/
  │   └── [id]/
  │       ├── page.tsx                    - Server component
  │       ├── RestaurantEditorForm.tsx    - Client form
  │       └── RestaurantEditorSections.tsx - Sections

/src/components/admin/forms/
  ├── FieldSection.tsx
  ├── TextField.tsx
  ├── TextArea.tsx
  ├── MultiInput.tsx
  ├── SelectField.tsx
  └── RichTextEditor.tsx

/src/components/admin/data-quality/
  ├── CompletenessChart.tsx
  ├── FieldBreakdown.tsx
  └── QuickFixButton.tsx

/src/components/admin/table/
  ├── BulkActionBar.tsx
  ├── ColumnCustomizer.tsx
  ├── FilterSidebar.tsx
  └── InlineEditor.tsx
```

### Modified Files
```
/src/app/admin/(protected)/manage/
  ├── page.tsx                - Add filters, multi-select, list/grid toggle
  ├── ManageTabs.tsx          - Add view mode switcher
  ├── ChefTable.tsx           - Add "Edit" button, multi-select
  └── RestaurantTable.tsx     - Add "Edit" button, multi-select

/src/app/admin/(protected)/data/
  └── page.tsx                - Add interactive charts, drill-down
```

## Implementation Notes

### Form State Management
Use React Hook Form with Zod validation for all editors:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const chefSchema = z.object({
  name: z.string().min(1, 'Name required'),
  slug: z.string().min(1, 'Slug required'),
  mini_bio: z.string().min(10, 'Bio must be at least 10 chars').nullable(),
  // ... all fields
});
```

### API Routes
Create new API endpoints for unified updates:
```
/api/admin/chefs/[id]          - GET, PUT, DELETE
/api/admin/restaurants/[id]    - GET, PUT, DELETE
/api/admin/bulk-enrich         - POST (bulk enrichment)
```

### Audit Trail
Log all changes to `data_changes` table with confidence score:
```sql
INSERT INTO data_changes (table_name, record_id, change_type, old_data, new_data, source, confidence)
VALUES ('chefs', $1, 'update', $2, $3, 'manual', 1.0);
```

### Testing Strategy
1. Unit tests for form validation (Zod schemas)
2. Component tests for form sections (Jest + RTL)
3. E2E tests for critical flows (Playwright):
   - Edit chef → Save → Verify public page
   - Bulk enrich → Check job status
   - Filter by completeness → Edit missing field

## Timeline

- **Week 1**: Reusable form components + Chef editor
- **Week 2**: Restaurant editor + API integration
- **Week 3**: Enhanced data dashboard
- **Week 4**: Advanced manage features (filters, bulk actions)
- **Week 5**: Design polish, testing, documentation

## Related Documentation

- `/memory-bank/architecture/enrichment-system.md` - LLM enrichment workflows
- `/memory-bank/architecture/patterns.md` - Repository and service patterns
- `/.claude/skills/frontend-design/SKILL.md` - Design guidelines
- `/TESTING.md` - E2E testing best practices
