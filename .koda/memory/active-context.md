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
- UI polish, mobile responsiveness, and a clean `npm run test:e2e` pass before launch.

## Next step
- Two show configs are enriched-ready but unrun (Top Chef Canada, Just Desserts) — see [[show-enrichment-status]].

## Open questions
- **Chef photo coverage is 5%** — only 22 of 464 chefs have a `photo_url` (21 Wikipedia, 1 manual). Restaurant photos are fine at 96%. This is the biggest content gap before launching a visual directory about chefs; no backfill script exists for chef photos yet.
- **Restaurant counts grew past what the SEO pages assume** — 1,293 restaurants vs. the "700+ pages" figure in [[progress]]. Worth re-checking sitemap/page counts before launch.

## Orientation
- Commands, admin URLs, and the add-a-show runbook: [[runbook]]
- Stack, deploys, LLM model names + pricing: [[tech-stack]] and [[llm-models]]
- Shipped-milestone history: [[progress]]
