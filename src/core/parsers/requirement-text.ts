/**
 * Shared, fence-aware requirement-reading helpers.
 *
 * The requirement reader used to be implemented twice — once for main specs
 * (`MarkdownParser.parseRequirements`) and once for change deltas
 * (`Validator.extractRequirementText` / `countScenarios`) — and the two drifted
 * apart. These helpers are the single source of truth for requirement-body
 * extraction, scenario counting, and `SHALL`/`MUST` detection in
 * `validate <change>`, `validate <spec>`, and `archive`.
 */

/**
 * Build a per-line mask marking lines that fall inside a fenced code block
 * (``` ``` ``` or ``` ~~~ ```), including the fence lines themselves. Mirrors the
 * fence rules markdown uses: a fence opens on the first ```` ```/~~~ ```` of
 * length >= 3 and closes on a line of the same marker whose length is >= the
 * opening length, with nothing but whitespace after it.
 */
export function buildCodeFenceMask(lines: string[]): boolean[] {
  const mask = new Array(lines.length).fill(false);
  let activeFence: { marker: '`' | '~'; length: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const fence = getFenceMarker(lines[i]);

    if (!activeFence) {
      if (fence) {
        activeFence = fence;
        mask[i] = true;
      }
      continue;
    }

    mask[i] = true;
    if (isClosingFence(lines[i], activeFence)) {
      activeFence = null;
    }
  }

  return mask;
}

function getFenceMarker(line: string): { marker: '`' | '~'; length: number } | null {
  const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
  if (!fenceMatch) {
    return null;
  }

  return {
    marker: fenceMatch[1][0] as '`' | '~',
    length: fenceMatch[1].length,
  };
}

function isClosingFence(
  line: string,
  activeFence: { marker: '`' | '~'; length: number }
): boolean {
  const fenceMatch = line.match(/^\s*(`{3,}|~{3,})\s*$/);
  return Boolean(
    fenceMatch &&
    fenceMatch[1][0] === activeFence.marker &&
    fenceMatch[1].length >= activeFence.length
  );
}

/** Lines that look like `**ID**: ...` / `**Priority**: ...` metadata. */
const METADATA_LINE = /^\*\*[^*]+\*\*:/;

/** Any markdown header line — the boundary where a requirement body ends. */
const HEADER_LINE = /^#{1,6}\s/;

/**
 * A level-4 header. Deliberately matches ANY `####` header, not only
 * `#### Scenario:` — the spec path treats every level-4 child of a requirement
 * as a scenario, so the delta counter must too (parity). Don't tighten this to
 * `Scenario:` without changing both paths together.
 */
const SCENARIO_HEADER = /^####\s+/;

/**
 * The one predicate for normative-keyword detection. Matches `SHALL` or `MUST`
 * as whole words so the change-delta reader and the schema-based reader accept
 * and reject identical text.
 */
export function containsShallOrMust(text: string): boolean {
  return /\b(SHALL|MUST)\b/.test(text);
}

/**
 * Extract the full requirement body from the lines that follow a
 * `### Requirement:` header (the lines may include scenarios and fenced code).
 *
 * Captures every body line from the start up to the first header found on a
 * non-fenced line — usually the first `#### Scenario:`, but also a stray `###`
 * divider the delta reader absorbed into the block — skipping blank lines and
 * any line inside a fenced code block. `**metadata**:` lines are skipped only
 * when other body text remains: a requirement written entirely as
 * `**Constraint**: The system MUST ...` keeps that line as its body. Captured
 * lines are trimmed and joined with newlines so a requirement whose text wraps
 * across lines — or whose `SHALL`/`MUST` lands on a later line — is read in
 * full.
 */
export function extractRequirementBody(bodyLines: string[]): string {
  const mask = buildCodeFenceMask(bodyLines);
  const captured: string[] = [];
  const metadata: string[] = [];

  for (let i = 0; i < bodyLines.length; i++) {
    if (mask[i]) continue; // inside a fenced code block
    const line = bodyLines[i];
    if (HEADER_LINE.test(line)) break; // first scenario or stray divider
    const trimmed = line.trim();
    if (trimmed.length === 0) continue; // blank
    if (METADATA_LINE.test(trimmed)) {
      metadata.push(trimmed); // **ID**: / **Priority**: ...
      continue;
    }
    captured.push(trimmed);
  }

  if (captured.length > 0) return captured.join('\n');
  return metadata.join('\n'); // metadata-only body: the metadata IS the body
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
