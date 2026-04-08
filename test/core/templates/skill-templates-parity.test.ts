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
  getExploreSkillTemplate: 'fc6590e2e6134b99230e634879bde6bf78b259e0f01b6bc27432f9e2bb9121cf',
  getNewChangeSkillTemplate: '84537d8c56fcf2b6ceb8b5770523978ce8ff05a7a78d2b7f41cacb7a97628151',
  getContinueChangeSkillTemplate: '3ed279102ee371abd7919a04ed50793df4a5c00ca7d8c969d1e8a22e3d8443a2',
  getApplyChangeSkillTemplate: 'b144a93462e7f0af9c88708f02714ad8cc9fa8861c2fe0eb772d96996297422e',
  getFfChangeSkillTemplate: 'a5a1ccc117d8cae18da342aa6e3e54fbfcf809dc2456db5dc1e10f5c2a87850e',
  getSyncSpecsSkillTemplate: '3af88a53c48648c8c83de27d06c953a0eeec220657f3b7e1b2a70eb5789ee25f',
  getOnboardSkillTemplate: '139ebd39a3e4a97337ab326c8e9b4cba38b89e43ae6dc8916983904994633c6a',
  getOpsxExploreCommandTemplate: '0fac843f1ebda93922c2ad9f7bd561aec45fca4c83690e71a827a6d697b8815e',
  getOpsxNewCommandTemplate: 'a300d31247f02b206d4042a6c3bb73e823575c299b31a0fc96630cb2353bd79f',
  getOpsxContinueCommandTemplate: '7fc5831887d533beb75b32c7b5229bd52e2fc7567ab1a541ea696b7da78f3329',
  getOpsxApplyCommandTemplate: '2ce7ba02e5cfc1c041f7af440c19860fb65cd199913fd0a39ba6ba1e575d6bb0',
  getOpsxFfCommandTemplate: '892b09ff4dbc6ea842ff6ed3f5694506701388266237a026924fe52985dfb54b',
  getArchiveChangeSkillTemplate: 'd3473af0d15bba416480d395ff87eb87871c22807f9dd764a9172c1f4095b742',
  getBulkArchiveChangeSkillTemplate: '2b2c3224cc774c62acfd36f2e9320c97f652a972a80f6f1dc3cf0f87c31d8d16',
  getOpsxSyncCommandTemplate: 'e789bd8585f38f44353dfc381d31e92f45e8829f0fe6fd8c591d9163067232d2',
  getVerifyChangeSkillTemplate: '1a9b23699f8f63ddd410f4efbc701d4123f56950d8db66c473f5d194f26604f0',
  getOpsxArchiveCommandTemplate: '6c2c18b257899d853eefc46a2e0b8b9dbb70c92277a47bfcb011a0ce510d8534',
  getOpsxOnboardCommandTemplate: '7951caa6a4694faeb0c244b6f7afe4257a1ede6c7c04a11db40727f51d2573fe',
  getOpsxBulkArchiveCommandTemplate: 'dac8e19849e5c5f97360d5587b2bb19346108553139fc14c2d97dfab45af9e33',
  getOpsxVerifyCommandTemplate: 'fbaba5b91b1d1ca40ab71053979254bb0641a7c1362480ca70cdb3a2919a0fa7',
  getOpsxProposeSkillTemplate: '348b893a5bdb1ee4149bca42851692fdb2d2c21c05ea93b7aa96715919ffcc70',
  getOpsxProposeCommandTemplate: '873f6ab0f2f1274b1ad82898dd6a46b8e1e97db4212338c8cb989af4aad52f4c',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '815b538a82d73cf08362bc34b93f70ac17b24141375f06965c9990d47def5ec3',
  'openspec-new-change': '032e797a20b91d646e18add990562caa959fd8aac7547092c16186a24ffa1a3d',
  'openspec-continue-change': '7a457b76c667906a643863984a9e594ea5a89693951cde5f6c7f07e0586b6c0b',
  'openspec-apply-change': '5c3eda83b0ec58f2ed9057b023eec12719879eb2d482a0d6412297f970eb289a',
  'openspec-ff-change': 'e8c3d447c989dfde5f7803fc574e2915bd93900c7268e5707e0dab084b43a4e2',
  'openspec-sync-specs': '14b923de8a1a1a5bf672e65d6b938a13719bd0e2b0758cc3155178febce90ab7',
  'openspec-archive-change': '36611d9eb893e0bb186ba62a681e11e8bf400c80f743dadbd52b42805fb3869f',
  'openspec-bulk-archive-change': '7ac65c19266c9022ee9c316a62bce04fceb0fbb467c9d2f435cd25b02ec407eb',
  'openspec-verify-change': '6bbed00331cde53fbc9a39e3c3e068e0e5a05e499d7262c5bcb11158cbc620a9',
  'openspec-onboard': '423891dd4a1d55e41422d7daca9ed0989a6cb78aa335ba2d1842f9b00a3f317c',
  'openspec-propose': '739a34daef0720c6393ee7fb4cf3332e47ccd8147bee0b852b207a48220b5daf',
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

    const actualHashes = Object.fromEntries(
      skillFactories.map(([dirName, createTemplate]) => [
        dirName,
        hash(generateSkillContent(createTemplate(), 'PARITY-BASELINE')),
      ])
    );

    expect(actualHashes).toEqual(EXPECTED_GENERATED_SKILL_CONTENT_HASHES);
  });
});
