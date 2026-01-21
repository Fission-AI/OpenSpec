import { ensureCliBuilt } from './test/helpers/run-cli.js';

// Ensure the CLI bundle exists before tests execute
export async function setup() {
  await ensureCliBuilt();
}

// Global teardown to ensure clean exit
export async function teardown() {
  // Force exit after a short grace period if the process hasn't exited cleanly.
  // This handles cases where child processes or open handles keep the worker alive.
  setTimeout(() => {
    process.exit(0);
  }, 1000).unref();
}
