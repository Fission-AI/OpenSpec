import { describe, expect, it } from 'vitest';

// @ts-expect-error - plain ESM helper shared with the regeneration script
import { rewriteParityHashes } from '../../../scripts/parity-hash-shared.mjs';

// Guards for scripts/regen-parity-hashes.mjs. Every case here uses fabricated
// input: running the real script would rewrite the repository's own
// skill-templates-parity.test.ts on disk mid-suite, and a failure part-way
// through would leave those hashes committed by the next `git add -A`.
//
// Each case corresponds to a way an earlier revision of the script reported
// "nothing to update" while leaving a pin stale, or refused to run at all.

const OLD = 'a'.repeat(64);
const NEW = 'b'.repeat(64);
const OTHER = 'c'.repeat(64);

/** Resolvers that answer for exactly the labels a fixture pins. */
function resolvers(
  fns: Record<string, string> = {},
  dirs: Record<string, string> = {},
  knownContentKeys: string[] = Object.keys(dirs)
) {
  return {
    resolveFunctionHash: (name: string) => fns[name],
    resolveContentHash: (dirName: string) => dirs[dirName],
    knownContentKeys,
    sourceLabel: 'fixture',
  };
}

describe('parity hash rewriting', () => {
  it('rewrites a stale function pin and reports it moved', () => {
    const src = `const M = {\n  getFooTemplate: '${OLD}',\n};\n`;
    const result = rewriteParityHashes(src, resolvers({ getFooTemplate: NEW }));

    expect(result.source).toContain(`getFooTemplate: '${NEW}',`);
    expect(result.moved).toEqual(['getFooTemplate']);
  });

  it('rewrites a stale generated-content pin and reports it moved', () => {
    const src = `const M = {\n  'openspec-foo-bar': '${OLD}',\n};\n`;
    const result = rewriteParityHashes(src, resolvers({}, { 'openspec-foo-bar': NEW }));

    expect(result.source).toContain(`'openspec-foo-bar': '${NEW}',`);
    expect(result.moved).toEqual(['openspec-foo-bar']);
  });

  it('leaves an already-correct pin untouched and reports nothing moved', () => {
    const src = `const M = {\n  getFooTemplate: '${OLD}',\n};\n`;
    const result = rewriteParityHashes(src, resolvers({ getFooTemplate: OLD }));

    expect(result.source).toBe(src);
    expect(result.moved).toEqual([]);
  });

  // A map's last entry may legally omit its trailing comma, and a reformat
  // produces exactly that. Requiring the comma silently skipped such a pin
  // while the run reported success.
  it('rewrites a pin with no trailing comma and keeps it comma-less', () => {
    const src = `const M = {\n  getFooTemplate: '${OLD}'\n};\n`;
    const result = rewriteParityHashes(src, resolvers({ getFooTemplate: NEW }));

    expect(result.source).toContain(`getFooTemplate: '${NEW}'\n`);
    expect(result.source).not.toContain(`'${NEW}',`);
    expect(result.moved).toEqual(['getFooTemplate']);
  });

  it('preserves a trailing comma when the pin has one', () => {
    const src = `const M = {\n  getFooTemplate: '${OLD}',\n  getBarTemplate: '${OTHER}',\n};\n`;
    const result = rewriteParityHashes(
      src,
      resolvers({ getFooTemplate: NEW, getBarTemplate: OTHER })
    );

    expect(result.source).toContain(`getFooTemplate: '${NEW}',\n`);
    expect(result.moved).toEqual(['getFooTemplate']);
  });

  // test/** carries no `text eol=lf` attribute, so a Windows checkout delivers
  // CRLF. Anchoring on $ alone matched nothing there and the run aborted.
  it('round-trips CRLF line endings unchanged', () => {
    const src = `const M = {\r\n  getFooTemplate: '${OLD}',\r\n  'openspec-foo': '${OTHER}',\r\n};\r\n`;
    const result = rewriteParityHashes(
      src,
      resolvers({ getFooTemplate: NEW }, { 'openspec-foo': OTHER })
    );

    expect(result.source).toContain(`getFooTemplate: '${NEW}',\r\n`);
    expect(result.source.split('\n').length).toBe(src.split('\n').length);
    expect(result.source).not.toMatch(/[^\r]\n/);
  });

  it('throws when a function pin names something that no longer exists', () => {
    const src = `const M = {\n  getGoneTemplate: '${OLD}',\n};\n`;

    expect(() => rewriteParityHashes(src, resolvers())).toThrow(/getGoneTemplate is pinned/);
  });

  it('throws when a generated-content pin names a directory that no longer exists', () => {
    const src = `const M = {\n  'openspec-gone': '${OLD}',\n};\n`;

    expect(() => rewriteParityHashes(src, resolvers())).toThrow(/'openspec-gone' is pinned/);
  });

  // The count is taken with a broader pattern than the rewriters on purpose:
  // derived from the same patterns, a line they miss would vanish from both
  // sides and prove nothing.
  it('throws when a pin is formatted in a way the patterns do not match', () => {
    const src = `const M = {\n  'getFooTemplate': '${OLD}',\n};\n`;

    expect(() => rewriteParityHashes(src, resolvers({ getFooTemplate: NEW }))).toThrow(
      /Rewrote 0 of 1 64-hex literals in fixture/
    );
  });

  it('throws when the file gains a 64-hex literal that is not a pin', () => {
    const src = `const UNRELATED = '${OTHER}';\nconst M = {\n  getFooTemplate: '${OLD}',\n};\n`;

    expect(() => rewriteParityHashes(src, resolvers({ getFooTemplate: NEW }))).toThrow(
      /Rewrote 1 of 2 64-hex literals/
    );
  });

  // A workflow added to getSkillTemplates() but never pinned is invisible to the
  // checks above (they only see pins that exist) and to the parity test (it
  // compares only the entries it lists), so it would ship with no golden hash
  // while the run reported success.
  it('throws when the registry deploys a skill that is not pinned', () => {
    const src = `const M = {\n  'openspec-foo': '${OLD}',\n};\n`;

    expect(() =>
      rewriteParityHashes(
        src,
        resolvers({}, { 'openspec-foo': OLD, 'openspec-brand-new': NEW }, [
          'openspec-foo',
          'openspec-brand-new',
        ])
      )
    ).toThrow(/openspec-brand-new/);
  });

  it('names every unpinned skill, not just the first', () => {
    const src = `const M = {\n  'openspec-foo': '${OLD}',\n};\n`;

    expect(() =>
      rewriteParityHashes(
        src,
        resolvers({}, { 'openspec-foo': OLD }, ['openspec-foo', 'openspec-aaa', 'openspec-bbb'])
      )
    ).toThrow(/openspec-aaa[\s\S]*openspec-bbb/);
  });

  it('accepts a registry fully covered by pins', () => {
    const src = `const M = {\n  'openspec-foo': '${OLD}',\n};\n`;
    const result = rewriteParityHashes(
      src,
      resolvers({}, { 'openspec-foo': NEW }, ['openspec-foo'])
    );

    expect(result.moved).toEqual(['openspec-foo']);
  });

  it('names both causes when the counts disagree, since either is possible', () => {
    const src = `const UNRELATED = '${OTHER}';\nconst M = {\n  getFooTemplate: '${OLD}',\n};\n`;

    expect(() => rewriteParityHashes(src, resolvers({ getFooTemplate: NEW }))).toThrow(
      /widen them[\s\S]*not a pin/
    );
  });
});
