import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml, parseDocument, stringify as stringifyYaml } from 'yaml';
import { resolveLifecycle, type LifecycleMode } from './project-config.js';
import { discoverChanges } from './change-discovery.js';
import { SyncCommand } from './sync.js';
import { formatLocalDate } from '../utils/date.js';

const ARCHIVE_DIR_NAME = /^(\d{4})-(\d{2})-(\d{2})-(.+)$/;
const SHARD_PATH = /^(\d{4})[/\\](\d{2})[/\\](\d{2})-(.+)$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YEAR_DIR = /^\d{4}$/;

export interface MigrateOptions {
  dryRun?: boolean;
  to?: LifecycleMode;
}

interface PlannedMove {
  from: string;
  to: string;
  id: string;
  status: 'proposed' | 'shipped';
  created: string;
}

/**
 * Migration between lifecycle modes, in both directions. Neither direction
 * touches spec text: archive-mode's `specs/` is folded shipped reality, which
 * is exactly what status-mode maintains, so only bookkeeping moves — renames
 * and a config line. That symmetry is what makes the experiment leaveable.
 *
 * → status: `changes/archive/YYYY-MM-DD-<name>/` becomes
 *   `changes/YYYY/MM/DD-<name>/` with `status: shipped` (the folder date's
 *   meaning shifts from archival to creation — the closest surviving record);
 *   active flat changes shard by their `created` date as `status: proposed`.
 *
 * → archive: shipped changes return to `changes/archive/YYYY-MM-DD-<name>/`
 *   (dates from the shard path), proposed changes return to flat
 *   `changes/<name>/`, and the `status` key is stripped — under archive mode,
 *   location is the state. Refuses while any shipped change has unfolded
 *   deltas: the archive layout asserts folds that must actually exist.
 *
 * Metadata is edited tolerantly — raw YAML keys, no strict schema round-trip —
 * because legacy changes predate today's metadata contract and a migration
 * that drops fields it does not understand is a migration that destroys
 * history.
 */
export class MigrateCommand {
  async execute(targetPath: string = '.', options: MigrateOptions = {}): Promise<void> {
    const target = options.to ?? 'status';
    const current = resolveLifecycle(targetPath);
    if (current === target) {
      console.log(`Already on \`lifecycle: ${target}\` — nothing to migrate.`);
      return;
    }
    if (target === 'status') {
      await this.toStatus(targetPath, options);
    } else {
      await this.toArchive(targetPath, options);
    }
  }

  private async toStatus(targetPath: string, options: MigrateOptions): Promise<void> {
    const openspecDir = path.join(targetPath, 'openspec');
    const changesDir = path.join(openspecDir, 'changes');
    const archiveDir = path.join(changesDir, 'archive');
    const today = formatLocalDate();

    const moves: PlannedMove[] = [];

    for (const entry of await this.dirs(archiveDir)) {
      const match = ARCHIVE_DIR_NAME.exec(entry);
      const [year, month, day, id] = match
        ? [match[1], match[2], match[3], match[4]]
        : ([...today.split('-'), entry] as [string, string, string, string]);
      moves.push({
        from: path.join(archiveDir, entry),
        to: path.join(changesDir, year, month, `${day}-${id}`),
        id,
        status: 'shipped',
        created: `${year}-${month}-${day}`,
      });
    }

    for (const entry of await this.dirs(changesDir)) {
      // Year dirs are shards left by an interrupted earlier run, not changes;
      // scanning into them would try to rename changes/YYYY into itself.
      if (entry === 'archive' || YEAR_DIR.test(entry)) continue;
      const from = path.join(changesDir, entry);
      const meta = await this.readRawMetadata(from);
      const created = DATE.test(String(meta?.created ?? '')) ? String(meta?.created) : today;
      const [year, month, day] = created.split('-');
      moves.push({
        from,
        to: path.join(changesDir, year, month, `${day}-${entry}`),
        id: entry,
        status: meta?.status === 'shipped' ? 'shipped' : 'proposed',
        created,
      });
    }

    // In the sharded layout every command addresses a change by bare id, so a
    // legacy name reused across archive eras (the date prefix exists to allow
    // exactly that) would become permanently ambiguous. Refuse before the
    // first rename; already-sharded entries from an interrupted run count too.
    const claimed = new Map<string, string[]>();
    for (const change of await discoverChanges(changesDir)) {
      const rel = path.relative(changesDir, change.dir);
      if (SHARD_PATH.test(rel)) {
        claimed.set(change.id, [...(claimed.get(change.id) ?? []), rel]);
      }
    }
    for (const move of moves) {
      claimed.set(move.id, [
        ...(claimed.get(move.id) ?? []),
        path.relative(changesDir, move.from),
      ]);
    }
    const ambiguous = [...claimed.entries()].filter(([, sources]) => sources.length > 1);
    if (ambiguous.length > 0) {
      const listing = ambiguous
        .map(([id, sources]) => `  ${id}: ${sources.join(', ')}`)
        .join('\n');
      throw new Error(
        `Refusing to migrate: these change ids would be ambiguous in the sharded layout, where commands address changes by bare id:\n${listing}\nRename the colliding folders first (e.g. ${ambiguous[0][0]}-v2), then re-run.`
      );
    }

    await this.apply(moves, targetPath, options, async () => {
      if (!(await this.dirs(archiveDir)).length) {
        await fs.rm(archiveDir, { recursive: true, force: true });
      }
      await this.setLifecycle(openspecDir, 'status');
      console.log('Migrated to `lifecycle: status`.');
      console.log(
        'Verify with `openspec sync --check`. Historical changes superseded by later edits to the same requirement may report unfolded — that is the base-snapshot gap, not a migration error; resolve by reviewing the named capability.'
      );
    });
  }

  private async toArchive(targetPath: string, options: MigrateOptions): Promise<void> {
    const openspecDir = path.join(targetPath, 'openspec');
    const changesDir = path.join(openspecDir, 'changes');
    const archiveDir = path.join(changesDir, 'archive');
    const today = formatLocalDate();

    // The archive layout asserts every archived change's fold happened, so a
    // shipped-but-unfolded change must be folded (or unshipped) first. Reuse
    // the gate itself rather than a parallel reimplementation of its verdict.
    const gate = await new SyncCommand().execute(undefined, targetPath, {
      check: true,
      silent: true,
    });
    if (!gate.clean) {
      throw new Error(
        'Refusing to migrate to `lifecycle: archive`: a shipped change has unfolded deltas (the archive layout would assert a fold that never happened). Run `openspec sync` first.'
      );
    }

    const moves: PlannedMove[] = [];
    for (const change of await discoverChanges(changesDir)) {
      const meta = await this.readRawMetadata(change.dir);
      const rel = path.relative(changesDir, change.dir);
      const shard = SHARD_PATH.exec(rel);
      const created = shard
        ? `${shard[1]}-${shard[2]}-${shard[3]}`
        : DATE.test(String(meta?.created ?? ''))
          ? String(meta?.created)
          : today;
      const shipped = meta?.status === 'shipped';
      moves.push({
        from: change.dir,
        to: shipped
          ? path.join(archiveDir, `${created}-${change.id}`)
          : path.join(changesDir, change.id),
        id: change.id,
        status: shipped ? 'shipped' : 'proposed',
        created,
      });
    }

    await this.apply(moves, targetPath, options, async () => {
      await this.pruneShardDirs(changesDir);
      await this.setLifecycle(openspecDir, 'archive');
      console.log('Migrated to `lifecycle: archive`.');
      console.log(
        'Note: changes shipped under status mode carry their creation date in the archive folder name, where convention reads an archival date.'
      );
    });
  }

  private async apply(
    moves: PlannedMove[],
    targetPath: string,
    options: MigrateOptions,
    finish: () => Promise<void>
  ): Promise<void> {
    if (moves.length === 0) {
      console.log('No changes to migrate.');
    }

    // Two sources mapping to one target would silently clobber the second;
    // reachable when a hand-edited tree reuses an id within one shard date.
    const targets = new Map<string, string>();
    for (const move of moves) {
      const prior = targets.get(move.to);
      if (prior !== undefined) {
        throw new Error(
          `Refusing to migrate: '${prior}' and '${path.relative(targetPath, move.from)}' both map to '${path.relative(targetPath, move.to)}'. Rename one and re-run.`
        );
      }
      targets.set(move.to, path.relative(targetPath, move.from));
    }

    for (const move of moves) {
      console.log(
        `  ${move.status === 'shipped' ? '✓' : '…'} ${move.id} → ${path.relative(targetPath, move.to)} [${move.status}]`
      );
      if (options.dryRun) continue;
      // A change already in its destination still needs stamping: under
      // --to archive a proposed change is flat in both layouts, and skipping
      // the stamp would leave its `status` key behind for a later forward
      // migration to read as authoritative.
      if (move.from !== move.to) {
        await fs.mkdir(path.dirname(move.to), { recursive: true });
        await fs.rename(move.from, move.to);
      }
      await this.stampMetadata(move, targetPath, options.to ?? 'status');
    }

    if (options.dryRun) {
      console.log('Dry run — nothing written.');
      return;
    }
    await finish();
  }

  private async dirs(dir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch (error) {
      // Absent is genuinely empty; unreadable is not. This result gates the
      // removal of changes/archive/, so treating EACCES as "nothing there"
      // would delete a directory whose contents were never enumerated.
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async readRawMetadata(changeDir: string): Promise<Record<string, unknown> | null> {
    try {
      const raw = await fs.readFile(path.join(changeDir, '.openspec.yaml'), 'utf-8');
      const parsed = parseYaml(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  private async stampMetadata(
    move: PlannedMove,
    targetPath: string,
    target: LifecycleMode
  ): Promise<void> {
    const file = path.join(move.to, '.openspec.yaml');
    let raw: string | null = null;
    try {
      raw = await fs.readFile(file, 'utf-8');
    } catch {
      raw = null;
    }

    // Edit the document, not a re-serialization: legacy metadata may carry
    // comments and key order this migration has no business rewriting. A file
    // that does not parse gets a fresh minimal stamp — same as before.
    const doc = parseDocument(raw ?? '');
    if (doc.errors.length > 0) {
      const stamped: Record<string, unknown> = {
        schema: await this.projectSchema(targetPath),
        created: move.created,
      };
      if (target === 'status') {
        stamped.status = move.status;
      }
      await fs.writeFile(file, stringifyYaml(stamped), 'utf-8');
      return;
    }

    if (!doc.has('schema')) {
      doc.set('schema', await this.projectSchema(targetPath));
    }
    if (!doc.has('created')) {
      doc.set('created', move.created);
    }
    if (target === 'status') {
      doc.set('status', move.status);
    } else {
      // Under archive mode location is the state; a lingering status field
      // would be a second, contradicting record.
      doc.delete('status');
    }
    await fs.writeFile(file, doc.toString(), 'utf-8');
  }

  /** Remove now-empty YYYY/MM shard directories after a reverse migration. */
  private async pruneShardDirs(changesDir: string): Promise<void> {
    for (const year of await this.dirs(changesDir)) {
      if (!/^\d{4}$/.test(year)) continue;
      const yearDir = path.join(changesDir, year);
      for (const month of await this.dirs(yearDir)) {
        await fs.rmdir(path.join(yearDir, month)).catch(() => {});
      }
      await fs.rmdir(yearDir).catch(() => {});
    }
  }

  private async projectSchema(targetPath: string): Promise<string> {
    const raw = await this.readRawConfig(targetPath);
    const schema = raw?.schema;
    return typeof schema === 'string' && schema.length > 0 ? schema : 'spec-driven';
  }

  private async readRawConfig(targetPath: string): Promise<Record<string, unknown> | null> {
    for (const name of ['config.yaml', 'config.yml']) {
      try {
        const raw = await fs.readFile(path.join(targetPath, 'openspec', name), 'utf-8');
        const parsed = parseYaml(raw);
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
      } catch {
        continue;
      }
    }
    return null;
  }

  private async setLifecycle(openspecDir: string, mode: LifecycleMode): Promise<void> {
    for (const name of ['config.yaml', 'config.yml']) {
      const file = path.join(openspecDir, name);
      try {
        const raw = await fs.readFile(file, 'utf-8');
        let updated: string;
        if (mode === 'archive') {
          // The default mode needs no line at all.
          updated = raw.replace(/^lifecycle:.*\n?/m, '');
        } else {
          updated = /^lifecycle:.*$/m.test(raw)
            ? raw.replace(/^lifecycle:.*$/m, 'lifecycle: status')
            : `${raw.trimEnd()}\nlifecycle: status\n`;
        }
        await fs.writeFile(file, updated, 'utf-8');
        return;
      } catch {
        continue;
      }
    }
    await fs.writeFile(
      path.join(openspecDir, 'config.yaml'),
      mode === 'status' ? 'schema: spec-driven\nlifecycle: status\n' : 'schema: spec-driven\n',
      'utf-8'
    );
  }
}
