import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { detectCompleted } from '../../../src/core/artifact-graph/state.js';
import { ArtifactGraph } from '../../../src/core/artifact-graph/graph.js';
import type { SchemaYaml } from '../../../src/core/artifact-graph/types.js';

describe('artifact-graph/state', () => {
  let tempDir: string;

  const createSchema = (artifacts: SchemaYaml['artifacts']): SchemaYaml => ({
    name: 'test',
    version: 1,
    artifacts,
  });

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-state-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectCompleted', () => {
    it('should return empty set when changeDir does not exist', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      const completed = detectCompleted(graph, '/nonexistent/path');

      expect(completed.size).toBe(0);
    });

    it('should return empty set when changeDir is empty', () => {
      const schema = createSchema([
        { id: 'A', generates: 'a.md', description: 'A', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      const completed = detectCompleted(graph, tempDir);

      expect(completed.size).toBe(0);
    });

    it('should mark artifact complete when file exists', () => {
      const schema = createSchema([
        { id: 'proposal', generates: 'proposal.md', description: 'Proposal', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      // Create the file
      fs.writeFileSync(path.join(tempDir, 'proposal.md'), 'content');

      const completed = detectCompleted(graph, tempDir);

      expect(completed.has('proposal')).toBe(true);
    });

    it('should not mark artifact complete when file does not exist', () => {
      const schema = createSchema([
        { id: 'proposal', generates: 'proposal.md', description: 'Proposal', template: 't.md', requires: [] },
        { id: 'design', generates: 'design.md', description: 'Design', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      // Only create proposal.md
      fs.writeFileSync(path.join(tempDir, 'proposal.md'), 'content');

      const completed = detectCompleted(graph, tempDir);

      expect(completed.has('proposal')).toBe(true);
      expect(completed.has('design')).toBe(false);
    });

    it('should handle nested paths', () => {
      const schema = createSchema([
        { id: 'nested', generates: 'docs/design.md', description: 'Nested', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      // Create nested directory and file
      fs.mkdirSync(path.join(tempDir, 'docs'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'docs', 'design.md'), 'content');

      const completed = detectCompleted(graph, tempDir);

      expect(completed.has('nested')).toBe(true);
    });

    it('should detect glob pattern as complete when files exist', () => {
      const schema = createSchema([
        { id: 'specs', generates: 'specs/*.md', description: 'Specs', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      // Create specs directory with files
      fs.mkdirSync(path.join(tempDir, 'specs'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'specs', 'feature-a.md'), 'content');
      fs.writeFileSync(path.join(tempDir, 'specs', 'feature-b.md'), 'content');

      const completed = detectCompleted(graph, tempDir);

      expect(completed.has('specs')).toBe(true);
    });

    it('should not mark glob pattern complete when directory is empty', () => {
      const schema = createSchema([
        { id: 'specs', generates: 'specs/*.md', description: 'Specs', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      // Create empty specs directory
      fs.mkdirSync(path.join(tempDir, 'specs'), { recursive: true });

      const completed = detectCompleted(graph, tempDir);

      expect(completed.has('specs')).toBe(false);
    });

    it('should not mark glob pattern complete when directory does not exist', () => {
      const schema = createSchema([
        { id: 'specs', generates: 'specs/*.md', description: 'Specs', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      const completed = detectCompleted(graph, tempDir);

      expect(completed.has('specs')).toBe(false);
    });

    it('should not mark glob pattern complete when only non-matching files exist', () => {
      const schema = createSchema([
        { id: 'specs', generates: 'specs/*.md', description: 'Specs', template: 't.md', requires: [] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      // Create specs directory with non-matching files
      fs.mkdirSync(path.join(tempDir, 'specs'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'specs', 'readme.txt'), 'content');

      const completed = detectCompleted(graph, tempDir);

      expect(completed.has('specs')).toBe(false);
    });

    it('should handle multiple artifacts with mixed completion', () => {
      const schema = createSchema([
        { id: 'proposal', generates: 'proposal.md', description: 'Proposal', template: 't.md', requires: [] },
        { id: 'specs', generates: 'specs/*.md', description: 'Specs', template: 't.md', requires: ['proposal'] },
        { id: 'design', generates: 'design.md', description: 'Design', template: 't.md', requires: ['proposal'] },
        { id: 'tasks', generates: 'tasks.md', description: 'Tasks', template: 't.md', requires: ['specs', 'design'] },
      ]);
      const graph = ArtifactGraph.fromSchema(schema);

      // Create some files
      fs.writeFileSync(path.join(tempDir, 'proposal.md'), 'content');
      fs.mkdirSync(path.join(tempDir, 'specs'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'specs', 'auth.md'), 'content');
      // design.md and tasks.md do not exist

      const completed = detectCompleted(graph, tempDir);

      expect(completed.has('proposal')).toBe(true);
      expect(completed.has('specs')).toBe(true);
      expect(completed.has('design')).toBe(false);
      expect(completed.has('tasks')).toBe(false);
    });
  });
});
