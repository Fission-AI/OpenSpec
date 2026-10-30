import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  getBulkArchiveChangeSkillTemplate,
  getOpsxBulkArchiveCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { runCLI } from '../../helpers/run-cli.js';
import { formatLocalDate } from '../../../src/utils/date.js';

const bodies: Array<[string, string]> = [
  ['skill', getBulkArchiveChangeSkillTemplate().instructions],
  ['command', getOpsxBulkArchiveCommandTemplate().content],
];

// #1827: the workflow used to `mv` each change itself. POSIX `mv` moves a
// directory *inside* an existing target and exits 0, so a same-day name
// collision nested the change and was reported as archived. Each archive is
// now one `openspec archive` call, which checks the target before writing any
// main spec and refuses atomically.
describe('bulk archive leaves each move to openspec archive (#1827)', () => {
  it.each(bodies)('%s archives through the CLI, never by hand', (label, body) => {
    expect(body, label).toContain('openspec archive "<name>" --json --yes');
    expect(body, label).not.toMatch(/\bmv "/);
    expect(body, label).not.toContain('mkdir -p');
    expect(body, label).toContain('Do not edit main specs or move change directories by hand');
  });

  it.each(bodies)('%s records a refused archive as Failed and keeps going', (label, body) => {
    expect(body, label).toContain('the CLI refused and changed nothing for that change');
    expect(body, label).toContain('record it as Failed');
    expect(body, label).toContain('`archive_target_exists`');
    expect(body, label).toContain('continue with the rest of the batch');
    expect(body, label).toContain('A failed change never stops the rest of the batch');
  });

  it.each(bodies)('%s re-derives a conflict when its earlier half fails', (label, body) => {
    expect(body, label).toContain(
      'If a failed change was the earlier half of a conflict, re-derive that conflict before archiving its partner'
    );
  });
});

describe('openspec archive refuses an existing target before touching specs', () => {
  let root: string;
  let env: NodeJS.ProcessEnv;

  async function write(relative: string, content: string) {
    const file = path.join(root, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  }

  const MAIN_SPEC = `# todo Specification

## Purpose
Track todo items for the people who own them.

## Requirements
### Requirement: Adding a todo
The list SHALL add a todo with a title.

#### Scenario: Title is kept
- **WHEN** a caller adds a todo
- **THEN** the todo keeps its title
`;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-bulk-target-'));
    env = { XDG_DATA_HOME: path.join(root, 'data'), XDG_CONFIG_HOME: path.join(root, 'config') };
    await write('openspec/config.yaml', 'schema: spec-driven\n');
    await write('openspec/specs/todo/spec.md', MAIN_SPEC);
    await write('openspec/changes/add-clear/.openspec.yaml', 'schema: spec-driven\n');
    await write('openspec/changes/add-clear/proposal.md', '## Why\n\nClear done todos.\n');
    await write('openspec/changes/add-clear/tasks.md', '- [x] 1.1 Add clearCompleted\n');
    await write(
      'openspec/changes/add-clear/specs/todo/spec.md',
      '## ADDED Requirements\n### Requirement: Clearing completed todos\nThe list SHALL remove completed todos.\n\n#### Scenario: Cleared\n- **WHEN** a caller clears completed todos\n- **THEN** only open todos remain\n'
    );
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('fails with archive_target_exists and leaves the change and main spec as they were', async () => {
    // The CLI dates archive folders in local time, not UTC.
    const today = formatLocalDate();
    await fs.mkdir(path.join(root, 'openspec/changes/archive', `${today}-add-clear`), { recursive: true });

    const result = await runCLI(['archive', 'add-clear', '--json', '--yes'], { cwd: root, env });
    const report = JSON.parse(result.stdout);

    expect(report.archive).toBeNull();
    expect(report.status).toEqual([expect.objectContaining({ code: 'archive_target_exists' })]);
    expect(await fs.readFile(path.join(root, 'openspec/specs/todo/spec.md'), 'utf8')).toBe(MAIN_SPEC);
    await expect(
      fs.access(path.join(root, 'openspec/changes/add-clear/proposal.md'))
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(root, 'openspec/changes/archive', `${today}-add-clear`, 'add-clear'))
    ).rejects.toThrow();
  });
});
