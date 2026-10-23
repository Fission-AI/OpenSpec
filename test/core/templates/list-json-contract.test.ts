import { describe, expect, it } from 'vitest';

import {
  getBulkArchiveChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getExploreSkillTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxExploreCommandTemplate,
  getOpsxUpdateCommandTemplate,
  getUpdateChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { getCommandTemplates, getSkillTemplates } from '../../../src/core/shared/skill-generation.js';

describe('workflow list --json field usage', () => {
  it('does not invent schema labels in update and continue pickers', () => {
    const bodies = [
      getUpdateChangeSkillTemplate().instructions,
      getOpsxUpdateCommandTemplate().content,
      getContinueChangeSkillTemplate().instructions,
      getOpsxContinueCommandTemplate().content,
    ];

    for (const body of bodies) {
      const picker = body.slice(body.indexOf('1. **'), body.indexOf('2. **'));
      expect(picker).toContain('openspec list --json');
      expect(picker).toContain('- Change name');
      expect(picker).toContain('- Status');
      expect(picker).toContain('`lastModified`');
      expect(picker).not.toMatch(/schema/i);
      expect(picker).not.toContain('openspec status');

      const status = body.slice(body.indexOf('2. **'), body.indexOf('3. **'));
      expect(status).toContain('openspec status --change "<name>" --json');
      expect(status).toContain('`schemaName`');
    }
  });

  it('limits bulk archive selection to list fields', () => {
    const bodies = [
      getBulkArchiveChangeSkillTemplate().instructions,
      getOpsxBulkArchiveCommandTemplate().content,
    ];

    for (const body of bodies) {
      const picker = body.slice(body.indexOf('1. **'), body.indexOf('2. **'));
      expect(picker).toContain('Show each change name and task status from the list output');
      expect(picker).not.toMatch(/schema/i);
      expect(picker).not.toContain('openspec status');

      const status = body.slice(body.indexOf('2. **'), body.indexOf('3. **'));
      expect(status).toContain('openspec status --change "<name>" --json');
      expect(status).toContain('`schemaName`');
    }
  });

  it('does not claim explore receives schemas from list output', () => {
    const bodies = [
      getExploreSkillTemplate().instructions,
      getOpsxExploreCommandTemplate().content,
    ];

    for (const body of bodies) {
      expect(body).toContain('with their names and task status');
      expect(body).not.toContain('Their names, schemas, and status');
    }
  });

  // `openspec archive` applies all of a change's deltas or none. Keeping only
  // some of one change's deltas needs the sync workflow, which a custom
  // profile may not install; without it the workflow asks instead.
  it('routes a partly excluded change through sync only when sync is installed', () => {
    const variants = [
      [
        getSkillTemplates(['bulk-archive', 'sync']).find((entry) => entry.workflowId === 'bulk-archive')!.template.instructions,
        getSkillTemplates(['bulk-archive'])[0].template.instructions,
        '/opsx:sync',
      ],
      [
        getCommandTemplates(['bulk-archive', 'sync']).find((entry) => entry.id === 'bulk-archive')!.template.content,
        getCommandTemplates(['bulk-archive'])[0].template.content,
        '/opsx:sync',
      ],
    ] as const;

    for (const [withSync, withoutSync, workflow] of variants) {
      expect(withSync).toContain(workflow);
      expect(withSync).toContain('with only its included delta paths');
      expect(withoutSync).not.toContain(workflow);
      expect(withoutSync).toContain("`openspec archive` applies all of a change's delta specs or none");
      for (const body of [withSync, withoutSync]) {
        expect(body).toContain('openspec archive "<name>" --json --yes');
        expect(body).not.toContain('merge inline');
      }
    }
  });

  // Archive hands the merge to `openspec archive`, so it neither needs the
  // sync workflow nor asks the agent to merge by hand.
  it('archives through the CLI whether or not sync is installed', () => {
    const variants = [
      getSkillTemplates(['archive', 'sync']).find((entry) => entry.workflowId === 'archive')!.template.instructions,
      getSkillTemplates(['archive'])[0].template.instructions,
      getCommandTemplates(['archive', 'sync']).find((entry) => entry.id === 'archive')!.template.content,
      getCommandTemplates(['archive'])[0].template.content,
    ];

    for (const body of variants) {
      expect(body).toContain('openspec archive "<name>" --json');
      expect(body).toContain('openspec archive "<name>" --json --yes');
      // Sync is only the recovery when an ADDED requirement already exists.
      for (const line of body.split('\n').filter((l) => /\/opsx:sync|openspec-sync-specs/.test(l))) {
        expect(line).toContain('already exists');
      }
      expect(body).not.toContain('merge inline');
    }
  });
});
