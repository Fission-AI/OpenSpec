import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileSystemUtils } from '../../../src/utils/file-system.js';
import {
  artifactOutputExists,
  isSpecsArtifactPath,
  resolveArtifactOutputs,
} from '../../../src/core/artifact-graph/outputs.js';

describe('artifact-graph/outputs', () => {
  let tempDir: string;

  const canonical = (targetPath: string): string => FileSystemUtils.canonicalizeExistingPath(targetPath);

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-outputs-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it.each([
    ['specs/**/*.md', true],
    ['./specs/**/*.md', true],
    ['.//specs/**/*.md', true],
    [String.raw`specs\**\*.md`, true],
    [String.raw`.\specs\**\*.md`, true],
    ['docs/specs/**/*.md', false],
    ['specs-note.md', false],
  ])('classifies specs artifact path %s', (generates, expected) => {
    expect(isSpecsArtifactPath(generates)).toBe(expected);
  });

  it('resolves a direct file path when it exists', () => {
    const filePath = path.join(tempDir, 'proposal.md');
    fs.writeFileSync(filePath, 'content');

    expect(resolveArtifactOutputs(tempDir, 'proposal.md')).toEqual([canonical(filePath)]);
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

    expect(resolveArtifactOutputs(tempDir, 'specs/*/spec.md')).toEqual([canonical(filePath)]);
    expect(artifactOutputExists(tempDir, 'specs/*/spec.md')).toBe(true);
  });

  it('matches basename-sensitive glob patterns correctly', () => {
    const specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    const matching = path.join(specsDir, 'foo-auth.md');
    const nonMatching = path.join(specsDir, 'bar-auth.md');
    fs.writeFileSync(matching, 'content');
    fs.writeFileSync(nonMatching, 'content');

    expect(resolveArtifactOutputs(tempDir, 'specs/foo*.md')).toEqual([canonical(matching)]);
  });

  it('supports question-mark glob patterns', () => {
    const specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    const matching = path.join(specsDir, 'a1.md');
    fs.writeFileSync(matching, 'content');
    fs.writeFileSync(path.join(specsDir, 'a10.md'), 'content');

    expect(resolveArtifactOutputs(tempDir, 'specs/a?.md')).toEqual([canonical(matching)]);
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

    expect(resolveArtifactOutputs(aliasChangeDir, 'proposal.md')).toEqual([
      canonical(proposalPath),
    ]);
    expect(resolveArtifactOutputs(aliasChangeDir, 'specs/*/spec.md')).toEqual([
      canonical(specPath),
    ]);
  });

  it('resolves glob outputs through a confined linked directory', () => {
    const realDir = path.join(tempDir, 'real');
    const linkedDir = path.join(tempDir, 'content', 'linked');
    const filePath = path.join(realDir, 'spec.md');
    fs.mkdirSync(realDir, { recursive: true });
    fs.mkdirSync(path.dirname(linkedDir), { recursive: true });
    fs.writeFileSync(filePath, 'content');
    fs.symlinkSync(realDir, linkedDir, process.platform === 'win32' ? 'junction' : 'dir');

    expect(resolveArtifactOutputs(tempDir, 'content/**/*.md')).toEqual([
      canonical(filePath),
    ]);
  });

  it('returns an empty list when no files match the artifact output', () => {
    expect(resolveArtifactOutputs(tempDir, 'specs/*/spec.md')).toEqual([]);
    expect(artifactOutputExists(tempDir, 'specs/*/spec.md')).toBe(false);
  });

  it('rejects a literal output symlink that escapes the change directory', () => {
    if (process.platform === 'win32') return;

    const outsideFile = path.join(path.dirname(tempDir), `${path.basename(tempDir)}-outside.md`);
    fs.writeFileSync(outsideFile, 'private');
    fs.symlinkSync(outsideFile, path.join(tempDir, 'proposal.md'));

    try {
      expect(() => resolveArtifactOutputs(tempDir, 'proposal.md')).toThrow(
        /outside the allowed directory/u
      );
    } finally {
      fs.rmSync(outsideFile, { force: true });
    }
  });

  it('rejects a glob that traverses a symlinked directory outside the change', () => {
    if (process.platform === 'win32') return;

    const outsideDir = fs.mkdtempSync(
      path.join(path.dirname(tempDir), `${path.basename(tempDir)}-outside-`)
    );
    fs.writeFileSync(path.join(outsideDir, 'secret.md'), 'private');
    fs.symlinkSync(outsideDir, path.join(tempDir, 'specs'));

    try {
      expect(() => resolveArtifactOutputs(tempDir, 'specs/*.md')).toThrow(
        /outside the allowed directory/u
      );
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it('rejects an outbound linked directory below a recursive glob', () => {
    const outsideDir = fs.mkdtempSync(
      path.join(path.dirname(tempDir), `${path.basename(tempDir)}-outside-`)
    );
    const specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir);
    fs.writeFileSync(path.join(outsideDir, 'sentinel.txt'), 'private');
    fs.symlinkSync(
      outsideDir,
      path.join(specsDir, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );

    try {
      expect(() => resolveArtifactOutputs(tempDir, 'specs/**/*.md')).toThrow(
        /outside the allowed directory/u
      );
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it('ignores outbound links below directories the glob cannot visit', () => {
    const matchingDir = path.join(tempDir, 'content', 'matching');
    const ignoredDir = path.join(tempDir, 'content', 'ignored', 'deep');
    const outsideDir = fs.mkdtempSync(
      path.join(path.dirname(tempDir), `${path.basename(tempDir)}-outside-`)
    );
    const matchingFile = path.join(matchingDir, 'result.md');
    fs.mkdirSync(matchingDir, { recursive: true });
    fs.mkdirSync(ignoredDir, { recursive: true });
    fs.writeFileSync(matchingFile, 'content');
    fs.symlinkSync(
      outsideDir,
      path.join(ignoredDir, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );

    try {
      expect(resolveArtifactOutputs(tempDir, 'content/*/*.md')).toEqual([
        canonical(matchingFile),
      ]);
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it('ignores outbound links under dot-directories excluded by the glob', () => {
    const matchingDir = path.join(tempDir, 'content', 'matching');
    const ignoredDir = path.join(tempDir, 'content', '.ignored');
    const outsideDir = fs.mkdtempSync(
      path.join(path.dirname(tempDir), `${path.basename(tempDir)}-outside-`)
    );
    const matchingFile = path.join(matchingDir, 'result.md');
    fs.mkdirSync(matchingDir, { recursive: true });
    fs.mkdirSync(ignoredDir, { recursive: true });
    fs.writeFileSync(matchingFile, 'content');
    fs.symlinkSync(
      outsideDir,
      path.join(ignoredDir, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );

    try {
      expect(resolveArtifactOutputs(tempDir, 'content/*/*.md')).toEqual([
        canonical(matchingFile),
      ]);
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it('rejects a linked directory cycle before glob traversal', () => {
    const specsDir = path.join(tempDir, 'specs');
    const capabilityDir = path.join(specsDir, 'capability');
    fs.mkdirSync(capabilityDir, { recursive: true });
    fs.writeFileSync(path.join(capabilityDir, 'spec.md'), 'content');
    fs.symlinkSync(
      specsDir,
      path.join(capabilityDir, 'loop'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );

    expect(() => resolveArtifactOutputs(tempDir, 'specs/**/*.md')).toThrow(
      /linked directory cycle/u
    );
  });

  describe('glob-special characters in directory paths', () => {
    it('resolves glob patterns when directory contains parentheses', () => {
      const dirWithParens = path.join(tempDir, 'project (work)');
      const specDir = path.join(dirWithParens, 'specs', 'cap-a');
      const specFile = path.join(specDir, 'spec.md');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(specFile, 'content');

      expect(resolveArtifactOutputs(dirWithParens, 'specs/*/spec.md')).toEqual([
        canonical(specFile),
      ]);
      expect(artifactOutputExists(dirWithParens, 'specs/*/spec.md')).toBe(true);
    });

    it('resolves glob patterns when directory contains square brackets', () => {
      const dirWithBrackets = path.join(tempDir, '[projects]');
      const specDir = path.join(dirWithBrackets, 'specs', 'cap-a');
      const specFile = path.join(specDir, 'spec.md');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(specFile, 'content');

      expect(resolveArtifactOutputs(dirWithBrackets, 'specs/*/spec.md')).toEqual([
        canonical(specFile),
      ]);
      expect(artifactOutputExists(dirWithBrackets, 'specs/*/spec.md')).toBe(true);
    });

    it('resolves glob patterns when directory contains curly braces', () => {
      const dirWithBraces = path.join(tempDir, '{workspace}');
      const specDir = path.join(dirWithBraces, 'specs', 'cap-a');
      const specFile = path.join(specDir, 'spec.md');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(specFile, 'content');

      expect(resolveArtifactOutputs(dirWithBraces, 'specs/*/spec.md')).toEqual([
        canonical(specFile),
      ]);
      expect(artifactOutputExists(dirWithBraces, 'specs/*/spec.md')).toBe(true);
    });

    it('resolves glob patterns when directory contains brace expansion syntax', () => {
      const dirWithBraceExpansion = path.join(tempDir, 'project {a,b}');
      const specDir = path.join(dirWithBraceExpansion, 'specs', 'cap-a');
      const specFile = path.join(specDir, 'spec.md');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(specFile, 'content');

      expect(resolveArtifactOutputs(dirWithBraceExpansion, 'specs/*/spec.md')).toEqual([
        canonical(specFile),
      ]);
      expect(artifactOutputExists(dirWithBraceExpansion, 'specs/*/spec.md')).toBe(true);
    });

    it('resolves non-glob generates when directory contains special characters', () => {
      const dirWithParens = path.join(tempDir, 'project (work)');
      const proposalFile = path.join(dirWithParens, 'proposal.md');
      fs.mkdirSync(dirWithParens, { recursive: true });
      fs.writeFileSync(proposalFile, 'content');

      expect(resolveArtifactOutputs(dirWithParens, 'proposal.md')).toEqual([
        canonical(proposalFile),
      ]);
      expect(artifactOutputExists(dirWithParens, 'proposal.md')).toBe(true);
    });
  });
});
