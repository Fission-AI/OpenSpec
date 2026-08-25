/**
 * 命令引用工具
 *
 * 用于将命令引用转换为工具特定格式的工具。
 */

// 仅类型导入：值导入会关闭模块循环
// （command-generation 导入此文件）。调用方解析具体的能力和调用样式并传入。
import type { CommandSurfaceCapability } from '../core/command-surface.js';
import type { CommandInvocation } from '../core/command-generation/invocation.js';
// 纯无依赖帮助函数的值导入：invocation.ts 只导入 `path` 和一个类型，
// 因此这不会关闭上面注释保护的循环。
import {
  formatCommandInvocation,
  needsInvocationRewrite,
} from '../core/command-generation/invocation.js';

/**
 * 将命令体和 skill 模板中编写的规范 `/opsx:<command>` 引用
 * 重写为工具实际注册的形式 —— 按文件名命名命令的工具使用 `/opsx-<command>`，
 * Amazon Q 的提示库使用 `@opsx-<command>`。
 *
 * 仅重写已知的命令 id，与 `transformToSkillReferences` 保持一致，
 * 后者单独处理未识别的引用，因此输入错误或虚构的 `/opsx:<something>`
 * 会按原样保留，而不是被静默地改造为不存在的命令。
 *
 * @param text - 包含命令引用的文本
 * @param invocation - 工具的调用方式，来自 resolveCommandInvocation()
 * @returns 命令引用按工具方式拼写的文本
 *
 * @example
 * transformCommandInvocations('/opsx:new', { style: 'flat', prefix: '/' }) // '/opsx-new'
 * transformCommandInvocations('/opsx:new', { style: 'flat', prefix: '@' }) // '@opsx-new'
 */
export function transformCommandInvocations(
  text: string,
  invocation: CommandInvocation
): string {
  return text.replace(/\/opsx:([a-z-]+)/g, (match, commandId: string) =>
    commandId in COMMAND_TO_SKILL_NAME
      ? formatCommandInvocation(invocation, commandId)
      : match
  );
}

/**
 * 将命令短名称映射到其 skill 名称。
 * 与 WORKFLOW_TO_SKILL_DIR 保持同步，该映射同时存在于
 * src/core/profile-sync-drift.ts（导出）和 src/core/init.ts（本地副本）中。
 */
const COMMAND_TO_SKILL_NAME: Record<string, string> = {
  'explore': 'openspec-explore',
  'new': 'openspec-new-change',
  'continue': 'openspec-continue-change',
  'apply': 'openspec-apply-change',
  'update': 'openspec-update-change',
  'ff': 'openspec-ff-change',
  'sync': 'openspec-sync-specs',
  'archive': 'openspec-archive-change',
  'bulk-archive': 'openspec-bulk-archive-change',
  'verify': 'openspec-verify-change',
  'onboard': 'openspec-onboard',
  'propose': 'openspec-propose',
};

/**
 * 其 skill 调用使用非默认前缀的工具。默认是 `/`
 * （例如 `/openspec-propose`）；Kimi Code 以 `/skill:<name>` 调用 skill，
 * Codex CLI 以 `$<name>` 调用 —— Codex 不识别 `/<name>` 形式
 * （见 docs/supported-tools.md）。
 */
const SKILL_INVOCATION_PREFIX: Record<string, string> = {
  kimi: '/skill:',
  codex: '$',
};

/**
 * 完全没有斜杠命令表面的工具：skill 通过自然语言提示自动匹配或调用，
 * 永远不需要输入 `/<name>` 命令。Rovo Dev CLI 就是这样的工具 ——
 * `/skills` 只管理 skill，任何 `/openspec-*` 形式都是无效命令
 * （见 docs/supported-tools.md）。这些工具的引用以散文形式拼写
 * （"the openspec-propose skill"），因此生成的内容永远不会告诉用户
 * 去输入他们的 CLI 未注册的命令。
 */
const NATURAL_LANGUAGE_SKILL_TOOLS = new Set<string>(['rovodev']);

/**
 * 工具是否通过自然语言而不是斜杠命令引用 skill
 * （见 NATURAL_LANGUAGE_SKILL_TOOLS）。
 */
export function usesNaturalLanguageSkillReferences(toolId: string): boolean {
  return NATURAL_LANGUAGE_SKILL_TOOLS.has(toolId);
}

function replaceCommandsWithNaturalLanguageSkillReferences(text: string): string {
  return text.replace(/\/opsx:([a-z-]+)/g, (match, commandId: string) => {
    const skillName = COMMAND_TO_SKILL_NAME[commandId];
    return skillName === undefined ? match : `the ${skillName} skill`;
  });
}

function replaceCommandsWithSkillReferences(text: string, prefix: string): string {
  return text.replace(/\/opsx:([a-z-]+)/g, (match, commandId: string) => {
    const skillName = COMMAND_TO_SKILL_NAME[commandId];
    return skillName === undefined ? match : `${prefix}${skillName}`;
  });
}

/**
 * 保持 Codex 的 `$<name>` 拼写优先，同时使其规范的共享
 * `.agents` 树可被使用 `/<name>` 调用相同 skill 的 agent 使用。
 */
export function transformToCodexCompatibleSkillReferences(text: string): string {
  return text.replace(/\/opsx:([a-z-]+)/g, (match, commandId: string) => {
    const skillName = COMMAND_TO_SKILL_NAME[commandId];
    return skillName === undefined
      ? match
      : `$${skillName} (Codex) or /${skillName} (other agents)`;
  });
}

/**
 * 使用默认的 `/` 调用前缀将命令引用转换为 skill 引用。
 * 将 `/opsx:<command>` 模式转换为 `/openspec-<skill>`，
 * 以便生成的 skill 不会引用从未生成的命令。
 * 用于不绑定特定工具的通道（如 skills.sh 分发）；
 * 面向工具的生成应通过 getSkillReferenceTransformer 进行。
 *
 * 未知的命令引用保持不变。
 *
 * @param text - 包含命令引用的文本
 * @returns 命令引用转换为 skill 引用的文本
 *
 * @example
 * transformToSkillReferences('/opsx:apply') // 返回 '/openspec-apply-change'
 * transformToSkillReferences('Use /opsx:archive next') // 返回 'Use /openspec-archive-change next'
 */
export function transformToSkillReferences(text: string): string {
  return replaceCommandsWithSkillReferences(text, '/');
}

/**
 * 返回特定工具的 skill 引用转换器，遵守工具文档化的 skill 调用语法
 * （如 Kimi Code 的 `/skill:openspec-propose`）。
 * 没有斜杠表面的工具（如 Rovo Dev）获得自然语言引用
 * （"the openspec-propose skill"）；其他一切回退到默认的 `/openspec-*` 形式。
 *
 * @param toolId - AI 工具标识符（如 'kimi'、'vibe'、'rovodev'）
 * @returns 将 `/opsx:*` 引用转换为 skill 调用的转换器
 */
export function getSkillReferenceTransformer(toolId: string): (text: string) => string {
  if (usesNaturalLanguageSkillReferences(toolId)) {
    return replaceCommandsWithNaturalLanguageSkillReferences;
  }
  const prefix = SKILL_INVOCATION_PREFIX[toolId];
  if (prefix === undefined) {
    return transformToSkillReferences;
  }
  return (text: string) => replaceCommandsWithSkillReferences(text, prefix);
}

/**
 * 为 skill 生成目标选择命令引用转换器。
 *
 * 当工具最终没有 `/opsx:*` 命令时使用 skill 引用 —— 因为分发仅是 skill，
 * 因为工具完全没有命令表面（capability 'none'，如 Kimi Code 或 Mistral Vibe），
 * 或者因为工具直接调用 skill 且 OpenSpec 不为其生成命令文件
 * （capability 'skills-invocable'，即 Codex）—— 因此这些 skill
 * 永远不会指向未生成的命令。
 *
 * 当生成命令时，拼写遵循工具的调用方式：`flat` 适配器按文件名命名命令
 * （`.cursor/commands/opsx-apply.md` → `/opsx-apply`），
 * `namespaced` 适配器将其放入 `opsx/` 目录
 * （`.claude/commands/opsx/apply.md` → `/opsx:apply`），
 * 非斜杠前缀进一步包装（`.amazonq/prompts/opsx-apply.md` → `@opsx-apply`）。
 * 传入调用方式使得此模块不需要手动维护的工具列表 —— 该列表曾经漂移，
 * 导致 16 个工具在其调色板从未注册的情况下仍宣称有命令 (#727, #1307)。
 *
 * Devin 是即使生成了命令也采用 skill 引用的工具：只有 Devin Desktop
 * 读取 `.devin/workflows/`，因此 workflow 引用对 Devin Local 上的人来说
 * 是无效文本，而 `/openspec-*` skill 在两个 agent 上都可用。
 * 在仅命令的分发下没有 Devin skill 可指向，因此它回退到下面的调用重写，
 * 并获得其 workflow 文件名注册的 `/opsx-<id>` 形式。
 *
 * @param toolId - AI 工具标识符（如 'claude'、'opencode'、'pi'）
 * @param delivery - 配置的分发模式
 * @param capability - 工具的命令表面能力
 * @param invocation - 工具生成命令的调用方式，来自 resolveCommandInvocation()；
 *        对于没有命令适配器的工具为 undefined。必填而非可选，
 *        以便忘记它的调用方会编译失败而不是静默地获取规范形式。
 * @returns 传递给 generateSkillContent 的转换器，
 *          或当工具已响应规范的 `/opsx:<id>` 时为 undefined
 */
export function getTransformerForTool(
  toolId: string,
  delivery: 'both' | 'skills' | 'commands',
  capability: CommandSurfaceCapability,
  invocation: CommandInvocation | undefined
): ((text: string) => string) | undefined {
  if (delivery === 'skills' || capability !== 'adapter-backed') {
    return toolId === 'codex'
      ? transformToCodexCompatibleSkillReferences
      : getSkillReferenceTransformer(toolId);
  }
  if (toolId === 'devin' && delivery === 'both') {
    return getSkillReferenceTransformer(toolId);
  }
  if (invocation !== undefined && needsInvocationRewrite(invocation)) {
    return (text: string) => transformCommandInvocations(text, invocation);
  }
  return undefined;
}
