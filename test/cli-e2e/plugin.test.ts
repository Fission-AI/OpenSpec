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

  it('update installs then cleans plugin skills even when core tools are current', async () => {
    // Fresh project, initialized WITHOUT the plugin so core tool assets are current.
    const base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-plugin-update-'));
    tempRoots.push(base);
    const proj = path.join(base, 'project');
    const configPath = path.join(proj, 'openspec', 'config.yaml');
    await fs.mkdir(path.join(proj, 'openspec'), { recursive: true });
    await fs.writeFile(configPath, 'schema: spec-driven\n');
    const upEnv = isolatedEnv(base);

    const init = await runCLI(['init', '--tools', 'claude'], { cwd: proj, env: upEnv });
    expect(init.exitCode, `init failed:\n${init.stdout}\n${init.stderr}`).toBe(0);
    const skillPath = path.join(proj, '.claude', 'skills', 'demo-orient', 'SKILL.md');
    expect(await fileExists(skillPath)).toBe(false); // no plugin yet

    // Add the plugin (with a contributed skill) AFTER core tools are current.
    const pluginDir = path.join(proj, 'node_modules', 'demo-engine');
    await fs.mkdir(path.join(pluginDir, 'skills', 'demo-orient'), { recursive: true });
    await fs.writeFile(
      path.join(pluginDir, 'skills', 'demo-orient', 'SKILL.md'),
      '# demo-orient\nContributed by demo-engine.\n'
    );
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
          skills: [{ dir: 'demo-orient', source: 'skills/demo-orient' }],
        },
      })
    );
    await fs.writeFile(path.join(pluginDir, 'cli.js'), '#!/usr/bin/env node\n');

    // Enable explicitly (project tier) so activation is deterministic and not
    // dependent on auto-detect resolution timing.
    await fs.writeFile(configPath, 'schema: spec-driven\nplugins:\n  enabled:\n    - demo-engine\n');

    // Detection sanity check, kept separate from the install assertion so a future
    // failure pinpoints whether resolution or installation broke.
    const list = await runCLI(['plugin', 'list', '--json'], { cwd: proj, env: upEnv });
    const listed = JSON.parse(list.stdout).plugins.find((p: { id: string }) => p.id === 'demo-engine');
    expect(listed, `plugin not detected. plugin list:\n${list.stdout}\n${list.stderr}`).toBeDefined();
    expect(listed.status).toBe('enabled');

    // update with core tools already current must still install the plugin skill.
    const up1 = await runCLI(['update'], { cwd: proj, env: upEnv });
    expect(up1.exitCode, `update failed:\n${up1.stdout}\n${up1.stderr}`).toBe(0);
    expect(
      await fileExists(skillPath),
      `update did not install demo-orient.\nstdout:\n${up1.stdout}\nstderr:\n${up1.stderr}`
    ).toBe(true);

    // Disable the plugin (autoDetect off, not enabled) and update — skill is cleaned up.
    await fs.writeFile(configPath, 'schema: spec-driven\nplugins:\n  autoDetect: false\n');
    const up2 = await runCLI(['update'], { cwd: proj, env: upEnv });
    expect(up2.exitCode, `second update failed:\n${up2.stdout}\n${up2.stderr}`).toBe(0);
    expect(
      await fileExists(skillPath),
      `update did not remove demo-orient.\nstdout:\n${up2.stdout}\nstderr:\n${up2.stderr}`
    ).toBe(false);
  });
});
