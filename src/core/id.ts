/**
 * The one kebab id grammar. Store ids, change ids, and legacy initiative ids
 * all share it.
 */
export const KEBAB_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function isKebabId(value: string): boolean {
  return KEBAB_ID_REGEX.test(value);
}

/** Human rendering of the grammar, shared so the wording never forks. */
export const KEBAB_ID_DESCRIPTION =
  'must be kebab-case with lowercase letters, numbers, and single hyphen separators';

/** The fix-line twin of KEBAB_ID_DESCRIPTION, shared for the same reason. */
export const KEBAB_ID_FIX =
  'Use kebab-case with lowercase letters, numbers, and single hyphen separators.';

/**
 * The folder-safe-name grammar (store ids layer the kebab grammar on
 * top of it; workset member labels use it alone). Returns a problem
 * description, or null when valid.
 */
export function folderStyleNameProblem(
  value: string,
  label: string
): string | null {
  if (value.length === 0) {
    return `${label} must not be empty`;
  }

  if (value === '.' || value === '..') {
    return `${label} must not be '${value}'`;
  }

  if (/[\\/]/u.test(value)) {
    return `${label} must not contain path separators`;
  }

  return null;
}
