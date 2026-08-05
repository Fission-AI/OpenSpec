/**
 * Normalizes generated-only differences that do not represent a user edit.
 */
function normalizeGeneratedSkill(content: string): string {
  return content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(
      /\$openspec-([a-z0-9-]+) \(Codex\) or \/openspec-\1 \(other agents\)/g,
      '/openspec-$1'
    )
    .replace(/\$openspec-/g, '/openspec-')
    .replace(
      /^(\s*generatedBy:\s*)["']?[^"'\n]+["']?\s*$/m,
      '$1"<generated-version>"'
    );
}

/**
 * Returns whether two OpenSpec-generated skill files differ only by version,
 * line-ending, BOM, or supported Codex/generic invocation syntax.
 */
export function areGeneratedSkillContentsEquivalent(
  first: string,
  second: string
): boolean {
  return normalizeGeneratedSkill(first) === normalizeGeneratedSkill(second);
}
