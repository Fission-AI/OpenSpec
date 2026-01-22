import { describe, it, expect } from 'vitest';
import { generateCommand, generateCommands } from '../../../src/core/command-generation/generator.js';
import { claudeAdapter } from '../../../src/core/command-generation/adapters/claude.js';
import { cursorAdapter } from '../../../src/core/command-generation/adapters/cursor.js';
import type { CommandContent, ToolCommandAdapter } from '../../../src/core/command-generation/types.js';

describe('command-generation/generator', () => {
  const sampleContent: CommandContent = {
    id: 'explore',
    name: 'OpenSpec Explore',
    description: 'Enter explore mode',
    category: 'Workflow',
    tags: ['workflow'],
    body: 'Command body here.',
  };

  describe('generateCommand', () => {
    it('should generate command with path and content using Claude adapter', () => {
      const result = generateCommand(sampleContent, claudeAdapter);

      expect(result.path).toContain('.claude');
      expect(result.path).toContain('explore.md');
      expect(result.fileContent).toContain('name: OpenSpec Explore');
      expect(result.fileContent).toContain('Command body here.');
    });

    it('should generate command with path and content using Cursor adapter', () => {
      const result = generateCommand(sampleContent, cursorAdapter);

      expect(result.path).toContain('.cursor');
      expect(result.path).toContain('opsx-explore.md');
      expect(result.fileContent).toContain('name: /opsx-explore');
      expect(result.fileContent).toContain('id: opsx-explore');
      expect(result.fileContent).toContain('Command body here.');
    });

    it('should use command id for path', () => {
      const content: CommandContent = { ...sampleContent, id: 'custom-cmd' };
      const result = generateCommand(content, claudeAdapter);

      expect(result.path).toContain('custom-cmd.md');
    });

    it('should work with custom adapter', () => {
      const customAdapter: ToolCommandAdapter = {
        toolId: 'custom',
        getFilePath: (id) => `.custom/${id}.txt`,
        formatFile: (content) => `# ${content.name}\n\n${content.body}`,
      };

      const result = generateCommand(sampleContent, customAdapter);

      expect(result.path).toBe('.custom/explore.txt');
      expect(result.fileContent).toBe('# OpenSpec Explore\n\nCommand body here.');
    });
  });

  describe('generateCommands', () => {
    it('should generate multiple commands', () => {
      const contents: CommandContent[] = [
        { ...sampleContent, id: 'explore', name: 'Explore' },
        { ...sampleContent, id: 'new', name: 'New' },
        { ...sampleContent, id: 'apply', name: 'Apply' },
      ];

      const results = generateCommands(contents, claudeAdapter);

      expect(results).toHaveLength(3);
      expect(results[0].path).toContain('explore.md');
      expect(results[1].path).toContain('new.md');
      expect(results[2].path).toContain('apply.md');
    });

    it('should return empty array for empty input', () => {
      const results = generateCommands([], claudeAdapter);
      expect(results).toEqual([]);
    });

    it('should preserve order of input', () => {
      const contents: CommandContent[] = [
        { ...sampleContent, id: 'c', name: 'C' },
        { ...sampleContent, id: 'a', name: 'A' },
        { ...sampleContent, id: 'b', name: 'B' },
      ];

      const results = generateCommands(contents, claudeAdapter);

      expect(results[0].path).toContain('c.md');
      expect(results[1].path).toContain('a.md');
      expect(results[2].path).toContain('b.md');
    });

    it('should generate each command independently', () => {
      const contents: CommandContent[] = [
        { id: 'a', name: 'A', description: 'DA', category: 'C1', tags: ['t1'], body: 'B1' },
        { id: 'b', name: 'B', description: 'DB', category: 'C2', tags: ['t2'], body: 'B2' },
      ];

      const results = generateCommands(contents, claudeAdapter);

      expect(results[0].fileContent).toContain('name: A');
      expect(results[0].fileContent).toContain('B1');
      expect(results[0].fileContent).not.toContain('name: B');

      expect(results[1].fileContent).toContain('name: B');
      expect(results[1].fileContent).toContain('B2');
      expect(results[1].fileContent).not.toContain('name: A');
    });
  });
});
