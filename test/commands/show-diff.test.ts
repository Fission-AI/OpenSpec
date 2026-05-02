import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('openspec show --diff', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-show-diff-tmp');
  const changesDir = path.join(testDir, 'openspec', 'changes');
  const specsDir = path.join(testDir, 'openspec', 'specs');
  const openspecBin = path.join(projectRoot, 'bin', 'openspec.js');

  beforeEach(async () => {
    await fs.mkdir(changesDir, { recursive: true });
    await fs.mkdir(specsDir, { recursive: true });

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

  function run(args: string): string {
    const originalCwd = process.cwd();
    try {
      process.chdir(testDir);
      return execSync(`node ${openspecBin} ${args}`, {
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1' },
      });
    } finally {
      process.chdir(originalCwd);
    }
  }

  function runWithStderr(args: string): { stdout: string; stderr: string } {
    const originalCwd = process.cwd();
    try {
      process.chdir(testDir);
      const stdout = execSync(`node ${openspecBin} ${args}`, {
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { stdout, stderr: '' };
    } catch (e: any) {
      return { stdout: e.stdout?.toString() ?? '', stderr: e.stderr?.toString() ?? '' };
    } finally {
      process.chdir(originalCwd);
    }
  }

  // Task 5.5: text mode diff with MODIFIED and ADDED
  it('text mode: shows proposal then MODIFIED diff and ADDED full text', () => {
    const output = run('show auth-update --type change --diff');

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

  it('text mode: without --diff shows proposal then full spec content', () => {
    const output = run('show auth-update --type change');

    // Proposal
    expect(output).toContain('Improve auth.');

    // Full delta spec content (not diffed)
    expect(output).toContain('MODIFIED Requirements');
    expect(output).toContain('ADDED Requirements');
    expect(output).toContain('The system SHALL allow users to log in with email, password, or SSO.');
    expect(output).toContain('The system SHALL support MFA via TOTP.');
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

    const output = run('show no-match --type change --diff');
    expect(output).toContain('MODIFIED: Nonexistent base');
    expect(output).toContain('No matching base requirement found');
  });

  // Task 5.3: no delta specs — proposal is still shown, no spec section
  it('text mode: shows only proposal when change has no delta specs', async () => {
    const changeDir = path.join(changesDir, 'empty-change');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      '## Why\nTest reason.\n\n## What Changes\n- nothing\n',
      'utf-8',
    );

    const output = run('show empty-change --type change --diff');
    expect(output).toContain('Test reason.');
    expect(output).not.toContain('Specifications Changed');
  });

  // Task 6.2: JSON mode includes diff on MODIFIED only
  it('JSON mode: includes diff field on MODIFIED, not on ADDED', () => {
    const output = run('show auth-update --type change --diff --json');
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

  it('JSON mode: --json --diff is backwards-compatible with --json', () => {
    const jsonOnly = JSON.parse(run('show auth-update --type change --json'));
    const jsonDiff = JSON.parse(run('show auth-update --type change --json --diff'));

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

    const output = run('show rename-change --type change --diff');

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

    const output = run('show rename-json --type change --diff --json');
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
