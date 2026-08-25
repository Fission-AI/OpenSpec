import { execSync, execFileSync } from 'child_process';
import { createRequire } from 'module';
import os from 'os';

const require = createRequire(import.meta.url);
const MAX_TITLE_LENGTH = 72;
const TITLE_PREFIX = '反馈：';

/**
 * 检查 gh CLI 是否已安装并在 PATH 中可用
 * 使用平台适当的命令：Windows 上的 'where'，Unix/macOS 上的 'which'
 */
function isGhInstalled(): boolean {
  try {
    const command = process.platform === 'win32' ? 'where gh' : 'which gh';
    execSync(command, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查 gh CLI 是否已认证
 */
function isGhAuthenticated(): boolean {
  try {
    execSync('gh auth status', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 从 package.json 获取 OpenSpec 版本
 */
function getVersion(): string {
  try {
    const { version } = require('../../package.json');
    return version;
  } catch {
    return '未知';
  }
}

/**
 * 获取平台名称
 */
function getPlatform(): string {
  return os.platform();
}

/**
 * 获取 ISO 格式的当前时间戳
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 生成反馈的元数据页脚
 */
function generateMetadata(): string {
  const version = getVersion();
  const platform = getPlatform();
  const timestamp = getTimestamp();

  return `---
通过 OpenSpec CLI 提交
- 版本：${version}
- 平台：${platform}
- 时间戳：${timestamp}`;
}

/**
 * 格式化反馈标题
 */
function formatTitle(message: string): string {
  const normalizedMessage = message.replace(/\s+/g, ' ').trim();
  const title = `${TITLE_PREFIX}${normalizedMessage}`;

  if (Array.from(title).length <= MAX_TITLE_LENGTH) {
    return title;
  }

  const availableLength = MAX_TITLE_LENGTH - TITLE_PREFIX.length - 1;
  let candidate = '';
  let candidateLength = 0;
  const segments = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(
    normalizedMessage
  );

  for (const { segment } of segments) {
    const segmentLength = Array.from(segment).length;
    if (candidateLength + segmentLength > availableLength) {
      break;
    }
    candidate += segment;
    candidateLength += segmentLength;
  }

  candidate = candidate.trimEnd();
  const lastSpace = candidate.lastIndexOf(' ');
  const summary = lastSpace > 0 ? candidate.slice(0, lastSpace) : candidate;
  return `${TITLE_PREFIX}${summary}…`;
}

/**
 * 格式化完整的反馈正文
 */
function formatBody(message: string, bodyText?: string): string {
  const parts = ['## 摘要', '', message];

  if (bodyText) {
    parts.push('', '## 详情', '', bodyText);
  }

  parts.push('', generateMetadata());

  return parts.join('\n');
}

/**
 * 为手动提交生成预填的 GitHub issue URL
 */
function generateManualSubmissionUrl(title: string, body: string): string {
  const repo = 'Fission-AI/OpenSpec';
  const encodedTitle = encodeURIComponent(title);
  const encodedBody = encodeURIComponent(body);
  const encodedLabels = encodeURIComponent('feedback');

  return `https://github.com/${repo}/issues/new?title=${encodedTitle}&body=${encodedBody}&labels=${encodedLabels}`;
}

/**
 * 显示格式化的反馈内容以便手动提交
 */
function displayFormattedFeedback(title: string, body: string): void {
  console.log('\n--- 格式化反馈 ---');
  console.log(`标题：${title}`);
  console.log(`标签：feedback`);
  console.log('\n正文：');
  console.log(body);
  console.log('--- 反馈结束 ---\n');
}

/**
 * 检查 gh 是否因为仓库未定义标签而拒绝了该 issue。
 * gh 在创建 issue 之前解析标签名称，因此此失败
 * 意味着没有创建任何 issue。
 *
 * 仅检查 gh 的 stderr。错误消息还嵌入了命令
 * 行，其中包含用户自己的反馈文本。
 */
function isMissingLabelError(error: any): boolean {
  return /could not add label/i.test(error?.stderr?.toString() ?? '');
}

/**
 * 报告 gh CLI 失败并退出，保留 gh 的退出码。
 *
 * gh 在用户已经输入反馈后失败（issues 被禁用、
 * 网络、速率限制等），因此显示与无 gh 和未认证流程
 * 相同的手动提交路径，而不是丢弃文本。
 */
function reportGhFailure(error: any, title: string, body: string): void {
  // 显示 gh CLI 的错误输出
  if (error.stderr) {
    console.error(error.stderr.toString());
  } else if (error.message) {
    console.error(error.message);
  }

  displayFormattedFeedback(title, body);

  const manualUrl = generateManualSubmissionUrl(title, body);
  console.log('请手动提交您的反馈：');
  console.log(manualUrl);

  // 使用与 gh CLI 相同的退出码退出
  process.exit(error.status ?? 1);
}

/**
 * 通过 gh CLI 创建反馈 issue
 * 使用 execFileSync 以防止 shell 注入漏洞
 */
function createIssue(title: string, body: string, labels: string[]): string {
  const args = [
    'issue',
    'create',
    '--repo',
    'Fission-AI/OpenSpec',
    '--title',
    title,
    '--body',
    body,
  ];

  for (const label of labels) {
    args.push('--label', label);
  }

  const result = execFileSync('gh', args, { encoding: 'utf-8', stdio: 'pipe' });

  return result.trim();
}

/**
 * 通过 gh CLI 提交反馈
 */
function submitViaGhCli(title: string, body: string): void {
  let issueUrl: string;
  let labelApplied = true;

  try {
    issueUrl = createIssue(title, body, ['feedback']);
  } catch (error: any) {
    if (!isMissingLabelError(error)) {
      reportGhFailure(error, title, body);
      return;
    }

    // 仓库未定义 'feedback' 标签。没有创建任何内容，
    // 因此尝试不带标签重新提交，而不是丢弃反馈。
    try {
      issueUrl = createIssue(title, body, []);
      labelApplied = false;
    } catch (retryError: any) {
      reportGhFailure(retryError, title, body);
      return;
    }
  }

  console.log(`\n✓ 反馈提交成功！`);
  console.log(`Issue URL：${issueUrl}\n`);

  if (!labelApplied) {
    console.log(
      '注意：创建时未添加 'feedback' 标签，因为仓库未定义此标签。\n'
    );
  }
}

/**
 * 处理 gh CLI 不可用或未认证时的回退方案
 */
function handleFallback(title: string, body: string, reason: 'missing' | 'unauthenticated'): void {
  if (reason === 'missing') {
    console.log('⚠️  未找到 GitHub CLI。需要手动提交。');
  } else {
    console.log('⚠️  需要 GitHub 认证。需要手动提交。');
  }

  displayFormattedFeedback(title, body);

  const manualUrl = generateManualSubmissionUrl(title, body);
  console.log('请手动提交您的反馈：');
  console.log(manualUrl);

  if (reason === 'unauthenticated') {
    console.log('\n如需自动提交：gh auth login');
  }

  // 以成功码退出（回退方案是成功的）
  process.exit(0);
}

/**
 * 反馈命令实现
 */
export class FeedbackCommand {
  async execute(message: string, options?: { body?: string }): Promise<void> {
    // 一次性格式化标题和正文，用于所有代码路径
    const title = formatTitle(message);
    const body = formatBody(message, options?.body);

    // 检查 gh CLI 是否已安装
    if (!isGhInstalled()) {
      handleFallback(title, body, 'missing');
      return;
    }

    // 检查 gh CLI 是否已认证
    if (!isGhAuthenticated()) {
      handleFallback(title, body, 'unauthenticated');
      return;
    }

    // 通过 gh CLI 提交
    submitViaGhCli(title, body);
  }
}