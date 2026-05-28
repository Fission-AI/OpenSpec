import { spawn } from 'child_process';
import path from 'path';
import { CheckEntry, CheckResult, CheckIssue } from './types.js';

const DEFAULT_TIMEOUT_MS = 60_000;

function parseIssuesFromOutput(stdout: string, stderr: string): CheckIssue[] {
  const combined = stdout + '\n' + stderr;
  const issues: CheckIssue[] = [];

  // Try to parse common error formats:
  // TypeScript: src/file.ts(5,23): error TS2345: ...
  // ESLint: /path/to/file.ts\n  5:23  error  ...
  // Cargo: error[E0000]: ...\n   --> src/file.rs:5:23
  // Generic: file.ext:5:23: error: ...

  const lines = combined.split('\n');

  for (const line of lines) {
    // TypeScript style: file.ts(5,23): error TS2345: message
    const tsMatch = line.match(/^(.+)\((\d+),(\d+)\):\s*(error|warning)\s+(.+)$/i);
    if (tsMatch) {
      issues.push({
        level: tsMatch[4].toLowerCase() === 'error' ? 'ERROR' : 'WARNING',
        path: tsMatch[1].trim(),
        line: parseInt(tsMatch[2], 10),
        column: parseInt(tsMatch[3], 10),
        message: tsMatch[5].trim(),
      });
      continue;
    }

    // ESLint style:   5:23  error  Message  rule-name
    const eslintMatch = line.match(/^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+\S+$/);
    if (eslintMatch) {
      issues.push({
        level: eslintMatch[3].toLowerCase() === 'error' ? 'ERROR' : 'WARNING',
        path: '', // ESLint output often prefixes with file path on previous line; keep empty
        line: parseInt(eslintMatch[1], 10),
        column: parseInt(eslintMatch[2], 10),
        message: eslintMatch[4].trim(),
      });
      continue;
    }

    // Cargo style:   --> src/file.rs:5:23
    const cargoLocMatch = line.match(/^\s*-->\s+(.+):(\d+):(\d+)$/);
    if (cargoLocMatch) {
      // The message is usually on previous lines; we capture location only
      issues.push({
        level: 'ERROR',
        path: cargoLocMatch[1].trim(),
        line: parseInt(cargoLocMatch[2], 10),
        column: parseInt(cargoLocMatch[3], 10),
        message: 'See preceding lines for error details',
      });
      continue;
    }

    // Generic style: path/to/file:5:23: error: message
    const genericMatch = line.match(/^(.+?):(\d+):(\d+):\s*(error|warning):\s*(.+)$/i);
    if (genericMatch) {
      issues.push({
        level: genericMatch[4].toLowerCase() === 'error' ? 'ERROR' : 'WARNING',
        path: genericMatch[1].trim(),
        line: parseInt(genericMatch[2], 10),
        column: parseInt(genericMatch[3], 10),
        message: genericMatch[5].trim(),
      });
      continue;
    }
  }

  return issues;
}

export async function runCheck(
  projectRoot: string,
  entry: CheckEntry,
  options?: {
    timeoutMs?: number;
    affectedFiles?: string[];
  }
): Promise<CheckResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // If files filter is specified, skip when no affected files match
  if (entry.files && entry.files.length > 0 && options?.affectedFiles) {
    const hasMatch = entry.files.some((pattern) =>
      options.affectedFiles!.some((file) => matchGlob(file, pattern))
    );
    if (!hasMatch) {
      return {
        name: entry.name,
        passed: true,
        durationMs: 0,
        stdout: '',
        stderr: '',
        issues: [],
        skipped: true,
        skipReason: 'No affected files matched the check patterns',
      };
    }
  }

  const start = Date.now();

  return new Promise<CheckResult>((resolve) => {
    const child = spawn(entry.command, [], {
      shell: true,
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      // Force kill after grace period
      setTimeout(() => {
        // `killed` only means a signal was sent; check actual process state
        if (child.exitCode === null && child.signalCode === null) {
          child.kill('SIGKILL');
        }
      }, 5000);
    }, timeoutMs);

    child.stdout?.setEncoding('utf-8');
    child.stdout?.on('data', (chunk: string) => {
      stdout += chunk;
    });

    child.stderr?.setEncoding('utf-8');
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      const durationMs = Date.now() - start;
      resolve({
        name: entry.name,
        passed: false,
        durationMs,
        stdout,
        stderr: stderr || error.message,
        issues: [
          {
            level: 'ERROR',
            path: 'check',
            message: `Failed to run check: ${error.message}`,
          },
        ],
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      const durationMs = Date.now() - start;

      if (timedOut) {
        resolve({
          name: entry.name,
          passed: false,
          durationMs,
          stdout,
          stderr,
          issues: [
            {
              level: 'ERROR',
              path: 'check',
              message: `Check timed out after ${timeoutMs}ms`,
            },
          ],
        });
        return;
      }

      const passed = code === 0;
      const issues = passed ? [] : parseIssuesFromOutput(stdout, stderr);

      // If we couldn't parse structured issues, surface stderr as a single issue
      if (!passed && issues.length === 0 && stderr.trim()) {
        issues.push({
          level: 'ERROR',
          path: 'check',
          message: stderr.trim(),
        });
      }

      resolve({
        name: entry.name,
        passed,
        durationMs,
        stdout,
        stderr,
        issues,
      });
    });
  });
}

/**
 * Naive glob matcher sufficient for static check file filtering.
 * Supports * and ** patterns.
 */
function matchGlob(filePath: string, pattern: string): boolean {
  const normalizedFile = path.posix.normalize(filePath.replace(/\\/g, '/'));
  const normalizedPattern = path.posix.normalize(pattern.replace(/\\/g, '/'));

  // Convert glob pattern to regex
  // First substitute ** and * with placeholders, then escape regex metacharacters,
  // then restore placeholders to their intended regex fragments
  const escaped = normalizedPattern.replace(/[|\\{}()\[\]^$+?.]/g, '\\$&');
  let regexStr = escaped
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '{{STAR}}')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*')
    .replace(/\{\{STAR\}\}/g, '[^/]*');

  // Anchor if pattern doesn't start with wildcard
  if (!regexStr.startsWith('.*')) {
    regexStr = '(?:^|/)' + regexStr;
  }

  const regex = new RegExp(regexStr);
  return regex.test(normalizedFile);
}
