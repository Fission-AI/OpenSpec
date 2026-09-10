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

  it('states a retention period and a deletion path that exists', () => {
    expect(readme).toMatch(/retained for \d+ months/);
    expect(readme.toLowerCase()).toContain('deleted');
    // A deletion route has to be one the project actually operates. An
    // invented address is a worse privacy posture than none, and it would
    // bounce silently.
    const contacts = readme.match(/[\w.+-]+@[\w.-]+\.\w+/g) ?? [];
    expect(contacts, 'README offers an email contact — confirm the mailbox exists').toEqual([]);
    expect(readme).toContain('github.com/Fission-AI/OpenSpec/issues/new');
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

  it('keeps the FAQ and CLI reference from contradicting the disclosure', () => {
    // Three documents describe telemetry. A parity test that reads two of them
    // lets the third go stale, which is how the FAQ kept claiming "command
    // names and version only" after that stopped being true.
    for (const file of ['docs/faq.md', 'docs/cli.md']) {
      const text = fs.readFileSync(path.join(repoRoot, file), 'utf-8');
      expect(text, `${file} still calls the data anonymous`).not.toMatch(
        /anonymous usage stats/i
      );
      expect(text, `${file} still claims only names and version`).not.toMatch(
        /command names and version only/i
      );
    }
  });

  it('names every event it can send', () => {
    // Not a tautology: the count is pinned so a new event forces a decision
    // about disclosing it.
    expect([...EVENT_NAMES].sort()).toEqual([
      'command_completed',
      'command_executed',
      'milestone_reached',
      'tool_configured',
    ]);
  });
});
