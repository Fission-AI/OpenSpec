import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import {
  generateSkillContent,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';

/**
 * The natural-language phrase a user or agent says for each workflow, as a
 * suffix of `openspec `. Every workflow's skill description must name it so an
 * agent that hears "do an openspec propose" matches the skill instead of
 * hand-building the artifacts with the CLI (issue #1221).
 *
 * Keep in sync with getSkillTemplates(): the coverage test below fails when a
 * workflow is added without a trigger phrase.
 */
const NATURAL_VERB_BY_WORKFLOW: Record<string, string> = {
  explore: 'explore',
  new: 'new change',
  continue: 'continue',
  apply: 'apply',
  update: 'update change',
  ff: 'ff',
  sync: 'sync',
  archive: 'archive',
  'bulk-archive': 'bulk-archive',
  verify: 'verify',
  onboard: 'onboard',
  propose: 'propose',
};

/**
 * Phrases whose first word is a real CLI command and that a skill nonetheless
 * claims on purpose, with the reason. Every other collision is a defect: a
 * skill would send an LLM to re-do a deterministic command.
 *
 * `openspec update` is the case this rule exists for. It refreshes generated
 * instruction files and has nothing to do with the update-change workflow, so
 * that skill claims `openspec update change` and says so in its description.
 */
const DELIBERATE_CLI_PHRASE_CLAIMS: Record<string, string> = {
  'openspec archive':
    'the archive workflow syncs specs before archiving; the bare CLI command does not, so an agent asked to archive should run the workflow',
  'openspec archive all':
    'same, for several changes at once (bulk-archive)',
  'openspec new change':
    'the new-change workflow runs this exact CLI command as its first step, then continues with the artifacts',
  'openspec update change':
    'distinct from `openspec update`, which the update-change description explicitly disclaims',
};

const CLI_ENTRYPOINT = fileURLToPath(
  new URL('../../../src/cli/index.ts', import.meta.url)
);

/**
 * Every command name the CLI registers, at any nesting level. Deliberately
 * over-broad: a superset only costs an entry in DELIBERATE_CLI_PHRASE_CLAIMS,
 * while a subset would let a real collision through.
 */
function readCliCommandNames(): ReadonlySet<string> {
  const source = readFileSync(CLI_ENTRYPOINT, 'utf8');
  const names = [...source.matchAll(/\.command\(\s*'([a-z][a-z-]*)/g)].map(m => m[1]);
  return new Set(names);
}

/** Quoted `openspec …` / `opsx …` phrases a description claims. */
function claimedPhrases(description: string): string[] {
  return (description.match(/"(?:openspec|opsx) [^"]+"/g) ?? []).map(p => p.slice(1, -1));
}

function descriptionOf(workflowId: string): string {
  const entry = getSkillTemplates().find(e => e.workflowId === workflowId);
  if (!entry) throw new Error(`no skill template for workflow ${workflowId}`);
  return entry.template.description;
}

describe('workflow verb triggers', () => {
  it('covers every workflow that ships a skill', () => {
    const shipped = getSkillTemplates().map(e => e.workflowId).sort();
    expect(shipped).toEqual(Object.keys(NATURAL_VERB_BY_WORKFLOW).sort());
  });

  it.each(Object.entries(NATURAL_VERB_BY_WORKFLOW))(
    '%s names its natural "openspec" and "opsx" phrasings',
    (workflowId, verb) => {
      const description = descriptionOf(workflowId);
      expect(description).toContain(`"openspec ${verb}"`);
      expect(description).toContain(`"opsx ${workflowId}"`);
    }
  );

  it('reads the CLI command names it guards against', () => {
    // Without this the collision test below would pass vacuously if the CLI
    // entrypoint moved or changed how it registers commands.
    const names = readCliCommandNames();
    for (const known of ['init', 'update', 'archive', 'new', 'validate', 'list']) {
      expect(names, `CLI command "${known}" not found in ${CLI_ENTRYPOINT}`).toContain(known);
    }
  });

  it('claims a real CLI command only on purpose', () => {
    const cliCommands = readCliCommandNames();

    for (const entry of getSkillTemplates()) {
      for (const phrase of claimedPhrases(entry.template.description)) {
        const [namespace, firstWord] = phrase.split(' ');
        // `opsx` is not a binary, so those phrases collide with nothing.
        if (namespace !== 'openspec' || !cliCommands.has(firstWord)) continue;

        expect(
          DELIBERATE_CLI_PHRASE_CLAIMS[phrase],
          `${entry.dirName} claims "${phrase}", but "openspec ${firstWord}" is a real CLI command. ` +
            `Either pick a phrase that does not shadow it, or add an entry to DELIBERATE_CLI_PHRASE_CLAIMS saying why this is right.`
        ).toBeDefined();
      }
    }
  });

  it('never claims the bare `openspec update` CLI command', () => {
    for (const entry of getSkillTemplates()) {
      expect(
        claimedPhrases(entry.template.description),
        `${entry.dirName} would shadow the openspec update CLI command`
      ).not.toContain('openspec update');
    }
  });

  it('routes each phrase to exactly one skill', () => {
    const seen = new Map<string, string>();
    for (const entry of getSkillTemplates()) {
      for (const phrase of claimedPhrases(entry.template.description)) {
        const owner = seen.get(phrase);
        expect(owner, `"${phrase}" is claimed by both ${owner} and ${entry.dirName}`).toBeUndefined();
        seen.set(phrase, entry.dirName);
      }
    }
  });

  // The description is written into YAML frontmatter as an unquoted plain
  // scalar (see generateSkillContent), so a trigger phrase must not introduce
  // characters that change how the scalar parses.
  it('keeps generated frontmatter parseable with the description intact', () => {
    for (const entry of getSkillTemplates()) {
      const content = generateSkillContent(entry.template, '1.0.0-test');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/);
      expect(frontmatter, `${entry.dirName} has no frontmatter`).not.toBeNull();

      const parsed = parseYaml(frontmatter![1]) as Record<string, unknown>;
      expect(parsed.name).toBe(entry.template.name);
      expect(parsed.description).toBe(entry.template.description);
    }
  });
});
