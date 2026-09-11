import type { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { program } from '../../../src/cli/index.js';
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
 * that skill claims `openspec update change` and redirects to the CLI command
 * in its description.
 */
const DELIBERATE_CLI_PHRASE_CLAIMS: Record<string, string> = {
  'openspec archive':
    'both archive and merge delta specs, but the workflow confirms with the user and verifies the merge capability-by-capability before anything moves, where the bare command does it in one shot; an agent asked to archive should take the checked path',
  'openspec archive all': 'same, for several changes at once (bulk-archive)',
  'openspec archive these changes': 'same, for several changes at once (bulk-archive)',
  'openspec new change':
    'the new-change workflow runs this exact CLI command as its first step, then continues with the artifacts',
  'openspec update change':
    'distinct from `openspec update`, which the update-change description redirects to the CLI command',
};

/**
 * Pairs where one skill's phrase is a prefix of another skill's, so an
 * utterance matching the longer one also contains the shorter. Declared with
 * the reason it is safe; anything undeclared is an accidental misroute.
 */
const DELIBERATE_PHRASE_SHADOWING: Record<string, string> = {
  'openspec archive < openspec archive all':
    'plural requests are claimed explicitly by bulk-archive so they outweigh the bare literal',
  'openspec archive < openspec archive these changes':
    'plural requests are claimed explicitly by bulk-archive so they outweigh the bare literal',
};

/**
 * Every command name the CLI registers, at any depth, including aliases.
 * Walks the real commander tree rather than scanning a source file: seven
 * command groups (spec, config, schema, store, doctor, context, workset) are
 * registered from their own modules and a text scan of the entrypoint misses
 * them. Importing `program` does not parse argv (see runCli).
 */
function collectCommandNames(command: Command, into = new Set<string>()): Set<string> {
  for (const sub of command.commands) {
    into.add(sub.name());
    for (const alias of sub.aliases()) into.add(alias);
    collectCommandNames(sub, into);
  }
  return into;
}

/**
 * Quoted `openspec …` / `opsx …` phrases a description claims. Only quoted
 * text counts as a claim: descriptions also mention commands in prose (the
 * update-change redirect names the openspec update CLI command unquoted),
 * and prose is not a routing trigger. Matching is case-insensitive so a
 * capitalized phrase cannot slip past the guards below.
 */
function claimedPhrases(description: string): string[] {
  return [...description.matchAll(/(["`])((?:openspec|opsx) [^"`]+)\1/gi)].map(m =>
    m[2].toLowerCase()
  );
}

function descriptionOf(workflowId: string): string {
  const entry = getSkillTemplates().find(e => e.workflowId === workflowId);
  if (!entry) throw new Error(`no skill template for workflow ${workflowId}`);
  return entry.template.description;
}

function allClaims(): { dirName: string; phrase: string }[] {
  return getSkillTemplates().flatMap(entry =>
    claimedPhrases(entry.template.description).map(phrase => ({ dirName: entry.dirName, phrase }))
  );
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

  it('sees the CLI commands registered outside the entrypoint', () => {
    // Without this the collision test would pass vacuously, and it pins the
    // blind spot that scanning src/cli/index.ts for `.command('…')` had: these
    // seven groups are registered from their own modules.
    const names = collectCommandNames(program);
    for (const known of ['init', 'update', 'archive', 'new', 'validate', 'list']) {
      expect(names, `CLI command "${known}" is missing`).toContain(known);
    }
    for (const delegated of ['spec', 'config', 'schema', 'store', 'doctor', 'context', 'workset']) {
      expect(names, `delegated CLI command "${delegated}" is missing`).toContain(delegated);
    }
  });

  it('claims a real CLI command only on purpose', () => {
    const cliCommands = collectCommandNames(program);

    for (const { dirName, phrase } of allClaims()) {
      const [namespace, firstWord] = phrase.split(' ');
      // `opsx` is not a binary, so those phrases collide with nothing.
      if (namespace !== 'openspec' || !cliCommands.has(firstWord)) continue;

      expect(
        DELIBERATE_CLI_PHRASE_CLAIMS[phrase],
        `${dirName} claims "${phrase}", but "openspec ${firstWord}" is a real CLI command. ` +
          `Either pick a phrase that does not shadow it, or add an entry to DELIBERATE_CLI_PHRASE_CLAIMS saying why this is right.`
      ).toBeTruthy();
    }
  });

  it('never claims the bare `openspec update` CLI command', () => {
    // A hard floor the allowlist cannot lift: refreshing generated files has
    // nothing to do with revising a change.
    for (const { dirName, phrase } of allClaims()) {
      expect(phrase, `${dirName} would shadow the openspec update CLI command`).not.toBe(
        'openspec update'
      );
    }
  });

  it('routes each phrase to exactly one skill', () => {
    const seen = new Map<string, string>();
    for (const { dirName, phrase } of allClaims()) {
      const owner = seen.get(phrase);
      expect(owner, `"${phrase}" is claimed by both ${owner} and ${dirName}`).toBeUndefined();
      seen.set(phrase, dirName);
    }
  });

  it('shadows a shorter phrase only on purpose', () => {
    const claims = allClaims();

    for (const shorter of claims) {
      for (const longer of claims) {
        if (shorter.dirName === longer.dirName) continue;
        if (!longer.phrase.startsWith(`${shorter.phrase} `)) continue;

        const key = `${shorter.phrase} < ${longer.phrase}`;
        expect(
          DELIBERATE_PHRASE_SHADOWING[key],
          `${shorter.dirName} claims "${shorter.phrase}", which every utterance of ${longer.dirName}'s ` +
            `"${longer.phrase}" also contains, so the shorter claim can win. Declare it in ` +
            `DELIBERATE_PHRASE_SHADOWING as "${key}" with the reason it is safe.`
        ).toBeTruthy();
      }
    }
  });

  it('keeps no stale entries in either allowlist', () => {
    const phrases = new Set(allClaims().map(c => c.phrase));
    for (const phrase of Object.keys(DELIBERATE_CLI_PHRASE_CLAIMS)) {
      expect(phrases, `DELIBERATE_CLI_PHRASE_CLAIMS has "${phrase}", which no skill claims`).toContain(
        phrase
      );
    }
    for (const key of Object.keys(DELIBERATE_PHRASE_SHADOWING)) {
      const [shorter, longer] = key.split(' < ');
      expect(phrases, `DELIBERATE_PHRASE_SHADOWING has "${key}", but "${shorter}" is unclaimed`).toContain(shorter);
      expect(phrases, `DELIBERATE_PHRASE_SHADOWING has "${key}", but "${longer}" is unclaimed`).toContain(longer);
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
