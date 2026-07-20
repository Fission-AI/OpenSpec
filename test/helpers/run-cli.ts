import { type ChildProcess, spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..', '..');
const cliEntry = path.join(projectRoot, 'dist', 'cli', 'index.js');
const DEFAULT_CLI_TIMEOUT_MS = 30_000;

let buildPromise: Promise<void> | undefined;
const activeCliChildren = new Set<ChildProcess>();

interface RunCommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

interface RunCLIOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs?: number;
}

export interface RunCLIResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  command: string;
}

function runCommand(command: string, args: string[], options: RunCommandOptions = {}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectRoot,
      env: { ...process.env, ...options.env },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        const reason = signal ? `signal ${signal}` : `exit code ${code}`;
        reject(new Error(`Command failed (${reason}): ${command} ${args.join(' ')}`));
      }
    });
  });
}

function mergeEnv(
  ...sources: Array<NodeJS.ProcessEnv | undefined>
): NodeJS.ProcessEnv {
  const merged: NodeJS.ProcessEnv = {};

  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) continue;

      if (process.platform === 'win32') {
        const existingKey = Object.keys(merged).find(
          (candidate) => candidate.toLowerCase() === key.toLowerCase()
        );
        if (existingKey && existingKey !== key) {
          delete merged[existingKey];
        }
      }

      merged[key] = value;
    }
  }

  return merged;
}

function terminateProcessTree(child: ChildProcess): void {
  if (!child.pid || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    }).on('error', () => {
      child.kill('SIGKILL');
    });
    return;
  }

  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    child.kill('SIGKILL');
  }
}

function formatOutputTail(output: string): string {
  const lines = output.trimEnd().split(/\r?\n/);
  return lines.slice(-20).join('\n');
}

export function terminateActiveCliChildren(): void {
  for (const child of activeCliChildren) {
    terminateProcessTree(child);
  }
}

export async function ensureCliBuilt() {
  if (existsSync(cliEntry)) {
    return;
  }

  if (!buildPromise) {
    buildPromise = runCommand('pnpm', ['run', 'build']).catch((error) => {
      buildPromise = undefined;
      throw error;
    });
  }

  await buildPromise;

  if (!existsSync(cliEntry)) {
    throw new Error('CLI entry point missing after build. Expected dist/cli/index.js');
  }
}

export async function runCLI(args: string[] = [], options: RunCLIOptions = {}): Promise<RunCLIResult> {
  await ensureCliBuilt();

  const finalArgs = Array.isArray(args) ? args : [args];
  const invocation = [cliEntry, ...finalArgs].join(' ');

  return new Promise<RunCLIResult>((resolve, reject) => {
    const timeoutMs = options.timeoutMs ?? DEFAULT_CLI_TIMEOUT_MS;
    const child = spawn(process.execPath, [cliEntry, ...finalArgs], {
      cwd: options.cwd ?? projectRoot,
      env: mergeEnv(
        process.env,
        {
          OPENSPEC_TELEMETRY: '0',
          OPEN_SPEC_INTERACTIVE: '0',
        },
        options.env
      ),
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
      windowsHide: true,
    });

    // Prevent child process from keeping the event loop alive
    child.unref();
    activeCliChildren.add(child);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      terminateProcessTree(child);
    }, timeoutMs);

    child.stdout?.setEncoding('utf-8');
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });

    child.stderr?.setEncoding('utf-8');
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      activeCliChildren.delete(child);
      // Explicitly destroy streams to prevent hanging handles
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.stdin?.destroy();
      reject(error);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      activeCliChildren.delete(child);
      // Explicitly destroy streams to prevent hanging handles
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.stdin?.destroy();
      if (timedOut) {
        reject(
          new Error(
            [
              `CLI command timed out after ${timeoutMs}ms: node ${invocation}`,
              stderr ? `stderr tail:\n${formatOutputTail(stderr)}` : '',
              stdout ? `stdout tail:\n${formatOutputTail(stdout)}` : '',
            ]
              .filter(Boolean)
              .join('\n\n')
          )
        );
        return;
      }
      resolve({
        exitCode: code,
        signal,
        stdout,
        stderr,
        timedOut,
        command: `node ${invocation}`,
      });
    });

    if (options.input && child.stdin) {
      child.stdin.end(options.input);
    } else if (child.stdin) {
      child.stdin.end();
    }
  });
}

export const cliProjectRoot = projectRoot;
