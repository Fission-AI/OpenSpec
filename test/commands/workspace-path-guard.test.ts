import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';

function readWorkspaceCommandTestSource(): string {
  return fs.readFileSync(new URL('./workspace.test.ts', import.meta.url), 'utf-8');
}

describe('workspace command path expectation guardrails', () => {
  it('keeps generated workspace folder expectations behind canonical path helpers', () => {
    const source = readWorkspaceCommandTestSource();

    expect(source).not.toMatch(/\.folders\)\.toEqual\(\s*\[/u);
    expect(source).not.toMatch(/expect\(workspaceFolders\)\.toEqual\(\s*\[/u);
  });

  it('keeps opener launch expectations behind canonical path helpers', () => {
    const source = readWorkspaceCommandTestSource();

    expect(source).not.toMatch(/expect\([^)]*Launch\.args\)\.toEqual\(/u);
    expect(source).not.toMatch(/expect\(fs\.realpathSync\.native\([^)]*Launch\.cwd\)\)\.toBe/u);
    expect(source).not.toMatch(/getWorkspaceCodeWorkspacePath\(expectedExistingPath\(/u);
  });
});
