/**
 * 匿名使用分析的遥测模块。
 *
 * 隐私优先设计：
 * - 仅跟踪命令名称和版本
 * - 不跟踪参数、文件路径或内容
 * - 通过 OPENSPEC_TELEMETRY=0、DO_NOT_TRACK=1 或
 *   `openspec config set telemetry.enabled false` 选择退出
 * - 在 CI 环境中自动禁用
 * - 匿名 ID 是与用户无关的随机 UUID
 *
 * 事件通过普通的 fetch 发送到 PostHog 稳定的公共 `/batch/`
 * 端点 —— 与 posthog-node 使用的相同端点 —— 而不是通过 SDK。
 * SDK 在这里唯一剩余的工作是有线格式：每个可靠性旋钮
 * 都已被强制为"立即发送一个事件、时间受限、永不重试、永不抛错"。
 * 为携带 `posthog-node`，其快速变化的传递依赖树
 * （`@posthog/core`、`@posthog/types`、每天多个发布版本）
 * 到每个下游消费者，在供应链老化策略如 pnpm 的 `minimumReleaseAge`
 * 中会拒绝刚发布的版本并破坏安装 (#1390)。
 */
import { randomUUID } from 'crypto';
import { getGlobalConfig } from '../core/global-config.js';
import { isCiEnvironment } from '../utils/ci.js';
import { getTelemetryConfig, updateTelemetryConfig } from './config.js';

// PostHog API 密钥 - 客户端分析的公钥
// 嵌入此密钥是安全的，因为它只允许发送事件，而不是读取数据
const POSTHOG_API_KEY = 'phc_Hthu8YvaIJ9QaFKyTG4TbVwkbd5ktcAFzVTKeMmoW2g';
// 使用反向代理以避免广告拦截器并保持流量在我们的域名上
const POSTHOG_HOST = 'https://edge.openspec.dev';
const TELEMETRY_REQUEST_TIMEOUT_MS = 1000;

let anonymousId: string | null = null;

/**
 * 由 trackCommand 启动且尚未结算的请求，以便关闭前可以在进程退出前刷新它们。
 * 每个请求都有单独的时间限制，因此等待它们不会将退出时间延长到
 * 请求超时以上。
 */
const pendingEvents = new Set<Promise<void>>();

async function safeTelemetryFetch(url: string, options: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);
    // 遥测从不读取正文，但 undici 会保持连接
    // 直到正文被消费或取消 —— 在每个路径上释放它，
    // 确保没有 socket 存活到 shutdown() 之后。
    if (response.body) {
      await response.body.cancel();
    }
    if (response.ok) {
      return response;
    }
  } catch {
    // 静默失败 - 遥测不应暴露网络噪音
  }

  return new Response(null, { status: 204 });
}

/**
 * 检查遥测是否已启用。
 *
 * 优先级（第一个匹配生效）：
 * 1. OPENSPEC_TELEMETRY=0 → 禁用
 * 2. DO_NOT_TRACK=1 → 禁用
 * 3. CI 设置为真值/开启值 → 禁用（与 version-check 规则相同）
 * 4. 全局配置 telemetry.enabled === false → 禁用
 * 5. 其他情况启用（未设置配置表示开启；选择退出模式）
 *
 * 保持同步以便调用点不需要变为异步。
 * 通过同步的 getGlobalConfig() 而不是异步的 getTelemetryConfig() 读取配置。
 */
export function isTelemetryEnabled(): boolean {
  // 检查显式选择退出
  if (process.env.OPENSPEC_TELEMETRY === '0') {
    return false;
  }

  // 遵循 DO_NOT_TRACK 标准
  if (process.env.DO_NOT_TRACK === '1') {
    return false;
  }

  // 在 CI 环境中自动禁用（提供商使用 true/1/yes/…）
  if (isCiEnvironment()) {
    return false;
  }

  // 全局配置选择退出（环境变量/CI 仍然是硬覆盖）
  if (getGlobalConfig().telemetry?.enabled === false) {
    return false;
  }

  return true;
}

/**
 * 获取或创建匿名用户 ID。
 * 首次调用时懒加载生成 UUID 并持久化。
 */
export async function getOrCreateAnonymousId(): Promise<string> {
  // 如果可用则返回缓存值
  if (anonymousId) {
    return anonymousId;
  }

  // 尝试从配置加载
  const config = await getTelemetryConfig();
  if (config.anonymousId) {
    anonymousId = config.anonymousId;
    return anonymousId;
  }

  // 生成新的 UUID 并持久化
  anonymousId = randomUUID();
  await updateTelemetryConfig({ anonymousId });
  return anonymousId;
}

/**
 * 向 PostHog 的批量端点发送一个捕获事件。即发即忘：
 * 受请求超时限制，永不抛错，永不重试。
 */
function sendEvent(distinctId: string, event: string, properties: Record<string, unknown>): void {
  const body = JSON.stringify({
    api_key: POSTHOG_API_KEY,
    batch: [
      {
        type: 'capture',
        event,
        distinct_id: distinctId,
        properties,
        timestamp: new Date().toISOString(),
      },
    ],
  });

  const request = safeTelemetryFetch(`${POSTHOG_HOST}/batch/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    signal: AbortSignal.timeout(TELEMETRY_REQUEST_TIMEOUT_MS),
  }).then(() => undefined);

  pendingEvents.add(request);
  void request.finally(() => pendingEvents.delete(request));
}

/**
 * 跟踪命令执行。
 *
 * @param commandName - 命令名称（如 'init'、'change:apply'）
 * @param version - OpenSpec 版本
 */
export async function trackCommand(commandName: string, version: string): Promise<void> {
  if (!isTelemetryEnabled()) {
    return;
  }

  try {
    const userId = await getOrCreateAnonymousId();

    sendEvent(userId, 'command_executed', {
      command: commandName,
      version: version,
      surface: 'cli',
      $ip: null, // 显式禁用 IP 跟踪
    });
  } catch {
    // 静默失败 - 遥测不应破坏 CLI
  }
}

/**
 * 如果尚未显示，则显示首次运行的遥测通知。
 */
export async function maybeShowTelemetryNotice(
  options: { silent?: boolean } = {}
): Promise<void> {
  if (!isTelemetryEnabled()) {
    return;
  }

  try {
    const config = await getTelemetryConfig();
    if (config.noticeSeen) {
      return;
    }

    // 在 --json 模式下，通知会污染 stdout 并破坏解析器，因此
    // 延迟它：跳过通知并保持 noticeSeen 未设置，以便披露
    // 仍会在用户首次后续非 JSON 运行时出现。
    if (options.silent) {
      return;
    }

    // 在 stderr 上显示通知，而不是 stdout：stdout 专为命令
    // 输出（原始透传文本、JSON 等）保留，必须保持解析器/管道安全。
    console.error(
      '注意：OpenSpec 收集匿名使用统计。选择退出：OPENSPEC_TELEMETRY=0 或 openspec config set telemetry.enabled false'
    );

    // 标记为已见
    await updateTelemetryConfig({ noticeSeen: true });
  } catch {
    // 静默失败 - 遥测不应破坏 CLI
  }
}

/**
 * 刷新待处理的遥测事件。
 * 在 CLI 退出前调用。
 */
export async function shutdown(): Promise<void> {
  if (pendingEvents.size === 0) {
    return;
  }

  try {
    await Promise.allSettled([...pendingEvents]);
  } catch {
    // 静默失败 - 遥测不应破坏 CLI 退出
  } finally {
    pendingEvents.clear();
  }
}
