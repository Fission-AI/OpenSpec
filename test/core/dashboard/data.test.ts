import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  getChangesData,
  getSpecsData,
  getArchiveData,
  getSummary,
  getArtifactContent,
} from '../../../src/core/dashboard/data.js';

describe('Dashboard data module', () => {
  let tempDir: string;
  let openspecDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-dashboard-data-test-${Date.now()}`);
    openspecDir = path.join(tempDir, 'openspec');
    await fs.mkdir(openspecDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('getChangesData', () => {
    it('returns empty array when changes directory is missing', async () => {
      const result = await getChangesData(openspecDir);
      expect(result).toEqual([]);
    });

    it('categorizes changes by task status', async () => {
      const changesDir = path.join(openspecDir, 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      // Draft: no tasks.md
      await fs.mkdir(path.join(changesDir, 'draft-change'));

      // Active: incomplete tasks
      await fs.mkdir(path.join(changesDir, 'active-change'));
      await fs.writeFile(
        path.join(changesDir, 'active-change', 'tasks.md'),
        '- [x] Done\n- [ ] Not done\n'
      );

      // Completed: all tasks done
      await fs.mkdir(path.join(changesDir, 'completed-change'));
      await fs.writeFile(
        path.join(changesDir, 'completed-change', 'tasks.md'),
        '- [x] Done\n- [x] Also done\n'
      );

      const result = await getChangesData(openspecDir);

      const draft = result.filter((c) => c.status === 'draft');
      const active = result.filter((c) => c.status === 'active');
      const completed = result.filter((c) => c.status === 'completed');

      expect(draft).toHaveLength(1);
      expect(draft[0].name).toBe('draft-change');

      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('active-change');
      expect(active[0].progress).toEqual({ total: 2, completed: 1 });

      expect(completed).toHaveLength(1);
      expect(completed[0].name).toBe('completed-change');
    });

    it('detects artifact existence', async () => {
      const changesDir = path.join(openspecDir, 'changes');
      const changeDir = path.join(changesDir, 'test-change');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Proposal');
      await fs.mkdir(path.join(changeDir, 'specs'));
      await fs.writeFile(path.join(changeDir, 'design.md'), '# Design');
      // No tasks.md

      const result = await getChangesData(openspecDir);
      expect(result[0].artifacts).toEqual({
        proposal: true,
        specs: true,
        design: true,
        tasks: false,
      });
    });

    it('skips archive directory and hidden directories', async () => {
      const changesDir = path.join(openspecDir, 'changes');
      await fs.mkdir(path.join(changesDir, 'archive'), { recursive: true });
      await fs.mkdir(path.join(changesDir, '.hidden'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'real-change'), { recursive: true });

      const result = await getChangesData(openspecDir);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('real-change');
    });
  });

  describe('getSpecsData', () => {
    it('returns empty array when specs directory is missing', async () => {
      const result = await getSpecsData(openspecDir);
      expect(result).toEqual([]);
    });

    it('groups specs by domain prefix', async () => {
      const specsDir = path.join(openspecDir, 'specs');

      // Create specs with domain prefixes
      for (const name of ['cli-init', 'cli-view', 'docs-format', 'standalone']) {
        const specDir = path.join(specsDir, name);
        await fs.mkdir(specDir, { recursive: true });
        await fs.writeFile(
          path.join(specDir, 'spec.md'),
          '## Purpose\nTest spec\n\n## Requirements\n\n### Requirement: Test\nSome requirement\n'
        );
      }

      const result = await getSpecsData(openspecDir);

      expect(result).toHaveLength(3); // cli, docs, standalone
      expect(result.map((g) => g.domain)).toEqual(['cli', 'docs', 'standalone']);

      const cliGroup = result.find((g) => g.domain === 'cli')!;
      expect(cliGroup.specs).toHaveLength(2);
      expect(cliGroup.specs.map((s) => s.name)).toEqual(['cli-init', 'cli-view']);
    });

    it('sorts domains and specs alphabetically', async () => {
      const specsDir = path.join(openspecDir, 'specs');

      for (const name of ['z-spec', 'a-spec', 'a-other']) {
        const specDir = path.join(specsDir, name);
        await fs.mkdir(specDir, { recursive: true });
        await fs.writeFile(
          path.join(specDir, 'spec.md'),
          '## Purpose\nTest\n\n## Requirements\n\n### Requirement: R1\nReq\n'
        );
      }

      const result = await getSpecsData(openspecDir);
      expect(result.map((g) => g.domain)).toEqual(['a', 'z']);
      const aGroup = result[0];
      expect(aGroup.specs.map((s) => s.name)).toEqual(['a-other', 'a-spec']);
    });
  });

  describe('getArchiveData', () => {
    it('returns empty when archive directory is missing', async () => {
      const result = await getArchiveData(openspecDir);
      expect(result).toEqual({ entries: [], total: 0 });
    });

    it('parses dates from YYYY-MM-DD-name format', async () => {
      const archiveDir = path.join(openspecDir, 'changes', 'archive');
      await fs.mkdir(path.join(archiveDir, '2024-06-15-auth-refactor'), { recursive: true });
      await fs.mkdir(path.join(archiveDir, '2024-07-01-new-feature'), { recursive: true });

      const result = await getArchiveData(openspecDir);
      expect(result.total).toBe(2);
      // Reverse chronological order
      expect(result.entries[0].date).toBe('2024-07-01');
      expect(result.entries[0].changeName).toBe('new-feature');
      expect(result.entries[1].date).toBe('2024-06-15');
      expect(result.entries[1].changeName).toBe('auth-refactor');
    });

    it('supports pagination with limit and offset', async () => {
      const archiveDir = path.join(openspecDir, 'changes', 'archive');
      for (let i = 1; i <= 5; i++) {
        await fs.mkdir(path.join(archiveDir, `2024-01-0${i}-change-${i}`), { recursive: true });
      }

      const page1 = await getArchiveData(openspecDir, 2, 0);
      expect(page1.total).toBe(5);
      expect(page1.entries).toHaveLength(2);

      const page2 = await getArchiveData(openspecDir, 2, 2);
      expect(page2.entries).toHaveLength(2);

      const page3 = await getArchiveData(openspecDir, 2, 4);
      expect(page3.entries).toHaveLength(1);
    });
  });

  describe('getArtifactContent', () => {
    it('returns rendered HTML for markdown files', async () => {
      const changesDir = path.join(openspecDir, 'changes', 'test');
      await fs.mkdir(changesDir, { recursive: true });
      await fs.writeFile(path.join(changesDir, 'proposal.md'), '# Hello\n\nWorld');

      const result = await getArtifactContent(openspecDir, 'changes/test/proposal.md');
      expect('html' in result).toBe(true);
      if ('html' in result) {
        expect(result.html).toContain('<h1>Hello</h1>');
        expect(result.html).toContain('<p>World</p>');
      }
    });

    it('blocks path traversal attempts', async () => {
      const result = await getArtifactContent(openspecDir, '../../../etc/passwd');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.status).toBe(403);
      }
    });

    it('blocks non-markdown file requests', async () => {
      const result = await getArtifactContent(openspecDir, 'changes/test/secret.json');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.status).toBe(403);
      }
    });

    it('returns 404 for missing files', async () => {
      const result = await getArtifactContent(openspecDir, 'changes/nonexistent/proposal.md');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.status).toBe(404);
      }
    });

    it('allows .yaml files', async () => {
      await fs.writeFile(path.join(openspecDir, 'config.yaml'), 'key: value');
      const result = await getArtifactContent(openspecDir, 'config.yaml');
      expect('html' in result).toBe(true);
      if ('html' in result) {
        expect(result.html).toContain('key: value');
      }
    });
  });

  describe('getSummary', () => {
    it('aggregates counts correctly', async () => {
      const changesDir = path.join(openspecDir, 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      // 1 draft, 1 active, 1 completed
      await fs.mkdir(path.join(changesDir, 'draft'));
      await fs.mkdir(path.join(changesDir, 'active'));
      await fs.writeFile(path.join(changesDir, 'active', 'tasks.md'), '- [ ] Todo\n');
      await fs.mkdir(path.join(changesDir, 'done'));
      await fs.writeFile(path.join(changesDir, 'done', 'tasks.md'), '- [x] Done\n');

      const summary = await getSummary(openspecDir);
      expect(summary.changes.draft).toBe(1);
      expect(summary.changes.active).toBe(1);
      expect(summary.changes.completed).toBe(1);
      expect(summary.changes.total).toBe(3);
    });
  });
});
