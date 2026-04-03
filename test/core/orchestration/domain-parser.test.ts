import { describe, it, expect } from 'vitest';
import { parseDomainTags, enrichGroupsWithDomains } from '../../../src/core/orchestration/domain-parser.js';
import { buildTaskGroups } from '../../../src/core/orchestration/group-builder.js';

describe('domain-parser', () => {
  describe('parseDomainTags', () => {
    it('should extract [domain: X] tags from task lines', () => {
      const content = `## 1. Core

- [ ] 1.1 [domain: core] Create types
- [ ] 1.2 [domain: core] Create builder
- [ ] 1.3 [domain: test] Write tests
`;
      const domains = parseDomainTags(content);

      expect(domains).toEqual({
        core: ['1.1', '1.2'],
        test: ['1.3'],
      });
    });

    it('should handle multiple domains across sections', () => {
      const content = `- [ ] 1.1 [domain: backend] Create model
- [ ] 1.2 [domain: frontend] Create view
- [ ] 1.3 [domain: backend] Add API
- [ ] 1.4 [domain: test] Write tests
`;
      const domains = parseDomainTags(content);

      expect(domains.backend).toEqual(['1.1', '1.3']);
      expect(domains.frontend).toEqual(['1.2']);
      expect(domains.test).toEqual(['1.4']);
    });

    it('should return empty object when no domain tags exist', () => {
      const content = `- [ ] Create models
- [ ] Add views
`;
      const domains = parseDomainTags(content);

      expect(domains).toEqual({});
    });

    it('should handle tasks without domain tags (skip them)', () => {
      const content = `- [ ] 1.1 [domain: core] Has domain
- [ ] 1.2 No domain here
- [ ] 1.3 [domain: test] Has domain too
`;
      const domains = parseDomainTags(content);

      expect(domains).toEqual({
        core: ['1.1'],
        test: ['1.3'],
      });
    });

    it('should handle domain tags with extra whitespace', () => {
      const content = `- [ ] 1.1 [domain:   core  ] With spaces
`;
      const domains = parseDomainTags(content);

      expect(domains).toEqual({ core: ['1.1'] });
    });

    it('should handle empty content', () => {
      expect(parseDomainTags('')).toEqual({});
    });

    it('should handle cross-platform line endings', () => {
      const content = '- [ ] 1.1 [domain: core] Task A\r\n- [ ] 1.2 [domain: test] Task B\r\n';
      const domains = parseDomainTags(content);

      expect(domains).toEqual({
        core: ['1.1'],
        test: ['1.2'],
      });
    });
  });

  describe('enrichGroupsWithDomains', () => {
    it('should add domains to task groups', () => {
      const content = `## 1. Core

- [ ] 1.1 [domain: core] Create types
- [ ] 1.2 [domain: test] Write tests

## 2. Views

- [ ] 2.1 [domain: frontend] Create form
`;
      const groups = buildTaskGroups(content);
      enrichGroupsWithDomains(groups, content);

      expect(groups[0].domains).toEqual({
        core: ['1.1'],
        test: ['1.2'],
      });
      expect(groups[1].domains).toEqual({
        frontend: ['2.1'],
      });
    });

    it('should not add domains field when no domain tags in group', () => {
      const content = `## 1. Tasks

- [ ] Create something
- [ ] Build something
`;
      const groups = buildTaskGroups(content);
      enrichGroupsWithDomains(groups, content);

      expect(groups[0].domains).toBeUndefined();
    });
  });
});
