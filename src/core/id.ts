/**
 * The one kebab id grammar (Phase 3 lock: one id namespace). Store ids,
 * target repo ids, change ids, and initiative ids all share it.
 */
export const KEBAB_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function isKebabId(value: string): boolean {
  return KEBAB_ID_REGEX.test(value);
}
