// IMPORTANT: This command MUST only be called by the Main Agent, not by teammates.

/**
 * Gate Command
 *
 * Run quality gate checks for a change. Gates are defined in the schema's
 * apply.gates configuration (pre = before coding, post = after coding).
 *
 * Usage:
 *   openspec gate check --change <name> --phase <pre|post> [--json]
 *   openspec gate resolve --change <name> --id <gate-id> --result <PASS|FAIL> [--details <json>]
 */

import {
  loadChangeContext,
  resolveSchema,
} from '../core/artifact-graph/index.js';
import { GateChecker, type GateInput, type GateCheckResult } from '../core/validation/gate-checker.js';
import { validateChangeExists } from './workflow/shared.js';
import { getChangesDir } from '../utils/change-utils.js';
import type { ResolvedGateResult } from '../core/pipeline/types.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';

// ── Interfaces ──────────────────────────────────────────────────────────

export interface GateCheckOptions {
  change?: string;
  phase?: string;  // 'pre' | 'post'
  json?: boolean;
}

export interface GateResolveOptions {
  change?: string;
  id?: string;
  result?: string;  // 'PASS' | 'FAIL'
  details?: string;  // JSON string
}

export interface GateCheckReport {
  change: string;
  phase: string;
  passed: boolean;
  checks: Array<{
    id: string;
    description: string;
    passed: boolean;
    severity: string;
    details: Record<string, unknown>;
    ai_review_needed?: boolean;
    prompt?: string;
  }>;
}

// ── Command ─────────────────────────────────────────────────────────────

export class GateCommand {
  async execute(options: GateCheckOptions): Promise<void> {
    const projectRoot = process.cwd();

    // 1. Validate change exists
    const changeName = await validateChangeExists(options.change, projectRoot);

    // 2. Validate phase
    const phase = options.phase;
    if (!phase || (phase !== 'pre' && phase !== 'post')) {
      throw new Error(`Invalid or missing --phase. Must be 'pre' or 'post'.`);
    }

    // 3. Load change context to get schema name
    const context = loadChangeContext(projectRoot, changeName);
    const changeDir = path.join(getChangesDir(projectRoot), changeName);

    // 4. Resolve schema and read gates
    const schema = resolveSchema(context.schemaName, projectRoot);
    const gates = schema.apply?.gates;

    // 5. If no gates defined, report pass with empty checks
    if (!gates) {
      const report: GateCheckReport = {
        change: changeName,
        phase,
        passed: true,
        checks: [],
      };
      this.outputReport(report, !!options.json);
      return;
    }

    // 6. Get gates for the requested phase
    const phaseGates: GateInput[] = (phase === 'pre' ? gates.pre : gates.post) ?? [];

    if (phaseGates.length === 0) {
      const report: GateCheckReport = {
        change: changeName,
        phase,
        passed: true,
        checks: [],
      };
      this.outputReport(report, !!options.json);
      return;
    }

    // 7. Run all gate checks
    const gateChecker = new GateChecker();
    const results: Array<GateCheckResult & { severity: string; prompt?: string }> = [];

    for (const gate of phaseGates) {
      const result = await gateChecker.checkGate(gate, changeDir);
      results.push({
        ...result,
        severity: gate.severity,
        prompt: gate.prompt,
      });
    }

    // 8. Build report
    const checks = results.map(r => ({
      id: r.id,
      description: r.description,
      passed: r.passed,
      severity: r.severity,
      details: r.details,
      ...(r.ai_review_needed ? { ai_review_needed: r.ai_review_needed } : {}),
      ...(r.prompt ? { prompt: r.prompt } : {}),
    }));

    // 9. passed = all blocking gates pass
    const passed = results
      .filter(r => r.severity === 'blocking')
      .every(r => r.passed);

    const report: GateCheckReport = {
      change: changeName,
      phase,
      passed,
      checks,
    };

    // 10. Output
    this.outputReport(report, !!options.json);

    // 11. Exit code
    process.exitCode = report.passed ? 0 : 1;
  }

  async resolveGate(options: GateResolveOptions): Promise<void> {
    const projectRoot = process.cwd();

    // 1. Validate change exists
    const changeName = await validateChangeExists(options.change, projectRoot);

    // 2. Validate gate ID
    if (!options.id) {
      throw new Error('Missing required option --id (gate ID to resolve)');
    }

    // 3. Parse result
    const resultStr = (options.result ?? '').toUpperCase();
    if (resultStr !== 'PASS' && resultStr !== 'FAIL') {
      throw new Error(`Invalid --result: "${options.result}". Must be PASS or FAIL.`);
    }
    const passed = resultStr === 'PASS';

    // 4. Parse details JSON if provided
    let details: Record<string, unknown> | undefined;
    if (options.details) {
      try {
        details = JSON.parse(options.details) as Record<string, unknown>;
      } catch {
        throw new Error(`Invalid --details JSON: ${options.details}`);
      }
    }

    // 5. Write .gates/{id}.json
    const changeDir = path.join(getChangesDir(projectRoot), changeName);
    const gatesDir = path.join(changeDir, '.gates');
    if (!existsSync(gatesDir)) {
      mkdirSync(gatesDir, { recursive: true });
    }

    const resolvedResult: ResolvedGateResult = {
      version: '1.0',
      id: options.id,
      passed,
      resolvedBy: 'main-agent',
      resolvedAt: new Date().toISOString(),
      ...(details ? { details } : {}),
    };

    const resultPath = path.join(gatesDir, `${options.id}.json`);
    writeFileSync(resultPath, JSON.stringify(resolvedResult, null, 2), 'utf-8');

    // 6. Output confirmation
    console.log(`Gate resolved: ${options.id} → ${resultStr}`);
    console.log(`Written to: ${resultPath}`);
  }

  private outputReport(report: GateCheckReport, json: boolean): void {
    if (json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    // Text mode
    console.log(`Gate Check: ${report.change} (${report.phase})`);
    console.log();

    if (report.checks.length === 0) {
      console.log('No gates defined for this phase.');
      return;
    }

    for (const check of report.checks) {
      const icon = check.passed ? '\u2713' : '\u2717';
      const severityTag = check.severity === 'blocking' ? '[BLOCKING]' : '[WARNING]';
      console.log(`${icon} ${severityTag} ${check.id}: ${check.description}`);

      if (!check.passed && check.details) {
        // Show key details for failed checks
        const detailKeys = Object.keys(check.details).filter(k => k !== 'passed');
        for (const key of detailKeys) {
          const val = check.details[key];
          if (Array.isArray(val) && val.length > 0) {
            console.log(`    ${key}: ${val.join(', ')}`);
          } else if (typeof val === 'number' || typeof val === 'string') {
            console.log(`    ${key}: ${val}`);
          }
        }
      }

      if (check.ai_review_needed && check.prompt) {
        console.log(`    AI review prompt: ${check.prompt}`);
      }
    }

    console.log();
    const passedCount = report.checks.filter(c => c.passed).length;
    const totalCount = report.checks.length;
    console.log(`Result: ${passedCount}/${totalCount} checks passed. Overall: ${report.passed ? 'PASSED' : 'FAILED'}`);
  }
}
