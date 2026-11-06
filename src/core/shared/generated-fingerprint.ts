import { createHash } from 'crypto';
import { RELEASED_GENERATED_FINGERPRINTS } from './released-generated-fingerprints.js';
import { findMarkerBlock } from '../../utils/file-system.js';

const GENERATED_VERSION =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

/**
 * Normalizes checkout line endings, a BOM, and a valid generated version
 * inside the YAML frontmatter: the parts of a generated file that change
 * between releases or checkouts without anyone editing it. Free-form
 * `generatedBy` text remains material.
 */
export function normalizeGeneratedContent(content: string): string {
  const normalized = content.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const frontmatter = normalized.match(/^---\n[\s\S]*?\n---(?:\n|$)/)?.[0];
  if (!frontmatter) return normalized;

  // `[ \t]` rather than `\s` so a leading/trailing whitespace run can never
  // cross a newline: an `m`-anchored `\s*` re-scans from every line start,
  // which is quadratic on a whitespace-heavy frontmatter. YAML indentation is
  // spaces and tabs only, so matching is unchanged.
  const versionLine =
    /^([ \t]*generatedBy:[ \t]*)(?:"([^"\n]+)"|'([^'\n]+)'|([^\s"'#]+))[ \t]*$/m;
  const normalizedFrontmatter = frontmatter.replace(
    versionLine,
    (
      line: string,
      prefix: string,
      doubleQuoted: string | undefined,
      singleQuoted: string | undefined,
      bare: string | undefined
    ) => {
      const version = doubleQuoted ?? singleQuoted ?? bare;
      return version && GENERATED_VERSION.test(version)
        ? `${prefix}"<generated-version>"`
        : line;
    }
  );
  return normalizedFrontmatter + normalized.slice(frontmatter.length);
}

/** Short content fingerprint of a generated file, after normalization. */
export function fingerprintGeneratedContent(content: string): string {
  return createHash('sha256')
    .update(normalizeGeneratedContent(content), 'utf8')
    .digest('hex')
    .slice(0, 16);
}

const BLOCK_START = '<!-- OPENSPEC:START -->';
const BLOCK_END = '<!-- OPENSPEC:END -->';

/**
 * The OpenSpec-managed block of a file older releases added it to (a user's
 * CLAUDE.md or AGENTS.md), markers included, or undefined when there is none.
 * Found by the same own-line marker rules legacy cleanup removes it by.
 */
export function extractOpenSpecBlock(content: string): string | undefined {
  return findMarkerBlock(content.replace(/\r\n/g, '\n'), BLOCK_START, BLOCK_END);
}

const RELEASED = new Set<string>(RELEASED_GENERATED_FINGERPRINTS);

/**
 * Whether `content` is, after normalization, a file some released OpenSpec
 * version generated. Such a file was never edited by a user, so an upgrade
 * may remove or replace it without losing anything.
 */
export function isReleasedGeneratedContent(content: string): boolean {
  return RELEASED.has(fingerprintGeneratedContent(content));
}

/**
 * Whether the file's OpenSpec block is exactly one a released version wrote,
 * so removing the block cannot drop anything the user typed inside it.
 */
export function hasReleasedOpenSpecBlock(content: string): boolean {
  const block = extractOpenSpecBlock(content);
  return block !== undefined && isReleasedGeneratedContent(block);
}
