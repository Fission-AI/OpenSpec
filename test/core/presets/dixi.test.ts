import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import path from 'path';
import os from 'os';
import {
  detectDixiStack,
  getDixiStackFamily,
  getDixiStackLabel,
  copyContextDocs,
  installDixiExtras,
  installDixiClaudeMd,
} from '../../../src/core/presets/dixi.js';
import { InitCommand } from '../../../src/core/init.js';

// ── smoke test mocks ────────────────────────────────────────────────────────

const { confirmMock, showWelcomeScreenMock, searchableMultiSelectMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  showWelcomeScreenMock: vi.fn().mockResolvedValue(undefined),
  searchableMultiSelectMock: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({ confirm: confirmMock }));
vi.mock('../../../src/ui/welcome-screen.js', () => ({ showWelcomeScreen: showWelcomeScreenMock }));
vi.mock('../../../src/prompts/searchable-multi-select.js', () => ({
  searchableMultiSelect: searchableMultiSelectMock,
}));

// ── helpers ─────────────────────────────────────────────────────────────────

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'dixi-test-'));
}

async function writeFile(dir: string, name: string, content: string): Promise<void> {
  await fs.writeFile(path.join(dir, name), content, 'utf-8');
}

// ── detectDixiStack ──────────────────────────────────────────────────────────

describe('detectDixiStack', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('returns java-maven when pom.xml exists', async () => {
    await writeFile(dir, 'pom.xml', '<project/>');
    expect(detectDixiStack(dir)).toBe('java-maven');
  });

  it('returns java-gradle when only build.gradle exists', async () => {
    await writeFile(dir, 'build.gradle', '');
    expect(detectDixiStack(dir)).toBe('java-gradle');
  });

  it('returns next when next.config.js exists', async () => {
    await writeFile(dir, 'next.config.js', '');
    expect(detectDixiStack(dir)).toBe('next');
  });

  it('returns next when package.json has "next" in dependencies', async () => {
    await writeFile(dir, 'package.json', JSON.stringify({ dependencies: { next: '14.0.0' } }));
    expect(detectDixiStack(dir)).toBe('next');
  });

  it('returns react when package.json has "react" but not "next"', async () => {
    await writeFile(dir, 'package.json', JSON.stringify({ dependencies: { react: '18.0.0' } }));
    expect(detectDixiStack(dir)).toBe('react');
  });

  it('returns node when package.json exists without react/next', async () => {
    await writeFile(dir, 'package.json', JSON.stringify({ dependencies: { lodash: '4.0.0' } }));
    expect(detectDixiStack(dir)).toBe('node');
  });

  it('returns null for empty directory', () => {
    expect(detectDixiStack(dir)).toBeNull();
  });

  it('returns node when package.json has invalid JSON (must not throw)', async () => {
    await writeFile(dir, 'package.json', 'not-json{{{');
    expect(() => detectDixiStack(dir)).not.toThrow();
    expect(detectDixiStack(dir)).toBe('node');
  });
});

// ── getDixiStackFamily ───────────────────────────────────────────────────────

describe('getDixiStackFamily', () => {
  it('returns java for java-maven', () => {
    expect(getDixiStackFamily('java-maven')).toBe('java');
  });

  it('returns java for java-gradle', () => {
    expect(getDixiStackFamily('java-gradle')).toBe('java');
  });

  it('returns react for next', () => {
    expect(getDixiStackFamily('next')).toBe('react');
  });

  it('returns react for react', () => {
    expect(getDixiStackFamily('react')).toBe('react');
  });

  it('returns node for node', () => {
    expect(getDixiStackFamily('node')).toBe('node');
  });

  it('returns python for python', () => {
    expect(getDixiStackFamily('python')).toBe('python');
  });

  it('returns null for null', () => {
    expect(getDixiStackFamily(null)).toBeNull();
  });
});

// ── getDixiStackLabel ────────────────────────────────────────────────────────

describe('getDixiStackLabel', () => {
  it('returns Java/Maven for java-maven', () => {
    expect(getDixiStackLabel('java-maven')).toBe('Java/Maven');
  });

  it('returns Next.js for next', () => {
    expect(getDixiStackLabel('next')).toBe('Next.js');
  });

  it('returns desconhecida for null', () => {
    expect(getDixiStackLabel(null)).toBe('desconhecida');
  });
});

// ── copyContextDocs ──────────────────────────────────────────────────────────

describe('copyContextDocs', () => {
  let destDir: string;
  let srcDir: string;

  beforeEach(async () => {
    destDir = await makeTempDir();
    srcDir = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(destDir, { recursive: true, force: true });
    await fs.rm(srcDir, { recursive: true, force: true });
  });

  it('cria pastelsdd/context/ e copia arquivos do srcDir', async () => {
    await writeFile(srcDir, 'commits.md', '# Commits');
    await writeFile(srcDir, 'dod.md', '# DoD');

    copyContextDocs(destDir, srcDir);

    const contextDir = path.join(destDir, 'pastelsdd', 'context');
    expect(fsSync.existsSync(contextDir)).toBe(true);
    expect(fsSync.existsSync(path.join(contextDir, 'commits.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(contextDir, 'dod.md'))).toBe(true);
  });

  it('pula arquivo que já existe (brownfield-safe)', async () => {
    await writeFile(srcDir, 'commits.md', '# Novo conteúdo');
    const contextDir = path.join(destDir, 'pastelsdd', 'context');
    await fs.mkdir(contextDir, { recursive: true });
    await writeFile(contextDir, 'commits.md', '# Conteúdo original');

    copyContextDocs(destDir, srcDir);

    const content = await fs.readFile(path.join(contextDir, 'commits.md'), 'utf-8');
    expect(content).toBe('# Conteúdo original');
  });

  it('não lança erro quando srcDir não existe', () => {
    expect(() => copyContextDocs(destDir, path.join(destDir, 'inexistente'))).not.toThrow();
  });

  it('cria pastelsdd/context/ mesmo quando srcDir está vazio', async () => {
    copyContextDocs(destDir, srcDir);
    expect(fsSync.existsSync(path.join(destDir, 'pastelsdd', 'context'))).toBe(true);
  });
});

// ── installDixiExtras — context docs ─────────────────────────────────────────

describe('installDixiExtras — context docs', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('projeto Java recebe shared/ + java/ em pastelsdd/context/', () => {
    installDixiExtras(projectDir, 'java-maven');

    const contextDir = path.join(projectDir, 'pastelsdd', 'context');
    expect(fsSync.existsSync(contextDir)).toBe(true);
    // shared docs
    expect(fsSync.existsSync(path.join(contextDir, 'commits.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(contextDir, 'dod.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(contextDir, 'dev-flow.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(contextDir, 'pr-flow.md'))).toBe(true);
    // java docs
    expect(fsSync.existsSync(path.join(contextDir, 'architecture.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(contextDir, 'testing.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(contextDir, 'naming.md'))).toBe(true);
    // java architecture content (title contains "Hexagonal")
    const arch = fsSync.readFileSync(path.join(contextDir, 'architecture.md'), 'utf-8');
    expect(arch).toContain('Hexagonal');
  });

  it('projeto React recebe shared/ + react/ em pastelsdd/context/', () => {
    installDixiExtras(projectDir, 'next');

    const contextDir = path.join(projectDir, 'pastelsdd', 'context');
    // shared docs
    expect(fsSync.existsSync(path.join(contextDir, 'commits.md'))).toBe(true);
    // react docs
    expect(fsSync.existsSync(path.join(contextDir, 'architecture.md'))).toBe(true);
    // react architecture content (title contains "Feature-Sliced")
    const arch = fsSync.readFileSync(path.join(contextDir, 'architecture.md'), 'utf-8');
    expect(arch).toContain('Feature-Sliced');
  });

  it('projeto sem stack recebe apenas shared/ e exibe aviso', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    installDixiExtras(projectDir, null);

    const contextDir = path.join(projectDir, 'pastelsdd', 'context');
    expect(fsSync.existsSync(path.join(contextDir, 'commits.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(contextDir, 'architecture.md'))).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Stack não detectada'));
  });

  it('arquivo existente não é sobrescrito (brownfield-safe)', () => {
    const contextDir = path.join(projectDir, 'pastelsdd', 'context');
    fsSync.mkdirSync(contextDir, { recursive: true });
    fsSync.writeFileSync(path.join(contextDir, 'commits.md'), '# Customizado pelo time');

    installDixiExtras(projectDir, 'java-maven');

    const content = fsSync.readFileSync(path.join(contextDir, 'commits.md'), 'utf-8');
    expect(content).toBe('# Customizado pelo time');
  });
});

// ── installDixiClaudeMd ───────────────────────────────────────────────────────

describe('installDixiClaudeMd', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('cria CLAUDE.md com template Java quando family é java', () => {
    installDixiClaudeMd(projectDir, 'java');

    const claudeMd = path.join(projectDir, 'CLAUDE.md');
    expect(fsSync.existsSync(claudeMd)).toBe(true);
    const content = fsSync.readFileSync(claudeMd, 'utf-8');
    expect(content).toContain('<!-- dixi-constitutional -->');
    expect(content).toContain('Arquitetura Hexagonal');
    expect(content).toContain('pastelsdd/context/java/architecture.md');
  });

  it('cria CLAUDE.md com template React quando family é react', () => {
    installDixiClaudeMd(projectDir, 'react');

    const claudeMd = path.join(projectDir, 'CLAUDE.md');
    expect(fsSync.existsSync(claudeMd)).toBe(true);
    const content = fsSync.readFileSync(claudeMd, 'utf-8');
    expect(content).toContain('<!-- dixi-constitutional -->');
    expect(content).toContain('Feature-Sliced Design');
    expect(content).toContain('pastelsdd/context/react/architecture.md');
  });

  it('faz append em CLAUDE.md existente sem marcador', () => {
    const original = '# Meu projeto\n\nRegras customizadas do time.\n';
    fsSync.writeFileSync(path.join(projectDir, 'CLAUDE.md'), original);

    installDixiClaudeMd(projectDir, 'java');

    const content = fsSync.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('# Meu projeto');
    expect(content).toContain('Regras customizadas do time.');
    expect(content).toContain('<!-- dixi-constitutional -->');
    expect(content).toContain('Arquitetura Hexagonal');
  });

  it('é idempotente — pula quando marcador já está presente', () => {
    const original = '# Meu projeto\n\n<!-- dixi-constitutional -->\n# Regras já instaladas\n';
    fsSync.writeFileSync(path.join(projectDir, 'CLAUDE.md'), original);
    const consoleSpy = vi.spyOn(console, 'log');

    installDixiClaudeMd(projectDir, 'java');

    const content = fsSync.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toBe(original);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('já contém seção constitucional'));
  });

  it('usa template Java como fallback quando family é null e loga aviso', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    installDixiClaudeMd(projectDir, null);

    const content = fsSync.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('Arquitetura Hexagonal');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('stack não detectada'));
  });
});

// ── installDixiExtras — pstld slash commands ─────────────────────────────────

describe('installDixiExtras — pstld slash commands', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('cria .claude/commands/pstld/ após installDixiExtras', () => {
    installDixiExtras(projectDir, 'java-maven');
    expect(fsSync.existsSync(path.join(projectDir, '.claude', 'commands', 'pstld'))).toBe(true);
  });

  it('copia os 7 arquivos de comando para .claude/commands/pstld/', () => {
    installDixiExtras(projectDir, 'java-maven');

    const pstldDir = path.join(projectDir, '.claude', 'commands', 'pstld');
    expect(fsSync.existsSync(path.join(pstldDir, 'rfc.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(pstldDir, 'arch-check.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(pstldDir, 'adr.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(pstldDir, 'jira-sync.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(pstldDir, 'dod.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(pstldDir, 'jira-draft.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(pstldDir, 'jira-setup.md'))).toBe(true);
  });

  it('é idempotente — segunda chamada não corrompe nem duplica arquivos', () => {
    installDixiExtras(projectDir, 'java-maven');
    installDixiExtras(projectDir, 'java-maven');

    const pstldDir = path.join(projectDir, '.claude', 'commands', 'pstld');
    const files = fsSync.readdirSync(pstldDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    expect(mdFiles).toHaveLength(7);
    expect(fsSync.existsSync(path.join(pstldDir, 'rfc.md'))).toBe(true);
  });

  it('instala os comandos para stack === null (projeto sem stack detectada)', () => {
    installDixiExtras(projectDir, null);

    const pstldDir = path.join(projectDir, '.claude', 'commands', 'pstld');
    expect(fsSync.existsSync(pstldDir)).toBe(true);
    expect(fsSync.existsSync(path.join(pstldDir, 'rfc.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(pstldDir, 'arch-check.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(pstldDir, 'adr.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(pstldDir, 'jira-sync.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(pstldDir, 'dod.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(pstldDir, 'jira-draft.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(pstldDir, 'jira-setup.md'))).toBe(true);
  });
});

// ── smoke tests ──────────────────────────────────────────────────────────────

describe('InitCommand smoke tests (--profile dixi)', () => {
  let testDir: string;
  let configTempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    testDir = await makeTempDir();
    configTempDir = await makeTempDir();
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = configTempDir;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    confirmMock.mockReset().mockResolvedValue(true);
    showWelcomeScreenMock.mockClear();
    searchableMultiSelectMock.mockReset();
  });

  afterEach(async () => {
    process.env = originalEnv;
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(configTempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('generates .pscode-dixi.yaml for a project with pom.xml', async () => {
    await writeFile(testDir, 'pom.xml', '<project/>');
    const cmd = new InitCommand({ tools: 'claude', force: true, profile: 'dixi' });

    await cmd.execute(testDir);

    const dixiYaml = path.join(testDir, '.pscode-dixi.yaml');
    expect(fsSync.existsSync(dixiYaml)).toBe(true);
    const content = await fs.readFile(dixiYaml, 'utf-8');
    expect(content).toContain('java-maven');
    expect(content).toContain('java');
    expect(content).toContain('detectedAt');
  });

  it('generates .pscode-dixi.yaml for a project with next.config.js', async () => {
    await writeFile(testDir, 'next.config.js', '');
    const cmd = new InitCommand({ tools: 'claude', force: true, profile: 'dixi' });

    await cmd.execute(testDir);

    const dixiYaml = path.join(testDir, '.pscode-dixi.yaml');
    expect(fsSync.existsSync(dixiYaml)).toBe(true);
    const content = await fs.readFile(dixiYaml, 'utf-8');
    expect(content).toContain('next');
    expect(content).toContain('react');
    expect(content).toContain('detectedAt');
  });
});
