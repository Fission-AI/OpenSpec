import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { Validator } from '../../src/core/validation/validator.js';

const PROPOSAL = `# Test Change

## Why
This is a sufficiently long explanation to pass the why length requirement for validation purposes.

## What Changes
Pure internal refactor with no spec-level behavior change.`;

const DELTA_SPEC = `## ADDED Requirements

### Requirement: User can export data
The system SHALL allow users to export their data in CSV format.

#### Scenario: Successful export
- **WHEN** user clicks "Export"
- **THEN** system downloads a CSV file
`;

describe('Validator skip_specs handling', () => {
  const testDir = path.join(process.cwd(), 'test-validation-skip-specs-tmp');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('rejects a zero-delta change without the marker', async () => {
    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).toContain('Change must have at least one delta');
    expect(msg).toContain('set "skip_specs: true"');
  });

  it('accepts a zero-delta change that declares skip_specs', async () => {
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: true\n'
    );

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(true);
    expect(report.issues.some(i => i.level === 'ERROR')).toBe(false);
    const info = report.issues.find(i => i.level === 'INFO');
    expect(info?.message).toContain('skip_specs');
  });

  it('rejects skip_specs combined with delta specs', async () => {
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: true\n'
    );
    const capDir = path.join(testDir, 'specs', 'data-export');
    await fs.mkdir(capDir, { recursive: true });
    await fs.writeFile(path.join(capDir, 'spec.md'), DELTA_SPEC);

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).toContain('skip_specs is set in .openspec.yaml but spec files exist under specs/');
  });

  it('treats skip_specs plus a delta file with no parseable deltas as a conflict, not acceptance', async () => {
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: true\n'
    );
    const capDir = path.join(testDir, 'specs', 'data-export');
    await fs.mkdir(capDir, { recursive: true });
    await fs.writeFile(path.join(capDir, 'spec.md'), '# Notes without delta headers\n');

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const messages = report.issues.map(i => i.message).join('\n');
    expect(messages).toContain('skip_specs is set in .openspec.yaml but spec files exist under specs/');
    expect(report.issues.some(i => i.level === 'INFO')).toBe(false);
  });

  it('treats skip_specs plus a root-level specs/spec.md as a conflict', async () => {
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: true\n'
    );
    await fs.mkdir(path.join(testDir, 'specs'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'specs', 'spec.md'), DELTA_SPEC);

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const messages = report.issues.map(i => i.message).join('\n');
    expect(messages).toContain('skip_specs is set in .openspec.yaml but spec files exist under specs/');
  });

  it('treats skip_specs plus a stray non-spec file under specs/ as a conflict', async () => {
    // A stray file matches the artifact graph's specs/** glob (so specs would
    // read as done, not skipped) while discoverSpecFiles ignores it - it must
    // surface as a conflict rather than an accepted zero-delta change.
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: true\n'
    );
    await fs.mkdir(path.join(testDir, 'specs'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'specs', 'notes.md'), '# Stray notes\n');

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const messages = report.issues.map(i => i.message).join('\n');
    expect(messages).toContain('skip_specs is set in .openspec.yaml but spec files exist under specs/');
    expect(report.issues.some(i => i.level === 'INFO')).toBe(false);
  });

  it('reports the marker when the metadata is not valid YAML', async () => {
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: true\n  bad indentation: ['
    );

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const messages = report.issues.map(i => i.message).join('\n');
    expect(messages).toContain('skip_specs is set but .openspec.yaml is not valid change metadata');
    expect(messages).toContain('not valid YAML');
  });

  it('does not honor skip_specs when the metadata fails the shared schema', async () => {
    // Adversarial case: the marker alone, without the required schema field.
    // status/instructions reject this metadata, so validate must not accept it.
    await fs.writeFile(path.join(testDir, '.openspec.yaml'), 'skip_specs: true\n');

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).toContain('skip_specs is set but .openspec.yaml is not valid change metadata');
    expect(msg).toContain('Change must have at least one delta');
  });

  it('does not honor skip_specs when the schema does not resolve', async () => {
    // Adversarial case (review round 5): well-shaped metadata naming an
    // unknown schema. status/instructions refuse to load it, so validate
    // must not honor its marker either.
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: does-not-exist\nskip_specs: true\n'
    );

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).toContain('skip_specs is set but .openspec.yaml is not valid change metadata');
    expect(msg).toContain("unknown schema 'does-not-exist'");
    expect(msg).toContain('Change must have at least one delta');
  });

  it('honors skip_specs when the marker names a project-local schema', async () => {
    // The schema-resolution gate must use the same project root as
    // status/instructions (derived from the change directory), or custom
    // project-local schemas would be falsely rejected.
    const changeDir = path.join(testDir, 'openspec', 'changes', 'refactor');
    await fs.mkdir(changeDir, { recursive: true });
    const schemaDir = path.join(testDir, 'openspec', 'schemas', 'custom-flow');
    await fs.mkdir(schemaDir, { recursive: true });
    await fs.writeFile(
      path.join(schemaDir, 'schema.yaml'),
      [
        'name: custom-flow',
        'version: 1',
        'description: loadable project-local schema',
        'artifacts:',
        '  - id: specs',
        '    generates: "specs/**/*.md"',
        '    description: delta specs',
        '    template: specs.md',
        '    requires: []',
      ].join('\n')
    );
    await fs.writeFile(
      path.join(changeDir, '.openspec.yaml'),
      'schema: custom-flow\nskip_specs: true\n'
    );

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(true);
    expect(report.issues.some(i => i.level === 'ERROR')).toBe(false);
  });

  it('does not honor skip_specs when the schema exists but does not parse', async () => {
    // listSchemas only checks that schema.yaml exists; status/instructions
    // fail one step later when resolveSchema parses it. Validate must not
    // honor the marker on name existence alone.
    const changeDir = path.join(testDir, 'openspec', 'changes', 'refactor');
    await fs.mkdir(changeDir, { recursive: true });
    const schemaDir = path.join(testDir, 'openspec', 'schemas', 'broken-flow');
    await fs.mkdir(schemaDir, { recursive: true });
    await fs.writeFile(path.join(schemaDir, 'schema.yaml'), '{broken yaml: [');
    await fs.writeFile(
      path.join(changeDir, '.openspec.yaml'),
      'schema: broken-flow\nskip_specs: true\n'
    );

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).toContain('skip_specs is set but .openspec.yaml is not valid change metadata');
    expect(msg).toContain('schema');
  });

  it('does not honor skip_specs when the schema parses but fails schema validation', async () => {
    const changeDir = path.join(testDir, 'openspec', 'changes', 'refactor');
    await fs.mkdir(changeDir, { recursive: true });
    const schemaDir = path.join(testDir, 'openspec', 'schemas', 'shapeless');
    await fs.mkdir(schemaDir, { recursive: true });
    // Valid YAML, but missing the required artifacts list.
    await fs.writeFile(
      path.join(schemaDir, 'schema.yaml'),
      'name: shapeless\nversion: 1\n'
    );
    await fs.writeFile(
      path.join(changeDir, '.openspec.yaml'),
      'schema: shapeless\nskip_specs: true\n'
    );

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).toContain('skip_specs is set but .openspec.yaml is not valid change metadata');
  });

  it('rejects a schema name that only resolves via extension normalization', async () => {
    // readChangeMetadata rejects 'spec-driven.yaml' (not a listSchemas
    // member); resolveSchema alone would normalize the extension and accept
    // it. The marker must side with readChangeMetadata.
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: spec-driven.yaml\nskip_specs: true\n'
    );

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).toContain("unknown schema 'spec-driven.yaml'");
  });

  it('an explicit skip_specs: false never drags metadata problems into validation', async () => {
    // skip_specs: false is the opposite of setting the marker; an unrelated
    // shape error in the same file must not produce a "skip_specs is set"
    // message the user never earned.
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: false\ncreated: 123\n'
    );

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).not.toContain('skip_specs is set');
    expect(msg).toContain('Change must have at least one delta');
  });

  it('counts a symlinked file under specs/ as marker-conflicting content', async () => {
    // The artifact graph's globs follow symlinks, so a symlinked spec reads
    // as existing content elsewhere in the CLI while archive would silently
    // drop it - it contradicts the marker like any regular file.
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: true\n'
    );
    const outside = path.join(testDir, 'outside.md');
    await fs.writeFile(outside, DELTA_SPEC);
    await fs.mkdir(path.join(testDir, 'specs'), { recursive: true });
    try {
      await fs.symlink(outside, path.join(testDir, 'specs', 'spec.md'), 'file');
    } catch {
      return; // platform cannot create symlinks (Windows without dev mode)
    }

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).toContain('skip_specs is set in .openspec.yaml but spec files exist under specs/');
  });

  it('fails closed when the metadata file exists but cannot be read', async () => {
    // .openspec.yaml as a directory: status/instructions error on it and the
    // marker state cannot be determined, so validate must not degrade to the
    // unmarked path (where archive would proceed without validation).
    await fs.mkdir(path.join(testDir, '.openspec.yaml'), { recursive: true });

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).toContain('skip_specs is set but .openspec.yaml is not valid change metadata');
    expect(msg).toContain('cannot be read');
  });

  it('validateChange keeps the no-deltas error when the marker names an unknown schema', async () => {
    await fs.writeFile(path.join(testDir, 'proposal.md'), PROPOSAL);
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: does-not-exist\nskip_specs: true\n'
    );

    const validator = new Validator();
    const report = await validator.validateChange(path.join(testDir, 'proposal.md'));

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).toContain('Change must have at least one delta');
    expect(msg).toContain("unknown schema 'does-not-exist'");
  });

  it('validateChange keeps the no-deltas error when the marker metadata is invalid', async () => {
    await fs.writeFile(path.join(testDir, 'proposal.md'), PROPOSAL);
    await fs.writeFile(path.join(testDir, '.openspec.yaml'), 'skip_specs: true\n');

    const validator = new Validator();
    const report = await validator.validateChange(path.join(testDir, 'proposal.md'));

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).toContain('Change must have at least one delta');
    // Both validate paths explain why the marker was not honored.
    expect(msg).toContain('skip_specs is set but .openspec.yaml is not valid change metadata');
  });

  it('still rejects zero deltas when metadata is malformed', async () => {
    await fs.writeFile(path.join(testDir, '.openspec.yaml'), '{invalid yaml: [');

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).toContain('Change must have at least one delta');
  });

  it('skip_specs must be exactly true - a truthy string is surfaced as unhonorable, not silently ignored', async () => {
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: "yes"\n'
    );

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).toContain('skip_specs is set but .openspec.yaml is not valid change metadata');
  });

  it('does not crash when specs is a regular file instead of a directory', async () => {
    // Regression guard: the marker probe must not break the historical
    // "unreadable specs dir degrades to no deltas" behavior for unmarked
    // changes, and must fail closed (conflict) for marked ones.
    await fs.writeFile(path.join(testDir, 'specs'), 'not a directory');

    const validator = new Validator();
    const unmarked = await validator.validateChangeDeltaSpecs(testDir);
    expect(unmarked.valid).toBe(false);
    expect(unmarked.issues.map(i => i.message).join('\n')).toContain('Change must have at least one delta');

    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: true\n'
    );
    const marked = await validator.validateChangeDeltaSpecs(testDir);
    expect(marked.valid).toBe(false);
    expect(marked.issues.map(i => i.message).join('\n')).toContain('skip_specs is set in .openspec.yaml but spec files exist under specs/');
  });

  it('ignores dot-files under specs/ just like every other code path', async () => {
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: true\n'
    );
    await fs.mkdir(path.join(testDir, 'specs'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'specs', '.gitkeep'), '');
    await fs.writeFile(path.join(testDir, 'specs', '.DS_Store'), '');

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(true);
  });

  it('does not claim the marker was set when broken YAML only mentions it in a comment', async () => {
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      '# maybe add skip_specs later\nschema: spec-driven\n  broken: ['
    );

    const validator = new Validator();
    const report = await validator.validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).not.toContain('not valid change metadata');
    expect(msg).toContain('Change must have at least one delta');
  });

  it('validateChange drops the no-deltas error when skip_specs is declared', async () => {
    await fs.writeFile(path.join(testDir, 'proposal.md'), PROPOSAL);
    await fs.writeFile(
      path.join(testDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: true\n'
    );

    const validator = new Validator();
    const report = await validator.validateChange(path.join(testDir, 'proposal.md'));

    expect(report.valid).toBe(true);
    const msg = report.issues.map(i => i.message).join('\n');
    expect(msg).not.toContain('Change must have at least one delta');
  });
});
