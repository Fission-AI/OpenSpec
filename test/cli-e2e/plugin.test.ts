import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';

const tempRoots: string[] = [];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build a temp project containing an OpenSpec dir and a fixture plugin installed
 * under node_modules with a manifest and a stub executable.
 */
async function prepareProjectWithPlugin(): Promise<string> {
  const base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-plugin-e2e-'));
  tempRoots.push(base);
  const projectDir = path.join(base, 'project');
  await fs.mkdir(path.join(projectDir, 'openspec'), { recursive: true });
  await fs.writeFile(
    path.join(projectDir, 'openspec', 'config.yaml'),
    'schema: spec-driven\n\nopenlore:\n  version: "2.1.3"\n'
  );

  const pluginDir = path.join(projectDir, 'node_modules', 'demo-engine');
  await fs.mkdir(pluginDir, { recursive: true });
  await fs.writeFile(
    path.join(pluginDir, 'package.json'),
    JSON.stringify({
      name: 'demo-engine',
      version: '0.4.0',
      bin: 'cli.js',
      openspec: {
        manifestVersion: 1,
        id: 'demo-engine',
        namespace: 'demo',
        bin: 'cli.js',
        openspecCompat: '>=1.0.0',
        summary: 'A demo delegated engine',
        commands: [{ name: 'hello', summary: 'say hello' }],
        skills: [{ dir: 'demo-orient', source: 'skills/demo-orient' }],
      },
    })
  );
  await fs.mkdir(path.join(pluginDir, 'skills', 'demo-orient'), { recursive: true });
  await fs.writeFile(
    path.join(pluginDir, 'skills', 'demo-orient', 'SKILL.md'),
    '# demo-orient\nContributed by demo-engine.\n'
  );
  await fs.writeFile(
    path.join(pluginDir, 'cli.js'),
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      'console.log("demo-engine:" + args.join(" "));',
      'process.exit(args.includes("--fail") ? 7 : 0);',
      '',
    ].join('\n')
  );

  return projectDir;
}

// Isolate global config / user data away from the developer's real home.
function isolatedEnv(base: string): NodeJS.ProcessEnv {
  return {
    OPENSPEC_TELEMETRY: '0',
    XDG_CONFIG_HOME: path.join(base, '.config'),
    XDG_DATA_HOME: path.join(base, '.data'),
  };
}

afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('openspec plugin e2e', () => {
  let projectDir: string;
  let env: NodeJS.ProcessEnv;

  beforeAll(async () => {
    projectDir = await prepareProjectWithPlugin();
    env = isolatedEnv(path.dirname(projectDir));
  });

  it('lists an auto-detected plugin', async () => {
    const result = await runCLI(['plugin', 'list', '--json'], { cwd: projectDir, env });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    const demo = parsed.plugins.find((p: { id: string }) => p.id === 'demo-engine');
    expect(demo).toBeDefined();
    expect(demo.namespace).toBe('demo');
    expect(demo.status).toBe('enabled');
  });

  it('delegates a namespace command and passes args through', async () => {
    const result = await runCLI(['demo', 'hello', '--name', 'x'], { cwd: projectDir, env });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('demo-engine:hello --name x');
  });

  it('propagates the plugin exit code', async () => {
    const result = await runCLI(['demo', 'run', '--fail'], { cwd: projectDir, env });
    expect(result.exitCode).toBe(7);
  });

  it('enables a plugin while preserving unknown config keys', async () => {
    const result = await runCLI(['plugin', 'add', 'demo-engine'], { cwd: projectDir, env });
    expect(result.exitCode).toBe(0);
    const config = await fs.readFile(path.join(projectDir, 'openspec', 'config.yaml'), 'utf-8');
    expect(config).toContain('openlore:');
    expect(config).toContain('version: "2.1.3"');
    expect(config).toMatch(/plugins:\s*\n\s*enabled:\s*\n\s*-\s*demo-engine/);
  });

  it('search surfaces the OpenLore registry listing', async () => {
    const result = await runCLI(['plugin', 'search', 'lore', '--json'], { cwd: projectDir, env });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.plugins.some((p: { id: string }) => p.id === 'openlore')).toBe(true);
  });

  it('reports honestly when there is no config.yaml to record enablement', async () => {
    // Fresh project: openspec/ dir present but no config.yaml, plus the plugin.
    const base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-plugin-noconfig-'));
    tempRoots.push(base);
    const proj = path.join(base, 'project');
    await fs.mkdir(path.join(proj, 'openspec'), { recursive: true });
    const pluginDir = path.join(proj, 'node_modules', 'demo-engine');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      path.join(pluginDir, 'package.json'),
      JSON.stringify({
        name: 'demo-engine',
        version: '0.4.0',
        bin: 'cli.js',
        openspec: {
          manifestVersion: 1,
          id: 'demo-engine',
          namespace: 'demo',
          bin: 'cli.js',
          openspecCompat: '>=1.0.0',
        },
      })
    );
    await fs.writeFile(path.join(pluginDir, 'cli.js'), '#!/usr/bin/env node\n');

    const result = await runCLI(['plugin', 'add', 'demo-engine'], {
      cwd: proj,
      env: isolatedEnv(base),
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/No openspec\/config\.yaml found/);
    expect(await fileExists(path.join(proj, 'openspec', 'config.yaml'))).toBe(false);
  });

  it('init installs a plugin-contributed skill into the selected tool', async () => {
    const result = await runCLI(['init', '--tools', 'claude'], { cwd: projectDir, env });
    expect(result.exitCode).toBe(0);
    const skillPath = path.join(projectDir, '.claude', 'skills', 'demo-orient', 'SKILL.md');
    expect(await fs.readFile(skillPath, 'utf-8')).toContain('Contributed by demo-engine');
  });
});
