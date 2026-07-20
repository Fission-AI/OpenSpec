import { execFileSync } from 'node:child_process';

/**
 * Supported shell types for completion generation
 */
export type SupportedShell = 'zsh' | 'bash' | 'fish' | 'powershell';

/**
 * Result of shell detection
 */
export interface ShellDetectionResult {
  /** The detected shell if supported, otherwise undefined */
  shell: SupportedShell | undefined;
  /** The raw shell name detected (even if unsupported), or undefined if nothing detected */
  detected: string | undefined;
}

/**
 * Map a raw shell name/path to a supported shell, if any.
 */
function matchSupportedShell(name: string): SupportedShell | undefined {
  // Match the executable basename exactly so lookalikes such as `fish-lsp` or
  // `bash-language-server` don't get mistaken for the shell itself. Login
  // shells report a leading dash (e.g. `-zsh`), so strip it first.
  const executable = name.trim().toLowerCase().split('/').pop()?.replace(/^-/, '');
  if (executable === 'zsh') return 'zsh';
  if (executable === 'bash') return 'bash';
  if (executable === 'fish') return 'fish';
  return undefined;
}

/**
 * Detect the interactive shell from the parent process.
 *
 * `process.env.SHELL` is only the login shell, so users whose interactive shell
 * differs from it (e.g. running fish while their login shell is bash) are
 * misdetected. Inspecting the parent process reflects the shell that actually
 * launched openspec. POSIX-only and best-effort — any failure returns undefined
 * so the caller falls back to `$SHELL`.
 *
 * @returns The supported shell running as the parent process, or undefined
 */
function detectShellFromParentProcess(): SupportedShell | undefined {
  // `ps` is POSIX-only; Windows shells are handled via PSModulePath/COMSPEC.
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

    // Only trust the parent process when it maps to a supported shell; an
    // unrelated parent (node, npm, sudo, a pager) falls through to `$SHELL`.
    return matchSupportedShell(comm);
  } catch {
    return undefined;
  }
}

/**
 * Detects the current user's shell based on the parent process and environment
 *
 * @returns Detection result with supported shell and raw detected name
 */
export function detectShell(): ShellDetectionResult {
  // Prefer the actual running shell (parent process) over `$SHELL`, which only
  // reflects the login shell and misses users whose interactive shell differs.
  const parentShell = detectShellFromParentProcess();
  if (parentShell) {
    return { shell: parentShell, detected: parentShell };
  }

  // Try SHELL environment variable next (Unix-like systems)
  const shellPath = process.env.SHELL;

  if (shellPath) {
    const supported = matchSupportedShell(shellPath);
    if (supported) {
      return { shell: supported, detected: supported };
    }

    // Shell detected but not supported
    // Extract shell name from path (e.g., /bin/tcsh -> tcsh)
    const match = shellPath.match(/\/([^/]+)$/);
    const detectedName = match ? match[1] : shellPath;
    return { shell: undefined, detected: detectedName };
  }

  // Check for PowerShell on Windows
  // PSModulePath is a reliable PowerShell-specific environment variable
  if (process.env.PSModulePath || process.platform === 'win32') {
    const comspec = process.env.COMSPEC?.toLowerCase();

    // If PSModulePath exists, we're definitely in PowerShell
    if (process.env.PSModulePath) {
      return { shell: 'powershell', detected: 'powershell' };
    }

    // On Windows without PSModulePath, we might be in cmd.exe
    if (comspec?.includes('cmd.exe')) {
      return { shell: undefined, detected: 'cmd.exe' };
    }
  }

  return { shell: undefined, detected: undefined };
}
