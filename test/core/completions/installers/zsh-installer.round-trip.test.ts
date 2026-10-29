import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ZshInstaller } from '../../../../src/core/completions/installers/zsh-installer.js';

/**
 * Installing and then uninstalling zsh completions must hand the user's .zshrc
 * back byte for byte, as bash does since #1872. Uninstall used to strip every
 * blank line at the top of the file, so a .zshrc that started with blank lines
 * lost them, even when the OpenSpec block was not at the top.
 */
describe('ZshInstaller .zshrc round trip', () => {
  let homeDir: string;
  let zshrcPath: string;
  let completionsDir: string;
  let installer: ZshInstaller;
  let savedZsh: string | undefined;

  beforeEach(async () => {
    homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-zshrc-round-trip-'));
    zshrcPath = path.join(homeDir, '.zshrc');
    completionsDir = path.join(homeDir, '.zsh', 'completions');
    installer = new ZshInstaller(homeDir);
    // Standard zsh only: Oh My Zsh does not use the .zshrc block.
    savedZsh = process.env.ZSH;
    delete process.env.ZSH;
  });

  afterEach(async () => {
    if (savedZsh === undefined) delete process.env.ZSH;
    else process.env.ZSH = savedZsh;
    await fs.rm(homeDir, { recursive: true, force: true });
  });

  /** Writes `original`, adds the OpenSpec block, removes it, and returns the file. */
  async function roundTrip(original: string): Promise<string> {
    await fs.writeFile(zshrcPath, original);
    expect(await installer.configureZshrc(completionsDir)).toBe(true);
    expect(await fs.readFile(zshrcPath, 'utf-8')).toContain('# OPENSPEC:START');
    expect(await installer.removeZshrcConfig()).toBe(true);
    return fs.readFile(zshrcPath, 'utf-8');
  }

  it.each([
    ['a file ending in a newline', 'export PATH="$HOME/bin:$PATH"\nalias ll="ls -la"\n'],
    ['a file with no final newline', 'export PATH="$HOME/bin:$PATH"\nalias ll="ls -la"'],
    ['an empty file', ''],
    ['a file ending in blank lines', 'alias ll="ls -la"\n\n\n'],
    ['a file starting with blank lines', '\n\nalias ll="ls -la"\n'],
    ['a file with CRLF line endings', 'export PATH="$HOME/bin:$PATH"\r\nalias ll="ls -la"\r\n'],
  ])('restores %s byte for byte', async (_label, original) => {
    expect(await roundTrip(original)).toBe(original);
  });

  it('keeps leading blank lines when the user moved the block further down', async () => {
    await fs.writeFile(
      zshrcPath,
      ['', 'export PATH="$HOME/bin:$PATH"', '# OPENSPEC:START', '# OpenSpec shell completions configuration', '# OPENSPEC:END', 'alias ll="ls -la"', ''].join('\n')
    );

    expect(await installer.removeZshrcConfig()).toBe(true);
    expect(await fs.readFile(zshrcPath, 'utf-8')).toBe('\nexport PATH="$HOME/bin:$PATH"\nalias ll="ls -la"\n');
  });

  it('keeps user content written directly after a top-of-file block', async () => {
    // The user deleted the separator line, so nothing blank follows the block.
    await fs.writeFile(
      zshrcPath,
      '# OPENSPEC:START\n# OpenSpec shell completions configuration\n# OPENSPEC:END\nalias ll="ls -la"\n\nexport EDITOR=vim\n'
    );

    expect(await installer.removeZshrcConfig()).toBe(true);
    expect(await fs.readFile(zshrcPath, 'utf-8')).toBe('alias ll="ls -la"\n\nexport EDITOR=vim\n');
  });
});
