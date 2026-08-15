import { PURPOSE_PLACEHOLDER_PREFIX, PURPOSE_PLACEHOLDER_SUFFIX } from './constants.js';

/**
 * Detects a `## Purpose` that is still the placeholder archive writes, rather
 * than one somebody wrote.
 *
 * When a delta introduces a capability with no usable `## Purpose`, archive
 * stamps the placeholder into the new main spec. That text is over
 * `MIN_PURPOSE_LENGTH`, so the brevity check cannot reach it: the one rule that
 * exists to catch a Purpose nobody wrote is satisfied by the exact string
 * meaning nobody wrote one. Nothing else reads it afterwards, so the capability
 * keeps a to-do in it while every command reports success.
 *
 * Two things count, and deliberately nothing else:
 *
 * - the placeholder this tool generates, recognised through the same constants
 *   the writer composes it from, wherever it sits in the Purpose — nobody types
 *   that sentence by accident;
 * - a `TBD` **opening** the Purpose, which is what an agent writes when told to
 *   leave "a brief TBD placeholder".
 *
 * A `TBD` inside a sentence is left alone. "The retry budget is TBD pending
 * benchmarks" is a real Purpose with an open question in it, and reporting it
 * would teach people to ignore the warning — which costs more than the findings
 * it would add.
 */

export interface PurposePlaceholderIssue {
  /** 1-based line of the placeholder text, when it can be located. */
  line?: number;
}

/** A `TBD` opening the Purpose. `\b` keeps it off words like "TBDs". */
const LEADING_TBD = /^TBD\b/i;

const PURPOSE_HEADER = /^ {0,3}##(?!#)[ \t]+Purpose[ \t]*$/i;
const TOP_LEVEL_HEADER = /^ {0,3}#{1,2}(?!#)[ \t]+/;

/**
 * True when the text carries the sentence archive writes. Matched as its two
 * fixed halves in order, because the change name between them varies — so the
 * check follows the writer's own definition instead of a second copy of it.
 */
function containsGeneratedPlaceholder(text: string): boolean {
  const prefixAt = text.indexOf(PURPOSE_PLACEHOLDER_PREFIX);
  if (prefixAt === -1) return false;
  return text.indexOf(PURPOSE_PLACEHOLDER_SUFFIX, prefixAt + PURPOSE_PLACEHOLDER_PREFIX.length) !== -1;
}

/**
 * Reports the Purpose of a main spec as an unwritten placeholder, or null when
 * it reads as authored content.
 *
 * An empty Purpose is not reported here — `SPEC_PURPOSE_EMPTY` already covers
 * it, and reporting both would put two findings on one line. That falls out of
 * the two rules rather than needing a case of its own.
 */
export function findPurposePlaceholderIssue(
  overview: string,
  content?: string
): PurposePlaceholderIssue | null {
  // An empty Purpose needs no branch of its own: neither rule matches empty
  // text, so it falls through to null on the line below. An early return for it
  // would be a guard no test could hold, which is worse than none.
  const trimmed = overview.trim();
  const leading = LEADING_TBD.test(trimmed);
  if (!leading && !containsGeneratedPlaceholder(trimmed)) return null;
  // Which rule matched decides where the placeholder is, so the locator is told.
  // When both match the leading marker wins: it sits at or above the generated
  // sentence, and the earliest marker is the one a reader scanning down meets.
  return { line: content === undefined ? undefined : findPlaceholderLine(content, leading) };
}

/**
 * The line inside the `## Purpose` section carrying the placeholder, so the
 * warning points at the text to replace rather than at the file.
 *
 * Which line that is depends on the rule that matched. A leading `TBD` is the
 * section's first non-blank line by definition. The generated sentence is not:
 * it can follow prose somebody wrote, and naming the first non-blank line then
 * points at that prose — a line the reader can see is fine, which reads as the
 * check being wrong rather than the Purpose being unwritten.
 *
 * Undefined when the placeholder cannot be located — no section header, or a
 * generated sentence no single line carries. The caller then reports the finding
 * without a line rather than with a guessed one, since a wrong line number is
 * worse than none.
 *
 * Line endings are normalised first, so the same spec reports the same line
 * whether it was saved on Windows or on macOS/Linux.
 */
function findPlaceholderLine(content: string, leading: boolean): number | undefined {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const headerIndex = lines.findIndex((line) => PURPOSE_HEADER.test(line));
  if (headerIndex === -1) return undefined;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (TOP_LEVEL_HEADER.test(lines[i])) return undefined;
    if (leading ? lines[i].trim() : lines[i].includes(PURPOSE_PLACEHOLDER_PREFIX)) return i + 1;
  }
  return undefined;
}
