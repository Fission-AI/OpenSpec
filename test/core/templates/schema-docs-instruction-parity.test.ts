import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseSchema } from '../../../src/core/artifact-graph/schema.js';

// The published schema reference quotes every `spec-driven` instruction
// verbatim ("The instruction sent to the agent when it drafts this
// artifact"), so a reader can see exactly what their agent is told. Nothing
// regenerated that page, and it drifted: the `specs` block predated the
// store-aware main-spec paths (#1703) and the `tasks` block still taught the
// pre-#1660 rules, so the site contradicted the shipped instruction. This
// keeps the quoted blocks byte-identical to schema.yaml.
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SCHEMA_DIR = path.join(REPO_ROOT, 'schemas', 'spec-driven');
const DOC_PATH = path.join(
  REPO_ROOT,
  'docs-lab',
  'reference',
  'schemas',
  'spec-driven',
  'index.md'
);

const normalize = (value: string): string => value.replace(/\r\n?/g, '\n').trim();

// The fence length varies per block because an instruction may contain its own
// ``` example, so the outer fence has to be longer.
const QUOTED_INSTRUCTION =
  /### Instructions\n\n[^\n]*\n\n(`{3,})md\n([\s\S]*?)\n\1\n/g;

describe('published schema reference', () => {
  it('quotes every spec-driven instruction verbatim (#1952)', () => {
    const schema = parseSchema(
      fs.readFileSync(path.join(SCHEMA_DIR, 'schema.yaml'), 'utf-8')
    );
    const doc = fs.readFileSync(DOC_PATH, 'utf-8').replace(/\r\n?/g, '\n');

    const quoted = [...doc.matchAll(QUOTED_INSTRUCTION)].map(match => match[2]);
    const expected: Array<[string, string]> = [
      ...schema.artifacts.map(
        (artifact): [string, string] => [artifact.id, artifact.instruction ?? '']
      ),
      ['apply', schema.apply?.instruction ?? ''],
    ];

    expect(quoted).toHaveLength(expected.length);
    expected.forEach(([id, instruction], index) => {
      expect(instruction, `${id} has no instruction to quote`).not.toBe('');
      expect(normalize(quoted[index]), `${id} instruction is stale in ${path.basename(DOC_PATH)}`).toBe(
        normalize(instruction)
      );
    });
  });

  it('keeps the tasks guidance on the published page (#1952)', () => {
    const doc = fs.readFileSync(DOC_PATH, 'utf-8').replace(/\r\n?/g, '\n');
    expect(doc).toContain(
      'Each task group MUST land the tests and documentation its own work'
    );
    expect(doc).toContain('Each task MUST state how to verify completion');
  });
});
