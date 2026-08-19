import { afterAll, describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';

/**
 * Two changes editing one requirement are each valid on their own: every check
 * the validator runs compares a single change against the current main spec,
 * which neither of them has landed in yet. The collision only surfaces when the
 * first archives. These exercise the advisory report through the real CLI —
 * what it says, and that it never moves the exit code (#1669).
 */
describe('openspec validate reports requirements two active changes both claim (#1669)', () => {
  const tempRoots: string[] = [];
  let projectDir: string;

  const write = async (relative: string, content: string) => {
    const file = path.join(projectDir, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  };

  const MAIN_SPEC = `# widgets Specification

## Purpose
Define widget behavior for the end-to-end check.

## Requirements

### Requirement: Widget state
The system SHALL report the widget state.

#### Scenario: Existing scenario
- **WHEN** queried
- **THEN** the state is reported
`;

  /** A MODIFIED block that keeps the live scenario, so the change is valid alone. */
  const modifies = (extraScenario: string) => `## MODIFIED Requirements

### Requirement: Widget state
The system SHALL report the widget state.

#### Scenario: Existing scenario
- **WHEN** queried
- **THEN** the state is reported

#### Scenario: ${extraScenario}
- **WHEN** ${extraScenario} happens
- **THEN** it is reported
`;

  const adds = (body: string) => `## ADDED Requirements

### Requirement: Widget colors
The system SHALL report ${body}.

#### Scenario: Colors queried
- **WHEN** colors are queried
- **THEN** ${body} is reported
`;

  const proposal = (changeId: string) =>
    `# ${changeId}\n\n## Why\nExercise overlap reporting.\n\n## What Changes\n- Extend widget reporting\n`;

  beforeAll(async () => {
    const base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-overlap-e2e-'));
    tempRoots.push(base);
    projectDir = path.join(base, 'project');
    await fs.mkdir(projectDir, { recursive: true });

    await write('openspec/specs/widgets/spec.md', MAIN_SPEC);

    for (const [changeId, scenario, added] of [
      ['adds-hover', 'Hover state', 'the hover color'],
      ['adds-focus', 'Focus state', 'the focus color'],
    ] as const) {
      await write(`openspec/changes/${changeId}/proposal.md`, proposal(changeId));
      await write(`openspec/changes/${changeId}/specs/widgets/spec.md`, modifies(scenario));
      await write(`openspec/changes/${changeId}/specs/colors/spec.md`, adds(added));
    }
  });

  afterAll(async () => {
    await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it('reports the overlap without failing the run', async () => {
    const result = await runCLI(['validate', '--changes'], { cwd: projectDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('✓ change/adds-focus');
    expect(result.stdout).toContain('✓ change/adds-hover');
    expect(result.stdout).toContain('2 requirements are claimed by more than one active change');
  });

  it('names the claiming changes and whether the requirement exists yet', async () => {
    const result = await runCLI(['validate', '--changes'], { cwd: projectDir });

    // Both changes MODIFY a requirement the main spec already holds.
    expect(result.stdout).toContain('widgets: Widget state (in the main spec)');
    // Both changes ADD one it does not hold yet.
    expect(result.stdout).toContain('colors: Widget colors (not in the main spec yet)');
    expect(result.stdout).toContain('adds-focus MODIFIED, adds-hover MODIFIED');
    expect(result.stdout).toContain('adds-focus ADDED, adds-hover ADDED');
  });

  it('emits the overlaps under --json', async () => {
    const result = await runCLI(['validate', '--changes', '--json'], { cwd: projectDir });

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.summary.totals).toMatchObject({ items: 2, passed: 2, failed: 0 });
    expect(payload.overlaps.map((o: any) => [o.specId, o.requirement, o.inMainSpec])).toEqual([
      ['colors', 'Widget colors', false],
      ['widgets', 'Widget state', true],
    ]);
    expect(payload.overlaps[0].claimants).toEqual([
      { changeId: 'adds-focus', operation: 'ADDED', requirement: 'Widget colors' },
      { changeId: 'adds-hover', operation: 'ADDED', requirement: 'Widget colors' },
    ]);
  });

  it('lists every claimant when three changes claim one requirement', async () => {
    const threeDir = path.join(tempRoots[0], 'three');
    await fs.mkdir(threeDir, { recursive: true });
    const original = projectDir;
    projectDir = threeDir;
    try {
      await write('openspec/specs/widgets/spec.md', MAIN_SPEC);
      for (const [changeId, scenario] of [
        ['adds-hover', 'Hover state'],
        ['adds-focus', 'Focus state'],
        ['adds-active', 'Active state'],
      ] as const) {
        await write(`openspec/changes/${changeId}/proposal.md`, proposal(changeId));
        await write(`openspec/changes/${changeId}/specs/widgets/spec.md`, modifies(scenario));
      }
    } finally {
      projectDir = original;
    }

    const result = await runCLI(['validate', '--changes'], { cwd: threeDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      'adds-active MODIFIED, adds-focus MODIFIED, adds-hover MODIFIED'
    );
    expect(result.stdout).toContain('1 requirement is claimed by more than one active change');
  });

  it('omits the overlap scan when only specs are validated', async () => {
    const result = await runCLI(['validate', '--specs', '--json'], { cwd: projectDir });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).overlaps).toBeUndefined();
  });

  it('keeps the overlaps key present for a changes-scoped run with no changes', async () => {
    const emptyDir = path.join(tempRoots[0], 'empty');
    await fs.mkdir(emptyDir, { recursive: true });
    const original = projectDir;
    projectDir = emptyDir;
    try {
      await write('openspec/specs/widgets/spec.md', MAIN_SPEC);
    } finally {
      projectDir = original;
    }

    const result = await runCLI(['validate', '--changes', '--json'], { cwd: emptyDir });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).overlaps).toEqual([]);
  });

  it('reports no overlap for a project with a single change', async () => {
    const soloDir = path.join(tempRoots[0], 'solo');
    await fs.mkdir(soloDir, { recursive: true });
    const original = projectDir;
    projectDir = soloDir;
    try {
      await write('openspec/specs/widgets/spec.md', MAIN_SPEC);
      await write('openspec/changes/adds-hover/proposal.md', proposal('adds-hover'));
      await write('openspec/changes/adds-hover/specs/widgets/spec.md', modifies('Hover state'));
    } finally {
      projectDir = original;
    }

    const json = await runCLI(['validate', '--changes', '--json'], { cwd: soloDir });
    expect(json.exitCode).toBe(0);
    expect(JSON.parse(json.stdout).overlaps).toEqual([]);

    // The human-readable report is only reachable without --json.
    const text = await runCLI(['validate', '--changes'], { cwd: soloDir });
    expect(text.exitCode).toBe(0);
    expect(text.stdout).not.toContain('claimed by more than one active change');
  });
});
