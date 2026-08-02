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

- **Deployed and production-verified 2026-08-02** — sitemap, redirects, robots metadata and
  city scoping all confirmed live; detail in [[seo-recovery]].
- **RB to do, in Search Console:** resubmit the sitemap and start validation for the
  Not found (404) issue. Both need his login; they're the last step of the recovery.

## Post-deploy checks

- Watch `/restaurants` Core Web Vitals after making all restaurant links server-rendered.
  Re-measure before doing pagination work — the homepage payload fix (45.9MB → 2.5MB, see
  [[seo-recovery]]) may have already resolved it.

## After SEO

- Two show configs are enriched-ready but unrun (Top Chef Canada, Just Desserts) — see
  [[show-enrichment-status]].

## Open questions
- **`chef_shows.is_primary` is false on all 1,298 rows**, so the winner badge never renders and
  "primary show" is an arbitrary pick for the 51.5% of chefs on more than one show — which the
  homepage show filter then filters on. Backfill the flag, or drop the code's dependence on it?
  Detail and counts in [[seo-recovery]].
- **Chef photo coverage is 14%** (63/464) after the Aug 2 2026 Wikimedia backfill. Wikipedia is tapped out — the other 401 have no article. Decide before launch whether initials/Instagram fallback is good enough, or budget for licensed headshots. See [[enrichment-reference]].

## Orientation
- Commands, admin URLs, and the add-a-show runbook: [[runbook]]
- Stack, deploys, LLM model names + pricing: [[tech-stack]] and [[llm-models]]
- Shipped-milestone history: [[progress]]
