# Cheft — Project Memory

Public directory of restaurants owned by TV-competition chefs. Next.js on Vercel,
Supabase Postgres, LLM enrichment pipeline. Open only what you need.

- [Active context](active-context.md) — where things stand right now; read this first
- [Project brief](project-brief.md) — what Cheft is, who it's for, what's in and out of scope
- [Runbook](runbook.md) — day-to-day commands, admin panel URLs, how to add a new TV show
- [Tech stack](tech-stack.md) — Next.js/Supabase/Vercel stack, deploys, environment references
- [Enrichment quick reference](enrichment-reference.md) — enrichment API, costs, and the never-store-Google-photo-URLs rule
- [Enrichment system guide](enrichment-system.md) — the 19-file enrichment architecture and how to extend it
- [Show enrichment status](show-enrichment-status.md) — which shows are enriched, which configs are queued
- [Architecture patterns](patterns.md) — repository/service/workflow patterns, and anti-patterns to avoid
- [System design](system-design.md) — how ingestion flows through to the public SEO pages
- [RLS security](rls-security.md) — Supabase Row Level Security; which tables are locked down
- [Analytics setup](analytics-setup.md) — PostHog and Plausible wiring, custom events
- [SEO recovery](seo-recovery.md) — only 16% of pages indexed: the crawlability + thin-content fixes, the `next/script`, `is_public` and `is_primary` traps, the 45MB homepage payload fix, and the remaining backlog
- [LLM models](llm-models.md) — authoritative OpenAI model names + pricing; never change without asking RB
- `archive/` — superseded plans and long-form project history; not current, read only when digging into why something was built

RB's own writing (product strategy, the niche-directory network plan) lives in
`Documents/`, not here.
