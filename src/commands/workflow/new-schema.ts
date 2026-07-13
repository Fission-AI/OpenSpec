/**
 * New Schema Command
 *
 * Scaffolds a workflow schema as a folder in the resolved OpenSpec root:
 * schema.yaml plus instructions/ and templates/ files. The scaffold is a
 * working two-stage workflow (proposal → specs) whose comments teach the
 * one move that matters: each artifact is a stage, ordered by `requires:`,
 * so a team encodes its own chain by adding artifacts.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { isKebabId } from '../../core/id.js';
import { getSchemaDir } from '../../core/artifact-graph/index.js';
import {
  resolveRootForCommand,
  toRootOutput,
  withStoreFlag,
  type ResolvedOpenSpecRoot,
} from '../../core/root-selection.js';
import { printJson, statusFromError } from './shared.js';

export interface NewSchemaOptions {
  store?: string;
  storePath?: string;
  json?: boolean;
}

const SCHEMA_YAML = (name: string) => `name: ${name}
version: 1
description: >
  <one line: what this workflow produces and who reviews it>
notes: >
  <how this workflow differs from the default — agents see this verbatim
  on every instruction surface. Example: "No implementation phase: archive
  the change once specs are approved; downstream repos implement it via
  openspec new change <name> --serves <store-id>/<change>.">

# Each artifact is one stage of the workflow, ordered by \`requires:\`.
# Encode your own chain by adding artifacts — for example a design stage
# between proposal and specs, or an analysis stage before everything.
# Long-form guidance lives in instructions/<artifact-id>.md; the output
# shape lives in templates/.
artifacts:
  - id: proposal
    generates: proposal.md
    description: What is changing and why
    template: proposal.md
    requires: []
  - id: specs
    generates: specs/**/*.md
    description: Testable requirements with scenarios
    template: spec.md
    requires:
      - proposal
`;

const PROPOSAL_INSTRUCTION = `Write the proposal in plain language for whoever reviews this stage.

<replace with your stage's guidance: required sections, what belongs
here vs. later stages, and any review gate — e.g. "Do NOT proceed to
specs until the proposal is approved.">
`;

const SPECS_INSTRUCTION = `Create one spec per capability named in the proposal (specs/<name>/spec.md).

- Each requirement: \`### Requirement: <name>\`, SHALL/MUST language.
- Each scenario: \`#### Scenario: <name>\` with GIVEN/WHEN/THEN (exactly 4 hashtags).
- Cover the success path AND meaningful edge/failure cases.
`;

const PROPOSAL_TEMPLATE = `## Why

## What Changes

## Capabilities
`;

const SPEC_TEMPLATE = `## ADDED Requirements

### Requirement: <name>

#### Scenario: <name>
- **GIVEN**
- **WHEN**
- **THEN**
`;

function printCreatedSchemaHuman(
  name: string,
  schemaDir: string,
  root: ResolvedOpenSpecRoot
): void {
  console.log(`Created schema '${name}' at ${schemaDir}/`);
  console.log('  schema.yaml            stages and their order (requires:)');
  console.log('  instructions/*.md      guidance agents get per stage');
  console.log('  templates/*.md         the output shape per stage');
  console.log('');
  console.log('Each artifact is a stage — add one per handoff in your workflow.');
  console.log(
    `Try it: ${withStoreFlag(root, `openspec new change <name> --schema ${name}`)}`
  );
  console.log(
    `Make it the default for this root: set 'schema: ${name}' in openspec/config.yaml`
  );
}

export async function newSchemaCommand(
  name: string | undefined,
  options: NewSchemaOptions
): Promise<void> {
  try {
    if (!name) {
      throw new Error('Missing required argument <name>');
    }
    if (!isKebabId(name)) {
      throw new Error(
        'Schema name must be kebab-case with lowercase letters, numbers, and single hyphen separators'
      );
    }

    const root = await resolveRootForCommand(options, {
      json: options.json,
      failurePayload: { schema: null },
    });
    if (!root) {
      return;
    }

    const schemaDir = path.join(root.path, 'openspec', 'schemas', name);
    try {
      await fs.stat(schemaDir);
      throw new Error(`Schema '${name}' already exists at ${schemaDir}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    await fs.mkdir(path.join(schemaDir, 'instructions'), { recursive: true });
    await fs.mkdir(path.join(schemaDir, 'templates'), { recursive: true });
    const files: Array<[string, string]> = [
      ['schema.yaml', SCHEMA_YAML(name)],
      [path.join('instructions', 'proposal.md'), PROPOSAL_INSTRUCTION],
      [path.join('instructions', 'specs.md'), SPECS_INSTRUCTION],
      [path.join('templates', 'proposal.md'), PROPOSAL_TEMPLATE],
      [path.join('templates', 'spec.md'), SPEC_TEMPLATE],
    ];
    for (const [relative, content] of files) {
      await fs.writeFile(path.join(schemaDir, relative), content, 'utf-8');
    }

    // Sanity: the scaffold must resolve where changes will look for it.
    if (getSchemaDir(name, root.path) === null) {
      throw new Error(`Scaffolded schema '${name}' did not resolve — this is a bug.`);
    }

    if (options.json) {
      printJson({
        schema: {
          name,
          path: schemaDir,
          artifacts: ['proposal', 'specs'],
        },
        created_files: files.map(([relative]) => relative),
        root: toRootOutput(root),
      });
      return;
    }

    printCreatedSchemaHuman(name, schemaDir, root);
  } catch (error) {
    if (options.json) {
      printJson({ schema: null, status: [statusFromError(error)] });
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}
