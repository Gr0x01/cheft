---
name: seo-recovery
description: why organic traffic plateaued, the crawlability fix that was applied, and what's still open
Last-Updated: 2026-08-02
Maintainer: RB
---

# SEO Recovery

Diagnosis and fix work started 2026-08-02, prompted by traffic being lower than expected
after months live. **Applied locally, not yet deployed.**

## The measurement

PostHog (project "Cheft", id 261651), 30 days to 2026-08-02: 4,193 visitors / 9,368 views /
4,475 sessions, bounce 24.6%, avg session 107s. Channel split: 51% Organic Search, 49% Direct.
Weekly visitors grew Feb→May 2026 then **flatlined at 700–1,300/week** — the shape of a site
whose initial indexing wave finished and then found nothing new to crawl.

Engagement is healthy; discovery is the problem. Organic entries land on chef/restaurant/city
detail pages, which are genuinely good (500–800 words, strong JSON-LD, unique canonicals).

## Root cause: browse pages had zero crawlable links

`useSearchParams()` in the filter hooks de-opts its whole Suspense subtree to client
rendering. The card grid sat **inside** that boundary, so prerendered HTML contained only a
loading skeleton. Verified live with a Googlebot UA: `/restaurants` shipped 2.2 MB of HTML
with **0** restaurant links (of ~1,294).

**Fix:** the Suspense boundary now wraps only the filter bar; the grid renders as a sibling
outside it. Applied to `RestaurantsPageClient`, `ChefsPageClient`, `CityPageClient`,
`ShowPageClient`, with a shared `components/ui/FilterBarSkeleton.tsx` fallback.

Verified against the dev server — unique links now in HTML:

| Page | Before | After |
|---|---|---|
| `/restaurants` | 0 | 1,293 |
| `/chefs` | 0 | 464 |
| `/cities/new-york-ny` | 0 | 97 |
| `/shows/top-chef` | 5 | 217 |

**Watch the page weight.** `/restaurants` now renders all 1,293 cards. Pagination or a
capped first page is the likely follow-up if Core Web Vitals suffer.

## Never use next/script in this app

`next/script` reads `HeadManagerContext` during render and **intermittently crashes static
prerendering** under Next 16 — "Cannot read properties of null (reading 'useContext')",
failing whichever page a build worker happened to hit, so the error appears to move around.

Both users were removed in favour of plain server-rendered `<script>` tags:
- `components/GoogleAnalytics.tsx` — inline gtag.
- `components/PlausibleAnalytics.tsx` — replaces `next-plausible`'s `<PlausibleProvider>`.
  `next-plausible` stays a dependency purely for `withPlausibleProxy()` in `next.config.ts`;
  the component hand-rolls exactly what the provider emitted, so the proxy still works.
  **Paths must stay in sync with those rewrites**: script `/js/script.js`, API `/proxy/api/event`.

## Known blocker: `_global-error` won't prerender

`npm run build` fails on `/_global-error` with the same useContext error. Ruled out by
bisection: next/script, PostHogProvider, GoogleAnalytics, custom vs default global-error,
client vs server component, `force-dynamic`, clean cache, Next 16.0.7→16.2.12,
React 19.2.1→19.2.8. All version bumps were reverted; deps are back at their original pins.

This matches [vercel/next.js#94667](https://github.com/vercel/next.js/discussions/94667) —
reported as unfixable from application code. Local Node is **24.6.0**; Vercel builds on
Node 20/22 and has shipped 126 commits over 8 months on Next 16, so this is very likely
local-only. Confirm on a Vercel preview before treating it as a deploy blocker.

`src/app/global-error.tsx` was added along the way (the app had none) — deliberately free of
context and providers, since global-error replaces the root layout.

## Also fixed

- Removed a bogus `google-site-verification` meta whose content was `"index, follow, noai"` —
  not a token. Would have broken HTML-tag verification in Search Console.
- Removed a second `robots` meta that conflicted with the structured `robots` field. The
  `noai, noimageai` directives still ship as an `X-Robots-Tag` header from middleware.
- Two rules-of-hooks violations: conditional `useState`/`useMemo` in `ShowPageClient`'s
  `SeasonLinks`, and a `useEffect` after an early return in `InstagramEmbed`.

## Still open, in priority order

1. **~180 thin show pages** — e.g. `/shows/chef-hunter` has ~20 unique words. All submitted
   in the sitemap, including non-public shows and a live `/shows/test-show`. A large block of
   near-duplicate thin pages depresses sitewide quality. Prune, consolidate, or noindex; and
   filter `sitemap.ts` by `is_public` (it doesn't, though `generateStaticParams` does).
2. **Orphaned shows** — `/shows` index links only 10 of ~187. Add `/cities`, `/states`,
   `/countries` to the header nav too (currently footer-only).
3. **`/suggest` 404s** — linked from 89 state/country hub pages; no such route exists.
4. **Sitemap gaps** — `/cities` missing from static routes; the `restaurant_count >= 3`
   filter excludes ~122 real city pages; show/season `lastModified` is build time, not
   content time, which trains Google to distrust every `lastmod` in the file.
5. **Homepage wastes its equity** — client-side Leaflet map, only ~4 restaurant links in HTML.
6. **Is Google Search Console verified?** Unanswered, and we're blind on indexing without it.
7. No OG image anywhere; no `revalidate` on the two detail routes, so entities beyond the
   `generateStaticParams` caps (500 restaurants / 200 chefs) cache indefinitely.

Full original audit findings, including what's already good, live in this note's history.
