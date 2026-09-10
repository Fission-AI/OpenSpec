import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROPERTY_KEYS, EVENT_NAMES } from '../../src/telemetry/properties.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * The disclosure is only meaningful if it matches the code. An unenforced
 * documentation requirement decays within two releases, so the allowlist is
 * the source and the docs are checked against it.
 */
describe('telemetry disclosure parity', () => {
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf-8');

  it('documents every property that can be sent', () => {
    // Correlation ids and the IP suppression are documented as a group rather
    // than one row each; everything else must be named.
    const undocumented = PROPERTY_KEYS.filter((key) => key !== '$ip').filter(
      (key) => !readme.includes(`\`${key}\``)
    );
    expect(undocumented).toEqual([]);
  });

  it('names the local verification path and the opt-out', () => {
    expect(readme).toContain('OPENSPEC_TELEMETRY_DEBUG=1');
    expect(readme).toContain('openspec config set telemetry.enabled false');
    expect(readme).toContain('OPENSPEC_TELEMETRY=0');
  });

  it('states a retention period and a deletion path', () => {
    expect(readme).toMatch(/retained for \d+ months/);
    expect(readme.toLowerCase()).toContain('deleted');
  });

  it('does not describe the data as anonymous', () => {
    // A persistent random id plus device characteristics is pseudonymous.
    // Overstating it is what would undermine every other claim on the page.
    const telemetrySection = readme.slice(readme.indexOf('<strong>Telemetry</strong>'));
    const section = telemetrySection.slice(0, telemetrySection.indexOf('</details>'));
    expect(section).not.toMatch(/anonymous usage/i);
    expect(section).toContain('pseudonymous');
  });

  it('keeps SECURITY.md honest about what changed', () => {
    const security = fs.readFileSync(path.join(repoRoot, 'SECURITY.md'), 'utf-8');
    // The previous commitment was "no environment". It has to be named, not
    // quietly edited away.
    expect(security).toContain('more than earlier releases collected');
    expect(security).toContain('OPENSPEC_TELEMETRY_DEBUG=1');
  });

  it('accounts for every event name', () => {
    for (const event of EVENT_NAMES) {
      expect(EVENT_NAMES).toContain(event);
    }
    expect(EVENT_NAMES).toHaveLength(4);
  });
});
