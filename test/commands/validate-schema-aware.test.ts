import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { runCLI } from '../helpers/run-cli.js';

describe('schema-aware delta validation', () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-validate-aware-'))
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
    // A deliberately spec-less workflow: one freeform document, no specs/.
    const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'doc-only');
    fs.mkdirSync(path.join(schemaDir, 'templates'), { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      'name: doc-only\nversion: 1\nartifacts:\n  - id: document\n    generates: document.md\n    description: The document\n    template: document.md\n    requires: []\n'
    );
    fs.writeFileSync(path.join(schemaDir, 'templates', 'document.md'), '# Doc\n');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function makeChange(id: string, schema: string): string {
    const dir = path.join(tempDir, 'openspec', 'changes', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.openspec.yaml'), `schema: ${schema}\n`);
    fs.writeFileSync(
      path.join(dir, 'proposal.md'),
      '## Why\nBecause.\n\n## What Changes\n- **thing:** Something\n'
    );
    return dir;
  }

  it('does not demand deltas from a change whose schema is spec-less', async () => {
    const dir = makeChange('write-the-doc', 'doc-only');
    fs.writeFileSync(path.join(dir, 'document.md'), '# The document\n');

    const result = await runCLI(['validate', 'write-the-doc', '--type', 'change'], {
      cwd: tempDir,
      env,
    });
    expect(result.stdout + result.stderr).not.toContain('at least one delta');
    expect(result.exitCode).toBe(0);
  });

  it('still demands deltas when the schema defines a specs artifact', async () => {
    makeChange('needs-deltas', 'spec-driven');

    const result = await runCLI(['validate', 'needs-deltas', '--type', 'change'], {
      cwd: tempDir,
      env,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout + result.stderr).toContain('at least one delta');
  });

  it('falls back to demanding deltas when the schema cannot be resolved', async () => {
    makeChange('unknown-schema', 'no-such-schema');

    const result = await runCLI(['validate', 'unknown-schema', '--type', 'change'], {
      cwd: tempDir,
      env,
    });
    expect(result.exitCode).toBe(1);
  });
});
