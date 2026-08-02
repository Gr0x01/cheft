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
- **SEO recovery — code complete, waiting on Google.** The baseline problem was **693 of 4,318
  pages indexed (16%)**, the ceiling on all traffic. Every fix is shipped and verified in
  production as of 2026-08-02; what remains is resubmitting in Search Console and then waiting
  weeks for recrawl. Full detail and the measurements live in [[seo-recovery]] — **read it
  before touching anything SEO-related**, it documents several traps that look like bugs.
- UI polish and mobile responsiveness before launch. `npm run test:e2e` is **green (55/55)** as
  of 2026-08-02 — the failures were stale test expectations, not product bugs.

## Next step

- **Everything is deployed and production-verified.** Nothing is waiting to ship.
- **RB to do, in Search Console:** resubmit the sitemap and start validation for the
  Not found (404) issue. This is the last step of the recovery and it needs his login.

Deploy note: the bare homepage URL can serve up-to-an-hour-stale CDN copies (ISR
revalidate 3600) — cache-bust with a query param before concluding a deploy didn't land.

## Performance: stopped deliberately

Desktop **96** (was 68), mobile **74–80 across runs** (was 39), SEO 100 on both. Field data
(CrUX, real users) is green throughout: LCP 1.3s mobile / 1.1s desktop, CLS 0.

Work stopped here on purpose. The mobile lab score swings ±6 between runs on identical code,
and one metric (LCP) moved the wrong way in the last run without a confident explanation — see
[[seo-recovery]] for what was measured and what stayed unresolved. Indexing is worth far more
than another 10 lab points; don't resume this before the Search Console work.

If mobile is picked up again, the lever is the app shell — ~101 KiB unused JS and 23 KiB legacy
JS, i.e. splitting `HomePage.tsx`'s client bundle. That's a scoped project, not a tweak.

## Other post-deploy checks

- Watch `/restaurants` Core Web Vitals. Re-measure before doing pagination work — the payload
  fix (45.9MB → 2.5MB) may have already resolved it.

## After SEO

- Two show configs are enriched-ready but unrun (Top Chef Canada, Just Desserts) — see
  [[show-enrichment-status]].

## Open questions
- **Chef photo coverage is 13%** (61 of 458, re-counted 2026-08-02 after six accent-duplicate
  chefs were merged). Wikipedia is tapped out — the rest have no article. Decide before launch
  whether initials/Instagram fallback is good enough, or budget for licensed headshots. See
  [[enrichment-reference]].

## Orientation
- Commands, admin URLs, and the add-a-show runbook: [[runbook]]
- Stack, deploys, LLM model names + pricing: [[tech-stack]] and [[llm-models]]
- Shipped-milestone history: [[progress]]
