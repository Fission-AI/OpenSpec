/**
 * Migration Utilities
 *
 * One-time migration logic for existing projects when profile system is introduced.
 * Called by both init and update commands before profile resolution.
 */

import { AI_TOOLS, type AIToolOption } from './config.js';
import { getGlobalConfig, getGlobalConfigPath, isGlobalConfigUnreadable, saveGlobalConfig, type Delivery, type GlobalConfig, type Profile } from './global-config.js';
import { CommandAdapterRegistry } from './command-generation/index.js';
import {
  resolveCommandInvocation,
  resolveCommandSurfaceCapability,
  shouldGenerateCommandsForTool,
} from './command-surface.js';
import { WORKFLOW_TO_SKILL_DIR } from './profile-sync-drift.js';
import { COMMAND_IDS } from './shared/tool-detection.js';
import { ALL_WORKFLOWS } from './profiles.js';
import { getSkillReferenceTransformer, getTransformerForTool } from '../utils/command-references.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { isSharedSkillTargetActive } from './shared-skill-target.js';
import { DISK_VIEW, type FileView } from './file-view.js';
import { isLegacyCodexSkillEquivalentToCurrent } from './shared/skill-content-equivalence.js';
import path from 'path';
import * as fs from 'fs';
import { resolveToolSkillsDir, toolSupportsSkills } from './shared/skill-paths.js';

export interface LegacyToolRoot {
  /** Former tool root, e.g. '.kimi' */
  root: string;
  /**
   * Whether leaving this root requires the user's say-so. False when the old
   * product is gone and its directory is certainly dead. True when the old
   * location may still be the live one for somebody.
   */
  needsConsent: boolean;
  /** Migrations that need a freshly generated destination run afterward. */
  timing?: 'before-generation' | 'after-generation';
}

/**
 * Former tool roots whose OpenSpec-managed content belongs under the tool's
 * current skillsDir. User files are never touched.
 */
export const LEGACY_TOOL_ROOTS: Record<string, LegacyToolRoot[]> = {
  // Kimi CLI became Kimi Code and moved from .kimi to .kimi-code.
  kimi: [{ root: '.kimi', needsConsent: false }],
  // Windsurf was rebranded to Devin Desktop on 2026-06-02 and its config
  // directory moved to .devin/. Devin Desktop reads .windsurf/ only as a
  // fallback and Devin Local does not read it at all, so moving is the right
  // default — but a pre-rebrand Windsurf build reads ONLY .windsurf/, and
  // nothing on disk tells that user apart, so the move is offered, not taken.
  devin: [{ root: '.windsurf', needsConsent: true }],
  // Codex now reads the canonical shared .agents root. Generate the current
  // replacement first so a divergent legacy file is preserved, not overwritten.
  codex: [{ root: '.codex', needsConsent: false, timing: 'after-generation' }],
  // Antigravity v1.20.5 moved workspace skills and workflows to `.agents` and
  // reads the old `.agent` root only as a fallback, so leaving a copy there
  // just gives the agent two of everything. Same after-generation timing as
  // Codex: the replacement is written first, so a divergent legacy file is
  // reported and kept rather than overwritten.
  antigravity: [{ root: '.agent', needsConsent: false, timing: 'after-generation' }],
};

export interface LegacyToolMigration {
  toolId: string;
  /** Legacy tool root, e.g. '.windsurf' */
  from: string;
  /** Current tool root, e.g. '.devin' */
  to: string;
  /** Skill directories that moved, or would move */
  skillDirs: number;
  /** Command files that moved, or would move */
  commandFiles: number;
  /**
   * OpenSpec-managed files left under the legacy root because the copy there
   * differs materially from the one that survives, so it is reported rather
   * than dropped.
   */
  keptInPlace: number;
  /** Whether this move needs the user's consent first */
  needsConsent: boolean;
}

/** One file a legacy-root migration would move or drop. */
export interface LegacyMigrationFileOp {
  toolId: string;
  source: string;
  destination: string;
  disposition: 'move' | 'drop';
  /** Whether an interactive run asks before this move */
  needsConsent: boolean;
}

interface MigrationPlanSink {
  view: FileView;
  ops: LegacyMigrationFileOp[];
  toolId: string;
  needsConsent: boolean;
}

/**
 * Classifies one OpenSpec-managed file. `move` is the fast path (nothing at
 * the destination yet); `drop` means the destination already holds equivalent
 * generated content, so the legacy copy is redundant; `keep` means the two
 * differ materially and the legacy copy is not ours to discard.
 */
type FileDisposition = 'move' | 'drop' | 'keep' | 'skip';

function classifyManagedFile(
  source: string,
  destination: string,
  view: FileView = DISK_VIEW
): FileDisposition {
  if (isSamePath(source, destination)) return 'skip';
  if (!view.exists(destination)) return 'move';
  try {
    const sourceContent = fs.readFileSync(source, 'utf-8');
    const destinationContent = view.read(destination);
    const equivalentGeneratedSkills =
      path.basename(source) === 'SKILL.md' &&
      path.basename(destination) === 'SKILL.md' &&
      isLegacyCodexSkillEquivalentToCurrent(sourceContent, destinationContent);
    return sourceContent === destinationContent || equivalentGeneratedSkills
      ? 'drop'
      : 'keep';
  } catch {
    return 'keep';
  }
}

/**
 * Rewrites a generated command path from the tool's current root to a legacy
 * one, so `.devin/workflows/opsx-apply.md` locates its `.windsurf/` twin
 * without the migration hard-coding either layout.
 *
 * Returns undefined for adapters whose paths are absolute (global-scoped
 * command files) or do not start at the tool root — neither can be relocated
 * by swapping a leading segment.
 */
function legacyCommandPath(
  commandPath: string,
  currentRoot: string,
  legacyRoot: string
): string | undefined {
  if (path.isAbsolute(commandPath)) return undefined;
  const segments = commandPath.split(/[\\/]/);
  if (segments[0] !== currentRoot) return undefined;
  segments[0] = legacyRoot;
  return path.join(...segments);
}

/**
 * Reports the OpenSpec content sitting under each tool's legacy root, without
 * moving anything. Callers use this to ask before a move that needs consent.
 */
export function findLegacyToolMigrations(
  projectPath: string,
  timing: 'before-generation' | 'after-generation' = 'before-generation'
): LegacyToolMigration[] {
  return collectLegacyToolMigrations(projectPath, false, undefined, timing);
}

/**
 * Lists, file by file, what `migrateLegacyToolDirs` would move or drop, without
 * touching anything. Consent-gated roots are included: a non-interactive run
 * moves them without asking. `view` decides what already sits at each
 * destination, so a dry run can plan against files it has not written.
 */
export function planLegacyToolMigrations(
  projectPath: string,
  timing: 'before-generation' | 'after-generation',
  toolIds: string[] | undefined,
  view: FileView
): LegacyMigrationFileOp[] {
  const ops: LegacyMigrationFileOp[] = [];
  collectLegacyToolMigrations(projectPath, false, toolIds, timing, { view, ops });
  return ops;
}

/**
 * Moves OpenSpec-managed skill directories (openspec-*) and command files
 * (opsx-*) from a tool's legacy root to its current one. When the destination
 * already exists the legacy copy is removed instead. Legacy directories are
 * deleted only when left empty, so user files under the old location — a
 * hand-written Cascade workflow next to the generated ones — are preserved.
 *
 * @param projectPath - Project root
 * @param toolIds - Restrict the move to these tools; omit to move every tool
 *        whose legacy root needs no consent
 */
export function migrateLegacyToolDirs(
  projectPath: string,
  toolIds?: string[],
  timing: 'before-generation' | 'after-generation' = 'before-generation'
): LegacyToolMigration[] {
  return collectLegacyToolMigrations(projectPath, true, toolIds, timing);
}

function collectLegacyToolMigrations(
  projectPath: string,
  apply: boolean,
  toolIds?: string[],
  timing: 'before-generation' | 'after-generation' = 'before-generation',
  plan?: { view: FileView; ops: LegacyMigrationFileOp[] }
): LegacyToolMigration[] {
  const migrations: LegacyToolMigration[] = [];

  for (const tool of AI_TOOLS) {
    if (!tool.skillsDir) continue;
    if (toolIds && !toolIds.includes(tool.value)) continue;

    for (const legacy of LEGACY_TOOL_ROOTS[tool.value] ?? []) {
      const legacyTiming = legacy.timing ?? 'before-generation';
      if (legacyTiming !== timing) continue;
      if (legacy.root === tool.skillsDir) continue;
      // Without an explicit tool list, only moves that need no consent run.
      if (apply && !toolIds && legacy.needsConsent) continue;
      const legacyRootPath = path.join(projectPath, legacy.root);
      if (!fs.existsSync(legacyRootPath)) continue;
      try {
        FileSystemUtils.assertProjectArtifactPath(projectPath, legacyRootPath);
        FileSystemUtils.assertProjectArtifactPath(
          projectPath,
          path.join(projectPath, tool.skillsDir)
        );
      } catch {
        console.warn(
          `Skipping legacy ${legacy.root}/ migration because the directory resolves outside this project.`
        );
        continue;
      }

      const sink = plan
        ? { ...plan, toolId: tool.value, needsConsent: legacy.needsConsent }
        : undefined;
      const skills = migrateSkillDirs(
        projectPath,
        tool.skillsDir,
        legacy.root,
        apply,
        legacyTiming === 'after-generation',
        sink
      );
      const commands = migrateCommandFiles(
        projectPath,
        tool,
        legacy.root,
        apply,
        legacyTiming === 'after-generation',
        sink
      );

      if (apply) {
        removeDirIfEmpty(path.join(legacyRootPath, 'skills'));
        removeDirIfEmpty(path.join(legacyRootPath, 'workflows'));
        removeDirIfEmpty(legacyRootPath);
      }

      // Kept-only results are retained deliberately. When every legacy file
      // differs from its counterpart nothing is movable, and dropping the
      // record here would leave the user with two divergent copies and no
      // word of it.
      if (skills.moved > 0 || commands.moved > 0 || skills.kept > 0 || commands.kept > 0) {
        migrations.push({
          toolId: tool.value,
          from: legacy.root,
          to: tool.skillsDir,
          skillDirs: skills.moved,
          commandFiles: commands.moved,
          keptInPlace: skills.kept + commands.kept,
          needsConsent: legacy.needsConsent,
        });
      }
    }
  }

  return migrations;
}

function migrateSkillDirs(
  projectPath: string,
  currentRoot: string,
  legacyRoot: string,
  apply: boolean,
  requireDestination = false,
  sink?: MigrationPlanSink
): { moved: number; kept: number } {
  const view = sink?.view ?? DISK_VIEW;
  const legacySkillsDir = path.join(projectPath, legacyRoot, 'skills');
  if (!fs.existsSync(legacySkillsDir)) return { moved: 0, kept: 0 };
  const currentSkillsDir = path.join(projectPath, currentRoot, 'skills');
  let moved = 0;
  let kept = 0;

  for (const workflowId of ALL_WORKFLOWS) {
    const dirName = WORKFLOW_TO_SKILL_DIR[workflowId];
    const source = path.join(legacySkillsDir, dirName);
    const sourceSkill = path.join(source, 'SKILL.md');
    if (!fs.existsSync(sourceSkill)) continue;

    const destination = path.join(currentSkillsDir, dirName);
    const destinationSkill = path.join(destination, 'SKILL.md');
    if (requireDestination && !view.exists(destinationSkill)) continue;
    if (!areProjectArtifacts(projectPath, sourceSkill, destinationSkill)) {
      console.warn(
        `Skipping legacy ${legacyRoot}/skills/${dirName} migration because it resolves outside this project.`
      );
      continue;
    }
    const disposition = classifyManagedFile(sourceSkill, destinationSkill, view);
    if (disposition === 'skip') continue;
    if (disposition === 'keep') {
      kept++;
      continue;
    }
    if (!apply) {
      sink?.ops.push({
        toolId: sink.toolId,
        source: sourceSkill,
        destination: destinationSkill,
        disposition,
        needsConsent: sink.needsConsent,
      });
      // The real move carries the skill's reference files too; plan them the same way.
      if (sink) planSkillReferences(projectPath, source, destination, sink, view);
      moved++;
      continue;
    }

    try {
      // Move the generated file, never the directory around it. A skill
      // directory can also hold files the user wrote, and this destination is
      // one OpenSpec deletes on its own — commands-only delivery and a
      // deselected workflow both remove the whole skill directory. Carrying a
      // user's file across would be handing it to that later removal.
      if (disposition === 'drop') {
        fs.rmSync(sourceSkill, { force: true });
      } else {
        fs.mkdirSync(destination, { recursive: true });
        fs.renameSync(sourceSkill, destinationSkill);
      }
      kept += migrateSkillReferences(projectPath, source, destination);
      // Anything the user left beside it stays under the legacy root.
      removeDirIfEmpty(source);
      moved++;
    } catch {
      // Leave the legacy directory in place if it cannot be moved
    }
  }

  return { moved, kept };
}

/**
 * Generated skills ship `references/<name>.md` beside SKILL.md. Each one
 * follows the same rule as SKILL.md: dropped when the destination already
 * holds the same file, moved when it has none, and kept in place (and
 * counted) when the two differ, since an edited copy is not ours to discard.
 */
function migrateSkillReferences(projectPath: string, source: string, destination: string): number {
  const sourceRefs = path.join(source, 'references');
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(sourceRefs, { withFileTypes: true });
  } catch {
    return 0;
  }
  let kept = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const from = path.join(sourceRefs, entry.name);
    const to = path.join(destination, 'references', entry.name);
    if (!areProjectArtifacts(projectPath, from, to)) continue;
    const disposition = classifyManagedFile(from, to);
    try {
      if (disposition === 'drop') {
        fs.rmSync(from, { force: true });
      } else if (disposition === 'move') {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.renameSync(from, to);
      } else if (disposition === 'keep') {
        kept++;
      }
    } catch {
      kept++;
    }
  }
  removeDirIfEmpty(sourceRefs);
  return kept;
}

/** What `migrateSkillReferences` would do, recorded for a dry run instead of done. */
function planSkillReferences(
  projectPath: string,
  source: string,
  destination: string,
  sink: MigrationPlanSink,
  view: FileView
): void {
  const sourceRefs = path.join(source, 'references');
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(sourceRefs, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const from = path.join(sourceRefs, entry.name);
    const to = path.join(destination, 'references', entry.name);
    if (!areProjectArtifacts(projectPath, from, to)) continue;
    const disposition = classifyManagedFile(from, to, view);
    if (disposition !== 'move' && disposition !== 'drop') continue;
    sink.ops.push({ toolId: sink.toolId, source: from, destination: to, disposition, needsConsent: sink.needsConsent });
  }
}

function migrateCommandFiles(
  projectPath: string,
  tool: AIToolOption,
  legacyRoot: string,
  apply: boolean,
  requireDestination = false,
  sink?: MigrationPlanSink
): { moved: number; kept: number } {
  const view = sink?.view ?? DISK_VIEW;
  const adapter = CommandAdapterRegistry.get(tool.value);
  if (!adapter || !tool.skillsDir) return { moved: 0, kept: 0 };
  let moved = 0;
  let kept = 0;

  for (const commandId of COMMAND_IDS) {
    const currentPath = adapter.getFilePath(commandId);
    const legacyPath = legacyCommandPath(currentPath, tool.skillsDir, legacyRoot);
    if (!legacyPath) continue;

    const source = FileSystemUtils.resolveProjectArtifactPath(projectPath, legacyPath);
    if (!fs.existsSync(source)) continue;

    const destination = FileSystemUtils.resolveProjectArtifactPath(
      projectPath,
      currentPath.split(/[\\/]/).join(path.sep)
    );
    // An after-generation move runs once the tool has written its replacement.
    // No replacement means this command is not one OpenSpec installs now — a
    // skills-only delivery or a deselected workflow — so relocating the legacy
    // file would resurrect it under the current root.
    if (requireDestination && !view.exists(destination)) continue;
    if (!areProjectArtifacts(projectPath, source, destination)) {
      console.warn(
        `Skipping legacy ${legacyPath} migration because it resolves outside this project.`
      );
      continue;
    }
    const disposition = classifyManagedFile(source, destination, view);
    if (disposition === 'skip') continue;
    if (disposition === 'keep') {
      kept++;
      continue;
    }
    if (!apply) {
      sink?.ops.push({
        toolId: sink.toolId,
        source,
        destination,
        disposition,
        needsConsent: sink.needsConsent,
      });
      moved++;
      continue;
    }

    try {
      if (disposition === 'drop') {
        fs.rmSync(source, { force: true });
      } else {
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.renameSync(source, destination);
      }
      moved++;
    } catch {
      // Leave the legacy file in place if it cannot be moved
    }
  }

  return { moved, kept };
}

/**
 * Summarizes what a migration moved, e.g. "6 skills and 6 commands".
 */
export function describeLegacyMigration(migration: LegacyToolMigration): string {
  const parts: string[] = [];
  if (migration.skillDirs > 0) {
    parts.push(`${migration.skillDirs} skill${migration.skillDirs === 1 ? '' : 's'}`);
  }
  if (migration.commandFiles > 0) {
    parts.push(`${migration.commandFiles} command${migration.commandFiles === 1 ? '' : 's'}`);
  }
  return parts.join(' and ');
}

/**
 * Names OpenSpec-managed files the move deliberately left behind, so a user
 * who customized one knows there are now two copies to reconcile.
 */
export function keptInPlaceNotice(migration: LegacyToolMigration): string | undefined {
  if (migration.keptInPlace === 0) return undefined;
  const n = migration.keptInPlace;
  // Deliberately does not claim the difference came from an edit: an older
  // OpenSpec version's output differs too. Either way nothing was overwritten,
  // and the user is the one who decides which copy to keep.
  return (
    `Left ${n} file${n === 1 ? '' : 's'} in ${migration.from}/ that ` +
    `differ${n === 1 ? 's' : ''} from the copy in ${migration.to}/. Nothing was ` +
    `overwritten — compare the two and delete the ${migration.from}/ copy once ` +
    `you have kept anything you customized.`
  );
}

/**
 * Whether a migration has anything to move, as opposed to only files left in
 * place. Callers use this to avoid offering a move of nothing.
 */
export function hasMovableContent(migration: LegacyToolMigration): boolean {
  return migration.skillDirs > 0 || migration.commandFiles > 0;
}

/**
 * Explains why a consent-gated move is being offered, in the user's terms.
 * Keyed by tool so the reason is specific rather than a generic "files moved".
 */
export function legacyMigrationNotice(migration: LegacyToolMigration): string {
  if (migration.toolId === 'devin') {
    return (
      `Windsurf is now Devin Desktop, and its config directory moved from ` +
      `${migration.from}/ to ${migration.to}/. Devin Desktop reads ${migration.from}/ ` +
      `only as a fallback, and Devin Local does not read it at all.`
    );
  }
  return `${migration.from}/ is the former location for this tool; ${migration.to}/ is current.`;
}

/**
 * Whether two paths are the same file on disk once symlinks are resolved.
 *
 * Symlinking one tool root at the other is a realistic way to straddle a
 * rebrand (`ln -s .devin .windsurf` to keep an older build working). Without
 * this check the "destination already exists, drop the legacy copy" branch
 * deletes the destination itself, taking the only copy with it.
 */
function isSamePath(a: string, b: string): boolean {
  try {
    return fs.realpathSync(a) === fs.realpathSync(b);
  } catch {
    return false;
  }
}

function areProjectArtifacts(projectPath: string, ...artifactPaths: string[]): boolean {
  try {
    for (const artifactPath of artifactPaths) {
      FileSystemUtils.assertProjectArtifactPath(projectPath, artifactPath);
    }
    return true;
  } catch {
    return false;
  }
}

function removeDirIfEmpty(dirPath: string): void {
  try {
    if (fs.readdirSync(dirPath).length === 0) {
      fs.rmdirSync(dirPath);
    }
  } catch {
    // Missing or non-empty directory — nothing to do
  }
}

interface InstalledWorkflowArtifacts {
  workflows: string[];
  hasSkills: boolean;
  hasCommands: boolean;
}

function scanInstalledWorkflowArtifacts(
  projectPath: string,
  tools: AIToolOption[],
  includeLegacyRoots = false,
  view: FileView = DISK_VIEW
): InstalledWorkflowArtifacts {
  const installed = new Set<string>();
  let hasSkills = false;
  let hasCommands = false;

  for (const tool of tools) {
    if (!toolSupportsSkills(tool)) continue;

    const skillsDirs: string[] = [];
    if (tool.globalSkillsDir) {
      skillsDirs.push(resolveToolSkillsDir(projectPath, tool));
    } else if (isSharedSkillTargetActive(projectPath, tool.value, view)) {
      skillsDirs.push(resolveToolSkillsDir(projectPath, tool));
      if (includeLegacyRoots) {
        skillsDirs.push(
          ...(tool.legacySkillsDirs ?? []).map((root) =>
            path.join(projectPath, root, 'skills')
          )
        );
      }
    }

    for (const skillsDir of skillsDirs) {
      for (const workflowId of ALL_WORKFLOWS) {
        const skillDirName = WORKFLOW_TO_SKILL_DIR[workflowId];
        const skillFile = path.join(skillsDir, skillDirName, 'SKILL.md');
        if (view.exists(skillFile)) {
          installed.add(workflowId);
          hasSkills = true;
        }
      }
    }

    const adapter = CommandAdapterRegistry.get(tool.value);
    if (!adapter) continue;

    // A root the tool has moved away from still holds the command files the
    // user installed there. Reading only the current root would report a
    // commands install as skills-only, and delivery inferred from that answer
    // deletes those commands on the next update.
    const legacyRoots = includeLegacyRoots
      ? (LEGACY_TOOL_ROOTS[tool.value] ?? []).map((legacy) => legacy.root)
      : [];

    for (const workflowId of ALL_WORKFLOWS) {
      const commandPath = adapter.getFilePath(workflowId);
      const candidates = [commandPath];
      if (tool.skillsDir) {
        for (const root of legacyRoots) {
          const legacyPath = legacyCommandPath(commandPath, tool.skillsDir, root);
          if (legacyPath) candidates.push(legacyPath);
        }
      }
      for (const candidate of candidates) {
        const fullPath = path.isAbsolute(candidate)
          ? candidate
          : path.join(projectPath, candidate);
        if (view.exists(fullPath)) {
          installed.add(workflowId);
          hasCommands = true;
          break;
        }
      }
    }
  }

  return {
    workflows: ALL_WORKFLOWS.filter((workflowId) => installed.has(workflowId)),
    hasSkills,
    hasCommands,
  };
}

/**
 * Scans installed workflow files across all detected tools and returns
 * the union of installed workflow IDs.
 */
export function scanInstalledWorkflows(
  projectPath: string,
  tools: AIToolOption[],
  view: FileView = DISK_VIEW
): string[] {
  return scanInstalledWorkflowArtifacts(projectPath, tools, false, view).workflows;
}

function inferDelivery(artifacts: InstalledWorkflowArtifacts): Delivery {
  if (artifacts.hasSkills && artifacts.hasCommands) {
    return 'both';
  }
  if (artifacts.hasCommands) {
    return 'commands';
  }
  return 'skills';
}

/**
 * Performs one-time migration if the global config does not yet have a profile field.
 * Called by both init and update before profile resolution.
 *
 * - If no profile field exists and workflows are installed: sets profile to 'custom'
 *   with the detected workflows, preserving the user's existing setup.
 * - If no profile field exists and no workflows are installed: no-op (defaults apply).
 * - If profile field already exists: no-op.
 */
export function computeProfileMigration(
  projectPath: string,
  tools: AIToolOption[],
  view: FileView = DISK_VIEW
): ProfileMigration | null {
  // A config that cannot be parsed, or is not a JSON object, is never saved
  // over; skip migration rather than fail init or update on it.
  if (isGlobalConfigUnreadable()) {
    return null;
  }

  // Check raw config file for profile field presence
  const configPath = getGlobalConfigPath();

  let rawConfig: Record<string, unknown> = {};
  try {
    if (fs.existsSync(configPath)) {
      rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {
    return null; // Can't read config, skip migration
  }

  // If profile is already explicitly set, no migration needed
  if (rawConfig.profile !== undefined) {
    return null;
  }

  // Scan for installed workflows
  const artifacts = scanInstalledWorkflowArtifacts(projectPath, tools, true, view);
  const installedWorkflows = artifacts.workflows;

  if (installedWorkflows.length === 0) {
    // No workflows installed, new user — defaults will apply
    return null;
  }

  return {
    profile: 'custom',
    workflows: installedWorkflows,
    ...(rawConfig.delivery === undefined ? { delivery: inferDelivery(artifacts) } : {}),
  };
}

export type ProfileMigration = { profile: Profile; workflows: string[]; delivery?: Delivery };

/** The global config the one-time profile migration saves. */
export function applyProfileMigration(migration: ProfileMigration): GlobalConfig {
  const config = getGlobalConfig();
  // Migrate: set profile to custom with detected workflows
  config.profile = migration.profile;
  config.workflows = migration.workflows;
  if (migration.delivery !== undefined) {
    config.delivery = migration.delivery;
  }
  return config;
}

export function migrateIfNeeded(projectPath: string, tools: AIToolOption[]): void {
  const migration = computeProfileMigration(projectPath, tools);
  if (!migration) {
    return;
  }

  const config = applyProfileMigration(migration);
  const installedWorkflows = migration.workflows;
  saveGlobalConfig(config);

  console.log(`Migrated: custom profile with ${installedWorkflows.length} workflows`);
  // Each detected tool resolves to a propose reference for its surface: the
  // command name its generated files answer to when commands will exist for it
  // under the effective delivery (/opsx:propose when namespaced under opsx/,
  // /opsx-propose when the filename is the command), its documented skill
  // invocation otherwise. When the tools disagree — including command tools
  // mixed with skill-only tools — stay syntax-neutral rather than advertise a
  // form that is wrong for one of them.
  const effectiveDelivery: Delivery = config.delivery ?? 'both';
  const proposeReferences = new Set(
    tools.map((tool) => {
      if (shouldGenerateCommandsForTool(tool.value, effectiveDelivery)) {
        const transformer = getTransformerForTool(
          tool.value,
          effectiveDelivery,
          resolveCommandSurfaceCapability(tool.value),
          resolveCommandInvocation(tool.value)
        );
        return transformer ? transformer('/opsx:propose') : '/opsx:propose';
      }
      return getSkillReferenceTransformer(tool.value)('/opsx:propose');
    })
  );
  const proposeReference =
    proposeReferences.size === 1 ? [...proposeReferences][0] : 'the openspec-propose skill';
  console.log(`New in this version: ${proposeReference}. Try 'openspec config profile core' for the streamlined experience.`);
}
