import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';

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
 * Copies files recursively from sourceDir to targetDir.
 * By default skips files that already exist (brownfield-safe).
 * Files whose basename appears in options.overwrite are always overwritten.
 */
export function copyKitFiles(
  sourceDir: string,
  targetDir: string,
  options: { overwrite?: string[] } = {}
): void {
  if (!fs.existsSync(sourceDir)) return;

  const overwriteSet = new Set(options.overwrite ?? []);

  function copyDir(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        if (fs.existsSync(destPath) && !overwriteSet.has(entry.name)) {
          console.log(`  ${entry.name} já existe — pulado`);
          continue;
        }
        const destDirPath = path.dirname(destPath);
        if (!fs.existsSync(destDirPath)) {
          fs.mkdirSync(destDirPath, { recursive: true });
        }
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyDir(sourceDir, targetDir);
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

const HOOKS_SRC = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..',
  'pscode', 'content', 'dixi', 'claude-runtime', 'hooks'
);

const DIXI_HOOK_ENTRIES: Array<{ event: string; matcher: string | null; command: string }> = [
  { event: 'PreToolUse', matcher: 'Edit|Write', command: 'node .claude/hooks/arch-guard.mjs' },
  { event: 'UserPromptSubmit', matcher: null, command: 'node .claude/hooks/jira-context.mjs' },
];

function mergeSettingsHooks(settingsPath: string): void {
  let settings: Record<string, unknown> = {};

  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>;
    } catch (e) {
      console.log(`Dixi: settings.json inválido — criando novo arquivo. (${e instanceof Error ? e.message : String(e)})`);
      settings = {};
    }
  }

  if (!settings.hooks || typeof settings.hooks !== 'object' || Array.isArray(settings.hooks)) {
    settings.hooks = {};
  }
  const hooks = settings.hooks as Record<string, unknown[]>;

  for (const { event, matcher, command } of DIXI_HOOK_ENTRIES) {
    if (!Array.isArray(hooks[event])) {
      hooks[event] = [];
    }
    const eventHooks = hooks[event] as Array<{ matcher?: string; hooks: Array<{ type: string; command: string }> }>;
    const alreadyExists = eventHooks.some(
      entry => Array.isArray(entry.hooks) && entry.hooks.some(h => h.command === command)
    );
    if (!alreadyExists) {
      const entry: { matcher?: string; hooks: Array<{ type: string; command: string }> } = {
        hooks: [{ type: 'command', command }],
      };
      if (matcher) entry.matcher = matcher;
      eventHooks.push(entry);
    }
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), { encoding: 'utf-8' });
}

const ARCHITECTURES_BASE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..',
  'pscode', 'content', 'dixi', 'architectures'
);

// Task 3.2
export function detectBasePackage(projectRoot: string): string {
  const pomPath = path.join(projectRoot, 'pom.xml');
  if (!fs.existsSync(pomPath)) {
    console.log('[dixi] detectBasePackage: pom.xml não encontrado — usando fallback com.example.app. Ajuste manualmente o basePackage no ArchitectureTest.java gerado.');
    return 'com.example.app';
  }

  const pomContent = fs.readFileSync(pomPath, 'utf-8');
  const groupIdMatch = pomContent.match(/<groupId>([^<]+)<\/groupId>/);
  const artifactIdMatch = pomContent.match(/<artifactId>([^<]+)<\/artifactId>/);

  if (!groupIdMatch || !artifactIdMatch) {
    console.log('[dixi] detectBasePackage: groupId ou artifactId não encontrado no pom.xml — usando fallback com.example.app.');
    return 'com.example.app';
  }

  const groupId = groupIdMatch[1].trim();
  const artifactId = artifactIdMatch[1].trim().replace(/-/g, '');
  return `${groupId}.${artifactId}`;
}

// Task 3.1
export function applyHexagonalSkeleton(projectRoot: string, basePackage: string): { created: number; skipped: number } {
  const skeletonPath = path.join(ARCHITECTURES_BASE, 'hexagonal-spring', 'skeleton.yaml');
  if (!fs.existsSync(skeletonPath)) return { created: 0, skipped: 0 };

  const skeletonData = parseYaml(fs.readFileSync(skeletonPath, 'utf-8')) as { dirs: string[] };
  const basePackageDir = basePackage.replace(/\./g, '/');

  let created = 0;
  let skipped = 0;

  for (const dir of skeletonData.dirs) {
    const resolvedDir = dir.replace('{basePackageDir}', basePackageDir);
    const dirPath = path.join(projectRoot, resolvedDir);
    const gitkeepPath = path.join(dirPath, '.gitkeep');

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '');
      created++;
    } else {
      skipped++;
    }
  }

  return { created, skipped };
}

// Task 3.3
export function generateArchitectureTest(projectRoot: string, basePackage: string): boolean {
  const templatePath = path.join(ARCHITECTURES_BASE, 'hexagonal-spring', 'ArchitectureTest.java.template');
  if (!fs.existsSync(templatePath)) return false;

  const basePackageDir = basePackage.replace(/\./g, '/');
  const destDir = path.join(projectRoot, 'src', 'test', 'java', basePackageDir);
  const destPath = path.join(destDir, 'ArchitectureTest.java');

  if (fs.existsSync(destPath)) {
    console.log('[dixi] ArchitectureTest.java: arquivo existente — ignorado');
    return false;
  }

  const template = fs.readFileSync(templatePath, 'utf-8');
  const content = template.replace(/\{basePackage\}/g, basePackage);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.writeFileSync(destPath, content, { encoding: 'utf-8' });
  return true;
}

// Task 3.4
export function applyFeatureSlicedSkeleton(projectRoot: string): { created: number; skipped: number } {
  const skeletonPath = path.join(ARCHITECTURES_BASE, 'feature-sliced-react', 'skeleton.yaml');
  if (!fs.existsSync(skeletonPath)) return { created: 0, skipped: 0 };

  const skeletonData = parseYaml(fs.readFileSync(skeletonPath, 'utf-8')) as { dirs: string[] };
  const readmeTemplatePath = path.join(ARCHITECTURES_BASE, 'feature-sliced-react', 'features', 'README.md.template');

  let created = 0;
  let skipped = 0;

  for (const dir of skeletonData.dirs) {
    const dirPath = path.join(projectRoot, dir);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    if (dir.endsWith('features')) {
      const readmePath = path.join(dirPath, 'README.md');
      if (!fs.existsSync(readmePath) && fs.existsSync(readmeTemplatePath)) {
        fs.copyFileSync(readmeTemplatePath, readmePath);
        created++;
      } else {
        skipped++;
      }
    } else {
      const gitkeepPath = path.join(dirPath, '.gitkeep');
      if (!fs.existsSync(gitkeepPath)) {
        fs.writeFileSync(gitkeepPath, '');
        created++;
      } else {
        skipped++;
      }
    }
  }

  return { created, skipped };
}

// Task 3.5
export function installEslintArchitectureTemplate(projectRoot: string): void {
  const templatePath = path.join(ARCHITECTURES_BASE, 'feature-sliced-react', 'eslint-architecture.mjs.template');
  if (!fs.existsSync(templatePath)) return;

  const destPath = path.join(projectRoot, 'eslint-architecture.mjs');
  if (!fs.existsSync(destPath)) {
    fs.copyFileSync(templatePath, destPath);
  }

  console.log(
    '\n[dixi] eslint-architecture.mjs instalado.\n' +
    '  Para ativar as regras arquiteturais, adicione ao seu eslint.config.js:\n\n' +
    '    import architectureRules from \'./eslint-architecture.mjs\';\n' +
    '    export default [...existingConfig, ...architectureRules];\n'
  );
}

export function installDixiExtras(projectDir: string, stack: DixiStack | null): void {
  const family = getDixiStackFamily(stack);

  // Resolve package content root: dist/core/presets/ → package root → pscode/content/dixi/
  const currentFile = fileURLToPath(import.meta.url);
  const packageRoot = path.join(path.dirname(currentFile), '..', '..', '..');
  const contentBase = path.join(packageRoot, 'pscode', 'content', 'dixi', 'context');
  const kitBase = path.join(packageRoot, 'pscode', 'content', 'dixi', 'kit');

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

  // Task 4.2: Copy shared SDLC kit (always) — PR template always overwritten
  copyKitFiles(path.join(kitBase, 'shared'), projectDir, {
    overwrite: ['pull_request_template.md'],
  });

  // Task 4.3: Copy java SDLC kit
  if (family === 'java') {
    copyKitFiles(path.join(kitBase, 'java'), projectDir);
    console.log(
      '\nDixi [Java kit instalado]:\n' +
      '  Adicione ao pom.xml:\n' +
      '    • plugin commitlint: npm install --save-dev @commitlint/cli @commitlint/config-conventional commitlint-plugin-jira-rules\n' +
      '    • plugin Jacoco: <groupId>org.jacoco</groupId><artifactId>jacoco-maven-plugin</artifactId>\n' +
      '    • plugin Husky (se gerenciado via frontend): npx husky install\n' +
      '  Atenção: o job archunit requer ArchitectureTest.java (gerado pelo pscode init skeleton).'
    );
  }

  // Task 4.4: Copy react SDLC kit
  if (family === 'react') {
    copyKitFiles(path.join(kitBase, 'react'), projectDir);
    console.log(
      '\nDixi [React kit instalado]:\n' +
      '  Execute:\n' +
      '    npm install --save-dev @commitlint/cli @commitlint/config-conventional commitlint-plugin-jira-rules husky lint-staged prettier eslint\n' +
      '    npx husky install\n' +
      '  Adicione ao package.json: "prepare": "husky install"'
    );
  }

  installDixiClaudeMd(projectDir, family);

  // Task 3.6 + 3.7: Apply architectural skeleton by stack
  if (family === 'java') {
    const basePackage = detectBasePackage(projectDir);
    const skeletonResult = applyHexagonalSkeleton(projectDir, basePackage);
    console.log(`[dixi] skeleton hexagonal: ${skeletonResult.created} diretórios criados, ${skeletonResult.skipped} ignorados`);
    const archTestCreated = generateArchitectureTest(projectDir, basePackage);
    console.log(`[dixi] ArchitectureTest.java: ${archTestCreated ? 'criado' : 'ignorado (já existe)'}`);
  } else if (family === 'react') {
    const skeletonResult = applyFeatureSlicedSkeleton(projectDir);
    console.log(`[dixi] skeleton feature-sliced: ${skeletonResult.created} arquivos criados, ${skeletonResult.skipped} ignorados`);
    installEslintArchitectureTemplate(projectDir);
  } else {
    console.log('[dixi] skeleton arquitetural: stack não reconhecida — skeleton não disponível para esta stack');
  }

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

  // Copy hooks to .claude/hooks/ (brownfield-safe: skip if file already exists)
  const hooksDestDir = path.join(projectDir, '.claude', 'hooks');
  if (!fs.existsSync(hooksDestDir)) {
    fs.mkdirSync(hooksDestDir, { recursive: true });
  }
  if (fs.existsSync(HOOKS_SRC)) {
    const hookFiles = fs.readdirSync(HOOKS_SRC).filter(f => f.endsWith('.mjs'));
    for (const file of hookFiles) {
      const dest = path.join(hooksDestDir, file);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(HOOKS_SRC, file), dest);
      }
    }
  }

  // Merge .claude/settings.json with hook registrations (never overwrite existing config)
  mergeSettingsHooks(path.join(projectDir, '.claude', 'settings.json'));
}
