import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { getCommandRegistryWithPlugins } from '../../../src/core/completions/command-registry.js';
import { clearPluginResolutionCache } from '../../../src/core/plugins/resolver.js';

function writePlugin(
  projectRoot: string,
  pkg: string,
  opts: { id: string; namespace: string; compat?: string; commands?: { name: string }[] }
): void {
  const dir = path.join(projectRoot, 'node_modules', pkg);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: pkg,
      version: '1.0.0',
      bin: 'cli.js',
      openspec: {
        manifestVersion: 1,
        id: opts.id,
        namespace: opts.namespace,
        bin: 'cli.js',
        openspecCompat: opts.compat ?? '>=1.0.0',
        commands: opts.commands ?? [],
      },
    })
  );
}

describe('completions with plugins', () => {
  let tempDir: string;
  let projectRoot: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-completion-'));
    projectRoot = path.join(tempDir, 'project');
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'config');
    process.env.XDG_DATA_HOME = path.join(tempDir, 'data');
    clearPluginResolutionCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    clearPluginResolutionCache();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('includes the static plugin command group', () => {
    const registry = getCommandRegistryWithPlugins(projectRoot);
    expect(registry.find((c) => c.name === 'plugin')).toBeDefined();
  });

  it('adds an active plugin namespace with its subcommands', () => {
    writePlugin(projectRoot, 'demo-engine', {
      id: 'demo-engine',
      namespace: 'demo',
      commands: [{ name: 'hello' }],
    });
    const registry = getCommandRegistryWithPlugins(projectRoot);
    const demo = registry.find((c) => c.name === 'demo');
    expect(demo).toBeDefined();
    expect(demo?.subcommands?.some((s) => s.name === 'hello')).toBe(true);
  });

  it('excludes incompatible plugin namespaces from completion', () => {
    writePlugin(projectRoot, 'future-engine', {
      id: 'future-engine',
      namespace: 'future',
      compat: '>=99.0.0',
    });
    const registry = getCommandRegistryWithPlugins(projectRoot);
    expect(registry.find((c) => c.name === 'future')).toBeUndefined();
  });
});
