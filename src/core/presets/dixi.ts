import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

export type DixiStack = 'java-maven' | 'java-gradle' | 'next' | 'react' | 'node' | 'python';
export type DixiStackFamily = 'java' | 'react' | 'node' | 'python';

export function detectDixiStack(projectDir: string): DixiStack | null {
  if (fs.existsSync(path.join(projectDir, 'pom.xml'))) return 'java-maven';
  if (fs.existsSync(path.join(projectDir, 'build.gradle'))) return 'java-gradle';

  if (
    fs.existsSync(path.join(projectDir, 'next.config.js')) ||
    fs.existsSync(path.join(projectDir, 'next.config.ts')) ||
    fs.existsSync(path.join(projectDir, 'next.config.mjs'))
  ) return 'next';

  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      const deps = { ...(pkg.dependencies as Record<string, unknown> ?? {}), ...(pkg.devDependencies as Record<string, unknown> ?? {}) };
      if ('next' in deps) return 'next';
      if ('react' in deps) return 'react';
    } catch {
      // fallback to 'node' when package.json has invalid JSON
    }
    return 'node';
  }

  if (fs.existsSync(path.join(projectDir, 'pyproject.toml'))) return 'python';

  return null;
}

export function getDixiStackFamily(stack: DixiStack | null): DixiStackFamily | null {
  if (stack === null) return null;
  if (stack === 'java-maven' || stack === 'java-gradle') return 'java';
  if (stack === 'next') return 'react';
  return stack as DixiStackFamily;
}

export function getDixiStackLabel(stack: DixiStack | null): string {
  if (stack === null) return 'desconhecida';
  const labels: Record<DixiStack, string> = {
    'java-maven': 'Java/Maven',
    'java-gradle': 'Java/Gradle',
    'next': 'Next.js',
    'react': 'React',
    'node': 'Node.js',
    'python': 'Python',
  };
  return labels[stack];
}

/**
 * Copies all files from srcDir into <destRoot>/pastelsdd/context/, skipping files that already exist.
 * Creates the destination directory if needed.
 */
export function copyContextDocs(destRoot: string, srcDir: string): void {
  if (!fs.existsSync(srcDir)) return;

  const contextDir = path.join(destRoot, 'pastelsdd', 'context');
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }

  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const src = path.join(srcDir, file);
    const dest = path.join(contextDir, file);
    if (fs.existsSync(dest)) {
      console.log(`  ${file} já existe — pulado`);
      continue;
    }
    fs.copyFileSync(src, dest);
  }
}

export function installDixiClaudeMd(projectDir: string, family: DixiStackFamily | null): void {
  const currentFile = fileURLToPath(import.meta.url);
  const packageRoot = path.join(path.dirname(currentFile), '..', '..', '..');
  const claudeRuntimeDir = path.join(packageRoot, 'pscode', 'content', 'dixi', 'claude-runtime');

  let templateName: string;
  if (family === 'java') {
    templateName = 'CLAUDE.md.java.template';
  } else if (family === 'react') {
    templateName = 'CLAUDE.md.react.template';
  } else {
    templateName = 'CLAUDE.md.java.template';
    console.log(
      'Dixi: stack não detectada, instalando CLAUDE.md genérico (baseado em Java). ' +
      'Edite .pscode-dixi.yaml para corrigir.'
    );
  }

  const templatePath = path.join(claudeRuntimeDir, templateName);
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const claudeMdPath = path.join(projectDir, 'CLAUDE.md');
  const marker = '<!-- dixi-constitutional -->';

  if (fs.existsSync(claudeMdPath)) {
    const existing = fs.readFileSync(claudeMdPath, 'utf-8');
    if (existing.includes(marker)) {
      console.log('Dixi: CLAUDE.md já contém seção constitucional — pulando.');
      return;
    }
    fs.writeFileSync(claudeMdPath, existing + '\n' + templateContent, { encoding: 'utf-8' });
  } else {
    fs.writeFileSync(claudeMdPath, templateContent, { encoding: 'utf-8' });
  }
}

const PSTLD_COMMANDS_SRC = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..',
  'pscode', 'content', 'dixi', 'claude-runtime', 'commands'
);

const PSTLD_SKILLS_SRC = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..',
  'pscode', 'content', 'dixi', 'claude-runtime', 'skills'
);

export function installDixiExtras(projectDir: string, stack: DixiStack | null): void {
  const family = getDixiStackFamily(stack);

  // Resolve package content root: dist/core/presets/ → package root → pscode/content/dixi/context/
  const currentFile = fileURLToPath(import.meta.url);
  const packageRoot = path.join(path.dirname(currentFile), '..', '..', '..');
  const contentBase = path.join(packageRoot, 'pscode', 'content', 'dixi', 'context');

  // Task 4.5: Ensure pastelsdd/context/ exists in the client repo
  const contextDir = path.join(projectDir, 'pastelsdd', 'context');
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }

  // Task 4.2: Always copy shared/ docs
  copyContextDocs(projectDir, path.join(contentBase, 'shared'));

  if (family === null || family === 'node') {
    console.log(
      'Dixi: Stack não detectada — apenas docs compartilhados instalados. ' +
      'Configure `family` em `.pscode-dixi.yaml` para instalar docs específicos de stack.'
    );
  }

  // Task 4.3: Copy java/ only for Java projects
  if (family === 'java') {
    copyContextDocs(projectDir, path.join(contentBase, 'java'));
  }

  // Task 4.4: Copy react/ only for React projects
  if (family === 'react') {
    copyContextDocs(projectDir, path.join(contentBase, 'react'));
  }

  installDixiClaudeMd(projectDir, family);

  // Copy /pstld:* slash commands to .claude/commands/pstld/ (idempotent — overwrites)
  const pstldCommandsDir = path.join(projectDir, '.claude', 'commands', 'pstld');
  if (!fs.existsSync(pstldCommandsDir)) {
    fs.mkdirSync(pstldCommandsDir, { recursive: true });
  }
  if (fs.existsSync(PSTLD_COMMANDS_SRC)) {
    const files = fs.readdirSync(PSTLD_COMMANDS_SRC);
    for (const file of files) {
      fs.copyFileSync(
        path.join(PSTLD_COMMANDS_SRC, file),
        path.join(pstldCommandsDir, file)
      );
    }
  }

  // Copy pstld-* skills to .claude/skills/<name>/SKILL.md (idempotent — overwrites)
  if (fs.existsSync(PSTLD_SKILLS_SRC)) {
    const skillFiles = fs.readdirSync(PSTLD_SKILLS_SRC).filter(f => f.endsWith('.md'));
    for (const file of skillFiles) {
      const skillName = file.replace(/\.md$/, '');
      const skillDir = path.join(projectDir, '.claude', 'skills', skillName);
      if (!fs.existsSync(skillDir)) {
        fs.mkdirSync(skillDir, { recursive: true });
      }
      fs.copyFileSync(
        path.join(PSTLD_SKILLS_SRC, file),
        path.join(skillDir, 'SKILL.md')
      );
    }
  }
}
