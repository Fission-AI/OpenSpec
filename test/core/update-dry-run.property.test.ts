import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { InitCommand } from '../../src/core/init.js';
import { UpdateCommand } from '../../src/core/update.js';
import { getGlobalConfigPath } from '../../src/core/global-config.js';
import {
  generateCopilotSetupSteps,
  persistCopilotCloudOptIn,
} from '../../src/core/github-copilot/cloud-agent.js';

/**
 * `update --dry-run` promises the plan is exactly what a real update changes
 * (#2088): OpenSpec Desktop shows it in place of a before/after comparison.
 * Each seed builds a random project - tools, profile and delivery changes,
 * renamed tool roots, legacy artifacts, Copilot cloud files, and hostile
 * states such as a directory where a file belongs - then compares the plan
 * with the real update's effect on disk, failures included.
 *
 * The seeds below include every state that once broke the contract. A new
 * failure found by widening the range belongs in REGRESSION_SEEDS.
 */
const REGRESSION_SEEDS = [1208, 1209, 1232, 1286, 1307, 2062, 2241, 2337];
const SEEDS = [...Array.from({ length: 40 }, (_, index) => index + 1), ...REGRESSION_SEEDS];

const WORKFLOWS = [
  'propose', 'explore', 'new', 'continue', 'apply', 'ff',
  'sync', 'archive', 'bulk-archive', 'verify', 'onboard', 'update',
];
const TOOLS = [
  'claude', 'cursor', 'codex', 'antigravity', 'agents', 'kimi', 'devin',
  'github-copilot', 'minimax-code', 'opencode', 'gemini', 'amp', 'zed',
];

function rng(seed: number) {
  let state = seed >>> 0 || 1;
  const rand = () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const chance = (p: number) => rand() < p;
  const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)];
  const subset = <T,>(items: T[], min = 1): T[] => {
    const out = items.filter(() => chance(0.5));
    while (out.length < min) {
      const item = pick(items);
      if (!out.includes(item)) out.push(item);
    }
    return out;
  };
  return { chance, pick, subset };
}

function filesUnder(root: string, dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(full);
    }
  };
  walk(path.join(root, dir));
  return out;
}

function snapshot(root: string): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) files.set(full, `link:${fs.readlinkSync(full)}`);
      else if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.set(full, fs.readFileSync(full, 'utf-8'));
    }
  };
  walk(root);
  return files;
}

describe('update --dry-run plans exactly what a real update changes', () => {
  let root: string;
  let outside: string[];
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-dry-run-property-'));
    outside = [];
    Object.assign(process.env, {
      HOME: path.join(root, 'home'),
      USERPROFILE: path.join(root, 'home'),
      XDG_CONFIG_HOME: path.join(root, 'xdg'),
      CODEX_HOME: path.join(root, 'codex-home'),
      // A dry run plans a non-interactive update.
      CI: '1',
    });
    for (const dir of ['home', 'xdg', 'codex-home']) {
      fs.mkdirSync(path.join(root, dir), { recursive: true });
    }
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = savedEnv;
    fs.rmSync(root, { recursive: true, force: true });
    for (const dir of outside) fs.rmSync(dir, { recursive: true, force: true });
  });

  it.each(SEEDS)('seed %i', async (seed) => {
    const { chance, pick, subset } = rng(seed);
    const exists = (relative: string) => fs.existsSync(path.join(root, relative));
    const writeConfig = (config: object | null) => {
      const configPath = getGlobalConfigPath();
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      if (config === null) fs.rmSync(configPath, { force: true });
      else fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    };
    const randomConfig = () =>
      pick<() => object | null>([
        () => null,
        () => ({}),
        () => ({ profile: 'core' }),
        () => ({ profile: 'core', delivery: pick(['both', 'skills', 'commands']) }),
        () => ({
          profile: 'custom',
          delivery: pick(['both', 'skills', 'commands']),
          workflows: subset(WORKFLOWS),
        }),
      ])();

    const legacyHeavy = chance(0.4);
    const pool = legacyHeavy
      ? ['kimi', 'devin', 'minimax-code', 'codex', 'antigravity', 'claude']
      : TOOLS;
    const tools = subset(pool, 1).slice(0, 3);
    const initConfig = randomConfig();
    writeConfig(initConfig ?? { profile: 'core' });
    const copilotCloud = tools.includes('github-copilot')
      ? pick([undefined, true, false])
      : undefined;
    try {
      await new InitCommand({
        tools: tools.join(','),
        force: true,
        interactive: false,
        copilotCloud,
      }).execute(root);
    } catch {
      // An init that fails is a project state like any other.
    }
    if (initConfig === null) writeConfig(null);

    const skillFiles = () =>
      filesUnder(root, '.').filter(
        (file) => file.endsWith('SKILL.md') && !file.includes(`${path.sep}home${path.sep}`)
      );
    const legacyBlock = '<!-- OPENSPEC:START -->\nx\n<!-- OPENSPEC:END -->\n';
    const mutations: Array<[string, () => void | Promise<void>]> = [
      ['hand-edit a skill', () => {
        const file = pick(skillFiles());
        if (file) fs.writeFileSync(file, 'hand-edited\n');
      }],
      ['stale generatedBy', () => {
        for (const file of filesUnder(root, '.').filter((f) => f.endsWith('SKILL.md'))) {
          if (chance(0.5)) {
            fs.writeFileSync(
              file,
              fs.readFileSync(file, 'utf-8').replace(/generatedBy: .*/u, 'generatedBy: "0.0.1"')
            );
          }
        }
      }],
      ['delete a skill dir', () => {
        const file = pick(skillFiles());
        if (file) fs.rmSync(path.dirname(file), { recursive: true, force: true });
      }],
      ['delete a command file', () => {
        const file = pick(
          filesUnder(root, '.').filter(
            (f) =>
              /[\\/](commands|prompts|workflows)[\\/]/u.test(f) &&
              !f.includes('codex-home') &&
              !f.includes('copilot-setup')
          )
        );
        if (file) fs.rmSync(file);
      }],
      ['.kimi-code -> .kimi', () => {
        if (exists('.kimi-code')) fs.renameSync(path.join(root, '.kimi-code'), path.join(root, '.kimi'));
      }],
      ['.devin -> .windsurf', () => {
        if (exists('.devin')) fs.renameSync(path.join(root, '.devin'), path.join(root, '.windsurf'));
      }],
      ['copy .agents/skills -> .codex/skills', () => {
        if (exists('.agents/skills')) {
          fs.cpSync(path.join(root, '.agents/skills'), path.join(root, '.codex/skills'), { recursive: true });
        }
      }],
      ['copy .agents -> .agent (antigravity legacy)', () => {
        if (exists('.agents/skills')) {
          fs.cpSync(path.join(root, '.agents/skills'), path.join(root, '.agent/skills'), { recursive: true });
        }
      }],
      ['legacy .agent/workflows command', () => {
        fs.mkdirSync(path.join(root, '.agent/workflows'), { recursive: true });
        fs.writeFileSync(path.join(root, '.agent/workflows/openspec-propose.md'), 'legacy Antigravity command');
      }],
      ['legacy cursor command', () => {
        fs.mkdirSync(path.join(root, '.cursor/commands'), { recursive: true });
        fs.writeFileSync(path.join(root, '.cursor/commands/openspec-proposal.md'), legacyBlock);
      }],
      ['legacy claude commands dir', () => {
        fs.mkdirSync(path.join(root, '.claude/commands/openspec'), { recursive: true });
        fs.writeFileSync(path.join(root, '.claude/commands/openspec/proposal.md'), legacyBlock);
        if (chance(0.5)) fs.writeFileSync(path.join(root, '.claude/commands/openspec/mine.md'), 'mine\n');
      }],
      ['CLAUDE.md marker block', () => {
        fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# P\n\n<!-- OPENSPEC:START -->\nold\n<!-- OPENSPEC:END -->\n');
      }],
      ['AGENTS.md marker block', () => {
        fs.writeFileSync(path.join(root, 'AGENTS.md'), '<!-- OPENSPEC:START -->\nold\n<!-- OPENSPEC:END -->\nkeep\n');
      }],
      ['openspec/AGENTS.md', () => {
        fs.mkdirSync(path.join(root, 'openspec'), { recursive: true });
        fs.writeFileSync(path.join(root, 'openspec/AGENTS.md'), 'legacy\n');
      }],
      ['codex global prompts', () => {
        const dir = path.join(process.env.CODEX_HOME!, 'prompts');
        fs.mkdirSync(dir, { recursive: true });
        for (const name of subset(['opsx-explore.md', 'opsx-apply.md', 'opsx-archive.md', 'openspec-proposal.md', 'opsx-propose.md'])) {
          fs.writeFileSync(path.join(dir, name), 'legacy prompt');
        }
        fs.writeFileSync(path.join(dir, 'personal.md'), 'user');
      }],
      ['legacy .codex/prompts', () => {
        fs.mkdirSync(path.join(root, '.codex/prompts'), { recursive: true });
        fs.writeFileSync(path.join(root, '.codex/prompts/openspec-propose.md'), 'legacy Codex prompt');
      }],
      ['copilot opt-out', () => persistCopilotCloudOptIn(root, false)],
      ['copilot opt-in', () => persistCopilotCloudOptIn(root, true)],
      ['legacy copilot setup steps', () => {
        const file = path.join(root, '.github/workflows/copilot-setup-steps.yml');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(
          file,
          generateCopilotSetupSteps().replace(/^# Generated by OpenSpec for GitHub Copilot coding agent support\.\n\n/u, '')
        );
      }],
      ['remove shared marker', () => {
        fs.rmSync(path.join(root, '.agents/skills/.openspec-target'), { force: true });
      }],
      ['symlinked skill dir', () => {
        const file = pick(skillFiles().filter((f) => f.includes(`${path.sep}.claude${path.sep}`)));
        if (!file) return;
        const dir = path.dirname(file);
        const real = path.join(root, 'elsewhere', path.basename(dir));
        fs.mkdirSync(real, { recursive: true });
        fs.writeFileSync(path.join(real, 'SKILL.md'), 'kept\n');
        fs.rmSync(dir, { recursive: true, force: true });
        fs.symlinkSync(real, dir, 'junction');
      }],
      ['skills dir linked outside the project', () => {
        const dir = path.join(root, '.claude/skills');
        if (!fs.existsSync(dir)) return;
        const target = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-dry-run-outside-'));
        outside.push(target);
        fs.cpSync(dir, target, { recursive: true });
        fs.rmSync(dir, { recursive: true, force: true });
        fs.symlinkSync(target, dir, 'junction');
      }],
      ['directory where a SKILL.md belongs', () => {
        const file = pick(skillFiles());
        if (!file) return;
        fs.rmSync(file);
        fs.mkdirSync(file);
        fs.writeFileSync(path.join(file, 'x'), 'x');
      }],
      ['unreadable global config', () => {
        const configPath = getGlobalConfigPath();
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, '{ not json');
      }],
      ['openspec dir missing', () => {
        if (chance(0.3)) fs.rmSync(path.join(root, 'openspec'), { recursive: true, force: true });
      }],
    ];
    const weight = (name: string) =>
      legacyHeavy && /kimi|devin|windsurf|codex|agent|legacy|prompts/u.test(name) ? 0.6 : 0.2;
    for (const [name, mutate] of mutations) {
      if (chance(weight(name))) await mutate();
    }
    if (chance(0.6)) writeConfig(randomConfig());
    const force = chance(0.5);

    const before = snapshot(root);
    let plan: Awaited<ReturnType<UpdateCommand['plan']>> | undefined;
    let planError: Error | undefined;
    try {
      plan = await new UpdateCommand({ force, dryRun: true }).plan(root);
    } catch (error) {
      planError = error as Error;
    }
    // A dry run writes nothing.
    expect(snapshot(root)).toEqual(before);

    let realError: Error | undefined;
    try {
      await new UpdateCommand({ force }).execute(root);
    } catch (error) {
      realError = error as Error;
    }
    const after = snapshot(root);

    const relative = (file: string) => path.relative(root, file).split(path.sep).join('/');
    const diff: string[] = [];
    for (const [file, content] of after) {
      if (!before.has(file)) diff.push(`add ${relative(file)}`);
      else if (before.get(file) !== content) diff.push(`update ${relative(file)}`);
    }
    for (const file of before.keys()) if (!after.has(file)) diff.push(`delete ${relative(file)}`);

    // A write through a symlinked directory changes the file at the link's
    // target; name the same physical file on both sides.
    const realRoot = fs.realpathSync(root);
    const canonical = (planPath: string) => {
      const absolute = path.join(root, planPath);
      let dir = path.dirname(absolute);
      try {
        dir = fs.realpathSync(dir);
      } catch {
        // The directory never came to exist.
      }
      return path.relative(realRoot, path.join(dir, path.basename(absolute))).split(path.sep).join('/');
    };
    const planned = (plan?.changes ?? []).map(
      (change) => `${change.action} ${change.action === 'delete' ? change.path : canonical(change.path)}`
    );
    expect(planned.sort()).toEqual(diff.sort());

    // A tool the real update fails on is one the plan reports, not throws.
    const failedTools = realError?.message.match(/^OpenSpec update failed for: (.*)$/u)?.[1];
    if (failedTools) {
      expect(planError).toBeUndefined();
      expect(new Set(plan!.failures.map((failure) => failure.tool)).size).toBe(
        failedTools.split(', ').length
      );
    } else {
      expect(planError?.message).toBe(realError?.message);
      expect(plan?.failures ?? []).toEqual([]);
    }
  }, 60_000);
});
