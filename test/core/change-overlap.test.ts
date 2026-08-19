import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import {
  claimsFromDelta,
  collectRequirementClaims,
  detectChangeOverlaps,
  findOverlaps,
  loadBaseRequirements,
  type BaseRequirements,
  type RequirementClaim,
} from '../../src/core/change-overlap.js';

function delta(sections: string): string {
  return sections.trimStart();
}

const MODIFIED_SLASH = delta(`
## MODIFIED Requirements
### Requirement: Slash Command Configuration
The system SHALL configure slash commands per tool.

#### Scenario: Cursor commands
- **WHEN** Cursor selected
- **THEN** write .cursor commands
`);

const MAIN_SLASH = delta(`
# tools Specification

## Purpose
Configure tools.

## Requirements

### Requirement: Slash Command Configuration
The system SHALL configure slash commands per tool.

#### Scenario: Cursor commands
- **WHEN** Cursor selected
- **THEN** write .cursor commands
`);

describe('claimsFromDelta', () => {
  it('claims a MODIFIED requirement', () => {
    const claims = claimsFromDelta(MODIFIED_SLASH, 'add-kilo', 'tools');

    expect(claims).toEqual([
      {
        changeId: 'add-kilo',
        specId: 'tools',
        requirement: 'Slash Command Configuration',
        key: 'Slash Command Configuration',
        operation: 'MODIFIED',
      },
    ]);
  });

  it('claims both ends of a RENAMED pair', () => {
    const claims = claimsFromDelta(
      delta(`
## RENAMED Requirements
- FROM: \`### Requirement: Old Name\`
- TO: \`### Requirement: New Name\`
`),
      'rename-change',
      'tools'
    );

    expect(claims.map((c) => [c.requirement, c.operation])).toEqual([
      ['Old Name', 'RENAMED_FROM'],
      ['New Name', 'RENAMED_TO'],
    ]);
  });

  it('does not claim the same requirement twice for one operation', () => {
    // A duplicate header is already a validator error; counting it twice here
    // would report the change as overlapping with itself.
    const claims = claimsFromDelta(
      delta(`
## ADDED Requirements
### Requirement: Dup
The system SHALL do it.

#### Scenario: One
- **WHEN** a
- **THEN** b

### Requirement: Dup
The system SHALL do it again.

#### Scenario: Two
- **WHEN** c
- **THEN** d
`),
      'dup-change',
      'tools'
    );

    expect(claims).toHaveLength(1);
  });

  it('returns nothing for a delta with no recognized sections', () => {
    expect(claimsFromDelta('## Why\nJust prose.\n', 'noop', 'tools')).toEqual([]);
  });
});

describe('findOverlaps', () => {
  const REQUIREMENT = 'Shared Requirement';

  const claim = (
    changeId: string,
    operation: RequirementClaim['operation'] = 'MODIFIED',
    overrides: Partial<RequirementClaim> = {}
  ): RequirementClaim => ({
    changeId,
    specId: 'tools',
    requirement: REQUIREMENT,
    key: REQUIREMENT,
    operation,
    ...overrides,
  });

  const PRESENT: BaseRequirements = new Map([['tools', new Set([REQUIREMENT])]]);
  const ABSENT: BaseRequirements = new Map([['tools', new Set<string>()]]);

  it('reports a requirement claimed by two changes', () => {
    const overlaps = findOverlaps([claim('add-kilo'), claim('add-zed')], PRESENT);

    expect(overlaps).toEqual([
      {
        specId: 'tools',
        requirement: REQUIREMENT,
        inMainSpec: true,
        claimants: [
          { changeId: 'add-kilo', operation: 'MODIFIED', requirement: REQUIREMENT },
          { changeId: 'add-zed', operation: 'MODIFIED', requirement: REQUIREMENT },
        ],
      },
    ]);
  });

  it('marks a requirement no change has landed yet', () => {
    expect(findOverlaps([claim('a', 'ADDED'), claim('b', 'ADDED')], ABSENT)[0].inMainSpec).toBe(
      false
    );
  });

  it('treats a spec the base says nothing about as holding nothing', () => {
    expect(findOverlaps([claim('a'), claim('b')], new Map())[0].inMainSpec).toBe(false);
  });

  it('ignores a requirement only one change claims', () => {
    expect(findOverlaps([claim('solo')], PRESENT)).toEqual([]);
  });

  it('does not treat one change claiming both ends of a rename as an overlap', () => {
    expect(
      findOverlaps(
        [
          claim('rename-change', 'RENAMED_FROM', { key: 'Old Name', requirement: 'Old Name' }),
          claim('rename-change', 'RENAMED_TO', { key: 'New Name', requirement: 'New Name' }),
        ],
        PRESENT
      )
    ).toEqual([]);
  });

  it('separates identically named requirements in different specs', () => {
    expect(
      findOverlaps(
        [claim('a', 'MODIFIED', { specId: 'tools' }), claim('b', 'MODIFIED', { specId: 'cli' })],
        PRESENT
      )
    ).toEqual([]);
  });

  it('does not merge two groups whose spec and requirement concatenate alike', () => {
    // "tools" + "cli Shared" and "tools cli" + "Shared" join to the same string
    // under a space delimiter; they are different requirements.
    expect(
      findOverlaps(
        [
          claim('a', 'MODIFIED', { specId: 'tools', key: 'cli Shared', requirement: 'cli Shared' }),
          claim('b', 'MODIFIED', { specId: 'tools cli', key: 'Shared', requirement: 'Shared' }),
        ],
        PRESENT
      )
    ).toEqual([]);
  });

  it('catches a rename colliding with another change editing the old name', () => {
    const overlaps = findOverlaps(
      [claim('renamer', 'RENAMED_FROM'), claim('editor', 'MODIFIED')],
      PRESENT
    );

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].claimants.map((c) => [c.changeId, c.operation])).toEqual([
      ['editor', 'MODIFIED'],
      ['renamer', 'RENAMED_FROM'],
    ]);
  });

  it('lists every claimant when more than two changes claim one requirement', () => {
    const overlaps = findOverlaps([claim('c'), claim('a'), claim('b', 'REMOVED')], PRESENT);

    expect(overlaps[0].claimants.map((c) => c.changeId)).toEqual(['a', 'b', 'c']);
  });

  it('sorts overlaps by spec then requirement, and claimants by change id', () => {
    const overlaps = findOverlaps(
      [
        claim('z-change', 'MODIFIED', { specId: 'tools', key: 'Beta', requirement: 'Beta' }),
        claim('a-change', 'MODIFIED', { specId: 'tools', key: 'Beta', requirement: 'Beta' }),
        claim('b-change', 'MODIFIED', { specId: 'cli', key: 'Alpha', requirement: 'Alpha' }),
        claim('c-change', 'MODIFIED', { specId: 'cli', key: 'Alpha', requirement: 'Alpha' }),
      ],
      PRESENT
    );

    expect(overlaps.map((o) => [o.specId, o.requirement])).toEqual([
      ['cli', 'Alpha'],
      ['tools', 'Beta'],
    ]);
    expect(overlaps[1].claimants.map((c) => c.changeId)).toEqual(['a-change', 'z-change']);
  });
});

describe('loadBaseRequirements', () => {
  let specsDir: string;

  beforeEach(async () => {
    specsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-overlap-base-'));
  });

  afterEach(async () => {
    await fs.rm(specsDir, { recursive: true, force: true });
  });

  it('reads the requirement names a spec currently holds', async () => {
    await fs.mkdir(path.join(specsDir, 'tools'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'tools', 'spec.md'), MAIN_SLASH);

    const base = await loadBaseRequirements(specsDir, ['tools']);

    expect([...(base.get('tools') ?? [])]).toEqual(['Slash Command Configuration']);
  });

  it('resolves a nested capability id to its own directory', async () => {
    await fs.mkdir(path.join(specsDir, 'platform', 'session'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'platform', 'session', 'spec.md'), MAIN_SLASH);

    const base = await loadBaseRequirements(specsDir, ['platform/session']);

    expect(base.get('platform/session')?.has('Slash Command Configuration')).toBe(true);
  });

  it('treats a spec with no file yet as holding nothing', async () => {
    const base = await loadBaseRequirements(specsDir, ['tools', 'tools']);

    expect(base.get('tools')?.size).toBe(0);
  });
});

describe('collectRequirementClaims / detectChangeOverlaps', () => {
  let root: string;
  let changesDir: string;
  let specsDir: string;

  async function writeDelta(changeId: string, specId: string, content: string): Promise<void> {
    const dir = path.join(changesDir, changeId, 'specs', specId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'spec.md'), content);
  }

  async function writeMainSpec(specId: string, content: string): Promise<void> {
    const dir = path.join(specsDir, ...specId.split('/'));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'spec.md'), content);
  }

  const scan = (changeIds: string[]) => detectChangeOverlaps({ changesDir, specsDir, changeIds });

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-overlap-'));
    changesDir = path.join(root, 'openspec', 'changes');
    specsDir = path.join(root, 'openspec', 'specs');
    await fs.mkdir(path.join(changesDir, 'archive'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('finds the collision two individually valid changes cannot see', async () => {
    await writeMainSpec('tools', MAIN_SLASH);
    await writeDelta('add-kilo', 'tools', MODIFIED_SLASH);
    await writeDelta('add-zed', 'tools', MODIFIED_SLASH);

    const overlaps = await scan(['add-kilo', 'add-zed']);

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].requirement).toBe('Slash Command Configuration');
    expect(overlaps[0].inMainSpec).toBe(true);
    expect(overlaps[0].claimants.map((c) => c.changeId)).toEqual(['add-kilo', 'add-zed']);
  });

  it('reports a requirement no main spec holds yet', async () => {
    await writeDelta('add-kilo', 'tools', MODIFIED_SLASH);
    await writeDelta('add-zed', 'tools', MODIFIED_SLASH);

    expect((await scan(['add-kilo', 'add-zed']))[0].inMainSpec).toBe(false);
  });

  it('reports nothing when changes touch different requirements', async () => {
    await writeMainSpec('tools', MAIN_SLASH);
    await writeDelta('add-kilo', 'tools', MODIFIED_SLASH);
    await writeDelta(
      'other',
      'tools',
      delta(`
## ADDED Requirements
### Requirement: Telemetry Opt Out
The system SHALL allow opting out.

#### Scenario: Opt out
- **WHEN** flag set
- **THEN** disabled
`)
    );

    expect(await scan(['add-kilo', 'other'])).toEqual([]);
  });

  it('reads deltas and specs under the directories it is given, not rebuilt paths', async () => {
    // A store-selected root does not live under <root>/openspec, so a scan that
    // rebuilt either path from a project root would find nothing here.
    const storeChanges = path.join(root, 'store', 'planning', 'changes');
    const storeSpecs = path.join(root, 'store', 'planning', 'specs');
    for (const changeId of ['add-kilo', 'add-zed']) {
      const dir = path.join(storeChanges, changeId, 'specs', 'tools');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'spec.md'), MODIFIED_SLASH);
    }
    await fs.mkdir(path.join(storeSpecs, 'tools'), { recursive: true });
    await fs.writeFile(path.join(storeSpecs, 'tools', 'spec.md'), MAIN_SLASH);

    const overlaps = await detectChangeOverlaps({
      changesDir: storeChanges,
      specsDir: storeSpecs,
      changeIds: ['add-kilo', 'add-zed'],
    });

    expect(overlaps).toHaveLength(1);
    // The base came from the store's specs, not the project's.
    expect(overlaps[0].inMainSpec).toBe(true);
  });

  it('discovers deltas in a nested capability layout', async () => {
    await writeMainSpec('platform/session', MAIN_SLASH);
    await writeDelta('a', 'platform/session', MODIFIED_SLASH);
    await writeDelta('b', 'platform/session', MODIFIED_SLASH);

    const overlaps = await scan(['a', 'b']);

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].specId).toBe('platform/session');
    expect(overlaps[0].inMainSpec).toBe(true);
  });

  it('ignores a change with no specs directory', async () => {
    await fs.mkdir(path.join(changesDir, 'docs-only'), { recursive: true });
    await writeDelta('add-kilo', 'tools', MODIFIED_SLASH);

    expect(
      await collectRequirementClaims({
        changesDir,
        specsDir,
        changeIds: ['docs-only', 'add-kilo'],
      })
    ).toHaveLength(1);
  });

  it('scans only the change ids it is given', async () => {
    await writeDelta('add-kilo', 'tools', MODIFIED_SLASH);
    await writeDelta('add-zed', 'tools', MODIFIED_SLASH);

    expect(await scan(['add-kilo'])).toEqual([]);
  });

  it('ignores a change id with no directory on disk', async () => {
    await writeDelta('add-kilo', 'tools', MODIFIED_SLASH);

    expect(await scan(['add-kilo', 'never-scaffolded'])).toEqual([]);
  });

  it('returns nothing when there are no changes at all', async () => {
    expect(await scan([])).toEqual([]);
  });
});
