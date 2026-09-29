import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseSchema } from '../../../src/core/artifact-graph/schema.js';
import { MAX_REQUIREMENT_TEXT_LENGTH } from '../../../src/core/validation/constants.js';

// `openspec validate` flags requirement text over MAX_REQUIREMENT_TEXT_LENGTH,
// but the specs instruction never told agents the limit, so they kept writing
// requirements that tripped it (#1976). Keep the stated limit tied to the
// validator's constant so the two cannot drift.
describe('specs instruction requirement length (#1976)', () => {
  it('states the validator limit and how to stay under it', () => {
    const schema = parseSchema(
      fs.readFileSync(
        path.join(__dirname, '..', '..', '..', 'schemas', 'spec-driven', 'schema.yaml'),
        'utf-8'
      )
    );
    const instruction = schema.artifacts.find(a => a.id === 'specs')?.instruction ?? '';

    expect(instruction).toContain(`${MAX_REQUIREMENT_TEXT_LENGTH} characters or fewer`);
    expect(instruction).toContain('split a requirement that covers several behaviors');
    // Existing requirements under MODIFIED must be copied whole (scenario-loss
    // validation rejects a split), and the limit is only an INFO hint.
    expect(instruction).toContain('This is an informational hint, not an error.');
    expect(instruction).toContain('Under MODIFIED, keep the existing requirement block whole');
  });
});
