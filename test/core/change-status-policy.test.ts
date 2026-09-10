import { describe, expect, it } from 'vitest';

import {
  buildNextSteps,
  resolveNextStep,
  type ChangeNextStepsInput,
  type ChangeStatusPolicyArtifact,
} from '../../src/core/change-status-policy.js';

/**
 * `resolveNextStep` is the single source for the one command that moves a
 * change forward. Two surfaces render it: the JSON `nextSteps` sentence
 * (a published agent contract) and the text `Next:` line. These tests pin the
 * sentences verbatim so the split into command + sentence cannot quietly
 * reword the contract, and assert the command is always a substring of the
 * sentence so the two surfaces can never name different commands.
 */
describe('change status policy - next step', () => {
  const artifacts = (
    ...pairs: Array<[string, ChangeStatusPolicyArtifact['status']]>
  ): ChangeStatusPolicyArtifact[] => pairs.map(([id, status]) => ({ id, status }));

  const input = (overrides: Partial<ChangeNextStepsInput> = {}): ChangeNextStepsInput => ({
    changeName: 'add-dark-mode',
    artifactStatuses: artifacts(['proposal', 'done'], ['specs', 'ready'], ['tasks', 'blocked']),
    allArtifactsComplete: false,
    ...overrides,
  });

  describe('an artifact is ready', () => {
    it('names that artifact instructions command', () => {
      expect(resolveNextStep(input())).toEqual({
        command: 'openspec instructions specs --change "add-dark-mode" --json',
        sentence:
          'Run openspec instructions specs --change "add-dark-mode" --json before writing that artifact.',
      });
    });

    it('picks the FIRST ready artifact, not the last', () => {
      // The array arrives in dependency order with the schema's declaration
      // order breaking ties, so first-ready is the artifact to write next.
      const step = resolveNextStep(
        input({
          artifactStatuses: artifacts(
            ['proposal', 'done'],
            ['specs', 'ready'],
            ['design', 'ready']
          ),
        })
      );

      expect(step?.command).toContain('openspec instructions specs ');
      expect(step?.command).not.toContain('design');
    });

    it('never names a skipped artifact', () => {
      // skip_specs artifacts satisfy dependencies but must not be created,
      // so pointing at one would send the author to write a forbidden file.
      const step = resolveNextStep(
        input({
          artifactStatuses: artifacts(
            ['proposal', 'done'],
            ['specs', 'skipped'],
            ['design', 'ready']
          ),
        })
      );

      expect(step?.command).toContain('openspec instructions design ');
      expect(step?.command).not.toContain('specs');
    });

    it('wins over allArtifactsComplete when both could apply', () => {
      const step = resolveNextStep(input({ allArtifactsComplete: true }));

      expect(step?.command).toContain('openspec instructions specs ');
    });
  });

  describe('planning is complete', () => {
    it('names the apply instructions command', () => {
      const step = resolveNextStep(
        input({
          artifactStatuses: artifacts(['proposal', 'done'], ['specs', 'done']),
          allArtifactsComplete: true,
        })
      );

      expect(step).toEqual({
        command: 'openspec instructions apply --change "add-dark-mode" --json',
        sentence:
          'All planning artifacts are complete. Run openspec instructions apply --change "add-dark-mode" --json to inspect implementation progress.',
      });
    });
  });

  describe('store selection', () => {
    it('carries --store in both the command and the sentence', () => {
      for (const allArtifactsComplete of [false, true]) {
        const step = resolveNextStep(
          input({
            artifactStatuses: allArtifactsComplete
              ? artifacts(['proposal', 'done'])
              : artifacts(['proposal', 'ready']),
            allArtifactsComplete,
            storeId: 'team-context',
          })
        );

        // A command that drops the flag resolves against the pointer repo
        // instead of the store the status was read from.
        expect(step?.command).toContain('--store team-context --json');
        expect(step?.sentence).toContain('--store team-context --json');
      }
    });

    it('omits the flag entirely for a repo-local root', () => {
      expect(resolveNextStep(input())?.command).not.toContain('--store');
    });
  });

  describe('no next step', () => {
    it('resolves to undefined when nothing is ready and planning is unfinished', () => {
      const step = resolveNextStep(
        input({
          artifactStatuses: artifacts(['proposal', 'done'], ['specs', 'blocked']),
          allArtifactsComplete: false,
        })
      );

      expect(step).toBeUndefined();
    });

    it('leaves nextSteps empty rather than inventing a step', () => {
      expect(
        buildNextSteps(
          input({
            artifactStatuses: artifacts(['specs', 'blocked']),
            allArtifactsComplete: false,
          })
        )
      ).toEqual([]);
    });
  });

  describe('buildNextSteps stays the published contract', () => {
    it('is exactly the resolved sentence, one entry', () => {
      for (const candidate of [
        input(),
        input({ artifactStatuses: artifacts(['proposal', 'done']), allArtifactsComplete: true }),
        input({ storeId: 'team-context' }),
      ]) {
        const step = resolveNextStep(candidate);
        const steps = buildNextSteps(candidate);

        expect(steps).toEqual([step!.sentence]);
        // The rendered `Next:` line must be quotable from the JSON sentence.
        expect(steps[0]).toContain(step!.command);
      }
    });
  });
});
