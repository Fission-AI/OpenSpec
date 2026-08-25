import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { createRequire } from 'module';
import chalk from 'chalk';
import { isCiEnvironment } from '../utils/ci.js';
import { getGlobalConfig } from './global-config.js';

const require = createRequire(import.meta.url);
const { name: PACKAGE_NAME, version: OPENSPEC_VERSION } = require('../../package.json');

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
const REQUEST_TIMEOUT_MS = 1500;
const MAX_RESPONSE_BYTES = 256 * 1024;
const VERSION_PROBE_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

/**
 * 我们愿意打印的版本。注册表在这里只提供 SemVer，
 * 所以其他任何内容要么是损坏的镜像，要么是恶意响应 — 由于
 * 这个字符串会落在安装命令旁边的终端中，未经验证的版本
 * 可能会走私 ANSI 光标控件并重绘其周围的行。
 */
const SAFE_VERSION = /^\d{1,10}\.\d{1,10}\.\d{1,10}(?:-[0-9A-Za-z.-]{1,64})?(?:\+[0-9A-Za-z.-]{1,64})?$/;

/**
 * 检查是选择退出的，绝不能造成阻碍：CI 或测试中不进行网络请求，
 * 为离线或隔离环境的用户提供明确的逃生舱，以及
 * telemetry 已经遵守的相同隐私信号 — 设置了 DO_NOT_TRACK
 * 或 telemetry.enabled false 的用户并未同意另一个出站请求。
 */
function isCheckEnabled(): boolean {
  if (process.env.OPENSPEC_NO_UPDATE_CHECK !== undefined) return false;
  if (process.env.DO_NOT_TRACK === '1') return false;
  if (process.env.OPENSPEC_TELEMETRY === '0') return false;
  if (isCiEnvironment()) return false;
  if (process.env.NODE_ENV === 'test') return false;
  // 与 telemetry 相同的配置选择退出（环境变量仍是上面的硬覆盖）。
  if (getGlobalConfig().telemetry?.enabled === false) return false;
  return true;
}

/**
 * 要查询的注册表：仅使用环境变量 npm 导出的注册表
 *（通过 `npm run`，或显式导出）。特意不使用任何 .npmrc 中的
 * `registry=` 行 — 让文件内容决定出站请求的目的地
 * 对于这么小的便利性来说是值得避免的流程，而且项目文件会
 * 随克隆的仓库一起传播。任何使用私有镜像的人可以
 * 导出 `npm_config_registry`，或完全关闭该检查。
 */
export function registryUrl(): string {
  const configured = process.env.npm_config_registry?.trim();
  const base = configured && /^https?:\/\//i.test(configured) ? configured : DEFAULT_REGISTRY;
  return `${base.replace(/\/+$/, '')}/${PACKAGE_NAME}/latest`;
}

/**
 * 按 SemVer 比较两个预发布标签：逐段比较以点分隔的标识符，
 * 数字标识符按数值比较（因此 beta.10 > beta.2），数字排名低于
 * 字母数字，较长的标识符列表获胜。
 */
function comparePrerelease(a: string, b: string): number {
  if (a === b) return 0;
  if (a === '') return 1;
  if (b === '') return -1;

  const left = a.split('.');
  const right = b.split('.');

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const l = left[i];
    const r = right[i];
    if (l === undefined) return -1;
    if (r === undefined) return 1;

    const lNumeric = /^\d+$/.test(l);
    const rNumeric = /^\d+$/.test(r);

    if (lNumeric && rNumeric) {
      const diff = Number.parseInt(l, 10) - Number.parseInt(r, 10);
      if (diff !== 0) return diff > 0 ? 1 : -1;
      continue;
    }
    if (lNumeric !== rNumeric) return lNumeric ? -1 : 1;
    if (l !== r) return l > r ? 1 : -1;
  }

  return 0;
}

/**
 * 比较两个类 semver 的版本。当 a > b 时返回 1，a < b 时返回 -1，
 * 否则返回 0。预发布版本排在其发布版本下方（1.7.0-beta.1 < 1.7.0）。
 */
export function compareVersions(a: string, b: string): number {
  const parse = (version: string) => {
    const withoutBuild = version.trim().replace(/^v/, '').split('+', 1)[0] ?? '';
    const separator = withoutBuild.indexOf('-');
    const core = separator === -1 ? withoutBuild : withoutBuild.slice(0, separator);
    const prerelease = separator === -1 ? '' : withoutBuild.slice(separator + 1);
    const parts = core.split('.').map((n) => Number.parseInt(n, 10));
    return {
      numbers: [parts[0] || 0, parts[1] || 0, parts[2] || 0],
      prerelease,
    };
  };

  const left = parse(a);
  const right = parse(b);

  for (let i = 0; i < 3; i++) {
    if (left.numbers[i] > right.numbers[i]) return 1;
    if (left.numbers[i] < right.numbers[i]) return -1;
  }

  return comparePrerelease(left.prerelease, right.prerelease);
}

/**
 * 读取 `latest` 分发标签。不发送自定义 Accept 头：注册表
 * 对 `/<pkg>/latest` 使用 npm 缩写元数据类型时返回 406，
 * 它仅在完整的包文档中提供。
 *
 * 使用 node:http(s) 而不是 fetch，以便超时可以销毁套接字。
 * 中止仍在完成 TCP 握手的 fetch —— 防火墙
 * 丢弃数据包、强制门户 —— 会让连接句柄保持打开状态，CLI
 * 在操作系统放弃之前无法退出，远远超出提示打印的时间。
 */
function fetchLatestVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (version: string | null) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(version);
    };

    let url: URL;
    try {
      url = new URL(registryUrl());
    } catch {
      resolve(null);
      return;
    }

    // 镜像和企业前端会重定向；不跟随重定向的话
    // 对于它们来说检查将永久静默失效。
    let redirectsLeft = MAX_REDIRECTS;

    // 预算计时器在触发时必须销毁当前打开的请求。
    // 关闭第一跳的请求会让重定向的
    // 套接字保持活动状态：涓滴传输数据的目标会不断重置其空闲
    // 超时，只有正文大小上限能结束它。
    let activeRequest: http.ClientRequest | undefined;

    const send = (target: URL): void => {
      const request = (target.protocol === 'http:' ? http : https).get(
        target,
        { timeout: REQUEST_TIMEOUT_MS },
        (response) => {
          const status = response.statusCode ?? 0;
          const location = response.headers.location;

          if (status >= 300 && status < 400 && location) {
            response.resume();
            request.destroy();
            if (redirectsLeft <= 0) {
              finish(null);
              return;
            }
            redirectsLeft -= 1;
            try {
              const next = new URL(location, target);
              // 从不跟随降级到纯 http：对回复的 MITM 攻击
              // 会控制"更新版本"的答案。
              const downgrade = target.protocol === 'https:' && next.protocol === 'http:';
              if (!downgrade && (next.protocol === 'http:' || next.protocol === 'https:')) {
                send(next);
                return;
              }
            } catch {
              // 无法解析的 Location。
            }
            finish(null);
            return;
          }

          if (status !== 200) {
            response.resume();
            request.destroy();
            finish(null);
            return;
          }

          let body = '';
          response.setEncoding('utf-8');
          response.on('data', (chunk: string) => {
            body += chunk;
            // 分发标签文档很小；拒绝缓冲大量数据。
            if (body.length > MAX_RESPONSE_BYTES) {
              request.destroy();
              finish(null);
            }
          });
          response.on('end', () => {
            try {
              const parsed = JSON.parse(body) as { version?: unknown };
              const version = parsed.version;
              finish(typeof version === 'string' && SAFE_VERSION.test(version) ? version : null);
            } catch {
              finish(null);
            }
          });
          response.on('error', () => finish(null));
        }
      );

      activeRequest = request;

      request.on('timeout', () => {
        request.destroy();
        finish(null);
      });
      request.on('error', () => finish(null));

      // 整个交换过程（包括重定向）只有一个预算计时器。
      if (!timer) {
        timer = setTimeout(() => {
          activeRequest?.destroy();
          finish(null);
        }, REQUEST_TIMEOUT_MS);
      }
    };

    send(url);
  });
}

/**
 * 当已安装的 CLI 落后于已发布版本时返回该版本，否则
 * 返回 null。永不抛出，阻塞时间不超过请求超时。
 */
export async function getAvailableCliUpdate(): Promise<string | null> {
  if (!isCheckEnabled()) return null;

  try {
    const latest = await fetchLatestVersion();
    if (!latest) return null;
    return compareVersions(latest, OPENSPEC_VERSION) > 0 ? latest : null;
  } catch {
    return null;
  }
}

/**
 * 当前运行的 CLI 加载自的目录，无法解析时返回 null。
 * 在升级提示中显示，以便升级了但仍运行旧二进制文件的用户
 * —— 过时的 pnpm/volta/npx 垫片，或 PATH 上的两次安装 —— 可以看到
 * 实际是哪份副本在响应。
 */
export function getInstallDir(): string | null {
  try {
    return path.dirname(require.resolve('../../package.json'));
  } catch {
    return null;
  }
}

/**
 * 当运行的 CLI 解析自被更新项目所属的 `node_modules`
 * 或其任何祖先目录时返回 true —— npm 和 pnpm 工作区
 * 产生的提升根布局。基于目标路径而非工作目录定位，
 * 因为 `openspec update <path>` 和从子包运行都是正常的。
 * 永不抛出：当目录已被删除时 process.cwd() 会失败，
 * 错误的升级提示不应让成功的更新失败。
 */
export function isProjectLocalInstall(
  installDir: string | null,
  projectPath: string = '.'
): boolean {
  if (!installDir) return false;

  // Windows 路径在不同来源的大小写和盘符大小写方面有所不同。
  const normalize = (value: string) =>
    process.platform === 'win32' ? value.toLowerCase() : value;

  try {
    let dir = path.resolve(projectPath);
    const target = normalize(installDir);

    for (;;) {
      if (target.startsWith(normalize(path.join(dir, 'node_modules') + path.sep))) {
        return true;
      }
      const parent = path.dirname(dir);
      if (parent === dir) return false;
      dir = parent;
    }
  } catch {
    return false;
  }
}

/**
 * npx/pnpm dlx/bunx 解压到的临时缓存返回 true。告诉这些
 * 用户全局安装会在 PATH 上创建他们故意避免的第二个副本。
 */
export function isEphemeralRunnerInstall(installDir: string | null): boolean {
  if (!installDir) return false;
  const segments = installDir.split(/[\\/]/).map((segment) => segment.toLowerCase());
  return segments.some(
    (segment, i) =>
      segment === '_npx' ||
      segment === '_bunx' ||
      // 仅包管理器自己的缓存，而不是恰好
      // 被称为 "dlx" 的用户目录。Windows 使用 pnpm-cache 做同样的事情。
      (segment === 'dlx' &&
        ['pnpm', 'bun', '.pnpm', 'pnpm-cache', 'bun-cache'].includes(segments[i - 1] ?? ''))
  );
}

/**
 * npm 安装全局包的目录。从运行中的 node 派生，
 * 而不是通过 shell 调用 `npm prefix -g`，这比版本检查本身成本更高。
 * 只是一个提示：`process.execPath` 被解析为真实路径，因此
 * 在 Homebrew 中它会落在 Cellar 而不是 brew 前缀 —— 这就是
 * 为什么安装自己的布局是下面主要的信号。
 */
export function npmGlobalRoots(): string[] {
  const roots: string[] = [];
  const nodeDir = path.dirname(process.execPath);

  if (process.platform === 'win32') {
    roots.push(path.join(nodeDir, 'node_modules'));
    if (process.env.APPDATA) {
      roots.push(path.join(process.env.APPDATA, 'npm', 'node_modules'));
    }
  } else {
    roots.push(path.resolve(nodeDir, '..', 'lib', 'node_modules'));
  }

  const prefix = process.env.npm_config_prefix;
  if (prefix) {
    roots.push(
      process.platform === 'win32'
        ? path.join(prefix, 'node_modules')
        : path.join(prefix, 'lib', 'node_modules')
    );
  }

  return roots;
}

/**
 * npm 全局安装的前缀，从安装自身的形状读取：
 * POSIX 上为 `<prefix>/lib/node_modules/<pkg>`，Windows 上为
 * `<prefix>/node_modules/<pkg>`。自描述，因此适用于 Homebrew、nvm、Debian
 * 和其他 npm 前缀无法从 node 二进制派生的任何地方。布局不匹配时返回 null。
 */
export function npmPrefixFromInstallDir(installDir: string | null): string | null {
  if (!installDir) return null;

  let dir = installDir;
  for (;;) {
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    if (path.basename(dir).toLowerCase() === 'node_modules') break;
    dir = parent;
  }

  const container = path.dirname(dir);
  if (process.platform === 'win32') return container;
  // POSIX npm 总是将根嵌套在 lib/ 下。
  return path.basename(container).toLowerCase() === 'lib' ? path.dirname(container) : null;
}

/**
 * 仅当 npm 本身拥有此副本时返回 true。其他情况 — pnpm、bun、
 * yarn 或 volta 全局 — 使用 `npm install -g` 只会更糟，因为会添加
 * 可能不是 PATH 上那个的第二个副本。
 */
export function isNpmGlobalInstall(
  installDir: string | null,
  roots: string[] = npmGlobalRoots()
): boolean {
  if (!installDir) return false;
  // 另一个管理器的布局可能看起来仍像 npm 的（volta 嵌套了整个
  // node 安装），所以谁拥有它在确定其位置之前决定。
  if (detectPackageManager(installDir) !== 'npm') return false;

  const normalize = (value: string) =>
    process.platform === 'win32' ? value.toLowerCase() : value;
  const target = normalize(installDir);
  if (roots.some((root) => target.startsWith(normalize(root + path.sep)))) return true;

  // 派生的根目录可能遗漏了不在 node 二进制旁边的前缀，因此
  // 回退到安装自身的形状加上 npm 写入垫片的 bin 目录。
  const prefix = npmPrefixFromInstallDir(installDir);
  if (!prefix) return false;
  try {
    // 用 npm 自己写的东西来佐证：POSIX 上的 bin 目录，
    // Windows 上的 .cmd 垫片。仅前缀并不能证明什么 — 它只是 CLI
    // 解析自的 node_modules 目录的父级，因此手动复制的
    // 可移植树会通过并被提供它从未有过的 npm 升级。
    return fs.existsSync(
      process.platform === 'win32' ? path.join(prefix, 'openspec.cmd') : path.join(prefix, 'bin')
    );
  } catch {
    return false;
  }
}

/**
 * True when the CLI is running from a clone rather than an install. Upgrade
 * advice is meaningless there: the version is whatever the branch says.
 */
export function isSourceCheckout(installDir: string | null): boolean {
  if (!installDir) return false;
  try {
    return fs.existsSync(path.join(installDir, '.git'));
  } catch {
    return false;
  }
}

export type PackageManager = 'npm' | 'pnpm' | 'bun' | 'yarn' | 'volta';

/**
 * The package manager that owns this copy, so the printed command is one the
 * user's setup will actually honor.
 */
export function detectPackageManager(installDir: string | null): PackageManager {
  // Lowercased because the Windows directories are capitalized and undotted:
  // %LOCALAPPDATA%\\Volta, \\Yarn\\Data, \\pnpm-cache.
  const segments = (installDir ?? '').split(/[\\/]/).map((segment) => segment.toLowerCase());
  const has = (...names: string[]) => names.some((name) => segments.includes(name));

  // The undotted spelling exists for Windows (%LOCALAPPDATA%\Volta), whose
  // layout nests tools\image; require both segments so a user or project
  // directory merely named "volta" (even one with its own "tools" dir) does
  // not steal the install.
  if (has('.volta') || (has('volta') && has('tools') && has('image'))) return 'volta';
  if (has('.bun')) return 'bun';
  // These two need a corroborating segment: a directory merely named "pnpm" or
  // "yarn" (a user's home, a project) is not a global install of one.
  if (has('.pnpm-global', 'pnpm-cache')) return 'pnpm';
  if (has('pnpm') && has('global', 'dlx', 'store')) return 'pnpm';
  if (has('.yarn') || (has('yarn') && has('global'))) return 'yarn';
  return 'npm';
}

const GLOBAL_UPGRADE_COMMANDS: Record<PackageManager, string> = {
  npm: `npm install -g ${PACKAGE_NAME}@latest`,
  pnpm: `pnpm add -g ${PACKAGE_NAME}@latest`,
  bun: `bun add -g ${PACKAGE_NAME}@latest`,
  yarn: `yarn global add ${PACKAGE_NAME}@latest`,
  volta: `volta install ${PACKAGE_NAME}@latest`,
};

/**
 * Builds the hint, with the upgrade command chosen for how this copy of the CLI
 * was installed. Pure so every branch is assertable.
 */
export function buildCliUpdateLines(
  latestVersion: string,
  installDir: string | null,
  projectPath: string,
  options: { withCommand?: boolean } = {}
): string[] {
  const lines = [`有新版本的 OpenSpec CLI 可用 (v${OPENSPEC_VERSION} → v${latestVersion})。`];

  // Omitted when we are about to offer to run it — printing a command and then
  // asking to run that same command reads like the user has to do both.
  if (options.withCommand !== false) {
    lines.push(...buildUpgradeCommandLines(installDir, projectPath));
  }
  if (installDir) {
    lines.push(`  运行位置：${installDir}`);
  }

  return lines;
}

/**
 * The upgrade command for however this copy was installed, plus the reminder
 * that instruction files come from the CLI and so need a second pass.
 */
export function buildUpgradeCommandLines(
  installDir: string | null,
  projectPath: string
): string[] {
  const lines: string[] = [];

  if (isEphemeralRunnerInstall(installDir)) {
    // 该命令 *即* 更新，之后无需再运行任何操作。
    lines.push(`  npx ${PACKAGE_NAME}@latest update`);
    return lines;
  }

  if (isProjectLocalInstall(installDir, projectPath)) {
    // 其包管理器拥有 lockfile；指定 npm 可能不正确。
    lines.push(`  更新此项目中的 ${PACKAGE_NAME} 依赖。`);
  } else {
    lines.push(`  ${GLOBAL_UPGRADE_COMMANDS[detectPackageManager(installDir)]}`);
  }

  lines.push('  然后再次运行 "openspec update" 以获取新的 workflows。');
  return lines;
}

// cross-spawn resolves npm's shim on Windows, where spawning "npm" directly
// fails. Loaded lazily so ordinary runs skip its module graph.
let cachedSpawn: typeof import('child_process').spawn | undefined;
function loadSpawn(): typeof import('child_process').spawn {
  if (cachedSpawn === undefined) {
    cachedSpawn = require('cross-spawn') as typeof import('child_process').spawn;
  }
  return cachedSpawn;
}

/**
 * Whether we can run the upgrade for the user instead of only printing it.
 *
 * Only an npm-owned global install qualifies, because `npm install -g` is the
 * only command we run: a pnpm/bun/yarn/volta global would get a second copy
 * that may not be the one on PATH, a project dependency belongs to that
 * project's package manager, an npx/dlx cache has nothing to upgrade, and a
 * source checkout is not an install at all.
 */
export function canSelfUpgrade(installDir: string | null, projectPath: string): boolean {
  if (!installDir) return false;
  if (isEphemeralRunnerInstall(installDir)) return false;
  // Both anchors matter: `openspec update ../other` from a project that owns
  // the CLI as a dependency is still a project-local install.
  if (isProjectLocalInstall(installDir, projectPath)) return false;
  if (isProjectLocalInstall(installDir)) return false;
  if (isSourceCheckout(installDir)) return false;
  return isNpmGlobalInstall(installDir);
}

/**
 * Whether to offer the upgrade rather than just print the command. Kept here,
 * as a pure function of the environment, because the interesting mistakes live
 * in this decision: offering where `npm install -g` cannot help, or asking a
 * question no one can answer.
 */
export function shouldOfferUpgrade(params: {
  installDir: string | null;
  projectPath: string;
  interactive: boolean;
  stdoutIsTty: boolean;
}): boolean {
  // A prompt written to a redirected stdout is a question the user never sees
  // and the command waits on forever.
  if (!params.interactive || !params.stdoutIsTty) return false;
  return canSelfUpgrade(params.installDir, params.projectPath);
}

/**
 * Runs `npm install -g <pkg>@latest`, inheriting stdio so npm's own output —
 * including any auth or permission prompt — reaches the user directly.
 * Resolves true only on a clean exit.
 */
async function runGlobalUpgrade(): Promise<boolean> {
  const spawn = loadSpawn();

  return new Promise((resolve) => {
    const child = spawn('npm', ['install', '-g', `${PACKAGE_NAME}@latest`], {
      stdio: 'inherit',
    });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

/**
 * The `openspec` npm installs alongside its global package, so the upgrade can
 * be handed to the copy npm just wrote rather than to whatever PATH resolves.
 * Null when it cannot be found, in which case PATH is the only option left.
 */
export function upgradedBinPath(
  roots: string[] = npmGlobalRoots(),
  installDir: string | null = getInstallDir()
): string | null {
  // The copy npm just replaced tells us exactly which prefix it wrote to;
  // a root derived from the node binary can point at an unrelated install.
  const ownPrefix = npmPrefixFromInstallDir(installDir);
  const ordered = ownPrefix
    ? [
        process.platform === 'win32'
          ? path.join(ownPrefix, 'node_modules')
          : path.join(ownPrefix, 'lib', 'node_modules'),
        ...roots,
      ]
    : roots;

  for (const root of ordered) {
    // npm writes the shim beside the global root on Windows
    // (%APPDATA%\\npm\\openspec.cmd) and in <prefix>/bin on POSIX.
    const candidates =
      process.platform === 'win32'
        ? [path.join(path.dirname(root), 'openspec.cmd')]
        : [path.resolve(root, '..', '..', 'bin', 'openspec')];

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) return candidate;
      } catch {
        // Unreadable candidate; try the next one.
      }
    }
  }
  return null;
}

/**
 * Asks a CLI binary its version. Used to confirm an upgrade actually landed:
 * `npm install -g` exits 0 even when it installed nothing, so its exit code
 * alone cannot justify telling the user they are on a new version.
 */
export function readCliVersion(binPath: string): Promise<string | null> {
  const spawn = loadSpawn();

  return new Promise((resolve) => {
    let output = '';
    let child;
    try {
      child = spawn(binPath, ['--version'], { stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      resolve(null);
      return;
    }

    // Never let a probe hold the CLI open: a wrapper that traps SIGTERM would
    // otherwise keep the process alive for as long as it runs.
    child.unref();
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve(null);
    }, VERSION_PROBE_TIMEOUT_MS);

    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on('close', () => {
      clearTimeout(timer);
      // A line that is only a version, not the first version-shaped token
      // anywhere: a wrapper banner ("Node.js v25.8.1 | OpenSpec") would
      // otherwise be read as the answer.
      const version = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => SAFE_VERSION.test(line.replace(/^v/, '')))
        .pop();
      resolve(version ? version.replace(/^v/, '') : null);
    });
  });
}

export type UpgradeOutcome = 'upgraded' | 'declined' | 'failed' | 'cancelled' | 'not-on-path';

function isPromptCancellation(error: unknown): boolean {
  const name = (error as { name?: string } | undefined)?.name;
  return name === 'ExitPromptError' || name === 'AbortPromptError';
}

/**
 * Offers to run the upgrade and reports what actually happened. The version is
 * read back from the installed binary rather than assumed, so "upgraded" is a
 * fact and a PATH that still answers with the old copy is caught here instead
 * of silently doing nothing.
 */
export async function offerCliUpgrade(latestVersion: string): Promise<UpgradeOutcome> {
  const { confirm } = await import('@inquirer/prompts');

  let accepted = false;
  try {
    accepted = await confirm({
      message: `是否立即升级到 v${latestVersion}？`,
      default: true,
    });
  } catch (error) {
    // Ctrl-C means stop, not "no thanks, carry on with everything else".
    return isPromptCancellation(error) ? 'cancelled' : 'declined';
  }
  if (!accepted) return 'declined';

  console.log();
  const installed = await runGlobalUpgrade();
  console.log();

  if (!installed) {
    console.log(chalk.yellow('升级未完成。全局安装可能需要'));
    console.log(chalk.yellow('提升权限，或使用不同的包管理器。'));
    return 'failed';
  }

  const binPath = upgradedBinPath();
  const version = await readCliVersion(binPath ?? 'openspec');

  if (!version) {
    console.log(chalk.yellow('升级完成，但无法运行 "openspec" 来确认。'));
    return 'not-on-path';
  }
  if (compareVersions(version, OPENSPEC_VERSION) <= 0) {
    console.log(chalk.yellow(`升级完成，但 "openspec" 仍报告 v${version}。`));
    console.log(
      chalk.dim(
        binPath
          ? // 我们直接询问已安装的副本，所以 PATH 不是原因。
            `  npm 报告成功，但 ${binPath} 没有变化。`
          : '  PATH 上之前的另一次安装优先响应。'
      )
    );
    return 'not-on-path';
  }

  console.log(chalk.green(`✓ 已升级到 v${version}。`));
  return 'upgraded';
}

/**
 * Runs `openspec update` again with the CLI that was just installed — this
 * process is still the old code, so it cannot write the new workflows itself.
 * Resolves the exit code to pass along; when no `openspec` is on PATH the
 * upgrade still landed but nothing was regenerated, so it says so and
 * resolves 0 rather than reporting a failure the upgrade did not have.
 */
export async function rerunUpdateWithUpgradedCli(
  projectPath: string,
  options: { force?: boolean; binPath?: string } = {}
): Promise<number> {
  const spawn = loadSpawn();
  const binPath = options.binPath ?? upgradedBinPath() ?? 'openspec';
  // The re-run stands in for the command the user typed, so it has to carry
  // the flags they typed with it.
  const args = ['update'];
  if (options.force) args.push('--force');
  // `--` so a path that looks like a flag stays a path.
  args.push('--', projectPath);

  return new Promise((resolve) => {
    const child = spawn(binPath, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        // The child must not offer the upgrade again: if PATH still resolves
        // to the old binary, prompting would loop forever.
        OPENSPEC_NO_UPDATE_CHECK: '1',
        // This is a continuation of the command the user already ran, and the
        // parent recorded it; counting it twice would overstate usage.
        OPENSPEC_TELEMETRY: '0',
      },
    });
    child.on('error', () => {
      // 没有东西可以交接：升级完成但指令文件仍然是旧的，
      // 所以此次运行没有完成所要求的操作。
      console.log(chalk.yellow('指令文件未重新生成。'));
      console.log(chalk.dim('  运行 "openspec update" 以获取新的 workflows。'));
      resolve(1);
    });
    // A child killed by a signal reports no code; that is not success.
    child.on('close', (code) => resolve(code ?? 1));
  });
}

/**
 * Prints the upgrade hint. Instruction files are generated by the installed
 * CLI, so "up to date" only ever means "matches this CLI" — without this note
 * a stale install looks like a successful update.
 */
export function displayCliUpdateNote(
  latestVersion: string,
  projectPath: string = '.',
  options: { withCommand?: boolean } = {}
): void {
  const [headline, ...rest] = buildCliUpdateLines(
    latestVersion,
    getInstallDir(),
    projectPath,
    options
  );

  console.log();
  console.log(chalk.yellow(headline));
  for (const line of rest) {
    console.log(chalk.dim(line));
  }
}

/**
 * Prints just the manual command, for when the offer was declined or failed.
 */
export function displayUpgradeCommand(projectPath: string = '.'): void {
  for (const line of buildUpgradeCommandLines(getInstallDir(), projectPath)) {
    console.log(chalk.dim(line));
  }
}
