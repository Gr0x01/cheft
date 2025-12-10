---
Last-Updated: 2025-12-10
Maintainer: RB
Status: Active
---

# LLM Model Reference: OpenAI API

## Overview
This document serves as the **authoritative source** for OpenAI model configurations and pricing used in the Chefs project. All code that estimates LLM costs MUST reference these values, not hardcode them.

**CRITICAL**: Never change model names or pricing in code without first updating this reference document.

## Current Models in Use

### Hybrid Search Architecture (PRIMARY)

We use a **two-model hybrid approach** for web search enrichment:

| Role | Model | Purpose | Pricing |
|------|-------|---------|---------|
| **Orchestrator** | `gpt-4o-mini` | Decides searches, processes results, formats JSON | $0.15/$0.60 per 1M |
| **Search Specialist** | `gpt-4o-mini-search-preview` | Executes web searches, returns grounded data | $0.15/$0.60 per 1M |

**Why Hybrid?**
- `gpt-5-mini` + Responses API: Slow (120s), expensive ($0.03/chef), inconsistent results
- `gpt-4o-mini-search-preview` alone: No function calling, can't structure output
- **Hybrid**: Fast (15s), cheap ($0.003/chef), consistent results (7-11 shows vs 1-8)

**Location**: `scripts/ingestion/enrichment/shared/llm-client.ts`

### Fallback/Alternative Models
- **gpt-5-mini**: Previous primary, still available for non-search tasks
- **gpt-5-nano**: Ultra-low-cost option for simple status checks
- **gpt-4.1-mini**: Higher quality fallback if needed

## OpenAI Pricing Tiers

OpenAI offers multiple pricing tiers. **For enrichment, use Flex or Batch for 50% savings.**

| Tier | Discount | Latency | Use Case |
|------|----------|---------|----------|
| **Standard** | - | Real-time | User-facing, interactive |
| **Flex** | **50% off** | ~1-5 min | Background scripts, enrichment |
| **Batch** | **50% off** | Up to 24h | Bulk backfills, overnight jobs |

**Status**: ✅ **Flex tier is ACTIVE** in `synthesis-client.ts` via `X-Model-Tier: flex` header. All enrichment calls automatically use Flex pricing.

---

## Standard Pricing (Effective 2025-12-03)

All prices are per 1M tokens in USD.

### GPT-5 Family (Primary)
| Model | Input | Cached Input | Output | Notes |
|-------|-------|--------------|--------|-------|
| `gpt-5.1` | $1.25 | $0.125 | $10.00 | Latest flagship |
| `gpt-5` | $1.25 | $0.125 | $10.00 | Stable flagship |
| `gpt-5-mini` | **$0.25** | **$0.025** | **$2.00** | **PRIMARY MODEL** ⭐ |
| `gpt-5-nano` | $0.05 | $0.005 | $0.40 | Ultra-low-cost option |
| `gpt-5.1-chat-latest` | $1.25 | $0.125 | $10.00 | Latest chat model |
| `gpt-5-chat-latest` | $1.25 | $0.125 | $10.00 | Stable chat model |
| `gpt-5.1-codex` | $1.25 | $0.125 | $10.00 | Code generation |
| `gpt-5-codex` | $1.25 | $0.125 | $10.00 | Code generation |
| `gpt-5-pro` | $15.00 | - | $120.00 | Premium tier |

### GPT-4.1 Family (Fallback)
| Model | Input | Cached Input | Output | Notes |
|-------|-------|--------------|--------|-------|
| `gpt-4.1` | $2.00 | $0.50 | $8.00 | Latest GPT-4 generation |
| `gpt-4.1-mini` | $0.40 | $0.10 | $1.60 | Cost-effective GPT-4 |
| `gpt-4.1-nano` | $0.10 | $0.025 | $0.40 | Ultra-low-cost GPT-4 |

### GPT-4o Family (Current Production)
| Model | Input | Cached Input | Output | Notes |
|-------|-------|--------------|--------|-------|
| `gpt-4o` | $2.50 | $1.25 | $10.00 | Optimized GPT-4 |
| `gpt-4o-mini` | $0.15 | $0.075 | $0.60 | **CURRENT ENRICHMENT MODEL** ⭐ |
| `gpt-4o-2024-05-13` | $5.00 | - | $15.00 | Specific snapshot |

### O-Series (Reasoning Models)
| Model | Input | Cached Input | Output | Notes |
|-------|-------|--------------|--------|-------|
| `o1` | $15.00 | $7.50 | $60.00 | Advanced reasoning |
| `o1-pro` | $150.00 | - | $600.00 | Premium reasoning |
| `o1-mini` | $1.10 | $0.55 | $4.40 | Cost-effective reasoning |
| `o3-pro` | $20.00 | - | $80.00 | Next-gen reasoning |
| `o3` | $2.00 | $0.50 | $8.00 | Next-gen reasoning |
| `o3-mini` | $1.10 | $0.55 | $4.40 | Cost-effective next-gen |
| `o3-deep-research` | $10.00 | $2.50 | $40.00 | Deep research tasks |
| `o4-mini` | $1.10 | $0.275 | $4.40 | Latest mini reasoning |
| `o4-mini-deep-research` | $2.00 | $0.50 | $8.00 | Latest deep research |

---

## Flex/Batch Pricing (50% Off Standard)

For background enrichment tasks. All prices per 1M tokens.

### Key Models for Enrichment
| Model | Input | Cached Input | Output | Notes |
|-------|-------|--------------|--------|-------|
| `gpt-5.1` | $0.625 | $0.0625 | $5.00 | Flex/Batch flagship |
| `gpt-5` | $0.625 | $0.0625 | $5.00 | Flex/Batch flagship |
| `gpt-5-mini` | $0.125 | $0.0125 | $1.00 | Flex/Batch mini |
| `gpt-5-nano` | $0.025 | $0.0025 | $0.20 | Flex/Batch nano |
| `gpt-4o-mini` | **$0.075** | - | **$0.30** | **RECOMMENDED FOR ENRICHMENT** ⭐ |
| `gpt-4.1-mini` | $0.20 | - | $0.80 | Flex/Batch 4.1 mini |
| `gpt-4.1-nano` | $0.05 | - | $0.20 | Flex/Batch 4.1 nano |

### Batch-Only Models
| Model | Input | Cached Input | Output | Notes |
|-------|-------|--------------|--------|-------|
| `gpt-5-pro` | $7.50 | - | $60.00 | Batch only |
| `gpt-4o` | $1.25 | - | $5.00 | Batch only |
| `gpt-4o-2024-05-13` | $2.50 | - | $7.50 | Batch only |
| `o1` | $7.50 | - | $30.00 | Batch only |
| `o1-pro` | $75.00 | - | $300.00 | Batch only |
| `o3-pro` | $10.00 | - | $40.00 | Batch only |
| `o3` | $1.00 | - | $4.00 | Batch only |
| `o3-deep-research` | $5.00 | - | $20.00 | Batch only |
| `o4-mini` | $0.55 | - | $2.20 | Batch only |
| `o4-mini-deep-research` | $1.00 | - | $4.00 | Batch only |
| `o3-mini` | $0.55 | - | $2.20 | Batch only |
| `o1-mini` | $0.55 | - | $2.20 | Batch only |

### Specialized Models
| Model | Input | Cached Input | Output | Notes |
|-------|-------|--------------|--------|-------|
| `gpt-realtime` | $4.00 | $0.40 | $16.00 | Real-time audio/text |
| `gpt-realtime-mini` | $0.60 | $0.06 | $2.40 | Real-time mini |
| `gpt-audio` | $2.50 | - | $10.00 | Audio processing |
| `gpt-audio-mini` | $0.60 | - | $2.40 | Audio mini |
| `gpt-5-search-api` | $1.25 | $0.125 | $10.00 | Search-optimized |
| `gpt-4o-search-preview` | $2.50 | - | $10.00 | Search preview |
| `gpt-4o-mini-search-preview` | $0.15 | - | $0.60 | Search mini |
| `computer-use-preview` | $3.00 | - | $12.00 | Computer interaction |
| `codex-mini-latest` | $1.50 | $0.375 | $6.00 | Latest codex mini |
| `gpt-5.1-codex-mini` | $0.25 | $0.025 | $2.00 | Codex mini |

### Image Models
| Model | Input | Cached Input | Output | Notes |
|-------|-------|--------------|--------|-------|
| `gpt-image-1` | $5.00 | $1.25 | - | Image generation |
| `gpt-image-1-mini` | $2.00 | $0.20 | - | Mini image generation |

## Cost Estimation Examples

### Typical Chef Enrichment (gpt-5-mini)
- **Input tokens**: ~6,000 (prompt + web search context)
- **Output tokens**: ~2,000 (bio + restaurant JSON)
- **Cost calculation**:
  - Input: (6,000 / 1,000,000) × $0.25 = $0.0015
  - Output: (2,000 / 1,000,000) × $2.00 = $0.0040
  - **Total**: ~$0.0055 per enrichment

### Restaurant Status Check (gpt-5-mini)
- **Input tokens**: ~2,000 (prompt + search results)
- **Output tokens**: ~500 (status JSON)
- **Cost calculation**:
  - Input: (2,000 / 1,000,000) × $0.25 = $0.0005
  - Output: (500 / 1,000,000) × $2.00 = $0.0010
  - **Total**: ~$0.0015 per status check

### Monthly Budget Projections
- **50 chef enrichments/month**: 50 × $0.0055 = ~$0.28
- **400 restaurant status checks/month**: 400 × $0.0015 = ~$0.60
- **Manual triggers (10/month)**: 10 × $0.0055 = ~$0.06
- **Total monthly estimate**: ~$0.94/month

**Note**: Original estimates in enrichment-refresh-system.md were conservative (~$17/month). Actual costs with gpt-5-mini are significantly lower.

## Model Selection Guidelines

### When to Use gpt-5-mini (PRIMARY)
- ✅ Chef bio enrichment
- ✅ Restaurant discovery with web search
- ✅ Award and achievement research
- ✅ Photo search and validation
- ✅ Restaurant status verification

### When to Consider gpt-5-nano
- ✅ Simple status checks (open/closed)
- ✅ Basic data validation
- ✅ High-volume, low-complexity tasks
- ⚠️ May sacrifice quality for cost

### When to Consider gpt-4.1-mini
- ✅ Complex reasoning requirements
- ✅ Multi-step analysis
- ✅ When gpt-5-mini quality is insufficient
- ⚠️ Higher cost ($0.40 input vs $0.25)

### When to Avoid O-Series Models
- ❌ Too expensive for routine enrichment
- ❌ Overkill for structured data extraction
- ❌ Better suited for complex reasoning tasks
- ✅ Only use if explicitly required

## Configuration Constants

All code should import pricing from this reference. The recommended structure:

```typescript
// src/lib/enrichment/constants.ts
export const MODEL_PRICING = {
  'gpt-5-mini': {
    input: 0.25,        // per 1M tokens
    cached: 0.025,      // per 1M tokens
    output: 2.00,       // per 1M tokens
  },
  'gpt-5-nano': {
    input: 0.05,
    cached: 0.005,
    output: 0.40,
  },
  'gpt-4.1-mini': {
    input: 0.40,
    cached: 0.10,
    output: 1.60,
  },
  // Add more models as needed
};

export const DEFAULT_MODEL = 'gpt-5-mini';
```

## Changing Models

To change the primary model:

1. **Update this document** (`llm-models.md`)
2. **Update constants** (`src/lib/enrichment/constants.ts`)
3. **Update enricher config** (`scripts/ingestion/processors/llm-enricher.ts`)
4. **Test thoroughly** with new model
5. **Update cost estimates** in enrichment-refresh-system.md
6. **Deploy and monitor** for cost/quality changes

**Never change model names directly in code without updating this reference first.**

## Local LLM (Development/Testing)

For experimental work and cost-free testing, a local LLM is available:

| Model | Endpoint | Use Case |
|-------|----------|----------|
| `qwen/qwen3-8b` | `http://10.2.0.10:1234` | Local testing, data normalization experiments |

**Usage**: OpenAI-compatible API. Set base URL to `http://10.2.0.10:1234/v1` with any API key.

## References

- **OpenAI Pricing Page**: https://openai.com/api/pricing/
- **Enrichment System Docs**: `/memory-bank/projects/enrichment-refresh-system.md`
- **Tech Stack Overview**: `/memory-bank/architecture/techStack.md`
- **LLM Enricher Implementation**: `scripts/ingestion/processors/llm-enricher.ts`

---

## Future Optimization: Batch API

For bulk operations (100+ chefs), the Batch API offers:
- Same 50% pricing as Flex
- Async processing (results within 24h)
- Higher rate limits
- Ideal for overnight backfills

**Implementation**: Not yet implemented. When needed, queue requests to `/v1/batches` endpoint.

---

**Last Pricing Update**: 2025-12-10
**Next Review Date**: 2026-01-01 (quarterly review recommended)
