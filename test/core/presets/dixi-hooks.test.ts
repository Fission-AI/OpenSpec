import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { installDixiExtras } from '../../../src/core/presets/dixi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOKS_DIR = path.resolve(__dirname, '..', '..', '..', 'pscode', 'content', 'dixi', 'claude-runtime', 'hooks');
const ARCH_GUARD = path.join(HOOKS_DIR, 'arch-guard.mjs');
const JIRA_CONTEXT = path.join(HOOKS_DIR, 'jira-context.mjs');

function runHook(
  hookPath: string,
  input: Record<string, unknown>,
  cwd: string
): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync('node', [hookPath], {
    input: JSON.stringify(input),
    cwd,
    encoding: 'utf-8',
  });
  return {
    exitCode: result.status ?? 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'dixi-hooks-test-'));
}

// ── arch-guard: Java ─────────────────────────────────────────────────────────

describe('arch-guard — Java', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.pscode-dixi.yaml'), 'family: java\nstack: java-maven\n');
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('4.1 — import direto de domain/ em infrastructure/ → exit 2', () => {
    const result = runHook(ARCH_GUARD, {
      tool_name: 'Edit',
      tool_input: {
        file_path: 'src/main/java/com/example/infrastructure/adapters/OrderAdapter.java',
        old_string: '',
        new_string: 'import com.example.domain.model.Order;\nimport org.springframework.stereotype.Service;\n',
      },
    }, dir);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('Violação hexagonal');
  });

  it('4.2 — import apenas de domain/port/ em infrastructure/ → exit 0', () => {
    const result = runHook(ARCH_GUARD, {
      tool_name: 'Edit',
      tool_input: {
        file_path: 'src/main/java/com/example/infrastructure/adapters/OrderAdapter.java',
        old_string: '',
        new_string: 'import com.example.domain.port.SaveOrderPort;\nimport com.example.domain.port.in.CreateOrderPort;\n',
      },
    }, dir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('4.3 — arquivo fora de infrastructure/ → exit 0', () => {
    const result = runHook(ARCH_GUARD, {
      tool_name: 'Write',
      tool_input: {
        file_path: 'src/main/java/com/example/domain/model/Order.java',
        content: 'import com.example.domain.model.Customer;\n',
      },
    }, dir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });
});

// ── arch-guard: React ────────────────────────────────────────────────────────

describe('arch-guard — React', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.pscode-dixi.yaml'), 'family: react\nstack: next\n');
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('4.4 — arquivo em features/a/ importando de features/b/ → exit 2', () => {
    const result = runHook(ARCH_GUARD, {
      tool_name: 'Edit',
      tool_input: {
        file_path: 'src/features/a/components/Button.tsx',
        old_string: '',
        new_string: "import { foo } from '@/features/b/utils';\n",
      },
    }, dir);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('Violação feature-sliced');
  });

  it('4.5 — arquivo em features/a/ importando de shared/ → exit 0', () => {
    const result = runHook(ARCH_GUARD, {
      tool_name: 'Edit',
      tool_input: {
        file_path: 'src/features/a/components/Button.tsx',
        old_string: '',
        new_string: "import { Button } from '@/shared/components';\n",
      },
    }, dir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });
});

// ── arch-guard: sem .pscode-dixi.yaml ────────────────────────────────────────

describe('arch-guard — sem .pscode-dixi.yaml', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('4.6 — sem .pscode-dixi.yaml → exit 0, sem output', () => {
    const result = runHook(ARCH_GUARD, {
      tool_name: 'Edit',
      tool_input: {
        file_path: 'src/main/java/com/example/infrastructure/OrderAdapter.java',
        old_string: '',
        new_string: 'import com.example.domain.model.Order;\n',
      },
    }, dir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });
});

// ── jira-context ─────────────────────────────────────────────────────────────

describe('jira-context', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('5.1 — prompt sem ticket → exit 0, stdout vazio', () => {
    const result = runHook(JIRA_CONTEXT, {
      prompt: 'Preciso refatorar o serviço de pagamento',
    }, dir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('5.2 — prompt com ticket + jira.yaml ausente → exit 0, stdout vazio', () => {
    const result = runHook(JIRA_CONTEXT, {
      prompt: 'Trabalhando em PROJ-123, preciso corrigir o bug',
    }, dir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('5.3 — prompt com ticket + jira.yaml presente → stdout com contexto, exit 0', async () => {
    const jiraDir = path.join(dir, 'pastelsdd');
    await fs.mkdir(jiraDir, { recursive: true });
    await fs.writeFile(
      path.join(jiraDir, 'jira.yaml'),
      'project_key: PROJ\nboard_url: https://company.atlassian.net/jira/software/projects/PROJ/boards/1\n'
    );

    const result = runHook(JIRA_CONTEXT, {
      prompt: 'Trabalhando em PROJ-123, preciso corrigir o bug de autenticação',
    }, dir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Contexto JIRA');
    expect(result.stdout).toContain('PROJ-123');
    expect(result.stdout).toContain('PROJ');
    expect(result.stdout).toContain('https://company.atlassian.net');
  });
});

// ── installDixiExtras — hooks ─────────────────────────────────────────────────

describe('installDixiExtras — hooks', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeTempDir();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('6.1 — projeto vazio → .claude/hooks/ criado com ambos os hooks', () => {
    installDixiExtras(projectDir, 'java-maven');

    const hooksDir = path.join(projectDir, '.claude', 'hooks');
    expect(fsSync.existsSync(hooksDir)).toBe(true);
    expect(fsSync.existsSync(path.join(hooksDir, 'arch-guard.mjs'))).toBe(true);
    expect(fsSync.existsSync(path.join(hooksDir, 'jira-context.mjs'))).toBe(true);
  });

  it('6.1 — settings.json criado com entradas PreToolUse e UserPromptSubmit', () => {
    installDixiExtras(projectDir, 'java-maven');

    const settingsPath = path.join(projectDir, '.claude', 'settings.json');
    expect(fsSync.existsSync(settingsPath)).toBe(true);
    const settings = JSON.parse(fsSync.readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>;
    const hooks = settings.hooks as Record<string, unknown[]>;
    expect(Array.isArray(hooks['PreToolUse'])).toBe(true);
    expect(Array.isArray(hooks['UserPromptSubmit'])).toBe(true);

    const preToolUse = hooks['PreToolUse'] as Array<{ matcher: string; hooks: Array<{ command: string }> }>;
    const archGuardEntry = preToolUse.find(e => e.hooks?.some(h => h.command === 'node .claude/hooks/arch-guard.mjs'));
    expect(archGuardEntry).toBeDefined();
    expect(archGuardEntry?.matcher).toBe('Edit|Write');

    const userPrompt = hooks['UserPromptSubmit'] as Array<{ hooks: Array<{ command: string }> }>;
    const jiraEntry = userPrompt.find(e => e.hooks?.some(h => h.command === 'node .claude/hooks/jira-context.mjs'));
    expect(jiraEntry).toBeDefined();
  });

  it('6.2 — re-execução não duplica entradas em settings.json', () => {
    installDixiExtras(projectDir, 'java-maven');
    installDixiExtras(projectDir, 'java-maven');

    const settingsPath = path.join(projectDir, '.claude', 'settings.json');
    const settings = JSON.parse(fsSync.readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>;
    const hooks = settings.hooks as Record<string, unknown[]>;

    const preToolUse = hooks['PreToolUse'] as Array<{ hooks: Array<{ command: string }> }>;
    const archGuardCount = preToolUse.filter(e => e.hooks?.some(h => h.command === 'node .claude/hooks/arch-guard.mjs')).length;
    expect(archGuardCount).toBe(1);

    const userPrompt = hooks['UserPromptSubmit'] as Array<{ hooks: Array<{ command: string }> }>;
    const jiraCount = userPrompt.filter(e => e.hooks?.some(h => h.command === 'node .claude/hooks/jira-context.mjs')).length;
    expect(jiraCount).toBe(1);
  });

  it('6.3 — settings.json existente com hooks do usuário → entradas preservadas após merge', () => {
    const claudeDir = path.join(projectDir, '.claude');
    fsSync.mkdirSync(claudeDir, { recursive: true });
    const existingSettings = {
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ type: 'command', command: 'node .claude/hooks/my-guard.mjs' }] },
        ],
      },
    };
    fsSync.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify(existingSettings, null, 2));

    installDixiExtras(projectDir, 'java-maven');

    const settings = JSON.parse(fsSync.readFileSync(path.join(claudeDir, 'settings.json'), 'utf-8')) as Record<string, unknown>;
    const hooks = settings.hooks as Record<string, unknown[]>;
    const preToolUse = hooks['PreToolUse'] as Array<{ matcher: string; hooks: Array<{ command: string }> }>;

    // User's original hook preserved
    const userHook = preToolUse.find(e => e.hooks?.some(h => h.command === 'node .claude/hooks/my-guard.mjs'));
    expect(userHook).toBeDefined();

    // Dixi hook added
    const archGuardHook = preToolUse.find(e => e.hooks?.some(h => h.command === 'node .claude/hooks/arch-guard.mjs'));
    expect(archGuardHook).toBeDefined();

    // jira-context added
    const userPrompt = hooks['UserPromptSubmit'] as Array<{ hooks: Array<{ command: string }> }>;
    const jiraHook = userPrompt.find(e => e.hooks?.some(h => h.command === 'node .claude/hooks/jira-context.mjs'));
    expect(jiraHook).toBeDefined();
  });

  it('6.3 — settings.json com JSON inválido → novo arquivo criado com hooks Dixi', () => {
    const claudeDir = path.join(projectDir, '.claude');
    fsSync.mkdirSync(claudeDir, { recursive: true });
    fsSync.writeFileSync(path.join(claudeDir, 'settings.json'), 'not-valid-json{{{');

    const consoleSpy = vi.spyOn(console, 'log');
    installDixiExtras(projectDir, 'java-maven');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('settings.json inválido'));

    const settings = JSON.parse(fsSync.readFileSync(path.join(claudeDir, 'settings.json'), 'utf-8')) as Record<string, unknown>;
    const hooks = settings.hooks as Record<string, unknown[]>;
    expect(Array.isArray(hooks['PreToolUse'])).toBe(true);
    expect(Array.isArray(hooks['UserPromptSubmit'])).toBe(true);
  });

  it('6.1 — hooks existentes não são sobrescritos (brownfield-safe)', async () => {
    const hooksDir = path.join(projectDir, '.claude', 'hooks');
    await fs.mkdir(hooksDir, { recursive: true });
    await fs.writeFile(path.join(hooksDir, 'arch-guard.mjs'), '// customizado pelo time\n');

    installDixiExtras(projectDir, 'java-maven');

    const content = fsSync.readFileSync(path.join(hooksDir, 'arch-guard.mjs'), 'utf-8');
    expect(content).toBe('// customizado pelo time\n');
  });
});
