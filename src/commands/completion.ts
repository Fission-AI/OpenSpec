import ora from 'ora';
import { CompletionFactory } from '../core/completions/factory.js';
import { COMMAND_REGISTRY } from '../core/completions/command-registry.js';
import { detectShell, SupportedShell } from '../utils/shell-detection.js';

interface GenerateOptions {
  shell?: string;
}

interface InstallOptions {
  shell?: string;
  verbose?: boolean;
}

interface UninstallOptions {
  shell?: string;
}

/**
 * Command for managing shell completions for OpenSpec CLI
 */
export class CompletionCommand {
  /**
   * Generate completion script and output to stdout
   *
   * @param options - Options for generation (shell type)
   */
  async generate(options: GenerateOptions = {}): Promise<void> {
    const shell = this.normalizeShell(options.shell);

    if (!shell) {
      const detected = detectShell();
      if (detected && CompletionFactory.isSupported(detected)) {
        // Use detected shell
        await this.generateForShell(detected);
        return;
      }

      // No shell specified and cannot auto-detect
      console.error('Error: Could not auto-detect shell. Please specify shell explicitly.');
      console.error('Usage: openspec completion generate <shell>');
      console.error(`Currently supported: ${CompletionFactory.getSupportedShells().join(', ')}`);
      process.exitCode = 1;
      return;
    }

    if (!CompletionFactory.isSupported(shell)) {
      console.error(`Error: Shell '${shell}' is not supported yet. Currently supported: ${CompletionFactory.getSupportedShells().join(', ')}`);
      process.exitCode = 1;
      return;
    }

    await this.generateForShell(shell);
  }

  /**
   * Install completion script to the appropriate location
   *
   * @param options - Options for installation (shell type, verbose output)
   */
  async install(options: InstallOptions = {}): Promise<void> {
    const shell = this.normalizeShell(options.shell);

    if (!shell) {
      const detected = detectShell();
      if (detected && CompletionFactory.isSupported(detected)) {
        // Use detected shell
        await this.installForShell(detected, options.verbose || false);
        return;
      }

      // No shell specified and cannot auto-detect
      console.error('Error: Could not auto-detect shell. Please specify shell explicitly.');
      console.error('Usage: openspec completion install [shell]');
      console.error(`Currently supported: ${CompletionFactory.getSupportedShells().join(', ')}`);
      process.exitCode = 1;
      return;
    }

    if (!CompletionFactory.isSupported(shell)) {
      console.error(`Error: Shell '${shell}' is not supported yet. Currently supported: ${CompletionFactory.getSupportedShells().join(', ')}`);
      process.exitCode = 1;
      return;
    }

    await this.installForShell(shell, options.verbose || false);
  }

  /**
   * Uninstall completion script from the installation location
   *
   * @param options - Options for uninstallation (shell type)
   */
  async uninstall(options: UninstallOptions = {}): Promise<void> {
    const shell = this.normalizeShell(options.shell);

    if (!shell) {
      const detected = detectShell();
      if (detected && CompletionFactory.isSupported(detected)) {
        // Use detected shell
        await this.uninstallForShell(detected);
        return;
      }

      // No shell specified and cannot auto-detect
      console.error('Error: Could not auto-detect shell. Please specify shell explicitly.');
      console.error('Usage: openspec completion uninstall [shell]');
      console.error(`Currently supported: ${CompletionFactory.getSupportedShells().join(', ')}`);
      process.exitCode = 1;
      return;
    }

    if (!CompletionFactory.isSupported(shell)) {
      console.error(`Error: Shell '${shell}' is not supported yet. Currently supported: ${CompletionFactory.getSupportedShells().join(', ')}`);
      process.exitCode = 1;
      return;
    }

    await this.uninstallForShell(shell);
  }

  /**
   * Generate completion script for a specific shell
   */
  private async generateForShell(shell: SupportedShell): Promise<void> {
    const generator = CompletionFactory.createGenerator(shell);
    const script = generator.generate(COMMAND_REGISTRY);
    console.log(script);
  }

  /**
   * Install completion script for a specific shell
   */
  private async installForShell(shell: SupportedShell, verbose: boolean): Promise<void> {
    const generator = CompletionFactory.createGenerator(shell);
    const installer = CompletionFactory.createInstaller(shell);

    const spinner = ora(`Installing ${shell} completion script...`).start();

    try {
      // Generate the completion script
      const script = generator.generate(COMMAND_REGISTRY);

      // Install it
      const result = await installer.install(script);

      spinner.stop();

      if (result.success) {
        console.log(`✓ ${result.message}`);

        if (verbose && result.installedPath) {
          console.log(`  Installed to: ${result.installedPath}`);
          if (result.backupPath) {
            console.log(`  Backup created: ${result.backupPath}`);
          }
        }

        // Print instructions
        if (result.instructions && result.instructions.length > 0) {
          console.log('');
          for (const instruction of result.instructions) {
            console.log(instruction);
          }
        }
      } else {
        console.error(`✗ ${result.message}`);
        process.exitCode = 1;
      }
    } catch (error) {
      spinner.stop();
      console.error(`✗ Failed to install completion script: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }

  /**
   * Uninstall completion script for a specific shell
   */
  private async uninstallForShell(shell: SupportedShell): Promise<void> {
    const installer = CompletionFactory.createInstaller(shell);

    const spinner = ora(`Uninstalling ${shell} completion script...`).start();

    try {
      const result = await installer.uninstall();

      spinner.stop();

      if (result.success) {
        console.log(`✓ ${result.message}`);
      } else {
        console.error(`✗ ${result.message}`);
        process.exitCode = 1;
      }
    } catch (error) {
      spinner.stop();
      console.error(`✗ Failed to uninstall completion script: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }

  /**
   * Normalize shell parameter to lowercase
   */
  private normalizeShell(shell?: string): string | undefined {
    return shell?.toLowerCase();
  }
}
