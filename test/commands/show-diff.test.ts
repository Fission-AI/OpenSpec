import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';

describe('openspec show --diff', () => {
  const openspecBin = path.join(process.cwd(), 'bin', 'openspec.js');
  // A fresh temp directory per test keeps concurrent test files from sharing a
  // project, and lets every run pass `cwd` instead of chdir-ing the process.
  let testDir: string;
  let changesDir: string;
  let specsDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-show-diff-'));
    changesDir = path.join(testDir, 'openspec', 'changes');
    specsDir = path.join(testDir, 'openspec', 'specs');
    await fs.mkdir(changesDir, { recursive: true });
    await fs.mkdir(specsDir, { recursive: true });
    await fs.writeFile(
      path.join(testDir, 'openspec', 'project.md'),
      '# Test project\n',
      'utf-8'
    );

    // Base spec: auth capability with one requirement
    const baseSpec = [
      '# auth Specification',
      '',
      '## Purpose',
      'Authentication spec.',
      '',
      '## Requirements',
      '### Requirement: User login',
      '',
      'The system SHALL allow users to log in with email and password.',
      '',
      '#### Scenario: Valid credentials',
      '- **WHEN** user provides valid email and password',
      '- **THEN** system authenticates the user',
      '',
      '### Requirement: Session management',
      '',
      'The system SHALL manage user sessions.',
      '',
      '#### Scenario: Session timeout',
      '- **WHEN** session is idle for 30 minutes',
      '- **THEN** system expires the session',
      '',
    ].join('\n');

    await fs.mkdir(path.join(specsDir, 'auth'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'auth', 'spec.md'), baseSpec, 'utf-8');

    // Change proposal
    const proposal = [
      '## Why',
      'Improve auth.',
      '',
      '## What Changes',
      '- **auth:** Modify login, add MFA',
      '',
      '## Capabilities',
      '### Modified Capabilities',
      '- `auth`: Change login requirement, add MFA',
      '',
    ].join('\n');

    const changeDir = path.join(changesDir, 'auth-update');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'proposal.md'), proposal, 'utf-8');

    // Delta spec: one MODIFIED, one ADDED
    const deltaSpec = [
      '## MODIFIED Requirements',
      '',
      '### Requirement: User login',
      '',
      'The system SHALL allow users to log in with email, password, or SSO.',
      '',
      '#### Scenario: Valid credentials',
      '- **WHEN** user provides valid email and password',
      '- **THEN** system authenticates the user',
      '',
      '#### Scenario: SSO login',
      '- **WHEN** user clicks SSO provider',
      '- **THEN** system redirects to SSO flow',
      '',
      '## ADDED Requirements',
      '',
      '### Requirement: Multi-factor authentication',
      '',
      'The system SHALL support MFA via TOTP.',
      '',
      '#### Scenario: MFA setup',
      '- **WHEN** user enables MFA',
      '- **THEN** system generates TOTP secret',
      '',
    ].join('\n');

    await fs.mkdir(path.join(changeDir, 'specs', 'auth'), { recursive: true });
    await fs.writeFile(path.join(changeDir, 'specs', 'auth', 'spec.md'), deltaSpec, 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  // Arguments go through as an argv array: no shell, so a path or requirement
  // name with a space in it cannot be re-split or interpreted.
  function run(args: string[]): string {
    return execFileSync(process.execPath, [openspecBin, ...args], {
      encoding: 'utf-8',
      cwd: testDir,
      env: { ...process.env, NO_COLOR: '1' },
    });
  }

  function runWithStderr(args: string[]): { stdout: string; stderr: string } {
    const result = spawnSync(process.execPath, [openspecBin, ...args], {
      encoding: 'utf-8',
      cwd: testDir,
      env: { ...process.env, NO_COLOR: '1' },
    });
    return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  }

  // Task 5.5: text mode diff with MODIFIED and ADDED
  it('text mode: shows proposal then MODIFIED diff and ADDED full text', () => {
    const output = run(['show', 'auth-update', '--type', 'change', '--diff']);

    // Proposal should appear first
    expect(output).toContain('Improve auth.');

    // MODIFIED should show unified diff with changes
    expect(output).toContain('MODIFIED: User login');
    expect(output).toContain('-The system SHALL allow users to log in with email and password.');
    expect(output).toContain('+The system SHALL allow users to log in with email, password, or SSO.');
    expect(output).toContain('+#### Scenario: SSO login');

    // ADDED should show full text
    expect(output).toContain('ADDED: Multi-factor authentication');
    expect(output).toContain('The system SHALL support MFA via TOTP.');
  });

  it('text mode: without --diff the output is the proposal, unchanged', async () => {
    const output = run(['show', 'auth-update', '--type', 'change']);
    const proposal = await fs.readFile(
      path.join(changesDir, 'auth-update', 'proposal.md'),
      'utf-8'
    );

    // `show <change>` stays a raw proposal passthrough: --diff is additive, so
    // anything already parsing this output keeps seeing exactly what it saw.
    expect(output.trimEnd()).toBe(proposal.trimEnd());
    expect(output).not.toContain('Specifications Changed');
  });

  // Task 5.7: MODIFIED with no matching base
  it('text mode: shows warning when MODIFIED has no matching base', async () => {
    // Add a delta that references a nonexistent base requirement
    const noMatchDelta = [
      '## MODIFIED Requirements',
      '',
      '### Requirement: Nonexistent base',
      '',
      'The system SHALL do something new.',
      '',
      '#### Scenario: Works',
      '- **WHEN** called',
      '- **THEN** works',
      '',
    ].join('\n');

    const changeDir = path.join(changesDir, 'no-match');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      '## Why\nTest.\n\n## What Changes\n- **auth:** Modify\n',
      'utf-8',
    );
    await fs.mkdir(path.join(changeDir, 'specs', 'auth'), { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'specs', 'auth', 'spec.md'),
      noMatchDelta,
      'utf-8',
    );

    const output = run(['show', 'no-match', '--type', 'change', '--diff']);
    expect(output).toContain('MODIFIED: Nonexistent base');
    expect(output).toContain('No matching base requirement found');
  });

  // Task 5.3: no delta specs — say so rather than printing an empty heading
  it('text mode: reports when the change has no delta specs to diff', async () => {
    const changeDir = path.join(changesDir, 'empty-change');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      '## Why\nTest reason.\n\n## What Changes\n- nothing\n',
      'utf-8',
    );

    const output = run(['show', 'empty-change', '--type', 'change', '--diff']);
    expect(output).toContain('Test reason.');
    expect(output).toContain('No delta specs to diff for change "empty-change".');
    expect(output).not.toContain('Specifications Changed');
  });

  it('text mode: keeps the Reason and Migration text of a REMOVED requirement', async () => {
    const removedDelta = [
      '## REMOVED Requirements',
      '',
      '### Requirement: Session management',
      '',
      '**Reason**: Sessions moved to the token service.',
      '',
      '**Migration**: Callers switch to `POST /tokens`.',
      '',
    ].join('\n');

    const changeDir = path.join(changesDir, 'drop-sessions');
    await fs.mkdir(path.join(changeDir, 'specs', 'auth'), { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      '## Why\nSessions move.\n\n## What Changes\n- **auth:** Remove session management\n',
      'utf-8'
    );
    await fs.writeFile(path.join(changeDir, 'specs', 'auth', 'spec.md'), removedDelta, 'utf-8');

    const output = run(['show', 'drop-sessions', '--type', 'change', '--diff']);
    expect(output).toContain('REMOVED: Session management');
    expect(output).toContain('Sessions moved to the token service.');
    expect(output).toContain('Callers switch to `POST /tokens`.');
  });

  it('diffs a nested capability (specs/<area>/<id>/spec.md)', async () => {
    await fs.mkdir(path.join(specsDir, 'platform', 'session-layout'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, 'platform', 'session-layout', 'spec.md'),
      [
        '# session-layout Specification',
        '',
        '## Purpose',
        'Session layout.',
        '',
        '## Requirements',
        '### Requirement: Layout',
        '',
        'The system SHALL render two panes.',
        '',
        '#### Scenario: Two panes',
        '- **WHEN** the session opens',
        '- **THEN** two panes render',
        '',
      ].join('\n'),
      'utf-8'
    );

    const changeDir = path.join(changesDir, 'nested-change');
    await fs.mkdir(path.join(changeDir, 'specs', 'platform', 'session-layout'), { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      '## Why\nMore panes.\n\n## What Changes\n- **platform/session-layout:** Add a pane\n',
      'utf-8'
    );
    await fs.writeFile(
      path.join(changeDir, 'specs', 'platform', 'session-layout', 'spec.md'),
      [
        '## MODIFIED Requirements',
        '',
        '### Requirement: Layout',
        '',
        'The system SHALL render three panes.',
        '',
        '#### Scenario: Two panes',
        '- **WHEN** the session opens',
        '- **THEN** three panes render',
        '',
      ].join('\n'),
      'utf-8'
    );

    const output = run(['show', 'nested-change', '--type', 'change', '--diff']);
    expect(output).toContain('platform/session-layout');
    expect(output).toContain('MODIFIED: Layout');
    expect(output).toContain('-The system SHALL render two panes.');
    expect(output).toContain('+The system SHALL render three panes.');

    const json = JSON.parse(run(['show', 'nested-change', '--type', 'change', '--diff', '--json']));
    const modified = json.deltas.find((d: any) => d.operation === 'MODIFIED');
    expect(modified.spec).toBe('platform/session-layout');
    expect(modified.diff).toContain('+The system SHALL render three panes.');
  });

  it('warns and ignores --diff when the item is a spec', async () => {
    const { stdout, stderr } = runWithStderr(['show', 'auth', '--type', 'spec', '--diff']);
    expect(stderr).toContain('Ignoring flags not applicable to spec');
    expect(stderr).toContain('diff');
    expect(stdout).toContain('### Requirement: User login');
    expect(stdout).not.toContain('Specifications Changed');
  });

  // Task 6.2: JSON mode includes diff on MODIFIED only
  it('JSON mode: includes diff field on MODIFIED, not on ADDED', () => {
    const output = run(['show', 'auth-update', '--type', 'change', '--diff', '--json']);
    const json = JSON.parse(output);

    // --json --diff uses the same top-level structure as --json alone
    expect(json.id).toBe('auth-update');
    expect(json.title).toBeDefined();
    expect(json.deltaCount).toBeDefined();
    expect(Array.isArray(json.deltas)).toBe(true);

    const modified = json.deltas.find((d: any) => d.operation === 'MODIFIED');
    expect(modified).toBeDefined();
    expect(modified.diff).toBeDefined();
    expect(modified.diff).toContain('-The system SHALL allow users to log in with email and password.');
    expect(modified.diff).toContain('+The system SHALL allow users to log in with email, password, or SSO.');

    const added = json.deltas.find((d: any) => d.operation === 'ADDED');
    expect(added).toBeDefined();
    expect(added.diff).toBeUndefined();
  });

  it('JSON mode: attaches each diff to its own requirement when one spec has several', async () => {
    // Two MODIFIED requirements in one delta file: the JSON deltas and the
    // parsed blocks are paired by source order, so a mismatch here would show a
    // reviewer one requirement's changes under another's name.
    const deltaSpec = [
      '## MODIFIED Requirements',
      '',
      '### Requirement: Session management',
      '',
      'The system SHALL manage user sessions for 60 minutes.',
      '',
      '#### Scenario: Session timeout',
      '- **WHEN** session is idle for 60 minutes',
      '- **THEN** system expires the session',
      '',
      '### Requirement: User login',
      '',
      'The system SHALL allow users to log in with a passkey.',
      '',
      '#### Scenario: Valid credentials',
      '- **WHEN** user presents a passkey',
      '- **THEN** system authenticates the user',
      '',
    ].join('\n');

    const changeDir = path.join(changesDir, 'two-mods');
    await fs.mkdir(path.join(changeDir, 'specs', 'auth'), { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      '## Why\nTwo edits.\n\n## What Changes\n- **auth:** Modify login and sessions\n',
      'utf-8'
    );
    await fs.writeFile(path.join(changeDir, 'specs', 'auth', 'spec.md'), deltaSpec, 'utf-8');

    const json = JSON.parse(run(['show', 'two-mods', '--type', 'change', '--diff', '--json']));
    const modified = json.deltas.filter((d: any) => d.operation === 'MODIFIED');
    expect(modified).toHaveLength(2);

    for (const delta of modified) {
      expect(delta.diff).toBeDefined();
      if (delta.description.includes('passkey')) {
        expect(delta.diff).toContain('+The system SHALL allow users to log in with a passkey.');
        expect(delta.diff).not.toContain('60 minutes');
      } else {
        expect(delta.diff).toContain('+The system SHALL manage user sessions for 60 minutes.');
        expect(delta.diff).not.toContain('passkey');
      }
    }
  });

  it('JSON mode: --json --diff is backwards-compatible with --json', () => {
    const jsonOnly = JSON.parse(run(['show', 'auth-update', '--type', 'change', '--json']));
    const jsonDiff = JSON.parse(run(['show', 'auth-update', '--type', 'change', '--json', '--diff']));

    // Same top-level keys
    expect(Object.keys(jsonDiff).sort()).toEqual(Object.keys(jsonOnly).sort());
    expect(jsonDiff.id).toBe(jsonOnly.id);
    expect(jsonDiff.title).toBe(jsonOnly.title);
    expect(jsonDiff.deltaCount).toBe(jsonOnly.deltaCount);
    expect(jsonDiff.deltas.length).toBe(jsonOnly.deltas.length);

    // Each delta has the same base fields
    for (let i = 0; i < jsonOnly.deltas.length; i++) {
      expect(jsonDiff.deltas[i].spec).toBe(jsonOnly.deltas[i].spec);
      expect(jsonDiff.deltas[i].operation).toBe(jsonOnly.deltas[i].operation);
    }
  });

  // Task 5.6: RENAMED + MODIFIED with base lookup by old name
  it('text mode: RENAMED + MODIFIED looks up base by old name', async () => {
    const deltaSpec = [
      '## RENAMED Requirements',
      '',
      'FROM: ### Requirement: Session management',
      'TO: ### Requirement: Session lifecycle',
      '',
      '## MODIFIED Requirements',
      '',
      '### Requirement: Session lifecycle',
      '',
      'The system SHALL manage user sessions with configurable timeout.',
      '',
      '#### Scenario: Session timeout',
      '- **WHEN** session is idle for configurable duration',
      '- **THEN** system expires the session',
      '',
    ].join('\n');

    const changeDir = path.join(changesDir, 'rename-change');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      '## Why\nRename.\n\n## What Changes\n- **auth:** Rename and modify session\n',
      'utf-8',
    );
    await fs.mkdir(path.join(changeDir, 'specs', 'auth'), { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'specs', 'auth', 'spec.md'),
      deltaSpec,
      'utf-8',
    );

    const output = run(['show', 'rename-change', '--type', 'change', '--diff']);

    // Proposal shown first
    expect(output).toContain('Rename.');

    // RENAMED should appear
    expect(output).toContain('RENAMED: Session management');
    expect(output).toContain('Session lifecycle');

    // MODIFIED should show diff against the old "Session management" base
    expect(output).toContain('MODIFIED: Session lifecycle');
    expect(output).toContain('+The system SHALL manage user sessions with configurable timeout.');
    expect(output).toContain('-The system SHALL manage user sessions.');
  });

  // Task 6.3: JSON RENAMED + MODIFIED
  it('JSON mode: RENAMED + MODIFIED has diff relative to old-name base', async () => {
    const deltaSpec = [
      '## RENAMED Requirements',
      '',
      'FROM: ### Requirement: Session management',
      'TO: ### Requirement: Session lifecycle',
      '',
      '## MODIFIED Requirements',
      '',
      '### Requirement: Session lifecycle',
      '',
      'The system SHALL manage user sessions with configurable timeout.',
      '',
      '#### Scenario: Session timeout',
      '- **WHEN** session is idle for configurable duration',
      '- **THEN** system expires the session',
      '',
    ].join('\n');

    const changeDir = path.join(changesDir, 'rename-json');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      '## Why\nRename.\n\n## What Changes\n- **auth:** Rename and modify session\n',
      'utf-8',
    );
    await fs.mkdir(path.join(changeDir, 'specs', 'auth'), { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'specs', 'auth', 'spec.md'),
      deltaSpec,
      'utf-8',
    );

    const output = run(['show', 'rename-json', '--type', 'change', '--diff', '--json']);
    const json = JSON.parse(output);

    expect(json.id).toBe('rename-json');

    const renamed = json.deltas.find((d: any) => d.operation === 'RENAMED');
    expect(renamed).toBeDefined();
    expect(renamed.diff).toBeUndefined();

    const modified = json.deltas.find((d: any) => d.operation === 'MODIFIED');
    expect(modified).toBeDefined();
    expect(modified.diff).toBeDefined();
    expect(modified.diff).toContain('-The system SHALL manage user sessions.');
    expect(modified.diff).toContain('+The system SHALL manage user sessions with configurable timeout.');
  });
});
