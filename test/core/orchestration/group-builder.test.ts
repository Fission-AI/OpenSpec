import { describe, it, expect } from 'vitest';
import { buildTaskGroups } from '../../../src/core/orchestration/group-builder.js';

describe('group-builder', () => {
  describe('buildTaskGroups', () => {
    it('should parse ## N. section headers into groups', () => {
      const content = `## 1. Backend Models

- [ ] 1.1 [domain: core] Create models
- [ ] 1.2 [domain: core] Add fields

## 2. Frontend Views

- [ ] 2.1 [domain: frontend] Create form view
- [ ] 2.2 [domain: frontend] Create list view
`;
      const groups = buildTaskGroups(content);

      expect(groups).toHaveLength(2);
      expect(groups[0].id).toBe(1);
      expect(groups[0].tasks).toEqual(['1.1', '1.2']);
      expect(groups[0].parallel).toBe(true);
      expect(groups[0].depends_on).toEqual([]);

      expect(groups[1].id).toBe(2);
      expect(groups[1].tasks).toEqual(['2.1', '2.2']);
      expect(groups[1].parallel).toBe(true);
      expect(groups[1].depends_on).toEqual([1]);
    });

    it('should create fallback group when no section headers exist', () => {
      const content = `- [ ] Create models
- [x] Add fields
- [ ] Write tests
`;
      const groups = buildTaskGroups(content);

      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe(0);
      expect(groups[0].tasks).toHaveLength(3);
      expect(groups[0].depends_on).toEqual([]);
    });

    it('should handle cross-platform line endings (\\r\\n)', () => {
      const content = '## 1. Group One\r\n- [ ] 1.1 Task A\r\n- [ ] 1.2 Task B\r\n\r\n## 2. Group Two\r\n- [ ] 2.1 Task C\r\n';
      const groups = buildTaskGroups(content);

      expect(groups).toHaveLength(2);
      expect(groups[0].tasks).toEqual(['1.1', '1.2']);
      expect(groups[1].tasks).toEqual(['2.1']);
    });

    it('should parse <!-- parallel-with: N --> to override depends_on', () => {
      const content = `## 1. Group One

- [ ] 1.1 Task A

## 2. Group Two <!-- parallel-with: 1 -->

- [ ] 2.1 Task B
`;
      const groups = buildTaskGroups(content);

      expect(groups).toHaveLength(2);
      expect(groups[0].depends_on).toEqual([]);
      expect(groups[1].depends_on).toEqual([]);
    });

    it('should parse <!-- parallel-with: N --> on separate line under header', () => {
      const content = `## 1. Group One

- [ ] 1.1 Task A

## 2. Group Two
<!-- parallel-with: 1 -->

- [ ] 2.1 Task B
`;
      const groups = buildTaskGroups(content);

      expect(groups).toHaveLength(2);
      expect(groups[1].depends_on).toEqual([]);
    });

    it('should handle multiple group numbers in parallel-with', () => {
      const content = `## 1. First

- [ ] 1.1 A

## 2. Second

- [ ] 2.1 B

## 3. Third <!-- parallel-with: 1, 2 -->

- [ ] 3.1 C
`;
      const groups = buildTaskGroups(content);

      expect(groups).toHaveLength(3);
      expect(groups[2].depends_on).toEqual([]);
    });

    it('should default depends_on to [N-1] for sequential groups', () => {
      const content = `## 0. Shared Contract

- [ ] 0.1 Types

## 1. CLI Engine

- [ ] 1.1 Group builder

## 2. Parallel Dispatch

- [ ] 2.1 Hook dispatcher
`;
      const groups = buildTaskGroups(content);

      expect(groups).toHaveLength(3);
      expect(groups[0].depends_on).toEqual([]);
      expect(groups[1].depends_on).toEqual([0]);
      expect(groups[2].depends_on).toEqual([1]);
    });

    it('should handle empty content', () => {
      const groups = buildTaskGroups('');
      expect(groups).toEqual([]);
    });

    it('should handle content with headers but no tasks', () => {
      const content = `## 1. Empty Group

Some description text here.

## 2. Also Empty

More text.
`;
      const groups = buildTaskGroups(content);

      expect(groups).toHaveLength(2);
      expect(groups[0].tasks).toEqual([]);
      expect(groups[1].tasks).toEqual([]);
    });

    it('should handle both * and - as list markers', () => {
      const content = `## 1. Mixed Markers

- [ ] 1.1 Dash task
* [ ] 1.2 Star task
`;
      const groups = buildTaskGroups(content);

      expect(groups).toHaveLength(1);
      expect(groups[0].tasks).toEqual(['1.1', '1.2']);
    });

    it('should handle completed tasks ([x] and [X])', () => {
      const content = `## 1. Tasks

- [x] 1.1 Done task
- [X] 1.2 Also done
- [ ] 1.3 Pending
`;
      const groups = buildTaskGroups(content);

      expect(groups[0].tasks).toEqual(['1.1', '1.2', '1.3']);
    });

    it('should use full description as task ID when no N.N pattern', () => {
      const content = `## 1. Tasks

- [ ] Create the models
- [ ] Add the views
`;
      const groups = buildTaskGroups(content);

      expect(groups[0].tasks).toEqual(['Create the models', 'Add the views']);
    });
  });
});
