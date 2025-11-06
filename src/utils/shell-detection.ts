/**
 * Supported shell types for completion generation
 */
export type SupportedShell = 'zsh' | 'bash' | 'fish' | 'powershell';

/**
 * Detects the current user's shell based on environment variables
 *
 * @returns The detected shell type, or undefined if the shell is not supported or cannot be detected
 */
export function detectShell(): SupportedShell | undefined {
  // Try SHELL environment variable first (Unix-like systems)
  const shellPath = process.env.SHELL;

  if (shellPath) {
    const shellName = shellPath.toLowerCase();

    if (shellName.includes('zsh')) {
      return 'zsh';
    }
    if (shellName.includes('bash')) {
      return 'bash';
    }
    if (shellName.includes('fish')) {
      return 'fish';
    }
  }

  // Check for PowerShell on Windows
  // PSModulePath is a reliable PowerShell-specific environment variable
  if (process.env.PSModulePath || process.platform === 'win32') {
    // On Windows, check if we're in PowerShell or cmd
    const comspec = process.env.COMSPEC?.toLowerCase();

    // If PSModulePath exists, we're definitely in PowerShell
    if (process.env.PSModulePath) {
      return 'powershell';
    }

    // On Windows without PSModulePath, we might be in cmd.exe
    // For now, we don't support cmd.exe, so return undefined
    if (comspec?.includes('cmd.exe')) {
      return undefined;
    }
  }

  return undefined;
}
