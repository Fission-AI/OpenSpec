import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  type SkillTemplate,
  getApplyInstructions,
  getApplyChangeSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getExploreSkillTemplate,
  getFeedbackSkillTemplate,
  getFfChangeSkillTemplate,
  getNewChangeSkillTemplate,
  getOnboardSkillTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxExploreCommandTemplate,
  getOpsxFfCommandTemplate,
  getOpsxNewCommandTemplate,
  getOpsxOnboardCommandTemplate,
  getOpsxSyncCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
  getOpsxUpdateCommandTemplate,
  getOpsxVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getUpdateChangeSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import {
  generateSkillContent,
  getCommandContents,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: '5866ff47a73ae83523c9d6846fa0524c060cc0b10408b4e0d7f5ed7a1d1b3055',
  getNewChangeSkillTemplate: 'e32224f45cfadf3d8ca74e0f0eb27ffb826f9508c0a30ff597846c7f49016aed',
  getContinueChangeSkillTemplate: '20ddf6b8131bedcf8cb64925062f37eedd649836f680e5de49705f09f4961824',
  getApplyChangeSkillTemplate: '12ed95c079bbbe2f9f114854b7cac59b5ff93236292ba680c883ac91a3e8a8d4',
  getFfChangeSkillTemplate: 'ce6c292cce0e26aee23f31fd1a61fa1869d5f9ad11f114f2d8fbc2071308bfa7',
  getSyncSpecsSkillTemplate: 'c135a7a1f636a154d74caa54327fab04cfabfb3549e2d82b31776f443010e52f',
  getOnboardSkillTemplate: 'f91615491da1bc1b08505eee28b199acbf7041fb6e6b841adeed50ac8138b2d7',
  getOpsxExploreCommandTemplate: 'f052e24ca5efa83bbecd26090d1536878888f9752883046bae57f74e771fcbc3',
  getOpsxNewCommandTemplate: '243cef36241e576095ebb41108b5624c624af97a1f877b26e1a95fd7082db8a7',
  getOpsxContinueCommandTemplate: 'b6d7b6336659b35e69e657afa58cfa1601aedb8543b0380302d1a2467149ca5c',
  getOpsxApplyCommandTemplate: '061b9e26ee81414a547f7920dd91b16a052b8e59e4aa767cf9103047386e7e74',
  getOpsxFfCommandTemplate: 'a7e65e4eb0941bd4f2231347fd7080784d55c04cee21fa1691b477dfabb40e9e',
  getArchiveChangeSkillTemplate: '49d670ca69a4dc48f5db8a18005abf08f43000666e70963e21f2c46cca46e543',
  getBulkArchiveChangeSkillTemplate: '310ba62a8c3769925ebe7b12f46c27a1a93446ddcfa3903ec8085aaf2da24b31',
  getOpsxSyncCommandTemplate: 'bf2e18a079e6a60a341d2eac5574396a5796cfe9f6cc503fb5635d42f91323dd',
  getVerifyChangeSkillTemplate: 'ededd72f473fdde4e0466c10d41f81a3b7f3bd4f3d3da8d351b4fe7d0a2b56b6',
  getOpsxArchiveCommandTemplate: 'ad3a85d957429374cb61b7e77760d51e1cb41fd86a1efb53d33c67c30c265aec',
  getOpsxOnboardCommandTemplate: 'eadf07b8ae5215923cc8e398d0cfae6f5e319e337e37df74df287dda8e664e46',
  getOpsxBulkArchiveCommandTemplate: '02a1176fa3183704c0975ece62ff690af9c8338a45d71134fbd0e92daf0bdf77',
  getOpsxVerifyCommandTemplate: '555fe9158d31fde1806484711713633b392fcfc27e6ba69722385a7f5a2c2cca',
  getOpsxProposeSkillTemplate: '9ba481f5710a67cf83861ce9a9fbb0e0be1bc1e73a2fe5901813e464b67bf079',
  getOpsxProposeCommandTemplate: '3cc80f65739184446a04842a4fdb3c0209eb5ce2825201909a0e599012a1a9cc',
  getFeedbackSkillTemplate: 'dabeb5e825b9349abc8156c3e7b8608f27987912a6d9bf47ef29addde6138133',
  getUpdateChangeSkillTemplate: '45c1e97de46c52cafef9d5e12a5ed96fe4264d8c978404b8e3c3ee519067c18b',
  getOpsxUpdateCommandTemplate: '3a52e1495abbb6b9f50efb6651b95fd53fd1c4fd329deb828e2962cc26e24843',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '2fa2c1d9d1e7b535a133b67b45cef7ca11d6cc769ace264b2711c36027151a9d',
  'openspec-new-change': '8e22baadbbf38ef5394c1ca598a1b49f1eba4e63f2dc6604c445f0dffa1b46d3',
  'openspec-continue-change': 'bf32daae9ac4e904be15dd40865f68a9c3370172ff4279ec32fde46e9aaca845',
  'openspec-apply-change': 'c8fc28e38f519156c61dc17db44dafdc4abecfdb814d83c801744e64a2197482',
  'openspec-ff-change': 'd95ffb998e62398c33193151f4f5e8a984b7c47f903776dd9628bd343c16ca3a',
  'openspec-sync-specs': '1b8fca8224cc6e2617dc225e54b5f35dddd67f0d773c79f7e84eeb6a4b82c304',
  'openspec-archive-change': '2f7628e22644ade9e5e59b0173044a6259a2ca63445e7ea1bb9e4384c407753a',
  'openspec-bulk-archive-change': 'f22045c417d243e6b2cf5c4bf3b6007b4e3bf27bf28de95a2c79cf97b9354924',
  'openspec-verify-change': 'd06e831bfe5d78979fdccebde4e615ced13f7c5c485b3bd6ab1ce90465b968f7',
  'openspec-onboard': 'c21e21a894e7a6dd03849846c04ce932bcd6ee835acc6712fa675cc938b3d104',
  'openspec-propose': 'c2696908254ee21b6f4500a05cb27ff9912a9d5d675e6799d3ee67fe69164285',
  'openspec-update-change': 'fc1a4b93e7310b0b30249c1b22e7bf0eb84dd5c523f0831d236be0067a0f8410',
};

// Intentionally excludes getFeedbackSkillTemplate: this list only models templates
// deployed via generateSkillContent, while feedback is covered in function payload parity.
const GENERATED_SKILL_FACTORIES: Array<[string, () => SkillTemplate]> = [
  ['openspec-explore', getExploreSkillTemplate],
  ['openspec-new-change', getNewChangeSkillTemplate],
  ['openspec-continue-change', getContinueChangeSkillTemplate],
  ['openspec-apply-change', getApplyChangeSkillTemplate],
  ['openspec-ff-change', getFfChangeSkillTemplate],
  ['openspec-sync-specs', getSyncSpecsSkillTemplate],
  ['openspec-archive-change', getArchiveChangeSkillTemplate],
  ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
  ['openspec-verify-change', getVerifyChangeSkillTemplate],
  ['openspec-onboard', getOnboardSkillTemplate],
  ['openspec-propose', getOpsxProposeSkillTemplate],
  ['openspec-update-change', getUpdateChangeSkillTemplate],
];

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('skill templates split parity', () => {
  it('preserves all template function payloads exactly', () => {
    const functionFactories: Record<string, () => unknown> = {
      getExploreSkillTemplate,
      getNewChangeSkillTemplate,
      getContinueChangeSkillTemplate,
      getApplyChangeSkillTemplate,
      getFfChangeSkillTemplate,
      getSyncSpecsSkillTemplate,
      getOnboardSkillTemplate,
      getOpsxExploreCommandTemplate,
      getOpsxNewCommandTemplate,
      getOpsxContinueCommandTemplate,
      getOpsxApplyCommandTemplate,
      getOpsxFfCommandTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getOpsxSyncCommandTemplate,
      getVerifyChangeSkillTemplate,
      getOpsxArchiveCommandTemplate,
      getOpsxOnboardCommandTemplate,
      getOpsxBulkArchiveCommandTemplate,
      getOpsxVerifyCommandTemplate,
      getOpsxProposeSkillTemplate,
      getOpsxProposeCommandTemplate,
      getFeedbackSkillTemplate,
      getUpdateChangeSkillTemplate,
      getOpsxUpdateCommandTemplate,
    };

    const actualHashes = Object.fromEntries(
      Object.entries(functionFactories).map(([name, fn]) => [name, hash(stableStringify(fn()))])
    );

    expect(actualHashes).toEqual(EXPECTED_FUNCTION_HASHES);
  });

  it('preserves generated skill file content exactly', () => {
    const actualHashes = Object.fromEntries(
      GENERATED_SKILL_FACTORIES.map(([dirName, createTemplate]) => [
        dirName,
        hash(generateSkillContent(createTemplate(), 'PARITY-BASELINE')),
      ])
    );

    expect(actualHashes).toEqual(EXPECTED_GENERATED_SKILL_CONTENT_HASHES);
  });

  // The assertion above only compares the skills this file already lists, so a
  // workflow added to getSkillTemplates() but never pinned here would ship with
  // no golden hash and nothing would fail. Pin the registry itself.
  it('pins every skill the production registry deploys', () => {
    const pinned = GENERATED_SKILL_FACTORIES.map(([dirName]) => dirName).sort();
    const deployed = getSkillTemplates().map(({ dirName }) => dirName).sort();

    expect(pinned, 'add the new skill to GENERATED_SKILL_FACTORIES and EXPECTED_GENERATED_SKILL_CONTENT_HASHES').toEqual(deployed);
  });

  // Iterating the production registries (not a local list) means a newly
  // added workflow is covered automatically; the full-constant containment
  // check fails if any template's interpolation drifts.
  it('teaches store selection in every deployed skill template', () => {
    for (const { template, dirName } of getSkillTemplates()) {
      const content = generateSkillContent(template, 'PARITY-BASELINE');
      expect(content, dirName).toContain(STORE_SELECTION_GUIDANCE);
    }
  });

  // Auto-approve the OpenSpec CLI: every generated skill carries
  // `allowed-tools: Bash(openspec:*)` so agents that honor it stop prompting
  // on each `openspec` call. Iterating the registry covers new skills too.
  it('pre-approves the openspec CLI via allowed-tools in every deployed skill', () => {
    for (const { template, dirName } of getSkillTemplates()) {
      const content = generateSkillContent(template, 'PARITY-BASELINE');
      expect(content, dirName).toContain('allowed-tools: Bash(openspec:*)');
    }
  });

  it('teaches store selection in every deployed opsx command template', () => {
    for (const entry of getCommandContents()) {
      expect(entry.body, entry.id).toContain(STORE_SELECTION_GUIDANCE);
    }

    // Feedback has no store-capable command and intentionally carries no
    // store teaching; it ships outside both registries.
    expect(getFeedbackSkillTemplate().instructions).not.toContain('**Store selection:**');
  });

  it('keeps a selected store on every applicable workflow command', () => {
    expect(STORE_SELECTION_GUIDANCE).toContain(
      'treat `--store <id>` as sticky for the rest of the workflow'
    );
    expect(STORE_SELECTION_GUIDANCE).toContain(
      'Every unscoped example of those commands below is shorthand: before running it, append the flag'
    );
    expect(STORE_SELECTION_GUIDANCE).toContain(
      'openspec status --change "<name>" --json --store "<id>"'
    );
    expect(STORE_SELECTION_GUIDANCE).toContain('`context`, `schemas`, `view`');
  });

  it('validates synced main specs before reporting success', () => {
    const variants: Array<[string, string]> = [
      ['sync skill', getSyncSpecsSkillTemplate().instructions],
      ['sync command', getOpsxSyncCommandTemplate().content],
    ];

    for (const [variant, content] of variants) {
      const mutationsComplete = content.indexOf(
        'Follow the **Main Spec Format Reference** below'
      );
      const validation = content.indexOf('openspec validate --specs');
      const summary = content.indexOf('**Show summary**');

      expect(mutationsComplete, variant).toBeGreaterThanOrEqual(0);
      expect(validation, variant).toBeGreaterThan(mutationsComplete);
      expect(summary, variant).toBeGreaterThan(validation);
      expect(content, variant).toContain('same selected-root flags');
      expect(content, variant).toContain(
        'If validation fails, report the problems and do not claim the sync succeeded'
      );
    }
  });

  it('preserves nested capability paths in spec-aware workflow guidance (#1459)', () => {
    const capabilityPathDefinition =
      '`<capability-path>` is the spec directory relative to `specs/`';
    const pathAwareTemplates: Array<[string, string, string, string]> = [
      [
        'propose skill',
        generateSkillContent(getOpsxProposeSkillTemplate(), 'PARITY-BASELINE'),
        'specs/<capability-path>/spec.md',
        "Preserve an existing capability's full path",
      ],
      [
        'propose command',
        getOpsxProposeCommandTemplate().content,
        'specs/<capability-path>/spec.md',
        "Preserve an existing capability's full path",
      ],
      [
        'explore skill',
        generateSkillContent(getExploreSkillTemplate(), 'PARITY-BASELINE'),
        'specs/<capability-path>/spec.md',
        "Preserve an existing capability's full path",
      ],
      [
        'explore command',
        getOpsxExploreCommandTemplate().content,
        'specs/<capability-path>/spec.md',
        "Preserve an existing capability's full path",
      ],
      [
        'onboard skill',
        generateSkillContent(getOnboardSkillTemplate(), 'PARITY-BASELINE'),
        '<existing-capability-path>',
        'Use the exact existing path for modified',
      ],
      [
        'onboard command',
        getOpsxOnboardCommandTemplate().content,
        '<existing-capability-path>',
        'Use the exact existing path for modified',
      ],
      [
        'sync skill',
        generateSkillContent(getSyncSpecsSkillTemplate(), 'PARITY-BASELINE'),
        '<planningHome.root>/openspec/specs/<capability-path>/spec.md',
        'Preserve the full path from each delta spec',
      ],
      [
        'sync command',
        getOpsxSyncCommandTemplate().content,
        '<planningHome.root>/openspec/specs/<capability-path>/spec.md',
        'Preserve the full path from each delta spec',
      ],
      [
        'archive skill',
        generateSkillContent(getArchiveChangeSkillTemplate(), 'PARITY-BASELINE'),
        '<planningHome.root>/openspec/specs/<capability-path>/spec.md',
        'Preserve the full path from each delta spec',
      ],
      [
        'archive command',
        getOpsxArchiveCommandTemplate().content,
        '<planningHome.root>/openspec/specs/<capability-path>/spec.md',
        'Preserve the full path from each delta spec',
      ],
      [
        'bulk archive skill',
        generateSkillContent(getBulkArchiveChangeSkillTemplate(), 'PARITY-BASELINE'),
        '<planningHome.root>/openspec/specs/<capability-path>/spec.md',
        'Preserve the full path from each delta spec',
      ],
      [
        'bulk archive command',
        getOpsxBulkArchiveCommandTemplate().content,
        '<planningHome.root>/openspec/specs/<capability-path>/spec.md',
        'Preserve the full path from each delta spec',
      ],
    ];

    for (const [label, content, destination, preservationGuidance] of pathAwareTemplates) {
      expect(content, label).toContain(capabilityPathDefinition);
      expect(content, label).toContain(destination);
      expect(content, label).toContain(preservationGuidance);
      expect(content, label).not.toContain('specs/<capability>/spec.md');
    }

    const onboardVariants: Array<[string, string]> = [
      [
        'onboard skill',
        generateSkillContent(getOnboardSkillTemplate(), 'PARITY-BASELINE'),
      ],
      ['onboard command', getOpsxOnboardCommandTemplate().content],
    ];

    for (const [label, content] of onboardVariants) {
      expect(content, label).toContain(
        '- `<capability-path>`: [brief description]'
      );
      expect(content, label).not.toContain('<capability-name>');
    }

    const bulkArchiveVariants: Array<[string, string]> = [
      [
        'bulk archive skill',
        generateSkillContent(getBulkArchiveChangeSkillTemplate(), 'PARITY-BASELINE'),
      ],
      ['bulk archive command', getOpsxBulkArchiveCommandTemplate().content],
    ];

    for (const [label, content] of bulkArchiveVariants) {
      expect(content, label).toContain(
        'Build a map keyed by `<capability-path>`, the exact path relative to `specs/`'
      );
      expect(content, label).toContain(
        'billing/user-auth  -> [change-c]            <- OK (different full path)'
      );
      expect(content, label).toContain(
        'identity/user-auth -> [change-a, change-b]  <- CONFLICT'
      );
      expect(content, label).toContain('identity/user-auth (!)');
      expect(content, label).toContain(
        'the exact same `<capability-path>`'
      );
      expect(content, label).toContain(
        'keyed by change and `<capability-path>`'
      );
      expect(content, label).toContain(
        'identity/user-auth spec: Will apply add-oauth then add-jwt'
      );
      expect(content, label).toContain(
        'add-jwt, identity/user-auth: implementation not found'
      );
      expect(content, label).toContain(
        '1 conflict resolved (identity/user-auth: synced add-oauth, skipped add-jwt)'
      );
      expect(content, label).not.toContain('\n   auth -> [change-a');
      expect(content, label).not.toContain('| auth (!)');
      expect(content, label).not.toContain('(auth: synced');
      expect(content, label).not.toContain('add-jwt/auth:');
    }
  });

  it('keeps onboarding task examples aligned with concrete verification guidance (#345)', () => {
    const variants: Array<[string, string]> = [
      ['onboard skill', generateSkillContent(getOnboardSkillTemplate(), 'PARITY-BASELINE')],
      ['onboard command', getOpsxOnboardCommandTemplate().content],
    ];

    for (const [label, content] of variants) {
      const taskBlock = content.match(
        /Here are the implementation tasks:([\s\S]*?)Each checkbox becomes a unit of work/
      )?.[1];
      expect(taskBlock, label).toBeDefined();
      const checkboxes = taskBlock!
        .split('\n')
        .filter(line => /^- \[ \] \d+\.\d+ /.test(line));
      expect(checkboxes, label).toHaveLength(3);
      expect(
        checkboxes.every(
          line =>
            line.endsWith(
              '[Specific task] — verify: [test, command, observable behavior, or delivered artifact]'
            ) || / Verify .+ with \[.+\]$/.test(line)
        ),
        label
      ).toBe(true);
      expect(content, label).toContain(
        '[Specific task] — verify: [test, command, observable behavior, or delivered artifact]'
      );
      expect(content, label).toContain(
        'Verify [broader integration or system behavior] with [end-to-end test or observable result]'
      );
      expect(content, label).not.toContain('[Verification step]');
    }
  });

  it('generates no workspace-planning residue in any workflow template (4.1)', () => {
    const allSkills: Array<[string, () => SkillTemplate]> = [
      ['openspec-apply-change', getApplyChangeSkillTemplate],
      ['openspec-sync-specs', getSyncSpecsSkillTemplate],
      ['openspec-archive-change', getArchiveChangeSkillTemplate],
      ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
      ['openspec-verify-change', getVerifyChangeSkillTemplate],
    ];

    for (const [dirName, createTemplate] of allSkills) {
      const content = generateSkillContent(createTemplate(), 'PARITY-BASELINE');
      expect(content, dirName).not.toContain('workspace-planning');
      expect(content, dirName).not.toContain('Workspace guard');
    }
  });

  it('does not suggest archiving when only planning is complete', () => {
    const variants: Array<[string, string]> = [
      [
        'skill',
        generateSkillContent(getContinueChangeSkillTemplate(), 'PARITY-BASELINE'),
      ],
      ['opsx command', getOpsxContinueCommandTemplate().content],
    ];

    for (const [variant, content] of variants) {
      expect(content, variant).toContain('Planning is complete!');
      expect(content, variant).toContain(
        'Once implementation and any tracked work are complete, archive it'
      );
      expect(content, variant).not.toContain('All artifacts created!');
      expect(content, variant).not.toContain('or archive it');
    }
  });

  it('gates the archive on a completed spec sync (#1393)', () => {
    const generatedSkill = generateSkillContent(getArchiveChangeSkillTemplate(), 'PARITY-BASELINE');
    const commandContent = getOpsxArchiveCommandTemplate().content;

    // The single archive skill references openspec-sync-specs; opsx command references /opsx:sync.
    expect(generatedSkill, 'skill').toContain('run the `openspec-sync-specs` workflow inline');
    expect(commandContent, 'opsx command').toContain('run the `/opsx:sync` workflow inline');

    const variants: Array<[string, string]> = [
      ['skill', generatedSkill],
      ['opsx command', commandContent],
    ];

    for (const [variant, content] of variants) {
      expect(content, variant).toContain('Do not delegate it to a background task');
      expect(content, variant).toContain('Never archive while a spec sync is still in flight');

      // Verification must follow delta semantics.
      expect(content, variant).toContain('MODIFIED requirements carrying the scenario and description changes');
      expect(content, variant).toContain('REMOVED requirements gone');
      expect(content, variant).toContain('RENAMED requirements present under the new name and absent under the old one');

      // Verification is bound to the delta specs on disk, not to whatever the sync reports it touched.
      expect(content, variant).toContain('not only the ones the sync reports it touched');

      // Main spec paths are store-root aware
      expect(content, variant).toContain('<planningHome.root>/openspec/specs/<capability-path>/spec.md');
    }
  });

  it('gates bulk archive on inline synchronous spec sync and verification before moving change root', () => {
    const generatedSkill = generateSkillContent(getBulkArchiveChangeSkillTemplate(), 'PARITY-BASELINE');
    const commandContent = getOpsxBulkArchiveCommandTemplate().content;

    // The bulk archive skill references openspec-sync-specs; opsx command references /opsx:sync.
    expect(generatedSkill, 'bulk skill').toContain('run the `openspec-sync-specs` workflow inline');
    expect(commandContent, 'bulk opsx command').toContain('run the `/opsx:sync` workflow inline');

    const variants: Array<[string, string]> = [
      ['bulk skill', generatedSkill],
      ['bulk opsx command', commandContent],
    ];

    for (const [variant, content] of variants) {
      expect(content, variant).toContain('Do not delegate to a background task');
      expect(content, variant).toContain('Never archive a change while a spec sync is still in flight');
      expect(content, variant).toContain('Verify included delta specs before moving changeRoot');

      // Verification must follow delta semantics.
      expect(content, variant).toContain('MODIFIED requirements carrying scenario and description changes');
      expect(content, variant).toContain('REMOVED requirements gone');
      expect(content, variant).toContain('RENAMED requirements present under the new name and absent under the old one');

      // Main spec paths are store-root aware
      expect(content, variant).toContain('<planningHome.root>/openspec/specs/<capability-path>/spec.md');
    }
  });

  it('carries mixed included and excluded bulk-archive deltas through both generated variants', () => {
    const variants: Array<[string, string]> = [
      [
        'bulk skill',
        generateSkillContent(getBulkArchiveChangeSkillTemplate(), 'PARITY-BASELINE'),
      ],
      ['bulk opsx command', getOpsxBulkArchiveCommandTemplate().content],
    ];

    for (const [variant, content] of variants) {
      expect(content, variant).toContain(
        'An inclusion or exclusion decision for every delta spec'
      );
      expect(content, variant).toContain(
        'A single change can have both included and excluded delta specs'
      );
      expect(content, variant).toContain(
        'passing only the included delta paths and explicitly instructing it to ignore'
      );
      expect(content, variant).not.toContain(
        'for each change, passing the delta spec analysis'
      );
      expect(content, variant).toContain(
        'Re-run the comparison only for delta specs in `includedDeltas`'
      );
      expect(content, variant).toContain(
        'Do not verify delta specs in `excludedDeltas`'
      );
      expect(content, variant).toContain('report `sync skipped`');
      expect(content, variant).toContain(
        '`sync skipped` without treating the archive itself as skipped'
      );

      // These three carried no assertion, so deleting any of them from a
      // single variant was caught only by the golden hash — and this repo
      // regenerates hashes as a matter of routine, which makes that no
      // protection at all.
      expect(content, variant).toContain(
        '`includedDeltas`: all non-conflicting delta specs from confirmed changes plus conflict deltas selected for sync'
      );
      expect(content, variant).toContain(
        '`excludedDeltas`: conflict deltas from confirmed changes excluded because their implementation is missing'
      );
      expect(content, variant).toContain(
        'Carry the per-delta `includedDeltas` and `excludedDeltas` decisions into execution'
      );
      // The worked example must show the skip, or the agent has no model of
      // what a partially-synced batch report looks like.
      expect(content, variant).toContain(
        '1 delta spec sync skipped (add-jwt, identity/user-auth: implementation not found)'
      );
    }
  });

  it('lets the sync workflow honor the delta subset bulk archive hands it', () => {
    // Bulk archive tells sync to ignore excludedDeltas, but sync treats
    // existingOutputPaths as its own source of truth. Without an explicit
    // carve-out the callee re-syncs the delta the caller withheld, step 8b
    // never checks it (it verifies only includedDeltas), and the run still
    // reports `sync skipped` for a spec that was in fact written.
    const variants: Array<[string, string]> = [
      ['sync skill', getSyncSpecsSkillTemplate().instructions],
      ['sync command', getOpsxSyncCommandTemplate().content],
    ];

    for (const [variant, content] of variants) {
      expect(content, variant).toContain(
        'A caller narrows it by naming an explicit list of complete entries from'
      );
      expect(content, variant).toContain(
        'sync only the named paths and leave the remaining delta specs untouched'
      );
      expect(content, variant).toContain(
        'never widen it back to the full\n   list'
      );
      expect(content, variant).toContain(
        'Honor a caller-supplied subset of `existingOutputPaths`'
      );
      expect(content, variant).toContain(
        'copy those absolute values verbatim'
      );
      expect(content, variant).toContain('selecting the entry ending');
      expect(content, variant).toContain('/specs/billing/invoices/spec.md');
      expect(content, variant).not.toContain('only sync the billing delta');
      expect(content, variant).not.toContain('only sync `specs/billing/invoices/spec.md`');

      // Step 4 is the operative loop. Narrowing step 3 alone left the loop
      // still iterating "each path returned by the CLI", which re-widens the
      // set and re-syncs the delta the caller withheld — the original bug,
      // one step further down the template.
      expect(content, variant).toContain(
        'For each capability delta spec path selected in step 3'
      );
      expect(content, variant).not.toContain(
        'For each capability delta spec path returned by the CLI'
      );

      // The undefined edges: a named path outside existingOutputPaths, and an
      // empty named list. Both must stop rather than proceed on a guess.
      expect(content, variant).toContain(
        'If a named path is not in `existingOutputPaths`, do not sync it'
      );
      expect(content, variant).toContain(
        'If the named list is\n   empty, report that there is nothing to sync and stop'
      );
    }
  });

  it('requires apply context while keeping guidance advisory and state separate', () => {
    const variants: Array<[string, string]> = [
      ['apply skill', getApplyChangeSkillTemplate().instructions],
      ['apply command', getOpsxApplyCommandTemplate().content],
    ];

    for (const [variant, content] of variants) {
      expect(content, variant).toContain('Optional `context`');
      expect(content, variant).toContain('Optional `operationGuidance`');
      expect(content, variant).toContain('Treat `context` as a required prompt-level input');
      expect(content, variant).toContain('apply relevant project facts, conventions, and constraints');
      expect(content, variant).toContain(
        'Treat `operationGuidance` as optional additive advice'
      );
      expect(content, variant).toContain('Read and consider every');
      expect(content, variant).toContain('applicable and compatible with the built-in');
      expect(content, variant).toContain(
        'separate from CLI-returned state, missing artifacts, tasks'
      );
      expect(content, variant).toContain(
        'Do not use context or operation guidance as proof that a task is complete'
      );
      expect(content, variant).toContain('conflict and preserve the controlling value');
      expect(content, variant).toContain('do not follow it and explain why');
      expect(content, variant).toContain(
        'Do not copy runtime context or operation guidance into implementation files or planning artifacts'
      );
      expect(content, variant).toContain(
        'Preserve CLI-controlled blocked/ready/all-done behavior'
      );
      expect(content, variant).toContain(
        'These are prompt-level behavior contracts, not enforceable checks'
      );
    }
  });

  it('makes the archive-inputs lookup fail open and sync instruction consumption fail closed', () => {
    const archiveVariants: Array<[string, string]> = [
      ['archive skill', getArchiveChangeSkillTemplate().instructions],
      ['archive command', getOpsxArchiveCommandTemplate().content],
    ];

    for (const [variant, content] of archiveVariants) {
      expect(content, variant).toContain(
        'openspec instructions archive --change "<name>" --json'
      );
      expect(content, variant).toContain('same selected-root flags');
      // The archive-inputs lookup is a new CLI command, so a skill installed
      // ahead of the CLI (skills.sh) must degrade instead of blocking archiving.
      expect(content, variant).toContain('advisory and\n   optional');
      expect(content, variant).toContain('must never block archiving');
      expect(content, variant).toContain('older CLI that\n   does not support this command yet');
      expect(content, variant).toContain(
        'continue the archive workflow with no\n   context and no operation guidance'
      );
      expect(content, variant).toContain('Do not report an error and do not stop');
      expect(content, variant).not.toContain(
        'stop before inspecting or\n   writing specs or moving the change'
      );
      expect(content, variant).toContain('successful response may omit both optional fields');
      expect(content, variant).toContain(
        'Treat `context` as a\n   required prompt-level input'
      );
      expect(content, variant).toContain(
        'Treat `operationGuidance` as optional\n   additive advice'
      );
      expect(content, variant).toContain('read and consider every entry');
      expect(content, variant).toContain('report the conflict and preserve the controlling value');
      expect(content, variant).toContain('do not follow it\n   and explain why');
      expect(content, variant).toContain(
        '`artifactPaths.specs.existingOutputPaths` from status JSON as the only'
      );
      expect(content, variant).toContain('`specs` entry is missing');
      expect(content, variant).toContain('do not infer\n   delta specs from other artifacts');
      expect(content, variant).toContain(
        'openspec instructions specs --change "<name>" --json'
      );
      expect(content, variant).toContain('stop\n   before writing any main spec or moving the change');
      expect(content, variant).toContain('valid response with omitted\n   `rules`');
      expect(content, variant).toContain('inline sync must reuse that snapshot');
      expect(content, variant).toContain('do not use them as archive guidance');
      expect(content, variant).toContain(
        'Existing CLI checks, resolved paths, prompts, and command contracts are unchanged'
      );
      expect(content, variant).toContain(
        'Never copy runtime context, operation guidance, or artifact-rule text verbatim'
      );
      expect(content, variant).toContain(
        'Artifact rules constrain only the specs being written and are never operation guidance'
      );
    }

    const syncVariants: Array<[string, string]> = [
      ['sync skill', getSyncSpecsSkillTemplate().instructions],
      ['sync command', getOpsxSyncCommandTemplate().content],
    ];

    for (const [variant, content] of syncVariants) {
      expect(content, variant).toContain(
        '`artifactPaths.specs.existingOutputPaths` from the status JSON as the'
      );
      expect(content, variant).toContain('`specs` entry is missing');
      expect(content, variant).toContain('do not infer them from other artifacts');
      expect(content, variant).toContain('reuse it and do not\n     fetch the same instructions again');
      expect(content, variant).toContain('Otherwise run that command once now');
      expect(content, variant).toContain('stop before writing any main spec');
      expect(content, variant).toContain('Do not treat the\n     failure as an absent rule set');
      expect(content, variant).toContain('valid response with omitted `rules`');
      expect(content, variant).toContain('Artifact rules are not operation guidance');
      expect(content, variant).toContain('without copying it verbatim');
    }
  });

  it('keeps bulk archive instruction lookups atomic across mixed-schema batches', () => {
    const variants: Array<[string, string]> = [
      ['bulk skill', getBulkArchiveChangeSkillTemplate().instructions],
      ['bulk command', getOpsxBulkArchiveCommandTemplate().content],
    ];

    for (const [variant, content] of variants) {
      expect(content, variant).toContain('archive inputs once for the selected root');
      expect(content, variant).toContain(
        'openspec instructions archive --change "<selected-change>" --json'
      );
      // Same rule as the single-change skill: a missing archive-inputs command
      // must not take down a whole batch.
      expect(content, variant).toContain('advisory and optional');
      expect(content, variant).toContain('must never block the batch');
      expect(content, variant).toContain(
        'continue the batch with no context and no operation guidance'
      );
      expect(content, variant).not.toContain(
        'stop the whole batch before inspecting specs, writing main specs'
      );
      expect(content, variant).toContain(
        'Treat this list as the only delta-spec source'
      );
      expect(content, variant).toContain('missing or the list is empty');
      expect(content, variant).toContain('mixed-schema\n        batches');
      expect(content, variant).toContain('fetch every\n   required specs-rule snapshot');
      expect(content, variant).toContain(
        'Obtain all snapshots before the first write or move'
      );
      expect(content, variant).toContain(
        'stop the whole batch before\n   any main-spec write or change move'
      );
      expect(content, variant).toContain(
        'sync must reuse it without fetching instructions again'
      );
      expect(content, variant).toContain(
        'Treat\n   `context` as a required prompt-level input across the batch'
      );
      expect(content, variant).toContain(
        'Treat\n   `operationGuidance` as optional additive advice'
      );
      expect(content, variant).toContain('read and consider every');
      expect(content, variant).toContain('report the conflict and preserve the controlling');
      expect(content, variant).toContain('do not\n   follow it and explain why');
      expect(content, variant).toContain(
        'Keep runtime inputs, conflict analysis, CLI-derived values, and artifact rules separate'
      );
      expect(content, variant).toContain(
        'Artifact rules constrain only written specs'
      );
      expect(content, variant).toContain(
        'Never copy runtime input or artifact-rule text verbatim into output files'
      );
    }
  });

  // The archive instructions must mirror `openspec archive`'s date-prefix
  // rule (#1316): a change already named with a `YYYY-MM-DD-` prefix keeps
  // its name, so archived names never stack dates. Guard the caveat, the
  // literal `mv` target, and the success-summary examples an agent would
  // copy verbatim (#1317).
  it('never instructs stacking a date prefix on an already-dated change (#1317)', () => {
    const archiveInstructions: Array<[string, string]> = [
      ['openspec-archive-change', getArchiveChangeSkillTemplate().instructions],
      ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate().instructions],
      ['openspec-onboard', getOnboardSkillTemplate().instructions],
      ['opsx-archive', getOpsxArchiveCommandTemplate().content],
      ['opsx-bulk-archive', getOpsxBulkArchiveCommandTemplate().content],
      ['opsx-onboard', getOpsxOnboardCommandTemplate().content],
    ];

    for (const [id, text] of archiveInstructions) {
      expect(text, id).toContain('already starts with a `YYYY-MM-DD-` prefix');

      // Every archive path an agent reproduces must name the derived target,
      // never a hardcoded date.
      expect(text, id).toContain('<target-name>');

      // Discriminator: a `YYYY-MM-DD-` after a path separator belongs to a
      // literal archive path the agent copies verbatim. The rule statements
      // only name the prefix, never place it in a path, so they stay legal.
      expect(text, id).not.toMatch(/\/YYYY-MM-DD-/);
    }
  });

  // Guidance that tells an agent to run `openspec archive` has to pass
  // --yes: the agent cannot answer the confirmation prompts from a tool
  // call, so the bare command aborts (#1479). A golden hash proves the
  // generated file matches its source, never that the source is right, so
  // pin the flag itself.
  it('passes --yes wherever it tells an agent to run openspec archive (#1479)', () => {
    // Sweep the whole corpus, not just the one template that has such an
    // invocation today: the point is to catch the next one.
    const corpus: Array<[string, string]> = [
      ...getSkillTemplates().map(
        ({ dirName, template }) => [dirName, template.instructions] as [string, string]
      ),
      ...getCommandContents().map((entry) => [entry.id, entry.body] as [string, string]),
    ];

    // Only runnable invocations count: prose that merely names the command
    // ("same rule as `openspec archive`") has nothing to confirm, and it is
    // always mid-sentence, so requiring the command to open the line
    // separates the two. Everything a runnable line may legitimately carry in
    // front of the command is allowed, because each of these hid an
    // invocation from an earlier, stricter version of this check: indentation,
    // a list marker, a shell prompt, and a global flag between `openspec` and
    // `archive`. Tokenised rather than pattern-matched - the regex this
    // replaces needed nested quantifiers to accept the flags, which is a ReDoS
    // shape even in a test.
    function archiveInvocations(text: string): string[] {
      return text.split('\n').filter((line) => {
        const bare = line
          .trimStart()
          .replace(/^(?:[-*+]|\d+\.)[ \t]+/, '')
          .replace(/^\$[ \t]+/, '');
        const tokens = bare.split(/\s+/).filter(Boolean);
        if (tokens[0] !== 'openspec') return false;
        const archiveAt = tokens.indexOf('archive');
        if (archiveAt < 1) return false;
        // Anything between `openspec` and `archive` has to be a global flag or
        // one's value, or this is a different subcommand that merely mentions
        // the word (`openspec list archive`).
        return tokens
          .slice(1, archiveAt)
          .every((token, i, before) => token.startsWith('-') || !!before[i - 1]?.startsWith('-'));
      });
    }

    let total = 0;
    for (const [id, text] of corpus) {
      const invocations = archiveInvocations(text);
      total += invocations.length;
      for (const invocation of invocations) {
        expect(invocation.trim(), id).toContain('--yes');
      }
    }

    // Guards the guard, and names the floor rather than trusting `> 0`: the
    // onboarding walkthrough is the one template that is supposed to contain
    // a runnable archive invocation, so a corpus that stops containing it
    // fails here instead of passing vacuously.
    expect(total).toBeGreaterThan(0);
    const onboard = corpus.filter(([id]) => id.includes('onboard'));
    expect(onboard.length).toBeGreaterThan(0);
    for (const [id, text] of onboard) {
      expect(archiveInvocations(text), id).not.toHaveLength(0);
    }
  });

  // Covers both archive paths, not just the bulk one the fix targeted: the
  // single-change routing has been correct since #1357 (current wording from
  // #1394) but was never pinned, so a stale branch could silently reopen the
  // bug #1381 actually reported.
  it('honors Cancel at every archive confirmation (#1381)', () => {
    const variants: Array<[string, string]> = [
      ['bulk skill', generateSkillContent(getBulkArchiveChangeSkillTemplate(), 'PARITY-BASELINE')],
      ['bulk opsx command', getOpsxBulkArchiveCommandTemplate().content],
      ['single skill', generateSkillContent(getArchiveChangeSkillTemplate(), 'PARITY-BASELINE')],
      ['single opsx command', getOpsxArchiveCommandTemplate().content],
    ];

    for (const [variant, content] of variants) {
      // Offering "Cancel" without routing it let an agent fall straight through
      // to the archive step and move the changes anyway.
      expect(content, variant).toContain('"Cancel" — stop, do not archive');

      // An unrecognized answer must re-prompt; archiving is never the default.
      expect(content, variant).toContain('Anything else — ask again rather than archiving');
    }
  });

  // The bulk confirmation labels are written by the agent and carry an `N`
  // placeholder, so routing must match intent — matching the literal labels
  // would send every legitimate answer down the "ask again" path forever.
  it('routes the bulk archive confirmation by intent, not by literal label (#1381)', () => {
    const variants: Array<[string, string]> = [
      ['bulk skill', generateSkillContent(getBulkArchiveChangeSkillTemplate(), 'PARITY-BASELINE')],
      ['bulk opsx command', getOpsxBulkArchiveCommandTemplate().content],
    ];

    for (const [variant, content] of variants) {
      expect(content, variant).toContain('Route on the answer by intent, not by exact label');

      // The ready-only route has to name where "ready" is decided, or the agent
      // cannot tell which subset to archive.
      expect(content, variant).toContain('the changes the step 6 table marks');

      // A cancelled batch must archive nothing, reinforced where agents skim.
      expect(content, variant).toContain(
        'Never archive after the user cancels the confirmation'
      );
    }
  });

  it('makes the schema instruction field authoritative for artifact creation (#777)', () => {
    const variants: Array<[string, string]> = [
      ['propose skill', generateSkillContent(getOpsxProposeSkillTemplate(), 'PARITY-BASELINE')],
      ['propose command', getOpsxProposeCommandTemplate().content],
      ['continue skill', generateSkillContent(getContinueChangeSkillTemplate(), 'PARITY-BASELINE')],
      ['continue command', getOpsxContinueCommandTemplate().content],
      ['ff skill', generateSkillContent(getFfChangeSkillTemplate(), 'PARITY-BASELINE')],
      ['ff command', getOpsxFfCommandTemplate().content],
    ];

    for (const [variant, content] of variants) {
      // The instruction field wins even for familiar artifact names: the old
      // hard-coded "Common artifact patterns" shortcut is what let agents
      // ignore custom schemas that reuse proposal.md/tasks.md file names.
      expect(content, variant).toContain('the authoritative guidance');
      expect(content, variant).not.toContain('Common artifact patterns');

      // Delegated creation is honored at the creation step itself, and the
      // delegated skill's output is verified rather than assumed.
      expect(content, variant).toContain(
        'If the `instruction` field delegates creation to a specific skill or command, invoke it to produce the artifact instead of writing the file yourself, then verify the artifact file exists at `resolvedOutputPath`'
      );

      // ...and restated in the artifact-creation guidelines.
      expect(content, variant).toContain(
        'If the `instruction` field directs you to use a specific skill or command to create the artifact, invoke it instead of writing the artifact directly'
      );
    }
  });

  // A golden hash proves the generated file matches its source, never that the
  // source is right - so a careless `regen:parity-hashes` over a dropped
  // paragraph passes CI silently. The sync skill is the one place an agent
  // learns that retiring a capability needs the marker; pin the fact, not the
  // hash, so losing the guidance fails here instead of shipping.
  it('tells the sync skill that retirement needs the retire_capabilities marker', () => {
    const sync = getSkillTemplates().find(
      ({ dirName }) => dirName === 'openspec-sync-specs'
    );
    expect(sync, 'openspec-sync-specs template').toBeTruthy();
    const variants = [
      ['sync skill', sync!.template.instructions],
      ['sync command', getOpsxSyncCommandTemplate().content],
    ] as const;
    for (const [variant, text] of variants) {
      expect(text, variant).toContain('retire_capabilities: true');
      expect(text, variant).toContain('every other nonblank line in the whole file is accounted for');
      expect(text, variant).toContain('resolves inside the real specs root');
      expect(text, variant).toContain('checkout-scoped recovery guidance');
      expect(text, variant).toContain('do not modify the main spec');
      expect(text, variant).toMatch(/Stop\s+the sync for that capability/);
      expect(text, variant).toContain(
        'Never write or leave an empty `## Requirements` section'
      );
      expect(text, variant).not.toContain('any other sections');
      expect(text, variant).not.toContain('Loose prose left under `## Requirements` does NOT block');
    }
  });
});

describe('apply skill/command shared instruction core', () => {
  // The apply skill and command are intentionally distinct surfaces, but they
  // differ only in how they are invoked — the generation transformers rewrite
  // the canonical `/opsx:<id>` tokens per surface downstream (asserted in
  // test/utils/command-references.test.ts). The instruction text itself is
  // shared, so this pins the contract: both surfaces render the one canonical
  // core and cannot silently drift apart at the template level.
  it('renders both apply surfaces from the shared instruction core', () => {
    const core = getApplyInstructions();
    expect(getApplyChangeSkillTemplate().instructions).toBe(core);
    expect(getOpsxApplyCommandTemplate().content).toBe(core);
  });
});
