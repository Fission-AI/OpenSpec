import path from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { dispatchHooks, type HookContext, type HookPoint } from '../plugin/hook-dispatcher.js';
import { GateChecker, type GateInput, type GateCheckResult } from '../validation/gate-checker.js';
import type { LoadedPlugin } from '../plugin/types.js';
import type { SchemaYaml } from '../artifact-graph/types.js';
import type {
  RunStartResult,
  RunCompleteResult,
  PendingPrompt,
} from './types.js';
import * as lock from './lock.js';

const VALID_PHASES = ['propose', 'apply', 'verify', 'archive'] as const;
type Phase = typeof VALID_PHASES[number];

/**
 * Generate a session ID in the format YYYYMMDD-HHMMSS-random4.
 */
function generateSessionId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toISOString().slice(11, 19).replace(/:/g, '');
  const rand = Math.random().toString(36).substring(2, 6);
  return `${date}-${time}-${rand}`;
}

/**
 * Get gates configuration for a phase from the schema.
 * Returns { pre, post } gate arrays.
 */
function getPhaseGates(
  schema: SchemaYaml,
  phase: Phase,
): { pre: GateInput[]; post: GateInput[] } {
  const phaseConfig = schema[phase as keyof SchemaYaml];
  if (!phaseConfig || typeof phaseConfig !== 'object' || !('gates' in phaseConfig)) {
    return { pre: [], post: [] };
  }
  const gates = (phaseConfig as { gates?: { pre?: GateInput[]; post?: GateInput[] } }).gates;
  return {
    pre: gates?.pre ?? [],
    post: gates?.post ?? [],
  };
}

export class PipelineRunner {
  private sessionId: string;

  constructor(
    private projectRoot: string,
    private changeName: string,
    private phase: string,
    private plugins: LoadedPlugin[],
    private changeDir: string,
    private schema: SchemaYaml,
    sessionId?: string,
  ) {
    if (!VALID_PHASES.includes(phase as Phase)) {
      throw new Error(`Invalid phase: ${phase}. Must be one of: ${VALID_PHASES.join(', ')}`);
    }
    this.sessionId = sessionId ?? generateSessionId();
  }

  async start(): Promise<RunStartResult> {
    // 1. Check existing lock
    const staleLock = lock.checkStale(this.changeDir);
    if (staleLock) {
      console.warn(
        `Cleaning stale lock from session ${staleLock.sessionId} (PID ${staleLock.pid}, started ${staleLock.startedAt})`,
      );
      lock.release(this.changeDir);
    }

    const activeLock = lock.check(this.changeDir);
    if (activeLock) {
      console.warn(
        `Warning: Active lock exists from session ${activeLock.sessionId} (PID ${activeLock.pid}). Proceeding anyway.`,
      );
    }

    // 2. Acquire lock
    lock.acquire(this.changeDir, this.sessionId, this.phase, this.changeName);

    // 3. Build hook context
    const hookContext: HookContext = {
      changeName: this.changeName,
      changeDir: this.changeDir,
      schema: this.schema.name,
      projectRoot: this.projectRoot,
      phase: this.phase,
      hookPoint: `${this.phase}.pre` as HookPoint,
    };

    // 4. Dispatch pre-hooks
    const hookResult = await dispatchHooks(
      this.plugins,
      `${this.phase}.pre` as HookPoint,
      hookContext,
    );

    // 5. Run pre-gates
    const { pre: preGateInputs } = getPhaseGates(this.schema, this.phase as Phase);
    const gateChecker = new GateChecker(this.plugins);
    const preGateResults: GateCheckResult[] = [];

    for (const gate of preGateInputs) {
      const result = await gateChecker.checkGate(gate, this.changeDir);
      preGateResults.push(result);
    }

    // 6. Collect pending prompts from gates with ai_review_needed
    const pendingPrompts: PendingPrompt[] = preGateResults
      .filter((r) => r.ai_review_needed)
      .map((r) => ({
        id: r.id,
        prompt: (r.details?.prompt as string) ?? `Review gate: ${r.id}`,
      }));

    // 7. Check for blocking gate failures
    const failedBlockingGates = preGateInputs
      .filter((gate) => gate.severity === 'blocking')
      .filter((gate) => {
        const result = preGateResults.find((r) => r.id === gate.id);
        return result && !result.passed;
      });

    const failedGates = failedBlockingGates.length > 0
      ? failedBlockingGates.map((gate) => {
          const result = preGateResults.find((r) => r.id === gate.id)!;
          return { id: result.id, description: result.description, details: result.details };
        })
      : undefined;

    const status = failedBlockingGates.length > 0 ? 'blocked' as const : 'ready' as const;

    return {
      status,
      sessionId: this.sessionId,
      phase: this.phase,
      changeName: this.changeName,
      preHooks: {
        executed: hookResult.executed.map((e) => ({
          id: e.id,
          status: e.status,
          output: e.output,
        })),
        pending: hookResult.pending.map((p) => ({
          id: p.id,
          prompt: p.prompt,
        })),
      },
      preGates: preGateResults.map((r) => ({
        id: r.id,
        passed: r.passed,
        description: r.description,
        details: r.details,
        ...(r.ai_review_needed ? { ai_review_needed: r.ai_review_needed } : {}),
      })),
      pendingPrompts,
      ...(failedGates ? { failedGates } : {}),
    };
  }

  async complete(): Promise<RunCompleteResult> {
    // 1. Check for unresolved prompts by scanning .gates/{id}.json
    const gatesDir = path.join(this.changeDir, '.gates');
    const { pre: preGateInputs, post: postGateInputs } = getPhaseGates(this.schema, this.phase as Phase);

    // Find pre-gates that needed AI review but haven't been resolved
    const unresolvedPrompts: string[] = [];
    for (const gate of preGateInputs) {
      if (gate.check === 'ai-review') {
        const resolvedPath = path.join(gatesDir, `${gate.id}.json`);
        if (!existsSync(resolvedPath)) {
          unresolvedPrompts.push(gate.id);
        }
      }
    }

    if (unresolvedPrompts.length > 0) {
      return {
        status: 'blocked',
        sessionId: this.sessionId,
        phase: this.phase,
        changeName: this.changeName,
        postGates: [],
        postHooks: { executed: [], pending: [] },
        unresolvedPrompts,
        synthesis: this.buildSynthesis([], unresolvedPrompts),
      };
    }

    // 2. Run post-gates
    const gateChecker = new GateChecker(this.plugins);
    const postGateResults: GateCheckResult[] = [];

    for (const gate of postGateInputs) {
      const result = await gateChecker.checkGate(gate, this.changeDir);
      postGateResults.push(result);
    }

    // 3. Dispatch post-hooks
    const hookContext: HookContext = {
      changeName: this.changeName,
      changeDir: this.changeDir,
      schema: this.schema.name,
      projectRoot: this.projectRoot,
      phase: this.phase,
      hookPoint: `${this.phase}.post` as HookPoint,
    };

    const hookResult = await dispatchHooks(
      this.plugins,
      `${this.phase}.post` as HookPoint,
      hookContext,
    );

    // 4. Check for blocking failures
    const failedBlockingGates = postGateInputs
      .filter((gate) => gate.severity === 'blocking')
      .filter((gate) => {
        const result = postGateResults.find((r) => r.id === gate.id);
        return result && !result.passed;
      });

    const failedGates = failedBlockingGates.length > 0
      ? failedBlockingGates.map((gate) => {
          const result = postGateResults.find((r) => r.id === gate.id)!;
          return { id: result.id, description: result.description, details: result.details };
        })
      : undefined;

    // 5. Build synthesis
    const allResults = [...postGateResults];
    const synthesis = this.buildSynthesis(allResults);

    // 6. Persist synthesis
    this.persistSynthesis(synthesis);

    // 7. Release lock
    lock.release(this.changeDir);

    // 8. Determine status
    const status = failedBlockingGates.length > 0 ? 'failed' as const : 'passed' as const;

    return {
      status,
      sessionId: this.sessionId,
      phase: this.phase,
      changeName: this.changeName,
      postGates: postGateResults.map((r) => ({
        id: r.id,
        passed: r.passed,
        description: r.description,
        details: r.details,
      })),
      postHooks: {
        executed: hookResult.executed.map((e) => ({
          id: e.id,
          status: e.status,
          output: e.output,
        })),
        pending: hookResult.pending.map((p) => ({
          id: p.id,
          prompt: p.prompt,
        })),
      },
      ...(failedGates ? { failedGates } : {}),
      synthesis,
    };
  }

  private buildSynthesis(
    results: GateCheckResult[],
    unresolvedPrompts?: string[],
  ): RunCompleteResult['synthesis'] {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      phase: this.phase,
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      results: results.map((r) => ({
        id: r.id,
        passed: r.passed,
        ...(r.ai_review_needed ? { ai_review_needed: r.ai_review_needed } : {}),
      })),
    };
  }

  private persistSynthesis(synthesis: RunCompleteResult['synthesis']): void {
    const gatesDir = path.join(this.changeDir, '.gates');
    if (!existsSync(gatesDir)) {
      mkdirSync(gatesDir, { recursive: true });
    }
    const synthesisPath = path.join(gatesDir, 'synthesis.json');
    writeFileSync(synthesisPath, JSON.stringify(synthesis, null, 2), 'utf-8');
  }
}
