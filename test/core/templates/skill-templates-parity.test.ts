import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  type SkillTemplate,
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
  getOpsxVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import {
  generateSkillContent,
  getCommandContents,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: 'b8693bd2a70ccd2e73052f92cb0729238accd1acdfa1903d5ce1d09320688a67',
  getNewChangeSkillTemplate: '16e938bfe603d5b7355719d26687aee6395dcb740cdc1b62b7aeeebbf3271565',
  getContinueChangeSkillTemplate: 'a63074acf7c6a7efa00d303232001905854d09e51f5f1db9b5275a64186d6414',
  getApplyChangeSkillTemplate: '3b55272029b14cd4ae3d9c3b727d9ba7fdd687bc3377c8945e91a64edf26f6b7',
  getFfChangeSkillTemplate: '84290fc5054fe0dfdb7b8d80f51a840afc2a5b02913ccf336e6d36d63f137572',
  getSyncSpecsSkillTemplate: '83cd47d2cf51f343493248a085f0c1c59e535048099387c49d23ec0623914b91',
  getOnboardSkillTemplate: '962acddc522830c0ea6688a9cc63a604aef9b78e127c5e01f0f50b1d082f03df',
  getOpsxExploreCommandTemplate: 'cfd3e5fffae04ad656db492f540e0746d266f35d5e0547c5b4ce05f31f23a634',
  getOpsxNewCommandTemplate: '41016b092634691a655f6bb9d58e4c07ecb5d196c229923344fd03e48737c570',
  getOpsxContinueCommandTemplate: 'f38877a42944326761175a11fa65eacab64f492041ce7cc6de9f6d0af8859435',
  getOpsxApplyCommandTemplate: '9e239a30ca0a03eb4d28a049fb705ce9a16b2316ef1927fbd7a6074b56293bb4',
  getOpsxFfCommandTemplate: 'a0d2ed4ca12f2a3dd21e6cd1ca4a4288a06ef02d56121f3f187c9bcb17ef4493',
  getArchiveChangeSkillTemplate: '13401a052b1da00c37aa4c217c30c9c4cd33870bd0e38268c8f3ee618b02e933',
  getBulkArchiveChangeSkillTemplate: 'c624e817ca7f3505877fe93fe2fd3f164042d109aa7d6c9cd44dd7c55b46e696',
  getOpsxSyncCommandTemplate: 'ee386286c615d39f01ac2a5d5f30c6032adbd76905b66eebfaecc5fa59ee2ebf',
  getVerifyChangeSkillTemplate: 'b49f1525f12e7fd9bda0c8a5a427d47a9b40aea0912e12117c9caaaa7dfe28b1',
  getOpsxArchiveCommandTemplate: '294667d27871ba70e1e64c73ca8db9ac715e666f07e8f2bf6943f9a03a36008c',
  getOpsxOnboardCommandTemplate: 'bd67fa6268294e629593eead96113c899e8638ef386f23514d97aa2e9f686907',
  getOpsxBulkArchiveCommandTemplate: 'ea329cc3fb8b3d8a16f8696479372d9f45320e4728b65cfcc8768d2e123517f6',
  getOpsxVerifyCommandTemplate: '56a7bf4ed7125fcac1bc1d5522cbaf6fd6f57fe819530af618bc37e6f5480e6e',
  getOpsxProposeSkillTemplate: '9e70b2db1bd795d26d8efa07a8ceb1ba96ce430b4e84381ec6461bbde21301ad',
  getOpsxProposeCommandTemplate: '430ebb4195639d18947087fc4bb691539942b4faa061a089dba9b9fd18ec5472',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '2873a815a2a8d885ffc73f3bc89a8c57d3932ab830e98a2589718de4db3e7e7f',
  'openspec-new-change': '2e1cf537d605e39f802f93892ac4d1b347c93b31c65d17d2f6f35c355da1b69e',
  'openspec-continue-change': 'f6cc4cc821fd9ca935aaf11903d204f9e40c373cba7dcff37de981655b6b5f55',
  'openspec-apply-change': '3cab7c0fcf39f5f5e23cc62db63c0f4fa507c0ce7a2357d1c4286c59fa157a8f',
  'openspec-ff-change': 'ddeaca68a911c5974bc3d485e009eec0fd21e1876acf95954a5e25411731ae2c',
  'openspec-sync-specs': '2e0068425fc27012e6bcccc1d6d30979517cdcda991371f2a80bdec175a3c255',
  'openspec-archive-change': 'f996c0604b0365ad2c00eec1a92822ca1f21829972716efdc706a1dfa4038239',
  'openspec-bulk-archive-change': '6666b51fabd46ada2dc6980f1b9af32cd47f02ddd35e05c39dabbd836961b4d6',
  'openspec-verify-change': '47df9c9fab8e89869dce04c8b569d5c8e38bc37fb86db1572fc48abb5c39068f',
  'openspec-onboard': '9933d08f85d2407be0a056da5d2382b42d0917923c6a86026a375c2aa73aaff1',
  'openspec-propose': '132bc248f540e9cdbdf489ebcb3495ebbf28eb7369b47659e52c5dc6e79a504e',
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

  // Iterating the production registries (not a local list) means a newly
  // added workflow is covered automatically; the full-constant containment
  // check fails if any template's interpolation drifts.
  it('teaches store selection in every deployed skill template', () => {
    for (const { template, dirName } of getSkillTemplates()) {
      const content = generateSkillContent(template, 'PARITY-BASELINE');
      expect(content, dirName).toContain(STORE_SELECTION_GUIDANCE);
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
});
