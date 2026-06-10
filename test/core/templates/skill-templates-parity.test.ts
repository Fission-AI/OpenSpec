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
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: '5580ff5db2be6fdd721ac51def4295e1f7bd3635d3606c7c5cff1e8c3f71f89c',
  getNewChangeSkillTemplate: 'da2add8f373f05b271be8fba4008b96974a4455b9f04d3a0c7317c03687e0b25',
  getContinueChangeSkillTemplate: 'e6c818c5598e019b0767e1662c319142cba3b90bd1200146a8cbb540db87ec8b',
  getApplyChangeSkillTemplate: 'e51d3e347b9d497d4abf30586d81086c5d35239efc6cee89873e5118d783ca2a',
  getFfChangeSkillTemplate: '5ee79ba3cb3a88c99064a41216f1defa1337c778c95d7d7c8616e1a5f30fde79',
  getSyncSpecsSkillTemplate: 'a0b209d22b5f7c8f631f662efce1d6699c01f3884419effdd29b8450414bd0f8',
  getOnboardSkillTemplate: '04f889f2f02f9d8aca4c3d4a9ec61163d0f1630cdd361d162b8f8e0e48737a1d',
  getOpsxExploreCommandTemplate: '68a44e036984224e5f1c82f1f930b76a71459e3c7f041cf952d0cac9f253d984',
  getOpsxNewCommandTemplate: 'a300d31247f02b206d4042a6c3bb73e823575c299b31a0fc96630cb2353bd79f',
  getOpsxContinueCommandTemplate: '86a1ef4616ca6455598ca7b318fcf5590f8b892437219a16f20b9fb1254cf49c',
  getOpsxApplyCommandTemplate: '970d538808ae9692491b3840382a55b29948820262c490e3afaf9ce2d1e87b58',
  getOpsxFfCommandTemplate: '892b09ff4dbc6ea842ff6ed3f5694506701388266237a026924fe52985dfb54b',
  getArchiveChangeSkillTemplate: '59f499a70391aa5edb8a8a01cfaac4089f22611d509215c5733df2d4d4e8fe3f',
  getBulkArchiveChangeSkillTemplate: '0a40a576d2029853423c54686c07c300317a43f94b8e0f9433b441025b41e513',
  getOpsxSyncCommandTemplate: 'e789bd8585f38f44353dfc381d31e92f45e8829f0fe6fd8c591d9163067232d2',
  getVerifyChangeSkillTemplate: '73d0c0f095c4da0fca551d26a5df2a996e4c4936c704f6635ae8ccf4439ee5c8',
  getOpsxArchiveCommandTemplate: '0db39b144b0e8a53e0312799575a32ab66d65b15251e590034baba409f6558d8',
  getOpsxOnboardCommandTemplate: '69e94c11e23855825ab5362bd95bab82b402790a7a984a926bd4784372fa6f2a',
  getOpsxBulkArchiveCommandTemplate: '809edaaed34821b73ea4bc20fc23557307def6b437642bfd1e1a3c3a9de6696c',
  getOpsxVerifyCommandTemplate: '9b5d4578e26b220c8b3446ccb667720bd051e6f5767de32fb22ab8d696dffb75',
  getOpsxProposeSkillTemplate: '41f3692a1849b5959375fc1df47c91b331bcb900a9a0aa645078e397451920b3',
  getOpsxProposeCommandTemplate: 'a0f8819b64a468c13469655ca929d84b05b84b038b0a5ce7ef3a087f85074f3b',
  getFeedbackSkillTemplate: '0e7ddd56b369d496769320595ca47d52a7f4d7e833b05fd44ea40b39ac186cd1',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'enpalspec-explore': '1b973f8a163eb1a53f240b23d89a72b81027eaefe2e71311d1f6ab59b49e1197',
  'enpalspec-new-change': '0334e8f6cd05eebc003c0f667898f23677561cac5e08933f7b89addb064b2ee5',
  'enpalspec-continue-change': '6b4a5a43040559a901bb5f16144ed02ce138621e4c7df38a4ca1eaa7a23bcc21',
  'enpalspec-apply-change': '670704b3bee11acd3eeaf96caadd7e35df43ad546e52ec696b2ff3b705d5d6cf',
  'enpalspec-ff-change': '03111dc44003355490c04e15d515ac962f28079088356d1e08a3299a311b705f',
  'enpalspec-sync-specs': '5df3e01f73093e623d4d5583d80d9c53cdd46c9b066079200a9c23b4fcb31fe4',
  'enpalspec-archive-change': '221c3a87eb9cffb7996cf606086c750eb78a29031b9f6b7bca7c9783e0f607a5',
  'enpalspec-bulk-archive-change': 'af0f4be076590f663b1dff9c29bb8a799150782487ff270f8c74744d41795d9d',
  'enpalspec-verify-change': '9211081476d04cc04b4afacc5caa2bca28c41b8e5397b8651344f1197ddd036d',
  'enpalspec-onboard': '3c8520790bac33b53aca1c61b93d14f4d6b917e6ae1d7676b69200752b102817',
  'enpalspec-propose': 'ceac57f203d22913f642e0bcbd0d2832429f81c26279120a2b3b19945833bd30',
};

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
    // Intentionally excludes getFeedbackSkillTemplate: skillFactories only models templates
    // deployed via generateSkillContent, while feedback is covered in function payload parity.
    const skillFactories: Array<[string, () => SkillTemplate]> = [
      ['enpalspec-explore', getExploreSkillTemplate],
      ['enpalspec-new-change', getNewChangeSkillTemplate],
      ['enpalspec-continue-change', getContinueChangeSkillTemplate],
      ['enpalspec-apply-change', getApplyChangeSkillTemplate],
      ['enpalspec-ff-change', getFfChangeSkillTemplate],
      ['enpalspec-sync-specs', getSyncSpecsSkillTemplate],
      ['enpalspec-archive-change', getArchiveChangeSkillTemplate],
      ['enpalspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
      ['enpalspec-verify-change', getVerifyChangeSkillTemplate],
      ['enpalspec-onboard', getOnboardSkillTemplate],
      ['enpalspec-propose', getOpsxProposeSkillTemplate],
    ];

    const actualHashes = Object.fromEntries(
      skillFactories.map(([dirName, createTemplate]) => [
        dirName,
        hash(generateSkillContent(createTemplate(), 'PARITY-BASELINE')),
      ])
    );

    expect(actualHashes).toEqual(EXPECTED_GENERATED_SKILL_CONTENT_HASHES);
  });
});
