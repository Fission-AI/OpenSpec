/**
 * Minimal semver range satisfier.
 *
 * OpenSpec deliberately ships no `semver` dependency (the plugin system must add
 * no required runtime dependency). Plugin `openspecCompat` ranges use a small,
 * well-known subset that this module supports:
 *
 *   *                 any version
 *   1.2.3             exact match
 *   >=1.2.3  >1.2.3   lower bound (with/without equality)
 *   <=1.2.3  <1.2.3   upper bound (with/without equality)
 *   ^1.2.3            compatible-with (same major, or same minor when major is 0)
 *   ~1.2.3            approximately (same minor)
 *   1.x / 1.2.x       wildcard segments
 *
 * Multiple space-separated comparators are ANDed (e.g. ">=1.4.0 <2.0.0").
 * Prerelease tags are ignored for comparison purposes.
 */

interface Version {
  major: number;
  minor: number;
  patch: number;
}

function parseVersion(input: string): Version | null {
  const cleaned = input.trim().replace(/^v/, '').split('-')[0].split('+')[0];
  if (cleaned === '') return null;
  const parts = cleaned.split('.');
  // Reject empty segments ("1.", "1..2") so malformed versions fail closed.
  if (parts.length === 0 || parts.length > 3 || parts.some((p) => p.trim() === '')) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0)) return null;
  return { major: nums[0] ?? 0, minor: nums[1] ?? 0, patch: nums[2] ?? 0 };
}

function compare(a: Version, b: Version): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function satisfiesComparator(version: Version, comparator: string): boolean {
  const c = comparator.trim();
  if (c === '' || c === '*' || c === 'x' || c === 'X') return true;

  // Operator-prefixed comparators.
  const opMatch = c.match(/^(>=|<=|>|<|=)?\s*(.+)$/);
  if (!opMatch) return false;
  const op = opMatch[1] ?? '=';
  const operand = opMatch[2];

  // Caret and tilde are handled separately (operand keeps the prefix).
  if (operand.startsWith('^')) return satisfiesCaret(version, operand.slice(1));
  if (operand.startsWith('~')) return satisfiesTilde(version, operand.slice(1));

  // Wildcard ranges like 1.x or 1.2.x become a bounded range.
  if (/[xX*]/.test(operand) && op === '=') {
    return satisfiesWildcard(version, operand);
  }

  const target = parseVersion(operand);
  if (!target) return false;
  const cmp = compare(version, target);
  switch (op) {
    case '>':
      return cmp > 0;
    case '>=':
      return cmp >= 0;
    case '<':
      return cmp < 0;
    case '<=':
      return cmp <= 0;
    case '=':
    default:
      return cmp === 0;
  }
}

function satisfiesCaret(version: Version, operand: string): boolean {
  const target = parseVersion(operand);
  if (!target) return false;
  if (compare(version, target) < 0) return false;
  if (target.major > 0) return version.major === target.major;
  if (target.minor > 0) return version.major === 0 && version.minor === target.minor;
  return version.major === 0 && version.minor === 0 && version.patch === target.patch;
}

function satisfiesTilde(version: Version, operand: string): boolean {
  const target = parseVersion(operand);
  if (!target) return false;
  if (compare(version, target) < 0) return false;
  return version.major === target.major && version.minor === target.minor;
}

function satisfiesWildcard(version: Version, operand: string): boolean {
  const parts = operand.trim().replace(/^v/, '').split('.');
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (seg === 'x' || seg === 'X' || seg === '*' || seg === '') continue;
    const num = Number(seg);
    if (!Number.isInteger(num)) return false;
    const versionSeg = i === 0 ? version.major : i === 1 ? version.minor : version.patch;
    if (versionSeg !== num) return false;
  }
  return true;
}

/**
 * Returns true when `version` satisfies the comparator `range`.
 * Space-separated comparators are ANDed. Returns false on unparseable input.
 */
export function satisfies(version: string, range: string): boolean {
  const v = parseVersion(version);
  if (!v) return false;
  const trimmed = range.trim();
  if (trimmed === '' || trimmed === '*') return true;

  const comparators = trimmed.split(/\s+/).filter(Boolean);
  return comparators.every((comparator) => satisfiesComparator(v, comparator));
}
