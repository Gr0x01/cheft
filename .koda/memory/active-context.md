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
- UI polish, mobile responsiveness, and a clean `npm run test:e2e` pass before launch.

## Next step

- Deploy the complete SEO batch: 299 legacy redirects, homepage Popular Restaurants links,
  the OG image fallback, and weekly detail-page revalidation. Plausible is confirmed working.

## Post-deploy checks

- Resubmit the sitemap and start Search Console validation for the repaired 404s.
- Watch `/restaurants` Core Web Vitals after making all restaurant links server-rendered;
  paginate or cap the first page if its added weight causes a regression.

## After SEO

- Two show configs are enriched-ready but unrun (Top Chef Canada, Just Desserts) — see
  [[show-enrichment-status]].

## Open questions
- **Chef photo coverage is 14%** (63/464) after the Aug 2 2026 Wikimedia backfill. Wikipedia is tapped out — the other 401 have no article. Decide before launch whether initials/Instagram fallback is good enough, or budget for licensed headshots. See [[enrichment-reference]].
- **Duplicate chef rows are live** — José Andrés and Albert Adrià each matched twice during the backfill, i.e. they exist twice in `chefs`. `duplicate_candidates` holds 123 rows; `npm run merge-duplicate-chefs` exists but hasn't been run recently.

## Orientation
- Commands, admin URLs, and the add-a-show runbook: [[runbook]]
- Stack, deploys, LLM model names + pricing: [[tech-stack]] and [[llm-models]]
- Shipped-milestone history: [[progress]]
