import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COMMAND_DEPRECATION_URL,
  formatCommandDeprecationNotice,
} from '../src/core/command-surface.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...segments: string[]) =>
  fs.readFileSync(path.join(REPO_ROOT, 'docs-lab', ...segments), 'utf-8');

const PROFILES = read('customize', 'profiles.md');
const DELIVERY_SECTION = PROFILES.split('## Delivery: skills, commands, or both')[1].split(
  '## Switching profiles'
)[0];
const CONFIG_JSON = read('reference', 'configuration', 'config-json.md');
const DELIVERY_FIELD = CONFIG_JSON.split('### delivery')[1].split('### workflows')[0];
const SETUP = read('start', 'setup.md');

// The CLI notice and the docs announce the same deprecation. Pin them to each
// other so neither can change its advice without the other (#2022).
describe('command deprecation documentation', () => {
  const notice = formatCommandDeprecationNotice(['claude'], 'both').join('\n');

  it('names the same release in the notice and every page', () => {
    expect(notice).toContain('go away in OpenSpec 2.0');
    expect(DELIVERY_SECTION).toContain('go away in OpenSpec 2.0');
    expect(DELIVERY_FIELD).toContain('go away in OpenSpec 2.0');
    expect(SETUP).toContain('go away in OpenSpec 2.0');
  });

  it('gives the same way to switch, and the same promise about edited files', () => {
    expect(notice).toContain('openspec config set delivery skills && openspec update');
    expect(DELIVERY_SECTION).toContain('set `delivery` to `skills` and run `openspec update`');
    expect(notice).toContain('any you edited are kept and listed');
    expect(DELIVERY_SECTION).toContain('any you edited are kept and listed');
  });

  it('offers no way to keep commands, since 2.0 removes them under every setting', () => {
    expect(notice).not.toMatch(/delivery (both|commands)/);
    expect(DELIVERY_SECTION).not.toMatch(/set `delivery` to `(both|commands)`/);
    expect(DELIVERY_FIELD).not.toMatch(/keeps its value/);
  });

  it('links the same tracking issue from the notice and both pages', () => {
    const issue = COMMAND_DEPRECATION_URL;
    expect(notice).toContain(issue);
    expect(DELIVERY_SECTION).toContain(issue);
    expect(DELIVERY_FIELD).toContain(issue);
  });
});
