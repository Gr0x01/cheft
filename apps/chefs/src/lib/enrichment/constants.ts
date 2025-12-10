export const MODEL_PRICING = {
  'gpt-5.1': {
    input: 1.25,
    cached: 0.125,
    output: 10.00,
  },
  'gpt-5': {
    input: 1.25,
    cached: 0.125,
    output: 10.00,
  },
  'gpt-5-mini': {
    input: 0.25,
    cached: 0.025,
    output: 2.00,
  },
  'gpt-5-nano': {
    input: 0.05,
    cached: 0.005,
    output: 0.40,
  },
  'gpt-4.1': {
    input: 2.00,
    cached: 0.50,
    output: 8.00,
  },
  'gpt-4.1-mini': {
    input: 0.40,
    cached: 0.10,
    output: 1.60,
  },
  'gpt-4.1-nano': {
    input: 0.10,
    cached: 0.025,
    output: 0.40,
  },
  'gpt-4o': {
    input: 2.50,
    cached: 1.25,
    output: 10.00,
  },
  'gpt-4o-mini': {
    input: 0.15,
    cached: 0.075,
    output: 0.60,
  },
  'o1': {
    input: 15.00,
    cached: 7.50,
    output: 60.00,
  },
  'o1-mini': {
    input: 1.10,
    cached: 0.55,
    output: 4.40,
  },
} as const;

export type ModelName = keyof typeof MODEL_PRICING;

export const DEFAULT_MODEL: ModelName = 'gpt-5-mini';

export const ENRICHMENT_CONFIG = {
  MONTHLY_BUDGET_USD: 20.00,
  BUDGET_WARNING_THRESHOLD: 0.8,
  MAX_JOBS_PER_CRON_RUN: 10,
  
  MONTHLY_REFRESH: {
    TOP_CHEFS_COUNT: 50,
    MAX_BATCH_SIZE: 5,
  },
  
  WEEKLY_STATUS: {
    TOP_RESTAURANTS_COUNT: 100,
    MAX_BATCH_SIZE: 20,
  },
  
  COST_ESTIMATES: {
    FULL_ENRICHMENT: 0.15,
    RESTAURANTS_ONLY: 0.08,
    STATUS_CHECK: 0.02,
  },
};

export const ENRICHMENT_TYPE = {
  INITIAL: 'initial',
  MANUAL_FULL: 'manual_full',
  MANUAL_RESTAURANTS: 'manual_restaurants',
  MANUAL_STATUS: 'manual_status',
  MONTHLY_REFRESH: 'monthly_refresh',
  WEEKLY_STATUS: 'weekly_status',
} as const;

export type EnrichmentType = typeof ENRICHMENT_TYPE[keyof typeof ENRICHMENT_TYPE];
