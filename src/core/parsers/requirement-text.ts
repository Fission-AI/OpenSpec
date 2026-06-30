/**
 * Shared, fence-aware requirement-reading helpers.
 *
 * The requirement reader used to be implemented twice — once for main specs
 * (`MarkdownParser.parseRequirements`) and once for change deltas
 * (`Validator.extractRequirementText` / `countScenarios`) — and the two drifted
 * apart. These helpers are the single source of truth both readers delegate to,
 * so requirement-body extraction, scenario counting, and `SHALL`/`MUST`
 * detection behave identically for `validate <change>`, `validate <spec>`, and
 * `archive`.
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

/** A level-4 scenario header (`#### Scenario: ...`). */
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
 * Captures every body line from the start up to the first `#### Scenario:`
 * header found on a non-fenced line, skipping blank lines, `**metadata**:`
 * lines, and any line inside a fenced code block. Captured lines are trimmed and
 * joined with newlines so a requirement whose text wraps across lines — or whose
 * `SHALL`/`MUST` lands on a later line — is read in full.
 */
export function extractRequirementBody(bodyLines: string[]): string {
  const mask = buildCodeFenceMask(bodyLines);
  const captured: string[] = [];

  for (let i = 0; i < bodyLines.length; i++) {
    if (mask[i]) continue; // inside a fenced code block
    const line = bodyLines[i];
    if (SCENARIO_HEADER.test(line)) break; // reached the first real scenario
    const trimmed = line.trim();
    if (trimmed.length === 0) continue; // blank
    if (METADATA_LINE.test(trimmed)) continue; // **ID**: / **Priority**: ...
    captured.push(trimmed);
  }

  return captured.join('\n');
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
