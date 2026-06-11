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
  getApplyChangeSkillTemplate: '8a0f6c07869121bcb74211da0832b157ccd3123b22d841f5fc408ccd123bc33f',
  getFfChangeSkillTemplate: '84290fc5054fe0dfdb7b8d80f51a840afc2a5b02913ccf336e6d36d63f137572',
  getSyncSpecsSkillTemplate: '23a87e17e48ec4b59e3aad79a4bf8d0980e6b136a93548c75d0bfe5ac4e5ad4e',
  getOnboardSkillTemplate: '962acddc522830c0ea6688a9cc63a604aef9b78e127c5e01f0f50b1d082f03df',
  getOpsxExploreCommandTemplate: 'cfd3e5fffae04ad656db492f540e0746d266f35d5e0547c5b4ce05f31f23a634',
  getOpsxNewCommandTemplate: '41016b092634691a655f6bb9d58e4c07ecb5d196c229923344fd03e48737c570',
  getOpsxContinueCommandTemplate: 'f38877a42944326761175a11fa65eacab64f492041ce7cc6de9f6d0af8859435',
  getOpsxApplyCommandTemplate: 'e9512c446567b71de711fbb2ec4e4082b2088edd665157736ab0832dc1c9a9f7',
  getOpsxFfCommandTemplate: 'a0d2ed4ca12f2a3dd21e6cd1ca4a4288a06ef02d56121f3f187c9bcb17ef4493',
  getArchiveChangeSkillTemplate: '067eb8022f6dfcaaa6c77bb7982d47da2c128cac0bac83bb4621596c67a703fb',
  getBulkArchiveChangeSkillTemplate: 'f28cd6b6e390b4db53986e5d79bb3dc3e6269431a324b1b76acffc3c151b09a7',
  getOpsxSyncCommandTemplate: '7871f5b9e3077e52d644cb826d31c5eb1fe581b1ac8fce5b9c7e3a8741c7dbe6',
  getVerifyChangeSkillTemplate: 'a783daa17b6ad865bcd0c87c4ca9bfcf11de10e9da3de70fc1aa5ba2c0884a56',
  getOpsxArchiveCommandTemplate: 'e335a2301a3689d8760c4793f971885227366edc3c63b81a7b00e2301e93aa22',
  getOpsxOnboardCommandTemplate: 'bd67fa6268294e629593eead96113c899e8638ef386f23514d97aa2e9f686907',
  getOpsxBulkArchiveCommandTemplate: '235a2f3cae105c41a86baf058bbb6ebd384f26da2184eab3871fde343e07ae66',
  getOpsxVerifyCommandTemplate: 'e7cfe39290d6cd1095d61b1685d7a5db20e4d15f087971809ef960a67aa82bef',
  getOpsxProposeSkillTemplate: '9e70b2db1bd795d26d8efa07a8ceb1ba96ce430b4e84381ec6461bbde21301ad',
  getOpsxProposeCommandTemplate: '430ebb4195639d18947087fc4bb691539942b4faa061a089dba9b9fd18ec5472',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '2873a815a2a8d885ffc73f3bc89a8c57d3932ab830e98a2589718de4db3e7e7f',
  'openspec-new-change': '2e1cf537d605e39f802f93892ac4d1b347c93b31c65d17d2f6f35c355da1b69e',
  'openspec-continue-change': 'f6cc4cc821fd9ca935aaf11903d204f9e40c373cba7dcff37de981655b6b5f55',
  'openspec-apply-change': '777b98239a51e67be079003e458209a3b5f8b93d45f2e06c816942856842c0e7',
  'openspec-ff-change': 'ddeaca68a911c5974bc3d485e009eec0fd21e1876acf95954a5e25411731ae2c',
  'openspec-sync-specs': '83d382e490774e1c5e0108412d6271edb3016abb9ecf66db5a689200f1aec377',
  'openspec-archive-change': 'aa29c71def6773f523cd353b7fc4ee9c3bfba2419f7aca53f38b82cf934a8a55',
  'openspec-bulk-archive-change': '94d0e2f888d42a271bac9977f3a052badeb7bef36847123d97a37fe9f16cf385',
  'openspec-verify-change': '51f007d18f19c9964c67cd9612f9324b2fa0956d35f37a4cca4609e53bfd00f1',
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

  it('guards unsupported workspace workflows from repo-local fallback edits', () => {
    const guardedSkills: Array<[string, () => SkillTemplate, string]> = [
      ['openspec-apply-change', getApplyChangeSkillTemplate, 'full workspace apply is not supported'],
      ['openspec-sync-specs', getSyncSpecsSkillTemplate, 'workspace spec sync is not supported'],
      ['openspec-archive-change', getArchiveChangeSkillTemplate, 'workspace archive is not supported'],
      ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate, 'workspace bulk archive is not supported'],
      ['openspec-verify-change', getVerifyChangeSkillTemplate, 'full workspace implementation verification is not supported'],
    ];

    for (const [dirName, createTemplate, guardText] of guardedSkills) {
      const content = generateSkillContent(createTemplate(), 'PARITY-BASELINE');

      expect(content, dirName).toContain('actionContext.mode: "workspace-planning"');
      expect(content, dirName).toContain(guardText);
      expect(content, dirName).not.toContain('openspec/changes/<name>');
      expect(content, dirName).not.toContain('mv openspec/changes');
    }
  });
});
