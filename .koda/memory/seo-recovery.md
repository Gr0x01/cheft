---
name: seo-recovery
description: why only 16% of pages are indexed, the crawlability and thin-content fixes applied, the next/script and is_public traps, and what's still open
Last-Updated: 2026-08-02
Maintainer: RB
---

# SEO Recovery

Diagnosis and fix work started 2026-08-02, prompted by traffic being lower than expected
after months live.

**Deploy state as of 2026-08-02:** all code is committed and on `origin/main`, but production
still serves the old build. Migrations 047 and 048 were applied **directly to production
Supabase** (via the Supabase MCP), so the database is ahead of the deployed code — a benign
mismatch, but read [[active-context]] before assuming what's live. Both migrations are
idempotent, so re-running them through any other pipeline is safe.

## The measurement

PostHog (project "Cheft", id 261651), 30 days to 2026-08-02: 4,193 visitors / 9,368 views /
4,475 sessions, bounce 24.6%, avg session 107s. Channel split: 51% Organic Search, 49% Direct.
Weekly visitors grew Feb→May 2026 then **flatlined at 700–1,300/week**.

Engagement is healthy; discovery is the problem. Organic entries land on chef/restaurant/city
detail pages, which are genuinely good (500–800 words, strong JSON-LD, unique canonicals).

Note the flat *visitors* line does not mean indexing stalled — Search Console shows indexed
pages nearly doubling over the same period (below). The site is being indexed slowly from a
small base, not frozen.

## Search Console confirms it: 16% of pages are indexed

Search Console **is** verified for cheft.app. Figures from the 2026-08-02 export:

- **693 indexed / 3,625 not indexed** — a 16% indexation rate, and the ceiling on everything
  else. Indexed is **growing, not stalled**: 354 → 693 over 2026-05-03 → 07-23. Impressions
  2,289 → 2,974. 3,872 search clicks over the quarter.
- Core Web Vitals: 135 Good on mobile and desktop, 0 poor. Breadcrumbs and review snippets
  are both being picked up.

Reasons the 3,625 aren't indexed:

| Reason | Pages | Read |
|---|---|---|
| Crawled – currently not indexed | **1,616** | Fetched, judged not worth indexing — a *quality* verdict |
| Not found (404) | **1,417** | Historical URL churn; Google is aging these out |
| Discovered – currently not indexed | 512 | Never crawled — crawl budget / discovery |
| Page with redirect | 57 | |
| Soft 404 | 16 | 200 responses with no real content |
| Duplicate / other | 7 | |

**"Crawled – currently not indexed" is the largest bucket, so thin content outranks
crawlability as the problem.** The 512 discovered-not-crawled is the part the browse-page fix
addresses directly.

Checked and ruled out as 404 sources:

- Query-param filter URLs — "Alternate page with proper canonical tag" is **0**, so Google
  isn't crawling them at all.
- Non-public shows — the `is_public` filter lives only in `generateStaticParams`, not in
  `db.getShow()`, so all 192 shows return **200**. They aren't 404s. See the `is_public`
  warning below before acting on that flag.
- A `/city/` → `/cities/` style route rename — no singular routes ever existed in git history.
- The current sitemap — 50 URLs sampled across every type, all 200.

So the 1,417 are old slugs from re-slugged or deleted entities. There is **no slug-redirect
handling anywhere**, so every re-slug leaves a permanent 404. Identifying them needs the URL
list exported from the Search Console Pages report; the CSV export only gives counts.

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

## `shows.is_public` is stale — never gate indexing on it

It looks like a publish flag. It isn't, and acting on it breaks live traffic pages:

| Show | Chefs | `is_public` | Visitors (90d) |
|---|---|---|---|
| Chopped | 68 | **false** | 22 |
| Beat Bobby Flay | 59 | **false** | 83 |
| Iron Chef America | 42 | **false** | 23 |
| Guy's Grocery Games | 38 | **false** | 19 |
| 24 in 24: Last Chef Standing | 16 | **false** | 62 |
| Top Chef Charlotte | **0** | true | 7 |

An attempt to make the show/season/winners pages 404 on `!is_public` was written and reverted
after testing showed it 404'd Beat Bobby Flay and Chopped.

**Cause, confirmed:** the column DEFAULTs to `false`, and all 165 unpublished shows were
created in one bulk ingest (2025-12-01..17). Only 27 were ever flipped by hand. The flag
records "nobody got round to it", not curation.

**Fixed 2026-08-02** by `supabase/migrations/047_publish_substantial_shows.sql`, which
published the 48 shows meeting the same ≥3-chef bar the app uses for indexing (one-way; it
unpublishes nothing, and carries its own rollback slug list). Results:

- `shows.is_public` true: 27 → 75.
- `/shows` index: 10 → **51 shows**, now including Chopped, Beat Bobby Flay, Iron Chef
  America, Hell's Kitchen and MasterChef, which were previously orphaned from all internal
  linking despite earning traffic.
- `generateStaticParams` prerenders 75 shows instead of 27.
- Sitemap unchanged at 2,123 — it keys on chef count, not this flag, by design.

**Drift closed 2026-08-02** by `048_stop_show_visibility_drift.sql`, in two halves:

1. `is_public` now DEFAULTs to **true**, so a new show is visible unless an admin hides it —
   "nobody got round to it" can no longer mean invisible.
2. `get_shows_with_counts` raised its bar from `chef_count > 0` to `>= 3`, so flipping the
   default can't let thin new shows pollute `/shows`. **This duplicates
   `MIN_INDEXABLE_SHOW_CHEFS` from `src/lib/showIndexing.ts` in SQL — move both together.**

No-op against current data (all 51 index shows already had ≥3 chefs). The admin toggle at
`/admin/shows` is untouched: the RPC still requires `is_public = true`, so Hide still hides.

## Shipped: chef count, not is_public, decides indexing

Show pages are a grid of chefs, so chef count is the honest proxy for content depth.
`src/lib/showIndexing.ts` holds the threshold (`MIN_INDEXABLE_SHOW_CHEFS = 3`).

Distribution: 3 shows with 0 chefs, 123 with 1–2, 31 with 3–5, 18 with 6–15, 17 with 16+.
So **126 of 192 shows are thin**. Threshold validated against 90 days of PostHog: every show
earning meaningful traffic has ≥5 chefs, so a cut at 3 keeps margin.

- Show page emits `robots: noindex, follow` below the threshold — out of the index, still
  crawlable, still passing equity to the chef pages it links.
- Sitemap submits only shows at or above it, and only their seasons. A show page also lists
  its child shows' chefs, so those count toward the parent.
- Sitemap went 2,282 → 2,123 URLs (126 shows + 33 seasons dropped). Verified `test-show`,
  `chef-hunter`, `top-chef-charlotte` are noindexed and absent; Chopped, Beat Bobby Flay and
  Tournament of Champions still indexable and present.

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

1. **Verify the deploy.** The code is on `origin/main` but production still serves the old
   build — live `/restaurants` has 0 crawlable links and the live sitemap still lists 192
   shows. RB must check the Vercel dashboard (never run the Vercel CLI on this project); a
   failed build is plausible given the `_global-error` bug above. Nothing here can be
   measured until this is resolved.
2. **`/suggest` 404s** — linked from 89 state and country hub pages; no such route exists.
3. **Header nav** — `/cities`, `/states` and `/countries` are footer-only, though the state
   hubs are the site's strongest crawl path. (The `/shows` index orphaning is fixed: 10 → 51.)
4. **Sitemap gaps** — `/cities` missing from static routes; the `restaurant_count >= 3`
   filter excludes ~122 real city pages; show/season `lastModified` is build time, not
   content time, which trains Google to distrust every `lastmod` in the file.
5. **Homepage wastes its equity** — client-side Leaflet map, only ~4 restaurant links in HTML.
6. No OG image anywhere; no `revalidate` on the two detail routes, so entities beyond the
   `generateStaticParams` caps (500 restaurants / 200 chefs) cache indefinitely.
7. **1,417 404s** still unidentified — needs the URL list exported from the Search Console
   Pages report.

Full original audit findings, including what's already good, live in this note's history.
