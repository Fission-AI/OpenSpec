import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/released-output/v1.6.0-codex-prompts'
);

/**
 * A global Codex prompt exactly as release 1.6.0 wrote it, e.g.
 * `releasedCodexPrompt('opsx-apply.md')`. OpenSpec removes only prompts that
 * match released output; anything else is the user's.
 */
export function releasedCodexPrompt(fileName: string): string {
  return readFileSync(path.join(DIR, fileName), 'utf8');
}
