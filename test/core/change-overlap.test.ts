import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import {
  claimsFromDelta,
  collectRequirementClaims,
  detectChangeOverlaps,
  findOverlaps,
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
  const claim = (
    changeId: string,
    requirement: string,
    operation: RequirementClaim['operation'] = 'MODIFIED',
    specId = 'tools'
  ): RequirementClaim => ({
    changeId,
    specId,
    requirement,
    key: requirement.trim(),
    operation,
  });

  it('reports a requirement claimed by two changes', () => {
    const overlaps = findOverlaps([
      claim('add-kilo', 'Slash Command Configuration'),
      claim('add-zed', 'Slash Command Configuration'),
    ]);

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].specId).toBe('tools');
    expect(overlaps[0].claimants.map((c) => c.changeId)).toEqual(['add-kilo', 'add-zed']);
  });

  it('ignores a requirement only one change claims', () => {
    expect(findOverlaps([claim('solo', 'Only Mine')])).toEqual([]);
  });

  it('does not treat one change claiming both ends of a rename as an overlap', () => {
    expect(
      findOverlaps([
        claim('rename-change', 'Old Name', 'RENAMED_FROM'),
        claim('rename-change', 'New Name', 'RENAMED_TO'),
      ])
    ).toEqual([]);
  });

  it('separates identically named requirements in different specs', () => {
    expect(
      findOverlaps([
        claim('a', 'Shared Name', 'MODIFIED', 'tools'),
        claim('b', 'Shared Name', 'MODIFIED', 'cli'),
      ])
    ).toEqual([]);
  });

  it('catches a rename colliding with another change editing the old name', () => {
    const overlaps = findOverlaps([
      claim('renamer', 'Slash Command Configuration', 'RENAMED_FROM'),
      claim('editor', 'Slash Command Configuration', 'MODIFIED'),
    ]);

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].claimants.map((c) => c.operation)).toEqual(['MODIFIED', 'RENAMED_FROM']);
  });

  it('sorts overlaps by spec then requirement, and claimants by change id', () => {
    const overlaps = findOverlaps([
      claim('z-change', 'Beta', 'MODIFIED', 'tools'),
      claim('a-change', 'Beta', 'MODIFIED', 'tools'),
      claim('b-change', 'Alpha', 'MODIFIED', 'cli'),
      claim('c-change', 'Alpha', 'MODIFIED', 'cli'),
    ]);

    expect(overlaps.map((o) => [o.specId, o.requirement])).toEqual([
      ['cli', 'Alpha'],
      ['tools', 'Beta'],
    ]);
    expect(overlaps[1].claimants.map((c) => c.changeId)).toEqual(['a-change', 'z-change']);
  });
});

describe('collectRequirementClaims / detectChangeOverlaps', () => {
  let root: string;

  async function writeDelta(changeId: string, specId: string, content: string): Promise<void> {
    const dir = path.join(root, 'openspec', 'changes', changeId, 'specs', specId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'spec.md'), content);
  }

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-overlap-'));
    await fs.mkdir(path.join(root, 'openspec', 'changes', 'archive'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('finds the collision two individually valid changes cannot see', async () => {
    await writeDelta('add-kilo', 'tools', MODIFIED_SLASH);
    await writeDelta('add-zed', 'tools', MODIFIED_SLASH);

    const overlaps = await detectChangeOverlaps(root);

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].requirement).toBe('Slash Command Configuration');
    expect(overlaps[0].claimants.map((c) => c.changeId)).toEqual(['add-kilo', 'add-zed']);
  });

  it('reports nothing when changes touch different requirements', async () => {
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

    expect(await detectChangeOverlaps(root)).toEqual([]);
  });

  it('skips the archive directory', async () => {
    await writeDelta('add-kilo', 'tools', MODIFIED_SLASH);
    const archived = path.join(
      root,
      'openspec',
      'changes',
      'archive',
      '2026-08-15-old',
      'specs',
      'tools'
    );
    await fs.mkdir(archived, { recursive: true });
    await fs.writeFile(path.join(archived, 'spec.md'), MODIFIED_SLASH);

    expect(await detectChangeOverlaps(root)).toEqual([]);
  });

  it('discovers deltas in a nested capability layout', async () => {
    await writeDelta('a', 'platform/session', MODIFIED_SLASH);
    await writeDelta('b', 'platform/session', MODIFIED_SLASH);

    const overlaps = await detectChangeOverlaps(root);

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].specId).toBe('platform/session');
  });

  it('ignores a change with no specs directory', async () => {
    await fs.mkdir(path.join(root, 'openspec', 'changes', 'docs-only'), { recursive: true });
    await writeDelta('add-kilo', 'tools', MODIFIED_SLASH);

    expect(await collectRequirementClaims(root)).toHaveLength(1);
  });

  it('honors an explicit change id list', async () => {
    await writeDelta('add-kilo', 'tools', MODIFIED_SLASH);
    await writeDelta('add-zed', 'tools', MODIFIED_SLASH);

    expect(await detectChangeOverlaps(root, ['add-kilo'])).toEqual([]);
  });

  it('returns nothing for a root with no changes at all', async () => {
    expect(await detectChangeOverlaps(root)).toEqual([]);
  });
});
