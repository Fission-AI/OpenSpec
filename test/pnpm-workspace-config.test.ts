import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const projectRoot = process.cwd();

function readJson(relativePath: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), 'utf8'));
}

function readYaml(relativePath: string): Record<string, any> {
  return parse(fs.readFileSync(path.join(projectRoot, relativePath), 'utf8'));
}

describe('pnpm workspace configuration', () => {
  it('keeps root build approval aligned and security overrides single-sourced', () => {
    const packageJson = readJson('package.json');
    const lockfile = readYaml('pnpm-lock.yaml');
    const workspace = readYaml('pnpm-workspace.yaml');
    const esbuildVersions = Object.keys(lockfile.packages)
      .filter((key) => key.startsWith('esbuild@'))
      .map((key) => key.slice('esbuild@'.length));

    expect(workspace.packages).toEqual(['.']);
    expect(esbuildVersions).toHaveLength(1);
    expect(workspace.allowBuilds).toEqual({
      [`esbuild@${esbuildVersions[0]}`]: true,
    });
    // Overrides are declared once, in pnpm-workspace.yaml. A `pnpm.overrides` block
    // in package.json replaces that list rather than merging with it, and Dependabot
    // rewrites plain-name entries there when it bumps the same package — so a mirrored
    // copy silently displaces the pins that patch advisories. Keeping the whole `pnpm`
    // block out of package.json denies Dependabot the block to write into.
    expect(packageJson.pnpm).toBeUndefined();
    expect(workspace.overrides).toEqual(lockfile.overrides);
  });

  it('keeps the website as an independently locked project', () => {
    const packageJson = readJson('website/package.json');
    const lockfile = readYaml('website/pnpm-lock.yaml');
    const workspace = readYaml('website/pnpm-workspace.yaml');
    const esbuildVersions = Object.keys(lockfile.packages)
      .filter((key) => key.startsWith('esbuild@'))
      .map((key) => key.slice('esbuild@'.length));

    expect(workspace.packages).toEqual(['.']);
    expect(esbuildVersions).toHaveLength(1);
    expect(workspace.allowBuilds).toEqual({
      [`esbuild@${esbuildVersions[0]}`]: true,
    });
    // Single-sourced in website/pnpm-workspace.yaml, for the reason above.
    expect(packageJson.pnpm).toBeUndefined();
    expect(workspace.overrides).toEqual(lockfile.overrides);
  });

  it('includes install policy changes in Nix and security validation', () => {
    const flake = fs.readFileSync(path.join(projectRoot, 'flake.nix'), 'utf8');
    const ci = fs.readFileSync(path.join(projectRoot, '.github/workflows/ci.yml'), 'utf8');
    const security = fs.readFileSync(
      path.join(projectRoot, '.github/workflows/security.yml'),
      'utf8'
    );

    expect(flake).toContain('./pnpm-workspace.yaml');
    expect(ci).toContain("- 'pnpm-workspace.yaml'");
    expect(security).toContain("- '**/pnpm-workspace.yaml'");
  });
});
