import { constants, createReadStream, promises as fs } from 'fs';
import { createHash, randomUUID } from 'crypto';
import path from 'path';
import { formatLocalDate } from '../utils/date.js';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import { Validator } from './validation/validator.js';
import { VALIDATION_MESSAGES } from './validation/constants.js';
import chalk from 'chalk';
import {
  emitStoreRootBanner,
  isRootSelectionError,
  resolveOpenSpecRoot,
  toRootOutput,
  withStoreFlag,
  type ResolvedOpenSpecRoot,
  isStoreSelectedRoot,
} from './root-selection.js';
import {
  findSpecUpdates,
  buildUpdatedSpec,
  writeUpdatedSpec,
  retireSpec,
  finalizeRetiredSpec,
  type SpecUpdate,
} from './specs-apply.js';
import { discoverSpecFiles, hasAnyFileUnder } from '../utils/spec-discovery.js';
import { METADATA_FILENAME, readRetireCapabilitiesMarker, readSkipSpecsMarker } from '../utils/change-metadata.js';
import { confirmPrompt, isNonInteractivePromptError } from '../utils/interactive.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { folderStyleNameProblem } from './id.js';

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

/**
 * 匹配归档附加到 change 名称前的 `YYYY-MM-DD-` 前缀。
 * 已以前缀开头的 change（常见的作者约定）会保留其名称归档，
 * 避免前缀重复叠加（#1309）。
 */
const ARCHIVE_DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}-/;

/**
 * 当重建的 spec 唯一的问题是没有需求时返回 true。
 * 这正是退休能力替换的精确失败条件（#1302）；其他任何情况意味着
 * spec 有作者仍需修复的问题，因此归档必须像以往一样中止，
 * 而不是执行退休。
 *
 * 让验证器检查 — 而不是再次统计需求块 — 才是"这个 spec 本来就不可能
 * 被正确写入"为真的原因。两者的计数确实会有差异：`MarkdownParser`
 * 将 `## Requirements` 下的任何 `###` 标题都接受为需求，而增量块解析器
 * 仅索引规范化的 `### Requirement:` 标题，其余的归入前言，
 * 在前言中会保留到重建的 spec 中。
 */
export async function isRetirableSpec(specName: string, rebuilt: string): Promise<boolean> {
  const report = await new Validator().validateSpecContent(specName, rebuilt);
  if (report.valid) return false;
  const errors = report.issues.filter((issue) => issue.level === 'ERROR');
  return (
    errors.length > 0 &&
    errors.every((issue) => issue.message === VALIDATION_MESSAGES.SPEC_NO_REQUIREMENTS)
  );
}

/**
 * 中止操作愿意显示的阻塞行数量。足够长的行
 * 会填满屏幕，将退出路径挤出视线。
 */
const UNACCOUNTED_LINE_MAX = 200;

/**
 * 退休操作将删除但无法单独命名的前几行内容，
 * 加上引号显示，并给出其余行的数量。限制长度以防尾部内容
 * 淹没其余的中止信息。
 *
 * 这些行是原封不动打印到终端的 spec 内容，因此与 change 目录名
 * （`describeChangeName`）采用相同处理方式：
 * 原始回车符可能伪造一行内容，转义符可能重绘屏幕。
 * 截断按码点计数，确保不会截断代理对的一半。
 */
function describeUnaccountedContent(lines: string[]): string {
  const shown = lines
    .slice(0, 3)
    .map((line) => {
      const safe = [...line.replace(/[\u0000-\u001f\u007f]/g, '?')];
      const clipped = safe.slice(0, UNACCOUNTED_LINE_MAX).join('');
      return `"${safe.length > UNACCOUNTED_LINE_MAX ? `${clipped}\u2026` : clipped}"`;
    })
    .join(', ');
  const rest = lines.length > 3 ? `，还有 ${lines.length - 3} 行` : '';
  return `${shown}${rest}`;
}

/**
 * 本次运行对重建的 spec 应执行的操作：照常写入、因增量删除了最后一个
 * 需求而退休 capability（#1302），或因无需写入也无需退休而跳过。
 */
type SpecOutcome = 'write' | 'retire' | 'skip';

async function isRetirementCandidate(
  update: SpecUpdate,
  built: Pick<
    Awaited<ReturnType<typeof buildUpdatedSpec>>,
    'rebuilt' | 'noRequirementBlocks' | 'unaccountedContent'
  >,
  skipValidation: boolean
): Promise<boolean> {
  return (
    !skipValidation &&
    built.noRequirementBlocks &&
    built.unaccountedContent.length === 0 &&
    (await isRetirableSpec(update.id, built.rebuilt))
  );
}

async function decideSpecOutcome(
  update: SpecUpdate,
  built: Awaited<ReturnType<typeof buildUpdatedSpec>>,
  skipValidation: boolean,
  retirementDeclared: boolean
): Promise<SpecOutcome> {
  // 作者必须主动请求。没有标记时回退到普通写入，
  // 验证会一如既往地失败 — 中止操作现在会提及该标记，
  // 因此 #1302 描述的死胡同现在有了出路，而不仅是被拒绝的 spec。
  if (!retirementDeclared) return 'write';

  // 退休由验证器决定，永不通过关于什么算作需求的二次判断：
  // 块解析器将验证器接受的某些形状归入前言，因此"剩余零块"本身
  // 会让能通过验证的 spec 也被退休。
  //
  // 残留的 `###` 标题会彻底否决。验证器可能将其忽略 — 例如
  // 目的下多余的 `### Requirements` 会被其区块查找捕获 —
  // 但读者无法忽略，删除文件会将它们一并带走。
  //
  // 使用 --no-validate 时没有可依赖的验证结论，因此不会退休：
  // 作者选择不进行使此操作安全的检查，旧行为（写入 spec）
  // 不会有任何损失。
  // 文件中任何内容都不得位于合并器无法理解的部分之外。
  // 以"是否有内容落在我理解的部分之外"代替"是否有内容像需求"来询问 —
  // 后者在六轮审查中每次都找到新的错误答案。
  const retirable = await isRetirementCandidate(update, built, skipValidation);

  if (!retirable) return 'write';
  // 磁盘上没有可写入或退休的内容：capability 已经退休。
  if (!update.exists) return 'skip';
  // 已经无需求的 spec 本次没有丢失任何内容，仍需作者修复，
  // 因此走与以往相同的中止流程。
  return built.counts.removed > 0 ? 'retire' : 'write';
}

async function listActiveChangeNames(changesDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(changesDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (!isMissingPathError(error)) throw error;
    return [];
  }
}

export interface ArchiveOptions {
  yes?: boolean;
  skipSpecs?: boolean;
  noValidate?: boolean;
  validate?: boolean;
  json?: boolean;
  store?: string;
  storePath?: string;
}

interface ArchiveDiagnostic {
  severity: 'error';
  code: string;
  message: string;
  fix?: string;
}

interface ArchiveResult {
  change: string;
  archivedAs: string;
  path: string;
  specsUpdated: boolean;
  totals?: { added: number; modified: number; removed: number; renamed: number };
  /** 非阻塞的 spec 合并警告（例如已被删除的 REMOVED 需求）。 */
  warnings?: string[];
}

/**
 * 归档操作自身无法逾越的决策点。在以下情况下抛出：
 * 流程需要答案但无法获取 — JSON 模式下完全不提示，
 * 人工模式下提示失败因无人能回答（#1479）。
 * 无论哪种情况都携带机器可读的诊断信息并以非零状态退出。
 */
class ArchiveBlockedError extends Error {
  readonly diagnostic: ArchiveDiagnostic;

  constructor(code: string, message: string, fix?: string) {
    super(message);
    this.name = 'ArchiveBlockedError';
    this.diagnostic = {
      severity: 'error',
      code,
      message,
      ...(fix ? { fix } : {}),
    };
  }
}

/**
 * 为读者要复制粘贴的 `Fix:` 行引用 change 名称。
 * 归档通过 stat 目录来解析 change，因此名称就是目录的名称 —
 * 包括带空格或 shell 元字符的名称，不加引号粘贴会被当作
 * 第二个命令执行。
 *
 * 双引号是 bash、zsh、PowerShell 和 cmd.exe 都以相同方式处理的
 * 唯一形式，因此仅 POSIX 的 `'...'` 在 Windows 上不正确。
 * 在所有这些 shell 中双引号内保持惰性的字符是可移植引用的
 * 极限；包含其他字符的名称没有可移植的拼写方式，
 * 因此使用占位符代替发出可能会展开成非预期内容的命令。
 *
 * `%` 和 `!` 出于相同原因不可加引号，即使 POSIX shell 在双引号内
 * 不会处理它们：cmd.exe 在双引号内展开 `%NAME%`，`!NAME!` 在
 * `setlocal enabledelayedexpansion` 下也会展开（bash 的交互式
 * 历史展开中 `!` 也是如此）。change 目录确实可以命名为
 * `%USERNAME%`，静默地指向不同 change 的重新运行比需要用户
 * 手动填写更糟糕。
 */
function quoteChangeName(name: string): string {
  return quoteForShell(name) ?? '<change-name>';
}

/**
 * 为读者要复制粘贴的行引用参数，或在无可移植拼写时返回 undefined。
 *
 * 双引号是 bash、zsh、PowerShell 和 cmd.exe 都以相同方式处理的
 * 唯一形式。在所有这些 shell 中双引号内保持特殊含义的字符
 * 没有可移植的拼写方式，因此调用者会用其他表述代替，
 * 而不是发出可能展开成非预期内容的命令。
 */
function quoteForShell(value: string): string | undefined {
  if (/^[A-Za-z0-9._\/-]+$/.test(value)) return value;
  if (!/["\\$`\r\n%!]/.test(value)) return `"${value}"`;
  return undefined;
}

/**
 * 在散文消息中渲染 change 名称。名称是目录名，可能包含控制字符，
 * 人工模式下原封不动打印消息：原始回车符或换行符可能让 change 目录
 * 伪造自己的 `Fix:` 行，这在这里比其他任何地方都更糟糕，因为
 * `quoteChangeName` 会将真正的修复降级为 `<change-name>` 占位符，
 * 恰好是那些名称 — 使得伪造的行成为屏幕上唯一可粘贴的命令。
 * 转义符可能重绘终端。两者都无法保留。
 */
function describeChangeName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f]/g, '?');
}

/**
 * 构建被阻塞归档建议的重新运行所需的标志。
 * 保留调用者的标志，因为建议不带参数的 `--yes` 重新运行
 * `archive x --skip-specs` 会将增量合并到主 spec 中 — 恰恰是
 * `--skip-specs` 要阻止的操作。
 */
function rerunFlags(options: ArchiveOptions): string[] {
  return [
    ...(options.skipSpecs ? ['--skip-specs'] : []),
    ...(options.validate === false || options.noValidate === true ? ['--no-validate'] : []),
    '--yes',
  ];
}

function rerunCommand(
  root: ResolvedOpenSpecRoot,
  changeName: string,
  options: ArchiveOptions
): string {
  const flags = rerunFlags(options).join(' ');
  // 以破折号开头的名称无论在哪个位置都会被当作选项解析，
  // 因此放在最后，在结束选项解析的 `--` 之后。
  // store 标志必须保持在该 `--` 之前才能被读取为选项。
  if (changeName.startsWith('-')) {
    return `${withStoreFlag(root, `openspec archive ${flags}`)} -- ${quoteChangeName(changeName)}`;
  }
  return withStoreFlag(root, `openspec archive ${quoteChangeName(changeName)} ${flags}`);
}

/**
 * 在人工模式下询问是/否问题。当无法读取答案时 —
 * 这是 AI agent 或通过关闭 stdin 运行脚本的常见情况 —
 * 原始 @inquirer 失败会被替换为针对此决策点的指导信息，
 * 让调用者知道该传递哪个标志，而不是读取
 * `User force closed the prompt`（#1479）。
 */
async function confirmOrBlock(
  prompt: { message: string; default: boolean },
  blocked: () => ArchiveBlockedError
): Promise<boolean> {
  try {
    return await confirmPrompt(prompt);
  } catch (error) {
    if (isNonInteractivePromptError(error)) {
      throw blocked();
    }
    throw error;
  }
}

function toArchiveDiagnostic(error: unknown): ArchiveDiagnostic {
  if (error instanceof ArchiveBlockedError) {
    return error.diagnostic;
  }
  if (isRootSelectionError(error)) {
    return error.diagnostic;
  }
  return {
    severity: 'error',
    code: 'archive_error',
    message: error instanceof Error ? error.message : String(error),
  };
}

/**
 * 递归复制目录。当 fs.rename 失败时使用（例如 Windows 上的 EPERM）。
 */
async function copySymbolicLink(src: string, dest: string): Promise<void> {
  const target = await fs.readlink(src);
  const isWindowsDirectoryLink =
    process.platform === 'win32' && (await fs.stat(src)).isDirectory();
  const destinationTarget =
    isWindowsDirectoryLink && !path.isAbsolute(target)
      ? path.resolve(path.dirname(src), target)
      : target;
  await fs.symlink(destinationTarget, dest, isWindowsDirectoryLink ? 'junction' : undefined);
}

async function copyDirContents(src: string, dest: string): Promise<void> {
  const sourceStat = await fs.lstat(src);
  // 在保持组/其他用户访问权限不超过源目录的同时，确保此进程
  // 能填充甚至只读的源目录。
  await fs.chmod(dest, (sourceStat.mode & 0o7777) | 0o700);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { mode: 0o700 });
      await copyDirContents(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      await copySymbolicLink(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath, constants.COPYFILE_EXCL);
    } else {
      throw new Error(`归档不支持的文件系统条目：${srcPath}`);
    }
  }
  await fs.chmod(dest, sourceStat.mode & 0o7777);
}

async function fingerprintDirectoryContents(root: string): Promise<string> {
  const hash = createHash('sha256');
  const updateHashField = (label: string, value: string | Buffer): void => {
    const labelBuffer = Buffer.from(label);
    const valueBuffer = typeof value === 'string' ? Buffer.from(value) : value;
    const lengths = Buffer.allocUnsafe(16);
    lengths.writeBigUInt64BE(BigInt(labelBuffer.length), 0);
    lengths.writeBigUInt64BE(BigInt(valueBuffer.length), 8);
    hash.update(lengths);
    hash.update(labelBuffer);
    hash.update(valueBuffer);
  };
  const fingerprintFile = async (filePath: string): Promise<Buffer> => {
    const fileHash = createHash('sha256');
    for await (const chunk of createReadStream(filePath)) {
      fileHash.update(chunk);
    }
    return fileHash.digest();
  };

  const visit = async (dir: string, relativeDir: string): Promise<void> => {
    const before = await fs.lstat(dir, { bigint: true });
    if (!before.isDirectory()) {
      throw new Error(`验证时期望一个目录：${dir}。`);
    }
    updateHashField('directory-mode', (before.mode & 0o7777n).toString());
    const entries = (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    );

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      const relativePath = path.join(relativeDir, entry.name);
      const stat = await fs.lstat(entryPath, { bigint: true });
      updateHashField('path', relativePath);

      if (stat.isDirectory()) {
        updateHashField('type', 'directory');
        await visit(entryPath, relativePath);
      } else if (stat.isSymbolicLink()) {
        const target = await fs.readlink(entryPath);
        const after = await fs.lstat(entryPath, { bigint: true });
        if (statIdentity(stat) !== statIdentity(after)) {
          throw new Error(`归档读取时路径发生变化：${entryPath}。`);
        }
        updateHashField('type', 'symlink');
        updateHashField('target', target);
      } else if (stat.isFile()) {
        const contentFingerprint = await fingerprintFile(entryPath);
        const after = await fs.lstat(entryPath, { bigint: true });
        if (statIdentity(stat) !== statIdentity(after)) {
          throw new Error(`归档读取时路径发生变化：${entryPath}。`);
        }
        updateHashField('type', 'file');
        updateHashField('mode', (stat.mode & 0o7777n).toString());
        updateHashField('content-sha256', contentFingerprint);
      } else {
        updateHashField('type', 'other');
        updateHashField('mode', stat.mode.toString());
        updateHashField('size', stat.size.toString());
      }
    }

    const after = await fs.lstat(dir, { bigint: true });
    if (statIdentity(before) !== statIdentity(after)) {
      throw new Error(`归档读取时目录发生变化：${dir}。`);
    }
  };

  await visit(root, '');
  return hash.digest('hex');
}

async function assertCopiedDirectoryUnchanged(
  stagedSource: string,
  destination: string,
  expectedFingerprint: string
): Promise<void> {
  const sourceFingerprint = await fingerprintDirectoryContents(stagedSource);
  const destinationFingerprint = await fingerprintDirectoryContents(destination);
  if (
    sourceFingerprint !== expectedFingerprint ||
    destinationFingerprint !== expectedFingerprint
  ) {
    throw new Error(
      `Change directory contents changed during the fallback copy from ${stagedSource} to ${destination}.`
    );
  }
}

/**
 * 将目录从 src 移动到 dest。在 Windows 上 fs.rename() 可能因 EPERM 失败，
 * 跨设备移动会因 EXDEV 失败。当源目录可以先重命名为私有兄弟目录时，
 * 回退到经验证的复制后删除。无法暂存的源保持不变，而不是通过
 * 另一个进程可能仍在编辑的路径进行复制和删除。
 */
class MoveDestinationRetainedError extends Error {}
class RetirementBackupsRetainedError extends Error {}

async function moveDirectory(
  src: string,
  dest: string,
  options: {
    verifyCopiedDestination?: (stagedSource: string) => Promise<void>;
  } = {}
): Promise<void> {
  try {
    await fs.rename(src, dest);
  } catch (err: any) {
    const code = err?.code;
    // 重命名到非空目录：归档运行时目标被占用。
    // 与预检报告的情况相同。
    if (code === 'ENOTEMPTY' || code === 'EEXIST') {
      throw new ArchiveBlockedError(
        'archive_target_exists',
        `归档 '${path.basename(dest)}' 已存在。`
      );
    }
    if (code === 'EPERM' || code === 'EXDEV') {
      const stagedSource = path.join(path.dirname(src), `.openspec-move-${randomUUID()}`);
      try {
        await fs.rename(src, stagedSource);
      } catch (stageError) {
        throw new Error(
          `无法在回退归档复制前安全暂存 ${src} ` +
            `（${stageError instanceof Error ? stageError.message : String(stageError)}）。` +
            '未尝试回退复制。'
        );
      }
      let destIsOurs = false;
      let stagedFingerprint: string;
      try {
        stagedFingerprint = await fingerprintDirectoryContents(stagedSource);
        await fs.mkdir(dest, { mode: 0o700 });
        destIsOurs = true;
        await copyDirContents(stagedSource, dest);
        await options.verifyCopiedDestination?.(stagedSource);
        await assertCopiedDirectoryUnchanged(stagedSource, dest, stagedFingerprint);
      } catch (copyError) {
        if (destIsOurs) {
          await fs.rm(dest, { recursive: true, force: true }).catch(() => undefined);
        }
        try {
          await fs.rename(stagedSource, src);
        } catch (restoreError) {
          throw new Error(
            `${copyError instanceof Error ? copyError.message : String(copyError)} ` +
              `无法恢复暂存的源目录 ${stagedSource} ` +
              `（${restoreError instanceof Error ? restoreError.message : String(restoreError)}）。`
          );
        }
        if ((copyError as NodeJS.ErrnoException).code === 'EEXIST') {
          throw new ArchiveBlockedError(
            'archive_target_exists',
            `归档 '${path.basename(dest)}' 已存在。`
          );
        }
        throw copyError;
      }
      try {
        await options.verifyCopiedDestination?.(stagedSource);
        await assertCopiedDirectoryUnchanged(stagedSource, dest, stagedFingerprint);
      } catch (verificationError) {
        await fs.rm(dest, { recursive: true, force: true }).catch(() => undefined);
        try {
          await fs.rename(stagedSource, src);
        } catch (restoreError) {
          throw new Error(
            `${verificationError instanceof Error ? verificationError.message : String(verificationError)} ` +
              `无法恢复暂存的源目录 ${stagedSource} ` +
              `（${restoreError instanceof Error ? restoreError.message : String(restoreError)}）。`
          );
        }
        throw verificationError;
      }
      try {
        await fs.rm(stagedSource, { recursive: true, force: true });
      } catch (cleanupError) {
        // 递归删除可能已经删除了部分源目录。
        // 目标现在是唯一完整副本，因此在尝试让失败的移动
        // 看起来原子化时，切勿将其擦除。
        throw new MoveDestinationRetainedError(
          `已将 ${src} 复制到 ${dest}，但无法完全删除暂存的源目录 ` +
            `${stagedSource} ` +
            `（${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}）。` +
            `完整的目标目录已保留用于恢复。`
        );
      }
    } else {
      throw err;
    }
  }
}

async function assertArchiveDestinationAvailable(
  archivePath: string,
  archiveName: string
): Promise<void> {
  try {
    await fs.lstat(archivePath);
    throw new ArchiveBlockedError(
      'archive_target_exists',
      `归档 '${archiveName}' 已存在。`
    );
  } catch (error: any) {
    if (error instanceof ArchiveBlockedError) throw error;
    if (error.code !== 'ENOENT') throw error;
  }
}

function archiveClaimPath(archivePath: string, _archiveName: string): string {
  return path.join(path.dirname(archivePath), '.openspec-archive.lock');
}

interface ArchiveClaim {
  handle: Awaited<ReturnType<typeof fs.open>>;
  contents: string;
}

async function releaseArchiveClaim(
  claim: ArchiveClaim,
  claimPath: string
): Promise<void> {
  const owned = await claim.handle.stat({ bigint: true }).catch(() => undefined);
  await claim.handle.close().catch(() => undefined);
  if (owned === undefined) return;
  try {
    // 有意设计的两次 lstat 之间读取：下方的身份+内容匹配
    // 证明我们在取消链接之前仍拥有此声明。这是一个并发变更检测器，
    // 而非解决 fd-less 竞争的"修复"（CodeQL js/file-system-race）。
    const current = await fs.lstat(claimPath, { bigint: true });
    const contents = await fs.readFile(claimPath, 'utf8');
    const currentAfterRead = await fs.lstat(claimPath, { bigint: true });
    if (
      current.dev === owned.dev &&
      current.ino === owned.ino &&
      current.dev === currentAfterRead.dev &&
      current.ino === currentAfterRead.ino &&
      contents === claim.contents
    ) {
      await fs.unlink(claimPath);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

async function claimArchiveDestination(
  archivePath: string,
  archiveName: string
): Promise<ArchiveClaim> {
  const claimPath = archiveClaimPath(archivePath, archiveName);
  try {
    const handle = await fs.open(claimPath, 'wx');
    const claim = {
      handle,
      contents: JSON.stringify({ pid: process.pid, nonce: randomUUID() }),
    };
    try {
      await handle.writeFile(claim.contents);
      await handle.sync();
      return claim;
    } catch (error) {
      await releaseArchiveClaim(claim, claimPath).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new ArchiveBlockedError(
        'archive_target_exists',
        `归档 '${archiveName}' 正在创建中。如果没有归档进程在运行，` +
          `请删除过期的声明文件 ${claimPath} 后重新运行。`
      );
    }
    throw error;
  }
}

interface SpecSnapshot {
  target: string;
  existed: boolean;
  outcome: 'write' | 'retire';
  expectedContent?: Buffer;
  content?: Buffer;
  contentExisted?: boolean;
  mode?: number;
  symlink?: string;
  displacedPath?: string;
  displacedFingerprint?: string;
}

interface SpecMutation {
  update: SpecUpdate;
  outcome: 'write' | 'retire';
  rebuilt: string;
}

function statIdentity(value: {
  dev: bigint;
  ino: bigint;
  mode: bigint;
  size: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
}): string {
  return `${value.dev}:${value.ino}:${value.mode}:${value.size}:${value.mtimeNs}:${value.ctimeNs}`;
}

function movableStatIdentity(value: {
  dev: bigint;
  ino: bigint;
  mode: bigint;
  size: bigint;
}): string {
  return `${value.dev}:${value.ino}:${value.mode}:${value.size}`;
}

async function fingerprintPath(filePath: string): Promise<string> {
  try {
    const stat = await fs.lstat(filePath, { bigint: true });
    const digest = async (): Promise<string> =>
      createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
    if (stat.isSymbolicLink()) {
      const link = await fs.readlink(filePath);
      try {
        const referentBefore = await fs.stat(filePath, { bigint: true });
        const hash = await digest();
        const referentAfter = await fs.stat(filePath, { bigint: true });
        const entryAfter = await fs.lstat(filePath, { bigint: true });
        if (
          statIdentity(stat) !== statIdentity(entryAfter) ||
          statIdentity(referentBefore) !== statIdentity(referentAfter) ||
          link !== (await fs.readlink(filePath))
        ) {
          throw new Error(`归档读取时路径发生变化：${filePath}。`);
        }
        return `symlink:${statIdentity(stat)}:${link}:${statIdentity(referentAfter)}:${hash}`;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return `symlink:${statIdentity(stat)}:${link}:missing`;
        }
        throw error;
      }
    }
    if (stat.isFile()) {
      const hash = await digest();
      const after = await fs.lstat(filePath, { bigint: true });
      if (statIdentity(stat) !== statIdentity(after)) {
        throw new Error(`归档读取时路径发生变化：${filePath}。`);
      }
      return `file:${statIdentity(after)}:${hash}`;
    }
    return `other:${statIdentity(stat)}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'missing';
    throw error;
  }
}

async function fingerprintMovablePath(filePath: string): Promise<string> {
  try {
    const entry = await fs.lstat(filePath, { bigint: true });
    // 故意的 stat -> read -> re-stat 序列：并发变更通过下方的
    // statIdentity 比较被检测到并抛出。不要简化为 fd I/O，因为
    // 那会锁定同一个 inode 使检测器失效（CodeQL js/file-system-race）。
    const hash = createHash('sha256')
      .update(await fs.readFile(filePath))
      .digest('hex');
    if (entry.isSymbolicLink()) {
      const link = await fs.readlink(filePath);
      const referent = await fs.stat(filePath, { bigint: true });
      const entryAfter = await fs.lstat(filePath, { bigint: true });
      const referentAfter = await fs.stat(filePath, { bigint: true });
      const linkAfter = await fs.readlink(filePath);
      if (
        statIdentity(entry) !== statIdentity(entryAfter) ||
        statIdentity(referent) !== statIdentity(referentAfter) ||
        link !== linkAfter
      ) {
        throw new Error(`归档读取时路径发生变化：${filePath}。`);
      }
      return (
        `symlink:${movableStatIdentity(entry)}:${link}:` +
        `${movableStatIdentity(referentAfter)}:${hash}`
      );
    }
    const entryAfter = await fs.lstat(filePath, { bigint: true });
    if (statIdentity(entry) !== statIdentity(entryAfter)) {
      throw new Error(`归档读取时路径发生变化：${filePath}。`);
    }
    return `file:${movableStatIdentity(entry)}:${hash}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'missing';
    throw error;
  }
}

async function fingerprintPortableContent(filePath: string): Promise<string> {
  try {
    const entry = await fs.lstat(filePath);
    // 设计上的时间点内容哈希（不重新 stat）：调用者将其与之前
    // 同一字节的指纹进行比较，因此任何并发变更都会表现为
    // 哈希不匹配（CodeQL js/file-system-race 在这里是误报）。
    const hash = createHash('sha256')
      .update(await fs.readFile(filePath))
      .digest('hex');
    return entry.isSymbolicLink()
      ? `symlink:${await fs.readlink(filePath)}:${hash}`
      : `file:${hash}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'missing';
    throw error;
  }
}

/** 如果授权退休的元数据丢失其快照，则安全失败。 */
async function assertRetirementAuthorization(
  changeDir: string,
  expectedFingerprint: string,
  options: { verifyMarker?: boolean } = {}
): Promise<void> {
  const metadataPath = path.join(changeDir, METADATA_FILENAME);
  const before = await fingerprintPortableContent(metadataPath);
  const markerStillDeclared =
    options.verifyMarker === false || readRetireCapabilitiesMarker(changeDir).declared;
  const after = await fingerprintPortableContent(metadataPath);
  if (
    before !== expectedFingerprint ||
    after !== expectedFingerprint ||
    !markerStillDeclared
  ) {
    throw new Error(
      `在归档完成前，${METADATA_FILENAME} 的退休授权已发生变更。`
    );
  }
}

async function fingerprintSpecInputs(update: SpecUpdate): Promise<string> {
  return `${await fingerprintPath(update.source)}\n${await fingerprintPath(update.target)}`;
}

async function mutationTargetIdentity(mutation: SpecMutation): Promise<string> {
  try {
    const stat = await fs.stat(mutation.update.target, { bigint: true });
    return `${stat.dev}:${stat.ino}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const parent = path.dirname(mutation.update.target);
      const realParent = await fs.realpath(parent).catch(() => path.resolve(parent));
      return `missing:${path.join(realParent, path.basename(mutation.update.target))}`;
    }
    throw error;
  }
}

async function assertDistinctMutationTargets(mutations: SpecMutation[]): Promise<void> {
  const owners = new Map<string, string>();
  for (const mutation of mutations) {
    const identity = await mutationTargetIdentity(mutation);
    const existing = owners.get(identity);
    if (existing !== undefined) {
      throw new Error(
        `'${existing}' 和 '${mutation.update.id}' 的 spec 更新解析到同一个目标 ` +
          `${identity}。请替换 capability 别名或在归档前合并增量。`
      );
    }
    owners.set(identity, mutation.update.id);
  }
}

async function captureSpecSnapshots(mutations: SpecMutation[]): Promise<SpecSnapshot[]> {
  return Promise.all(
    mutations.map(async ({ update, outcome, rebuilt }) => {
      try {
        const stat = await fs.lstat(update.target);
        if (stat.isSymbolicLink()) {
          let content: Buffer | undefined;
          let contentExisted = false;
          if (outcome === 'write') {
            try {
              // 尽力而为的回滚快照；并发编辑稍后会被
              // restoreSpecSnapshots 通过拒绝覆盖不匹配内容来捕获，
              // 而非在此处理（CodeQL js/file-system-race）。
              content = await fs.readFile(update.target);
              contentExisted = true;
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            }
          }
          return {
            target: update.target,
            existed: true,
            outcome,
            ...(outcome === 'write' ? { expectedContent: Buffer.from(rebuilt) } : {}),
            content,
            contentExisted,
            symlink: await fs.readlink(update.target),
          };
        }
        return {
          target: update.target,
          existed: true,
          outcome,
          ...(outcome === 'write' ? { expectedContent: Buffer.from(rebuilt) } : {}),
          // 为回滚读取快照；restoreSpecSnapshots 会在恢复前重新检查此
          // 内容，因此运行中途的变更会中止而不是覆盖
          // （CodeQL js/file-system-race 此处为有意行为）。
          ...(stat.isFile() ? { content: await fs.readFile(update.target) } : {}),
          ...(stat.isFile() ? { mode: stat.mode } : {}),
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return {
            target: update.target,
            existed: false,
            outcome,
            ...(outcome === 'write' ? { expectedContent: Buffer.from(rebuilt) } : {}),
          };
        }
        throw error;
      }
    })
  );
}

async function restoreSpecSnapshots(snapshots: SpecSnapshot[]): Promise<void> {
  const errors: Error[] = [];
  for (const snapshot of [...snapshots].reverse()) {
    try {
      if (snapshot.outcome === 'retire') {
        if (snapshot.displacedPath !== undefined) {
          try {
            await fs.lstat(snapshot.target);
            throw new Error(
              `归档回滚将覆盖 ${snapshot.target} 处的并发变更。` +
                `已移置的 spec 保留在 ${snapshot.displacedPath}。`
            );
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
          await fs.rename(snapshot.displacedPath, snapshot.target);
          snapshot.displacedPath = undefined;
          continue;
        }
        try {
          const current = await fs.lstat(snapshot.target);
          const unchangedSymlink =
            snapshot.symlink !== undefined &&
            current.isSymbolicLink() &&
            (await fs.readlink(snapshot.target)) === snapshot.symlink;
          // 重新读取以确认目标仍持有快照内容；
          // 不匹配意味着并发编辑，回滚会在下方抛出而非覆盖
          // （CodeQL js/file-system-race 此处为有意行为）。
          const unchangedFile =
            snapshot.symlink === undefined &&
            snapshot.content !== undefined &&
            current.isFile() &&
            (await fs.readFile(snapshot.target)).equals(snapshot.content);
          if (unchangedSymlink || unchangedFile) continue;
          throw new Error(
            `归档回滚将覆盖 ${snapshot.target} 处的并发变更。`
          );
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      } else {
        let current;
        try {
          current = await fs.lstat(snapshot.target);
        } catch (error) {
          if (
            (error as NodeJS.ErrnoException).code === 'ENOENT' &&
            !snapshot.existed
          ) {
            continue;
          }
          throw error;
        }
        if (
          (snapshot.symlink !== undefined &&
            (!current.isSymbolicLink() ||
              (await fs.readlink(snapshot.target)) !== snapshot.symlink)) ||
          (snapshot.symlink === undefined &&
            (!current.isFile() ||
              (snapshot.mode !== undefined && current.mode !== snapshot.mode)))
        ) {
          throw new Error(
            `归档回滚将覆盖 ${snapshot.target} 处的并发变更。`
          );
        }
        // 回滚时重新读取：仅当当前内容与归档写入或
        // 快照内容匹配时才恢复；否则中止以保留并发变更
        // （CodeQL js/file-system-race 此处为有意行为）。
        const currentContent = await fs.readFile(snapshot.target);
        const originalContent =
          snapshot.symlink !== undefined && !snapshot.contentExisted
            ? undefined
            : snapshot.content;
        if (
          originalContent !== undefined &&
          currentContent.equals(originalContent)
        ) {
          continue;
        }
        if (
          snapshot.expectedContent === undefined ||
          !currentContent.equals(snapshot.expectedContent)
        ) {
          throw new Error(
            `归档回滚将覆盖 ${snapshot.target} 处的并发变更。`
          );
        }
      }

      if (!snapshot.existed) {
        await fs.rm(snapshot.target, { force: true });
        continue;
      }
      if (snapshot.symlink !== undefined) {
        if (snapshot.outcome === 'retire') {
          await fs.mkdir(path.dirname(snapshot.target), { recursive: true });
          await fs.symlink(snapshot.symlink, snapshot.target);
        } else if (snapshot.contentExisted) {
          await fs.writeFile(snapshot.target, snapshot.content!);
        } else {
          const referent = path.resolve(path.dirname(snapshot.target), snapshot.symlink);
          await fs.rm(referent, { force: true });
        }
        continue;
      }
      if (snapshot.content !== undefined) {
        await fs.mkdir(path.dirname(snapshot.target), { recursive: true });
        await fs.writeFile(snapshot.target, snapshot.content);
        if (snapshot.mode !== undefined) await fs.chmod(snapshot.target, snapshot.mode);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  if (errors.length > 0) {
    throw new Error(errors.map(({ message }) => message).join(' '));
  }
}

async function finalizeRetirementBackups(
  snapshots: SpecSnapshot[],
  mainSpecsDir: string
): Promise<void> {
  const errors: string[] = [];
  for (const snapshot of snapshots) {
    if (snapshot.outcome !== 'retire' || snapshot.displacedPath === undefined) continue;
    const displacedPath = snapshot.displacedPath;
    try {
      if (
        snapshot.displacedFingerprint === undefined ||
        (await fingerprintMovablePath(displacedPath)) !== snapshot.displacedFingerprint
      ) {
        throw new Error('退休验证后移置的 spec 发生了变更');
      }
      await finalizeRetiredSpec(snapshot.target, displacedPath, mainSpecsDir);
      snapshot.displacedPath = undefined;
    } catch (error) {
      errors.push(
        `无法删除已提交的退休备份 ${displacedPath} ` +
          `（${error instanceof Error ? error.message : String(error)}）。`
      );
    }
  }
  if (errors.length > 0) {
    throw new RetirementBackupsRetainedError(
      `${errors.join(' ')} change 保持归档状态，每个列出的备份均已保留用于恢复。`
    );
  }
}

export class ArchiveCommand {
  async execute(changeName?: string, options: ArchiveOptions = {}): Promise<void> {
    const json = !!options.json;

    let root: ResolvedOpenSpecRoot;
    try {
      root = await resolveOpenSpecRoot({
        ...(options.store !== undefined ? { store: options.store } : {}),
        ...(options.storePath !== undefined ? { storePath: options.storePath } : {}),
      });
    } catch (error) {
      if (json && isRootSelectionError(error)) {
        this.printJsonFailure(undefined, toArchiveDiagnostic(error));
        return;
      }
      throw error;
    }

    if (json) {
      try {
        const result = await this.run(changeName, options, root, true);
        if (!result) {
          return;
        }
        console.log(JSON.stringify({ archive: result, root: toRootOutput(root) }, null, 2));
      } catch (error) {
        this.printJsonFailure(root, toArchiveDiagnostic(error));
      }
      return;
    }

    emitStoreRootBanner(root);
    await this.run(changeName, options, root, false);
  }

  private printJsonFailure(root: ResolvedOpenSpecRoot | undefined, diagnostic: ArchiveDiagnostic): void {
    console.log(
      JSON.stringify(
        {
          archive: null,
          ...(root ? { root: toRootOutput(root) } : {}),
          status: [diagnostic],
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }

  /**
   * 共享的归档流程。在人工模式下（json=false），提示和散文输出与
   * 历史行为一致，取消操作返回 null。在 JSON 模式下，无散文输出
   * 到 stdout，每个被阻塞的路径都会抛出异常。
   */
  private async run(
    changeName: string | undefined,
    options: ArchiveOptions,
    root: ResolvedOpenSpecRoot,
    json: boolean
  ): Promise<ArchiveResult | null> {
    const changesDir = root.changesDir;
    const archiveDir = root.archiveDir;
    const mainSpecsDir = root.specsDir;

    for (const [allowedDirectory, managedDir] of [
      [root.path, changesDir],
      [changesDir, archiveDir],
      [root.path, mainSpecsDir],
    ] as const) {
      try {
        FileSystemUtils.assertPathWithin(allowedDirectory, managedDir);
      } catch {
        throw new ArchiveBlockedError(
          'archive_path_outside_root',
          `拒绝通过 OpenSpec 根目录之外的路径进行归档：${managedDir}`
        );
      }
    }

    // 如果未提供 change 名称，则以交互方式获取
    if (!changeName) {
      if (json) {
        throw new ArchiveBlockedError(
          'archive_change_name_required',
          '需要 change 名称：archive --json 为非交互模式。',
          withStoreFlag(root, 'openspec archive <change-name> --json')
        );
      }
      const selectedChange = await this.selectChange(changesDir, root, options);
      if (!selectedChange) {
        console.log('未选择 change。正在中止。');
        return null;
      }
      changeName = selectedChange;
    }

    const changeNameProblem = folderStyleNameProblem(changeName, 'Change name');
    if (changeNameProblem) {
      throw new ArchiveBlockedError('archive_change_name_invalid', changeNameProblem);
    }

    const changeDir = path.join(changesDir, changeName);

    // Verify change exists
    try {
      const stat = await fs.lstat(changeDir);
      if (stat.isSymbolicLink()) {
        throw new ArchiveBlockedError(
          'archive_change_symlink',
          `Change '${changeName}' 是一个符号链接。请在归档前替换为真实目录。`
        );
      }
      if (!stat.isDirectory()) {
        throw new Error(`未找到 change '${changeName}'。`);
      }
    } catch (error) {
      if (error instanceof ArchiveBlockedError) throw error;
      const available = await listActiveChangeNames(changesDir);
      throw new ArchiveBlockedError(
        'archive_change_not_found',
        available.length > 0
          ? `未找到 change '${changeName}'。可用的 change：${available.join(', ')}`
          : `未找到 change '${changeName}'。此根目录中没有活动的 change。`
      );
    }

    const skipValidation = options.validate === false || options.noValidate === true;

    // 归档前验证 spec 和 change
    if (!skipValidation) {
      const validator = new Validator();
      let hasValidationErrors = false;

      // 验证 proposal.md（仅提供信息；人工模式打印警告）
      if (!json) {
        const changeFile = path.join(changeDir, 'proposal.md');
        try {
          await fs.access(changeFile);
          const changeReport = await validator.validateChange(changeFile);
          // Proposal 验证仅提供信息（不阻塞归档）。
          // `validateChange` 将 change 与其增量 spec 一起解析，
          // 因此它也会在 `deltas.<n>.requirement(s)` 下引发需求级别的问题。
          // 这些不是 proposal 问题，在此报告它们之前很嘈杂，
          // 有时甚至是错误的（#498）：change 解析器在 `requirement`
          // 和 `requirements` 两者下记录每个需求，因此每个缺陷被打印两次，
          // 设计上仅包含名称的 REMOVED 需求会为正确的删除
          // 产生"缺失场景"警告。
          // 真正的增量缺陷仍会通过下方的增量 spec 验证
          // 和重建 spec 检查来捕获。
          const proposalIssues = changeReport.issues.filter(
            (issue) => !/^deltas\.\d+\.requirements?\./.test(issue.path)
          );
          if (!changeReport.valid && proposalIssues.length > 0) {
            console.log(chalk.yellow(`\nProposal 警告（非阻塞）在 proposal.md 中：`));
            for (const issue of proposalIssues) {
              const symbol = issue.level === 'ERROR' ? '⚠' : (issue.level === 'WARNING' ? '⚠' : 'ℹ');
              console.log(chalk.yellow(`  ${symbol} ${issue.message}`));
            }
          }
        } catch {
          // Change 文件不存在，跳过验证
        }
      }

      // 如果存在，验证 change 目录下的增量格式 spec 文件
      const changeSpecsDir = path.join(changeDir, 'specs');
      // specs/ 根目录下的 spec.md 永远不会被合并，因此归档包含它的 change
      // 时会丢弃其内容，无论它是否带有增量头部（#1385）。
      // 它的存在本身必须触发验证，验证会报告并阻塞归档。
      // 名为 spec.md 的目录是正常的 capability 文件夹，因此只有常规文件才会计数。
      const rootSpecStat = await fs.stat(path.join(changeSpecsDir, 'spec.md')).catch(() => null);
      let hasDeltaSpecs = rootSpecStat?.isFile() === true;
      // 声明了 skip_specs 的 change 不得在 specs/ 下携带任何文件 —
      // 验证将此报告为冲突，因此归档必须执行相同的检查，
      // 而不是因为文件恰好没有增量头部就跳过验证。
      // 无法遵守的标记（提到了 skip_specs 但元数据未能通过共享格式校验，
      // 或指定了无法解析的 schema）也会强制验证，
      // 因此归档和验证始终对标记保持一致。
      // 无法读取的 specs/ 也会安全失败进入验证流程。
      // （未标记的零增量 change 仍然仅归档非阻塞的 proposal 警告 —
      // 这是标记之前就存在的空白，此处保持不变。）
      if (!hasDeltaSpecs) {
        const marker = readSkipSpecsMarker(changeDir);
        if (marker.invalidReason) {
          hasDeltaSpecs = true;
        } else if (marker.declared) {
          let specsDirHasFiles = true;
          try {
            specsDirHasFiles = await hasAnyFileUnder(changeSpecsDir);
          } catch {
            // fall through with true: let validation surface the conflict
          }
          hasDeltaSpecs = specsDirHasFiles;
        }
      }
      for (const { specFile } of hasDeltaSpecs ? [] : await discoverSpecFiles(changeSpecsDir)) {
        try {
          const content = await fs.readFile(specFile, 'utf-8');
          // 通过验证器的 delta 解析器进行大小写不敏感匹配，因此小写的头部
          // 走与 validate 相同的增量验证路径。
          if (/^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements/im.test(content)) {
            hasDeltaSpecs = true;
            break;
          }
        } catch {}
      }
      if (hasDeltaSpecs) {
        // 此处有意省略 mainSpecsDir：独立的场景丢失检查
        // validate 执行（#1477），与 buildUpdatedSpec 稍后执行的相同，
        // 在此报告只会重新标记该失败。
        const deltaReport = await validator.validateChangeDeltaSpecs(changeDir);
        if (!deltaReport.valid) {
          hasValidationErrors = true;
          if (!json) {
            console.log(chalk.red(`\nChange 增量 spec 中的验证错误：`));
            for (const issue of deltaReport.issues) {
              if (issue.level === 'ERROR') {
                console.log(chalk.red(`  ✗ ${issue.message}`));
              } else if (issue.level === 'WARNING') {
                console.log(chalk.yellow(`  ⚠ ${issue.message}`));
              }
            }
          }
        }
      }

      if (hasValidationErrors) {
        if (json) {
          throw new ArchiveBlockedError(
            'archive_validation_failed',
            `Change '${changeName}' 的验证失败。`,
            `运行 ${withStoreFlag(root, `openspec validate ${changeName}`)} 查看详情，修复错误后重新运行，或使用 --no-validate 重新运行。`
          );
        }
        console.log(chalk.red('\n验证失败。请在归档前修复错误。'));
        console.log(chalk.yellow('要跳过验证（不推荐），请使用 --no-validate 标志。'));
        process.exitCode = 1;
        return null;
      }
    } else if (json) {
      if (!options.yes) {
        throw new ArchiveBlockedError(
          'archive_confirmation_required',
          '跳过验证需要确认：请使用 --yes 重新运行。',
          withStoreFlag(root, 'openspec archive <change-name> --json --no-validate --yes')
        );
      }
    } else {
      // 跳过验证时记录警告
      const timestamp = new Date().toISOString();

      if (!options.yes) {
        const proceed = await confirmOrBlock(
          {
            message: chalk.yellow('⚠️  WARNING: Skipping validation may archive invalid specs. Continue? (y/N)'),
            default: false
          },
          () =>
            new ArchiveBlockedError(
              'archive_confirmation_required',
              '跳过验证需要确认，且无法从 stdin 读取答案。',
              rerunCommand(root, changeName!, options)
            )
        );
        if (!proceed) {
          console.log('归档已取消。');
          return null;
        }
      } else {
        console.log(chalk.yellow(`\n⚠️  警告：跳过验证可能会归档无效的 spec。`));
      }

      console.log(chalk.yellow(`[${timestamp}] 已跳过 change 的验证：${changeName}`));
      console.log(chalk.yellow(`受影响的文件：${changeDir}`));
    }

    // 显示进度并检查未完成的任务
    const progress = await getTaskProgressForChange(changesDir, changeName, path.resolve(changesDir, '..', '..'));
    if (!json) {
      const status = formatTaskStatus(progress);
      console.log(`任务状态：${status}`);
    }

    const incompleteTasks = Math.max(progress.total - progress.completed, 0);
    if (incompleteTasks > 0) {
      if (json) {
        if (!options.yes) {
          throw new ArchiveBlockedError(
            'archive_tasks_incomplete',
            `Change '${changeName}' 有 ${incompleteTasks} 个未完成的任务。`,
            '请完成任务或使用 --yes 重新运行。'
          );
        }
      } else if (!options.yes) {
        const proceed = await confirmOrBlock(
          {
            message: `警告：发现 ${incompleteTasks} 个未完成的任务。是否继续？`,
            default: false
          },
          () =>
            new ArchiveBlockedError(
              'archive_tasks_incomplete',
              `Change '${describeChangeName(changeName!)}' 有 ${incompleteTasks} 个未完成的任务，且无法从 stdin 读取答案。`,
              `请完成任务或使用 ${rerunCommand(root, changeName!, options)} 重新运行。`
            )
        );
        if (!proceed) {
          console.log('归档已取消。');
          return null;
        }
      } else {
        console.log(`警告：发现 ${incompleteTasks} 个未完成的任务。由于 --yes 标志，继续执行。`);
      }
    }

    // 在触碰任何 spec 之前先确定归档目标。名称仅取决于 change，
    // 冲突是常见的（一天内归档两次，恢复的 change），因此在合并后
    // 才发现冲突会导致 spec 被重写 — 或 capability 被退休 —
    // 而归档从未发生。
    //
    // 已经带有日期前缀的名称保留其前缀：重新加前缀会导致名称结巴，
    // 当归档在稍后的日期运行时，文件夹会被排序到 change
    // 未发生的日期之下（#1309）。
    const archiveName = ARCHIVE_DATE_PREFIX_PATTERN.test(changeName)
      ? changeName
      : `${formatLocalDate()}-${changeName}`;
    const archivePath = path.join(archiveDir, archiveName);

    // 在触碰任何 spec 之前读取：此 change 是否被允许退休 capability。
    // 无效的标记视为未声明，与 skip_specs 处理方式相同，
    // 因此 CLI 其余部分拒绝的元数据永远不能授权删除。
    const retirementMarker = readRetireCapabilitiesMarker(changeDir);
    const retirementDeclared = retirementMarker.declared;
    const retirementAuthorizationFingerprint = retirementDeclared
      ? await fingerprintPortableContent(path.join(changeDir, METADATA_FILENAME))
      : undefined;

    await assertArchiveDestinationAvailable(archivePath, archiveName);
    await fs.mkdir(archiveDir, { recursive: true });
    const claimPath = archiveClaimPath(archivePath, archiveName);
    let archiveClaim: ArchiveClaim | undefined;

    try {
      // 除非设置了 skipSpecs 标志，否则处理 spec 更新
      let specsUpdated = false;
      let totals: ArchiveResult['totals'];
      const specWarnings: string[] = [];
      let changeArchived = false;
      if (options.skipSpecs) {
      if (!json) {
        console.log('正在跳过 spec 更新（已提供 --skip-specs 标志）。');
      }
    } else {
      // 查找需要更新的 spec
      const specUpdates = await findSpecUpdates(changeDir, mainSpecsDir);

      if (specUpdates.length > 0) {
        if (!json) {
          console.log('\n待更新的 spec：');
          for (const update of specUpdates) {
            const status = update.exists ? '更新' : '创建';
            const capability = update.id;
            console.log(`  ${capability}: ${status}`);
          }
        }

        // 在请求应用权限之前构建提议的更新。
        // buildUpdatedSpec 还会报告合并会丢弃的内容，因此确认
        // 必须在此预览之后进行。
        const prepared: Array<{
          update: SpecUpdate;
          rebuilt: string;
          counts: { added: number; modified: number; removed: number; renamed: number };
          outcome: SpecOutcome;
          noRequirementBlocks: boolean;
          unaccountedContent: string[];
          sourceFingerprint: string;
          sourceContentFingerprint: string;
          targetFingerprint: string;
          targetMovableFingerprint: string;
        }> = [];
        let prepareError: unknown;
        try {
          for (const update of specUpdates) {
            const sourceBeforeBuild = await fingerprintPath(update.source);
            const targetBeforeBuild = await fingerprintPath(update.target);
            const built = await buildUpdatedSpec(update, changeName!, { silent: true });
            const sourceAfterBuild = await fingerprintPath(update.source);
            const targetAfterBuild = await fingerprintPath(update.target);
            if (
              sourceBeforeBuild !== sourceAfterBuild ||
              targetBeforeBuild !== targetAfterBuild
            ) {
              throw new Error(
                `归档准备预览时 '${update.id}' 的 spec 输入发生了变化。`
              );
            }
            prepared.push({
              update,
              rebuilt: built.rebuilt,
              counts: built.counts,
              outcome: await decideSpecOutcome(
                update,
                built,
                skipValidation,
                retirementDeclared
              ),
              noRequirementBlocks: built.noRequirementBlocks,
              unaccountedContent: built.unaccountedContent,
              sourceFingerprint: sourceAfterBuild,
              sourceContentFingerprint: await fingerprintPortableContent(update.source),
              targetFingerprint: targetAfterBuild,
              targetMovableFingerprint: await fingerprintMovablePath(update.target),
            });
            specWarnings.push(...built.warnings);
          }
        } catch (err: unknown) {
          // 用户仍可以拒绝 spec 更新并归档 change，
          // 就像此预览存在之前一样。延迟错误直到他们接受。
          prepareError = err;
        }
        if (prepareError === undefined && !json) {
          for (const warning of specWarnings) {
            console.log(chalk.yellow(`⚠️  警告：${warning}`));
          }
        }

        let shouldUpdateSpecs = true;
        if (!options.yes) {
          if (json) {
            throw new ArchiveBlockedError(
              'archive_confirmation_required',
              `更新 ${specUpdates.length} 个 spec 需要确认：请使用 --yes 重新运行。`,
              withStoreFlag(root, 'openspec archive <change-name> --json --yes')
            );
          }
          shouldUpdateSpecs = await confirmOrBlock(
            {
              message: '是否继续进行 spec 更新？',
              default: true
            },
            () =>
              new ArchiveBlockedError(
                'archive_confirmation_required',
                '更新 ${specUpdates.length} 个 spec 需要确认，且无法从 stdin 读取答案。',
                rerunCommand(root, changeName!, options)
              )
          );
          if (!shouldUpdateSpecs) {
            console.log('正在跳过 spec 更新。继续归档。');
          }
        }

        if (shouldUpdateSpecs) {
          // 确认可能在另一个编辑器更改主 spec 时保持打开。
          // 切勿将提示之前构建的提议应用到更新的基线：
          // 特别是，过期的退休决定绝不能删除等待提示时
          // 添加的需求。
          if (prepareError === undefined) {
            try {
              const currentRetirementMarker = readRetireCapabilitiesMarker(changeDir);
              if (
                currentRetirementMarker.declared !== retirementMarker.declared ||
                currentRetirementMarker.invalidReason !== retirementMarker.invalidReason
              ) {
                throw new Error(
                  `归档等待确认时 ${METADATA_FILENAME} 的退休授权发生了变更。`
                );
              }
              const currentUpdates = await findSpecUpdates(changeDir, mainSpecsDir);
              const currentById = new Map(currentUpdates.map((update) => [update.id, update]));
              if (currentUpdates.length !== prepared.length) {
                throw new Error('归档等待确认时 change spec 发生了变更。');
              }
              for (const proposed of prepared) {
                const current = currentById.get(proposed.update.id);
                if (!current) {
                  throw new Error(
                    `归档等待确认时 '${proposed.update.id}' 的增量发生了变更。`
                  );
                }
                if (
                  (await fingerprintPath(current.source)) !== proposed.sourceFingerprint ||
                  (await fingerprintPath(current.target)) !== proposed.targetFingerprint
                ) {
                  throw new Error(
                    `归档等待确认时 '${proposed.update.id}' 的 spec 输入发生了变化。` +
                      '未更改任何文件；请查看新内容后重新运行。'
                  );
                }
                const rebuilt = await buildUpdatedSpec(current, changeName!, { silent: true });
                const outcome = await decideSpecOutcome(
                  current,
                  rebuilt,
                  skipValidation,
                  retirementDeclared
                );
                if (
                  current.exists !== proposed.update.exists ||
                  rebuilt.rebuilt !== proposed.rebuilt ||
                  JSON.stringify(rebuilt.counts) !== JSON.stringify(proposed.counts) ||
                  outcome !== proposed.outcome
                ) {
                  throw new Error(
                    `归档等待确认时主 spec '${proposed.update.id}' 发生了变更。` +
                      '未更改任何文件；请查看新内容后重新运行。'
                  );
                }
              }
            } catch (error) {
              prepareError = error;
            }
          }

          if (prepareError !== undefined) {
            const message =
              prepareError instanceof Error ? prepareError.message : String(prepareError);
            if (json) {
              throw new ArchiveBlockedError(
                'archive_spec_update_failed',
                message,
                '请修复 change 增量 spec 并重新运行。未更改任何文件。'
              );
            }
            console.log(message);
            console.log('已中止。未更改任何文件。');
            process.exitCode = 1;
            return null;
          }

          // 在写入任何重建的 spec 之前先验证每个，这样
          // 晚期验证失败确实会使所有目标保持不变。
          if (!skipValidation) {
            for (const p of prepared) {
              // 退休已经过验证器检查，仅因"无需求"而失败 —
              // 没有可写入的 spec，因此重新报告该错误只会中止修复（#1302）。
              if (p.outcome !== 'write') continue;
              const specName = p.update.id;
              const report = await new Validator().validateSpecContent(specName, p.rebuilt);
              if (!report.valid) {
                // 本次运行清空了 capability，"无需求" 是 spec 唯一的错误
                // — 因此退休是 archive 应该做的，也是实现这一点
                // 的唯一方式。并不总是*唯一*的修复：活跃的需求可能
                // 隐藏在验证器未到达的第二个 `## Requirements` 区块中，
                // 合并这些区块可以修复该 spec 而无需删除。
                const emptiedByThisRun =
                  p.update.exists &&
                  p.counts.removed > 0 &&
                  p.noRequirementBlocks &&
                  (await isRetirableSpec(specName, p.rebuilt));
                // 死胡同 #1302 描述：重建的 spec 因唯一一个原因不可写入，
                // 退休 capability 是修复方法 — 但只有作者才能授权删除 spec，
                // 因此中止操作会提及标记，而不是直接拒绝。
                // 仅在标记是唯一缺失项时才这样说，确保不会引导用户添加
                // 无法帮助的标记。
                const retirementHint =
                  !retirementDeclared && emptiedByThisRun && p.unaccountedContent.length === 0
                    ? `此 change 移除了 '${specName}' 的最后一个需求。要退休此` +
                      ` capability 并删除其 spec，请在 change 的 ${METADATA_FILENAME} 中` +
                      ` 添加 \`retire_capabilities: true\`（与其 \`schema:\` 并列，该文件需要此项），` +
                      `然后重新运行。` +
                      (retirementMarker.invalidReason
                        ? ` 当前标记无法被遵守（${retirementMarker.invalidReason}）。`
                        : '')
                    : undefined;
                // #1696：标记缺失且文件包含退休无法解释的内容，
                // 因此此中止操作根本没有说明任何内容 — 只是
                // "必须至少有一个需求"，没有前进的路径。
                // 它改为命名内容而非标记，这是有意的：仅在添加标记
                // 确实能通过归档时才会命名标记，此处不会。
                // 一旦内容解决，重新运行时会命名标记。
                const blockedRetirementHint =
                  !retirementDeclared && emptiedByThisRun && p.unaccountedContent.length > 0
                    ? `此 change 移除了 '${specName}' 的最后一个需求，因此重建的 ` +
                      `spec 不再有需求且无法写入。退休 capability 是 archive ` +
                      `的替代操作，但当 spec 包含合并无法安全解释的内容时会被拒绝，` +
                      `删除文件会一并带走这些内容：` +
                      `${describeUnaccountedContent(p.unaccountedContent)}。 ` +
                      '请将其移入 `## Purpose` 或规范需求中，或手动删除 spec，然后重新运行。' +
                      // 此处也提及，因为作者查看标记时
                      // 认为标记授权了删除，不应在发现标记从未被读取之前
                      // 必须清除内容。
                      (retirementMarker.invalidReason
                        ? ` 当前标记无法被遵守（${retirementMarker.invalidReason}）。`
                        : '')
                    : undefined;
                // 设置了标记但退休仍被拒绝。什么都不说让完全按照文档要求
                // 操作的作者回到了没有信号表明他们的标记已被读取的
                // 原始死胡同。
                // 作者请求退休却只得到普通的验证中止。说明造成阻碍的行。
                const refusalReason =
                  retirementDeclared &&
                  p.unaccountedContent.length > 0 &&
                  (await isRetirableSpec(specName, p.rebuilt))
                    ? `'${specName}' 声明了 retire_capabilities，但 spec 包含合并 ` +
                      `无法安全解释的内容，删除文件会一并带走这些内容：` +
                      `${describeUnaccountedContent(p.unaccountedContent)}。 ` +
                      '请将其移入 `## Purpose` 或规范需求中，或手动删除 spec。'
                    : undefined;
                if (json) {
                  throw new ArchiveBlockedError(
                    'archive_spec_validation_failed',
                    `'${specName}' 的重建 spec 验证失败。未更改任何文件。`,
                    refusalReason ??
                      retirementHint ??
                      blockedRetirementHint ??
                      `修复 change 增量后运行 ${withStoreFlag(root, `openspec validate ${specName}`)}。`
                  );
                }
                console.log(chalk.red(`\n重建的 spec ${specName} 中的验证错误（不会写入更改）：`));
                for (const issue of report.issues) {
                  if (issue.level === 'ERROR') console.log(chalk.red(`  ✗ ${issue.message}`));
                  else if (issue.level === 'WARNING') console.log(chalk.yellow(`  ⚠ ${issue.message}`));
                }
                if (retirementHint) console.log(chalk.yellow(`  → ${retirementHint}`));
                if (blockedRetirementHint) console.log(chalk.yellow(`  → ${blockedRetirementHint}`));
                if (refusalReason) console.log(chalk.yellow(`  → ${refusalReason}`));
                console.log('已中止。未更改任何文件。');
                process.exitCode = 1;
                return null;
              }
            }
          }

          // 合法的并发归档无法通过独占声明，
          // 同时此操作会捕获外部进程在确认提示期间创建最终目标的情况。
          // 在首次 spec 变更前检查，确保冲突不会导致写入或退休操作搁浅。
          await assertArchiveDestinationAvailable(archivePath, archiveName);
          archiveClaim = await claimArchiveDestination(archivePath, archiveName);
          await assertArchiveDestinationAvailable(archivePath, archiveName);
          const mutations = prepared
            .filter(
              ({ outcome, counts }) =>
                outcome === 'retire' ||
                (outcome === 'write' &&
                  counts.added + counts.modified + counts.removed + counts.renamed > 0)
            )
            .map(({ update, outcome, rebuilt }) => ({
              update,
              outcome: outcome as 'write' | 'retire',
              rebuilt,
            }));
          const hasRetirements = mutations.some(({ outcome }) => outcome === 'retire');
          await assertDistinctMutationTargets(mutations);
          for (const proposed of prepared) {
            if (
              (await fingerprintPath(proposed.update.source)) !== proposed.sourceFingerprint ||
              (await fingerprintPath(proposed.update.target)) !== proposed.targetFingerprint
            ) {
              throw new Error(
                `Spec inputs for '${proposed.update.id}' changed before archive could apply them. ` +
                  'No files were changed; review the new content and rerun.'
              );
            }
          }
          const specSnapshots = await captureSpecSnapshots(mutations);
          const specSnapshotsByTarget = new Map(
            specSnapshots.map((snapshot) => [snapshot.target, snapshot])
          );

          const mutationAttempts = new Set<string>();
          try {
            // 所有验证已通过；写入文件并显示计数
            const writeTotals = { added: 0, modified: 0, removed: 0, renamed: 0 };
            let wroteAny = false;
          for (const p of prepared) {
            // 删除操作推迟到下方的循环。
            if (p.outcome !== 'write') continue;
            const { added, modified, removed, renamed } = p.counts;
            if (added + modified + removed + renamed === 0) {
              // 每个操作都已同步：重写文件只会将规范化差异引入其中。
              continue;
            }
            await writeUpdatedSpec(p.update, p.rebuilt, p.counts, {
              silent: json,
              beforeMutate: async () => {
                if (
                  (await fingerprintSpecInputs(p.update)) !==
                  `${p.sourceFingerprint}\n${p.targetFingerprint}`
                ) {
                  throw new Error(
                    `Spec inputs for '${p.update.id}' changed before archive could write them.`
                  );
                }
                mutationAttempts.add(p.update.target);
              },
              // 选择了 store 时，跨根路径必须是绝对路径。
              ...(isStoreSelectedRoot(root) ? { displayPath: p.update.target } : {}),
            });
            wroteAny = true;
            writeTotals.added += added;
            writeTotals.modified += modified;
            writeTotals.removed += removed;
            writeTotals.renamed += renamed;
          }

          // 退休仅在每次写入成功后运行。如果后续变更失败，
          // 下方的快照会恢复所有目标。
          for (const p of prepared) {
            if (p.outcome !== 'retire') continue;
            const { retired, resolvedPath, displacedPath } = await retireSpec(
              p.update,
              mainSpecsDir,
              {
                silent: json,
                deferDelete: true,
                beforeMutate: async () => {
                  if (retirementAuthorizationFingerprint === undefined) {
                    throw new Error(
                    `归档退休前无法获得 ${METADATA_FILENAME} 的退休授权。`
                  );
                  }
                  await assertRetirementAuthorization(
                    changeDir,
                    retirementAuthorizationFingerprint
                  );
                  if (
                    (await fingerprintSpecInputs(p.update)) !==
                    `${p.sourceFingerprint}\n${p.targetFingerprint}`
                  ) {
                    throw new Error(
                    `归档退休前 '${p.update.id}' 的 spec 输入发生了变化。`
                  );
                  }
                  mutationAttempts.add(p.update.target);
                },
                verifyDisplaced: async (displacedPath) => {
                  await assertRetirementAuthorization(
                    changeDir,
                    retirementAuthorizationFingerprint!
                  );
                  if (
                    (await fingerprintMovablePath(displacedPath)) !==
                    p.targetMovableFingerprint
                  ) {
                    throw new Error(
                      `归档为退休确保主 spec '${p.update.id}' 时其发生了变更。`
                    );
                  }
                },
                ...(isStoreSelectedRoot(root) ? { displayPath: p.update.target } : {}),
              }
            );
            if (!retired) continue;
            const retirementSnapshot = specSnapshotsByTarget.get(p.update.target);
            if (retirementSnapshot === undefined || displacedPath === undefined) {
              throw new Error(
                `退休期间无法跟踪 '${p.update.id}' 的移置主 spec。`
              );
            }
            retirementSnapshot.displacedPath = displacedPath;
            retirementSnapshot.displacedFingerprint = p.targetMovableFingerprint;
            wroteAny = true;
            // 在退休过程中应用的重命名仍然发生了；
            // 将所有计数合并确保总数反映了整个增量。
            writeTotals.added += p.counts.added;
            writeTotals.modified += p.counts.modified;
            writeTotals.removed += p.counts.removed;
            writeTotals.renamed += p.counts.renamed;
            // 删除文件是归档结果中 JSON 消费者无法从总数推断的操作，
            // 因此它像每个其他 spec 合并差异一样被记录。
            // Purpose 总是随文件一起，所以它也被命名而不是留给读者
            // 推断，备注中带有恢复文件的命令。
            const lost = ['Purpose'];
            // 从被取消链接的路径派生，永远不从 capability id 重建：
            // 在大小写不敏感的文件系统上，id 和真实目录的大小写可能不同，
            // 而 git 是大小写敏感的，因此从 id 派生的路径是 git 拒绝的路径。
            // `update.target` 从 capability id 构建，因此在大小写不敏感的
            // 文件系统上其大小写可能与实际取消链接的文件不同 —
            // git 是大小写敏感的，因此打印的命令是 git 拒绝的命令。
            // 符号链接到兄弟目录的 capability 目录也有同样的问题。
            // `retiredPath` 带有解析后的路径，因此在有分歧时优先使用它。
            const unlinkedPath = resolvedPath ?? p.update.target;
            // 针对真实根目录测量，因此平台自身的
            // `/var` -> `/private/var` 链接不会被视为越界。真正位于外部
            // 的路径保持绝对路径，这会将其路由到散文指导而非 git 会
            // 拒绝的命令。
            const realRoot = await fs.realpath(root.path).catch(() => root.path);
            const relativeToRoot = path.relative(realRoot, unlinkedPath);
            const insideRoot =
              relativeToRoot !== '' &&
              !relativeToRoot.startsWith('..') &&
              !path.isAbsolute(relativeToRoot);
            const deletedPath =
              isStoreSelectedRoot(root) || !insideRoot
                ? unlinkedPath
                : relativeToRoot.split(path.sep).join('/');
            // 仅在粘贴到归档运行位置时实际有效时才提供命令。
            // 此处的绝对路径意味着文件不在该目录下 — 选中的 store
            // 或符号链接的 capability 目录 — 且 `git checkout HEAD -- <abs>`
            // 在不同工作树中会被拒绝，因此该情况改为提供指导而非
            // 无法运行的命令。没有可移植 shell 拼写的路径也同样处理。
            //
            // 还以 purpose 为条件：文件是否在 `HEAD` 中不是归档能知道的
            // — 较早归档创建的 spec 还没有人提交 — 而承诺恢复是此功能
            // 绝不能出错的声明。
            const pasteablePath = path.isAbsolute(deletedPath)
              ? undefined
              : quoteForShell(`:(top)${deletedPath}`);
            const recovery = pasteablePath
              ? `如果已提交，请使用以下命令恢复：git checkout HEAD -- ${pasteablePath}`
              : `文件已从 ${deletedPath} 删除；如果已提交，请从该 checkout 的历史中恢复。`;
            const retirementNote =
              `${p.update.id} - capability 已退休；删除了主 spec（所有需求已移除` +
              `，由 retire_capabilities 声明）在 ${deletedPath}` +
              `。其 section 也一并删除：${lost.join(', ')}。` +
              recovery;
            specWarnings.push(retirementNote);
            // "正在退休..." 行已经告诉用户文件已删除；
            // 它带走的 section 以及如何恢复，是用户从路径看不到的部分。
            if (!json) {
              console.log(`   ${recovery}`);
            }
            }

            specsUpdated = wroteAny;
            totals = writeTotals;
            if (!json) {
            console.log(
              `总计：+ ${writeTotals.added}, ~ ${writeTotals.modified}, - ${writeTotals.removed}, → ${writeTotals.renamed}`
            );
            console.log(
              wroteAny
                ? 'spec 已成功更新。'
                : 'spec 已保持同步；未更改任何文件。'
            );
            }

            for (const proposed of prepared) {
              if (
                (await fingerprintPath(proposed.update.source)) !==
                proposed.sourceFingerprint
              ) {
                throw new Error(
                  `归档归档前 '${proposed.update.id}' 的增量发生了变更。`
                );
              }
            }
            if (hasRetirements) {
              await assertRetirementAuthorization(
                changeDir,
                retirementAuthorizationFingerprint!
              );
            }
            const verifyArchivedDeltas = async (
              stagedSource?: string
            ): Promise<void> => {
              if (hasRetirements) {
                await assertRetirementAuthorization(
                  archivePath,
                  retirementAuthorizationFingerprint!,
                  // 归档的 change 比活动 change 深一层，
                  // 因此标记读取器无法解析其 schema。
                  // 精确的内容相等证明这是在活动路径已验证过的授权。
                  { verifyMarker: false }
                );
                if (stagedSource) {
                  await assertRetirementAuthorization(
                    stagedSource,
                    retirementAuthorizationFingerprint!
                  );
                }
              }
              for (const proposed of prepared) {
                const archivedSource = path.join(
                  archivePath,
                  path.relative(changeDir, proposed.update.source)
                );
                if (
                  (await fingerprintPortableContent(archivedSource)) !==
                  proposed.sourceContentFingerprint
                ) {
                  throw new Error(
                    `最终移动过程中 '${proposed.update.id}' 的归档增量发生了变更。`
                  );
                }
                if (stagedSource) {
                  const stagedDelta = path.join(
                    stagedSource,
                    path.relative(changeDir, proposed.update.source)
                  );
                  if (
                    (await fingerprintPortableContent(stagedDelta)) !==
                    proposed.sourceContentFingerprint
                  ) {
                    throw new Error(
                      `回退复制过程中 '${proposed.update.id}' 的活动增量发生了变更。`
                    );
                  }
                }
              }
            };
            await moveDirectory(changeDir, archivePath, {
              verifyCopiedDestination: verifyArchivedDeltas,
            });
            changeArchived = true;
            await verifyArchivedDeltas();
            await finalizeRetirementBackups(specSnapshots, mainSpecsDir);
          } catch (error) {
            if (error instanceof MoveDestinationRetainedError) {
              changeArchived = true;
              try {
                await finalizeRetirementBackups(specSnapshots, mainSpecsDir);
              } catch (cleanupError) {
                throw new RetirementBackupsRetainedError(
                  `${error.message} ${
                    cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
                  }`
                );
              }
              throw error;
            }
            if (error instanceof RetirementBackupsRetainedError) throw error;
            const rollbackErrors: Error[] = [];
            try {
              await restoreSpecSnapshots(
                specSnapshots.filter(({ target }) => mutationAttempts.has(target))
              );
            } catch (rollbackError) {
              rollbackErrors.push(
                rollbackError instanceof Error
                  ? rollbackError
                  : new Error(String(rollbackError))
              );
            }
            if (changeArchived) {
              try {
                await moveDirectory(archivePath, changeDir);
                changeArchived = false;
              } catch (rollbackError) {
                rollbackErrors.push(
                  rollbackError instanceof Error
                    ? rollbackError
                    : new Error(String(rollbackError))
                );
              }
            }
            if (rollbackErrors.length > 0) {
              const original = error instanceof Error ? error.message : String(error);
              throw new Error(
                `${original} Rollback also failed: ${rollbackErrors.map(({ message }) => message).join(' ')}`
              );
            }
            throw error;
          }
        }
      }
    }

      // The destination was checked before the merge, so anything claiming it now
    // appeared while we were working. Report that as the collision it is: a raw
    // ENOTEMPTY from rename would otherwise degrade to a bare `archive_error`.
      if (!changeArchived) {
        await assertArchiveDestinationAvailable(archivePath, archiveName);
        archiveClaim = await claimArchiveDestination(archivePath, archiveName);
        await assertArchiveDestinationAvailable(archivePath, archiveName);

        // Create archive directory if needed
        await fs.mkdir(archiveDir, { recursive: true });

        // Move change to archive (uses copy+remove on EPERM/EXDEV, e.g. Windows)
        await moveDirectory(changeDir, archivePath);
        changeArchived = true;
      }

      if (!json) {
        console.log(`Change '${changeName}' 已归档为 '${archiveName}'。`);
      }

      return {
        change: changeName,
        archivedAs: archiveName,
        path: archivePath,
        specsUpdated,
        ...(totals ? { totals } : {}),
        ...(specWarnings.length > 0 ? { warnings: specWarnings } : {}),
      };
    } finally {
      if (archiveClaim) await releaseArchiveClaim(archiveClaim, claimPath).catch(() => undefined);
    }
  }

  private async selectChange(
    changesDir: string,
    root: ResolvedOpenSpecRoot,
    options: ArchiveOptions
  ): Promise<string | null> {
    const { select } = await import('@inquirer/prompts');
    const changeDirs = await listActiveChangeNames(changesDir);

    if (changeDirs.length === 0) {
      console.log('未找到活动的 change。');
      return null;
    }

    // 选择器需要真实的终端，@inquirer 的 `select` 即使被重定向
    // 也会向 stdout 写入 ANSI 光标转义序列 — 与 confirm 提示
    // 修复的 #1526 机制相同。当任一流不是 TTY 时，预先拒绝并给出
    // 捕获的 ExitPromptError 会提供的指导，而不是将产生转义序列的
    // 菜单渲染到管道或文件中。
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new ArchiveBlockedError(
        'archive_change_name_required',
        '需要 change 名称：没有可用的终端来从列表中选择。',
        withStoreFlag(root, `openspec archive <change-name> ${rerunFlags(options).join(' ')}`)
      );
    }

    // 在列表中内联构建带有进度的选项以避免重复列表
    let choices: Array<{ name: string; value: string }> = changeDirs.map(name => ({ name, value: name }));
    try {
      const progressList: Array<{ id: string; status: string }> = [];
      for (const id of changeDirs) {
        const progress = await getTaskProgressForChange(changesDir, id, path.resolve(changesDir, '..', '..'));
        const status = formatTaskStatus(progress);
        progressList.push({ id, status });
      }
      const nameWidth = Math.max(...progressList.map(p => p.id.length));
      choices = progressList.map(p => ({
        name: `${p.id.padEnd(nameWidth)}     ${p.status}`,
        value: p.id
      }));
    } catch {
      // 如果有任何失败，回退到简单名称
      choices = changeDirs.map(name => ({ name, value: name }));
    }

    try {
      const answer = await select({
        message: '选择要归档的 change',
        choices
      });
      return answer;
    } catch (error) {
      // 列表中无人可选：报告"未选择 change"并
      // 以 0 退出会告诉 agent 归档成功了但实际上什么也没发生
      // （#1479）。建议的重新运行带有 --yes，因为相同的
      // 调用者也无法回答下方的确认，调用者自身的标志
      // 也会被保留，因为丢弃 --skip-specs 会建议合并
      // 其被要求保留的 spec 的重新运行。
      if (isNonInteractivePromptError(error)) {
        throw new ArchiveBlockedError(
          'archive_change_name_required',
          '需要 change 名称：无法从 stdin 读取答案。',
          withStoreFlag(root, `openspec archive <change-name> ${rerunFlags(options).join(' ')}`)
        );
      }
      // 用户取消（Ctrl+C）
      return null;
    }
  }
}
