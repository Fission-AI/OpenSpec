import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';

describe('openspec hooks get', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-hooks-cli-'));
    await fs.mkdir(path.join(tempDir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  async function writeConfig(yaml: string) {
    await fs.writeFile(path.join(tempDir, 'openspec', 'config.yaml'), yaml, 'utf-8');
  }

  it('should output exists:false for unconfigured event', async () => {
    await writeConfig('schema: spec-driven\n');
    const result = await runCLI(['hooks', 'get', 'pre-propose', '--json'], { cwd: tempDir });
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json).toMatchObject({ event: 'pre-propose', instruction: null, run: null, exists: false });
  });

  it('should output exists:false when no config.yaml exists', async () => {
    const result = await runCLI(['hooks', 'get', 'pre-apply', '--json'], { cwd: tempDir });
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json).toMatchObject({ event: 'pre-apply', instruction: null, run: null, exists: false });
  });

  it('should output full hook data when event is configured', async () => {
    await writeConfig(
      'schema: spec-driven\nhooks:\n  post-archive:\n    instruction: "Review log"\n    run: ./scripts/notify-slack.sh\n'
    );
    const result = await runCLI(['hooks', 'get', 'post-archive', '--json'], { cwd: tempDir });
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json).toMatchObject({
      event: 'post-archive',
      instruction: 'Review log',
      run: './scripts/notify-slack.sh',
      exists: true,
    });
  });

  it('should exit with non-zero and error message for invalid event name', async () => {
    const result = await runCLI(['hooks', 'get', 'invalid-event', '--json'], { cwd: tempDir });
    expect(result.exitCode).not.toBe(0);
    const output = result.stdout + result.stderr;
    expect(output).toContain('Invalid hook event');
    expect(output).toContain('invalid-event');
    expect(output).toContain('pre-archive');
  });

  it('should output exists:false for null/empty hook entry', async () => {
    await writeConfig('schema: spec-driven\nhooks:\n  pre-archive:\n');
    const result = await runCLI(['hooks', 'get', 'pre-archive', '--json'], { cwd: tempDir });
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json).toMatchObject({ event: 'pre-archive', instruction: null, run: null, exists: false });
  });

  it('should use path.resolve for project root (cross-platform)', async () => {
    await writeConfig(
      'schema: spec-driven\nhooks:\n  pre-explore:\n    run: ./check.sh\n'
    );
    const result = await runCLI(['hooks', 'get', 'pre-explore', '--json'], { cwd: tempDir });
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json.run).toBe('./check.sh');
    expect(json.exists).toBe(true);
  });
});
