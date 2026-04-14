import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { artifactOutputExists, resolveArtifactOutputs } from '../../../src/core/artifact-graph/outputs.js';

describe('artifact-graph/outputs', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-outputs-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves a direct file path when it exists', () => {
    const filePath = path.join(tempDir, 'proposal.md');
    fs.writeFileSync(filePath, 'content');

    expect(resolveArtifactOutputs(tempDir, 'proposal.md')).toEqual([fs.realpathSync(filePath)]);
    expect(artifactOutputExists(tempDir, 'proposal.md')).toBe(true);
  });

  it('does not treat a directory as a resolved literal artifact output', () => {
    const dirPath = path.join(tempDir, 'proposal.md');
    fs.mkdirSync(dirPath, { recursive: true });

    expect(resolveArtifactOutputs(tempDir, 'proposal.md')).toEqual([]);
    expect(artifactOutputExists(tempDir, 'proposal.md')).toBe(false);
  });

  it('resolves single-star nested globs to concrete files', () => {
    const nestedDir = path.join(tempDir, 'specs', 'change-a');
    const filePath = path.join(nestedDir, 'spec.md');
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(filePath, 'content');

    expect(resolveArtifactOutputs(tempDir, 'specs/*/spec.md')).toEqual([fs.realpathSync(filePath)]);
    expect(artifactOutputExists(tempDir, 'specs/*/spec.md')).toBe(true);
  });

  it('matches basename-sensitive glob patterns correctly', () => {
    const specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    const matching = path.join(specsDir, 'foo-auth.md');
    const nonMatching = path.join(specsDir, 'bar-auth.md');
    fs.writeFileSync(matching, 'content');
    fs.writeFileSync(nonMatching, 'content');

    expect(resolveArtifactOutputs(tempDir, 'specs/foo*.md')).toEqual([fs.realpathSync(matching)]);
  });

  it('supports question-mark glob patterns', () => {
    const specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    const matching = path.join(specsDir, 'a1.md');
    fs.writeFileSync(matching, 'content');
    fs.writeFileSync(path.join(specsDir, 'a10.md'), 'content');

    expect(resolveArtifactOutputs(tempDir, 'specs/a?.md')).toEqual([fs.realpathSync(matching)]);
  });

  it('supports character class glob patterns', () => {
    const specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    const aPath = path.join(specsDir, 'a.md');
    const bPath = path.join(specsDir, 'b.md');
    fs.writeFileSync(aPath, 'content');
    fs.writeFileSync(bPath, 'content');
    fs.writeFileSync(path.join(specsDir, 'c.md'), 'content');

    expect(resolveArtifactOutputs(tempDir, 'specs/[ab].md')).toEqual([
      fs.realpathSync(aPath),
      fs.realpathSync(bPath),
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

    expect(resolveArtifactOutputs(aliasChangeDir, 'proposal.md')).toEqual([
      fs.realpathSync(proposalPath),
    ]);
    expect(resolveArtifactOutputs(aliasChangeDir, 'specs/*/spec.md')).toEqual([
      fs.realpathSync(specPath),
    ]);
  });

  it('returns an empty list when no files match the artifact output', () => {
    expect(resolveArtifactOutputs(tempDir, 'specs/*/spec.md')).toEqual([]);
    expect(artifactOutputExists(tempDir, 'specs/*/spec.md')).toBe(false);
  });
});
