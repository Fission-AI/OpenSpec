import { defineConfig } from 'vitest/config';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Every test runs with a throwaway home, so a test that forgets to isolate it
// can never write to the developer's real one (~/.minimax/skills,
// ~/.codex/prompts, the global config). Tests that need their own still set it.
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-home-'));
process.env.OPENSPEC_TEST_HOME = testHome;

function resolveMaxWorkers(): number | undefined {
  // Allow callers (CI/agents) to override without editing config.
  const raw = process.env.VITEST_MAX_WORKERS;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Vitest v3 defaults to `pool: "forks"` and scales worker processes with CPU.
  // This repo's tests can spawn many Node processes (CLI invocations, temp FS),
  // so cap parallelism to avoid runaway CPU/memory usage in automation.
  const cpuCount = typeof os.availableParallelism === 'function'
    ? os.availableParallelism()
    : os.cpus().length;
  return Math.min(4, Math.max(1, cpuCount));
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: './vitest.setup.ts',
    // Opt the suite out of telemetry. Many tests spawn the real CLI, which runs
    // the preAction hook like any user invocation: it would persist an
    // anonymousId into the developer's *real* global config and POST a
    // command_executed event per spawn. Workers inherit this env, and so do the
    // CLI child processes they spawn. Telemetry's own tests delete these vars
    // before asserting, so they are unaffected.
    env: {
      OPENSPEC_TELEMETRY: '0',
      DO_NOT_TRACK: '1',
      HOME: testHome,
      USERPROFILE: testHome,
      XDG_CONFIG_HOME: path.join(testHome, '.config'),
      XDG_DATA_HOME: path.join(testHome, '.local', 'share'),
      CODEX_HOME: path.join(testHome, '.codex'),
      // Project and global skill installs read the checkout's own skills/
      // folder, so no test fetches them from the network.
      OPENSPEC_SKILLS_SOURCE: path.join(path.dirname(fileURLToPath(import.meta.url)), 'skills'),
    },
    // Tests rely on per-file process isolation (e.g., `process.cwd()` assumptions).
    pool: 'forks',
    maxWorkers: resolveMaxWorkers(),
    include: ['test/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'bin/',
        '*.config.ts',
        'build.js',
        'test/**'
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 3000
  }
});
