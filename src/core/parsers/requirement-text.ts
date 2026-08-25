/**
 * 共享的、围栏感知的需求读取辅助函数。
 *
 * 需求读取器以前实现了两次 — 一次用于主 spec
 * （`MarkdownParser.parseRequirements`），一次用于 change delta
 * （`Validator.extractRequirementText` / `countScenarios`）— 两者发生了偏差。
 * 这些辅助函数是需求体提取、场景计数和 `SHALL`/`MUST` 检测的
 * 唯一可信来源，用于 `validate <change>`、`validate <spec>` 和 `archive`。
 */

// 重新导出以便现有导入器继续工作；唯一实现
// 位于 code-fence.ts。
export { buildCodeFenceMask } from './code-fence.js';
import { buildCodeFenceMask } from './code-fence.js';

/** 看起来像 `**ID**: ...` / `**Priority**: ...` 元数据的行。 */
const METADATA_LINE = /^\*\*[^*]+\*\*:/;

/** 任意 markdown 标题行 — 需求体结束的边界。 */
const HEADER_LINE = /^#{1,6}\s/;

/**
 * 四级标题。故意匹配任何 `####` 标题，而不仅仅是
 * `#### Scenario:` — spec 路径将需求的每个四级子项都当作
 * 场景处理，因此 delta 计数器也必须这样做（对等性）。delta/loss 路径
 * 通过 requirement-blocks.ts 中的 `scenarioHeaderAt` 重用此常量；
 * 保持两条路径使用它，而不是重新引入单独的 `Scenario:` 正则。
 */
export const SCENARIO_HEADER = /^####\s+/;

/**
 * 规范关键词检测的唯一谓词。匹配 `SHALL` 或 `MUST`
 * 作为完整单词，以便 change-delta 读取器和基于 schema 的读取器接受
 * 和拒绝相同的文本。
 */
export function containsShallOrMust(text: string): boolean {
  return /\b(SHALL|MUST)\b/.test(text);
}

/**
 * 从 `### Requirement:` 标题后的行中提取完整需求体
 * （行中可能包含场景和围栏代码）。
 *
 * 捕获从开头到非围栏行上第一个标题的所有正文行 —
 * 通常是第一个 `#### Scenario:`，但也包括 delta 读取器吸收到块中的
 * 零散 `###` 分隔符 — 跳过空行和围栏代码块内的任何行。`**metadata**:`
 * 行仅在还有其他正文文本时跳过；完全以 `**Constraint**: The system MUST ...`
 * 编写的需求将该行保留为正文。捕获的行被修剪并用换行符连接，因此文本跨行
 * 换行的需求 — 或其 `SHALL`/`MUST` 出现在后续行 — 被完整读取。
 */
export function extractRequirementBody(bodyLines: string[]): string {
  const mask = buildCodeFenceMask(bodyLines);
  const captured: string[] = [];
  const metadata: string[] = [];

  for (let i = 0; i < bodyLines.length; i++) {
    if (mask[i]) continue; // 在围栏代码块内
    const line = bodyLines[i];
    if (HEADER_LINE.test(line)) break; // 第一个场景或零散分隔符
    const trimmed = line.trim();
    if (trimmed.length === 0) continue; // 空行
    if (METADATA_LINE.test(trimmed)) {
      metadata.push(trimmed); // **ID**: / **Priority**: ...
      continue;
    }
    captured.push(trimmed);
  }

  if (captured.length > 0) return captured.join('\n');
  return metadata.join('\n'); // 仅元数据的正文：元数据即正文
}

/**
 * Parser/display fallback for a requirement block with no body text. This is
 * what lets a bare `### The system SHALL ...` header remain readable on the
 * spec path (the title is the requirement). Validator body-keyword checks for
 * canonical `### Requirement:` blocks use `extractRequirementBody` directly so
 * a keyword that appears only in the header still receives the #1156/#1280
 * body-keyword hint.
 */
export function extractRequirementText(headerTitle: string, bodyLines: string[]): string {
  return extractRequirementBody(bodyLines) || headerTitle.trim();
}

/**
 * Count the real scenarios in a requirement block: `#### ` headers on non-fenced
 * lines. A `#### Scenario:` that lives inside a fenced example is not a real
 * scenario and is not counted.
 */
export function countScenarios(bodyLines: string[]): number {
  const mask = buildCodeFenceMask(bodyLines);
  let count = 0;
  for (let i = 0; i < bodyLines.length; i++) {
    if (mask[i]) continue;
    if (SCENARIO_HEADER.test(bodyLines[i])) count++;
  }
  return count;
}
