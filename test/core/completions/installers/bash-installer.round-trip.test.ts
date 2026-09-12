import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { BashInstaller } from '../../../../src/core/completions/installers/bash-installer.js';
import { runCLI } from '../../../helpers/run-cli.js';

/**
 * Installing and then uninstalling bash completions must hand the user's
 * .bashrc back byte for byte, as the zsh installer already does. Uninstall
 * used to keep the blank separator line install had added above the user's
 * content and drop the file's final newline, so the next `>>` append (nvm,
 * conda, rustup) was glued onto the user's last line.
 */
describe('BashInstaller .bashrc round trip', () => {
  let homeDir: string;
  let bashrcPath: string;
  let completionsDir: string;
  let installer: BashInstaller;

  beforeEach(async () => {
    homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-bashrc-round-trip-'));
    bashrcPath = path.join(homeDir, '.bashrc');
    completionsDir = path.join(homeDir, '.local', 'share', 'bash-completion', 'completions');
    installer = new BashInstaller(homeDir);
  });

  afterEach(async () => {
    await fs.rm(homeDir, { recursive: true, force: true });
  });

  /** Writes `original`, adds the OpenSpec block, removes it, and returns the file. */
  async function roundTrip(original: string): Promise<string> {
    await fs.writeFile(bashrcPath, original);
    expect(await installer.configureBashrc(completionsDir)).toBe(true);
    expect(await fs.readFile(bashrcPath, 'utf-8')).toContain('# OPENSPEC:START');
    expect(await installer.removeBashrcConfig()).toBe(true);
    return fs.readFile(bashrcPath, 'utf-8');
  }

  it.each([
    ['a file ending in a newline', 'export PATH="$HOME/bin:$PATH"\nalias ll="ls -la"\n'],
    ['a file with no final newline', 'export PATH="$HOME/bin:$PATH"\nalias ll="ls -la"'],
    ['a single line', 'alias ll="ls -la"\n'],
    ['an empty file', ''],
    ['a file ending in blank lines', 'alias ll="ls -la"\n\n\n'],
    ['a file starting with blank lines', '\n\nalias ll="ls -la"\n'],
    ['a file with CRLF line endings', 'export PATH="$HOME/bin:$PATH"\r\nalias ll="ls -la"\r\n'],
  ])('restores %s byte for byte', async (_label, original) => {
    expect(await roundTrip(original)).toBe(original);
  });

  it('keeps a later >> append on its own line', async () => {
    await roundTrip('alias ll="ls -la"\n');
    await fs.appendFile(bashrcPath, 'export NVM_DIR="$HOME/.nvm"\n');

    const lines = (await fs.readFile(bashrcPath, 'utf-8')).split('\n');
    expect(lines).toEqual(['alias ll="ls -la"', 'export NVM_DIR="$HOME/.nvm"', '']);
  });

  it('restores the file after installing twice', async () => {
    const original = 'alias ll="ls -la"\n';
    await fs.writeFile(bashrcPath, original);
    expect(await installer.configureBashrc(completionsDir)).toBe(true);
    expect(await installer.configureBashrc(completionsDir)).toBe(true);

    const installed = await fs.readFile(bashrcPath, 'utf-8');
    expect(installed.split('# OPENSPEC:START')).toHaveLength(2);

    expect(await installer.removeBashrcConfig()).toBe(true);
    expect(await fs.readFile(bashrcPath, 'utf-8')).toBe(original);
  });

  it('leaves an empty file when install created .bashrc', async () => {
    expect(await installer.configureBashrc(completionsDir)).toBe(true);
    expect(await installer.removeBashrcConfig()).toBe(true);
    expect(await fs.readFile(bashrcPath, 'utf-8')).toBe('');
  });

  it('leaves an empty file when .bashrc holds only the OpenSpec block', async () => {
    await fs.writeFile(bashrcPath, '# OPENSPEC:START\n# OpenSpec shell completions configuration\n# OPENSPEC:END\n');
    expect(await installer.removeBashrcConfig()).toBe(true);
    expect(await fs.readFile(bashrcPath, 'utf-8')).toBe('');
  });

  it('removes only the block when the user moved it into the middle of the file', async () => {
    await fs.writeFile(
      bashrcPath,
      [
        'export PATH="$HOME/bin:$PATH"',
        '# OPENSPEC:START',
        '# OpenSpec shell completions configuration',
        '# OPENSPEC:END',
        'alias ll="ls -la"',
        '',
      ].join('\n')
    );

    expect(await installer.removeBashrcConfig()).toBe(true);
    expect(await fs.readFile(bashrcPath, 'utf-8')).toBe('export PATH="$HOME/bin:$PATH"\nalias ll="ls -la"\n');
  });

  it('restores .bashrc through install() and uninstall()', async () => {
    const original = 'export PATH="$HOME/bin:$PATH"\nalias ll="ls -la"\n';
    await fs.writeFile(bashrcPath, original);

    expect((await installer.install('# openspec completion script\n')).success).toBe(true);
    expect((await installer.uninstall()).success).toBe(true);

    expect(await fs.readFile(bashrcPath, 'utf-8')).toBe(original);
  });
});

describe('openspec completion install/uninstall bash (end to end)', () => {
  let base: string;

  beforeEach(async () => {
    base = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-bashrc-cli-'));
  });

  afterEach(async () => {
    await fs.rm(base, { recursive: true, force: true });
  });

  it('leaves .bashrc byte-identical', async () => {
    const home = path.join(base, 'home');
    await fs.mkdir(home, { recursive: true });
    const env = {
      HOME: home,
      USERPROFILE: home,
      XDG_CONFIG_HOME: path.join(home, '.config'),
      XDG_DATA_HOME: path.join(home, '.local', 'share'),
      OPENSPEC_NO_ANIMATION: '1',
    };
    const rc = path.join(home, '.bashrc');
    const original = 'export PATH="$HOME/bin:$PATH"\nalias ll="ls -la"\n';
    await fs.writeFile(rc, original);

    const installed = await runCLI(['completion', 'install', 'bash'], { cwd: home, env, timeoutMs: 60_000 });
    expect(installed.exitCode).toBe(0);
    expect(await fs.readFile(rc, 'utf-8')).toContain('# OPENSPEC:START');

    const removed = await runCLI(['completion', 'uninstall', 'bash', '--yes'], { cwd: home, env, timeoutMs: 60_000 });
    expect(removed.exitCode).toBe(0);
    expect(await fs.readFile(rc, 'utf-8')).toBe(original);
  }, 120_000);
});
