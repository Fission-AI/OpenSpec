import * as fs from 'node:fs';
import * as os from 'node:os';
import path from 'path';
import { fileURLToPath } from 'url';
import { afterEach, describe, expect, it } from 'vitest';

import { loadSchema } from '../../../src/core/artifact-graph/schema.js';
import { resolveCurrentPlanningHomeSync } from '../../../src/core/planning-home.js';

// #1702: the `specs` instruction sent main-spec reads and edits to
// `openspec/specs/<capability-path>/spec.md`, a cwd-relative path. When the
// change lives in a registered store the main spec is under the store root, so
// the read either misses or - when a local capability shares the name - lands
// on a different capability and the MODIFIED workflow copies the wrong
// requirement block. The workflow templates already use the store-aware root
// (`sync-specs.ts`, `archive-change.ts`); the schema instruction was the site
// that was missed.
const STORE_AWARE_ROOT = '<planningHome.root>';

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const defaultSchema = loadSchema(path.join(repoRoot, 'schemas', 'spec-driven', 'schema.yaml'));

function instructionFor(artifactId: string): string {
  const artifact = defaultSchema.artifacts.find(entry => entry.id === artifactId);
  expect(artifact, `spec-driven has no "${artifactId}" artifact`).toBeDefined();
  const instruction = artifact?.instruction;
  expect(instruction, `spec-driven "${artifactId}" has no instruction`).toBeDefined();
  return instruction as string;
}

/**
 * Lines that operate on a main spec file. A mention that only describes the
 * shape of a capability path ("use the exact existing path under
 * `openspec/specs/`") is not a file operation and is out of scope.
 */
function mainSpecOperations(instruction: string): string[] {
  return instruction
    .split('\n')
    .filter(line => /openspec\/specs\/<capability-path>\/spec\.md/.test(line))
    .filter(line => /\b(edit|Locate)\b/.test(line));
}

describe('main spec paths in the specs instruction (#1702)', () => {
  it('routes every main-spec operation through the store-aware root', () => {
    const operations = mainSpecOperations(instructionFor('specs'));

    // Both the Purpose edit and step 1 of the MODIFIED workflow.
    expect(operations.length, 'expected the main-spec read and edit to be present').toBe(2);

    for (const line of operations) {
      expect(
        line,
        `main-spec operation uses a cwd-relative path: ${line.trim()}`
      ).toContain(`${STORE_AWARE_ROOT}/openspec/specs/`);
    }
  });

  it('explains where the store-aware root comes from', () => {
    // Naming `planningHome.root` is not enough on its own: it is a field of the
    // instructions JSON, and an agent that does not know that cannot use it.
    const instruction = instructionFor('specs');
    expect(instruction).toContain('openspec instructions');
    expect(instruction).toContain('store-aware root');
  });

  // The text guards above pin the placeholder. This pins the other half of the
  // contract: that `planningHome.root` is a real field whose value, joined with
  // the literal suffix the instruction spells out, lands on the main spec. A
  // renamed field or a wrong suffix leaves the substitution pointing at nothing.
  describe('the composed path resolves', () => {
    const tempDirs: string[] = [];

    afterEach(() => {
      for (const dir of tempDirs.splice(0)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('lands on the main spec when the placeholder is substituted', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-main-spec-path-'));
      tempDirs.push(tempDir);

      const capability = 'identity/user-auth';
      const specDir = path.join(tempDir, 'openspec', 'specs', ...capability.split('/'));
      fs.mkdirSync(specDir, { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'openspec', 'changes'), { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), '# spec\n');

      const planningHome = resolveCurrentPlanningHomeSync({ startPath: tempDir });
      expect(planningHome.root, 'planningHome has no root field').toBeTypeOf('string');

      const [operation] = mainSpecOperations(instructionFor('specs'));
      const suffix = operation.match(/<planningHome\.root>\/(\S*?spec\.md)/)?.[1];
      expect(suffix, `no main-spec path found in: ${operation.trim()}`).toBeDefined();

      // Join as path segments rather than substituting into the string. The
      // instruction spells its suffix with forward slashes while
      // `planningHome.root` carries native separators, so a plain replace would
      // hand Windows a mixed-separator path and lean on Node accepting it.
      const resolved = path.join(
        planningHome.root,
        ...(suffix as string).replace('<capability-path>', capability).split('/')
      );

      expect(fs.existsSync(resolved), `composed path does not exist: ${resolved}`).toBe(true);
    });
  });
});
