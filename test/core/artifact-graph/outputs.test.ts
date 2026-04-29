import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileSystemUtils } from '../../../src/utils/file-system.js';
import { artifactOutputExists, resolveArtifactOutputs } from '../../../src/core/artifact-graph/outputs.js';

describe('artifact-graph/outputs', () => {
  let tempDir: string;

  const canonical = (targetPath: string): string => FileSystemUtils.canonicalizeExistingPath(targetPath);

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-outputs-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const artifactWith = (generates: string, folder?: string) => ({ generates, folder });

  it('resolves a direct file path when it exists', () => {
    const filePath = path.join(tempDir, 'proposal.md');
    fs.writeFileSync(filePath, 'content');

    expect(resolveArtifactOutputs(artifactWith('proposal.md'), tempDir)).toEqual([canonical(filePath)]);
    expect(artifactOutputExists(artifactWith('proposal.md'), tempDir)).toBe(true);
  });

  it('does not treat a directory as a resolved literal artifact output', () => {
    const dirPath = path.join(tempDir, 'proposal.md');
    fs.mkdirSync(dirPath, { recursive: true });

    expect(resolveArtifactOutputs(artifactWith('proposal.md'), tempDir)).toEqual([]);
    expect(artifactOutputExists(artifactWith('proposal.md'), tempDir)).toBe(false);
  });

  it('resolves single-star nested globs to concrete files', () => {
    const nestedDir = path.join(tempDir, 'specs', 'change-a');
    const filePath = path.join(nestedDir, 'spec.md');
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(filePath, 'content');

    expect(resolveArtifactOutputs(artifactWith('specs/*/spec.md'), tempDir)).toEqual([canonical(filePath)]);
    expect(artifactOutputExists(artifactWith('specs/*/spec.md'), tempDir)).toBe(true);
  });

  it('matches basename-sensitive glob patterns correctly', () => {
    const specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    const matching = path.join(specsDir, 'foo-auth.md');
    const nonMatching = path.join(specsDir, 'bar-auth.md');
    fs.writeFileSync(matching, 'content');
    fs.writeFileSync(nonMatching, 'content');

    expect(resolveArtifactOutputs(artifactWith('specs/foo*.md'), tempDir)).toEqual([canonical(matching)]);
  });

  it('supports question-mark glob patterns', () => {
    const specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    const matching = path.join(specsDir, 'a1.md');
    fs.writeFileSync(matching, 'content');
    fs.writeFileSync(path.join(specsDir, 'a10.md'), 'content');

    expect(resolveArtifactOutputs(artifactWith('specs/a?.md'), tempDir)).toEqual([canonical(matching)]);
  });

  it('supports character class glob patterns', () => {
    const specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    const aPath = path.join(specsDir, 'a.md');
    const bPath = path.join(specsDir, 'b.md');
    fs.writeFileSync(aPath, 'content');
    fs.writeFileSync(bPath, 'content');
    fs.writeFileSync(path.join(specsDir, 'c.md'), 'content');

    expect(resolveArtifactOutputs(artifactWith('specs/[ab].md'), tempDir)).toEqual([
      canonical(aPath),
      canonical(bPath),
    ]);
  });

  it('canonicalizes resolved paths when the change directory is accessed through an alias', () => {
    const rootDir = path.join(tempDir, 'workspace');
    const realChangeDir = path.join(rootDir, 'real-change');
    const aliasChangeDir = path.join(rootDir, 'alias-change');
    const specDir = path.join(realChangeDir, 'specs', 'change-a');
    const proposalPath = path.join(realChangeDir, 'proposal.md');
    const specPath = path.join(specDir, 'spec.md');

    fs.mkdirSync(specDir, { recursive: true });
    fs.writeFileSync(proposalPath, 'content');
    fs.writeFileSync(specPath, 'content');
    fs.symlinkSync(realChangeDir, aliasChangeDir, process.platform === 'win32' ? 'junction' : 'dir');

    expect(resolveArtifactOutputs(artifactWith('proposal.md'), aliasChangeDir)).toEqual([
      canonical(proposalPath),
    ]);
    expect(resolveArtifactOutputs(artifactWith('specs/*/spec.md'), aliasChangeDir)).toEqual([
      canonical(specPath),
    ]);
  });

  it('returns an empty list when no files match the artifact output', () => {
    expect(resolveArtifactOutputs(artifactWith('specs/*/spec.md'), tempDir)).toEqual([]);
    expect(artifactOutputExists(artifactWith('specs/*/spec.md'), tempDir)).toBe(false);
  });

  describe('glob-special characters in directory paths', () => {
    it('resolves glob patterns when directory contains parentheses', () => {
      const dirWithParens = path.join(tempDir, 'project (work)');
      const specDir = path.join(dirWithParens, 'specs', 'cap-a');
      const specFile = path.join(specDir, 'spec.md');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(specFile, 'content');

      expect(resolveArtifactOutputs(artifactWith('specs/*/spec.md'), dirWithParens)).toEqual([
        canonical(specFile),
      ]);
      expect(artifactOutputExists(artifactWith('specs/*/spec.md'), dirWithParens)).toBe(true);
    });

    it('resolves glob patterns when directory contains square brackets', () => {
      const dirWithBrackets = path.join(tempDir, '[projects]');
      const specDir = path.join(dirWithBrackets, 'specs', 'cap-a');
      const specFile = path.join(specDir, 'spec.md');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(specFile, 'content');

      expect(resolveArtifactOutputs(artifactWith('specs/*/spec.md'), dirWithBrackets)).toEqual([
        canonical(specFile),
      ]);
      expect(artifactOutputExists(artifactWith('specs/*/spec.md'), dirWithBrackets)).toBe(true);
    });

    it('resolves glob patterns when directory contains curly braces', () => {
      const dirWithBraces = path.join(tempDir, '{workspace}');
      const specDir = path.join(dirWithBraces, 'specs', 'cap-a');
      const specFile = path.join(specDir, 'spec.md');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(specFile, 'content');

      expect(resolveArtifactOutputs(artifactWith('specs/*/spec.md'), dirWithBraces)).toEqual([
        canonical(specFile),
      ]);
      expect(artifactOutputExists(artifactWith('specs/*/spec.md'), dirWithBraces)).toBe(true);
    });

    it('resolves glob patterns when directory contains brace expansion syntax', () => {
      const dirWithBraceExpansion = path.join(tempDir, 'project {a,b}');
      const specDir = path.join(dirWithBraceExpansion, 'specs', 'cap-a');
      const specFile = path.join(specDir, 'spec.md');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(specFile, 'content');

      expect(resolveArtifactOutputs(artifactWith('specs/*/spec.md'), dirWithBraceExpansion)).toEqual([
        canonical(specFile),
      ]);
      expect(artifactOutputExists(artifactWith('specs/*/spec.md'), dirWithBraceExpansion)).toBe(true);
    });

    it('resolves non-glob generates when directory contains special characters', () => {
      const dirWithParens = path.join(tempDir, 'project (work)');
      const proposalFile = path.join(dirWithParens, 'proposal.md');
      fs.mkdirSync(dirWithParens, { recursive: true });
      fs.writeFileSync(proposalFile, 'content');

      expect(resolveArtifactOutputs(artifactWith('proposal.md'), dirWithParens)).toEqual([
        canonical(proposalFile),
      ]);
      expect(artifactOutputExists(artifactWith('proposal.md'), dirWithParens)).toBe(true);
    });
  });
});
