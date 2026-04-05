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
  getExploreSkillTemplate: 'ad8aa016932952a9295c54ef592447f03fac1695905bfebeb8a2ea54fc3303fc',
  getNewChangeSkillTemplate: '5989672758eccf54e3bb554ab97f2c129a192b12bbb7688cc1ffcf6bccb1ae9d',
  getContinueChangeSkillTemplate: 'f2e413f0333dfd6641cc2bd1a189273fdea5c399eecdde98ef528b5216f097b3',
  getApplyChangeSkillTemplate: '48a9173d8b201f9db955e40fa53d03824eaa1a8b26529dd00b5bd00cd3e5fbe9',
  getFfChangeSkillTemplate: '3bc8740c011bbf7f124db4eed3e96ca76ed1a4aa54f96674e8c57d47354f7b18',
  getSyncSpecsSkillTemplate: 'bded184e4c345619148de2c0ad80a5b527d4ffe45c87cc785889b9329e0f465b',
  getOnboardSkillTemplate: '2ff347ce9f2724f7ab02111ffd5f7e00d34512a654070e3c4ce77d993725dbf6',
  getOpsxExploreCommandTemplate: 'd38a064445b077d63135f544a4fdcc4c01bb3e77e451403ea16d099b0a6a6c0f',
  getOpsxNewCommandTemplate: 'f800f4635b7381ec392ca2b140fe74fd2c9be947f23367214a8f69640b58013f',
  getOpsxContinueCommandTemplate: 'e1ca122fd6a92243c4b7f91349b457bd1e904cad9c84ffa938b334eceb379525',
  getOpsxApplyCommandTemplate: '02cdb27b54c520309aeeeac44a1bb99e540c7a4ae7ec064614ce5939b7305de0',
  getOpsxFfCommandTemplate: '64e3d0830998cebc1f7b428a3822aa785dadd6bf384cda097d80f2f464463a14',
  getArchiveChangeSkillTemplate: '6f8ca383fdb5a4eb9872aca81e07bf0ba7f25e4de8617d7a047ca914ca7f14b9',
  getBulkArchiveChangeSkillTemplate: 'b40fc44ea4e420bdc9c803985b10e5c091fc472cdfc69153b962be6be303bddd',
  getOpsxSyncCommandTemplate: 'd557936427ee9efb6ee39c27c657892ac645e71c4eda3d889de28df079f9ac67',
  getVerifyChangeSkillTemplate: '63a213ba3b42af54a1cd56f5072234a03b265c3fe4a1da12cd6fbbef5ee46c4b',
  getOpsxArchiveCommandTemplate: '6d17674f9fa2c9b2bdcf64732b965534e329139cbdd324f450b960751a593d7b',
  getOpsxOnboardCommandTemplate: '3aaed5d2d7388790233b5a348581c18081ad379856c22c9aa3097155676660c9',
  getOpsxBulkArchiveCommandTemplate: '16fcb156a9a50078e834261b4d0ddce1e33b8e791bedf34596e15fdabf91a930',
  getOpsxVerifyCommandTemplate: 'ba0d9f9b679ae5585dfdce7535cc98e52d6f02cf66c4d468976f1ef1ea32892d',
  getOpsxProposeSkillTemplate: '769f79aa2addf577f6acadde5b45618773192a1438daea59a5857bb800252841',
  getOpsxProposeCommandTemplate: '675793c7bcabbe4d91b139ee34c784bc91074a8b1741808323b90c2093378876',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '0f9be2435de07841ae89969335206319418ffa302557dae7ae281026638e306e',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': '463cf0b980ec9c3c24774414ef2a3e48e9faa8577bc8748990f45ab3d5efe960',
  'openspec-apply-change': '0d2b9402da87dad71e956b669d61f4e58db7a93f760cfffb314831be06549578',
  'openspec-ff-change': '5905fbf9aa1aaadc704dec4a10be1b724b68ac4a5373e0866e56a8822d7db689',
  'openspec-sync-specs': 'b8859cf454379a19ca35dbf59eedca67306607f44a355327f9dc851114e50bde',
  'openspec-archive-change': 'f83c85452bd47de0dee6b8efbcea6a62534f8a175480e9044f3043f887cebf0f',
  'openspec-bulk-archive-change': 'a235a539f7729ab7669e45256905808789240ecd02820e044f4d0eef67b0c2ab',
  'openspec-verify-change': '30d07c6f7051965f624f5964db51844ec17c7dfd05f0da95281fe0ca73616326',
  'openspec-onboard': '435b5678b19c7cf083880f13ada549e3168a96128beff90f29ae8db44a0da05c',
  'openspec-propose': '8e01fd8ee8f9568a111b0a53780befb5e79da304cfa32c2437cd078da96880d6',
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
