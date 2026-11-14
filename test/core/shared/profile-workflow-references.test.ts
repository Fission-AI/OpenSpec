import { describe, expect, it } from 'vitest';

import {
  getSkillTemplates,
  getCommandContents,
} from '../../../src/core/shared/skill-generation.js';
import {
  ALL_WORKFLOWS,
  CORE_WORKFLOWS,
  getProfileWorkflows,
} from '../../../src/core/profiles.js';

/**
 * A skill's text is the same for every workflow profile, so it can name a
 * workflow the installation does not have. That must never dead-end the agent
 * (#1734, umbrella #919): every mention of another workflow has to say what
 * holds "if installed" and so carry its fallback, where the agent, which can
 * see the skills it has, reads it.
 *
 * Checked line by line on both surfaces. A table row or list item may instead
 * sit under a line that says only the installed skills are available.
 */
const skillWorkflows = new Map(
  getSkillTemplates().map(({ dirName, workflowId }) => [dirName, workflowId])
);

const REFERENCE = /\/opsx:([a-z-]+)|\b(openspec-[a-z]+(?:-[a-z]+)*)\b/g;
const isRowOrItem = (line: string) => /^\s*(\||- )/.test(line);

/** Mentions of a workflow other than `own` that no "installed" wording covers. */
function uncoveredReferences(own: string, body: string): string[] {
  const lines = body.split('\n');
  const uncovered: string[] = [];

  lines.forEach((line, index) => {
    for (const match of line.matchAll(REFERENCE)) {
      const workflow = match[1] ?? skillWorkflows.get(match[2]);
      if (workflow === undefined || workflow === own) continue;
      if (line.includes('installed')) continue;

      let above = index;
      while (above > 0 && (isRowOrItem(lines[above]) || lines[above].trim() === '')) above -= 1;
      if (isRowOrItem(line) && lines[above].includes('installed')) continue;

      uncovered.push(`${match[0]} (line ${index + 1}): ${line.trim()}`);
    }
  });

  return uncovered;
}

const BODIES: Array<[string, string, string]> = [
  ...getSkillTemplates().map(
    ({ dirName, workflowId, template }) =>
      [dirName, workflowId, template.instructions] as [string, string, string]
  ),
  ...getCommandContents().map(
    ({ id, body }) => [`command ${id}`, id, body] as [string, string, string]
  ),
];

describe('generated files never dead-end on an uninstalled workflow', () => {
  it('catches a bare reference and accepts a covered one', () => {
    expect(uncoveredReferences('apply', 'suggest `/opsx:continue`.')).toHaveLength(1);
    expect(uncoveredReferences('apply', 'run the `openspec-sync-specs` workflow')).toHaveLength(1);
    expect(uncoveredReferences('apply', 'run `/opsx:apply add-auth`')).toEqual([]);
    expect(
      uncoveredReferences('apply', 'suggest `/opsx:continue` if that skill is installed.')
    ).toEqual([]);
    expect(
      uncoveredReferences(
        'onboard',
        'Only the skills installed on this machine are available.\n\n | Skill |\n | `/opsx:ff` |'
      )
    ).toEqual([]);
    expect(uncoveredReferences('onboard', 'The skills:\n\n | Skill |\n | `/opsx:ff` |')).toHaveLength(1);
  });

  it.each(BODIES)('%s covers every mention of another workflow', (_label, own, body) => {
    expect(uncoveredReferences(own, body)).toEqual([]);
  });

  // The mirror image: the handoffs themselves must not disappear. Every
  // workflow another one hands off to is still named. `bulk-archive` is the
  // one workflow nothing points at - it is reached from the CLI, not from
  // another workflow.
  it('still names every referenced workflow', () => {
    const named = new Set<string>();

    for (const [, , body] of BODIES) {
      for (const id of ALL_WORKFLOWS) {
        if (body.includes(`/opsx:${id}`)) named.add(id);
      }
    }

    expect([...named].sort()).toEqual(
      [...ALL_WORKFLOWS].filter((id) => id !== 'bulk-archive').sort()
    );
  });

  it('keeps the core profile as the default workflow set', () => {
    expect([...getProfileWorkflows('core')].sort()).toEqual([...CORE_WORKFLOWS].sort());
  });

  // Archiving merges delta specs into main specs, which is the sync workflow's
  // job. Selecting archive in a custom profile pulls sync in with it.
  it('injects sync for a custom profile that selects archive', () => {
    expect(getProfileWorkflows('custom', ['archive'])).toContain('sync');
    expect(getProfileWorkflows('custom', ['bulk-archive'])).toContain('sync');
  });
});
