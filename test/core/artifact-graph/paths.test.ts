import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { resolveArtifactBaseDir } from '../../../src/core/artifact-graph/paths.js';

describe('artifact-graph/paths', () => {
  describe('resolveArtifactBaseDir', () => {
    const projectRoot = path.resolve('/repo');
    const changeDir = path.join(projectRoot, 'openspec', 'changes', 'my-change');

    it('returns changeDir when folder is unset', () => {
      expect(resolveArtifactBaseDir({ folder: undefined }, changeDir)).toBe(changeDir);
    });

    it('returns project-root-relative path for a simple folder', () => {
      expect(resolveArtifactBaseDir({ folder: 'ADR' }, changeDir)).toBe(
        path.join(projectRoot, 'ADR')
      );
    });

    it('returns project-root-relative path for a nested folder', () => {
      expect(resolveArtifactBaseDir({ folder: 'docs/decisions' }, changeDir)).toBe(
        path.join(projectRoot, 'docs', 'decisions')
      );
    });

    it('derives project root from a deeper changeDir', () => {
      const deeperRoot = path.resolve('/some/work/area');
      const deeperChangeDir = path.join(deeperRoot, 'openspec', 'changes', 'feature-x');

      expect(resolveArtifactBaseDir({ folder: 'ADR' }, deeperChangeDir)).toBe(
        path.join(deeperRoot, 'ADR')
      );
    });
  });
});
