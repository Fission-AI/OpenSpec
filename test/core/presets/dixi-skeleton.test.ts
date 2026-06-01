import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import path from 'path';
import os from 'os';
import {
  installDixiExtras,
  detectBasePackage,
  applyHexagonalSkeleton,
  generateArchitectureTest,
  applyFeatureSlicedSkeleton,
  installEslintArchitectureTemplate,
} from '../../../src/core/presets/dixi.js';

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'dixi-skeleton-test-'));
}

function writePom(dir: string, groupId: string, artifactId: string): void {
  fsSync.writeFileSync(
    path.join(dir, 'pom.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <groupId>${groupId}</groupId>
  <artifactId>${artifactId}</artifactId>
  <version>1.0.0</version>
</project>`
  );
}

// ── Task 4.1 — integração Java (Maven temporário) ────────────────────────────

describe('installDixiExtras — skeleton hexagonal (Java)', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
    writePom(projectDir, 'com.dixi', 'meu-servico');
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('4.1 — 10 diretórios com .gitkeep criados após installDixiExtras', () => {
    installDixiExtras(projectDir, 'java-maven');

    const base = path.join(projectDir, 'src', 'main', 'java', 'com', 'dixi', 'meuservico');
    const testBase = path.join(projectDir, 'src', 'test', 'java', 'com', 'dixi', 'meuservico');

    const expectedDirs = [
      path.join(base, 'domain', 'model'),
      path.join(base, 'domain', 'port', 'in'),
      path.join(base, 'domain', 'port', 'out'),
      path.join(base, 'application', 'usecase'),
      path.join(base, 'infrastructure', 'adapter', 'in', 'rest'),
      path.join(base, 'infrastructure', 'adapter', 'out', 'persistence'),
      path.join(base, 'infrastructure', 'config'),
      path.join(testBase, 'domain'),
      path.join(testBase, 'application'),
      path.join(testBase, 'infrastructure'),
    ];

    for (const dir of expectedDirs) {
      expect(fsSync.existsSync(path.join(dir, '.gitkeep')), `missing .gitkeep in ${dir}`).toBe(true);
    }
  });

  it('4.1 — ArchitectureTest.java criado com basePackage correto', () => {
    installDixiExtras(projectDir, 'java-maven');

    const archTestPath = path.join(
      projectDir, 'src', 'test', 'java', 'com', 'dixi', 'meuservico', 'ArchitectureTest.java'
    );
    expect(fsSync.existsSync(archTestPath)).toBe(true);

    const content = fsSync.readFileSync(archTestPath, 'utf-8');
    expect(content).toContain('package com.dixi.meuservico;');
    expect(content).toContain('"com.dixi.meuservico"');
    expect(content).toContain('com.dixi.meuservico.domain..');
    expect(content).toContain('com.dixi.meuservico.infrastructure..');
    expect(content).toContain('com.dixi.meuservico.application..');
    expect(content).toContain('com.dixi.meuservico.infrastructure.adapter.in..');
    expect(content).toContain('com.dixi.meuservico.infrastructure.adapter.out..');
  });
});

// ── Task 4.2 — integração React (Next.js temporário) ────────────────────────

describe('installDixiExtras — skeleton feature-sliced (React)', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('4.2 — shared/, entities/ com .gitkeep criados após installDixiExtras React', () => {
    installDixiExtras(projectDir, 'next');

    const src = path.join(projectDir, 'src');
    expect(fsSync.existsSync(path.join(src, 'shared', 'components', 'ui', '.gitkeep'))).toBe(true);
    expect(fsSync.existsSync(path.join(src, 'shared', 'hooks', '.gitkeep'))).toBe(true);
    expect(fsSync.existsSync(path.join(src, 'shared', 'services', '.gitkeep'))).toBe(true);
    expect(fsSync.existsSync(path.join(src, 'shared', 'types', '.gitkeep'))).toBe(true);
    expect(fsSync.existsSync(path.join(src, 'shared', 'utils', '.gitkeep'))).toBe(true);
    expect(fsSync.existsSync(path.join(src, 'entities', '.gitkeep'))).toBe(true);
  });

  it('4.2 — features/README.md criado (sem .gitkeep)', () => {
    installDixiExtras(projectDir, 'next');

    const featuresDir = path.join(projectDir, 'src', 'features');
    expect(fsSync.existsSync(path.join(featuresDir, 'README.md'))).toBe(true);
    expect(fsSync.existsSync(path.join(featuresDir, '.gitkeep'))).toBe(false);
  });

  it('4.2 — eslint-architecture.mjs criado na raiz', () => {
    installDixiExtras(projectDir, 'next');
    expect(fsSync.existsSync(path.join(projectDir, 'eslint-architecture.mjs'))).toBe(true);
  });

  it('4.2 — features/README.md contém seção de regras de importação', () => {
    installDixiExtras(projectDir, 'next');

    const readme = fsSync.readFileSync(
      path.join(projectDir, 'src', 'features', 'README.md'),
      'utf-8'
    );
    expect(readme).toContain('Features');
    expect(readme).toContain('Regras de importação');
    expect(readme).toContain('não importam umas das outras');
  });
});

// ── Task 4.3 — brownfield Java ───────────────────────────────────────────────

describe('installDixiExtras — brownfield Java', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
    writePom(projectDir, 'com.empresa', 'meu-app');
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('4.3 — arquivo existente em src/main/java/ não é modificado', async () => {
    const existingDir = path.join(projectDir, 'src', 'main', 'java', 'com', 'empresa', 'meuapp', 'domain', 'model');
    await fs.mkdir(existingDir, { recursive: true });
    await fs.writeFile(path.join(existingDir, 'Order.java'), '// existing class\n');

    installDixiExtras(projectDir, 'java-maven');

    const content = fsSync.readFileSync(path.join(existingDir, 'Order.java'), 'utf-8');
    expect(content).toBe('// existing class\n');
  });

  it('4.3 — ArchitectureTest.java existente não é sobrescrito', async () => {
    const testDir = path.join(projectDir, 'src', 'test', 'java', 'com', 'empresa', 'meuapp');
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(path.join(testDir, 'ArchitectureTest.java'), '// custom arch test\n');

    installDixiExtras(projectDir, 'java-maven');

    const content = fsSync.readFileSync(path.join(testDir, 'ArchitectureTest.java'), 'utf-8');
    expect(content).toBe('// custom arch test\n');
  });
});

// ── Task 4.4 — brownfield React ──────────────────────────────────────────────

describe('installDixiExtras — brownfield React', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('4.4 — src/shared/ existente é preservado', async () => {
    const sharedDir = path.join(projectDir, 'src', 'shared');
    await fs.mkdir(sharedDir, { recursive: true });
    await fs.writeFile(path.join(sharedDir, 'custom.ts'), '// my shared code\n');

    installDixiExtras(projectDir, 'react');

    const content = fsSync.readFileSync(path.join(sharedDir, 'custom.ts'), 'utf-8');
    expect(content).toBe('// my shared code\n');
  });

  it('4.4 — features/README.md existente não é sobrescrito', async () => {
    const featuresDir = path.join(projectDir, 'src', 'features');
    await fs.mkdir(featuresDir, { recursive: true });
    await fs.writeFile(path.join(featuresDir, 'README.md'), '# custom readme\n');

    installDixiExtras(projectDir, 'react');

    const content = fsSync.readFileSync(path.join(featuresDir, 'README.md'), 'utf-8');
    expect(content).toBe('# custom readme\n');
  });

  it('4.4 — eslint-architecture.mjs existente não é sobrescrito', async () => {
    await fs.writeFile(path.join(projectDir, 'eslint-architecture.mjs'), '// my custom rules\n');

    installDixiExtras(projectDir, 'react');

    const content = fsSync.readFileSync(path.join(projectDir, 'eslint-architecture.mjs'), 'utf-8');
    expect(content).toBe('// my custom rules\n');
  });
});

// ── Task 4.5 — detectBasePackage fallback ────────────────────────────────────

describe('detectBasePackage — fallback', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  it('4.5 — sem pom.xml retorna com.example.app e emite aviso', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    const result = detectBasePackage(projectDir);

    expect(result).toBe('com.example.app');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('pom.xml não encontrado')
    );
  });

  it('4.5 — pom.xml sem groupId/artifactId retorna com.example.app', async () => {
    await fs.writeFile(path.join(projectDir, 'pom.xml'), '<project></project>');
    vi.spyOn(console, 'log');

    const result = detectBasePackage(projectDir);
    expect(result).toBe('com.example.app');
  });

  it('4.5 — pom.xml com groupId e artifactId kebab retorna basePackage correto', () => {
    writePom(projectDir, 'com.dixi', 'meu-servico');
    const result = detectBasePackage(projectDir);
    expect(result).toBe('com.dixi.meuservico');
  });

  it('4.5 — artifactId sem hífens preservado integralmente', () => {
    writePom(projectDir, 'com.empresa', 'api');
    const result = detectBasePackage(projectDir);
    expect(result).toBe('com.empresa.api');
  });
});

// ── applyHexagonalSkeleton — unitário ────────────────────────────────────────

describe('applyHexagonalSkeleton — sumário created/skipped', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  it('projeto vazio retorna created=10, skipped=0', () => {
    const result = applyHexagonalSkeleton(projectDir, 'com.example.app');
    expect(result.created).toBe(10);
    expect(result.skipped).toBe(0);
  });

  it('re-execução retorna created=0, skipped=10', () => {
    applyHexagonalSkeleton(projectDir, 'com.example.app');
    const result = applyHexagonalSkeleton(projectDir, 'com.example.app');
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(10);
  });
});

// ── applyFeatureSlicedSkeleton — unitário ────────────────────────────────────

describe('applyFeatureSlicedSkeleton — sumário created/skipped', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  it('projeto vazio retorna created=7 (6 .gitkeep + 1 README.md)', () => {
    const result = applyFeatureSlicedSkeleton(projectDir);
    expect(result.created).toBe(7);
    expect(result.skipped).toBe(0);
  });

  it('re-execução retorna created=0, skipped=7', () => {
    applyFeatureSlicedSkeleton(projectDir);
    const result = applyFeatureSlicedSkeleton(projectDir);
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(7);
  });
});
