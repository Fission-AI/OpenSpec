import { OPENSPEC_SKILL_NAMES } from '../config.js';

const GENERATED_VERSION =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const OPENSPEC_SKILL_NAME_SET = new Set<string>(OPENSPEC_SKILL_NAMES);

/**
 * Normalizes checkout line endings and a valid generated version inside the
 * YAML frontmatter. Free-form `generatedBy` text in the instructions remains
 * material.
 */
function normalizeGeneratedSkill(content: string): string {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const frontmatter = normalized.match(/^---\n[\s\S]*?\n---(?:\n|$)/)?.[0];
  if (!frontmatter) return normalized;

  const versionLine =
    /^(\s*generatedBy:\s*)(?:"([^"\n]+)"|'([^'\n]+)'|([^\s"'#]+))\s*$/m;
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

/**
 * Converts only known generated dual references in current Codex content back
 * to the direct syntax used by legacy `.codex` output.
 */
function toLegacyCodexReferences(content: string): string {
  return content.replace(
    /\$(openspec-[a-z0-9-]+) \(Codex\) or \/\1 \(other agents\)/g,
    (match, skillName: string) =>
      OPENSPEC_SKILL_NAME_SET.has(skillName) ? `$${skillName}` : match
  );
}

/**
 * Returns whether a legacy Codex skill differs from the current canonical
 * replacement only by generated version, checkout line endings/BOM, or the
 * known Codex/generic dual-reference expansion.
 */
export function isLegacyCodexSkillEquivalentToCurrent(
  legacyContent: string,
  currentContent: string
): boolean {
  const normalizedLegacy = normalizeGeneratedSkill(legacyContent);
  const normalizedCurrent = normalizeGeneratedSkill(currentContent);
  return (
    normalizedLegacy === normalizedCurrent ||
    normalizedLegacy === toLegacyCodexReferences(normalizedCurrent)
  );
}
