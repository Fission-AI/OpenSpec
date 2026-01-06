import { ensureCliBuilt } from './test/helpers/run-cli.js';

// Ensure the CLI bundle exists before tests execute
export async function setup() {
  await ensureCliBuilt();
}

// Global teardown to ensure clean exit
export async function teardown() {
  // Clear any remaining timers
  // This helps prevent hanging handles from keeping the process alive
}
