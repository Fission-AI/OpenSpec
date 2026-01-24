import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { FileSystemUtils, removeMarkerBlock } from '../../src/utils/file-system.js';

describe('FileSystemUtils.updateFileWithMarkers', () => {
  let testDir: string;
  const START_MARKER = '<!-- OPENSPEC:START -->';
  const END_MARKER = '<!-- OPENSPEC:END -->';

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-marker-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('new file creation', () => {
    it('should create new file with markers and content', async () => {
      const filePath = path.join(testDir, 'new-file.md');
      const content = 'OpenSpec content';
      
      await FileSystemUtils.updateFileWithMarkers(
        filePath,
        content,
        START_MARKER,
        END_MARKER
      );
      
      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(`${START_MARKER}\n${content}\n${END_MARKER}`);
    });
  });

  describe('existing file without markers', () => {
    it('should prepend markers and content to existing file', async () => {
      const filePath = path.join(testDir, 'existing.md');
      const existingContent = '# Existing Content\nUser content here';
      await fs.writeFile(filePath, existingContent);
      
      const newContent = 'OpenSpec content';
      await FileSystemUtils.updateFileWithMarkers(
        filePath,
        newContent,
        START_MARKER,
        END_MARKER
      );
      
      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(
        `${START_MARKER}\n${newContent}\n${END_MARKER}\n\n${existingContent}`
      );
    });
  });

  describe('existing file with markers', () => {
    it('should replace content between markers', async () => {
      const filePath = path.join(testDir, 'with-markers.md');
      const beforeContent = '# Before\nSome content before';
      const oldManagedContent = 'Old OpenSpec content';
      const afterContent = '# After\nSome content after';
      
      const existingFile = `${beforeContent}\n${START_MARKER}\n${oldManagedContent}\n${END_MARKER}\n${afterContent}`;
      await fs.writeFile(filePath, existingFile);
      
      const newContent = 'New OpenSpec content';
      await FileSystemUtils.updateFileWithMarkers(
        filePath,
        newContent,
        START_MARKER,
        END_MARKER
      );
      
      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(
        `${beforeContent}\n${START_MARKER}\n${newContent}\n${END_MARKER}\n${afterContent}`
      );
    });

    it('should preserve content before and after markers', async () => {
      const filePath = path.join(testDir, 'preserve.md');
      const userContentBefore = '# User Content Before\nImportant user notes';
      const userContentAfter = '## User Content After\nMore user notes';
      
      const existingFile = `${userContentBefore}\n${START_MARKER}\nOld content\n${END_MARKER}\n${userContentAfter}`;
      await fs.writeFile(filePath, existingFile);
      
      const newContent = 'Updated content';
      await FileSystemUtils.updateFileWithMarkers(
        filePath,
        newContent,
        START_MARKER,
        END_MARKER
      );
      
      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toContain(userContentBefore);
      expect(result).toContain(userContentAfter);
      expect(result).toContain(newContent);
      expect(result).not.toContain('Old content');
    });

    it('should handle markers at the beginning of file', async () => {
      const filePath = path.join(testDir, 'markers-at-start.md');
      const afterContent = 'User content after markers';
      
      const existingFile = `${START_MARKER}\nOld content\n${END_MARKER}\n${afterContent}`;
      await fs.writeFile(filePath, existingFile);
      
      const newContent = 'New content';
      await FileSystemUtils.updateFileWithMarkers(
        filePath,
        newContent,
        START_MARKER,
        END_MARKER
      );
      
      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(`${START_MARKER}\n${newContent}\n${END_MARKER}\n${afterContent}`);
    });

    it('should handle markers at the end of file', async () => {
      const filePath = path.join(testDir, 'markers-at-end.md');
      const beforeContent = 'User content before markers';
      
      const existingFile = `${beforeContent}\n${START_MARKER}\nOld content\n${END_MARKER}`;
      await fs.writeFile(filePath, existingFile);
      
      const newContent = 'New content';
      await FileSystemUtils.updateFileWithMarkers(
        filePath,
        newContent,
        START_MARKER,
        END_MARKER
      );
      
      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(`${beforeContent}\n${START_MARKER}\n${newContent}\n${END_MARKER}`);
    });
  });

  describe('invalid marker states', () => {
    it('should throw error if only start marker exists', async () => {
      const filePath = path.join(testDir, 'invalid-start.md');
      const existingFile = `Some content\n${START_MARKER}\nManaged content\nNo end marker`;
      await fs.writeFile(filePath, existingFile);
      
      await expect(
        FileSystemUtils.updateFileWithMarkers(
          filePath,
          'New content',
          START_MARKER,
          END_MARKER
        )
      ).rejects.toThrow(/Invalid marker state/);
    });

    it('should throw error if only end marker exists', async () => {
      const filePath = path.join(testDir, 'invalid-end.md');
      const existingFile = `Some content\nNo start marker\nManaged content\n${END_MARKER}`;
      await fs.writeFile(filePath, existingFile);
      
      await expect(
        FileSystemUtils.updateFileWithMarkers(
          filePath,
          'New content',
          START_MARKER,
          END_MARKER
        )
      ).rejects.toThrow(/Invalid marker state/);
    });
  });

  describe('idempotency', () => {
    it('should produce same result when called multiple times with same content', async () => {
      const filePath = path.join(testDir, 'idempotent.md');
      const content = 'Consistent content';
      
      await FileSystemUtils.updateFileWithMarkers(
        filePath,
        content,
        START_MARKER,
        END_MARKER
      );
      
      const firstResult = await fs.readFile(filePath, 'utf-8');
      
      await FileSystemUtils.updateFileWithMarkers(
        filePath,
        content,
        START_MARKER,
        END_MARKER
      );
      
      const secondResult = await fs.readFile(filePath, 'utf-8');
      expect(secondResult).toBe(firstResult);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const filePath = path.join(testDir, 'empty-content.md');
      
      await FileSystemUtils.updateFileWithMarkers(
        filePath,
        '',
        START_MARKER,
        END_MARKER
      );
      
      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(`${START_MARKER}\n\n${END_MARKER}`);
    });

    it('should handle content with special characters', async () => {
      const filePath = path.join(testDir, 'special-chars.md');
      const content = '# Special chars: ${}[]()<>|\\`*_~';
      
      await FileSystemUtils.updateFileWithMarkers(
        filePath,
        content,
        START_MARKER,
        END_MARKER
      );
      
      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toContain(content);
    });

    it('should handle multi-line content', async () => {
      const filePath = path.join(testDir, 'multi-line.md');
      const content = `Line 1
Line 2
Line 3

Line 5 with gap`;
      
      await FileSystemUtils.updateFileWithMarkers(
        filePath,
        content,
        START_MARKER,
        END_MARKER
      );
      
      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toContain(content);
    });

    it('should ignore inline mentions of markers when updating content', async () => {
      const filePath = path.join(testDir, 'inline-mentions.md');
      const existingFile = `Intro referencing markers like ${START_MARKER} and ${END_MARKER} inside text.

${START_MARKER}
Original content
${END_MARKER}
`;

      await fs.writeFile(filePath, existingFile);

      await FileSystemUtils.updateFileWithMarkers(
        filePath,
        'Updated content',
        START_MARKER,
        END_MARKER
      );

      const firstResult = await fs.readFile(filePath, 'utf-8');
      expect(firstResult).toContain('Intro referencing markers like');
      expect(firstResult).toContain('Updated content');
      expect(firstResult.match(new RegExp(START_MARKER, 'g'))?.length).toBe(2);
      expect(firstResult.match(new RegExp(END_MARKER, 'g'))?.length).toBe(2);

      await FileSystemUtils.updateFileWithMarkers(
        filePath,
        'Updated content',
        START_MARKER,
        END_MARKER
      );

      const secondResult = await fs.readFile(filePath, 'utf-8');
      expect(secondResult).toBe(firstResult);
    });
  });
});

describe('removeMarkerBlock', () => {
  const START_MARKER = '<!-- OPENSPEC:START -->';
  const END_MARKER = '<!-- OPENSPEC:END -->';

  describe('basic removal', () => {
    it('should remove marker block and preserve content before', () => {
      const content = `User content before
${START_MARKER}
OpenSpec content
${END_MARKER}`;
      const result = removeMarkerBlock(content, START_MARKER, END_MARKER);
      expect(result).toBe('User content before\n');
      expect(result).not.toContain(START_MARKER);
      expect(result).not.toContain(END_MARKER);
    });

    it('should remove marker block and preserve content after', () => {
      const content = `${START_MARKER}
OpenSpec content
${END_MARKER}
User content after`;
      const result = removeMarkerBlock(content, START_MARKER, END_MARKER);
      expect(result).toBe('User content after\n');
    });

    it('should remove marker block and preserve content before and after', () => {
      const content = `User content before
${START_MARKER}
OpenSpec content
${END_MARKER}
User content after`;
      const result = removeMarkerBlock(content, START_MARKER, END_MARKER);
      expect(result).toContain('User content before');
      expect(result).toContain('User content after');
      expect(result).not.toContain(START_MARKER);
    });

    it('should return empty string when only markers remain', () => {
      const content = `${START_MARKER}
OpenSpec content
${END_MARKER}`;
      const result = removeMarkerBlock(content, START_MARKER, END_MARKER);
      expect(result).toBe('');
    });
  });

  describe('invalid states', () => {
    it('should return original content when markers are missing', () => {
      const content = 'Plain content without markers';
      const result = removeMarkerBlock(content, START_MARKER, END_MARKER);
      expect(result).toBe('Plain content without markers');
    });

    it('should return original content when only start marker exists', () => {
      const content = `${START_MARKER}
Content without end marker`;
      const result = removeMarkerBlock(content, START_MARKER, END_MARKER);
      expect(result).toContain(START_MARKER);
    });

    it('should return original content when only end marker exists', () => {
      const content = `Content without start marker
${END_MARKER}`;
      const result = removeMarkerBlock(content, START_MARKER, END_MARKER);
      expect(result).toContain(END_MARKER);
    });

    it('should return original content when markers are in wrong order', () => {
      const content = `${END_MARKER}
Content
${START_MARKER}`;
      const result = removeMarkerBlock(content, START_MARKER, END_MARKER);
      expect(result).toContain(END_MARKER);
      expect(result).toContain(START_MARKER);
    });
  });

  describe('whitespace handling', () => {
    it('should clean up double blank lines', () => {
      const content = `Line 1


${START_MARKER}
OpenSpec content
${END_MARKER}


Line 2`;
      const result = removeMarkerBlock(content, START_MARKER, END_MARKER);
      expect(result).not.toMatch(/\n{3,}/);
    });

    it('should handle markers with whitespace on same line', () => {
      const content = `User content
  ${START_MARKER}
OpenSpec content
  ${END_MARKER}
More content`;
      const result = removeMarkerBlock(content, START_MARKER, END_MARKER);
      expect(result).toContain('User content');
      expect(result).toContain('More content');
      expect(result).not.toContain(START_MARKER);
    });
  });

  describe('inline marker mentions', () => {
    it('should ignore inline mentions and only remove actual marker block', () => {
      const content = `Intro referencing markers like ${START_MARKER} and ${END_MARKER} inside text.

${START_MARKER}
Original content
${END_MARKER}
`;
      const result = removeMarkerBlock(content, START_MARKER, END_MARKER);
      // Inline mentions should be preserved
      expect(result).toContain('Intro referencing markers like');
      expect(result).toContain(`${START_MARKER} and ${END_MARKER} inside text`);
      // Original content between markers should be removed
      expect(result).not.toContain('Original content');
    });

    it('should handle multiple inline mentions before actual block', () => {
      const content = `The ${START_MARKER} marker starts a block.
The ${END_MARKER} marker ends it.
Here is the actual block:
${START_MARKER}
Managed content
${END_MARKER}
After block content`;
      const result = removeMarkerBlock(content, START_MARKER, END_MARKER);
      expect(result).toContain(`The ${START_MARKER} marker starts a block`);
      expect(result).toContain(`The ${END_MARKER} marker ends it`);
      expect(result).toContain('After block content');
      expect(result).not.toContain('Managed content');
    });
  });

  describe('shell markers', () => {
    const SHELL_START = '# OPENSPEC:START';
    const SHELL_END = '# OPENSPEC:END';

    it('should work with shell-style markers', () => {
      const content = `# User config
export PATH="/usr/local/bin:$PATH"

${SHELL_START}
# OpenSpec managed
alias openspec="npx openspec"
${SHELL_END}

# More user config
export EDITOR="vim"`;
      const result = removeMarkerBlock(content, SHELL_START, SHELL_END);
      expect(result).toContain('export PATH');
      expect(result).toContain('export EDITOR');
      expect(result).not.toContain('alias openspec');
      expect(result).not.toContain(SHELL_START);
    });
  });
});
