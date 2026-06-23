import { spawn } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..', '..');
const cliEntry = path.join(projectRoot, 'dist', 'cli', 'index.js');

// Inputs whose modification should invalidate the compiled CLI bundle. The e2e
// tests spawn `dist/cli/index.js`, so a stale `dist/` silently runs old code —
// a build from before a fix lands makes a corrected source look broken (and the
// reverse). Rebuild whenever any of these is newer than the built entry.
const buildInputs = [
  path.join(projectRoot, 'src'),
  path.join(projectRoot, 'build.js'),
  path.join(projectRoot, 'tsconfig.json'),
  path.join(projectRoot, 'package.json'),
];

let buildPromise: Promise<void> | undefined;
let ensured = false;

/** Newest mtime (ms) among `target` and, if it is a directory, everything under it. */
function newestMtimeMs(target: string): number {
  let newest = 0;
  const stack = [target];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let stat;
    try {
      stat = statSync(current);
    } catch {
      continue; // Missing input; ignore.
    }
    if (stat.isDirectory()) {
      for (const entry of readdirSync(current)) {
        stack.push(path.join(current, entry));
      }
    } else if (stat.mtimeMs > newest) {
      newest = stat.mtimeMs;
    }
  }
  return newest;
}

/** True when the built CLI bundle is missing or older than any build input. */
function isBuildStale(): boolean {
  let builtMtime: number;
  try {
    builtMtime = statSync(cliEntry).mtimeMs;
  } catch {
    return true; // Not built yet.
  }
  return buildInputs.some((input) => newestMtimeMs(input) > builtMtime);
}

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

export async function ensureCliBuilt() {
  // Verified fresh earlier in this process; skip the (recursive) staleness scan.
  if (ensured) {
    return;
  }

  if (existsSync(cliEntry) && !isBuildStale()) {
    ensured = true;
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
  ensured = true;
}

export async function runCLI(args: string[] = [], options: RunCLIOptions = {}): Promise<RunCLIResult> {
  await ensureCliBuilt();

  const finalArgs = Array.isArray(args) ? args : [args];
  const invocation = [cliEntry, ...finalArgs].join(' ');

  return new Promise<RunCLIResult>((resolve, reject) => {
    const child = spawn(process.execPath, [cliEntry, ...finalArgs], {
      cwd: options.cwd ?? projectRoot,
      env: {
        ...process.env,
        OPEN_SPEC_INTERACTIVE: '0',
        ...options.env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    // Prevent child process from keeping the event loop alive
    child.unref();

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill('SIGKILL');
        }, options.timeoutMs)
      : undefined;

    child.stdout?.setEncoding('utf-8');
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });

    child.stderr?.setEncoding('utf-8');
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      if (timeout) clearTimeout(timeout);
      // Explicitly destroy streams to prevent hanging handles
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.stdin?.destroy();
      reject(error);
    });

    child.on('close', (code, signal) => {
      if (timeout) clearTimeout(timeout);
      // Explicitly destroy streams to prevent hanging handles
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.stdin?.destroy();
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
