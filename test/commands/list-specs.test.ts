import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCLI } from '../helpers/run-cli.js';

describe('top-level list command for specs', () => {
  let projectDir: string;
  let specsDir: string;

  beforeEach(async () => {
    projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-list-specs-'));
    specsDir = path.join(projectDir, 'openspec', 'specs');

    await fs.mkdir(path.join(specsDir, 'auth'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, 'auth', 'spec.md'),
      `## Purpose
Authentication behavior.

## Requirements

### Requirement: Sign in
The system SHALL allow sign in.

#### Scenario: Valid credentials
- **WHEN** valid credentials are submitted
- **THEN** access is granted

### Requirement: Sign out
The system SHALL allow sign out.

#### Scenario: Active session
- **WHEN** sign out is requested
- **THEN** the session ends
`,
      'utf-8'
    );

    await fs.mkdir(path.join(specsDir, 'payment'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, 'payment', 'spec.md'),
      `## Purpose
Payment behavior.

## Requirements

### Requirement: Process payment
The system SHALL process payments.

#### Scenario: Valid payment
- **WHEN** a valid payment is submitted
- **THEN** it is processed
`,
      'utf-8'
    );
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  it('lists spec IDs with requirement counts', async () => {
    const result = await runCLI(['list', '--specs'], { cwd: projectDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Specs:');
    expect(result.stdout).toMatch(/auth\s+requirements 2/);
    expect(result.stdout).toMatch(/payment\s+requirements 1/);
    expect(result.stdout.indexOf('auth')).toBeLessThan(result.stdout.indexOf('payment'));
  });

  it('outputs the supported spec list JSON envelope', async () => {
    const result = await runCLI(['list', '--specs', '--json'], { cwd: projectDir });

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.specs).toEqual([
      { id: 'auth', requirementCount: 2 },
      { id: 'payment', requirementCount: 1 },
    ]);
    expect(output.root).toMatchObject({ path: projectDir });
  });
});
