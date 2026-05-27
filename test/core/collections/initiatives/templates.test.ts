import { describe, expect, it } from 'vitest';

import {
  INITIATIVE_MARKDOWN_FILE_NAMES,
  buildDefaultInitiativeFiles,
  buildInitiativeDecisionsTemplate,
  buildInitiativeDesignTemplate,
  buildInitiativeQuestionsTemplate,
  buildInitiativeRequirementsTemplate,
  buildInitiativeTasksTemplate,
  type InitiativeState,
} from '../../../../src/core/collections/initiatives/index.js';

describe('initiative templates', () => {
  const state: InitiativeState = {
    version: 1,
    id: 'launch-billing-flow',
    title: 'Launch Billing Flow',
    summary: 'Coordinate billing launch across product, API, and client surfaces.',
    status: 'exploring',
    created: '2026-05-21',
    owners: [],
    metadata: {},
  };

  it('builds the default markdown files in the initiative file order', () => {
    const files = buildDefaultInitiativeFiles(state);

    expect(files.map((file) => file.fileName)).toEqual(INITIATIVE_MARKDOWN_FILE_NAMES);
    expect(files.map((file) => file.fileName)).not.toContain('links.yaml');
    for (const file of files) {
      expect(file.content.endsWith('\n')).toBe(true);
      expect(file.content).toMatch(/^# /u);
    }
  });

  it('builds requirements content from initiative intent', () => {
    const content = buildInitiativeRequirementsTemplate(state);

    expect(content).toContain('# Requirements');
    expect(content).toContain('## Product Intent');
    expect(content).toContain(state.summary);
    expect(content).toContain('## Accepted Requirements');
    expect(content).toContain('## Out Of Scope');
  });

  it('builds design content for coordination context', () => {
    const content = buildInitiativeDesignTemplate(state);

    expect(content).toContain('# Design');
    expect(content).toContain('## Context');
    expect(content).toContain('## Approach');
    expect(content).toContain('## Affected Areas');
    expect(content).toContain('## Dependencies');
    expect(content).toContain('## Risks');
  });

  it('builds decisions content with date and title context', () => {
    const content = buildInitiativeDecisionsTemplate(state);

    expect(content).toContain('# Decisions');
    expect(content).toContain(`### ${state.created}: ${state.title}`);
    expect(content).toContain('- Decision: TBD');
    expect(content).toContain('- Why: TBD');
    expect(content).toContain('- Implications: TBD');
  });

  it('builds questions and coordination tasks content', () => {
    expect(buildInitiativeQuestionsTemplate()).toContain('## Open Questions');
    expect(buildInitiativeQuestionsTemplate()).toContain('## Resolved Questions');
    expect(buildInitiativeTasksTemplate()).toContain('## Coordination Tasks');
    expect(buildInitiativeTasksTemplate()).toContain('- [ ] TBD');
  });
});
