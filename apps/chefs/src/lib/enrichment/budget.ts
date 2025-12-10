import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';
import { MODEL_PRICING, ModelName, DEFAULT_MODEL } from './constants';

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface MonthlyBudget {
  id: string;
  month: string;
  budget_usd: number | null;
  spent_usd: number | null;
  manual_spent_usd: number | null;
  jobs_completed: number | null;
  jobs_failed: number | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetCheckResult {
  allowed: boolean;
  budgetUsd: number;
  spentUsd: number;
  remainingUsd: number;
  percentUsed: number;
  estimatedCost?: number;
  reason?: string;
}

export function getModelPricing(modelName: string = DEFAULT_MODEL) {
  if (modelName in MODEL_PRICING) {
    return MODEL_PRICING[modelName as ModelName];
  }
  
  console.warn(`Unknown model "${modelName}", falling back to ${DEFAULT_MODEL}`);
  return MODEL_PRICING[DEFAULT_MODEL];
}

export function estimateCostFromTokens(
  tokensUsed: TokenUsage,
  modelName: string = DEFAULT_MODEL
): number {
  const pricing = getModelPricing(modelName);
  
  const inputCost = (tokensUsed.prompt / 1_000_000) * pricing.input;
  const outputCost = (tokensUsed.completion / 1_000_000) * pricing.output;
  
  return inputCost + outputCost;
}

export async function getBudgetForMonth(
  supabase: ReturnType<typeof createClient<Database>>,
  date: Date = new Date()
): Promise<MonthlyBudget | null> {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthStr = monthStart.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('enrichment_budgets')
    .select('*')
    .eq('month', monthStr)
    .maybeSingle();
  
  if (error) {
    console.error('[Budget] Failed to fetch budget:', error);
    return null;
  }
  
  return data;
}

export async function checkBudgetAvailable(
  supabase: ReturnType<typeof createClient<Database>>,
  estimatedCost: number,
  date: Date = new Date()
): Promise<BudgetCheckResult> {
  const budget = await getBudgetForMonth(supabase, date);
  
  if (!budget || budget.budget_usd === null || budget.spent_usd === null) {
    return {
      allowed: false,
      budgetUsd: 0,
      spentUsd: 0,
      remainingUsd: 0,
      percentUsed: 0,
      reason: 'Budget not initialized for this month',
    };
  }
  
  const budgetUsd = budget.budget_usd ?? 0;
  const spentUsd = budget.spent_usd ?? 0;
  const remainingUsd = budgetUsd - spentUsd;
  const percentUsed = budgetUsd > 0 ? (spentUsd / budgetUsd) * 100 : 0;
  const wouldExceed = (spentUsd + estimatedCost) > budgetUsd;
  
  return {
    allowed: !wouldExceed,
    budgetUsd,
    spentUsd,
    remainingUsd,
    percentUsed,
    estimatedCost,
    reason: wouldExceed 
      ? `Would exceed monthly budget: $${(spentUsd + estimatedCost).toFixed(4)} > $${budgetUsd}`
      : undefined,
  };
}

export async function incrementBudgetSpend(
  supabase: ReturnType<typeof createClient<Database>>,
  amount: number,
  isManual: boolean = false,
  date: Date = new Date()
): Promise<{ success: boolean; error?: string }> {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthStr = monthStart.toISOString().split('T')[0];
  
  const { error } = await supabase.rpc('increment_budget_spend', {
    p_month: monthStr,
    p_amount: amount,
    p_is_manual: isManual,
  });
  
  if (error) {
    console.error('[Budget] Failed to increment spend:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

export async function ensureBudgetExists(
  supabase: ReturnType<typeof createClient<Database>>,
  date: Date = new Date(),
  budgetUsd: number = 20.00
): Promise<{ success: boolean; error?: string }> {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthStr = monthStart.toISOString().split('T')[0];
  
  const { error } = await supabase
    .from('enrichment_budgets')
    .upsert({
      month: monthStr,
      budget_usd: budgetUsd,
      spent_usd: 0,
      manual_spent_usd: 0,
      jobs_completed: 0,
      jobs_failed: 0,
    }, {
      onConflict: 'month',
      ignoreDuplicates: true,
    });
  
  if (error) {
    console.error('[Budget] Failed to ensure budget exists:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

export async function updateBudgetLimit(
  supabase: ReturnType<typeof createClient<Database>>,
  budgetUsd: number,
  date: Date = new Date()
): Promise<{ success: boolean; error?: string }> {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthStr = monthStart.toISOString().split('T')[0];
  
  const { error } = await supabase
    .from('enrichment_budgets')
    .update({ budget_usd: budgetUsd, updated_at: new Date().toISOString() })
    .eq('month', monthStr);
  
  if (error) {
    console.error('[Budget] Failed to update budget limit:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}
