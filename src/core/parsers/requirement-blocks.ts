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

const REQUIREMENT_HEADER_REGEX = /^###\s*Requirement:\s*(.+)\s*$/;

/**
 * Detect Markdown fenced code block delimiters.
 * Supports:
 * - Backtick fences (```) and tilde fences (~~~)
 * - Optional leading indentation (up to 3 spaces per CommonMark)
 * - Minimum 3 fence characters
 */
export function isMarkdownFenceLine(line: string): boolean {
  return /^ {0,3}(`{3,}|~{3,})/.test(line);
}

/**
 * Extracts the Requirements section from a spec file and parses requirement blocks.
 */
export function extractRequirementsSection(content: string): RequirementsSectionParts {
  const normalized = normalizeLineEndings(content);
  const lines = normalized.split('\n');
  const reqHeaderIndex = lines.findIndex(l => /^##\s+Requirements\s*$/i.test(l));

  if (reqHeaderIndex === -1) {
    // No requirements section; create an empty one at the end
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

  // Find end of this section: next line that starts with '## ' at same or higher level
  // Skip headers inside fenced code blocks
  let endIndex = lines.length;
  let inFenceEnd = false;
  for (let i = reqHeaderIndex + 1; i < lines.length; i++) {
    if (isMarkdownFenceLine(lines[i])) {
      inFenceEnd = !inFenceEnd;
      continue;
    }
    if (!inFenceEnd && /^##\s+/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  const before = lines.slice(0, reqHeaderIndex).join('\n');
  const headerLine = lines[reqHeaderIndex];
  const sectionBodyLines = lines.slice(reqHeaderIndex + 1, endIndex);

  // Parse requirement blocks within section body
  const blocks: RequirementBlock[] = [];
  let cursor = 0;
  let preambleLines: string[] = [];

  // Collect preamble lines until first requirement header
  // Track fenced code blocks so headers inside them are skipped
  let inFencePreamble = false;
  while (cursor < sectionBodyLines.length) {
    if (isMarkdownFenceLine(sectionBodyLines[cursor])) {
      inFencePreamble = !inFencePreamble;
    }
    if (!inFencePreamble && /^###\s+Requirement:/.test(sectionBodyLines[cursor])) {
      break;
    }
    preambleLines.push(sectionBodyLines[cursor]);
    cursor++;
  }

  while (cursor < sectionBodyLines.length) {
    const headerStart = cursor;
    const headerLineCandidate = sectionBodyLines[cursor];
    const headerMatch = headerLineCandidate.match(REQUIREMENT_HEADER_REGEX);
    if (!headerMatch) {
      // Not a requirement header; skip line defensively
      cursor++;
      continue;
    }
    const name = normalizeRequirementName(headerMatch[1]);
    cursor++;
    // Gather lines until next requirement header or end of section
    // Track fenced code blocks so headers inside them don't break the block
    const bodyLines: string[] = [headerLineCandidate];
    let inFenceBody = false;
    while (cursor < sectionBodyLines.length) {
      if (isMarkdownFenceLine(sectionBodyLines[cursor])) {
        inFenceBody = !inFenceBody;
      }
      if (!inFenceBody && (/^###\s+Requirement:/.test(sectionBodyLines[cursor]) || /^##\s+/.test(sectionBodyLines[cursor]))) {
        break;
      }
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

export interface DeltaPlan {
  added: RequirementBlock[];
  modified: RequirementBlock[];
  removed: string[]; // requirement names
  renamed: Array<{ from: string; to: string }>;
  purposeText?: string; // delta Purpose text, if present ('' for empty header)
  sectionPresence: {
    added: boolean;
    modified: boolean;
    removed: boolean;
    renamed: boolean;
    purpose: boolean;
  };
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n?/g, '\n');
}

/**
 * Parse a delta-formatted spec change file content into a DeltaPlan with raw blocks.
 */
export function parseDeltaSpec(content: string): DeltaPlan {
  const normalized = normalizeLineEndings(content);
  const sections = splitTopLevelSections(normalized);
  const addedLookup = getSectionCaseInsensitive(sections, 'ADDED Requirements');
  const modifiedLookup = getSectionCaseInsensitive(sections, 'MODIFIED Requirements');
  const removedLookup = getSectionCaseInsensitive(sections, 'REMOVED Requirements');
  const renamedLookup = getSectionCaseInsensitive(sections, 'RENAMED Requirements');
  const purposeLookup = getSectionCaseInsensitive(sections, 'Purpose');
  const added = parseRequirementBlocksFromSection(addedLookup.body);
  const modified = parseRequirementBlocksFromSection(modifiedLookup.body);
  const removedNames = parseRemovedNames(removedLookup.body);
  const renamedPairs = parseRenamedPairs(renamedLookup.body);
  const purposeText = purposeLookup.found ? purposeLookup.body.trim() : undefined;
  return {
    added,
    modified,
    removed: removedNames,
    renamed: renamedPairs,
    purposeText: purposeLookup.found ? (purposeText || '') : undefined,
    sectionPresence: {
      added: addedLookup.found,
      modified: modifiedLookup.found,
      removed: removedLookup.found,
      renamed: renamedLookup.found,
      purpose: purposeLookup.found,
    },
  };
}

function splitTopLevelSections(content: string): Record<string, string> {
  const lines = content.split('\n');
  const result: Record<string, string> = {};
  const indices: Array<{ title: string; index: number; level: number }> = [];
  // Track fenced code blocks so ## headers inside them are not treated as sections
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (isMarkdownFenceLine(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = lines[i].match(/^(##)\s+(.+)$/);
    if (m) {
      const level = m[1].length; // only care for '##'
      indices.push({ title: m[2].trim(), index: i, level });
    }
  }
  for (let i = 0; i < indices.length; i++) {
    const current = indices[i];
    const next = indices[i + 1];
    const body = lines.slice(current.index + 1, next ? next.index : lines.length).join('\n');
    result[current.title] = body;
  }
  return result;
}

function getSectionCaseInsensitive(sections: Record<string, string>, desired: string): { body: string; found: boolean } {
  const target = desired.toLowerCase();
  for (const [title, body] of Object.entries(sections)) {
    if (title.toLowerCase() === target) return { body, found: true };
  }
  return { body: '', found: false };
}

function parseRequirementBlocksFromSection(sectionBody: string): RequirementBlock[] {
  if (!sectionBody) return [];
  const lines = normalizeLineEndings(sectionBody).split('\n');
  const blocks: RequirementBlock[] = [];
  let i = 0;
  // Track fenced code blocks so headers inside them are treated as body content
  let inFence = false;
  while (i < lines.length) {
    // Seek next requirement header, skipping fenced code blocks
    while (i < lines.length) {
      if (isMarkdownFenceLine(lines[i])) {
        inFence = !inFence;
      }
      if (!inFence && /^###\s+Requirement:/.test(lines[i])) break;
      i++;
    }
    if (i >= lines.length) break;
    const headerLine = lines[i];
    const m = headerLine.match(REQUIREMENT_HEADER_REGEX);
    if (!m) { i++; continue; }
    const name = normalizeRequirementName(m[1]);
    const buf: string[] = [headerLine];
    i++;
    let inFenceBlock = false;
    while (i < lines.length) {
      if (isMarkdownFenceLine(lines[i])) {
        inFenceBlock = !inFenceBlock;
      }
      if (!inFenceBlock && (/^###\s+Requirement:/.test(lines[i]) || /^##\s+/.test(lines[i]))) {
        break;
      }
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ headerLine, name, raw: buf.join('\n').trimEnd() });
  }
  return blocks;
}

function parseRemovedNames(sectionBody: string): string[] {
  if (!sectionBody) return [];
  const names: string[] = [];
  const lines = normalizeLineEndings(sectionBody).split('\n');
  for (const line of lines) {
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

function parseRenamedPairs(sectionBody: string): Array<{ from: string; to: string }> {
  if (!sectionBody) return [];
  const pairs: Array<{ from: string; to: string }> = [];
  const lines = normalizeLineEndings(sectionBody).split('\n');
  let current: { from?: string; to?: string } = {};
  for (const line of lines) {
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

// ---------------------------------------------------------------------------
// Scenario-level parsing (for scenario-level merge in MODIFIED handler)
// ---------------------------------------------------------------------------

export interface ScenarioBlock {
  headerLine: string;   // e.g., '#### Scenario: Phase 2 gate check (MODIFIED)'
  name: string;         // e.g., 'Phase 2 gate check' (without tags)
  tag?: string;         // e.g., 'MODIFIED', 'REMOVED', or undefined
  raw: string;          // full block including header and body
}

export interface RequirementBlockWithScenarios extends RequirementBlock {
  description: string;      // text between requirement header and first scenario
  scenarios: ScenarioBlock[];
}

const SCENARIO_HEADER_REGEX = /^####\s*Scenario:\s*(.+)\s*$/;
const SCENARIO_TAG_REGEX = /^(.+?)\s*\((MODIFIED|REMOVED)\)\s*$/i;

/**
 * Normalize a scenario name by stripping (MODIFIED)/(REMOVED) tags and trimming.
 */
export function normalizeScenarioName(name: string): string {
  const tagMatch = name.match(SCENARIO_TAG_REGEX);
  if (tagMatch) {
    return tagMatch[1].trim();
  }
  return name.trim();
}

/**
 * Extract the tag from a scenario name if present.
 * Returns the tag in uppercase, or undefined if no tag.
 */
export function extractScenarioTag(name: string): string | undefined {
  const tagMatch = name.match(SCENARIO_TAG_REGEX);
  if (tagMatch) {
    return tagMatch[2].toUpperCase();
  }
  return undefined;
}

/**
 * Parse a RequirementBlock into scenarios, extracting the requirement-level
 * description (text between the requirement header and the first scenario).
 */
export function parseScenarios(block: RequirementBlock): RequirementBlockWithScenarios {
  const normalized = normalizeLineEndings(block.raw);
  const lines = normalized.split('\n');

  // First line is the requirement header — skip it
  let cursor = 1;
  const descriptionLines: string[] = [];
  const scenarios: ScenarioBlock[] = [];

  // Collect description lines until first scenario header (skip fenced code blocks)
  let inFence = false;
  while (cursor < lines.length) {
    if (isMarkdownFenceLine(lines[cursor])) {
      inFence = !inFence;
    }
    if (!inFence && SCENARIO_HEADER_REGEX.test(lines[cursor])) {
      break;
    }
    descriptionLines.push(lines[cursor]);
    cursor++;
  }

  // Parse scenario blocks
  while (cursor < lines.length) {
    const headerLine = lines[cursor];
    const headerMatch = headerLine.match(SCENARIO_HEADER_REGEX);
    if (!headerMatch) {
      cursor++;
      continue;
    }

    const rawName = headerMatch[1].trim();
    const name = normalizeScenarioName(rawName);
    const tag = extractScenarioTag(rawName);
    const buf: string[] = [headerLine];
    cursor++;

    // Gather body lines until next scenario header or end
    let inFenceBody = false;
    while (cursor < lines.length) {
      if (isMarkdownFenceLine(lines[cursor])) {
        inFenceBody = !inFenceBody;
      }
      if (!inFenceBody && SCENARIO_HEADER_REGEX.test(lines[cursor])) {
        break;
      }
      buf.push(lines[cursor]);
      cursor++;
    }

    scenarios.push({
      headerLine,
      name,
      tag,
      raw: buf.join('\n').trimEnd(),
    });
  }

  return {
    ...block,
    description: descriptionLines.join('\n').trimEnd(),
    scenarios,
  };
}
