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
 * Detects the current user's shell based on environment variables
 *
 * @returns Detection result with supported shell and raw detected name
 */
export function detectShell(): ShellDetectionResult {
  // Try SHELL environment variable first (Unix-like systems)
  const shellPath = process.env.SHELL;

  if (shellPath) {
    const shellName = shellPath.toLowerCase();

    if (shellName.includes('zsh')) {
      return { shell: 'zsh', detected: 'zsh' };
    }
    if (shellName.includes('bash')) {
      return { shell: 'bash', detected: 'bash' };
    }
    if (shellName.includes('fish')) {
      return { shell: 'fish', detected: 'fish' };
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
