import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { sharedSkillRootOwnedByOther } from '../../src/core/shared-skill-target.js';

/**
 * `.agents` is shared by the vendor-neutral `agents` target and Codex. When a
 * legacy Codex install is detected only from global `~/.codex/prompts`, the
 * update path must not rewrite an existing `agents`-owned `.agents` tree. This
 * guards the predicate that decides that.
 */
describe('sharedSkillRootOwnedByOther', () => {
  let projectPath: string;

  const writeAgentsSkill = async (marker?: string) => {
    const skillsRoot = path.join(projectPath, '.agents', 'skills');
    const skillDir = path.join(skillsRoot, 'openspec-propose');
    await fs.mkdir(skillDir, { recursive: true });
    // Generic invocation syntax => inferred owner is `agents` (not `$openspec-`).
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      '# openspec-propose\n\nRun /openspec-propose to start.\n'
    );
    if (marker !== undefined) {
      await fs.writeFile(path.join(skillsRoot, '.openspec-target'), `${marker}\n`);
    }
  };

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-shared-target-'));
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true });
  });

  it('reports the .agents root as owned by another tool when agents holds it (marker + generic tree)', async () => {
    await writeAgentsSkill('agents');
    // Codex, inferred only from global prompts, must not clobber this tree.
    expect(sharedSkillRootOwnedByOther(projectPath, 'codex')).toBe(true);
    // The owner itself is never "owned by another".
    expect(sharedSkillRootOwnedByOther(projectPath, 'agents')).toBe(false);
  });

  it('infers agents ownership from a generic tree even without a marker', async () => {
    await writeAgentsSkill(); // no marker; content is generic `/openspec-`
    expect(sharedSkillRootOwnedByOther(projectPath, 'codex')).toBe(true);
  });

  it('does NOT block Codex when the marker names Codex', async () => {
    await writeAgentsSkill('codex');
    expect(sharedSkillRootOwnedByOther(projectPath, 'codex')).toBe(false);
  });

  it('does NOT block a first-time legacy upgrade with no .agents tree yet', async () => {
    // Codex-only user with global prompts and no `.agents`: nothing to clobber.
    expect(sharedSkillRootOwnedByOther(projectPath, 'codex')).toBe(false);
    expect(sharedSkillRootOwnedByOther(projectPath, 'agents')).toBe(false);
  });

  it('returns false for a tool that does not share its skills root', async () => {
    await writeAgentsSkill('agents');
    // Claude writes to its own `.claude` root, never `.agents`.
    expect(sharedSkillRootOwnedByOther(projectPath, 'claude')).toBe(false);
  });
});
