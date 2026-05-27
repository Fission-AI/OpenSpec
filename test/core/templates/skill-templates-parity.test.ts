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
  getPastelApplyCommandTemplate,
  getPastelArchiveCommandTemplate,
  getPastelBulkArchiveCommandTemplate,
  getPastelContinueCommandTemplate,
  getPastelExploreCommandTemplate,
  getPastelFfCommandTemplate,
  getPastelNewCommandTemplate,
  getPastelOnboardCommandTemplate,
  getPastelSyncCommandTemplate,
  getPastelProposeCommandTemplate,
  getProposeSkillTemplate,
  getPastelVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getApplyChangeSkillTemplate: 'a863bf01562b6cb688ad613bdd30a98c50585d650481ad99be101fda00a8c59a',
  getArchiveChangeSkillTemplate: 'f55e21bd698ba7ba8a6e28939658929c6f3c62d2a888565a0724b5c52c6201cc',
  getBulkArchiveChangeSkillTemplate: 'e8e63d98496ddde8cf9bd34932d8c637a617b7bb706d1f89a5cae9abdf790825',
  getContinueChangeSkillTemplate: '370775c5b80426219abf2c82c4e2900a1d5edc4798454d756c03a9779abb3b16',
  getExploreSkillTemplate: 'f4ab9b34a031810d745e713239eada726536179458555946aedc7d55fd7ebe4e',
  getFeedbackSkillTemplate: '51eaac6cd0b7f845c4ef104bc34cad345e7b4c05a37126e1e9489bcab41bd010',
  getFfChangeSkillTemplate: '84eaef90a7855a872dfe0123beea18a699d5c7118e1278c999f556da56e49bd3',
  getNewChangeSkillTemplate: '61207953f7486f53519e9a0bda31d417aeb13de1c1b3c7a682f30172f9792beb',
  getOnboardSkillTemplate: 'db1cdee76bc7c28d7477f7fb44e2485bcb2eaa2cd30d99ca99330bbfb51f140f',
  getPastelApplyCommandTemplate: 'a5e9e2ec3f6b56e4501d82e7be5f16233fddb16d90a63614a1e020fa09ab8b2f',
  getPastelArchiveCommandTemplate: 'a31dcb0fee32f20413f6349e7bec983f445ee46ec9c9a66674c8c5cffef357b0',
  getPastelBulkArchiveCommandTemplate: '7f8b309f1c33feba7a94f5bf5ada6816bda532ee42176c04dc7426c22da36cab',
  getPastelContinueCommandTemplate: '95be9e67b6467f4ce5f684db746375f493864015c18a40d298d440fe82c71551',
  getPastelExploreCommandTemplate: '1539c50d9a6f9d0fe226c9d8ca47b0db910c141394c09ff121e4799f765063d7',
  getPastelFfCommandTemplate: 'ba29961843584631999bdbf9b94c97ecd443496e76631d7b48c4267235c2dfc5',
  getPastelNewCommandTemplate: '9dfc6dd295477fbb82ca958190d8793fe65bcce5b76d19f4df3b7c44bedbc109',
  getPastelOnboardCommandTemplate: '18b20097f970bd7331caaec769115b122f66f3d3bc927f8a51e69f5cd4f0e00b',
  getPastelProposeCommandTemplate: '5f163cb90350290c92866fc768796b2ba8f1a75a6347421d7cc1a5274af8730a',
  getProposeSkillTemplate: '103c4cf389a816fcc9bdb9d50f10810a2bbf01f0ee7ddc2f670d054b4aa19cfc',
  getPastelSyncCommandTemplate: 'aa302e61b6ab69e40a1fd7de64f0aab86aae44b31ebc7beb6f50a12e3b210167',
  getPastelVerifyCommandTemplate: '440ec9b6abc6071e9fcc1e5035b1b464d737a6ec2c12c39e4503ccaf5e4d79b3',
  getSyncSpecsSkillTemplate: 'cd604ed04c77746839321108daa525f6b1dd1894903264a8da0e2d73205c600c',
  getVerifyChangeSkillTemplate: '2cbec20d55f154d7e62e4df79cbe59847b8a2646c84fbb389bcfafb2e4ff2795',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'pastelsdd-apply-change': 'fc6857e548c32dcac706cb459342d2e672cb6173e4052c09755340f210b36a0c',
  'pastelsdd-archive-change': '24c60980e42eee036a41159fdbd33573c2f521e5e5d7f2022fc57649583335fe',
  'pastelsdd-bulk-archive-change': '54f2251eb0964d683376225dd945b39cbcba202a5bb24da386b2eee51fb41f5a',
  'pastelsdd-continue-change': 'f66c8b88cfb17cacf83b7debd36eff3f43d4742c195f59bc17f47e258bd349c8',
  'pastelsdd-explore': '6af18d41ec92a3a5a2ec8b28254032ff263f741348434e97bcb83f431fec042d',
  'pastelsdd-ff-change': '9b3afddc1a60168c0a77f273df872881e4d996d1bf57d595f49baf1e80e52b99',
  'pastelsdd-new-change': '3250b61ea1ac8596434ec0d4667212a75e61ff38e90934ad127740ef33b7e0de',
  'pastelsdd-onboard': '387db79a422eba8870996d04626e97c6ad4dea27cabc332309a4dc56060f813a',
  'pastelsdd-propose': '8d98abe1d601cd03c0a9b78cd10da2f2fd3a1c5964dc77f1c61b6553d28412ec',
  'pastelsdd-sync-specs': '6b429a590d1b1c326e7a55667bf68df52942171dcfa3c0ca29ad1db1457c4493',
  'pastelsdd-verify-change': 'ed1b5ed7013d3c6bc90381a32a39dc46240e70cbdbb91da10d4422e5cecb7920',
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
      getPastelExploreCommandTemplate,
      getPastelNewCommandTemplate,
      getPastelContinueCommandTemplate,
      getPastelApplyCommandTemplate,
      getPastelFfCommandTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getPastelSyncCommandTemplate,
      getVerifyChangeSkillTemplate,
      getPastelArchiveCommandTemplate,
      getPastelOnboardCommandTemplate,
      getPastelBulkArchiveCommandTemplate,
      getPastelVerifyCommandTemplate,
      getProposeSkillTemplate,
      getPastelProposeCommandTemplate,
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
      ['pastelsdd-explore', getExploreSkillTemplate],
      ['pastelsdd-new-change', getNewChangeSkillTemplate],
      ['pastelsdd-continue-change', getContinueChangeSkillTemplate],
      ['pastelsdd-apply-change', getApplyChangeSkillTemplate],
      ['pastelsdd-ff-change', getFfChangeSkillTemplate],
      ['pastelsdd-sync-specs', getSyncSpecsSkillTemplate],
      ['pastelsdd-archive-change', getArchiveChangeSkillTemplate],
      ['pastelsdd-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
      ['pastelsdd-verify-change', getVerifyChangeSkillTemplate],
      ['pastelsdd-onboard', getOnboardSkillTemplate],
      ['pastelsdd-propose', getProposeSkillTemplate],
    ];

    const actualHashes = Object.fromEntries(
      skillFactories.map(([dirName, createTemplate]) => [
        dirName,
        hash(generateSkillContent(createTemplate(), 'PARITY-BASELINE')),
      ])
    );

    expect(actualHashes).toEqual(EXPECTED_GENERATED_SKILL_CONTENT_HASHES);
  });

  it('guards unsupported workspace workflows from repo-local fallback edits', () => {
    const guardedSkills: Array<[string, () => SkillTemplate, string]> = [
      ['pastelsdd-apply-change', getApplyChangeSkillTemplate, 'full workspace apply is not supported'],
      ['pastelsdd-sync-specs', getSyncSpecsSkillTemplate, 'workspace spec sync is not supported'],
      ['pastelsdd-archive-change', getArchiveChangeSkillTemplate, 'workspace archive is not supported'],
      ['pastelsdd-bulk-archive-change', getBulkArchiveChangeSkillTemplate, 'workspace bulk archive is not supported'],
      ['pastelsdd-verify-change', getVerifyChangeSkillTemplate, 'full workspace implementation verification is not supported'],
    ];

    for (const [dirName, createTemplate, guardText] of guardedSkills) {
      const content = generateSkillContent(createTemplate(), 'PARITY-BASELINE');

      expect(content, dirName).toContain('actionContext.mode: "workspace-planning"');
      expect(content, dirName).toContain(guardText);
      expect(content, dirName).not.toContain('pastelsdd/changes/<name>');
      expect(content, dirName).not.toContain('mv pastelsdd/changes');
    }
  });
});
