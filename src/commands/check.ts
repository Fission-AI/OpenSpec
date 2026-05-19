import ora from 'ora';
import path from 'path';
import { promises as fs } from 'fs';
import { runCheck, detectChecks, CheckResult, CheckReport } from '../core/code-checker/index.js';
import { readProjectConfig } from '../core/project-config.js';
import { getActiveChangeIds } from '../utils/item-discovery.js';

export interface CheckOptions {
  json?: boolean;
  concurrency?: string;
  noInteractive?: boolean;
}

export class CheckCommand {
  async execute(changeName: string | undefined, options: CheckOptions = {}): Promise<void> {
    const projectRoot = process.cwd();

    // Resolve change name
    const resolvedChangeName = await this.resolveChangeName(changeName, options);
    if (!resolvedChangeName) {
      process.exitCode = 1;
      return;
    }

    // Read config
    const config = readProjectConfig(projectRoot);
    const checks = config?.checks ?? [];

    if (checks.length === 0) {
      const detected = detectChecks(projectRoot);
      if (options.json) {
        console.log(
          JSON.stringify(
            {
              change: resolvedChangeName,
              checks: [],
              summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
              hint: detected?.message ?? 'No checks configured. Add checks to openspec/config.yaml',
              detected: detected?.detected ?? [],
            },
            null,
            2
          )
        );
      } else {
        console.log('No checks configured in openspec/config.yaml');
        if (detected) {
          console.log(`\n${detected.message}`);
          console.log('\nSuggested checks:');
          for (const check of detected.detected) {
            console.log(`  - name: "${check.name}"`);
            console.log(`    command: "${check.command}"`);
          }
        } else {
          console.log(
            '\nExample configuration:\n\nchecks:\n  - name: "TypeScript types"\n    command: "pnpm exec tsc --noEmit"'
          );
        }
      }
      process.exitCode = 0;
      return;
    }

    // Detect affected files for filtering
    const affectedFiles = await this.detectAffectedFiles(projectRoot, resolvedChangeName);

    // Run checks
    const concurrency = this.normalizeConcurrency(options.concurrency) ?? 3;
    const spinner = !options.json && !options.noInteractive ? ora('Running checks...').start() : undefined;

    const queue: Array<() => Promise<CheckResult>> = [];

    for (const entry of checks) {
      queue.push(async () => {
        const result = await runCheck(projectRoot, entry, {
          affectedFiles: affectedFiles.length > 0 ? affectedFiles : undefined,
        });
        return result;
      });
    }

    const results: CheckResult[] = new Array(queue.length);
    let index = 0;
    let running = 0;

    await new Promise<void>((resolve) => {
      const next = () => {
        while (running < concurrency && index < queue.length) {
          const currentIndex = index++;
          const task = queue[currentIndex];
          running++;
          if (spinner) spinner.text = `Running checks (${currentIndex + 1}/${queue.length})...`;
          task()
            .then((res) => {
              results[currentIndex] = res;
            })
            .catch((error: any) => {
              const message = error?.message || 'Unknown error';
              results[currentIndex] = {
                name: checks[currentIndex]?.name ?? 'unknown',
                passed: false,
                durationMs: 0,
                stdout: '',
                stderr: message,
                issues: [{ level: 'ERROR', path: 'check', message }],
              };
            })
            .finally(() => {
              running--;
              if (index >= queue.length && running === 0) resolve();
              else next();
            });
        }
      };
      next();
    });

    spinner?.stop();

    // Build report
    const orderedResults = results.filter((r): r is CheckResult => Boolean(r));
    const report: CheckReport = {
      changeName: resolvedChangeName,
      checks: orderedResults,
      summary: {
        total: orderedResults.length,
        passed: orderedResults.filter((r) => r.passed && !r.skipped).length,
        failed: orderedResults.filter((r) => !r.passed && !r.skipped).length,
        skipped: orderedResults.filter((r) => r.skipped).length,
      },
    };

    // Output
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      this.printReport(report);
    }

    process.exitCode = report.summary.failed > 0 ? 1 : 0;
  }

  private async resolveChangeName(
    changeName: string | undefined,
    options: CheckOptions
  ): Promise<string | undefined> {
    if (changeName) return changeName;

    const changes = await getActiveChangeIds();
    if (changes.length === 0) {
      console.error('No active changes found.');
      return undefined;
    }
    if (changes.length === 1) {
      return changes[0];
    }

    if (options.noInteractive) {
      console.error('Multiple active changes found. Specify one explicitly:');
      for (const c of changes) {
        console.error(`  ${c}`);
      }
      return undefined;
    }

    // Interactive pick
    const { select } = await import('@inquirer/prompts');
    const choice = await select({
      message: 'Select a change to check',
      choices: changes.map((c) => ({ name: c, value: c })),
    });
    return choice;
  }

  private async detectAffectedFiles(projectRoot: string, changeName: string): Promise<string[]> {
    const changeDir = path.join(projectRoot, 'openspec', 'changes', changeName);
    const files = new Set<string>();

    // Scan tasks.md and design.md for likely file paths
    for (const filename of ['tasks.md', 'design.md']) {
      const filePath = path.join(changeDir, filename);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        // Look for file paths in common patterns:
        // - `src/foo.ts`
        // - "src/foo.ts"
        // - (src/foo.ts)
        // - backtick-wrapped paths
        const pathRegex = /(?:`[^`]+`|"[^"]+"|'[^']+'|\([\w/.-]+\)|[\w/.-]+\.[a-zA-Z0-9]+)/g;
        const matches = content.match(pathRegex) ?? [];
        for (const match of matches) {
          const cleaned = match.replace(/^[`"'()]|[`"'()]$/g, '');
          // Heuristic: looks like a relative or absolute file path
          if (cleaned.includes('/') || cleaned.includes('\\')) {
            files.add(cleaned);
          }
        }
      } catch {
        // File doesn't exist, ignore
      }
    }

    return Array.from(files);
  }

  private printReport(report: CheckReport): void {
    console.log(`\nStatic checks for change: ${report.changeName}\n`);

    for (const check of report.checks) {
      if (check.skipped) {
        console.log(`⊘ ${check.name} (skipped${check.skipReason ? `: ${check.skipReason}` : ''})`);
        continue;
      }
      if (check.passed) {
        console.log(`✓ ${check.name} (${check.durationMs}ms)`);
      } else {
        console.error(`✗ ${check.name} (${check.durationMs}ms)`);
        for (const issue of check.issues) {
          const loc = issue.line ? `:${issue.line}${issue.column ? `:${issue.column}` : ''}` : '';
          console.error(`  [${issue.level}] ${issue.path}${loc}: ${issue.message}`);
        }
        // If no structured issues but there's stderr, show first few lines
        if (check.issues.length === 0 && check.stderr) {
          const lines = check.stderr.split('\n').filter((l) => l.trim());
          for (const line of lines.slice(0, 5)) {
            console.error(`  ${line}`);
          }
          if (lines.length > 5) {
            console.error(`  ... and ${lines.length - 5} more lines`);
          }
        }
      }
    }

    console.log(
      `\nSummary: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped (${report.summary.total} total)`
    );

    if (report.summary.failed > 0) {
      console.error('\nFix the issues above and run again.');
    }
  }

  private normalizeConcurrency(value?: string): number | undefined {
    if (!value) return undefined;
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n <= 0) return undefined;
    return n;
  }
}
