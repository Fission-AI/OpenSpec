/**
 * 制品工作流设置的动画欢迎界面。
 * 显示并排布局：左侧动画 ASCII 艺术，右侧欢迎文本。
 */

import chalk from 'chalk';
import {
  execFileSync,
  type ExecFileSyncOptionsWithStringEncoding,
} from 'node:child_process';
import { WELCOME_ANIMATION } from './ascii-patterns.js';
import { getOnboardingCommands } from '../core/onboarding-commands.js';

// 并排布局的最小终端宽度
const MIN_WIDTH = 60;

// ASCII 艺术列的宽度（含填充）
const ART_COLUMN_WIDTH = 24;

/**
 * 欢迎文本内容（右侧列）
 */
function getWelcomeText(workflows: readonly string[]): string[] {
  const onboardingCommands = getOnboardingCommands(workflows);
  const quickStart: string[] = [];

  if (onboardingCommands.length > 0) {
    const commandWidth = Math.max(...onboardingCommands.map((c) => c.command.length));
    quickStart.push(chalk.white('设置后快速入门：'));
    for (const { command, description } of onboardingCommands) {
      quickStart.push(`  ${chalk.yellow(command.padEnd(commandWidth + 1))} ${chalk.dim(description)}`);
    }
    // 这些是规范名称。每个工具的拼写方式不同
    // (/opsx-propose, @opsx-propose, $openspec-propose ...)，在选择工具之前
    // 无法确定——因此标记出来，而不是让规范形式看起来像字面输入内容。
    // "入门" 一旦知道选择就会打印真实的拼写。
    quickStart.push(chalk.dim('  （拼写因工具而异）'));
    quickStart.push('');
  }

  return [
    chalk.white.bold('欢迎使用 OpenSpec'),
    chalk.dim('轻量级规范驱动框架'),
    '',
    chalk.white('此设置将配置：'),
    chalk.dim('  • AI 工具的 Agent 技能'),
    // 不是 "opsx 斜杠命令"：此界面在工具选择之前运行，
    // 仅技能工具（Codex、Kimi Code 等）正确地根本不生成命令文件。
    // 每个工具的确切拼写在 "入门" 中打印。
    chalk.dim('  • 工作流命令（如支持）'),
    '',
    ...quickStart,
    chalk.cyan('按 Enter 选择工具...'),
  ];
}

/**
 * 渲染带有并排布局的单帧
 */
function renderFrame(artLines: string[], textLines: string[]): string {
  const maxLines = Math.max(artLines.length, textLines.length);
  const lines: string[] = [];

  for (let i = 0; i < maxLines; i++) {
    const artLine = artLines[i] || '';
    const textLine = textLines[i] || '';

    // 将艺术列填充到固定宽度
    const paddedArt = artLine.padEnd(ART_COLUMN_WIDTH);

    // 使用青色为 ASCII 艺术着色以增加视觉吸引力
    const coloredArt = chalk.cyan(paddedArt);

    // 写入前清除行以防止残留字符
    lines.push(`\x1b[2K${coloredArt}${textLine}`);
  }

  return lines.join('\n');
}

const REDUCED_MOTION_EXEC_OPTIONS: ExecFileSyncOptionsWithStringEncoding = {
  encoding: 'utf8',
  timeout: 500,
  // SIGKILL，确保卡死的查询不会超时并阻塞初始化。
  killSignal: 'SIGKILL',
  stdio: ['ignore', 'pipe', 'ignore'],
};

/**
 * 尽力而为地检查操作系统级别的减动偏好（#722）。
 * 任何查询失败（缺少二进制、未设置键、超时）都表示
 * "未检测到偏好"，动画保持启用状态。
 */
export function prefersReducedMotion(
  platform: NodeJS.Platform = process.platform
): boolean {
  try {
    if (platform === 'darwin') {
      // 该键仅在用户切换了"减少动态效果"后才存在；当未设置时
      // `defaults` 以非零退出码退出，进入下面的 catch 分支。
      const out = execFileSync(
        'defaults',
        ['read', 'com.apple.universalaccess', 'reduceMotion'],
        REDUCED_MOTION_EXEC_OPTIONS
      );
      return out.trim() === '1';
    }
    if (platform === 'linux') {
      const out = execFileSync(
        'gsettings',
        ['get', 'org.gnome.desktop.interface', 'enable-animations'],
        REDUCED_MOTION_EXEC_OPTIONS
      );
      return out.trim() === 'false';
    }
  } catch {
    // 检测仅是尽力而为。
  }
  return false;
}

/**
 * 检查终端是否支持动画
 */
function canAnimate(): boolean {
  // 必须是 TTY
  if (!process.stdout.isTTY) return false;

  // 遵循 NO_COLOR
  if (process.env.NO_COLOR) return false;

  // 为需要减少动态效果的用户提供手动覆盖（#722）。存在性
  // 至关重要：即使空值也禁用动画。
  if (process.env.OPENSPEC_NO_ANIMATION !== undefined) return false;

  // 检查终端宽度
  const columns = process.stdout.columns || 80;
  if (columns < MIN_WIDTH) return false;

  // 最后检查，以便只有交互式终端为操作系统查询付费
  if (prefersReducedMotion()) return false;

  return true;
}

/**
 * 等待 Enter 键按下
 */
async function waitForEnter(): Promise<void> {
  if (!process.stdin.isTTY) {
    return;
  }

  // 保持所有交互式输入在 Inquirer 的按键生命周期内。在 Inquirer 提示之间
  // 混入原始的 `data` 监听器会破坏 Windows 上的箭头/空格键。
  const { createPrompt, isEnterKey, useKeypress } = await import('@inquirer/core');
  const prompt = createPrompt<void, Record<string, never>>((_config, done) => {
    useKeypress((key) => {
      if (key.ctrl && key.name === 'c') {
        process.stdout.write('\n');
        process.exit(0);
      }

      if (isEnterKey(key)) {
        done(undefined);
      }
    });

    return '';
  });

  await prompt({});
}

/**
 * 显示动画欢迎界面。
 * 当用户按下 Enter 时返回。
 */
export async function showWelcomeScreen(
  workflows: readonly string[],
  options: { animate?: boolean } = {}
): Promise<void> {
  const textLines = getWelcomeText(workflows);

  if (options.animate === false || !canAnimate()) {
    // 回退：显示静态欢迎。"按 Enter" 行仅在我们实际等待时才是真实的；
    // 在 TTY 中，立即返回会让它请求的 Enter 键落入工具选择器并
    // 提交预选的工具而不可见。没有 TTY 时，则删除该行。
    const staticLines = process.stdin.isTTY
      ? textLines
      : textLines.filter((line) => !line.includes('按 Enter'));
    const frame = WELCOME_ANIMATION.frames[3]; // 峰值帧
    process.stdout.write('\n' + renderFrame(frame, staticLines) + '\n\n');
    await waitForEnter();
    return;
  }

  let frameIndex = 0;
  let running = true;
  let isFirstRender = true;

  // 光标在帧间移动的内容高度
  const numContentLines = Math.max(WELCOME_ANIMATION.frames[0].length, textLines.length);
  const frameHeight = numContentLines + 1; // 内部换行 (11) + 尾部换行 (2) = 13

  // 总高度，包括初始换行（用于清理）
  const totalHeight = frameHeight + 1; // 14

  // 初始渲染
  process.stdout.write('\n');

  // 动画循环
  const interval = setInterval(() => {
    if (!running) return;

    const frame = WELCOME_ANIMATION.frames[frameIndex];

    // 向上移动光标以覆盖前一帧（仅在首次渲染后）
    if (!isFirstRender) {
      process.stdout.write(`\x1b[${frameHeight}A`);
    }
    isFirstRender = false;

    // 渲染当前帧
    process.stdout.write(renderFrame(frame, textLines) + '\n\n');

    // 推进到下一帧
    frameIndex = (frameIndex + 1) % WELCOME_ANIMATION.frames.length;
  }, WELCOME_ANIMATION.interval);

  // 等待 Enter
  await waitForEnter();

  // 停止动画
  running = false;
  clearInterval(interval);

  // 清除欢迎界面并继续
  process.stdout.write(`\x1b[${totalHeight}A`);
  for (let i = 0; i < totalHeight; i++) {
    process.stdout.write('\x1b[2K\n'); // 清除行
  }
  process.stdout.write(`\x1b[${totalHeight}A`); // 向上移动
}
