import { describe, it, expect } from 'vitest';
import { FileSystemUtils } from '../../src/utils/file-system.js';
import { OPENSPEC_MARKERS } from '../../src/core/config.js';

describe('FileSystemUtils.stripManagedBlock', () => {
  const { start, end } = OPENSPEC_MARKERS;

  it('should remove a single managed block', () => {
    const content = `Some user content before
${start}
Managed content to remove
${end}
Some user content after`;

    const result = FileSystemUtils.stripManagedBlock(content, start, end);

    expect(result).toBe('Some user content before\nSome user content after');
  });

  it('should remove multiple managed blocks', () => {
    const content = `First user content
${start}
First managed block
${end}
Middle user content
${start}
Second managed block
${end}
Last user content`;

    const result = FileSystemUtils.stripManagedBlock(content, start, end);

    expect(result).toBe('First user content\nMiddle user content\nLast user content');
  });

  it('should return empty string when only managed block exists', () => {
    const content = `${start}
Only managed content
${end}`;

    const result = FileSystemUtils.stripManagedBlock(content, start, end);

    expect(result).toBe('');
  });

  it('should preserve content when no markers present', () => {
    const content = 'Only user content, no markers';

    const result = FileSystemUtils.stripManagedBlock(content, start, end);

    expect(result).toBe('Only user content, no markers');
  });

  it('should handle content with only start marker', () => {
    const content = `User content
${start}
Incomplete block`;

    const result = FileSystemUtils.stripManagedBlock(content, start, end);

    // Should not remove anything if end marker is missing
    expect(result).toBe(content.trim());
  });

  it('should handle content with only end marker', () => {
    const content = `User content
${end}
More content`;

    const result = FileSystemUtils.stripManagedBlock(content, start, end);

    // Should not remove anything if start marker is missing
    expect(result).toBe(content.trim());
  });

  it('should handle markers with surrounding whitespace', () => {
    const content = `User content
  ${start}
  Managed content
  ${end}
More user content`;

    const result = FileSystemUtils.stripManagedBlock(content, start, end);

    expect(result).toBe('User content\nMore user content');
  });

  it('should handle empty content', () => {
    const content = '';

    const result = FileSystemUtils.stripManagedBlock(content, start, end);

    expect(result).toBe('');
  });

  it('should handle markers at start of file', () => {
    const content = `${start}
Managed content
${end}
User content`;

    const result = FileSystemUtils.stripManagedBlock(content, start, end);

    expect(result).toBe('User content');
  });

  it('should handle markers at end of file', () => {
    const content = `User content
${start}
Managed content
${end}`;

    const result = FileSystemUtils.stripManagedBlock(content, start, end);

    expect(result).toBe('User content');
  });

  it('should preserve newlines in user content', () => {
    const content = `Line 1

Line 3 with gap
${start}
Managed
${end}

Line after with gap`;

    const result = FileSystemUtils.stripManagedBlock(content, start, end);

    expect(result).toContain('Line 1\n\nLine 3 with gap');
    expect(result).toContain('Line after with gap');
  });
});
