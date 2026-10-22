import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { SKILL_NAMESPACE as NS, generateOpenSpecSkill, generateOpenSpecSkillSet, hasLayoutMarker, workflowSkillName } from '../../../src/core/shared/openspec-skill.js';
import { ALL_WORKFLOWS, CORE_WORKFLOWS } from '../../../src/core/profiles.js';
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
    for (const id of CORE_WORKFLOWS) {
      expect(skill.content, id).toContain(`| \`references/${id}.md\` | \`/openspec:${id}\` |`);
      expect(files.some((file) => file.relativePath === `references/${id}.md`), id).toBe(true);
    }
    // A workflow that is not installed is neither routed to nor shipped.
    expect(skill.content).not.toContain('references/onboard.md');
    expect(files.some((file) => file.relativePath === 'references/onboard.md')).toBe(false);
  });

  // The point of one skill: a rule every workflow follows is written once.
  it('states each shared rule exactly once across all its files', () => {
    const all = render(ALL_WORKFLOWS).map((file) => file.content).join('\n');
    expect(count(all, BEFORE_YOU_START.replace('**Before you start**\n', ''))).toBe(1);
    expect(count(all, RUNTIME_INPUTS)).toBe(1);
    expect(count(all, '# Writing an artifact')).toBe(1);
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
    expect(skill).toContain('Planning workflows (explore, propose, update) end the response: they never edit project code');
  });

  it('points every workflow at the shared rules instead of copying them', () => {
    const files = render(ALL_WORKFLOWS);
    const archive = files.find((file) => file.relativePath === 'references/archive.md')!.content;
    expect(archive).toContain('**Runtime inputs** in SKILL.md');
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
  // an eval run showing the extra text pays for itself.
  it('stays within its size budgets', () => {
    const files = render(ALL_WORKFLOWS);
    const size = (file: { content: string }) => Buffer.byteLength(file.content);
    expect(size(files[0]), 'SKILL.md').toBeLessThanOrEqual(5_000);
    const workflows = new Set(ALL_WORKFLOWS.map((id) => `references/${id}.md`));
    for (const file of files.filter((entry) => workflows.has(entry.relativePath))) {
      expect(size(file), file.relativePath).toBeLessThanOrEqual(12_000);
    }
    const core = render(CORE_WORKFLOWS).reduce((total, file) => total + size(file), 0);
    expect(core, 'default install').toBeLessThanOrEqual(50_000);
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
    expect(set.map((skill) => skill.dirName).sort()).toEqual([NS, ...CORE_WORKFLOWS.map(workflowSkillName)].sort());
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
      // Only the router is user-invoked; the model reaches workflows through their own skills.
      expect(frontmatter['disable-model-invocation'] === true, skill.dirName).toBe(skill.dirName === NS);
    }
  });
});

