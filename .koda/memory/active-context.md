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

- **First batch is deployed and production-verified.** A **second batch is committed but not
  pushed**: the homepage perf work, the city backfill, the ≥3 location threshold and the
  `is_primary` fixes. Push, production-check, then re-run PageSpeed.
- **Migrations 053–055 are already applied to production Supabase** — the data is live ahead of
  the code. Until the code deploys, the site is serving the old ≥1 location threshold against
  the new 414-row `cities` table, so thin city pages are briefly indexable. Deploy soon.
- **RB to do, in Search Console, only after that:** resubmit the sitemap and start validation
  for the Not found (404) issue.

## Post-deploy checks

- Re-run PageSpeed on the homepage; mobile 39 / desktop 68 predates every client-side fix.
- Spot-check the new city pages, the eight city redirects, and that thin cities are
  `noindex, follow` while 3+ ones are indexed.
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
