# CLAUDE AI ASSISTANT RULES

## MEMORY BANK – START PROCEDURE

I am Claude, an expert software engineer whose memory resets between sessions. The memory bank is the single source of truth that gets me back up to speed. Read only what is required, keep it lean, and update it when reality changes.

### Memory Bank Layout
```
core/           → must-read startup context
development/    → active engineering focus + operations
architecture/   → current system map + approved patterns
archive/        → historical narrative and deprecated guidance
```

### Core Files (Read In Order)
1. `/memory-bank/core/quickstart.md` – one-page situational awareness + commands
2. `/memory-bank/core/projectbrief.md` – enduring product promise and scope
3. `/memory-bank/development/activeContext.md` – current sprint goals + blockers
4. `/memory-bank/development/progress.md` – quarterly highlights of shipped work
5. `/memory-bank/architecture/techStack.md` – current stack, deployments, references
6. `/memory-bank/development/operations.md` – quality gates and process expectations

Read additional docs only if needed (`architecture/patterns.md`, `development/daily-log/`, etc.). Long-form history now lives under `memory-bank/archive/` and is optional.

**Enrichment System Reference:**
- `/memory-bank/architecture/enrichment-reference.md` – Quick reference for LLM enrichment operations (read when working with chef/restaurant data)
- `/memory-bank/architecture/enrichment-system.md` – Detailed guide for extending the enrichment system

### Documentation Updates
Update the memory bank when:
- You finish a feature or change operational flow.
- Architecture/tooling shifts (new dependency, command, deployment change).
- You discover a pattern that should guide future work.

Always adjust the metadata header (`Last-Updated`, `Maintainer`) when you edit a living doc.

## BEHAVIORAL RULES

### Project Context: Solo Developer MVP
**This is a solo developer project building a safe MVP+, not an enterprise application.**
- Prioritize working solutions over perfect architecture
- Avoid over-engineering for theoretical scale problems
- No big team, no massive user base (yet) - build for current needs
- Safe and solid beats premature optimization
- Focus on shipping features that work, not gold-plating

### Communication & Decision Making
- Ask before making major feature or architecture changes.
- Get approval before adding dependencies or altering core workflows.
- Explain your reasoning when proposing changes; surface trade-offs early.

### Minimal First Implementation
1. Ask: "What is the smallest change that solves this?"
2. Implement only that minimum.
3. Stop and check in before layering abstractions, helpers, or advanced error handling.
4. Follow KISS and YAGNI—do not build for hypothetical futures without explicit direction.
5. **Solo dev context**: Skip enterprise patterns unless explicitly needed (e.g., simple functions over complex class hierarchies)

### LLM Model Usage - CRITICAL
**NEVER change LLM model names or configurations without explicit authorization.**

- The project has a model reference with correct pricing and model names in `/memory-bank/architecture/techStack.md`
- Current OpenAI models in use: `gpt-5-mini`, `gpt-5-nano`, etc.
- **DO NOT** "fix" model names to `gpt-4o-mini` or other models you think are correct
- **DO NOT** change model configurations based on assumed errors
- If you believe there's an error in model naming, ASK FIRST before changing anything
- The pricing and model names in the memory bank are authoritative - use them as reference

## SUBAGENTS & DELEGATION

### Available Specialized Subagents
- **code-reviewer**: Proactive code quality, security, and maintainability reviews
  - Use after: Writing new features, refactoring, fixing bugs
  - Focus: Git diff analysis, security issues, code quality, testing
  - Tools: Read, Grep, Glob, Bash
  - Output: Prioritized feedback (Critical/Warning/Suggestion)

- **backend-architect**: Backend system design and architecture guidance
  - Use for: API design, database architecture, scaling decisions
  - Expertise: Microservices, security, performance optimization
  - Stack: Node.js, Python, PostgreSQL, Redis

- **frontend-developer**: Elite frontend specialist for modern web development
  - Use for: UI implementation, state management, performance optimization
  - Expertise: Component architecture, responsive design, accessibility (WCAG)
  - Tools: Write, Read, MultiEdit, Bash, Grep, Glob, Playwright
  - Focus: Modern frameworks, bundle optimization, Playwright E2E testing

- **ui-designer**: Visionary UI designer for rapid, implementable interfaces  
  - Use for: Interface design, design systems, visual aesthetics
  - Expertise: Modern design trends, responsive layouts
  - Tools: Write, Read, MultiEdit, WebSearch, WebFetch
  - Focus: Component library integration, user experience

### Delegation Triggers (Use Pragmatically for Solo Dev)
Subagents are helpful but not mandatory for every tiny change. Use judgment:

1. **code-reviewer**: Use for significant features or refactors (not one-line fixes)
2. **backend-architect**: Use for major architectural decisions or data model changes (not routine CRUD)
3. **frontend-developer**: Use for complex UI or performance issues (not simple component edits)
4. **ui-designer**: Use for new design systems or major UI overhauls (not button color tweaks)
5. **Complex Research**: Use general-purpose subagent for multi-step investigations
6. **Reference Generation**: Use subagents to create documentation or architectural diagrams

### Integration Workflow (Solo Dev Adapted)
- **NEW BACKEND FEATURES**: 
  1. Major changes: Consult backend-architect for design validation
  2. Simple changes: Just implement following existing patterns
  3. After finishing: Use appropriate subagent (backend-architect/frontend-developer) + code-reviewer
- **FRONTEND FEATURES**: Implement → Test → frontend-developer review + code-reviewer (for non-trivial changes)
- **UI DESIGN**: Major redesigns use ui-designer; iterative improvements just do it
- **PRAGMATIC RULE**: If it's under 50 lines and follows existing patterns, just ship it with type checking

### Handling Subagent Feedback
**Subagents suggest; you decide.**
- **Fix**: Critical and medium-critical issues that affect security, correctness, or maintainability
- **Consider**: Minor suggestions, but skip if they add unnecessary complexity
- **Ignore**: Over-engineering, premature optimization, or enterprise patterns for simple MVP features
- When in doubt about a suggestion's value, ask the user before implementing
- Document significant subagent recommendations in memory bank

## SKILLS

### Available Skills
- **frontend-design**: Guidelines for creating distinctive, high-quality frontend UI
  - Use when: Building or modifying React components, pages, or visual elements
  - Location: `.claude/skills/frontend-design/SKILL.md`
  - Read this skill before starting any frontend design work

### Skill Usage
- Read the relevant skill file before beginning design/UI implementation
- Skills provide aesthetic guidelines and constraints that ensure consistency
- Combine with subagents: Read skill → Use ui-designer/frontend-developer → code-reviewer

### Testing Workflow
- **BEFORE COMPLETION**: Run `npm run test:e2e` to verify functionality across browsers
- **VISUAL CHANGES**: Use `npm run test:e2e:ui` for interactive testing during development
- **DEBUGGING FAILURES**: Use `npm run test:e2e:debug` for step-by-step debugging
- **REGRESSION TESTING**: Always run full test suite after significant changes
- **REFERENCE**: Check `TESTING.md` for detailed testing guidelines and best practices

## ARCHITECTURE GROUND TRUTH

### Project Structure
- Follow established patterns in the codebase
- Maintain consistent file organization and naming conventions
- Keep configuration centralized and environment-specific

### Enrichment System
The enrichment system uses LLMs to discover and enhance chef/restaurant data from web sources. It's a 19-file service-based architecture with clear separation of concerns.

**Key Components:**
- **Services** (5) - Single-purpose business logic (chef enrichment, restaurant discovery, show discovery, status verification, narrative generation)
- **Repositories** (4) - Data access layer (chef, restaurant, show, city)
- **Workflows** (4) - Multi-step orchestration (refresh stale chef, status sweep, partial update, manual addition)
- **Shared Utilities** (4) - LLM client, token tracker, result parser, retry handler

**When to Use:**
- Adding new chefs: Use `workflows.manualChefAddition`
- Refreshing old data: Use `workflows.refreshStaleChef`
- Checking restaurant status: Use `workflows.restaurantStatusSweep`
- Backfilling TV shows: Use `enrichShowsOnly` or `workflows.partialUpdate` with mode 'shows'

**Entry Point:** `scripts/ingestion/processors/llm-enricher.ts` (facade pattern)

**Reference:** See `architecture/enrichment-reference.md` for API and common operations. See `architecture/enrichment-system.md` for detailed architecture and extension guide.

### Component Development
- Build reusable, composable components
- Follow existing component patterns and conventions
- Maintain clear separation of concerns
- Document component APIs and usage patterns

### Design Patterns
- **Repository Pattern** - Abstract all database access through repository classes
- **Service Layer** - Business logic in single-purpose services
- **Workflow Orchestration** - Multi-step operations with cost tracking and rollback
- **Facade Pattern** - Simplified interface to complex subsystems
- **Result Type** - Explicit success/failure handling without exceptions
- **Schema Validation** - Runtime type validation with Zod for external data

See `architecture/patterns.md` for implementation examples and anti-patterns to avoid.

### Quality & Performance
- Write clean, maintainable code
- Follow existing code style and conventions
- Optimize for performance and maintainability
- Test thoroughly before deployment

## PERFORMANCE & QUALITY

### Quality Gates
- Run linting and type checking before handoff
- **Test changes thoroughly**: Run `npm run test:e2e` before marking features complete
- **Visual/UI changes**: Use `npm run test:e2e:ui` for interactive testing during development
- **Debugging failures**: Use `npm run test:e2e:debug` for step-by-step test debugging
- Use `code-reviewer` subagent after significant code changes; address Critical issues before handoff
- Keep diffs surgical—strip logs, commented code, and unused exports
- Update docs as part of the definition of done; long narratives move to `archive/`
- Document significant subagent feedback in commit messages or memory bank when relevant

### Performance Guidelines
- Follow established performance patterns
- Monitor and measure performance impact of changes
- Optimize for user experience and system efficiency
- Document performance considerations

## PROCESS REMINDERS

- Respect existing component patterns; search the repo before inventing new abstractions
- Follow established code style and conventions
- **Use Playwright tests** to verify UI changes work correctly across browsers and devices
- **Reference TESTING.md** for test writing guidelines and best practices
- Coordinate via `development/daily-log/` for deep-dive debugging or incident notes
- Use subagents proactively for their specialized domains
- Backend changes should leverage `backend-architect` for architecture decisions before implementation
- When unsure, ask. Surprises slow the team more than questions

Stay focused, keep the memory bank tight, and maintain fast feedback loops.