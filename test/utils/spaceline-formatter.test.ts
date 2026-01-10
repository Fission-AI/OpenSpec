import { describe, it, expect } from 'vitest';
import {
  generateProgressBar,
  formatSpaceline,
  EMOJI,
  type ChangeData,
  type SpacelineStats,
} from '../../src/utils/spaceline-formatter.js';

describe('spaceline-formatter', () => {
  describe('EMOJI constants', () => {
    it('should have all required emoji constants', () => {
      expect(EMOJI.CHANGE).toBe('📝');
      expect(EMOJI.PROGRESS_FULL).toBe('█');
      expect(EMOJI.PROGRESS_EMPTY).toBe('░');
      expect(EMOJI.STATUS_IMPLEMENTATION).toBe('󰷫');
      expect(EMOJI.DELTA).toBe('✎');
      expect(EMOJI.OPEN).toBe('📋');
      expect(EMOJI.BRANCH).toBe('󰘬');
    });
  });

  describe('generateProgressBar', () => {
    it('should generate empty progress bar for 0%', () => {
      const result = generateProgressBar(0);
      expect(result).toBe('░░░░░░░░░░');
    });

    it('should generate full progress bar for 100%', () => {
      const result = generateProgressBar(100);
      expect(result).toBe('██████████');
    });

    it('should generate half-filled progress bar for 50%', () => {
      const result = generateProgressBar(50);
      expect(result).toBe('█████░░░░░');
    });

    it('should handle edge cases', () => {
      expect(generateProgressBar(-10)).toBe('░░░░░░░░░░');
      expect(generateProgressBar(150)).toBe('██████████');
      expect(generateProgressBar(25)).toBe('███░░░░░░░');
    });

    it('should support custom width', () => {
      const result = generateProgressBar(50, 5);
      expect(result).toBe('███░░');
    });
  });

  describe('formatSpaceline', () => {
    const defaultChangeData: ChangeData = {
      id: 'add-feature',
      title: 'Add new feature',
      completedTasks: 4,
      totalTasks: 7,
      deltaCount: 2,
    };

    const defaultStats: SpacelineStats = {
      git: {
        added: 5,
        removed: 2,
        branch: 'main',
      },
      openItems: 3,
    };

    it('should format a complete spaceline', () => {
      const lines = formatSpaceline(defaultChangeData, defaultStats);

      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('📝');
      expect(lines[0]).toContain('add-feature');
      expect(lines[0]).toContain('%');
      expect(lines[1]).toContain('󰷫');
      expect(lines[1]).toContain('Implementation');
      expect(lines[1]).toContain('(4/7)');
      expect(lines[1]).toContain('✎');
      expect(lines[1]).toContain('📋');
      expect(lines[1]).toContain('󰘬');
    });

    it('should show correct percentage', () => {
      const change: ChangeData = {
        ...defaultChangeData,
        completedTasks: 5,
        totalTasks: 10,
      };
      const lines = formatSpaceline(change, defaultStats);
      expect(lines[0]).toContain('50%');
    });

    it('should handle 0% when no tasks', () => {
      const change: ChangeData = {
        ...defaultChangeData,
        completedTasks: 0,
        totalTasks: 0,
      };
      const lines = formatSpaceline(change, defaultStats);
      expect(lines[0]).toContain('0%');
    });

    it('should handle 100% when all tasks complete', () => {
      const change: ChangeData = {
        ...defaultChangeData,
        completedTasks: 10,
        totalTasks: 10,
      };
      const lines = formatSpaceline(change, defaultStats);
      expect(lines[0]).toContain('100%');
    });

    it('should show Git stats when available', () => {
      const lines = formatSpaceline(defaultChangeData, defaultStats);
      expect(lines[1]).toContain('↑5');
      expect(lines[1]).toContain('↓2');
      expect(lines[1]).toContain('main');
    });

    it('should show (?) when Git stats unavailable', () => {
      const stats: SpacelineStats = {
        git: null,
        openItems: 3,
      };
      const lines = formatSpaceline(defaultChangeData, stats);
      expect(lines[1]).toContain('(?)');
    });

    it('should map change ID prefix to category', () => {
      const addChange = formatSpaceline(
        { ...defaultChangeData, id: 'add-auth' },
        defaultStats
      );
      expect(addChange[1]).toContain('Implementation');

      const updateChange = formatSpaceline(
        { ...defaultChangeData, id: 'update-api' },
        defaultStats
      );
      expect(updateChange[1]).toContain('Refactor');

      const removeChange = formatSpaceline(
        { ...defaultChangeData, id: 'remove-deprecated' },
        defaultStats
      );
      expect(removeChange[1]).toContain('Deprecation');
    });

    it('should default to Implementation for unknown prefixes', () => {
      const lines = formatSpaceline(
        { ...defaultChangeData, id: 'unknown-prefix-feature' },
        defaultStats
      );
      expect(lines[1]).toContain('Implementation');
    });

    it('should always show Git stats even when values are zero', () => {
      const stats: SpacelineStats = {
        git: { added: 0, removed: 0, branch: 'main' },
        openItems: 0,
      };
      const lines = formatSpaceline(defaultChangeData, stats);
      expect(lines[1]).toContain('↑0');
      expect(lines[1]).toContain('↓0');
    });

    it('should show Git stats with mixed values', () => {
      const stats: SpacelineStats = {
        git: { added: 3, removed: 0, branch: 'feature-branch' },
        openItems: 1,
      };
      const lines = formatSpaceline(defaultChangeData, stats);
      expect(lines[1]).toContain('↑3');
      expect(lines[1]).toContain('↓0');
    });
  });
});
