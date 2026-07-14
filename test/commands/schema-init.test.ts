import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';

describe('openspec schema init (CLI)', () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-init-'))
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

  it('scaffolds instruction files beside templates, seeded from the built-in guidance', async () => {
    const result = await runCLI(
      ['schema', 'init', 'team-flow', '--artifacts', 'proposal,specs', '--json'],
      { cwd: tempDir, env }
    );
    expect(result.exitCode).toBe(0);
    expect(parseJson(result)).toMatchObject({
      created: true,
      artifacts: ['proposal', 'specs'],
    });

    const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'team-flow');
    for (const file of [
      'schema.yaml',
      path.join('instructions', 'proposal.md'),
      path.join('instructions', 'specs.md'),
    ]) {
      expect(fs.existsSync(path.join(schemaDir, file)), file).toBe(true);
    }
    // Seeded from the built-in workflow's guidance, not a placeholder.
    expect(
      fs.readFileSync(path.join(schemaDir, 'instructions', 'proposal.md'), 'utf-8')
    ).toContain('Capabilities');

    // A change created with it resolves the file-based instructions.
    const change = await runCLI(
      ['new', 'change', 'try-flow', '--schema', 'team-flow', '--json'],
      { cwd: tempDir, env }
    );
    expect(change.exitCode).toBe(0);
    expect(parseJson(change).change.schema).toBe('team-flow');
  });

  it('writes the schema: key the config reader actually uses for --default', async () => {
    const result = await runCLI(
      ['schema', 'init', 'team-flow', '--artifacts', 'proposal', '--default', '--json'],
      { cwd: tempDir, env }
    );
    expect(result.exitCode).toBe(0);

    const config = fs.readFileSync(
      path.join(tempDir, 'openspec', 'config.yaml'),
      'utf-8'
    );
    expect(config).toContain('schema: team-flow');
    expect(config).not.toContain('defaultSchema');
  });

  it('scaffolds into a registered store with --store', async () => {
    const setup = await runCLI(
      ['store', 'setup', 'team-hub', '--path', path.join(tempDir, 'team-hub'), '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );
    expect(setup.exitCode).toBe(0);

    const result = await runCLI(
      ['schema', 'init', 'product-flow', '--artifacts', 'proposal,specs', '--store', 'team-hub', '--json'],
      { cwd: tempDir, env }
    );
    expect(result.exitCode).toBe(0);
    expect(parseJson(result).path).toBe(
      path.join(tempDir, 'team-hub', 'openspec', 'schemas', 'product-flow')
    );

    const schemas = await runCLI(['schemas', '--store', 'team-hub', '--json'], {
      cwd: tempDir,
      env,
    });
    const entry = parseJson(schemas).find((s: any) => s.name === 'product-flow');
    expect(entry).toMatchObject({ source: 'project' });
  });
});
