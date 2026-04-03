import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { Validator } from './validator.js';
import type { LoadedPlugin, GateDefinition } from '../plugin/types.js';
import type { ParallelGroup } from '../orchestration/types.js';

// ── Interfaces ──────────────────────────────────────────────────────────

export interface GateInput {
  id: string;
  check: string;
  severity: 'blocking' | 'warning';
  prompt?: string;
  command?: string;
}

export interface GateCheckResult {
  id: string;
  description: string;
  passed: boolean;
  details: Record<string, unknown>;
  ai_review_needed?: boolean;
}

interface CapabilityCoverageDetails {
  proposal_capabilities: string[];
  spec_dirs: string[];
  missing: string[];
}

interface ScenarioTaskRatioDetails {
  total_scenarios: number;
  total_tasks: number;
  ratio: number;
  scenarios: string[];
  tasks: string[];
}

interface AllTasksDoneDetails {
  total: number;
  done: number;
  remaining: string[];
}

interface TddMarkerDetails {
  total_done: number;
  with_marker: number;
  without_marker: string[];
  skipped: string[];
}

interface CommandDetails {
  exit_code: number;
  stdout: string;
  stderr: string;
}

// ── Built-in gate types ────────────────────────────────────────────────

export const BUILTIN_GATE_TYPES = [
  'capability-coverage',
  'scenario-task-ratio',
  'all-tasks-done',
  'validate-delta-specs',
  'ai-review',
  'command',
  'tdd-markers',
] as const;

export type BuiltinGateType = typeof BUILTIN_GATE_TYPES[number];

// ── Plugin gate uniqueness validation ──────────────────────────────────

/**
 * Validate that plugin gate IDs don't conflict with built-in types
 * or with each other across plugins.
 * Returns an array of error messages (empty = no conflicts).
 */
export function validateGateTypeUniqueness(plugins: LoadedPlugin[]): string[] {
  const errors: string[] = [];
  const builtinSet = new Set<string>(BUILTIN_GATE_TYPES);
  const seen = new Map<string, string>(); // gate id -> plugin name

  for (const plugin of plugins) {
    const gates = plugin.manifest.gates ?? [];
    for (const gate of gates) {
      // Check conflict with built-in types
      if (builtinSet.has(gate.id)) {
        errors.push(
          `Plugin "${plugin.manifest.name}" gate "${gate.id}" conflicts with built-in gate type`
        );
      }
      // Check conflict with other plugins
      const existing = seen.get(gate.id);
      if (existing) {
        errors.push(
          `Plugin "${plugin.manifest.name}" gate "${gate.id}" conflicts with plugin "${existing}"`
        );
      } else {
        seen.set(gate.id, plugin.manifest.name);
      }
    }
  }

  return errors;
}

// ── GateChecker ─────────────────────────────────────────────────────────

export class GateChecker {
  private plugins: LoadedPlugin[];

  constructor(plugins?: LoadedPlugin[]) {
    this.plugins = plugins ?? [];
  }

  /**
   * Check that every capability listed in proposal.md has a matching spec dir.
   */
  checkCapabilityCoverage(changeDir: string): { passed: boolean } & CapabilityCoverageDetails {
    const proposalPath = path.join(changeDir, 'proposal.md');
    const specsDir = path.join(changeDir, 'specs');

    const proposalCapabilities = this.parseProposalCapabilities(proposalPath);
    const specDirs = this.listSpecDirs(specsDir);

    const specDirSet = new Set(specDirs);
    const missing = proposalCapabilities.filter(cap => !specDirSet.has(cap));

    return {
      passed: missing.length === 0,
      proposal_capabilities: proposalCapabilities,
      spec_dirs: specDirs,
      missing,
    };
  }

  /**
   * Check that the number of tasks is >= 80% of the number of scenarios.
   */
  checkScenarioTaskRatio(changeDir: string): { passed: boolean } & ScenarioTaskRatioDetails {
    const specsDir = path.join(changeDir, 'specs');
    const tasksPath = path.join(changeDir, 'tasks.md');

    const scenarios = this.collectScenarios(specsDir);
    const tasks = this.collectTasks(tasksPath);

    const totalScenarios = scenarios.length;
    const totalTasks = tasks.length;
    const ratio = totalScenarios === 0 ? 1 : totalTasks / totalScenarios;

    return {
      passed: ratio >= 0.8,
      total_scenarios: totalScenarios,
      total_tasks: totalTasks,
      ratio: Math.round(ratio * 100) / 100,
      scenarios,
      tasks,
    };
  }

  /**
   * Check that all tasks in tasks.md are completed (no unchecked checkboxes).
   */
  checkAllTasksDone(changeDir: string): { passed: boolean } & AllTasksDoneDetails {
    const tasksPath = path.join(changeDir, 'tasks.md');
    let content: string;
    try {
      content = readFileSync(tasksPath, 'utf-8');
    } catch {
      return { passed: true, total: 0, done: 0, remaining: [] };
    }

    const lines = content.split('\n');
    const done: string[] = [];
    const remaining: string[] = [];

    for (const line of lines) {
      const doneMatch = line.match(/^-\s+\[x\]\s+(.+)/i);
      const todoMatch = line.match(/^-\s+\[\s\]\s+(.+)/);
      if (doneMatch) {
        done.push(doneMatch[1].trim());
      } else if (todoMatch) {
        remaining.push(todoMatch[1].trim());
      }
    }

    const total = done.length + remaining.length;
    return {
      passed: remaining.length === 0,
      total,
      done: done.length,
      remaining,
    };
  }

  /**
   * Check that every completed task has a TDD marker on the next line.
   */
  checkTddMarkers(changeDir: string): { passed: boolean } & TddMarkerDetails {
    const tasksPath = path.join(changeDir, 'tasks.md');
    let content: string;
    try {
      content = readFileSync(tasksPath, 'utf-8');
    } catch {
      return { passed: true, total_done: 0, with_marker: 0, without_marker: [], skipped: [] };
    }

    const lines = content.split('\n');
    let totalDone = 0;
    let withMarker = 0;
    const withoutMarker: string[] = [];
    const skipped: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const doneMatch = lines[i].match(/^-\s+\[x\]\s+(.+)/i);
      if (!doneMatch) continue;

      totalDone++;
      const taskDesc = doneMatch[1].trim();

      // Skip TDD check for tasks annotated with [skip-tdd]
      if (taskDesc.includes('[skip-tdd]')) {
        skipped.push(taskDesc);
        continue;
      }

      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';

      if (nextLine.startsWith('> TDD:')) {
        withMarker++;
      } else {
        withoutMarker.push(taskDesc);
      }
    }

    return {
      passed: withoutMarker.length === 0,
      total_done: totalDone,
      with_marker: withMarker,
      without_marker: withoutMarker,
      skipped,
    };
  }

  /**
   * Execute a shell command and return its result.
   */
  runCommand(command: string): { passed: boolean } & CommandDetails {
    try {
      const stdout = execSync(command, {
        timeout: 30_000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { passed: true, exit_code: 0, stdout, stderr: '' };
    } catch (err: unknown) {
      const error = err as { status?: number; stdout?: string; stderr?: string };
      return {
        passed: false,
        exit_code: error.status ?? 1,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? '',
      };
    }
  }

  /**
   * Unified gate check dispatcher.
   */
  async checkGate(gate: GateInput, changeDir: string): Promise<GateCheckResult> {
    switch (gate.check) {
      case 'capability-coverage': {
        const result = this.checkCapabilityCoverage(changeDir);
        return {
          id: gate.id,
          description: 'Capability coverage: every proposal capability has a spec dir',
          passed: result.passed,
          details: { ...result },
        };
      }

      case 'scenario-task-ratio': {
        const result = this.checkScenarioTaskRatio(changeDir);
        return {
          id: gate.id,
          description: 'Scenario-task ratio: tasks >= 80% of scenarios',
          passed: result.passed,
          details: { ...result },
        };
      }

      case 'all-tasks-done': {
        const result = this.checkAllTasksDone(changeDir);
        return {
          id: gate.id,
          description: 'All tasks done: no unchecked checkboxes in tasks.md',
          passed: result.passed,
          details: { ...result },
        };
      }

      case 'tdd-markers': {
        const result = this.checkTddMarkers(changeDir);
        return {
          id: gate.id,
          description: 'TDD markers: every completed task has a TDD marker',
          passed: result.passed,
          details: { ...result },
        };
      }

      case 'validate-delta-specs': {
        const validator = new Validator();
        const report = await validator.validateChangeDeltaSpecs(changeDir);
        return {
          id: gate.id,
          description: 'Validate delta specs: all delta spec files pass validation',
          passed: report.valid,
          details: { issues: report.issues, summary: report.summary },
        };
      }

      case 'ai-review': {
        return {
          id: gate.id,
          description: 'AI review: requires human/AI review',
          passed: true,
          details: { prompt: gate.prompt },
          ai_review_needed: true,
        };
      }

      case 'command': {
        if (!gate.command) {
          return {
            id: gate.id,
            description: 'Command gate: no command specified',
            passed: false,
            details: { error: 'No command specified in gate definition' },
          };
        }
        const result = this.runCommand(gate.command);
        return {
          id: gate.id,
          description: `Command gate: ${gate.command}`,
          passed: result.passed,
          details: { ...result },
        };
      }

      default: {
        // Look for a matching plugin gate
        const pluginGate = this.findPluginGate(gate.check);
        if (pluginGate) {
          return this.executePluginGate(gate, pluginGate.gate, pluginGate.plugin, changeDir);
        }
        return {
          id: gate.id,
          description: `Unknown check type: ${gate.check}`,
          passed: false,
          details: { error: `Unknown check type: "${gate.check}". Not a built-in type and no plugin provides it.` },
        };
      }
    }
  }

  // ── Parallel gate execution ─────────────────────────────────────────

  /**
   * Execute gates in parallel groups.
   * Command-type gates within a parallel group run via Promise.all().
   * Prompt-type gates are returned as pending (ai_review_needed).
   * Results are persisted to .gates/ directory.
   */
  async checkGatesParallel(
    gates: GateInput[],
    changeDir: string,
    parallelGroups: ParallelGroup[]
  ): Promise<GateCheckResult[]> {
    const results: GateCheckResult[] = [];
    const parallelGateIds = new Set(parallelGroups.flatMap((g) => g.ids));

    // Process parallel groups
    for (const group of parallelGroups) {
      const groupGates = gates.filter((g) => group.ids.includes(g.id));

      if (group.parallel) {
        // Execute command gates in parallel
        const promises = groupGates.map((gate) => this.checkGate(gate, changeDir));
        const groupResults = await Promise.all(promises);
        results.push(...groupResults);
      } else {
        // Execute sequentially
        for (const gate of groupGates) {
          const result = await this.checkGate(gate, changeDir);
          results.push(result);
        }
      }
    }

    // Execute remaining gates sequentially
    const sequentialGates = gates.filter((g) => !parallelGateIds.has(g.id));
    for (const gate of sequentialGates) {
      const result = await this.checkGate(gate, changeDir);
      results.push(result);
    }

    // Persist results
    this.persistGateResults(changeDir, results);

    return results;
  }

  /**
   * Write gate results to .gates/ directory in the change directory.
   */
  persistGateResults(changeDir: string, results: GateCheckResult[]): void {
    const gatesDir = path.join(changeDir, '.gates');
    if (!existsSync(gatesDir)) {
      mkdirSync(gatesDir, { recursive: true });
    }

    // Write individual gate results
    for (const result of results) {
      const resultPath = path.join(gatesDir, `${result.id}.json`);
      writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8');
    }

    // Write synthesis summary
    const synthesis = {
      timestamp: new Date().toISOString(),
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      results: results.map((r) => ({
        id: r.id,
        passed: r.passed,
        ai_review_needed: r.ai_review_needed ?? false,
      })),
    };
    const synthesisPath = path.join(gatesDir, 'synthesis.json');
    writeFileSync(synthesisPath, JSON.stringify(synthesis, null, 2), 'utf-8');
  }

  /**
   * Read a persisted gate result from .gates/ directory.
   */
  readGateResult(changeDir: string, gateId: string): GateCheckResult | null {
    const resultPath = path.join(changeDir, '.gates', `${gateId}.json`);
    try {
      const content = readFileSync(resultPath, 'utf-8');
      return JSON.parse(content) as GateCheckResult;
    } catch {
      return null;
    }
  }

  /**
   * Read the synthesis summary from .gates/ directory.
   */
  readSynthesis(changeDir: string): Record<string, unknown> | null {
    const synthesisPath = path.join(changeDir, '.gates', 'synthesis.json');
    try {
      const content = readFileSync(synthesisPath, 'utf-8');
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  // ── Plugin gate helpers ──────────────────────────────────────────────

  private findPluginGate(checkType: string): { gate: GateDefinition; plugin: LoadedPlugin } | null {
    for (const plugin of this.plugins) {
      const gates = plugin.manifest.gates ?? [];
      for (const gate of gates) {
        if (gate.id === checkType) {
          return { gate, plugin };
        }
      }
    }
    return null;
  }

  private executePluginGate(
    input: GateInput,
    gateDef: GateDefinition,
    plugin: LoadedPlugin,
    changeDir: string,
  ): GateCheckResult {
    const handler = gateDef.handler;
    const description = gateDef.description ?? `Plugin gate: ${gateDef.id} (from ${plugin.manifest.name})`;

    if (handler.type === 'command' || handler.type === 'both') {
      const command = handler.run;
      if (!command) {
        return {
          id: input.id,
          description,
          passed: handler.ignore_failure ?? false,
          details: { error: 'Plugin gate handler has no "run" command specified' },
        };
      }
      // Resolve command relative to plugin dir, inject CHANGE_DIR env
      const result = this.runPluginCommand(command, plugin.dir, changeDir);
      const passed = result.passed || (handler.ignore_failure ?? false);

      if (handler.type === 'both') {
        return {
          id: input.id,
          description,
          passed,
          details: { ...result, prompt: handler.file },
          ai_review_needed: true,
        };
      }
      return {
        id: input.id,
        description,
        passed,
        details: { ...result },
      };
    }

    if (handler.type === 'prompt') {
      return {
        id: input.id,
        description,
        passed: true,
        details: { prompt: handler.file },
        ai_review_needed: true,
      };
    }

    return {
      id: input.id,
      description,
      passed: false,
      details: { error: `Unsupported handler type: ${handler.type}` },
    };
  }

  private runPluginCommand(command: string, pluginDir: string, changeDir: string): { passed: boolean; exit_code: number; stdout: string; stderr: string } {
    try {
      const stdout = execSync(command, {
        cwd: pluginDir,
        timeout: 30_000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, OPENSPEC_CHANGE_DIR: changeDir },
      });
      return { passed: true, exit_code: 0, stdout, stderr: '' };
    } catch (err: unknown) {
      const error = err as { status?: number; stdout?: string; stderr?: string };
      return {
        passed: false,
        exit_code: error.status ?? 1,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? '',
      };
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────

  private parseProposalCapabilities(proposalPath: string): string[] {
    let content: string;
    try {
      content = readFileSync(proposalPath, 'utf-8');
    } catch {
      return [];
    }

    const capabilities: string[] = [];
    const lines = content.split('\n');
    let inCapabilities = false;
    let inNewCapabilities = false;

    for (const line of lines) {
      // Detect ## Capabilities section
      if (/^##\s+Capabilities/i.test(line)) {
        inCapabilities = true;
        continue;
      }
      // Detect ### New Capabilities subsection
      if (inCapabilities && /^###\s+New Capabilities/i.test(line)) {
        inNewCapabilities = true;
        continue;
      }
      // Exit on next ## or ### section
      if (inNewCapabilities && /^##[#]?\s+/.test(line) && !/^###\s+New Capabilities/i.test(line)) {
        break;
      }

      if (!inNewCapabilities) continue;

      // Match list format: - `name`: description
      const listMatch = line.match(/^-\s+`([^`]+)`/);
      if (listMatch) {
        capabilities.push(listMatch[1]);
        continue;
      }
      // Match table format: | `name` | description |
      const tableMatch = line.match(/^\|\s*`([^`]+)`\s*\|/);
      if (tableMatch) {
        capabilities.push(tableMatch[1]);
      }
    }

    return capabilities;
  }

  private listSpecDirs(specsDir: string): string[] {
    try {
      const entries = readdirSync(specsDir, { withFileTypes: true });
      return entries.filter(e => e.isDirectory()).map(e => e.name);
    } catch {
      return [];
    }
  }

  private collectScenarios(specsDir: string): string[] {
    const scenarios: string[] = [];
    try {
      this.walkMarkdownFiles(specsDir, (filePath) => {
        let content: string;
        try {
          content = readFileSync(filePath, 'utf-8');
        } catch {
          return;
        }
        const matches = content.matchAll(/^####\s+Scenario:\s*(.+)/gm);
        for (const m of matches) {
          scenarios.push(m[1].trim());
        }
      });
    } catch {
      // specsDir doesn't exist
    }
    return scenarios;
  }

  private collectTasks(tasksPath: string): string[] {
    let content: string;
    try {
      content = readFileSync(tasksPath, 'utf-8');
    } catch {
      return [];
    }

    const tasks: string[] = [];
    for (const line of content.split('\n')) {
      const match = line.match(/^-\s+\[[ x]\]\s+(.+)/i);
      if (match) {
        tasks.push(match[1].trim());
      }
    }
    return tasks;
  }

  private walkMarkdownFiles(dir: string, callback: (filePath: string) => void): void {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.walkMarkdownFiles(fullPath, callback);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        callback(fullPath);
      }
    }
  }
}
