import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveSchema } from '../../../src/core/artifact-graph/resolver.js';
import { ArtifactGraph } from '../../../src/core/artifact-graph/graph.js';
import { detectCompleted } from '../../../src/core/artifact-graph/state.js';
import type { BlockedArtifacts } from '../../../src/core/artifact-graph/types.js';

/**
 * Normalize BlockedArtifacts for comparison by sorting dependency arrays.
 * The order of unmet dependencies is not guaranteed, so we sort for stable assertions.
 */
function normalizeBlocked(blocked: BlockedArtifacts): BlockedArtifacts {
  const normalized: BlockedArtifacts = {};
  for (const [key, deps] of Object.entries(blocked)) {
    normalized[key] = [...deps].sort();
  }
  return normalized;
}

describe('dispec-driven schema integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-dispec-test-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('schema structure', () => {
    it('should resolve and have 6 artifacts', () => {
      const schema = resolveSchema('dispec-driven');
      const graph = ArtifactGraph.fromSchema(schema);

      expect(schema.name).toBe('dispec-driven');
      expect(schema.version).toBe(1);
      expect(graph.getAllArtifacts()).toHaveLength(6);
    });

    it('should have valid dependency chain with no cycles', () => {
      const schema = resolveSchema('dispec-driven');
      // fromSchema throws on cyclic dependencies
      const graph = ArtifactGraph.fromSchema(schema);
      expect(graph.getAllArtifacts()).toHaveLength(6);
    });

    it('should have correct build order', () => {
      const schema = resolveSchema('dispec-driven');
      const graph = ArtifactGraph.fromSchema(schema);
      const buildOrder = graph.getBuildOrder();

      // proposal must come before specs, design, tasks, dependencies, distribution
      const proposalIdx = buildOrder.indexOf('proposal');
      const specsIdx = buildOrder.indexOf('specs');
      const designIdx = buildOrder.indexOf('design');
      const tasksIdx = buildOrder.indexOf('tasks');
      const depsIdx = buildOrder.indexOf('dependencies');
      const distIdx = buildOrder.indexOf('distribution');

      expect(proposalIdx).toBeLessThan(specsIdx);
      expect(proposalIdx).toBeLessThan(designIdx);
      expect(specsIdx).toBeLessThan(tasksIdx);
      expect(designIdx).toBeLessThan(tasksIdx);
      expect(tasksIdx).toBeLessThan(depsIdx);
      expect(depsIdx).toBeLessThan(distIdx);
    });

    it('should require distribution for apply phase', () => {
      const schema = resolveSchema('dispec-driven');
      expect(schema.apply).toBeDefined();
      expect(schema.apply!.requires).toEqual(['distribution']);
    });

    it('should track tasks.md in apply phase', () => {
      const schema = resolveSchema('dispec-driven');
      expect(schema.apply!.tracks).toBe('tasks.md');
    });
  });

  describe('workflow progression', () => {
    it('should progress through complete workflow', () => {
      const schema = resolveSchema('dispec-driven');
      const graph = ArtifactGraph.fromSchema(schema);

      // 1. Initial state - nothing complete, only proposal is ready
      let completed = detectCompleted(graph, tempDir);
      expect(completed.size).toBe(0);
      expect(graph.getNextArtifacts(completed)).toEqual(['proposal']);
      expect(graph.isComplete(completed)).toBe(false);
      expect(normalizeBlocked(graph.getBlocked(completed))).toEqual({
        specs: ['proposal'],
        design: ['proposal'],
        tasks: ['design', 'specs'],
        dependencies: ['tasks'],
        distribution: ['dependencies'],
      });

      // 2. Create proposal.md - specs and design become ready
      fs.writeFileSync(path.join(tempDir, 'proposal.md'), '# Proposal');
      completed = detectCompleted(graph, tempDir);
      expect(completed).toEqual(new Set(['proposal']));
      expect(graph.getNextArtifacts(completed).sort()).toEqual(['design', 'specs']);

      // 3. Create design.md
      fs.writeFileSync(path.join(tempDir, 'design.md'), '# Design');
      completed = detectCompleted(graph, tempDir);
      expect(completed).toEqual(new Set(['proposal', 'design']));
      expect(graph.getNextArtifacts(completed)).toEqual(['specs']);

      // 4. Create specs
      const specsDir = path.join(tempDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'feature.md'), '# Spec');
      completed = detectCompleted(graph, tempDir);
      expect(completed).toEqual(new Set(['proposal', 'design', 'specs']));
      expect(graph.getNextArtifacts(completed)).toEqual(['tasks']);

      // 5. Create tasks.md - dependencies becomes ready
      fs.writeFileSync(path.join(tempDir, 'tasks.md'), '# Tasks\n- [ ] 1.1 Do something');
      completed = detectCompleted(graph, tempDir);
      expect(completed).toEqual(new Set(['proposal', 'design', 'specs', 'tasks']));
      expect(graph.getNextArtifacts(completed)).toEqual(['dependencies']);

      // 6. Create dependencies.md - distribution becomes ready
      fs.writeFileSync(path.join(tempDir, 'dependencies.md'), '# Dependencies');
      completed = detectCompleted(graph, tempDir);
      expect(completed).toEqual(new Set(['proposal', 'design', 'specs', 'tasks', 'dependencies']));
      expect(graph.getNextArtifacts(completed)).toEqual(['distribution']);

      // 7. Create distribution.md - workflow complete
      fs.writeFileSync(path.join(tempDir, 'distribution.md'), '# Distribution');
      completed = detectCompleted(graph, tempDir);
      expect(completed).toEqual(new Set(['proposal', 'design', 'specs', 'tasks', 'dependencies', 'distribution']));
      expect(graph.getNextArtifacts(completed)).toEqual([]);
      expect(graph.isComplete(completed)).toBe(true);
      expect(graph.getBlocked(completed)).toEqual({});
    });
  });

  describe('build order consistency', () => {
    it('should return consistent build order across multiple calls', () => {
      const schema = resolveSchema('dispec-driven');
      const graph = ArtifactGraph.fromSchema(schema);

      const order1 = graph.getBuildOrder();
      const order2 = graph.getBuildOrder();
      const order3 = graph.getBuildOrder();

      expect(order1).toEqual(order2);
      expect(order2).toEqual(order3);
    });
  });
});
