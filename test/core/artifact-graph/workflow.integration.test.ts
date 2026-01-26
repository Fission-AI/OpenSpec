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

describe('artifact-graph workflow integration', () => {
  let tempDir: string;

  beforeEach(() => {
    // Use a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workflow-test-'));
  });

  afterEach(() => {
    // Clean up temp directory after each test
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('spec-driven workflow', () => {
    it('should progress through complete workflow', () => {
      // 1. Resolve the real built-in schema
      const schema = resolveSchema('spec-driven');
      const graph = ArtifactGraph.fromSchema(schema);

      // Verify schema structure
      expect(graph.getName()).toBe('spec-driven');
      expect(graph.getAllArtifacts()).toHaveLength(4);

      // 2. Initial state - nothing complete, only proposal is ready
      let completed = detectCompleted(graph, tempDir);
      expect(completed.size).toBe(0);
      expect(graph.getNextArtifacts(completed)).toEqual(['proposal']);
      expect(graph.isComplete(completed)).toBe(false);
      expect(normalizeBlocked(graph.getBlocked(completed))).toEqual({
        specs: ['proposal'],
        design: ['proposal'],
        tasks: ['design', 'specs'],
      });

      // 3. Create proposal.md - now specs and design become ready
      fs.writeFileSync(path.join(tempDir, 'proposal.md'), '# Proposal\n\nInitial proposal content.');
      completed = detectCompleted(graph, tempDir);
      expect(completed).toEqual(new Set(['proposal']));
      expect(graph.getNextArtifacts(completed).sort()).toEqual(['design', 'specs']);
      expect(normalizeBlocked(graph.getBlocked(completed))).toEqual({
        tasks: ['design', 'specs'],
      });

      // 4. Create design.md - specs still needed for tasks
      fs.writeFileSync(path.join(tempDir, 'design.md'), '# Design\n\nTechnical design content.');
      completed = detectCompleted(graph, tempDir);
      expect(completed).toEqual(new Set(['proposal', 'design']));
      expect(graph.getNextArtifacts(completed)).toEqual(['specs']);
      expect(graph.getBlocked(completed)).toEqual({
        tasks: ['specs'],
      });

      // 5. Create specs directory with a spec file - tasks becomes ready
      const specsDir = path.join(tempDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'feature-auth.md'), '# Auth Spec\n\nAuthentication specification.');
      completed = detectCompleted(graph, tempDir);
      expect(completed).toEqual(new Set(['proposal', 'design', 'specs']));
      expect(graph.getNextArtifacts(completed)).toEqual(['tasks']);
      expect(graph.getBlocked(completed)).toEqual({});

      // 6. Create tasks.md - workflow complete
      fs.writeFileSync(path.join(tempDir, 'tasks.md'), '# Tasks\n\n- [ ] Implement feature');
      completed = detectCompleted(graph, tempDir);
      expect(completed).toEqual(new Set(['proposal', 'design', 'specs', 'tasks']));
      expect(graph.getNextArtifacts(completed)).toEqual([]);
      expect(graph.isComplete(completed)).toBe(true);
      expect(graph.getBlocked(completed)).toEqual({});
    });

    it('should handle out-of-order file creation', () => {
      const schema = resolveSchema('spec-driven');
      const graph = ArtifactGraph.fromSchema(schema);

      // Create files in wrong order - design before proposal
      fs.writeFileSync(path.join(tempDir, 'design.md'), '# Design');

      let completed = detectCompleted(graph, tempDir);
      // design file exists but it's still marked complete (filesystem-based)
      expect(completed).toEqual(new Set(['design']));
      // proposal is still the only "ready" artifact since it has no deps
      expect(graph.getNextArtifacts(completed)).toEqual(['proposal']);

      // Now create proposal
      fs.writeFileSync(path.join(tempDir, 'proposal.md'), '# Proposal');
      completed = detectCompleted(graph, tempDir);
      expect(completed).toEqual(new Set(['proposal', 'design']));
      // specs is the only thing ready now (design already done)
      expect(graph.getNextArtifacts(completed)).toEqual(['specs']);
    });

    it('should handle multiple spec files in glob pattern', () => {
      const schema = resolveSchema('spec-driven');
      const graph = ArtifactGraph.fromSchema(schema);

      // Complete prerequisites
      fs.writeFileSync(path.join(tempDir, 'proposal.md'), '# Proposal');

      // Create specs directory with multiple files
      const specsDir = path.join(tempDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'auth.md'), '# Auth');
      fs.writeFileSync(path.join(specsDir, 'api.md'), '# API');
      fs.writeFileSync(path.join(specsDir, 'database.md'), '# Database');

      const completed = detectCompleted(graph, tempDir);
      expect(completed.has('specs')).toBe(true);
    });
  });

  describe('build order consistency', () => {
    it('should return consistent build order across multiple calls', () => {
      const schema = resolveSchema('spec-driven');
      const graph = ArtifactGraph.fromSchema(schema);

      const order1 = graph.getBuildOrder();
      const order2 = graph.getBuildOrder();
      const order3 = graph.getBuildOrder();

      expect(order1).toEqual(order2);
      expect(order2).toEqual(order3);
    });
  });

  describe('empty and edge cases', () => {
    it('should handle empty change directory gracefully', () => {
      const schema = resolveSchema('spec-driven');
      const graph = ArtifactGraph.fromSchema(schema);

      // Directory exists but is empty
      const completed = detectCompleted(graph, tempDir);
      expect(completed.size).toBe(0);
      expect(graph.getNextArtifacts(completed)).toEqual(['proposal']);
    });

    it('should handle non-existent change directory', () => {
      const schema = resolveSchema('spec-driven');
      const graph = ArtifactGraph.fromSchema(schema);

      const nonExistentDir = path.join(tempDir, 'does-not-exist');
      const completed = detectCompleted(graph, nonExistentDir);
      expect(completed.size).toBe(0);
    });

    it('should not count non-matching files in glob directories', () => {
      const schema = resolveSchema('spec-driven');
      const graph = ArtifactGraph.fromSchema(schema);

      // Create specs directory with wrong file types
      const specsDir = path.join(tempDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'notes.txt'), 'not a markdown file');
      fs.writeFileSync(path.join(specsDir, 'data.json'), '{}');

      const completed = detectCompleted(graph, tempDir);
      expect(completed.has('specs')).toBe(false);
    });
  });
});
