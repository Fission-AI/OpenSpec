import { buildCodeFenceMask } from '../parsers/code-fence.js';
import { PURPOSE_PLACEHOLDER_PREFIX, PURPOSE_PLACEHOLDER_SUFFIX } from './constants.js';

/**
 * Detects a `## Purpose` that is still a placeholder, rather than one somebody
 * wrote.
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
 *   the writer composes it from, wherever it sits in the Purpose - nobody types
 *   that sentence by accident;
 * - a `TBD` or `TODO` **opening** the Purpose, which is the marker left behind
 *   when someone is told to leave "a brief TBD placeholder" and never comes
 *   back. Which of the two words got typed says nothing about whether the
 *   Purpose was written, so both are read the same way.
 *
 * A marker inside a sentence is left alone. "The retry budget is TBD pending
 * benchmarks" is a real Purpose with an open question in it, and reporting it
 * would teach people to ignore the warning - which costs more than the findings
 * it would add.
 *
 * Fenced code inside the Purpose is quoted material rather than the Purpose
 * speaking, so it is read out first. Without that, a Purpose documenting the
 * sentence archive writes is reported as being that sentence: a document about
 * the placeholder, failing for carrying one.
 */

export interface PurposePlaceholderIssue {
  /** 1-based line of the placeholder text, when it can be located. */
  line?: number;
}

/**
 * A `TBD` or `TODO` opening the Purpose. `\b` keeps it off a longer word that
 * merely begins with those letters, like "TBDs" or "TODOs", while still
 * allowing the punctuation a marker is usually written with: `TODO:`, `TBD -`.
 */
const LEADING_MARKER = /^(?:TBD|TODO)\b/i;

const PURPOSE_HEADER = /^ {0,3}##(?!#)[ \t]+Purpose[ \t]*$/i;
const TOP_LEVEL_HEADER = /^ {0,3}#{1,2}(?!#)[ \t]+/;

/**
 * The lines of `text` that sit outside a fenced code block, with line endings
 * normalised first.
 *
 * `buildCodeFenceMask` is the masker the requirement and structure parsers
 * already share, and its own reason for existing is that a second, private
 * notion of what a fence is drifts from the first. This check reads Markdown
 * for the same purpose they do, so it reads fences the same way they do.
 */
function unfencedLines(text: string): string[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const fenced = buildCodeFenceMask(lines);
  return lines.filter((_, index) => !fenced[index]);
}

/**
 * True when the text carries the sentence archive writes. Matched as its two
 * fixed halves in order, because the change name between them varies - so the
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
 * An empty Purpose is not reported here - `SPEC_PURPOSE_EMPTY` already covers
 * it, and reporting both would put two findings on one line. That falls out of
 * the two rules rather than needing a case of its own.
 */
export function findPurposePlaceholderIssue(
  overview: string,
  content?: string
): PurposePlaceholderIssue | null {
  // An empty Purpose needs no branch of its own: neither rule matches empty
  // text, so it falls through to null on the line below. An early return for it
  // would be a guard no test could hold, which is worse than none. A Purpose
  // that is nothing but a fenced block reduces to the same empty text here, and
  // is left to the brevity and empty-Purpose rules for the same reason.
  const prose = unfencedLines(overview).join('\n').trim();
  const leading = LEADING_MARKER.test(prose);
  if (!leading && !containsGeneratedPlaceholder(prose)) return null;
  // Which rule matched decides where the placeholder is, so the locator is told.
  // When both match the leading marker wins: it sits at or above the generated
  // sentence, and the earliest marker is the one a reader scanning down meets.
  return { line: content === undefined ? undefined : findPlaceholderLine(content, leading) };
}

/**
 * The line inside the `## Purpose` section carrying the placeholder, so the
 * warning points at the text to replace rather than at the file.
 *
 * Which line that is depends on the rule that matched. A leading marker is the
 * section's first non-blank line by definition. The generated sentence is not:
 * it can follow prose somebody wrote, and naming the first non-blank line then
 * points at that prose - a line the reader can see is fine, which reads as the
 * check being wrong rather than the Purpose being unwritten.
 *
 * Fenced lines are skipped on the way, for the reason detection skips them, and
 * so a `## Requirements` quoted inside a fence cannot end the section early.
 *
 * Undefined when the placeholder cannot be located - no section header, or a
 * generated sentence no single line carries. The caller then reports the finding
 * without a line rather than with a guessed one, since a wrong line number is
 * worse than none.
 *
 * Line endings are normalised first, so the same spec reports the same line
 * whether it was saved on Windows or on macOS/Linux.
 */
function findPlaceholderLine(content: string, leading: boolean): number | undefined {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const fenced = buildCodeFenceMask(lines);
  const headerIndex = lines.findIndex((line, index) => !fenced[index] && PURPOSE_HEADER.test(line));
  if (headerIndex === -1) return undefined;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (fenced[i]) continue;
    if (TOP_LEVEL_HEADER.test(lines[i])) return undefined;
    if (leading ? lines[i].trim() : lines[i].includes(PURPOSE_PLACEHOLDER_PREFIX)) return i + 1;
  }
  return undefined;
}
