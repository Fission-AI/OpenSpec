import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const scriptPath = path.join(projectRoot, 'scripts', 'update-flake.sh');
const script = fs.readFileSync(scriptPath, 'utf8');

/**
 * `scripts/update-flake.sh` rewrites the pnpmDeps hash in flake.nix in place.
 *
 * flake.nix holds exactly one fixed-output derivation today, so an unscoped
 * `hash = "sha256-..."` happens to land on the right line and the bug is
 * invisible. Add a second FOD and an unscoped script stamps the placeholder
 * over both, reads back whichever mismatch Nix reported first, and writes
 * pnpmDeps' hash into the other derivation. That is a silent corruption of a
 * supply-chain pin, so the scoping is pinned here rather than left to review.
 */
describe('update-flake.sh confines every hash rewrite to the pnpmDeps block', () => {
  const BLOCK = "PNPM_DEPS_BLOCK='/pnpmDeps = /,/};/'";

  it('declares the block address once, so the scoping cannot drift per call site', () => {
    expect(script).toContain(BLOCK);
  });

  it('scopes every line that reads or rewrites a hash', () => {
    const unscoped = script
      .split('\n')
      .map((line, index) => [index + 1, line.trim()] as const)
      .filter(([, line]) => !line.startsWith('#'))
      // Every line that extracts a hash or edits one in place.
      .filter(([, line]) => /CURRENT_HASH=\$\(sed|sed "\$\{SED_INPLACE\[@\]\}"/.test(line))
      .filter(([, line]) => !line.includes('PNPM_DEPS_BLOCK'));

    expect(unscoped).toEqual([]);
  });

  // The static checks above say the range is spelled everywhere; this one says
  // the range actually selects the right derivation. Runs the script's own
  // three sed operations against a flake with three FODs, pnpmDeps in the
  // middle, so a first-match bug and a global-replace bug both show up.
  it('touches only the pnpmDeps hash in a flake with several derivations', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-flake-scope-'));
    const flake = path.join(dir, 'flake.nix');
    const other = 'sha256-OTHEROTHEROTHEROTHEROTHEROTHEROTHEROTHEROT0=';
    const pnpm = 'sha256-PNPMPNPMPNPMPNPMPNPMPNPMPNPMPNPMPNPMPNPMPN0=';
    const another = 'sha256-ANOTHERANOTHERANOTHERANOTHERANOTHERANOTHE0=';
    const fresh = 'sha256-NEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNE0=';

    fs.writeFileSync(
      flake,
      [
        '{',
        '  other = pkgs.fetchFromGitHub {',
        `    hash = "${other}";`,
        '  };',
        '  pnpmDeps = pkgs.fetchPnpmDeps {',
        `    hash = "${pnpm}";`,
        '  };',
        '  another = pkgs.fetchurl {',
        `    hash = "${another}";`,
        '  };',
        '}',
        '',
      ].join('\n')
    );

    // Mirrors the script: read the current hash, stamp the placeholder, write
    // the calculated hash back.
    const read = execFileSync(
      'bash',
      [
        '-c',
        `${BLOCK}\nsed -nE "$PNPM_DEPS_BLOCK"' s/.*hash = "(sha256-[^"]+)".*/\\1/p' "$1" | head -1`,
        '_',
        flake,
      ],
      { encoding: 'utf8' }
    ).trim();

    // The whole point: an unscoped read returns the first derivation's hash.
    expect(read).toBe(pnpm);
    expect(read).not.toBe(other);

    const placeholder = 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    execFileSync('bash', [
      '-c',
      `${BLOCK}\nsed -i.bak "$PNPM_DEPS_BLOCK s|hash = \\"sha256-[^\\"]*\\"|hash = \\"${placeholder}\\"|" "$1"`,
      '_',
      flake,
    ]);
    expect(fs.readFileSync(flake, 'utf8').split(placeholder).length - 1).toBe(1);

    execFileSync('bash', [
      '-c',
      `${BLOCK}\nsed -i.bak "$PNPM_DEPS_BLOCK s|hash = \\"${placeholder}\\"|hash = \\"${fresh}\\"|" "$1"`,
      '_',
      flake,
    ]);

    const updated = fs.readFileSync(flake, 'utf8');
    expect(updated).toContain(`hash = "${fresh}"`);
    // The neighbours are untouched, which is what a global replace would break.
    expect(updated).toContain(`hash = "${other}"`);
    expect(updated).toContain(`hash = "${another}"`);
    expect(updated).not.toContain(placeholder);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('refuses to touch the file when no pnpmDeps hash is found', () => {
    expect(script).toContain('no pnpmDeps hash found in flake.nix');
    expect(script).toContain('Nothing was modified.');
  });
});
