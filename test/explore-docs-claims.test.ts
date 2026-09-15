import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Sixteen lines across both documentation trees used to state that `explore`
// creates no artifacts and writes no files, full stop (#1833). That has been
// false since explore shipped (#467): the capture branch of
// `src/core/templates/workflows/explore.ts` writes the planning artifacts the
// user asked for, and can edit an existing change's artifacts. #1503 later
// made it scaffold with `openspec new change` first. What stays true is narrower: explore never writes code,
// and it writes nothing you did not ask for or agree to.
//
// This sweep keeps the absolute wording retired, the same way
// test/vocabulary-sweep.test.ts keeps the pre-rename store vocabulary retired.
// It is deliberately a flat list of phrasings over a named page list rather
// than a grammar for the claim. An earlier draft tried the grammar - section
// splitting, fence tracking, a conditional-marker exemption - and it was
// imprecise in both directions on realistic prose while returning the same
// verdict here. Phrasings that are only wrong in the absolute ("writes
// nothing", "creates nothing") are left to review, because "writes nothing
// unless you ask" is the wording this very test recommends.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The pages that pitch explore to a user. Both trees ship: `docs/` is what
// README links today, `docs-lab/` is what the documentation site publishes
// (`website/content/docs` is generated from it and is not committed).
const PAGES = [
  'README.md',
  'docs/README.md',
  'docs/commands.md',
  'docs/examples.md',
  'docs/explore.md',
  'docs/faq.md',
  'docs/getting-started.md',
  'docs/glossary.md',
  'docs/overview.md',
  'docs/workflows.md',
  'docs-lab/start/quickstart.md',
];

/**
 * Every phrasing that actually carried the claim, as a pattern. This list is
 * grounded, not speculative: it is what the sixteen offending lines said. When
 * a new phrasing appears, add it then. A guard does not have to be exhaustive
 * to be worth having, and a literal list is the one thing every maintainer can
 * extend correctly without reading a grammar.
 */
const FORBIDDEN: readonly RegExp[] = [
  // The capability form.
  /\bno artifacts\b/i,
  /\bno files\b/i,
  /\bwrite any artifacts\b/i,
  // Bullet-anchored: "It does not: - Create a change folder." The same words
  // in a sentence ("it does not create a change folder on its own") are the
  // correct wording, so only the unconditional bullet form is forbidden.
  /^\s*[-*]\s+creates? a change folder\b/i,
  // The timing form: true of the default path, false as a description of what
  // explore can do. This is the shape that survived the first pass on #1833.
  /\bbefore any artifact\b/i,
  /\bbefore any change\b/i,
  /\bbefore a single artifact\b/i,
  /\bbefore anything is written\b/i,
  /\bbefore you create artifacts\b/i,
];

/** Lines that contain a forbidden phrase without making the claim. */
const ALLOW = [
  // docs/commands.md and docs/troubleshooting.md quote this CLI message.
  /"No artifacts ready"/,
];

const TEST_FILE = 'test/explore-docs-claims.test.ts';

function findOffenders(page: string, content: string): string[] {
  const offenders: string[] = [];
  content.split(/\r?\n/).forEach((line, index) => {
    if (ALLOW.some((allowed) => allowed.test(line))) return;
    const match = FORBIDDEN.map((f) => f.exec(line)).find(Boolean);
    if (match) {
      offenders.push(`${page}:${index + 1}: "${match[0]}" in: ${line.trim()}`);
    }
  });
  return offenders;
}

describe('explore documentation', () => {
  it('never claims explore writes nothing at all (#1833)', () => {
    const offenders = PAGES.flatMap((page) => {
      const file = path.join(REPO_ROOT, ...page.split('/'));
      if (!fs.existsSync(file)) return [];
      return findOffenders(page, fs.readFileSync(file, 'utf-8'));
    });

    expect(
      offenders,
      'These pages assert that explore writes nothing. It captures on ' +
        'request: `openspec new change` plus the planning artifacts you ' +
        'name. Keep "never writes code" and "nothing unless you ask, or say ' +
        'yes when it offers"; drop the absolute denial. If a line below is ' +
        `not a claim about explore, add it to ALLOW in ${TEST_FILE}.` +
        `\n\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  // A forbidden-phrase list cannot tell "the correction was deleted" from
  // "this page never mentioned capture", and a bare /captur/ match passes on
  // "explore automatically captures every artifact". So pin the contract, not
  // the word, on the two pages that describe capture in full: some capture
  // line names the user's trigger, the `openspec new change` path, and the
  // named-artifacts scope; no capture line claims explore does it unprompted
  // or wholesale; and the page keeps the never-writes-code guarantee.
  // Wording stays review's call: the user trigger covers both "when you ask"
  // and a yes to explore's offer, which is true before and after #1832.
  const USER_TRIGGER = /\b(you ask|accept its offer|say yes)\b/i;
  const NAMED_SCOPE = /\bartifacts you name(d)?\b/i;
  const UNPROMPTED = /\b(automatically|on its own|without (asking|confirmation)|(every|all) (planning )?artifacts)\b/i;
  const NEGATION = /\b(not|never|no|doesn't|don't|won't)\b/i;

  // An unprompted claim about explore writing, checked clause by clause so
  // "does not automatically capture" passes and "automatically captures every
  // artifact, but never writes code" still fails. Only lines naming explore or
  // capture count: /opsx:ff legitimately "creates all planning artifacts".
  function claimsUnpromptedWrite(line: string): boolean {
    if (!/\b(explore|captur)/i.test(line)) return false;
    return line.split(/[.,;:!?]|\bbut\b/i).some((clause) => {
      const match = UNPROMPTED.exec(clause);
      return (
        match !== null &&
        /\b(captur|creat|edit|writ|scaffold)/i.test(clause) &&
        !NEGATION.test(clause.slice(0, match.index))
      );
    });
  }

  for (const page of ['docs/explore.md', 'docs/commands.md']) {
    it(`${page} still documents the user-requested capture contract (#1833)`, () => {
      const content = fs.readFileSync(path.join(REPO_ROOT, ...page.split('/')), 'utf-8');
      const lines = content.split(/\r?\n/);
      const captureLines = lines.filter((line) => /\bcaptur/i.test(line));

      expect(
        captureLines.some(
          (line) =>
            USER_TRIGGER.test(line) && /openspec new change/.test(line) && NAMED_SCOPE.test(line)
        ),
        `${page} should describe capture as something explore does when you ask ` +
          'or say yes to its offer: `openspec new change` plus the artifacts you ' +
          'name. See #1833.'
      ).toBe(true);

      const unprompted = lines.filter(claimsUnpromptedWrite);
      expect(
        unprompted,
        `${page} describes capture as happening unprompted or wholesale. It ` +
          'writes only what the user asked for or agreed to.'
      ).toEqual([]);

      expect(content, `${page} should keep the never-writes-code guarantee.`).toMatch(
        /never writes code/i
      );
    });
  }
});
