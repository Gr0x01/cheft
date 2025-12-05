import { 
  Workflow, 
  WorkflowConfig, 
  WorkflowResult, 
  WorkflowStep, 
  WorkflowError, 
  WorkflowStatus,
  StepStatus,
  CostEstimate,
  ValidationResult,
} from '../types/workflow-types';
import { TokenUsage, TokenTracker } from '../shared/token-tracker';

export abstract class BaseWorkflow<TInput, TOutput> implements Workflow<TInput, TOutput> {
  protected config: WorkflowConfig;
  protected tokenTracker: TokenTracker;
  protected workflowId: string;
  protected steps: WorkflowStep[] = [];
  protected errors: WorkflowError[] = [];
  protected startedAt?: Date;
  protected completedAt?: Date;

  constructor(config: WorkflowConfig) {
    this.config = config;
    this.tokenTracker = TokenTracker.getInstance();
    this.workflowId = this.generateWorkflowId();
  }

  private generateWorkflowId(): string {
    return `${this.config.workflowName}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  abstract executeSteps(input: TInput): Promise<TOutput>;
  abstract estimateCost(input: TInput): Promise<CostEstimate>;
  abstract validate(input: TInput): ValidationResult;

  async execute(input: TInput): Promise<WorkflowResult<TOutput>> {
    this.startedAt = new Date();
    this.steps = [];
    this.errors = [];
    this.tokenTracker.reset();

    const validation = this.validate(input);
    if (!validation.valid) {
      return this.createErrorResult(
        'validation_failed',
        `Validation failed: ${validation.errors.join(', ')}`,
        true
      );
    }

    const costEstimate = await this.estimateCost(input);
    if (costEstimate.estimatedUsd > this.config.maxCostUsd) {
      return this.createErrorResult(
        'cost_limit_exceeded',
        `Estimated cost $${costEstimate.estimatedUsd.toFixed(2)} exceeds limit $${this.config.maxCostUsd.toFixed(2)}`,
        true
      );
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Workflow timeout')), this.config.timeoutMs);
    });

    try {
      const output = await Promise.race([
        this.executeSteps(input),
        timeoutPromise,
      ]);

      this.completedAt = new Date();

      return this.createSuccessResult(output);
    } catch (error) {
      this.completedAt = new Date();

      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTimeout = errorMessage === 'Workflow timeout';

      if (this.config.allowRollback && !isTimeout) {
        try {
          await this.rollback();
          return this.createRollbackResult(errorMessage);
        } catch (rollbackError) {
          const rollbackMessage = rollbackError instanceof Error 
            ? rollbackError.message 
            : String(rollbackError);
          return this.createErrorResult(
            'rollback_failed',
            `Workflow failed and rollback failed: ${errorMessage}. Rollback error: ${rollbackMessage}`,
            true
          );
        }
      }

      return this.createErrorResult(
        isTimeout ? 'timeout' : 'execution_failed',
        errorMessage,
        true
      );
    }
  }

  protected async rollback(): Promise<void> {
    console.log(`[${this.config.workflowName}] Rollback not implemented for this workflow`);
  }

  protected startStep(name: string): number {
    const stepNumber = this.steps.length + 1;
    const step: WorkflowStep = {
      stepNumber,
      name,
      status: StepStatus.RUNNING,
      startedAt: new Date(),
    };
    this.steps.push(step);
    return stepNumber;
  }

  protected completeStep(
    stepNumber: number, 
    tokensUsed?: TokenUsage, 
    metadata?: Record<string, any>
  ): void {
    const step = this.steps[stepNumber - 1];
    if (step) {
      step.status = StepStatus.COMPLETED;
      step.completedAt = new Date();
      step.tokensUsed = tokensUsed;
      step.metadata = metadata;
      
      if (tokensUsed) {
        const inputCostPer1M = 0.25;
        const outputCostPer1M = 2.00;
        step.costUsd = (tokensUsed.prompt / 1_000_000) * inputCostPer1M +
                       (tokensUsed.completion / 1_000_000) * outputCostPer1M;
      }
    }
  }

  protected failStep(stepNumber: number, error: string): void {
    const step = this.steps[stepNumber - 1];
    if (step) {
      step.status = StepStatus.FAILED;
      step.completedAt = new Date();
      step.error = error;
    }
  }

  protected skipStep(stepNumber: number, reason: string): void {
    const step = this.steps[stepNumber - 1];
    if (step) {
      step.status = StepStatus.SKIPPED;
      step.completedAt = new Date();
      step.metadata = { skipReason: reason };
    }
  }

  protected addError(code: string, message: string, fatal: boolean, details?: any): void {
    this.errors.push({ code, message, fatal, details });
  }

  private createSuccessResult(output: TOutput): WorkflowResult<TOutput> {
    const totalUsage = this.tokenTracker.getTotalUsage();
    const estimatedCost = this.tokenTracker.estimateCost();

    return {
      success: true,
      workflowId: this.workflowId,
      workflowName: this.config.workflowName,
      status: WorkflowStatus.COMPLETED,
      steps: this.steps,
      output,
      totalCost: {
        tokens: totalUsage,
        estimatedUsd: estimatedCost,
      },
      errors: this.errors,
      startedAt: this.startedAt!,
      completedAt: this.completedAt,
      durationMs: this.completedAt && this.startedAt 
        ? this.completedAt.getTime() - this.startedAt.getTime() 
        : undefined,
    };
  }

  private createErrorResult(
    code: string, 
    message: string, 
    fatal: boolean
  ): WorkflowResult<TOutput> {
    this.addError(code, message, fatal);
    const totalUsage = this.tokenTracker.getTotalUsage();
    const estimatedCost = this.tokenTracker.estimateCost();

    return {
      success: false,
      workflowId: this.workflowId,
      workflowName: this.config.workflowName,
      status: WorkflowStatus.FAILED,
      steps: this.steps,
      totalCost: {
        tokens: totalUsage,
        estimatedUsd: estimatedCost,
      },
      errors: this.errors,
      startedAt: this.startedAt!,
      completedAt: this.completedAt,
      durationMs: this.completedAt && this.startedAt 
        ? this.completedAt.getTime() - this.startedAt.getTime() 
        : undefined,
    };
  }

  private createRollbackResult(originalError: string): WorkflowResult<TOutput> {
    const totalUsage = this.tokenTracker.getTotalUsage();
    const estimatedCost = this.tokenTracker.estimateCost();

    return {
      success: false,
      workflowId: this.workflowId,
      workflowName: this.config.workflowName,
      status: WorkflowStatus.ROLLED_BACK,
      steps: this.steps,
      totalCost: {
        tokens: totalUsage,
        estimatedUsd: estimatedCost,
      },
      errors: [
        ...this.errors,
        { code: 'rolled_back', message: originalError, fatal: true }
      ],
      startedAt: this.startedAt!,
      completedAt: this.completedAt,
      durationMs: this.completedAt && this.startedAt 
        ? this.completedAt.getTime() - this.startedAt.getTime() 
        : undefined,
    };
  }
}
