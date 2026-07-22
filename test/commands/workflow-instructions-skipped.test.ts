import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadChangeContext,
  generateInstructions,
  formatChangeStatus,
} from '../../src/core/artifact-graph/instruction-loader.js';
import {
  printInstructionsText,
  generateApplyInstructions,
} from '../../src/commands/workflow/instructions.js';
import { printStatusText } from '../../src/commands/workflow/status.js';

describe('printInstructionsText for skip_specs changes', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-'));
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'my-change');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal');
    fs.writeFileSync(
      path.join(changeDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: true\n'
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function capture(artifactId: string): string {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.join(' '));
    });
    const context = loadChangeContext(tempDir, 'my-change');
    const instructions = generateInstructions(context, artifactId);
    const isBlocked = instructions.dependencies.some((d) => !d.done);
    printInstructionsText(instructions, isBlocked);
    vi.restoreAllMocks();
    return lines.join('\n');
  }

  it('emits only the warning for a skipped artifact, no creation directive', () => {
    const output = capture('specs');

    expect(output).toContain('skip_specs: true');
    expect(output).toContain('Do not create spec files');
    expect(output).toContain('</artifact>');
    expect(output).not.toContain('<task>');
    expect(output).not.toContain('<template>');
    expect(output).not.toContain('Write to:');
  });

  it('keeps the normal creation directive for non-skipped artifacts', () => {
    const output = capture('design');

    expect(output).toContain('<task>');
    expect(output).toContain('Create the design artifact for change "my-change".');
    expect(output).not.toContain('this artifact is skipped');
  });

  it('carries skipped and warning in the JSON-facing payload', () => {
    const context = loadChangeContext(tempDir, 'my-change');
    const instructions = generateInstructions(context, 'specs');

    expect(instructions.skipped).toBe(true);
    expect(instructions.warning).toContain('Do not create spec files');
  });

  it('marks the specs dependency as skipped instead of done with files to read', () => {
    const context = loadChangeContext(tempDir, 'my-change');
    const tasksInstructions = generateInstructions(context, 'tasks');
    const specsDep = tasksInstructions.dependencies.find((d) => d.id === 'specs');
    expect(specsDep?.skipped).toBe(true);

    const output = capture('tasks');
    expect(output).toContain('<dependency id="specs" status="skipped">');
    expect(output).toContain('no files to read');
    // The skipped dependency must not point the agent at spec file paths.
    expect(output).not.toContain('specs/**/*.md</path>');
  });

  it('renders the specs stage as skipped in status text with a reduced denominator', () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.join(' '));
    });
    const context = loadChangeContext(tempDir, 'my-change');
    printStatusText(formatChangeStatus(context));
    vi.restoreAllMocks();
    const output = lines.join('\n');

    expect(output).toContain('Progress: 1/3 artifacts complete (1 skipped)');
    expect(output).toContain('[~] specs (skipped: change declares skip_specs)');
    expect(output).toContain('[x] proposal');
  });
});

describe('generateApplyInstructions for skip_specs changes', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('does not block apply on a skipped artifact when the schema requires all artifacts', async () => {
    // A schema with no apply block falls back to requiring every artifact,
    // including the specs-producing one - the skip must count as present.
    const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'mini');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      [
        'name: mini',
        'version: 1',
        'artifacts:',
        '  - id: proposal',
        '    generates: proposal.md',
        '    description: p',
        '    template: proposal.md',
        '  - id: specs',
        '    generates: "specs/**/*.md"',
        '    description: s',
        '    template: spec.md',
        '    requires: [proposal]',
        '  - id: tasks',
        '    generates: tasks.md',
        '    description: t',
        '    template: tasks.md',
        '    requires: [specs]',
        '',
      ].join('\n')
    );
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'my-change');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal');
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '## 1. W\n\n- [ ] 1.1 Do\n');
    fs.writeFileSync(
      path.join(changeDir, '.openspec.yaml'),
      'schema: mini\nskip_specs: true\n'
    );

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.missingArtifacts ?? []).not.toContain('specs');
    expect(instructions.state).not.toBe('blocked');
  });
});
