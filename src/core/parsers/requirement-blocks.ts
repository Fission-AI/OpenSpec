import { buildCodeFenceMask } from './requirement-text.js';

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

/** The canonical requirement header the delta reader recognizes. */
const REQUIREMENT_HEADER_REGEX = /^###\s*Requirement:\s*(.+)\s*$/i;

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
  let endIndex = lines.length;
  for (let i = reqHeaderIndex + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
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
  while (cursor < sectionBodyLines.length && !REQUIREMENT_HEADER_REGEX.test(sectionBodyLines[cursor])) {
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
    const bodyLines: string[] = [headerLineCandidate];
    while (cursor < sectionBodyLines.length && !REQUIREMENT_HEADER_REGEX.test(sectionBodyLines[cursor]) && !/^##\s+/.test(sectionBodyLines[cursor])) {
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
 * A level-3 header inside `## ADDED`/`## MODIFIED Requirements` that is not a
 * canonical `### Requirement:` header, recorded at the moment the delta reader
 * skips over it. Surfaced as an INFO note by `validate <change>` (#498).
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

function splitTopLevelSections(content: string): Record<string, { body: string; bodyStartLine: number }> {
  const lines = content.split('\n');
  const result: Record<string, { body: string; bodyStartLine: number }> = {};
  const indices: Array<{ title: string; index: number; level: number }> = [];
  for (let i = 0; i < lines.length; i++) {
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
    // First body line, 1-based: the header is at 0-based current.index.
    result[current.title] = { body, bodyStartLine: current.index + 2 };
  }
  return result;
}

function getSectionCaseInsensitive(
  sections: Record<string, { body: string; bodyStartLine: number }>,
  desired: string
): { title: string; body: string; bodyStartLine: number; found: boolean } {
  const target = desired.toLowerCase();
  for (const [title, { body, bodyStartLine }] of Object.entries(sections)) {
    if (title.toLowerCase() === target) return { title, body, bodyStartLine, found: true };
  }
  return { title: desired, body: '', bodyStartLine: 0, found: false };
}

function parseRequirementBlocksFromSection(
  sectionBody: string,
  skipped?: { section: string; bodyStartLine: number; sink: SkippedHeader[] }
): RequirementBlock[] {
  if (!sectionBody) return [];
  const lines = normalizeLineEndings(sectionBody).split('\n');
  // Record the non-canonical level-3 headers this reader skips, at the moment
  // it skips them, so the INFO note describes the reader's real boundaries.
  // Fence-masked lines are excluded: the body reader treats them as fenced
  // content, not as headers.
  const fenceMask = skipped ? buildCodeFenceMask(lines) : undefined;
  const recordIfSkippedHeader = (index: number) => {
    if (!skipped || fenceMask![index]) return;
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
    while (i < lines.length && !REQUIREMENT_HEADER_REGEX.test(lines[i])) {
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
    while (i < lines.length && !REQUIREMENT_HEADER_REGEX.test(lines[i]) && !/^##\s+/.test(lines[i])) {
      recordIfSkippedHeader(i);
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
