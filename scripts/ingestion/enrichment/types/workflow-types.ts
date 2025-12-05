import { TokenUsage } from '../shared/token-tracker';

export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export interface WorkflowStep {
  stepNumber: number;
  name: string;
  status: StepStatus;
  startedAt?: Date;
  completedAt?: Date;
  tokensUsed?: TokenUsage;
  costUsd?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowError {
  step?: string;
  code: string;
  message: string;
  fatal: boolean;
  details?: any;
}

export interface CostEstimate {
  estimatedTokens: number;
  estimatedUsd: number;
  maxTokens: number;
  maxUsd: number;
}

export interface WorkflowResult<TOutput = any> {
  success: boolean;
  workflowId: string;
  workflowName: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  output?: TOutput;
  totalCost: {
    tokens: TokenUsage;
    estimatedUsd: number;
  };
  errors: WorkflowError[];
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
}

export interface WorkflowConfig {
  workflowName: string;
  maxCostUsd: number;
  timeoutMs: number;
  allowRollback: boolean;
  retryFailedSteps?: boolean;
  maxRetries?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface Workflow<TInput = any, TOutput = any> {
  execute(input: TInput): Promise<WorkflowResult<TOutput>>;
  estimateCost(input: TInput): Promise<CostEstimate>;
  validate(input: TInput): ValidationResult;
}
