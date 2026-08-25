import ora from 'ora';
import { CompletionFactory } from '../core/completions/factory.js';
import { COMMAND_REGISTRY } from '../core/completions/command-registry.js';
import { detectShell, SupportedShell } from '../utils/shell-detection.js';
import { CompletionProvider } from '../core/completions/completion-provider.js';
import { getArchivedChangeIds } from '../utils/item-discovery.js';

interface GenerateOptions {
  shell?: string;
}

interface InstallOptions {
  shell?: string;
  verbose?: boolean;
}

interface UninstallOptions {
  shell?: string;
  yes?: boolean;
}

interface CompleteOptions {
  type: string;
}

/**
 * 管理 OpenSpec CLI 的 shell 补全命令
 */
export class CompletionCommand {
  private completionProvider: CompletionProvider;

  constructor() {
    this.completionProvider = new CompletionProvider();
  }
  /**
 * 解析 shell 参数或退出并报错
 *
 * @param shell - shell 参数（可能为 undefined）
 * @param operationName - 操作名称（用于错误消息）
 * @returns 解析后的 shell 或 null（如应退出）
 */
  private resolveShellOrExit(shell: string | undefined, operationName: string): SupportedShell | null {
    const normalizedShell = this.normalizeShell(shell);

    if (!normalizedShell) {
      const detectionResult = detectShell();

      if (detectionResult.shell && CompletionFactory.isSupported(detectionResult.shell)) {
        return detectionResult.shell;
      }

      // 检测到 shell 但不受支持
      if (detectionResult.detected && !detectionResult.shell) {
        console.error(`错误：检测到 shell '${detectionResult.detected}' 但尚未支持。当前支持：${CompletionFactory.getSupportedShells().join(', ')}`);
        process.exitCode = 1;
        return null;
      }

      // 未指定 shell 且无法自动检测
      console.error('错误：无法自动检测 shell。请明确指定 shell。');
      console.error(`用法：openspec completion ${operationName} [shell]`);
      console.error(`当前支持：${CompletionFactory.getSupportedShells().join(', ')}`);
      process.exitCode = 1;
      return null;
    }

    if (!CompletionFactory.isSupported(normalizedShell)) {
      console.error(`错误：shell '${normalizedShell}' 尚未支持。当前支持：${CompletionFactory.getSupportedShells().join(', ')}`);
      process.exitCode = 1;
      return null;
    }

    return normalizedShell;
  }

  /**
 * 生成补全脚本并输出到标准输出
 *
 * @param options - 生成选项（shell 类型）
 */
  async generate(options: GenerateOptions = {}): Promise<void> {
    const shell = this.resolveShellOrExit(options.shell, 'generate');
    if (!shell) return;

    await this.generateForShell(shell);
  }

  /**
 * 安装补全脚本到适当位置
 *
 * @param options - 安装选项（shell 类型、详细输出）
 */
  async install(options: InstallOptions = {}): Promise<void> {
    const shell = this.resolveShellOrExit(options.shell, 'install');
    if (!shell) return;

    await this.installForShell(shell, options.verbose || false);
  }

  /**
 * 从安装位置卸载补全脚本
 *
 * @param options - 卸载选项（shell 类型、yes 标志）
 */
  async uninstall(options: UninstallOptions = {}): Promise<void> {
    const shell = this.resolveShellOrExit(options.shell, 'uninstall');
    if (!shell) return;

    await this.uninstallForShell(shell, options.yes || false);
  }

  /**
 * 为特定 shell 生成补全脚本
 */
  private async generateForShell(shell: SupportedShell): Promise<void> {
    const generator = CompletionFactory.createGenerator(shell);
    const script = generator.generate(COMMAND_REGISTRY);
    console.log(script);
  }

  /**
 * 为特定 shell 安装补全脚本
 */
  private async installForShell(shell: SupportedShell, verbose: boolean): Promise<void> {
    const generator = CompletionFactory.createGenerator(shell);
    const installer = CompletionFactory.createInstaller(shell);

    const spinner = ora(`正在安装 ${shell} 补全脚本...`).start();

    try {
      // 生成补全脚本
      const script = generator.generate(COMMAND_REGISTRY);

      // 安装它
      const result = await installer.install(script);

      spinner.stop();

      if (result.success) {
        console.log(`✓ ${result.message}`);

        if (verbose && result.installedPath) {
          console.log(`  已安装到：${result.installedPath}`);
          if (result.backupPath) {
            console.log(`  备份创建于：${result.backupPath}`);
          }

          // 检查是否有 shell 配置被更新
          const configWasUpdated = result.zshrcConfigured || result.bashrcConfigured || result.profileConfigured;

          if (configWasUpdated) {
            const configPaths: Record<string, string> = {
              zsh: '~/.zshrc',
              bash: '~/.bashrc',
              fish: '~/.config/fish/config.fish',
              powershell: '$PROFILE',
            };
            const configPath = configPaths[shell] || 'config file';
            console.log(`  ${configPath} 已自动配置`);
          }
        }

        // 显示警告（如有）
        if (result.warnings && result.warnings.length > 0) {
          console.log('');
          for (const warning of result.warnings) {
            console.log(warning);
          }
        }

        // 打印操作说明（仅在 .zshrc 未自动配置时显示）
        if (result.instructions && result.instructions.length > 0) {
          console.log('');
          for (const instruction of result.instructions) {
            console.log(instruction);
          }
        } else {
          // 检查是否有 shell 配置被更新（InstallationResult 包含：zshrcConfigured、bashrcConfigured、profileConfigured）
          const configWasUpdated = result.zshrcConfigured || result.bashrcConfigured || result.profileConfigured;

          if (configWasUpdated) {
            console.log('');

            // shell 特定的重新加载指令
            const reloadCommands: Record<string, string> = {
              zsh: 'exec zsh',
              bash: 'exec bash',
              fish: 'exec fish',
              powershell: '. $PROFILE',
            };
            const reloadCmd = reloadCommands[shell] || `restart your ${shell} shell`;

            console.log(`重启您的 shell 或运行：${reloadCmd}`);
          }
        }
      } else {
        console.error(`✗ ${result.message}`);
        process.exitCode = 1;
      }
    } catch (error) {
      spinner.stop();
      console.error(`✗ 安装补全脚本失败：${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }

  /**
 * 为特定 shell 卸载补全脚本
 */
  private async uninstallForShell(shell: SupportedShell, skipConfirmation: boolean): Promise<void> {
    const installer = CompletionFactory.createInstaller(shell);

    // 提示确认（除非提供了 --yes 标志）
    if (!skipConfirmation) {
      const { confirm } = await import('@inquirer/prompts');

      // 获取 shell 特定的配置文件路径
      const configPaths: Record<string, string> = {
        zsh: '~/.zshrc',
        bash: '~/.bashrc',
        fish: 'Fish 配置文件',  // Fish 不修改 profile，仅删除脚本文件
        powershell: '$PROFILE',
      };
      const configPath = configPaths[shell] || `${shell} 配置`;

      const confirmed = await confirm({
        message: `是否从 ${configPath} 中移除 OpenSpec 配置？`,
        default: false,
      });

      if (!confirmed) {
        console.log('卸载已取消。');
        return;
      }
    }

    const spinner = ora(`正在卸载 ${shell} 补全脚本...`).start();

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
      console.error(`✗ 卸载补全脚本失败：${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }

  /**
 * 输出机器可读的补全数据供 shell 使用
 * 格式：每行以制表符分隔的 "id\tdescription"
 *
 * @param options - 指定补全类型的选项
 */
  async complete(options: CompleteOptions): Promise<void> {
    const type = options.type.toLowerCase();

    try {
      switch (type) {
        case 'changes': {
          const changeIds = await this.completionProvider.getChangeIds();
          for (const id of changeIds) {
            console.log(`${id}\tactive change`);
          }
          break;
        }
        case 'specs': {
          const specIds = await this.completionProvider.getSpecIds();
          for (const id of specIds) {
            console.log(`${id}\tspecification`);
          }
          break;
        }
        case 'schemas': {
          const schemaNames = await this.completionProvider.getSchemaNames();
          for (const name of schemaNames) {
            console.log(`${name}\tschema`);
          }
          break;
        }
        case 'archived-changes': {
          const archivedIds = await getArchivedChangeIds();
          for (const id of archivedIds) {
            console.log(`${id}\tarchived change`);
          }
          break;
        }
        default:
          // 无效类型 - 静默退出，无输出以实现优雅的 shell 补全失败
          process.exitCode = 1;
          break;
      }
    } catch {
      // 静默失败以实现优雅的 shell 补全体验
      process.exitCode = 1;
    }
  }

  /**
 * 将 shell 参数规范化为小写
 */
  private normalizeShell(shell?: string): string | undefined {
    return shell?.toLowerCase();
  }
}
