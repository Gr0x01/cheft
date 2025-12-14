---
Last-Updated: 2025-12-14
Maintainer: RB
Status: Active
---

# Analytics Setup

## Overview
The project uses multiple analytics platforms for different purposes:
- **Google Analytics (GA4)**: Required for ad platforms like Mediavine
- **Plausible Analytics**: Lightweight, privacy-focused page view tracking
- **PostHog**: Product analytics and session replay for user behavior insights

## Google Analytics (GA4)

### Configuration
- **Measurement ID**: G-256751L3L2
- **Implementation**: `src/components/GoogleAnalytics.tsx`
- **Integration**: Added to `src/app/layout.tsx`

GA4 provides comprehensive tracking required for monetization platforms like Mediavine. Standard pageview tracking is automatic via the gtag.js script.

## Plausible Analytics

Simple, privacy-focused analytics via the `next-plausible` package. Configured in layout.tsx with domain "cheft.app".

## PostHog Analytics

PostHog provides product analytics and session replay for understanding user behavior. Session replay is **disabled on admin routes** (`/admin/*`) for privacy.

## Installation
- **Package**: `posthog-js` v1.302+
- **Files**:
  - `src/lib/posthog.ts` - Initialization config
  - `src/components/PostHogProvider.tsx` - React provider with route-based session control
  - `src/app/layout.tsx` - Wraps app with PostHogProvider

## Configuration

### Privacy Settings
- **person_profiles**: `'identified_only'` - Only create profiles for logged-in users
- **Input Masking**: Passwords masked, other inputs captured
- **Admin Routes**: Session recording automatically stopped on `/admin` paths
- **Pageview Tracking**: Manual via route changes (capture_pageview: false)
- **Pageleave Tracking**: Enabled

### Session Replay
Enabled globally except admin panel. Records:
- DOM interactions (clicks, scrolls, form inputs)
- Network performance (optional)
- Console logs (optional)

## Dashboard Setup (PostHog UI)

### Core Metrics Dashboard
Create a dashboard named "Cheft Core Metrics" with these insights:

**1. Traffic & Engagement**
- Unique Users (Trend, Weekly/Monthly)
- Total Sessions (Trend)
- Avg Session Duration (Trend)
- Bounce Rate (Number)
- Pages per Session (Number)

**2. User Journey**
- Entry Pages (Table, top 10)
- Exit Pages (Table, top 10)
- Top Pages (Table, by pageviews)
- User Paths (Paths visualization)

**3. Content Performance**
- Chef Profile Views (Trend, filter: `$current_url contains '/chefs/'`)
- Restaurant Views (Trend, filter: `$current_url contains '/restaurants/'`)
- City Page Views (Trend, filter: `$current_url contains '/city/'`)
- Show Page Views (Trend, filter: `$current_url contains '/shows/'`)

**4. Search & Discovery**
- Map Interactions (Event: autocapture clicks on `.leaflet-marker`)
- Filter Usage (Track via custom events if added later)

**5. Conversion Goals**
- Restaurant Link Clicks (Event: clicks on external links)
- Time to First Interaction (Funnel: pageview → first click)

### Session Replay Insights Dashboard
Create "Session Replay Insights" with:

**Playlists**:
- **Rage Clicks** - Users frustrated with UI
- **Dead Clicks** - Clicks on non-interactive elements
- **Error Sessions** - Sessions with console errors
- **Long Sessions (>5min)** - Deep engagement
- **First-Time Users** - New visitor onboarding

**Filters for Review**:
- Sessions with >10 page views
- Sessions ending on exit pages
- Mobile vs Desktop comparison

## Key Metrics to Monitor

### Growth
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- User retention (7-day, 30-day)

### Engagement
- Avg session duration (target: >2 min)
- Bounce rate (target: <60%)
- Pages per session (target: >3)

### Content
- Top 10 chefs by views
- Top 10 restaurants by views
- Geographic distribution (city pages)

### User Journey
- Common paths (homepage → search vs homepage → browse)
- Drop-off points (where users leave)
- Conversion to external links (restaurant websites, maps)

## Alerts (Optional)
Set up PostHog alerts for:
- Traffic drops >50% week-over-week
- Error rate spikes (if console errors tracked)
- Bounce rate >70%

## Best Practices

### What to Track Now (MVP)
- ✅ Pageviews (autocaptured)
- ✅ Session replay (autocaptured)
- ✅ User paths (autocaptured)
- ✅ Entry/exit pages (autocaptured)

### What to Add Later
- Custom events for search queries
- Custom events for filter selections
- Custom events for map marker clicks
- Form submission tracking (contribution forms)
- External link click tracking (Google Analytics style)

### Privacy Considerations
- Admin routes excluded from session replay
- Password inputs masked
- No PII collection (email, phone) in autocapture
- Session recordings retained per PostHog plan (90 days free tier)

## Troubleshooting

### Session Replay Not Recording
1. Check Project Settings → "Record user sessions" is enabled
2. Verify `NEXT_PUBLIC_POSTHOG_KEY` is set in environment
3. Check browser console for PostHog init errors

### Admin Routes Still Recording
- Verify `/admin` path check in `PostHogProvider.tsx`
- Test by navigating to `/admin/login` and checking network tab (no `recordingData` payloads)

### Pageviews Not Tracking
- Check `PostHogProvider.tsx` pageview capture on pathname change
- Verify PostHog debugger in browser console (`posthog.debug()`)

## Environment Variables
```bash
# Required
NEXT_PUBLIC_POSTHOG_KEY=phc_...your_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com  # US region
```

## Future Enhancements
- **A/B Testing**: Feature flags for UI experiments
- **Surveys**: In-app user feedback
- **Custom Events**: Track specific user actions (search, filter, map clicks)
- **Cohort Analysis**: Segment users by behavior patterns
- **Retention Analysis**: Track returning users over time
