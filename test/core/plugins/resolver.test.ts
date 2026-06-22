import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  resolvePlugins,
  activePlugins,
  clearPluginResolutionCache,
  getUserPluginsDir,
} from '../../../src/core/plugins/resolver.js';

interface PluginSpec {
  id: string;
  namespace: string;
  compat?: string;
  version?: string;
}

function writePackagePlugin(projectRoot: string, pkgName: string, spec: PluginSpec): void {
  const dir = path.join(projectRoot, 'node_modules', pkgName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: pkgName,
      version: spec.version ?? '1.0.0',
      bin: 'cli.js',
      openspec: {
        manifestVersion: 1,
        id: spec.id,
        namespace: spec.namespace,
        bin: 'cli.js',
        openspecCompat: spec.compat ?? '>=1.0.0',
      },
    })
  );
  fs.writeFileSync(path.join(dir, 'cli.js'), '#!/usr/bin/env node\n');
}

function writeProjectConfig(projectRoot: string, body: string): void {
  fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), body);
}

describe('plugins/resolver', () => {
  let tempDir: string;
  let projectRoot: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-plugins-'));
    projectRoot = path.join(tempDir, 'project');
    fs.mkdirSync(projectRoot, { recursive: true });
    originalEnv = { ...process.env };
    // Isolate global config and user plugins dir into the temp tree.
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'config');
    process.env.XDG_DATA_HOME = path.join(tempDir, 'data');
    clearPluginResolutionCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    clearPluginResolutionCache();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('auto-detects an installed plugin when autoDetect is on (default)', () => {
    writeProjectConfig(projectRoot, 'schema: spec-driven\n');
    writePackagePlugin(projectRoot, 'demo-engine', { id: 'demo-engine', namespace: 'demo' });

    const resolution = resolvePlugins(projectRoot);
    const demo = resolution.plugins.find((p) => p.id === 'demo-engine');
    expect(demo).toBeDefined();
    expect(demo?.enabled).toBe(true);
    expect(demo?.source).toBe('auto-detect');
    expect(demo?.compatible).toBe(true);
  });

  it('does not enable auto-detected plugins when autoDetect is off', () => {
    writeProjectConfig(projectRoot, 'schema: spec-driven\nplugins:\n  autoDetect: false\n');
    writePackagePlugin(projectRoot, 'demo-engine', { id: 'demo-engine', namespace: 'demo' });

    const resolution = resolvePlugins(projectRoot);
    const demo = resolution.plugins.find((p) => p.id === 'demo-engine');
    expect(demo?.enabled).toBe(false);
    expect(activePlugins(resolution).length).toBe(0);
  });

  it('marks a project-enabled plugin as project tier even with autoDetect off', () => {
    writeProjectConfig(
      projectRoot,
      'schema: spec-driven\nplugins:\n  autoDetect: false\n  enabled:\n    - demo-engine\n'
    );
    writePackagePlugin(projectRoot, 'demo-engine', { id: 'demo-engine', namespace: 'demo' });

    const resolution = resolvePlugins(projectRoot);
    const demo = resolution.plugins.find((p) => p.id === 'demo-engine');
    expect(demo?.source).toBe('project');
    expect(demo?.enabled).toBe(true);
  });

  it('gates incompatible plugins out of the active set', () => {
    writeProjectConfig(projectRoot, 'schema: spec-driven\n');
    writePackagePlugin(projectRoot, 'future-engine', {
      id: 'future-engine',
      namespace: 'future',
      compat: '>=99.0.0',
    });

    const resolution = resolvePlugins(projectRoot);
    const future = resolution.plugins.find((p) => p.id === 'future-engine');
    expect(future?.compatible).toBe(false);
    expect(activePlugins(resolution).find((p) => p.id === 'future-engine')).toBeUndefined();
  });

  it('records invalid manifests as errors without crashing', () => {
    writeProjectConfig(projectRoot, 'schema: spec-driven\n');
    const dir = path.join(projectRoot, 'node_modules', 'broken-engine');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'broken-engine', openspec: { manifestVersion: 1, id: 'broken' } })
    );

    const resolution = resolvePlugins(projectRoot);
    expect(resolution.errors.length).toBe(1);
    expect(resolution.errors[0].error).toMatch(/Invalid OpenSpec plugin manifest/);
  });

  it('detects namespace collisions and excludes them from the active set', () => {
    writeProjectConfig(projectRoot, 'schema: spec-driven\n');
    writePackagePlugin(projectRoot, 'engine-a', { id: 'engine-a', namespace: 'shared' });
    writePackagePlugin(projectRoot, 'engine-b', { id: 'engine-b', namespace: 'shared' });

    const resolution = resolvePlugins(projectRoot);
    expect(resolution.collisions.some((c) => c.kind === 'namespace' && c.value === 'shared')).toBe(true);
    expect(activePlugins(resolution).some((p) => p.namespace === 'shared')).toBe(false);
  });

  it('returns empty cleanly when node_modules is absent', () => {
    writeProjectConfig(projectRoot, 'schema: spec-driven\n');
    const resolution = resolvePlugins(projectRoot);
    expect(resolution.plugins).toEqual([]);
    expect(resolution.errors).toEqual([]);
  });

  it('resolves the user plugins dir under XDG_DATA_HOME', () => {
    expect(getUserPluginsDir()).toBe(path.join(tempDir, 'data', 'openspec', 'plugins'));
  });
});
