import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import path from 'path';
import os from 'os';
import { installDixiExtras, copyKitFiles } from '../../../src/core/presets/dixi.js';

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'dixi-sdlc-kit-test-'));
}

// ── installDixiExtras — Java kit ──────────────────────────────────────────────

describe('installDixiExtras — Java kit', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('5.1 — projeto Java: .commitlintrc.yml gerado na raiz', () => {
    installDixiExtras(projectDir, 'java-maven');
    expect(fsSync.existsSync(path.join(projectDir, '.commitlintrc.yml'))).toBe(true);
  });

  it('5.1 — projeto Java: .editorconfig gerado com indent=4 para Java', () => {
    installDixiExtras(projectDir, 'java-maven');
    const editorconfig = fsSync.readFileSync(path.join(projectDir, '.editorconfig'), 'utf-8');
    expect(editorconfig).toContain('[*.java]');
    expect(editorconfig).toContain('indent_size = 4');
  });

  it('5.1 — projeto Java: .github/workflows/ci-java.yml gerado', () => {
    installDixiExtras(projectDir, 'java-maven');
    expect(
      fsSync.existsSync(path.join(projectDir, '.github', 'workflows', 'ci-java.yml'))
    ).toBe(true);
  });

  it('5.1 — projeto Java: .github/pull_request_template.md gerado', () => {
    installDixiExtras(projectDir, 'java-maven');
    expect(
      fsSync.existsSync(path.join(projectDir, '.github', 'pull_request_template.md'))
    ).toBe(true);
  });

  it('5.1 — projeto Java: ci-java.yml contém jobs build, test, archunit, coverage', () => {
    installDixiExtras(projectDir, 'java-maven');
    const ciContent = fsSync.readFileSync(
      path.join(projectDir, '.github', 'workflows', 'ci-java.yml'),
      'utf-8'
    );
    expect(ciContent).toContain('build:');
    expect(ciContent).toContain('test:');
    expect(ciContent).toContain('archunit:');
    expect(ciContent).toContain('coverage:');
  });

  it('5.1 — projeto Java: ci-java.yml tem trigger para main e develop', () => {
    installDixiExtras(projectDir, 'java-maven');
    const ciContent = fsSync.readFileSync(
      path.join(projectDir, '.github', 'workflows', 'ci-java.yml'),
      'utf-8'
    );
    expect(ciContent).toContain('main');
    expect(ciContent).toContain('develop');
  });

  it('5.1 — projeto Java: .husky/commit-msg gerado', () => {
    installDixiExtras(projectDir, 'java-maven');
    expect(fsSync.existsSync(path.join(projectDir, '.husky', 'commit-msg'))).toBe(true);
  });

  it('5.1 — projeto Java: ci-react.yml NÃO é instalado', () => {
    installDixiExtras(projectDir, 'java-maven');
    expect(
      fsSync.existsSync(path.join(projectDir, '.github', 'workflows', 'ci-react.yml'))
    ).toBe(false);
  });
});

// ── installDixiExtras — React kit ────────────────────────────────────────────

describe('installDixiExtras — React kit', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('5.2 — projeto React: .commitlintrc.yml gerado na raiz', () => {
    installDixiExtras(projectDir, 'react');
    expect(fsSync.existsSync(path.join(projectDir, '.commitlintrc.yml'))).toBe(true);
  });

  it('5.2 — projeto React: .editorconfig gerado com indent=2 para TS/TSX', () => {
    installDixiExtras(projectDir, 'react');
    const editorconfig = fsSync.readFileSync(path.join(projectDir, '.editorconfig'), 'utf-8');
    expect(editorconfig).toContain('[*.{ts,tsx,js,jsx}]');
    expect(editorconfig).toContain('indent_size = 2');
  });

  it('5.2 — projeto React: lint-staged.config.mjs gerado', () => {
    installDixiExtras(projectDir, 'react');
    expect(fsSync.existsSync(path.join(projectDir, 'lint-staged.config.mjs'))).toBe(true);
  });

  it('5.2 — projeto React: .github/workflows/ci-react.yml gerado', () => {
    installDixiExtras(projectDir, 'react');
    expect(
      fsSync.existsSync(path.join(projectDir, '.github', 'workflows', 'ci-react.yml'))
    ).toBe(true);
  });

  it('5.2 — projeto React: .github/pull_request_template.md gerado', () => {
    installDixiExtras(projectDir, 'react');
    expect(
      fsSync.existsSync(path.join(projectDir, '.github', 'pull_request_template.md'))
    ).toBe(true);
  });

  it('5.2 — projeto React: ci-react.yml contém jobs typecheck, lint, test, build, e2e', () => {
    installDixiExtras(projectDir, 'react');
    const ciContent = fsSync.readFileSync(
      path.join(projectDir, '.github', 'workflows', 'ci-react.yml'),
      'utf-8'
    );
    expect(ciContent).toContain('typecheck:');
    expect(ciContent).toContain('lint:');
    expect(ciContent).toContain('test:');
    expect(ciContent).toContain('build:');
    expect(ciContent).toContain('e2e:');
  });

  it('5.2 — projeto React: e2e job usa hashFiles condicional', () => {
    installDixiExtras(projectDir, 'react');
    const ciContent = fsSync.readFileSync(
      path.join(projectDir, '.github', 'workflows', 'ci-react.yml'),
      'utf-8'
    );
    expect(ciContent).toContain("hashFiles('playwright.config.ts')");
  });

  it('5.2 — projeto React: .husky/commit-msg e .husky/pre-commit gerados', () => {
    installDixiExtras(projectDir, 'react');
    expect(fsSync.existsSync(path.join(projectDir, '.husky', 'commit-msg'))).toBe(true);
    expect(fsSync.existsSync(path.join(projectDir, '.husky', 'pre-commit'))).toBe(true);
  });

  it('5.2 — projeto React: ci-java.yml NÃO é instalado', () => {
    installDixiExtras(projectDir, 'react');
    expect(
      fsSync.existsSync(path.join(projectDir, '.github', 'workflows', 'ci-java.yml'))
    ).toBe(false);
  });
});

// ── installDixiExtras — sem family ───────────────────────────────────────────

describe('installDixiExtras — sem family (stack null)', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('5.3 — stack null: .commitlintrc.yml instalado (shared)', () => {
    installDixiExtras(projectDir, null);
    expect(fsSync.existsSync(path.join(projectDir, '.commitlintrc.yml'))).toBe(true);
  });

  it('5.3 — stack null: pull_request_template.md instalado (shared)', () => {
    installDixiExtras(projectDir, null);
    expect(
      fsSync.existsSync(path.join(projectDir, '.github', 'pull_request_template.md'))
    ).toBe(true);
  });

  it('5.3 — stack null: ci-java.yml NÃO instalado', () => {
    installDixiExtras(projectDir, null);
    expect(
      fsSync.existsSync(path.join(projectDir, '.github', 'workflows', 'ci-java.yml'))
    ).toBe(false);
  });

  it('5.3 — stack null: ci-react.yml NÃO instalado', () => {
    installDixiExtras(projectDir, null);
    expect(
      fsSync.existsSync(path.join(projectDir, '.github', 'workflows', 'ci-react.yml'))
    ).toBe(false);
  });

  it('5.3 — stack null: nenhum erro lançado', () => {
    expect(() => installDixiExtras(projectDir, null)).not.toThrow();
  });
});

// ── copyKitFiles — brownfield-safety ────────────────────────────────────────

describe('copyKitFiles — brownfield-safety', () => {
  let sourceDir: string;
  let targetDir: string;

  beforeEach(async () => {
    sourceDir = await makeTempDir();
    targetDir = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(sourceDir, { recursive: true, force: true });
    await fs.rm(targetDir, { recursive: true, force: true });
  });

  it('5.4 — arquivo existente não é sobrescrito por padrão', async () => {
    await fs.writeFile(path.join(sourceDir, 'config.yml'), 'source content');
    await fs.writeFile(path.join(targetDir, 'config.yml'), 'existing content');

    copyKitFiles(sourceDir, targetDir);

    const content = fsSync.readFileSync(path.join(targetDir, 'config.yml'), 'utf-8');
    expect(content).toBe('existing content');
  });

  it('5.4 — arquivo na lista overwrite É sobrescrito mesmo existindo', async () => {
    await fs.writeFile(path.join(sourceDir, 'pull_request_template.md'), 'new template');
    await fs.writeFile(path.join(targetDir, 'pull_request_template.md'), 'old template');

    copyKitFiles(sourceDir, targetDir, { overwrite: ['pull_request_template.md'] });

    const content = fsSync.readFileSync(path.join(targetDir, 'pull_request_template.md'), 'utf-8');
    expect(content).toBe('new template');
  });

  it('5.4 — arquivo novo é copiado mesmo sem overwrite', async () => {
    await fs.writeFile(path.join(sourceDir, 'new-file.yml'), 'new content');

    copyKitFiles(sourceDir, targetDir);

    const content = fsSync.readFileSync(path.join(targetDir, 'new-file.yml'), 'utf-8');
    expect(content).toBe('new content');
  });

  it('5.4 — diretórios aninhados são criados e arquivos copiados', async () => {
    await fs.mkdir(path.join(sourceDir, '.github', 'workflows'), { recursive: true });
    await fs.writeFile(path.join(sourceDir, '.github', 'workflows', 'ci.yml'), 'ci content');

    copyKitFiles(sourceDir, targetDir);

    expect(
      fsSync.existsSync(path.join(targetDir, '.github', 'workflows', 'ci.yml'))
    ).toBe(true);
    const content = fsSync.readFileSync(
      path.join(targetDir, '.github', 'workflows', 'ci.yml'),
      'utf-8'
    );
    expect(content).toBe('ci content');
  });

  it('5.4 — sourceDir inexistente não lança erro', () => {
    expect(() =>
      copyKitFiles(path.join(sourceDir, 'nonexistent'), targetDir)
    ).not.toThrow();
  });
});

// ── installDixiExtras — brownfield-safety com kit ───────────────────────────

describe('installDixiExtras — brownfield-safety do kit', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('5.4 — .editorconfig existente não é sobrescrito', async () => {
    await fs.writeFile(path.join(projectDir, '.editorconfig'), '# custom editorconfig');

    installDixiExtras(projectDir, 'java-maven');

    const content = fsSync.readFileSync(path.join(projectDir, '.editorconfig'), 'utf-8');
    expect(content).toBe('# custom editorconfig');
  });

  it('5.4 — pull_request_template.md É sobrescrito mesmo existindo', async () => {
    await fs.mkdir(path.join(projectDir, '.github'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, '.github', 'pull_request_template.md'),
      '# old template'
    );

    installDixiExtras(projectDir, 'java-maven');

    const content = fsSync.readFileSync(
      path.join(projectDir, '.github', 'pull_request_template.md'),
      'utf-8'
    );
    expect(content).not.toBe('# old template');
  });

  it('5.4 — .commitlintrc.yml existente não é sobrescrito', async () => {
    await fs.writeFile(path.join(projectDir, '.commitlintrc.yml'), '# custom commitlint');

    installDixiExtras(projectDir, 'react');

    const content = fsSync.readFileSync(path.join(projectDir, '.commitlintrc.yml'), 'utf-8');
    expect(content).toBe('# custom commitlint');
  });
});
