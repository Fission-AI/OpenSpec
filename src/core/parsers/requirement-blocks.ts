import { buildCodeFenceMask, SCENARIO_HEADER } from './requirement-text.js';

export interface RequirementBlock {
  headerLine: string; // e.g., '### Requirement: Something'
  name: string; // e.g., 'Something'
  raw: string; // full block including headerLine and following content
}

export interface RequirementsSectionParts {
  before: string;
  headerLine: string; // the '## Requirements' line
  preamble: string; // content between headerLine and first requirement block
  bodyBlocks: RequirementBlock[]; // parsed requirement blocks in order
  after: string;
}

export function normalizeRequirementName(name: string): string {
  return name.trim();
}

/**
 * 对需求名称进行大小写和空格不敏感的折叠。需求匹配
 * 本身是区分大小写的（normalizeRequirementName）；此折叠
 * 仅用于拼写检测 — 近似的 REMOVED 标题和
 * RENAMED+REMOVED 跨章节冲突 — 其中两个仅在大小写或内部空格上不同的
 * 拼写意味着一个错误，而不是两个需求。
 */
export function foldRequirementName(name: string): string {
  return normalizeRequirementName(name).toLowerCase().replace(/\s+/g, ' ');
}

/** delta 读取器识别的规范需求标题。 */
const REQUIREMENT_HEADER_REGEX = /^###\s*Requirement:\s*(.+)\s*$/i;

/**
 * 从 spec 文件中提取 Requirements 章节并解析需求块。
 */
export function extractRequirementsSection(content: string): RequirementsSectionParts {
  const normalized = normalizeLineEndings(content);
  const lines = normalized.split('\n');
  const fenceMask = buildCodeFenceMask(lines);
  const reqHeaderIndex = lines.findIndex((l, i) => !fenceMask[i] && /^##\s+Requirements\s*$/i.test(l));

  if (reqHeaderIndex === -1) {
    // 没有需求章节；在末尾创建一个空的
    const before = content.trimEnd();
    const headerLine = '## Requirements';
    return {
      before: before ? before + '\n\n' : '',
      headerLine,
      preamble: '',
      bodyBlocks: [],
      after: '\n',
    };
  }

  // 找到本章节的结束：以相同或更高级别 '## ' 开头的下一行
  let endIndex = lines.length;
  for (let i = reqHeaderIndex + 1; i < lines.length; i++) {
    if (!fenceMask[i] && /^##\s+/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  const before = lines.slice(0, reqHeaderIndex).join('\n');
  const headerLine = lines[reqHeaderIndex];
  const sectionBodyLines = lines.slice(reqHeaderIndex + 1, endIndex);
  const sectionBodyMask = fenceMask.slice(reqHeaderIndex + 1, endIndex);
  const isRequirementHeader = (cursor: number): boolean =>
    !sectionBodyMask[cursor] && REQUIREMENT_HEADER_REGEX.test(sectionBodyLines[cursor]);
  const isTopLevelHeader = (cursor: number): boolean =>
    !sectionBodyMask[cursor] && /^##\s+/.test(sectionBodyLines[cursor]);

  // 在章节正文中解析需求块
  const blocks: RequirementBlock[] = [];
  let cursor = 0;
  let preambleLines: string[] = [];

  // 收集前导行直到第一个需求标题
  while (cursor < sectionBodyLines.length && !isRequirementHeader(cursor)) {
    preambleLines.push(sectionBodyLines[cursor]);
    cursor++;
  }

  while (cursor < sectionBodyLines.length) {
    const headerLineCandidate = sectionBodyLines[cursor];
    if (!isRequirementHeader(cursor)) {
      // 不是需求标题；防御性地跳过行
      cursor++;
      continue;
    }
    const headerMatch = headerLineCandidate.match(REQUIREMENT_HEADER_REGEX)!;
    const name = normalizeRequirementName(headerMatch[1]);
    cursor++;
    // 收集行直到下一个需求标题或章节结束
    const bodyLines: string[] = [headerLineCandidate];
    while (cursor < sectionBodyLines.length && !isRequirementHeader(cursor) && !isTopLevelHeader(cursor)) {
      bodyLines.push(sectionBodyLines[cursor]);
      cursor++;
    }
    const raw = bodyLines.join('\n').trimEnd();
    blocks.push({ headerLine: headerLineCandidate, name, raw });
  }

  const after = lines.slice(endIndex).join('\n');
  const preamble = preambleLines.join('\n').trimEnd();

  return {
    before: before.trimEnd() ? before + '\n' : before,
    headerLine,
    preamble,
    bodyBlocks: blocks,
    after: after.startsWith('\n') ? after : '\n' + after,
  };
}

/**
 * `## ADDED`/`## MODIFIED Requirements` 中的三级标题，
 * 不是规范的 `### Requirement:` 标题，在 delta 读取器
 * 跳过时被记录。作为 INFO 提示由 `validate <change>` 输出（#498）。
 */
export interface SkippedHeader {
  header: string; // header text without the leading ###
  section: string; // the ## section title as written
  line: number; // 1-based line number in the delta file
}

export interface DeltaPlan {
  added: RequirementBlock[];
  modified: RequirementBlock[];
  removed: string[]; // requirement names
  renamed: Array<{ from: string; to: string }>;
  skippedHeaders: SkippedHeader[]; // non-canonical ### headers the reader skipped
  sectionPresence: {
    added: boolean;
    modified: boolean;
    removed: boolean;
    renamed: boolean;
  };
}

function normalizeLineEndings(content: string): string {
  // 去除 UTF-8 BOM：Windows 编辑器和 PowerShell 重定向会添加一个，
  // 这会阻止第一行的 `## ADDED Requirements` 匹配。
  return content.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

/**
 * 以行表示的文档切片，加上标记围栏代码块内行的并行掩码
 * （检测 Markdown 结构时必须忽略）。
 */
interface SectionBody {
  lines: string[];
  fenceMask: boolean[];
  bodyStartLine: number;
}

/**
 * 将 delta 格式的 spec 变更文件内容解析为带有原始块的 DeltaPlan。
 */
export function parseDeltaSpec(content: string): DeltaPlan {
  const normalized = normalizeLineEndings(content);
  const lines = normalized.split('\n');
  const fenceMask = buildCodeFenceMask(lines);
  const sections = splitTopLevelSections(lines, fenceMask);
  const addedLookup = getSectionCaseInsensitive(sections, 'ADDED Requirements');
  const modifiedLookup = getSectionCaseInsensitive(sections, 'MODIFIED Requirements');
  const removedLookup = getSectionCaseInsensitive(sections, 'REMOVED Requirements');
  const renamedLookup = getSectionCaseInsensitive(sections, 'RENAMED Requirements');
  const skippedHeaders: SkippedHeader[] = [];
  const added = parseRequirementBlocksFromSection(addedLookup.body, {
    section: addedLookup.title,
    bodyStartLine: addedLookup.bodyStartLine,
    sink: skippedHeaders,
  });
  const modified = parseRequirementBlocksFromSection(modifiedLookup.body, {
    section: modifiedLookup.title,
    bodyStartLine: modifiedLookup.bodyStartLine,
    sink: skippedHeaders,
  });
  const removedNames = parseRemovedNames(removedLookup.body);
  const renamedPairs = parseRenamedPairs(renamedLookup.body);
  skippedHeaders.sort((a, b) => a.line - b.line);
  return {
    added,
    modified,
    removed: removedNames,
    renamed: renamedPairs,
    skippedHeaders,
    sectionPresence: {
      added: addedLookup.found,
      modified: modifiedLookup.found,
      removed: removedLookup.found,
      renamed: renamedLookup.found,
    },
  };
}

function splitTopLevelSections(lines: string[], fenceMask: boolean[]): Record<string, SectionBody> {
  const result: Record<string, SectionBody> = {};
  const indices: Array<{ title: string; index: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    if (fenceMask[i]) continue;
    const m = lines[i].match(/^(##)\s+(.+)$/);
    if (m) {
      indices.push({ title: m[2].trim(), index: i });
    }
  }
  for (let i = 0; i < indices.length; i++) {
    const current = indices[i];
    const next = indices[i + 1];
    const end = next ? next.index : lines.length;
    result[current.title] = {
      lines: lines.slice(current.index + 1, end),
      fenceMask: fenceMask.slice(current.index + 1, end),
      bodyStartLine: current.index + 2,
    };
  }
  return result;
}

const EMPTY_SECTION_BODY: SectionBody = { lines: [], fenceMask: [], bodyStartLine: 0 };

function getSectionCaseInsensitive(
  sections: Record<string, SectionBody>,
  desired: string
): { title: string; body: SectionBody; bodyStartLine: number; found: boolean } {
  const target = desired.toLowerCase();
  for (const [title, body] of Object.entries(sections)) {
    if (title.toLowerCase() === target) {
      return { title, body, bodyStartLine: body.bodyStartLine, found: true };
    }
  }
  return { title: desired, body: EMPTY_SECTION_BODY, bodyStartLine: 0, found: false };
}

function parseRequirementBlocksFromSection(
  sectionBody: SectionBody,
  skipped?: { section: string; bodyStartLine: number; sink: SkippedHeader[] }
): RequirementBlock[] {
  const { lines, fenceMask } = sectionBody;
  if (lines.length === 0) return [];
  const isRequirementHeader = (i: number): boolean => !fenceMask[i] && REQUIREMENT_HEADER_REGEX.test(lines[i]);
  const isTopLevelHeader = (i: number): boolean => !fenceMask[i] && /^##\s+/.test(lines[i]);
  const recordIfSkippedHeader = (index: number) => {
    if (!skipped || fenceMask[index]) return;
    const h3 = lines[index].match(/^###\s+(.+?)\s*$/);
    if (h3 && !REQUIREMENT_HEADER_REGEX.test(lines[index])) {
      skipped.sink.push({
        header: h3[1].trim(),
        section: skipped.section,
        line: skipped.bodyStartLine + index,
      });
    }
  };
  const blocks: RequirementBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    // Seek next requirement header
    while (i < lines.length && !isRequirementHeader(i)) {
      recordIfSkippedHeader(i);
      i++;
    }
    if (i >= lines.length) break;
    const headerLine = lines[i];
    const m = headerLine.match(REQUIREMENT_HEADER_REGEX);
    if (!m) { i++; continue; }
    const name = normalizeRequirementName(m[1]);
    const buf: string[] = [headerLine];
    i++;
    while (i < lines.length && !isRequirementHeader(i) && !isTopLevelHeader(i)) {
      recordIfSkippedHeader(i);
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ headerLine, name, raw: buf.join('\n').trimEnd() });
  }
  return blocks;
}

function parseRemovedNames(sectionBody: SectionBody): string[] {
  const { lines, fenceMask } = sectionBody;
  if (lines.length === 0) return [];
  const names: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (fenceMask[i]) continue;
    const line = lines[i];
    const m = line.match(REQUIREMENT_HEADER_REGEX);
    if (m) {
      names.push(normalizeRequirementName(m[1]));
      continue;
    }
    // Also support bullet list of headers
    const bullet = line.match(/^\s*-\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
    if (bullet) {
      names.push(normalizeRequirementName(bullet[1]));
    }
  }
  return names;
}

function parseRenamedPairs(sectionBody: SectionBody): Array<{ from: string; to: string }> {
  const { lines, fenceMask } = sectionBody;
  if (lines.length === 0) return [];
  const pairs: Array<{ from: string; to: string }> = [];
  let current: { from?: string; to?: string } = {};
  for (let i = 0; i < lines.length; i++) {
    if (fenceMask[i]) continue;
    const line = lines[i];
    const fromMatch = line.match(/^\s*-?\s*FROM:\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
    const toMatch = line.match(/^\s*-?\s*TO:\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
    if (fromMatch) {
      current.from = normalizeRequirementName(fromMatch[1]);
    } else if (toMatch) {
      current.to = normalizeRequirementName(toMatch[1]);
      if (current.from && current.to) {
        pairs.push({ from: current.from, to: current.to });
        current = {};
      }
    }
  }
  return pairs;
}

interface ScenarioBlock {
  name: string;
  raw: string;
}

/**
 * 当前需求块中存在但即将（MODIFIED）块中没有的场景名称。
 * MODIFIED 需求替换整个块，因此这里报告的每个名称
 * 都会从主 spec 中删除。
 *
 * 由 archive（拒绝应用该块）和 validate（在编写时报告相同的丢失，#1477）
 * 共享，因此两者不能对什么算作丢失的场景产生分歧。
 */
export function findMissingCurrentScenarios(current: RequirementBlock, incoming: RequirementBlock): string[] {
  // 多重性感知：一个名称在当前块中出现 N 次，在即将到来的块中出现
  // M 次，意味着缺少 max(0, N - M) 个实例。集合成员会将 N>M 视为
  // 完全覆盖，让 archive 静默删除重复项
  // （残余 #1246 / 重复场景名盲区）。
  const remainingIncoming = new Map<string, number>();
  for (const scenario of parseScenarioBlocks(incoming.raw)) {
    const name = scenario.name;
    remainingIncoming.set(name, (remainingIncoming.get(name) ?? 0) + 1);
  }

  const missing: string[] = [];
  for (const scenario of parseScenarioBlocks(current.raw)) {
    const name = scenario.name;
    const remaining = remainingIncoming.get(name) ?? 0;
    if (remaining > 0) {
      remainingIncoming.set(name, remaining - 1);
    } else {
      missing.push(name);
    }
  }
  return missing;
}

/**
 * 给定（掩码）行上的任意非围栏四级标题。复用 spec 路径的
 * SCENARIO_HEADER，使两个计数器不会产生偏差。
 */
function scenarioHeaderAt(lines: string[], mask: boolean[], index: number): boolean {
  return !mask[index] && SCENARIO_HEADER.test(lines[index]);
}

/**
 * `#### ` 标题的场景名称，匹配作者读取的标签：
 * 带有前导 `####` 的标题文本、可选的 CommonMark 闭合 `#`
 * 序列（`#### Foo ####` 渲染为 `Foo`），以及可选的 `Scenario:` 前缀
 * 被去除。当前和即将到来的块都通过此处运行，因此
 * findMissingCurrentScenarios 中的比较在内部保持一致
 * 无论标签如何 — 两个渲染为相同标题的标题（一个
 * ATX 闭合，一个没有）不会被误认为丢失的场景。
 */
function scenarioNameAt(line: string): string {
  return line
    .replace(SCENARIO_HEADER, '')
    // 可选的 ATX 闭合序列。CommonMark 仅在尾部 `#` 运行
    // 前面有空格或制表符时才将其视为闭合 — 不是任何 Unicode 空格 —
    // 因此这里使用 `[ \t]`，而不是 `\s`。更宽松的 `\s` 可能会在
    // 异域空格（如 NBSP）后去除 `#` 运行，CommonMark 保留这些空格，
    // 将两个不同的场景名称折叠为一个并掩盖真实丢失。`[ \t]` 保持折叠
    // 忠实于标题的实际渲染方式。
    .replace(/[ \t]+#+[ \t]*$/, '')
    .replace(/^Scenario:\s*/i, '')
    .trim();
}

function parseScenarioBlocks(requirementRaw: string): ScenarioBlock[] {
  const lines = requirementRaw.replace(/\r\n?/g, '\n').split('\n');
  // 场景是任何非围栏的 `#### ` 标题，匹配 spec 路径的
  // SCENARIO_HEADER / countScenarios（requirement-text.ts）完全一致 — 不仅仅是
  // `#### Scenario:`。两者必须一致：标题不是字面意义上的
  // `Scenario:` 的四级子项（如 `#### Edge case`）仍然是 spec 路径
  // 计数的场景，因此删除它的 MODIFIED 块否则会绕过
  // 此丢失检查并被 archive 无错误删除（即
  // SCENARIO_HEADER 注释警告不要破坏的对等性）。围栏内的 `####`
  // 示例被掩码排除，匹配 countScenarios。
  const mask = buildCodeFenceMask(lines);
  const scenarios: ScenarioBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!scenarioHeaderAt(lines, mask, index)) {
      index++;
      continue;
    }

    const start = index;
    const name = scenarioNameAt(lines[index]);
    index++;
    while (index < lines.length && !scenarioHeaderAt(lines, mask, index)) {
      index++;
    }

    scenarios.push({
      name,
      raw: lines.slice(start, index).join('\n').trimEnd(),
    });
  }

  return scenarios;
}
