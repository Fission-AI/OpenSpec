import { execFileSync } from 'node:child_process';

/**
 * 用于补全生成的受支持 shell 类型
 */
export type SupportedShell = 'zsh' | 'bash' | 'fish' | 'powershell';

/**
 * Shell 检测结果
 */
export interface ShellDetectionResult {
  /** 检测到的 shell（如果受支持），否则为 undefined */
  shell: SupportedShell | undefined;
  /** 检测到的原始 shell 名称（即使不受支持），如果未检测到则为 undefined */
  detected: string | undefined;
}

/**
 * 将原始 shell 名称/路径映射到受支持的 shell（如果有）。
 */
function matchSupportedShell(name: string): SupportedShell | undefined {
  // 完全匹配可执行文件的基本名称，这样 `fish-lsp` 或
  // `bash-language-server` 等类似文件不会被误认为 shell 本身。
  // 登录 shell 报告前导短划线（如 `-zsh`），因此先去掉它。
  const executable = name.trim().toLowerCase().split('/').pop()?.replace(/^-/, '');
  if (executable === 'zsh') return 'zsh';
  if (executable === 'bash') return 'bash';
  if (executable === 'fish') return 'fish';
  return undefined;
}

/**
 * 从父进程检测交互式 shell。
 *
 * `process.env.SHELL` 仅是登录 shell，因此交互式 shell 与之不同的用户
 * （例如使用 fish 而登录 shell 为 bash）会被误检测。
 * 检查父进程能反映实际启动 openspec 的 shell。
 * 仅限 POSIX 且尽力而为 —— 任何错误返回 undefined，
 * 以便调用方回退到 `$SHELL`。
 *
 * @returns 作为父进程运行的受支持 shell，或 undefined
 */
function detectShellFromParentProcess(): SupportedShell | undefined {
  // `ps` 仅在 POSIX 上可用；Windows shell 通过 PSModulePath/COMSPEC 处理。
  if (process.platform === 'win32') {
    return undefined;
  }

  const ppid = process.ppid;
  if (!ppid || ppid <= 1) {
    return undefined;
  }

  try {
    const comm = execFileSync('ps', ['-p', String(ppid), '-o', 'comm='], {
      encoding: 'utf8',
      timeout: 1000,
    }).trim();

    if (!comm) {
      return undefined;
    }

    // 仅当父进程映射到受支持的 shell 时才信任它；
    // 不相关的父进程（node、npm、sudo、分页器）回退到 `$SHELL`。
    return matchSupportedShell(comm);
  } catch {
    return undefined;
  }
}

/**
 * 基于父进程和环境检测当前用户的 shell
 *
 * @returns 包含受支持 shell 和原始检测名称的检测结果
 */
export function detectShell(): ShellDetectionResult {
  // 优先使用实际运行的 shell（父进程）而不是 `$SHELL`，
  // 后者仅反映登录 shell，会遗漏交互式 shell 不同的用户。
  const parentShell = detectShellFromParentProcess();
  if (parentShell) {
    return { shell: parentShell, detected: parentShell };
  }

  // 接下来尝试 SHELL 环境变量（类 Unix 系统）
  const shellPath = process.env.SHELL;

  if (shellPath) {
    const supported = matchSupportedShell(shellPath);
    if (supported) {
      return { shell: supported, detected: supported };
    }

    // 检测到 shell 但不受支持
    // 从路径中提取 shell 名称（如 /bin/tcsh -> tcsh）
    const match = shellPath.match(/\/([^/]+)$/);
    const detectedName = match ? match[1] : shellPath;
    return { shell: undefined, detected: detectedName };
  }

  // 在 Windows 上检查 PowerShell
  // PSModulePath 是可靠的 PowerShell 特定环境变量
  if (process.env.PSModulePath || process.platform === 'win32') {
    const comspec = process.env.COMSPEC?.toLowerCase();

    // 如果 PSModulePath 存在，我们肯定在 PowerShell 中
    if (process.env.PSModulePath) {
      return { shell: 'powershell', detected: 'powershell' };
    }

    // 在没有 PSModulePath 的 Windows 上，我们可能在 cmd.exe 中
    if (comspec?.includes('cmd.exe')) {
      return { shell: undefined, detected: 'cmd.exe' };
    }
  }

  return { shell: undefined, detected: undefined };
}
