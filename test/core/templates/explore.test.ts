import { describe, expect, it } from 'vitest';

import {
  getExploreSkillTemplate,
  getOpsxExploreCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';

const skill = getExploreSkillTemplate();
const command = getOpsxExploreCommandTemplate();

// Both delivery surfaces must carry the same contract; every behavioral
// assertion below runs against each body.
const bodies: Array<[string, string]> = [
  ['skill', skill.instructions],
  ['command', command.content],
];

describe('explore templates', () => {
  // Regression for #696: explore never loaded the project's declared
  // context, so it reasoned without the tech stack, conventions, and
  // rules every artifact-creating workflow already receives.
  it('loads project context from the OpenSpec config at startup (#696)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('openspec/config.yaml');
      expect(body, label).toContain('`context`: project background');
      expect(body, label).toContain('`rules`: keyed by artifact id');
    }
  });

  it('resolves the config through the reported root rather than assuming a repo-local path (#696)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('openspec list --json');
      expect(body, label).toContain('<root.path>/openspec/config.yaml');
      expect(body, label).toContain('root.path');
    }
  });

  // resolveConfigFilePath() probes config.yaml then config.yml, and
  // `openspec init` leaves a .yml project on .yml forever - naming only
  // .yaml would silently skip context for those projects.
  it('accepts config.yml as well as config.yaml (#696)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('config.yml');
      expect(body, label).toContain('skip this if neither file exists');
    }
  });

  // `rules` is Record<artifactId, string[]>; explore holds no artifact at
  // startup, so the guidance must not invite blanket application.
  it('scopes rules to the artifact they are keyed to (#696)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        'the entries for an artifact apply only when you write that artifact'
      );
    }
  });

  // House style across instructions.ts and the sibling workflow templates
  // forbids leaking context/rules into the artifact, not just the chat.
  it('treats project context as constraints that must not leak into output (#696)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('constraints for you to follow');
      expect(body, label).toContain(
        'do NOT copy them into the conversation or into any artifact you create'
      );
    }
  });

  it('scaffolds a new change before capturing exploration artifacts (#668, #720)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('openspec new change "<name>"');
      expect(body, label).toContain(
        'Never create a new change directory under `openspec/changes/` by hand'
      );
      expect(body, label).toContain('`.openspec.yaml`');
      expect(body, label).not.toContain(
        'Never create files or directories directly under `openspec/changes/`'
      );
    }
  });

  it('continues an accepted transition through the requested artifact (#668)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('openspec status --change "<name>" --json');
      expect(body, label).toContain(
        'openspec instructions "<artifact-id>" --change "<name>" --json'
      );
      expect(body, label).toContain('Capture the artifact(s) the user requested');
      expect(body, label).toContain('without asking them to invoke another workflow command');
      expect(body, label).toContain('process the requested artifacts in dependency order');
      expect(body, label).toContain(
        'After creating each artifact, re-run `openspec status --change "<name>" --json`'
      );
      expect(body, label).toContain(
        'If the instruction delegates creation to a specific skill or command'
      );
      expect(body, label).toContain('Verify that the selected concrete output exists');
    }
  });

  it('keeps the scaffold requirement at the new-change transition (#720)', () => {
    for (const [label, body] of bodies) {
      const noChange = body.indexOf('### When no change exists');
      const existingChange = body.indexOf('### When a change exists');
      const scaffold = body.indexOf('openspec new change "<name>"');

      expect(noChange, label).toBeGreaterThanOrEqual(0);
      expect(existingChange, label).toBeGreaterThan(noChange);
      expect(scaffold, label).toBeGreaterThan(noChange);
      expect(scaffold, label).toBeLessThan(existingChange);
    }
  });
});
