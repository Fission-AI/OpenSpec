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
 * it, and reporting both would put two findings on one line.
 */
export function findPurposePlaceholderIssue(
  overview: string,
  content?: string
): PurposePlaceholderIssue | null {
  const trimmed = overview.trim();
  if (!trimmed) return null;
  if (!containsGeneratedPlaceholder(trimmed) && !LEADING_TBD.test(trimmed)) return null;
  return { line: content === undefined ? undefined : findPlaceholderLine(content) };
}

/**
 * The first non-blank line of the `## Purpose` section, so the warning points at
 * the text to replace rather than at the file. Undefined when the section cannot
 * be located: the caller reports the finding without a line rather than with a
 * guessed one, since a wrong line number is worse than none.
 *
 * Line endings are normalised first, so the same spec reports the same line
 * whether it was saved on Windows or on macOS/Linux.
 */
function findPlaceholderLine(content: string): number | undefined {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const headerIndex = lines.findIndex((line) => PURPOSE_HEADER.test(line));
  if (headerIndex === -1) return undefined;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (TOP_LEVEL_HEADER.test(lines[i])) return undefined;
    if (lines[i].trim()) return i + 1;
  }
  return undefined;
}
