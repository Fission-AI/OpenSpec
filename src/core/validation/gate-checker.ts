import { readFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { Validator } from './validator.js';

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
}

interface CommandDetails {
  exit_code: number;
  stdout: string;
  stderr: string;
}

// ── GateChecker ─────────────────────────────────────────────────────────

export class GateChecker {

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
      return { passed: true, total_done: 0, with_marker: 0, without_marker: [] };
    }

    const lines = content.split('\n');
    let totalDone = 0;
    let withMarker = 0;
    const withoutMarker: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const doneMatch = lines[i].match(/^-\s+\[x\]\s+(.+)/i);
      if (!doneMatch) continue;

      totalDone++;
      const taskDesc = doneMatch[1].trim();
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
        return {
          id: gate.id,
          description: `Unknown check type: ${gate.check}`,
          passed: false,
          details: { error: 'Unknown check type' },
        };
      }
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
