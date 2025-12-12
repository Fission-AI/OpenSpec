import { CompletionGenerator } from './types.js';
import { ZshGenerator } from './generators/zsh-generator.js';
import { ZshInstaller, InstallationResult } from './installers/zsh-installer.js';
import { SupportedShell } from '../../utils/shell-detection.js';

/**
 * Interface for completion installers
 */
export interface CompletionInstaller {
  install(script: string): Promise<InstallationResult>;
  uninstall(): Promise<{ success: boolean; message: string }>;
}

// Re-export InstallationResult for convenience
export type { InstallationResult };

/**
 * Factory for creating completion generators and installers
 * This design makes it easy to add support for additional shells
 */
export class CompletionFactory {
  private static readonly SUPPORTED_SHELLS: SupportedShell[] = ['zsh'];

  /**
   * Create a completion generator for the specified shell
   *
   * @param shell - The target shell
   * @returns CompletionGenerator instance
   * @throws Error if shell is not supported
   */
  static createGenerator(shell: SupportedShell): CompletionGenerator {
    switch (shell) {
      case 'zsh':
        return new ZshGenerator();
      default:
        throw new Error(`Unsupported shell: ${shell}`);
    }
  }

  /**
   * Create a completion installer for the specified shell
   *
   * @param shell - The target shell
   * @returns CompletionInstaller instance
   * @throws Error if shell is not supported
   */
  static createInstaller(shell: SupportedShell): CompletionInstaller {
    switch (shell) {
      case 'zsh':
        return new ZshInstaller();
      default:
        throw new Error(`Unsupported shell: ${shell}`);
    }
  }

  /**
   * Check if a shell is supported
   *
   * @param shell - The shell to check
   * @returns true if the shell is supported
   */
  static isSupported(shell: string): shell is SupportedShell {
    return this.SUPPORTED_SHELLS.includes(shell as SupportedShell);
  }

  /**
   * Get list of all supported shells
   *
   * @returns Array of supported shell names
   */
  static getSupportedShells(): SupportedShell[] {
    return [...this.SUPPORTED_SHELLS];
  }
}
