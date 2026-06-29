import { buildCodeFenceMask } from './code-fence.js';

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

const REQUIREMENT_HEADER_REGEX = /^###\s*Requirement:\s*(.+)\s*$/i;

/**
 * Extracts the Requirements section from a spec file and parses requirement blocks.
 */
export function extractRequirementsSection(content: string): RequirementsSectionParts {
  const normalized = normalizeLineEndings(content);
  const lines = normalized.split('\n');
  const fenceMask = buildCodeFenceMask(lines);
  const reqHeaderIndex = lines.findIndex((l, i) => !fenceMask[i] && /^##\s+Requirements\s*$/i.test(l));

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

  // Parse requirement blocks within section body
  const blocks: RequirementBlock[] = [];
  let cursor = 0;
  let preambleLines: string[] = [];

  // Collect preamble lines until first requirement header
  while (cursor < sectionBodyLines.length && !isRequirementHeader(cursor)) {
    preambleLines.push(sectionBodyLines[cursor]);
    cursor++;
  }

  while (cursor < sectionBodyLines.length) {
    const headerLineCandidate = sectionBodyLines[cursor];
    if (!isRequirementHeader(cursor)) {
      // Not a requirement header; skip line defensively
      cursor++;
      continue;
    }
    const headerMatch = headerLineCandidate.match(REQUIREMENT_HEADER_REGEX)!;
    const name = normalizeRequirementName(headerMatch[1]);
    cursor++;
    // Gather lines until next requirement header or end of section
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

export interface DeltaPlan {
  added: RequirementBlock[];
  modified: RequirementBlock[];
  removed: string[]; // requirement names
  renamed: Array<{ from: string; to: string }>;
  sectionPresence: {
    added: boolean;
    modified: boolean;
    removed: boolean;
    renamed: boolean;
  };
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n?/g, '\n');
}

/**
 * A slice of a document represented as its lines plus a parallel mask marking
 * lines that live inside fenced code blocks (which must be ignored when
 * detecting Markdown structure).
 */
interface SectionBody {
  lines: string[];
  fenceMask: boolean[];
}

/**
 * Parse a delta-formatted spec change file content into a DeltaPlan with raw blocks.
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
  const added = parseRequirementBlocksFromSection(addedLookup.body);
  const modified = parseRequirementBlocksFromSection(modifiedLookup.body);
  const removedNames = parseRemovedNames(removedLookup.body);
  const renamedPairs = parseRenamedPairs(renamedLookup.body);
  return {
    added,
    modified,
    removed: removedNames,
    renamed: renamedPairs,
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
    };
  }
  return result;
}

const EMPTY_SECTION_BODY: SectionBody = { lines: [], fenceMask: [] };

function getSectionCaseInsensitive(sections: Record<string, SectionBody>, desired: string): { body: SectionBody; found: boolean } {
  const target = desired.toLowerCase();
  for (const [title, body] of Object.entries(sections)) {
    if (title.toLowerCase() === target) return { body, found: true };
  }
  return { body: EMPTY_SECTION_BODY, found: false };
}

function parseRequirementBlocksFromSection(sectionBody: SectionBody): RequirementBlock[] {
  const { lines, fenceMask } = sectionBody;
  if (lines.length === 0) return [];
  const isRequirementHeader = (i: number): boolean => !fenceMask[i] && REQUIREMENT_HEADER_REGEX.test(lines[i]);
  const isTopLevelHeader = (i: number): boolean => !fenceMask[i] && /^##\s+/.test(lines[i]);
  const blocks: RequirementBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    // Seek next requirement header
    while (i < lines.length && !isRequirementHeader(i)) i++;
    if (i >= lines.length) break;
    const headerLine = lines[i];
    const m = headerLine.match(REQUIREMENT_HEADER_REGEX)!;
    const name = normalizeRequirementName(m[1]);
    const buf: string[] = [headerLine];
    i++;
    while (i < lines.length && !isRequirementHeader(i) && !isTopLevelHeader(i)) {
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
