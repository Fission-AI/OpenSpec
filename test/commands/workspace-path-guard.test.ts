import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';

const directPathAssertionMatchers = [
  String.raw`to(?:Strict)?Equal`,
  'toBe',
  'toMatchObject',
  String.raw`toContain(?:Equal)?`,
  'toMatch',
].join('|');
const expectArgumentWithoutNestedExpect = String.raw`(?:(?!expect\()[\s\S])*?`;
const directPathAssertionCall = String.raw`\s*\.(?:${directPathAssertionMatchers})\(`;
const expectWorkspaceFileFolders = String.raw`expect\(\s*${expectArgumentWithoutNestedExpect}\.folders\s*\)`;
const expectWorkspaceFoldersVariable = String.raw`expect\(\s*workspaceFolders\s*\)`;
const expectLaunchArgs = String.raw`expect\(\s*${expectArgumentWithoutNestedExpect}Launch\.args${expectArgumentWithoutNestedExpect}\)`;
const expectLaunchCwd = String.raw`expect\(\s*${expectArgumentWithoutNestedExpect}Launch\.cwd${expectArgumentWithoutNestedExpect}\)`;
const forbiddenWorkspaceFolderAssertionPatterns = [
  sourcePattern(String.raw`${expectWorkspaceFileFolders}${directPathAssertionCall}\s*\[`),
  sourcePattern(String.raw`${expectWorkspaceFoldersVariable}${directPathAssertionCall}\s*\[`),
];
const forbiddenLaunchAssertionPatterns = [
  sourcePattern(String.raw`${expectLaunchArgs}${directPathAssertionCall}`),
  sourcePattern(String.raw`${expectLaunchCwd}${directPathAssertionCall}`),
  /getWorkspaceCodeWorkspacePath\(\s*expectedExistingPath\(/u,
];

function sourcePattern(source: string): RegExp {
  return new RegExp(source, 'u');
}

function readWorkspaceCommandTestSource(): string {
  return fs.readFileSync(new URL('./workspace.test.ts', import.meta.url), 'utf-8');
}

function matchesAny(patterns: RegExp[], source: string): boolean {
  return patterns.some((pattern) => pattern.test(source));
}

describe('workspace command path expectation guardrails', () => {
  it('keeps generated workspace folder expectations behind canonical path helpers', () => {
    const source = readWorkspaceCommandTestSource();

    expect(matchesAny(forbiddenWorkspaceFolderAssertionPatterns, source)).toBe(false);
  });

  it('keeps opener launch expectations behind canonical path helpers', () => {
    const source = readWorkspaceCommandTestSource();

    expect(matchesAny(forbiddenLaunchAssertionPatterns, source)).toBe(false);
  });

  it('detects direct path assertion shapes that bypass canonical helpers', () => {
    const directWorkspaceFolderAssertion = `
      expect(
        JSON.parse(fs.readFileSync(pathToWorkspace, 'utf-8')).folders
      ).toStrictEqual([
        { name: 'api', path: api },
      ]);
    `;
    const directWorkspaceFoldersVariableAssertion = `
      expect( workspaceFolders ).toMatchObject([
        { name: 'checkout', path: checkout },
      ]);
    `;
    const directLaunchArgsAssertion = `
      expect(
        JSON.parse(fs.readFileSync(editorLog, 'utf-8')).editorLaunch.args
      ).toContain(expectedWorkspaceFile);
    `;
    const directLaunchCwdAssertion = `
      expect(
        fs.realpathSync.native(codexLaunch.cwd)
      ).toBe(expectedWorkspaceRoot);
    `;
    const helperBackedWorkspaceFolderAssertion = `
      expect(JSON.parse(fs.readFileSync(pathToWorkspace, 'utf-8')).folders).toEqual(
        expectedWorkspaceFolders([
          { name: 'api', path: api },
        ])
      );
    `;

    expect(
      matchesAny(forbiddenWorkspaceFolderAssertionPatterns, directWorkspaceFolderAssertion)
    ).toBe(true);
    expect(
      matchesAny(forbiddenWorkspaceFolderAssertionPatterns, directWorkspaceFoldersVariableAssertion)
    ).toBe(true);
    expect(matchesAny(forbiddenLaunchAssertionPatterns, directLaunchArgsAssertion)).toBe(true);
    expect(matchesAny(forbiddenLaunchAssertionPatterns, directLaunchCwdAssertion)).toBe(true);
    expect(
      matchesAny(forbiddenWorkspaceFolderAssertionPatterns, helperBackedWorkspaceFolderAssertion)
    ).toBe(false);
  });
});
