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
 * Case- and whitespace-insensitive fold of a requirement name. Requirement
 * matching itself is case-sensitive (normalizeRequirementName); this fold
 * exists only for typo detection - near-miss REMOVED headers and the
 * RENAMED+REMOVED cross-section conflict - where two spellings that differ
 * only in case or interior whitespace mean a mistake, never two requirements.
 */
export function foldRequirementName(name: string): string {
  return normalizeRequirementName(name).toLowerCase().replace(/\s+/g, ' ');
}

/** The canonical requirement header the delta reader recognizes. */
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
  // Raw `### Requirement:` blocks from the REMOVED section, when the delta used
  // the header form. Names alone drop the authored Reason/Migration text that a
  // reader of the removal needs. Empty for the bullet-list form, which has none.
  removedBlocks: RequirementBlock[];
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
  // Strip a UTF-8 BOM: Windows editors and PowerShell redirects prepend one,
  // and it would keep the first line's `## ADDED Requirements` from matching.
  return content.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

/**
 * A slice of a document represented as its lines plus a parallel mask marking
 * lines that live inside fenced code blocks (which must be ignored when
 * detecting Markdown structure).
 */
interface SectionBody {
  lines: string[];
  fenceMask: boolean[];
  bodyStartLine: number;
}

/**
 * Parse a delta-formatted spec change file content into a DeltaPlan with raw blocks.
 */
export function parseDeltaSpec(content: string): DeltaPlan {
  const normalized = normalizeLineEndings(content);
  const lines = normalized.split('\n');
  const fenceMask = buildCodeFenceMask(lines);
  const sections = splitTopLevelSections(lines, fenceMask);
  const addedLookup = getSectionsCaseInsensitive(sections, 'ADDED Requirements');
  const modifiedLookup = getSectionsCaseInsensitive(sections, 'MODIFIED Requirements');
  const removedLookup = getSectionsCaseInsensitive(sections, 'REMOVED Requirements');
  const renamedLookup = getSectionsCaseInsensitive(sections, 'RENAMED Requirements');
  const skippedHeaders: SkippedHeader[] = [];
  const added = addedLookup.bodies.flatMap((body) =>
    parseRequirementBlocksFromSection(body, {
      section: addedLookup.title,
      bodyStartLine: body.bodyStartLine,
      sink: skippedHeaders,
    })
  );
  const modified = modifiedLookup.bodies.flatMap((body) =>
    parseRequirementBlocksFromSection(body, {
      section: modifiedLookup.title,
      bodyStartLine: body.bodyStartLine,
      sink: skippedHeaders,
    })
  );
  const removedNames = removedLookup.bodies.flatMap((body) => parseRemovedNames(body));
  const removedBlocks = removedLookup.bodies.flatMap((body) =>
    parseRequirementBlocksFromSection(body)
  );
  // Pairs are read per section, so a FROM in one copy of the header can never
  // pair with a TO in another.
  const renamedPairs = renamedLookup.bodies.flatMap((body) => parseRenamedPairs(body));
  skippedHeaders.sort((a, b) => a.line - b.line);
  return {
    added,
    modified,
    removed: removedNames,
    removedBlocks,
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

/** One `## ` section of a delta file, in the order it was written. */
interface DeltaSection {
  title: string;
  body: SectionBody;
}

/**
 * Every `## ` section, as a LIST rather than a title-keyed record.
 *
 * Keying by title silently dropped a repeated header: a delta that wrote
 * `## ADDED Requirements` twice kept only the last body, so every requirement
 * under the first copy was discarded before any validation or merge rule could
 * see it. A list keeps each occurrence, and the lookup below merges them.
 */
function splitTopLevelSections(lines: string[], fenceMask: boolean[]): DeltaSection[] {
  const sections: DeltaSection[] = [];
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
    sections.push({
      title: current.title,
      body: {
        lines: lines.slice(current.index + 1, end),
        fenceMask: fenceMask.slice(current.index + 1, end),
        bodyStartLine: current.index + 2,
      },
    });
  }
  return sections;
}

/**
 * Every section body whose title folds to `desired`, in document order.
 *
 * Returning all of them - rather than the first match - is what makes a
 * repeated header (`## ADDED Requirements` twice) and a case variant
 * (`## ADDED Requirements` + `## Added Requirements`) both apply in full. Each
 * body keeps its own `bodyStartLine`, so reported line numbers stay correct for
 * the copy the header actually came from.
 *
 * `title` is the first spelling the author used, which is what diagnostics quote.
 */
function getSectionsCaseInsensitive(
  sections: DeltaSection[],
  desired: string
): { title: string; bodies: SectionBody[]; found: boolean } {
  const target = desired.toLowerCase();
  const matches = sections.filter((section) => section.title.toLowerCase() === target);
  if (matches.length === 0) {
    return { title: desired, bodies: [], found: false };
  }
  return {
    title: matches[0].title,
    bodies: matches.map((section) => section.body),
    found: true,
  };
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

/**
 * Requirement names listed in `## REMOVED Requirements`, in document order.
 *
 * Two spellings are accepted: a plain `### Requirement:` header, and a bullet
 * carrying one. Every CommonMark bullet marker counts for the second form -
 * see the pattern below for why that matters.
 */
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
    // Also support bullet list of headers. Every CommonMark bullet marker
    // counts: `*` and `+` open a list exactly as `-` does, so accepting only
    // `-` turned a removal written with either of them into a silent no-op -
    // archive reported success while the requirement stayed in the spec.
    const bullet = line.match(/^\s*[-*+]\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
    if (bullet) {
      names.push(normalizeRequirementName(bullet[1]));
    }
  }
  return names;
}

/**
 * `FROM:`/`TO:` rename pairs from `## RENAMED Requirements`, in document order.
 *
 * The bullet is optional, and every CommonMark bullet marker is accepted: a
 * rename written with `*` or `+` used to match nothing at all, so the rename
 * silently never happened while archive still reported success.
 */
function parseRenamedPairs(sectionBody: SectionBody): Array<{ from: string; to: string }> {
  const { lines, fenceMask } = sectionBody;
  if (lines.length === 0) return [];
  const pairs: Array<{ from: string; to: string }> = [];
  let current: { from?: string; to?: string } = {};
  for (let i = 0; i < lines.length; i++) {
    if (fenceMask[i]) continue;
    const line = lines[i];
    // The bullet stays optional, and any CommonMark marker is accepted: a rename
    // written with `*` or `+` used to match nothing at all, so the rename never
    // happened while archive still reported success.
    const fromMatch = line.match(/^\s*[-*+]?\s*FROM:\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
    const toMatch = line.match(/^\s*[-*+]?\s*TO:\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
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

/** Both directions of the scenario-name comparison, plus the two totals. */
export interface ScenarioNameDiff {
  /** Names the current block has that the incoming block does not cover. */
  missing: string[];
  /** Names the incoming block introduces that the current block does not have. */
  added: string[];
  /** Level-4 headers in the current block. */
  currentCount: number;
  /** Level-4 headers in the incoming block. */
  incomingCount: number;
}

/**
 * Compare the scenario names of a current requirement block and an incoming
 * (MODIFIED) one, in both directions.
 *
 * `missing` is the loss the guard exists to catch: a MODIFIED requirement
 * replaces the whole block, so every name there would be dropped from the main
 * spec. `added` and the two counts are reported alongside it, because they are
 * the first thing a reader checks once it fires (#1697) - a block that omits
 * two names and introduces two is shaped like a rename, one that omits two and
 * introduces none is shaped like a truncation. Neither is proof, and intent is
 * not recoverable from structure, so this decides nothing and only says what
 * the two blocks contain.
 */
export function diffScenarioNames(
  current: RequirementBlock,
  incoming: RequirementBlock
): ScenarioNameDiff {
  const currentNames = parseScenarioBlocks(current.raw).map((scenario) => scenario.name);
  const incomingNames = parseScenarioBlocks(incoming.raw).map((scenario) => scenario.name);

  // Multiplicity-aware: a name present N times on one side and M times on the
  // other leaves max(0, N - M) instances unmatched. Set membership would treat
  // N>M as fully covered and let archive silently drop duplicates (residual
  // #1246 / duplicate-scenario-name blind spot).
  const unmatched = (names: readonly string[], against: readonly string[]): string[] => {
    const remaining = new Map<string, number>();
    for (const name of against) remaining.set(name, (remaining.get(name) ?? 0) + 1);

    const out: string[] = [];
    for (const name of names) {
      const left = remaining.get(name) ?? 0;
      if (left > 0) remaining.set(name, left - 1);
      else out.push(name);
    }
    return out;
  };

  return {
    missing: unmatched(currentNames, incomingNames),
    added: unmatched(incomingNames, currentNames),
    currentCount: currentNames.length,
    incomingCount: incomingNames.length,
  };
}

/**
 * Scenario names the current requirement block has and the incoming
 * (MODIFIED) block does not. A MODIFIED requirement replaces the whole block,
 * so every name reported here would be dropped from the main spec.
 *
 * The `missing` half of diffScenarioNames, which archive (refusing to apply
 * the block) and validate (reporting the same loss at authoring time, #1477)
 * both go through, so the two cannot disagree about what counts as a dropped
 * scenario.
 */
export function findMissingCurrentScenarios(current: RequirementBlock, incoming: RequirementBlock): string[] {
  return diffScenarioNames(current, incoming).missing;
}

/** At most this many added names are listed before the rest are counted. */
const MAX_LISTED_ADDED_SCENARIOS = 3;

/**
 * The one sentence archive and validate both append when the guard fires, so
 * the counts a reader sees cannot differ between the two commands.
 */
export function describeScenarioBalance(diff: ScenarioNameDiff): string {
  const scale = `The modified block has ${diff.incomingCount} scenario(s) to the current spec's ${diff.currentCount}`;
  if (diff.added.length === 0) {
    return `${scale}, and adds none.`;
  }
  const listed = diff.added
    .slice(0, MAX_LISTED_ADDED_SCENARIOS)
    .map((name) => `"${name}"`)
    .join(', ');
  const rest = diff.added.length - MAX_LISTED_ADDED_SCENARIOS;
  const names = rest > 0 ? `${listed} and ${rest} more` : listed;
  return `${scale}, and adds ${diff.added.length} the spec does not have: ${names}.`;
}

/**
 * Any non-fenced level-4 header on the given (masked) line. Reuses the spec
 * path's SCENARIO_HEADER so the two counters cannot drift apart.
 */
function scenarioHeaderAt(lines: string[], mask: boolean[], index: number): boolean {
  return !mask[index] && SCENARIO_HEADER.test(lines[index]);
}

/**
 * The scenario name for a `#### ` header, matching the label the author reads:
 * the header text with the leading `####`, an optional CommonMark closing `#`
 * run (`#### Foo ####` renders as `Foo`), and an optional `Scenario:` prefix
 * stripped. Both the current and incoming blocks run through here, so the
 * comparison in findMissingCurrentScenarios stays internally consistent
 * regardless of label — and two headers that render to the same title (one
 * ATX-closed, one not) are not mistaken for a dropped scenario.
 */
function scenarioNameAt(line: string): string {
  return line
    .replace(SCENARIO_HEADER, '')
    // Optional ATX closing sequence. CommonMark only treats a trailing `#` run
    // as a close when it is preceded by a space or tab — not any Unicode space —
    // so this uses `[ \t]`, not `\s`. A looser `\s` could strip a `#` run after
    // an exotic space (e.g. NBSP) that CommonMark keeps, folding two distinct
    // scenario names into one and masking a real loss. `[ \t]` keeps the fold
    // faithful to how the header actually renders.
    .replace(/[ \t]+#+[ \t]*$/, '')
    .replace(/^Scenario:\s*/i, '')
    .trim();
}

function parseScenarioBlocks(requirementRaw: string): ScenarioBlock[] {
  const lines = requirementRaw.replace(/\r\n?/g, '\n').split('\n');
  // A scenario is ANY non-fenced `#### ` header, matching the spec path's
  // SCENARIO_HEADER / countScenarios (requirement-text.ts) exactly — not only
  // `#### Scenario:`. The two MUST agree: a level-4 child whose header is not
  // literally `Scenario:` (e.g. `#### Edge case`) is still a scenario the spec
  // path counts, so a MODIFIED block that drops it would otherwise slip past
  // this loss check and be deleted by archive with no error (the parity the
  // SCENARIO_HEADER comment warns not to break). A `####` inside a fenced
  // example is masked out, matching countScenarios.
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
