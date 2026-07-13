import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';

describe('openspec new schema', () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-new-schema-'))
    );
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    fs.mkdirSync(path.join(tempDir, 'openspec', 'changes'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'openspec', 'config.yaml'),
      'schema: spec-driven\n'
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function parseJson(result: RunCLIResult): any {
    return JSON.parse(result.stdout);
  }

  it('scaffolds a working schema folder that changes can use immediately', async () => {
    const result = await runCLI(['new', 'schema', 'team-flow', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(result.exitCode).toBe(0);
    const payload = parseJson(result);
    expect(payload.schema.name).toBe('team-flow');
    expect(payload.created_files).toEqual([
      'schema.yaml',
      path.join('instructions', 'proposal.md'),
      path.join('instructions', 'specs.md'),
      path.join('templates', 'proposal.md'),
      path.join('templates', 'spec.md'),
    ]);

    // The scaffold is a valid, listed schema...
    const schemas = await runCLI(['schemas', '--json'], { cwd: tempDir, env });
    const entry = parseJson(schemas).find((s: any) => s.name === 'team-flow');
    expect(entry).toMatchObject({ source: 'project', artifacts: ['proposal', 'specs'] });

    // ...and a change created with it gets the full artifact graph.
    const change = await runCLI(
      ['new', 'change', 'try-flow', '--schema', 'team-flow', '--json'],
      { cwd: tempDir, env }
    );
    expect(change.exitCode).toBe(0);
    expect(parseJson(change).change.schema).toBe('team-flow');
  });

  it('refuses to overwrite an existing schema', async () => {
    fs.mkdirSync(path.join(tempDir, 'openspec', 'schemas', 'team-flow'), {
      recursive: true,
    });
    const result = await runCLI(['new', 'schema', 'team-flow', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0].message).toContain('already exists');
  });

  it('rejects a non-kebab name', async () => {
    const result = await runCLI(['new', 'schema', 'Team Flow', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0].message).toContain('kebab-case');
  });
});
