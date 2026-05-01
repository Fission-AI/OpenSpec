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
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
  getOpsxSyncCommandTemplate,
  getOpsxVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: 'c8d805b04f4216e4bcd9ee2561b448e6d4d1ae635f4725ce12deff5199a514d3',
  getNewChangeSkillTemplate: '11a011c13e28dcba1f32216d4dd5e46a7b9fb7493bdc907ee0f0cd1578227478',
  getContinueChangeSkillTemplate: 'bd3b98ee78ead5cec4203fe9e312c8a39390d650a357c244b21d7f5053bd2a4c',
  getApplyChangeSkillTemplate: 'c84f97ad969a9c1793da6949cb5e903f9587589346ee9b885d700f151753ac0f',
  getFfChangeSkillTemplate: 'a6e0eabc7fa5d16315f01b8982b9fddd6849903858963fd2b3881ce9ac33aa9e',
  getSyncSpecsSkillTemplate: 'bee62b4c28de12658f6e556b876bdeaed0977e74859301a4e6ba509d138e9be3',
  getOnboardSkillTemplate: '887cccfd558a4df60bc085250f7bd6d19e77bbbca94244aeff117ef78658e257',
  getOpsxExploreCommandTemplate: 'd16606e9d67c024a633822848681efafbbf99912c59af933c7e682926f16139c',
  getOpsxNewCommandTemplate: '8000acbdc49d16a870ec3a148b25ecc0cc4a14b8f7e2ea5e3d83bf25111bb0ab',
  getOpsxContinueCommandTemplate: '9c423b40b4af382bf71fbd7f38b11f6e5de1671ca81730dee2dc618ff8c239a3',
  getOpsxApplyCommandTemplate: '8f68eb314e21f3eedfd5ebeca07982e7bc4ac3e2b9856a24e653adc6ca53cd0a',
  getOpsxFfCommandTemplate: '3de88bc05d0514577bab0b3232a2fd5167175c4a2772cd7717d0bc036b14c476',
  getArchiveChangeSkillTemplate: 'a0e66a4cdd902c13568f35a4983da0d87f2f2d8fc0ee96bc4ed5a85df1892782',
  getBulkArchiveChangeSkillTemplate: 'dfcadd8bcd8d986b8bc0aa4abfca325dc160a46bc843fc5fa3b8390189574a6b',
  getOpsxSyncCommandTemplate: '6633667cd3726dd8fdd01b4fb6d51292c523c8e4d05ee34ab8f338c7b3e5b90d',
  getVerifyChangeSkillTemplate: 'd30ac8076ddc40f27c6fe73099abdbc382e0a2e58603ae26ebe4f30dc071dc65',
  getOpsxArchiveCommandTemplate: '8830bb1bb113cb79cbb192e2bc4feebb3a1b5071bdf59ba05b151b9ce79a6f81',
  getOpsxOnboardCommandTemplate: '313342d9c678b153e15eb494c5dc97c7e73ba5968a2494f114239121a9b34ce3',
  getOpsxBulkArchiveCommandTemplate: 'adc22ad61f2c5a7f06b28bacb1f1d20631511363912f462f9c9482ac513fafde',
  getOpsxVerifyCommandTemplate: 'c468e2841df71642d27d22fd00e5a13ada8f4172187b52a02aa4f511173eb96a',
  getOpsxProposeSkillTemplate: 'f49ceeab9fb084d5540d45f1b93955b78b1cd3d06a1b57949a432ea5122a964c',
  getOpsxProposeCommandTemplate: '6843b073c38dbb25561fa3d2d2b6b0a443f3914564f44f700bff729493f65b6a',
  getFeedbackSkillTemplate: '087c098185bfc7067fc89fab113ce7cf0df6b5c41138f4f869389f2e2daf0118',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'a0516b5dc95782ed95064c75ee6dce39116926517eab2f7d7c831710fd7e9274',
  'openspec-new-change': '72a95f764995415608878711bb87e9b0b010ff9331842b84c57835bf8d9387e7',
  'openspec-continue-change': '7557f268a839dd06fe2c6f00f9332e40efd7ed8cffe37da02a6149610c0f7a5b',
  'openspec-apply-change': 'af5da65ec8d8c2202051f3652d7febbf833a233e57bbc3559e36feac671050a3',
  'openspec-ff-change': 'b8e15b22ebcb099fa7f1c9478d960f4894ca97b91ea35427de4afef782133ae7',
  'openspec-sync-specs': 'ecf994fdee9fc3a1433ed4043ce1a37117ddfd75c1aa44ca8c5a43003587c8be',
  'openspec-archive-change': '21abccc89a88ab0d5e3293333ae44fbe6394020d975091c524016777b84b5d96',
  'openspec-bulk-archive-change': '64e81a661882d4a534c218ab71a16de6628377afcbe5859e393079f100af1997',
  'openspec-verify-change': '75fb464069eb0d61bef15f39ba90d64021741065152b7d3c14ab7d475ab03f8a',
  'openspec-onboard': 'e6098092a706c304a7ce8e944575f83e7c11de6701e67aae7553e2e1e857706a',
  'openspec-propose': '94f406b91d410d3bef66df1819ac8462c13a58ce0e2812921eb08ea09b9ca265',
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
