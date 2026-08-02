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
  that's the ceiling on traffic. Diagnosis and six code/data fixes are done; full detail,
  measurements and remaining backlog live in [[seo-recovery]] — read it before touching SEO.
- UI polish, mobile responsiveness, and a clean `npm run test:e2e` pass before launch.

## Next step — verify the deploy before doing anything else

Work through 2026-08-02 is **committed and on `origin/main`**, but production is **still
serving the old build** (live `/restaurants` has 0 crawlable links; live sitemap still lists
192 shows instead of 66). So the deploy either hasn't triggered, is mid-flight, or failed.

1. **RB: check the Vercel dashboard.** Never run the Vercel CLI on this project. A failed
   build is a live possibility — `npm run build` fails locally on `/_global-error`, a Next 16
   bug with no app-level workaround (vercel/next.js#94667). It's *probably* local-only
   (Node 24.6.0 here; Vercel is on 20/22 and has built fine for eight months), but that is an
   assumption, not a verified fact.
2. Once deployed, confirm: `/restaurants` serves ~1,293 crawlable links, thin show pages
   return `noindex`, sitemap drops to ~2,123 URLs, and **Plausible still records** (its
   script tags were hand-rolled — see [[analytics-setup]]).
3. Then resubmit the sitemap in Search Console and watch whether "crawled – currently not
   indexed" (1,616) starts falling.

**Heads-up: the database is ahead of the deployed code.** Migrations 047 and 048 were applied
straight to production Supabase, so 75 shows are public and the `/shows` index RPC already
requires ≥3 chefs, while the old code is still being served. The mismatch is benign — the DB
changes only improve the old behaviour — but expect `/shows` to jump from 10 to 51 links on
its own once ISR expires, independent of any deploy.

## After that
- Remaining SEO backlog: `/suggest` 404s, header nav, sitemap gaps, homepage rendering,
  OG image, `revalidate` on detail routes — itemised and prioritised in [[seo-recovery]].
- Two show configs are enriched-ready but unrun (Top Chef Canada, Just Desserts) — see
  [[show-enrichment-status]].

## Open questions
- **1,417 pages return 404** to Google — old slugs from re-slugged or deleted entities, and
  there is no slug-redirect handling anywhere in the app. Needs the URL list exported from
  the Search Console Pages report to act on; the CSV export only gives counts.
- **Chef photo coverage is 14%** (63/464) after the Aug 2 2026 Wikimedia backfill. Wikipedia is tapped out — the other 401 have no article. Decide before launch whether initials/Instagram fallback is good enough, or budget for licensed headshots. See [[enrichment-reference]].
- **Duplicate chef rows are live** — José Andrés and Albert Adrià each matched twice during the backfill, i.e. they exist twice in `chefs`. `duplicate_candidates` holds 123 rows; `npm run merge-duplicate-chefs` exists but hasn't been run recently.

## Orientation
- Commands, admin URLs, and the add-a-show runbook: [[runbook]]
- Stack, deploys, LLM model names + pricing: [[tech-stack]] and [[llm-models]]
- Shipped-milestone history: [[progress]]
