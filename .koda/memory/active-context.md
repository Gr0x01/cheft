---
name: active-context
description: where Cheft stands right now — current focus, next step, open questions
Last-Updated: 2026-08-02
Maintainer: RB
---

# Active Context

**Cheft** — public directory of restaurants owned by TV-competition chefs. Live on
Vercel, Supabase Postgres behind it. Phase: pre-launch polish. See [[project-brief]].

## Current focus
- **SEO recovery.** Search Console: only **693 of 4,318 known pages are indexed** (16%), and
  that's the ceiling on traffic. Diagnosis and the current recovery fixes are done; full detail,
  measurements and remaining backlog live in [[seo-recovery]] — read it before touching SEO.
- UI polish and mobile responsiveness before launch. `npm run test:e2e` is **green (55/55)** as
  of 2026-08-02 — the failures were stale test expectations, not product bugs.

## Next step

- **Everything is deployed.** The second batch (homepage perf, city backfill, ≥3 location
  threshold, `is_primary` fixes) was pushed 11:19 CDT Aug 2 and verified live at 15:45: the
  winners row is server-rendered in production HTML on the new deployment. Note the bare
  homepage URL can serve up-to-an-hour-stale CDN copies (ISR revalidate 3600) — cache-bust
  with a query param before concluding a deploy didn't land.
- **RB to do, in Search Console:** resubmit the sitemap and start validation for the
  Not found (404) issue.

## Post-deploy checks

- **Re-run PageSpeed on mobile.** Desktop is done at **96** (was 68). Mobile sat at 76 with
  TBT 0ms but FCP 3.2s / LCP 4.8s — traced to a render-blocking Google Fonts `@import` and
  fixed by moving to `next/font`, which deployed after that measurement. Field data (CrUX) is
  green on both regardless.
- Sitemap, redirects, thin/substantial location metadata and the new city pages were all
  spot-checked live on 2026-08-02 — see [[seo-recovery]] for the figures.
- Watch `/restaurants` Core Web Vitals. Re-measure before doing pagination work — the payload
  fix (45.9MB → 2.5MB) may have already resolved it.

## After SEO

- Two show configs are enriched-ready but unrun (Top Chef Canada, Just Desserts) — see
  [[show-enrichment-status]].

## Open questions
- **Chef photo coverage is 14%** (63/464) after the Aug 2 2026 Wikimedia backfill. Wikipedia is tapped out — the other 401 have no article. Decide before launch whether initials/Instagram fallback is good enough, or budget for licensed headshots. See [[enrichment-reference]].

## Orientation
- Commands, admin URLs, and the add-a-show runbook: [[runbook]]
- Stack, deploys, LLM model names + pricing: [[tech-stack]] and [[llm-models]]
- Shipped-milestone history: [[progress]]
