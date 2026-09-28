/**
 * Shared helpers for the parity-hash regeneration script and its tests.
 *
 * The rewriting lives here, separate from `regen-parity-hashes.mjs`, so its
 * guards can be exercised against fabricated input instead of the repository's
 * own parity test file. A test that ran the script for real would rewrite
 * `test/core/templates/skill-templates-parity.test.ts` on disk mid-suite.
 */

/**
 * Pinned-hash line patterns.
 *
 * The trailing comma is optional: the last entry of a map may legally omit it,
 * and requiring it silently skipped such a pin.
 *
 * CRLF needs no special handling. `test/**` carries no `text eol=lf` attribute,
 * so a Windows checkout delivers CRLF, but JavaScript treats `\r` as a line
 * terminator under /m - `$` matches before it, so the carriage return is never
 * consumed and survives the rewrite. (Python's `re.M` does not, which is worth
 * knowing before porting these patterns anywhere.)
 */
const FUNCTION_PIN = /^(\s+)(get[A-Za-z0-9]+): '([0-9a-f]{64})'(,?)$/gm;
const CONTENT_PIN = /^(\s+)'(openspec-[a-z0-9-]+)': '([0-9a-f]{64})'(,?)$/gm;

/** Any 64-hex literal, however it is written. */
const HEX_LITERAL = /'[0-9a-f]{64}'/g;

/**
 * Rewrite every pinned hash in the parity test's source.
 *
 * `resolveFunctionHash(name)` and `resolveContentHash(dirName)` return the hash
 * a pin should now hold, or `undefined` when the label no longer corresponds to
 * anything - a renamed or deleted template, which is an error rather than a
 * line to leave alone.
 *
 * Throws without returning a partial rewrite when the number of 64-hex literals
 * found does not match the number rewritten. That count uses a deliberately
 * broader pattern than the two above, so it is a real cross-check: were it
 * derived from the same patterns, a line they miss would go missing from both
 * sides and prove nothing.
 *
 * @param {string} source - contents of the parity test file
 * @param {{
 *   resolveFunctionHash: (name: string) => string | undefined,
 *   resolveContentHash: (dirName: string) => string | undefined,
 *   knownContentKeys?: Iterable<string>,
 *   sourceLabel?: string,
 * }} resolvers
 * @returns {{ source: string, moved: string[] }} rewritten source and the
 *   labels whose hash changed
 */
export function rewriteParityHashes(
  source,
  { resolveFunctionHash, resolveContentHash, knownContentKeys = [], sourceLabel = 'the parity test' }
) {
  const moved = [];
  const seenContentKeys = new Set();
  let seen = 0;

  const totalHexLiterals = (source.match(HEX_LITERAL) ?? []).length;

  let rewritten = source.replace(FUNCTION_PIN, (_match, indent, name, previous, comma) => {
    const next = resolveFunctionHash(name);
    if (next === undefined) {
      throw new Error(`${name} is pinned in the parity test but not exported from skill-templates.js`);
    }
    if (next !== previous) moved.push(name);
    seen += 1;
    return `${indent}${name}: '${next}'${comma}`;
  });

  rewritten = rewritten.replace(CONTENT_PIN, (_match, indent, dirName, previous, comma) => {
    const next = resolveContentHash(dirName);
    if (next === undefined) {
      throw new Error(`'${dirName}' is pinned in the parity test but not returned by getSkillTemplates()`);
    }
    if (next !== previous) moved.push(dirName);
    seenContentKeys.add(dirName);
    seen += 1;
    return `${indent}'${dirName}': '${next}'${comma}`;
  });

  if (seen !== totalHexLiterals) {
    throw new Error(
      `Rewrote ${seen} of ${totalHexLiterals} 64-hex literals in ${sourceLabel}.\n` +
        'Every one is assumed to be a pinned hash, so the two counts must agree. Either:\n' +
        '  - a pinned hash is formatted in a way the patterns here do not match, and ' +
        'would have been left stale without warning: widen them; or\n' +
        '  - the file gained a 64-hex literal that is not a pin: narrow the count above ' +
        'so it stops being mistaken for one.'
    );
  }

  // The checks above only see pins that exist. A workflow added to the registry
  // but never pinned is invisible to them AND to the parity test, which compares
  // only the entries it already lists - so it would ship with no golden hash at
  // all while this reported success. Compare the other direction too.
  const unpinned = [...knownContentKeys].filter((key) => !seenContentKeys.has(key));
  if (unpinned.length > 0) {
    throw new Error(
      `getSkillTemplates() returns ${unpinned.length} skill(s) with no pinned hash in ${sourceLabel}:\n` +
        unpinned.map((key) => `  ${key}`).join('\n') +
        '\nAdd each to EXPECTED_GENERATED_SKILL_CONTENT_HASHES and GENERATED_SKILL_FACTORIES.\n' +
        'Until then the skill ships with no parity coverage, so this run would have ' +
        'reported success while leaving it unguarded.'
    );
  }

  return { source: rewritten, moved };
}

/**
 * Stable, key-sorted serialisation used to hash a template's payload.
 *
 * Must stay byte-compatible with the copy in
 * `test/core/templates/skill-templates-parity.test.ts`. A divergence cannot pass
 * unnoticed: that test recomputes the hashes independently and compares.
 */
export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}
