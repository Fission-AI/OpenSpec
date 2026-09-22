import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fg from 'fast-glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileSystemUtils } from '../../../src/utils/file-system.js';
import {
  artifactOutputExists,
  isGlobPattern,
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

  it.each([
    ['specs/**/*.md', true],
    ['specs/foo*.md', true],
    ['specs/a?.md', true],
    ['specs/[ab].md', true],
    ['review-{api,ui}.md', true],
    ['file-{1..3}.md', true],
    ['report-{draft}-{api,ui}.md', true],
    ['report-{draft}-{1..3}.md', true],
    ['report-{draft,{api,ui}}.md', true],
    ['report-{{draft},api}.md', true],
    ['report-{draft}-{final}.md', false],
    ['@(proposal|design).md', true],
    ['+(proposal|design).md', true],
    ['!(proposal|design).md', true],
    ['*(proposal|design).md', true],
    ['?(proposal|design).md', true],
    ['!*.md', true],
    ['file[.md', true],
    [String.raw`specs\review-{api,ui}.md`, true],
    ['!review.md', false],
    ['(proposal|design).md', false],
    [String.raw`specs\auth\spec.md`, false],
    ['review-{api}.md', false],
    ['proposal.md', false],
    ['specs/auth/spec.md', false],
  ])('classifies glob pattern %s as %s', (pattern, expected) => {
    expect(isGlobPattern(pattern)).toBe(expected);
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

  it('resolves a literal filename with a leading exclamation mark', () => {
    const filePath = path.join(tempDir, '!review.md');
    fs.writeFileSync(filePath, 'content');

    expect(resolveArtifactOutputs(tempDir, '!review.md')).toEqual([canonical(filePath)]);
    expect(artifactOutputExists(tempDir, '!review.md')).toBe(true);
  });

  it.skipIf(process.platform === 'win32').each([
    '(proposal|design).md',
    String.raw`foo\bar.md`,
  ])('preserves the literal filename %s', (filename) => {
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, 'content');
    fs.writeFileSync(path.join(tempDir, 'proposal.md'), 'other');
    fs.mkdirSync(path.join(tempDir, 'foo'));
    fs.writeFileSync(path.join(tempDir, 'foo', 'bar.md'), 'other');

    expect(resolveArtifactOutputs(tempDir, filename)).toEqual([canonical(filePath)]);
  });

  it('resolves a negative extglob to files outside its alternatives', () => {
    const notesPath = path.join(tempDir, 'notes.md');
    for (const filename of ['proposal.md', 'design.md', 'notes.md']) {
      fs.writeFileSync(path.join(tempDir, filename), 'content');
    }

    expect(resolveArtifactOutputs(tempDir, '!(proposal|design).md')).toEqual([
      canonical(notesPath),
    ]);
  });

  it.each([
    'content/{safe,linked}/review.md',
    'content/@(safe|linked)/review.md',
    String.raw`content\{safe,linked}\review.md`,
    '{content/safe,content/linked/deep}/review.md',
    '{content/{safe,linked/deep},other}/review.md',
  ])('confines directory pattern %s even without matching files', (pattern) => {
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-outside-'));
    fs.mkdirSync(path.join(tempDir, 'content', 'safe'), { recursive: true });
    fs.symlinkSync(outsideDir, path.join(tempDir, 'content', 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir');
    try {
      expect(() => resolveArtifactOutputs(tempDir, pattern)).toThrow(
        /outside the allowed directory/u
      );
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it.each([false, true])('rejects brace-expanded parent traversal before globbing (file exists: %s)', (exists) => {
    const outsideDir = fs.mkdtempSync(path.join(path.dirname(tempDir), 'openspec-outside-'));
    const pattern = `{safe,../${path.basename(outsideDir)}}/review.md`;
    if (exists) fs.writeFileSync(path.join(outsideDir, 'review.md'), 'private');
    const glob = vi.spyOn(fg, 'sync');
    try {
      expect(() => resolveArtifactOutputs(tempDir, pattern)).toThrow(
        /outside the allowed directory/u
      );
      expect(glob).not.toHaveBeenCalled();
    } finally {
      glob.mockRestore();
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it.each([
    'report-{draft}-{api,ui}.md',
    'report-{draft}-{{api},ui}.md',
  ])('resolves later and nested brace expansions in %s', (pattern) => {
    const filePath = path.join(tempDir,
      pattern.includes('{{api}') ? 'report-{draft}-{api}.md' : 'report-{draft}-api.md');
    fs.writeFileSync(filePath, 'content');
    expect(resolveArtifactOutputs(tempDir, pattern)).toEqual([canonical(filePath)]);
  });

  it('resolves a brace range after a literal brace group', () => {
    const filenames = [1, 2, 3, 4].map((index) => `report-{draft}-${index}.md`);
    for (const filename of filenames) {
      fs.writeFileSync(path.join(tempDir, filename), 'content');
    }
    fs.writeFileSync(path.join(tempDir, 'report-draft-1.md'), 'other');

    const pattern = 'report-{draft}-{1..3}.md';
    expect(resolveArtifactOutputs(tempDir, pattern)).toEqual(
      filenames.slice(0, 3).map((filename) => canonical(path.join(tempDir, filename)))
    );
    expect(artifactOutputExists(tempDir, pattern)).toBe(true);
  });

  it.each([
    '{content/safe,other/deep}/review.md',
    String.raw`{content\safe,other\deep}\review.md`,
  ])('resolves confined cross-directory braces in %s', (pattern) => {
    const filePath = path.join(tempDir, 'content', 'safe', 'review.md');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'content');
    expect(resolveArtifactOutputs(tempDir, pattern)).toEqual([canonical(filePath)]);
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

  it('supports brace alternative glob patterns', () => {
    const apiPath = path.join(tempDir, 'review-api.md');
    const uiPath = path.join(tempDir, 'review-ui.md');
    fs.writeFileSync(apiPath, 'content');
    fs.writeFileSync(uiPath, 'content');

    expect(resolveArtifactOutputs(tempDir, 'review-{api,ui}.md')).toEqual([
      canonical(apiPath),
      canonical(uiPath),
    ]);
    expect(artifactOutputExists(tempDir, 'review-{api,ui}.md')).toBe(true);
  });

  it('resolves a brace glob with Windows-style separators', () => {
    const specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir);
    const apiPath = path.join(specsDir, 'review-api.md');
    const uiPath = path.join(specsDir, 'review-ui.md');
    fs.writeFileSync(apiPath, 'content');
    fs.writeFileSync(uiPath, 'content');

    expect(resolveArtifactOutputs(tempDir, String.raw`specs\review-{api,ui}.md`)).toEqual([
      canonical(apiPath),
      canonical(uiPath),
    ]);
  });

  it('supports brace range glob patterns', () => {
    const file1 = path.join(tempDir, 'file-1.md');
    const file2 = path.join(tempDir, 'file-2.md');
    const file4 = path.join(tempDir, 'file-4.md');
    fs.writeFileSync(file1, 'content');
    fs.writeFileSync(file2, 'content');
    fs.writeFileSync(file4, 'content');

    expect(resolveArtifactOutputs(tempDir, 'file-{1..3}.md')).toEqual([
      canonical(file1),
      canonical(file2),
    ]);
    expect(artifactOutputExists(tempDir, 'file-{1..3}.md')).toBe(true);
  });

  it.each(['@(proposal|design).md', '+(proposal|design).md'])('supports extglob %s', (pattern) => {
    const proposalPath = path.join(tempDir, 'proposal.md');
    fs.writeFileSync(proposalPath, 'content');
    fs.writeFileSync(path.join(tempDir, 'readme.md'), 'content');

    expect(resolveArtifactOutputs(tempDir, pattern)).toEqual([
      canonical(proposalPath),
    ]);
    expect(artifactOutputExists(tempDir, pattern)).toBe(true);
  });

  it('returns an empty list when dynamic brace or extglob pattern has no matches', () => {
    expect(resolveArtifactOutputs(tempDir, 'review-{api,ui}.md')).toEqual([]);
    expect(artifactOutputExists(tempDir, 'review-{api,ui}.md')).toBe(false);
    expect(resolveArtifactOutputs(tempDir, '@(proposal|design).md')).toEqual([]);
    expect(artifactOutputExists(tempDir, '@(proposal|design).md')).toBe(false);
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
