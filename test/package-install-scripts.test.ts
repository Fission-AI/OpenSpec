import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import spawn from 'cross-spawn';
import { createFakeTool, envWithFakeTools } from './helpers/fake-tool.js';
import { isolatedGitEnv } from './helpers/store-git.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The published package must ship no npm lifecycle install scripts. Any of these
 * makes `npm install` warn about unapproved install scripts, which reads as a
 * packaging problem to users. The shell-completions tip that used to live in a
 * postinstall script now prints on the CLI's first run instead.
 */
describe('published package install scripts', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')
  ) as { scripts?: Record<string, string> };

  it.each(['preinstall', 'install', 'postinstall'])(
    'declares no "%s" script',
    (lifecycle) => {
      expect(packageJson.scripts?.[lifecycle]).toBeUndefined();
    }
  );
});

describe('npm source installation', () => {
  let tempDir: string;
  let sourceDir: string;
  let env: NodeJS.ProcessEnv;
  let pnpmLog: string;

  const compilerDir = path.dirname(createRequire(import.meta.url).resolve('typescript/package.json'));

  function run(command: string, args: string[], cwd = sourceDir) {
    return spawn.sync(command, args, { cwd, env, encoding: 'utf-8', timeout: 30_000 });
  }

  function succeed(command: string, args: string[], cwd = sourceDir) {
    const result = run(command, args, cwd);
    expect(result.status, `${result.error ?? ''}\n${result.stdout}\n${result.stderr}`).toBe(0);
    return result.stdout;
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-npm-source-'));
    sourceDir = path.join(tempDir, 'source with spaces');
    fs.mkdirSync(path.join(sourceDir, 'src'), { recursive: true });
    const pnpm = createFakeTool(tempDir, 'pnpm', { exitCode: 99 });
    pnpmLog = pnpm.logPath;
    const npmConfig = path.join(tempDir, 'npmrc');
    fs.writeFileSync(npmConfig, '');
    env = envWithFakeTools({
      ...process.env,
      ...isolatedGitEnv(tempDir),
      npm_config_cache: path.join(tempDir, 'npm-cache'),
      npm_config_userconfig: npmConfig,
      npm_config_offline: 'true',
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_ignore_scripts: 'false',
    }, [pnpm]);

    const { scripts } = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8'));
    // Exercise the real lifecycle hooks and compiler without registry access or
    // copying the full application into every fixture.
    fs.writeFileSync(path.join(sourceDir, 'package.json'), JSON.stringify({
      name: 'openspec-source-fixture',
      version: '1.0.0',
      type: 'module',
      files: ['dist'],
      scripts: { prepare: scripts.prepare, prepack: scripts.prepack, build: scripts.build },
      devDependencies: { typescript: pathToFileURL(compilerDir).href },
    }));
    fs.copyFileSync(path.join(repoRoot, 'build.js'), path.join(sourceDir, 'build.js'));
    fs.writeFileSync(path.join(sourceDir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { rootDir: 'src', outDir: 'dist', declaration: true, types: [] },
      include: ['src'],
    }));
    fs.writeFileSync(path.join(sourceDir, 'src', 'index.ts'), 'console.log("source install works");\n');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function installAndRun(spec: string) {
    const consumerDir = path.join(tempDir, 'consumer');
    fs.mkdirSync(consumerDir);
    fs.writeFileSync(path.join(consumerDir, 'package.json'), '{"private":true}');
    succeed('npm', ['install', '--omit=dev', spec], consumerDir);
    const installed = path.join(consumerDir, 'node_modules', 'openspec-source-fixture');
    expect(succeed(process.execPath, [path.join(installed, 'dist', 'index.js')], consumerDir).trim())
      .toBe('source install works');
    expect(fs.existsSync(path.join(installed, 'dist', 'index.d.ts'))).toBe(true);
    expect(fs.existsSync(path.join(installed, 'build.js'))).toBe(false);
    expect(fs.existsSync(path.join(consumerDir, 'node_modules', 'typescript'))).toBe(false);
    expect(fs.existsSync(pnpmLog)).toBe(false);
  }

  it('builds a Git dependency without pnpm, even when the consumer omits dev dependencies', () => {
    succeed('git', ['init']);
    succeed('git', ['add', '.']);
    succeed('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=', 'commit', '-m', 'fixture']);
    installAndRun(`git+${pathToFileURL(sourceDir).href}`);
  }, 60_000);

  it('packs freshly compiled artifacts without pnpm', () => {
    succeed('npm', ['install', '--ignore-scripts']);
    fs.mkdirSync(path.join(sourceDir, 'dist'));
    fs.writeFileSync(path.join(sourceDir, 'dist', 'stale.js'), 'stale');
    succeed('npm', ['pack']);
    expect(fs.existsSync(path.join(sourceDir, 'dist', 'stale.js'))).toBe(false);
    installAndRun(path.join(sourceDir, 'openspec-source-fixture-1.0.0.tgz'));
  }, 60_000);

  it.each([false, true])('refuses to pack without build dependencies (stale artifacts: %s)', (stale) => {
    if (stale) {
      fs.mkdirSync(path.join(sourceDir, 'dist'));
      fs.writeFileSync(path.join(sourceDir, 'dist', 'index.js'), 'stale');
    }
    const result = run('npm', ['pack', '--json']);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain('Build failed');
    expect(fs.readdirSync(sourceDir).some((name) => name.endsWith('.tgz'))).toBe(false);
  });

  it('refuses to pack when TypeScript compilation fails', () => {
    succeed('npm', ['install', '--ignore-scripts']);
    fs.writeFileSync(path.join(sourceDir, 'src', 'index.ts'), 'const invalid: string = 123;\n');
    const result = run('npm', ['pack', '--json']);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain('Build failed');
    expect(fs.readdirSync(sourceDir).some((name) => name.endsWith('.tgz'))).toBe(false);
  });
});
