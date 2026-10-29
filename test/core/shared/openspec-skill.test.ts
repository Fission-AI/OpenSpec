import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { SKILL_NAMESPACE as NS, generateOpenSpecSkill, generateOpenSpecSkillSet, hasLayoutMarker, workflowSkillName } from '../../../src/core/shared/openspec-skill.js';
import { ALL_WORKFLOWS, CORE_WORKFLOWS } from '../../../src/core/profiles.js';
import { OPENSPEC_GUIDES } from '../../../src/core/shared/openspec-guides.js';
import { BEFORE_YOU_START, RUNTIME_INPUTS } from '../../../src/core/templates/workflows/references.js';

function render(workflows: readonly string[]) {
  return generateOpenSpecSkill({ workflows, version: 'test', invoke: (id) => `/openspec:${id}`, skillName: (id) => id });
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('the openspec skill', () => {
  it('routes to one file per installed workflow', () => {
    const files = render(CORE_WORKFLOWS);
    const skill = files[0];
    expect(skill.relativePath).toBe('SKILL.md');
    expect(skill.content).toMatch(new RegExp(`^name: ${NS}$`, 'm'));
    for (const id of CORE_WORKFLOWS.filter((workflow) => workflow !== 'sync')) {
      expect(skill.content, id).toContain(`| \`references/${id}.md\` | \`/openspec:${id}\` |`);
      expect(files.some((file) => file.relativePath === `references/${id}.md`), id).toBe(true);
    }
    // A workflow that is not installed is neither routed to nor shipped.
    expect(skill.content).not.toContain('references/onboard.md');
    expect(files.some((file) => file.relativePath === 'references/onboard.md')).toBe(false);
  });

  // The point of one skill: a rule every workflow follows is written once.
  // SKILL.md states the project check and the CLI's context in its own words,
  // so the per-workflow blocks are lifted out entirely.
  it('states each shared rule exactly once across all its files', () => {
    const all = render(ALL_WORKFLOWS).map((file) => file.content).join('\n');
    expect(count(all, BEFORE_YOU_START.replace('**Before you start**\n', ''))).toBe(0);
    expect(count(all, RUNTIME_INPUTS)).toBe(0);
    expect(count(all, '## Finding the project')).toBe(1);
    expect(count(all, '## Context from the CLI')).toBe(1);
    expect(count(all, '# Writing an artifact')).toBe(1);
  });

  // Guides teach judgment any skill may need; a principle in SKILL.md points to each.
  it('ships every guide and points to it from SKILL.md', () => {
    const files = render(CORE_WORKFLOWS);
    for (const guide of OPENSPEC_GUIDES) {
      expect(files[0].content, guide.path).toContain(`\`${guide.path}\``);
      expect(files.some((file) => file.relativePath === guide.path), guide.path).toBe(true);
    }
  });

  // Agents read a guide when the step they are on names it (2026-10-23 A/B:
  // guides named only in SKILL.md were read in 0 of 85 runs).
  it('names each guide in the propose steps where its decision is made', () => {
    const propose = render(CORE_WORKFLOWS).find((file) => file.relativePath === 'references/propose.md')!.content;
    for (const guide of OPENSPEC_GUIDES) expect(propose, guide.path).toContain(`\`${guide.path}\``);
  });

  // Sync is part of keeping specs current, not a task users start: its steps
  // ship for archive and the deltas guide, with no skill or route of its own.
  it('ships sync as steps only, and folds explore capture into propose', () => {
    const files = render(['explore', 'propose', 'archive']);
    expect(files.some((file) => file.relativePath === 'references/sync.md')).toBe(true);
    expect(files[0].content).toContain('| `references/sync.md` | ask: "sync the specs for <change>" |');
    const archive = files.find((file) => file.relativePath === 'references/archive.md')!.content;
    expect(archive).toContain('`references/sync.md`');
    expect(files.some((file) => file.relativePath === 'references/capture.md')).toBe(false);
    const explore = files.find((file) => file.relativePath === 'references/explore.md')!.content;
    expect(explore).toContain('follow `references/propose.md`, with the draft as the settled scope');
    // Without propose, explore keeps its own capture steps.
    const alone = render(['explore']);
    expect(alone.some((file) => file.relativePath === 'references/capture.md')).toBe(true);
  });

  it('repeats no line across the default install', () => {
    const seen = new Map<string, string>();
    for (const file of render(CORE_WORKFLOWS)) {
      for (const line of file.content.split('\n').map((text) => text.trim())) {
        if (line.length < 60) continue;
        expect(seen.get(line), `"${line.slice(0, 60)}…" in ${file.relativePath}`).toBeUndefined();
        seen.set(line, file.relativePath);
      }
    }
  });

  // The A/B caught Haiku chaining propose into apply ("then implement it") when
  // the boundary lived only in the propose file; SKILL.md states it for all.
  it('keeps planning workflows from editing code, in SKILL.md itself', () => {
    const skill = render(CORE_WORKFLOWS)[0].content;
    expect(skill).toContain('Planning skills (explore, propose, update) end the response: they never edit project code');
  });

  it('points every workflow at the shared rules instead of copying them', () => {
    const files = render(ALL_WORKFLOWS);
    const archive = files.find((file) => file.relativePath === 'references/archive.md')!.content;
    expect(archive).toContain('**Context from the CLI** in SKILL.md');
    const propose = files.find((file) => file.relativePath === 'references/propose.md')!.content;
    expect(propose).toContain('references/writing-an-artifact.md');
    expect(files.some((file) => file.relativePath === 'references/writing-an-artifact.md')).toBe(true);
  });

  it('spells workflow links for the surface it is installed on', () => {
    const files = generateOpenSpecSkill({ workflows: CORE_WORKFLOWS, version: 'test', invoke: (id) => `/${workflowSkillName(id)}`, skillName: workflowSkillName });
    const propose = files.find((file) => file.relativePath === 'references/propose.md')!.content;
    expect(propose).toContain(`/${NS}-apply`);
    for (const file of files) expect(file.content, file.relativePath).not.toContain('/opsx:');
  });

  // Budgets keep the skill from growing back. Raise one only on purpose, with
  // an eval run showing the extra text pays for itself. Raised for the role,
  // principles, and guides (2026-10-23 A/B), and for the stable-ID principle
  // (2026-10-29: propose-ids 10/10 with it, 6/10 without).
  it('stays within its size budgets', () => {
    const files = render(ALL_WORKFLOWS);
    const size = (file: { content: string }) => Buffer.byteLength(file.content);
    expect(size(files[0]), 'SKILL.md').toBeLessThanOrEqual(6_500);
    const workflows = new Set(ALL_WORKFLOWS.map((id) => `references/${id}.md`));
    for (const file of files.filter((entry) => workflows.has(entry.relativePath))) {
      expect(size(file), file.relativePath).toBeLessThanOrEqual(12_000);
    }
    const core = render(CORE_WORKFLOWS).reduce((total, file) => total + size(file), 0);
    expect(core, 'default install').toBeLessThanOrEqual(52_000);
  });

  // A host picks the skill by its description alone, so it must say what the
  // skill does, when to use it, and scope it to OpenSpec projects.
  it('describes when to use it in one line', () => {
    const description = /^description: (.+)$/m.exec(render(CORE_WORKFLOWS)[0].content)?.[1] ?? '';
    expect(description).toContain('Use when');
    expect(description).toContain('OpenSpec');
    expect(description.length).toBeLessThanOrEqual(300);
  });

  // Only folders the Agent Skills spec names: SKILL.md and references/.
  it('uses only the conventional skill folders', () => {
    for (const file of render(ALL_WORKFLOWS)) {
      expect(file.relativePath, file.relativePath).toMatch(/^(SKILL\.md|references\/[a-z0-9-]+\.md)$/);
    }
  });

  // Thin skills keep tab completion without carrying any rules of their own.
  it('adds one thin skill per workflow that only points into the router', () => {
    const set = generateOpenSpecSkillSet({
      workflows: CORE_WORKFLOWS,
      version: 'test',
      skillName: workflowSkillName,
      invoke: (id) => `/${workflowSkillName(id)}`,
    });
    const own = CORE_WORKFLOWS.filter((id) => id !== 'sync');
    expect(set.map((skill) => skill.dirName).sort()).toEqual([NS, ...own.map(workflowSkillName)].sort());
    const propose = set.find((skill) => skill.dirName === `${NS}-propose`)!;
    expect(propose.files.map((file) => file.relativePath)).toEqual(['SKILL.md']);
    const body = propose.files[0].content;
    expect(body).toMatch(new RegExp(`^name: ${NS}-propose$`, 'm'));
    expect(body).toContain(`\`../${NS}/SKILL.md\``);
    expect(body).toContain(`\`../${NS}/references/propose.md\``);
    expect(body).not.toContain(BEFORE_YOU_START);
    expect(Buffer.byteLength(body)).toBeLessThanOrEqual(1_000);
    // Setup tells this layout from older OpenSpec skills of the same name by this line.
    for (const skill of set) expect(hasLayoutMarker(skill.files[0].content), skill.dirName).toBe(true);
  });

  // `npx skills add` skipped the router when its description held ": " (strict
  // YAML). Every SKILL.md must parse as YAML and carry a name and description.
  it('writes frontmatter a strict YAML parser accepts', () => {
    const set = generateOpenSpecSkillSet({
      workflows: ALL_WORKFLOWS,
      version: 'test',
      skillName: workflowSkillName,
      invoke: (id) => `/${workflowSkillName(id)}`,
    });
    for (const skill of set) {
      const frontmatter = parseYaml(skill.files[0].content.split('---')[1]);
      expect(frontmatter.name, skill.dirName).toBe(skill.dirName);
      expect(frontmatter.description, skill.dirName).toMatch(/OpenSpec/);
      // Every skill can load on its own: the router whenever work touches
      // openspec/, each workflow skill for its own task.
      expect(frontmatter['disable-model-invocation'], skill.dirName).toBeUndefined();
    }
  });
});

