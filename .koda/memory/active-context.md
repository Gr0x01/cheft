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
- **SEO recovery.** Traffic plateaued ~May 2026 at 700–1,300 visitors/week (PostHog, ~50% organic).
  Root cause found: browse pages shipped zero crawlable links. Fixed but **not yet deployed** —
  see [[seo-recovery]] for the diagnosis, the fix list, and what's still open.
- UI polish, mobile responsiveness, and a clean `npm run test:e2e` pass before launch.

## Next step
- **`npm run build` fails locally** on `/_global-error` — a Next 16 bug with no app-level
  workaround (vercel/next.js#94667), likely Node 24 only; Vercel has been building fine for
  8 months. Confirm on a Vercel preview deploy before trusting a local red build. Details in [[seo-recovery]].
- Then: remaining SEO items 2 and 4 (thin show pages, internal linking) in [[seo-recovery]].
- Two show configs are enriched-ready but unrun (Top Chef Canada, Just Desserts) — see [[show-enrichment-status]].

## Open questions
- **Chef photo coverage is 14%** (63/464) after the Aug 2 2026 Wikimedia backfill. Wikipedia is tapped out — the other 401 have no article. Decide before launch whether initials/Instagram fallback is good enough, or budget for licensed headshots. See [[enrichment-reference]].
- **Duplicate chef rows are live** — José Andrés and Albert Adrià each matched twice during the backfill, i.e. they exist twice in `chefs`. `duplicate_candidates` holds 123 rows; `npm run merge-duplicate-chefs` exists but hasn't been run recently.
- **Restaurant counts grew past what the SEO pages assume** — 1,293 restaurants vs. the "700+ pages" figure in [[progress]]. Worth re-checking sitemap/page counts before launch.

## Orientation
- Commands, admin URLs, and the add-a-show runbook: [[runbook]]
- Stack, deploys, LLM model names + pricing: [[tech-stack]] and [[llm-models]]
- Shipped-milestone history: [[progress]]
