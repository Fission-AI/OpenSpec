import { describe, it, expect } from 'vitest';
import { ArtifactGraph } from '../../../src/core/artifact-graph/graph.js';
import type { SchemaYaml } from '../../../src/core/artifact-graph/types.js';

describe('artifact-graph/graph', () => {
  const createSchema = (artifacts: SchemaYaml['artifacts']): SchemaYaml => ({
    name: 'test',
    version: 1,
    artifacts,
  });

  describe('fromSchema', () => {
    it('should create graph from schema object', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
      ]);

      const graph = ArtifactGraph.fromSchema(schema);

      expect(graph.getName()).toBe('test');
      expect(graph.getVersion()).toBe(1);
    });
  });

  describe('fromYamlContent', () => {
    it('should create graph from YAML string', () => {
      const yaml = `
name: my-workflow
version: 2
artifacts:
  - id: doc
    generates: doc.md
    description: Documentation
    template: templates/doc.md
`;
      const graph = ArtifactGraph.fromYamlContent(yaml);

      expect(graph.getName()).toBe('my-workflow');
      expect(graph.getVersion()).toBe(2);
      expect(graph.getArtifact('doc')).toBeDefined();
    });
  });

  describe('getArtifact', () => {
    it('should return artifact by ID', () => {
      const schema = createSchema([
        { id: 'proposal', generates: 'proposal.md', description: 'Proposal', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      const artifact = graph.getArtifact('proposal');

      expect(artifact).toBeDefined();
      expect(artifact?.id).toBe('proposal');
      expect(artifact?.generates).toBe('proposal.md');
    });

    it('should return undefined for non-existent ID', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      expect(graph.getArtifact('nonexistent')).toBeUndefined();
    });
  });

  describe('getAllArtifacts', () => {
    it('should return all artifacts', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
        { id: 'B', generates: 'b.md', description: 'B', template: 't.md', requires: ['A'] },
        { id: 'C', generates: 'c.md', description: 'C', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      const artifacts = graph.getAllArtifacts();

      expect(artifacts).toHaveLength(3);
      expect(artifacts.map(a => a.id).sort()).toEqual(['A', 'B', 'C']);
    });
  });

  describe('getBuildOrder', () => {
    it('should return correct order for linear chain A → B → C', () => {
      const schema = createSchema([
        { id: 'C', generates: 'c.md', description: 'C', template: 't.md', requires: ['B'] },
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
        { id: 'B', generates: 'b.md', description: 'B', template: 't.md', requires: ['A'] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      const order = graph.getBuildOrder();

      expect(order).toEqual(['A', 'B', 'C']);
    });

    it('should handle diamond dependency correctly', () => {
      // A → B, A → C, B → D, C → D
      const schema = createSchema([
        { id: 'D', generates: 'd.md', description: 'D', template: 't.md', requires: ['B', 'C'] },
        { id: 'B', generates: 'b.md', description: 'B', template: 't.md', requires: ['A'] },
        { id: 'C', generates: 'c.md', description: 'C', template: 't.md', requires: ['A'] },
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      const order = graph.getBuildOrder();

      // A must come before B and C; D must come last
      expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
      expect(order.indexOf('A')).toBeLessThan(order.indexOf('C'));
      expect(order.indexOf('B')).toBeLessThan(order.indexOf('D'));
      expect(order.indexOf('C')).toBeLessThan(order.indexOf('D'));
    });

    it('should return independent artifacts in stable sorted order', () => {
      const schema = createSchema([
        { id: 'Z', generates: 'z.md', description: 'Z', template: 't.md', requires: [] },
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
        { id: 'M', generates: 'm.md', description: 'M', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      const order = graph.getBuildOrder();

      // All independent, should be sorted alphabetically for stability
      expect(order).toEqual(['A', 'M', 'Z']);
    });
  });

  describe('getNextArtifacts', () => {
    it('should return root artifacts when nothing completed', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
        { id: 'B', generates: 'b.md', description: 'B', template: 't.md', requires: ['A'] },
        { id: 'C', generates: 'c.md', description: 'C', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      const ready = graph.getNextArtifacts(new Set());

      expect(ready.sort()).toEqual(['A', 'C']);
    });

    it('should include artifact when all deps completed', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
        { id: 'B', generates: 'b.md', description: 'B', template: 't.md', requires: ['A'] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      const ready = graph.getNextArtifacts(new Set(['A']));

      expect(ready).toEqual(['B']);
    });

    it('should not include completed artifacts', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
        { id: 'B', generates: 'b.md', description: 'B', template: 't.md', requires: ['A'] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      const ready = graph.getNextArtifacts(new Set(['A', 'B']));

      expect(ready).toEqual([]);
    });

    it('should handle diamond dependency correctly', () => {
      // D requires B and C
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
        { id: 'B', generates: 'b.md', description: 'B', template: 't.md', requires: ['A'] },
        { id: 'C', generates: 'c.md', description: 'C', template: 't.md', requires: ['A'] },
        { id: 'D', generates: 'd.md', description: 'D', template: 't.md', requires: ['B', 'C'] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      // Only A completed - B and C ready, D not
      expect(graph.getNextArtifacts(new Set(['A'])).sort()).toEqual(['B', 'C']);

      // Only B completed (from deps) - C still needed for D
      expect(graph.getNextArtifacts(new Set(['A', 'B']))).toEqual(['C']);

      // Both B and C completed - D ready
      expect(graph.getNextArtifacts(new Set(['A', 'B', 'C']))).toEqual(['D']);
    });
  });

  describe('isComplete', () => {
    it('should return true when all artifacts completed', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
        { id: 'B', generates: 'b.md', description: 'B', template: 't.md', requires: ['A'] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      expect(graph.isComplete(new Set(['A', 'B']))).toBe(true);
    });

    it('should return false when some artifacts incomplete', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
        { id: 'B', generates: 'b.md', description: 'B', template: 't.md', requires: ['A'] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      expect(graph.isComplete(new Set(['A']))).toBe(false);
      expect(graph.isComplete(new Set())).toBe(false);
    });
  });

  describe('getBlocked', () => {
    it('should return empty object when nothing is blocked', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      expect(graph.getBlocked(new Set())).toEqual({});
    });

    it('should return artifact blocked by single dependency', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
        { id: 'B', generates: 'b.md', description: 'B', template: 't.md', requires: ['A'] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      expect(graph.getBlocked(new Set())).toEqual({ B: ['A'] });
    });

    it('should return artifact blocked by multiple dependencies', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
        { id: 'B', generates: 'b.md', description: 'B', template: 't.md', requires: [] },
        { id: 'C', generates: 'c.md', description: 'C', template: 't.md', requires: ['A', 'B'] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      // Neither A nor B completed
      expect(graph.getBlocked(new Set())).toEqual({ C: ['A', 'B'] });
    });

    it('should only list unmet dependencies', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
        { id: 'B', generates: 'b.md', description: 'B', template: 't.md', requires: [] },
        { id: 'C', generates: 'c.md', description: 'C', template: 't.md', requires: ['A', 'B'] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      // A completed, B not
      expect(graph.getBlocked(new Set(['A']))).toEqual({ C: ['B'] });
    });

    it('should not include completed artifacts', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
        { id: 'B', generates: 'b.md', description: 'B', template: 't.md', requires: ['A'] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      expect(graph.getBlocked(new Set(['A', 'B']))).toEqual({});
    });
  });
});
