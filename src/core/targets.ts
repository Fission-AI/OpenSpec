/**
 * Effective-targets assembly (slice 3.4).
 *
 * A root's `openspec/config.yaml` may declare `targets:` — the code
 * repos the store's work is about. A change may narrow that set in its
 * own `.openspec.yaml`. Instructions output carries the effective set
 * with provenance. Targets are declarations agents read, never
 * machinery: nothing here touches the registry or filesystem, and
 * targets never affect where commands act.
 */
import { sanitizeInline } from './references.js';
import { makeStoreDiagnostic, type StoreDiagnostic } from './store/errors.js';
import { isKebabId } from './id.js';
import type { DeclarationEntry } from './project-config.js';

/** A targets entry, optionally resolved to a local checkout (3.5). */
export type TargetRepoEntry = DeclarationEntry & {
  /** Local checkout path when the machine's repo map resolves the id. */
  path?: string;
};

export interface EffectiveTargets {
  /** Where the effective list came from. */
  source: 'store' | 'change';
  repos: TargetRepoEntry[];
  /** Always present; `[]` when clean. */
  status: StoreDiagnostic[];
}

export interface AssembleTargetsInput {
  storeTargets?: DeclarationEntry[];
  changeTargets?: string[];
  /** Local repo map (id → canonical path) for path enrichment. */
  repoPaths?: Map<string, string>;
  /** Absolute path of the config file actually read (for fix text). */
  storeConfigPath?: string;
  /** Absolute path of the change's metadata file (for fix text). */
  changeMetadataPath?: string;
}

function warning(code: string, message: string, fix: string): StoreDiagnostic {
  return makeStoreDiagnostic('warning', code, message, { target: 'targets', fix });
}

/**
 * Builds the effective target set. A non-empty change list replaces the
 * store list (inheriting remotes from matching store declarations); an
 * empty or absent change list means the store defaults apply. Returns
 * null when neither level declares anything.
 */
export function assembleTargets(input: AssembleTargetsInput): EffectiveTargets | null {
  const storeTargets = input.storeTargets ?? [];
  const changeTargets = input.changeTargets ?? [];

  if (storeTargets.length === 0 && changeTargets.length === 0) {
    return null;
  }

  const status: StoreDiagnostic[] = [];
  const declared = new Map<string, DeclarationEntry>();
  for (const target of storeTargets) {
    if (!isKebabId(target.id)) {
      status.push(
        warning(
          'target_invalid_id',
          `Target '${target.id}' is not a valid repo id.`,
          `Use kebab-case repo ids in the targets list in ${input.storeConfigPath ?? 'openspec/config.yaml'}.`
        )
      );
      continue;
    }
    declared.set(target.id, target);
  }

  const withPath = (entry: DeclarationEntry): TargetRepoEntry => {
    const localPath = input.repoPaths?.get(entry.id);
    return localPath ? { ...entry, path: localPath } : entry;
  };

  if (changeTargets.length === 0) {
    return { source: 'store', repos: [...declared.values()].map(withPath), status };
  }

  // Narrowing: change ids replace the store list; remotes inherit from
  // the matching store declaration (the remote belongs to the repo
  // declaration, not the provenance). Change-level grammar is enforced
  // by the metadata schema before this runs.
  const repos: TargetRepoEntry[] = [];
  const seen = new Set<string>();
  for (const id of changeTargets) {
    if (seen.has(id)) {
      continue; // The effective list is a set: first occurrence wins.
    }
    seen.add(id);
    const storeDeclaration = declared.get(id);
    if (storeDeclaration) {
      repos.push(withPath(storeDeclaration));
      continue;
    }
    repos.push(withPath({ id }));
    status.push(
      warning(
        'target_not_declared',
        `'${id}' is not in the store's declared targets.`,
        `Add it to targets in ${input.storeConfigPath ?? 'openspec/config.yaml'}, or correct the change's ${input.changeMetadataPath ?? '.openspec.yaml'}.`
      )
    );
  }

  return { source: 'change', repos, status };
}

const PROVENANCE_LINE: Record<EffectiveTargets['source'], string> = {
  store: 'Declared by the store config.',
  change: 'Narrowed by this change.',
};

function renderEntryLines(effective: EffectiveTargets): string[] {
  const lines: string[] = [PROVENANCE_LINE[effective.source]];
  for (const repo of effective.repos) {
    let line = `  - ${repo.id}`;
    if (repo.path) {
      line += ` \u2192 ${repo.path}`;
    }
    if (repo.remote) {
      line += ` (clone: ${sanitizeInline(repo.remote, 200)})`;
    }
    lines.push(line);
  }
  for (const diagnostic of effective.status) {
    lines.push(`  Note: ${diagnostic.message}`);
    if (diagnostic.fix) {
      lines.push(`  Fix: ${diagnostic.fix}`);
    }
  }
  return lines;
}

/** XML block for artifact instructions. Hand-written list; no byte budget. */
export function renderTargetReposBlock(effective: EffectiveTargets): string {
  return [
    '<target_repos>',
    '<!-- The code repos this work is about. Declarations, not machinery. -->',
    ...renderEntryLines(effective),
    '</target_repos>',
  ].join('\n');
}

/** Markdown section for apply instructions. */
export function renderTargetReposSection(effective: EffectiveTargets): string {
  return [
    '### Target Repos',
    '',
    'The code repos this work is about. Declarations, not machinery.',
    '',
    ...renderEntryLines(effective),
  ].join('\n');
}
