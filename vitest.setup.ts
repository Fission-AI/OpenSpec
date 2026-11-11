import { promises as fs } from 'fs';
import path from 'path';
import { ensureCliBuilt, terminateActiveCliChildren } from './test/helpers/run-cli.js';

// Ensure the CLI bundle exists before tests execute
export async function setup() {
  await ensureCliBuilt();
}

export async function teardown() {
  terminateActiveCliChildren();
  const testHome = process.env.OPENSPEC_TEST_HOME;
  if (testHome && path.basename(testHome).startsWith('openspec-test-home-')) {
    await fs.rm(testHome, { recursive: true, force: true });
  }
}
