import { ensureCliBuilt } from './test/helpers/run-cli.js';

// Ensure the CLI bundle exists before tests execute
export async function setup() {
  await ensureCliBuilt();
}
