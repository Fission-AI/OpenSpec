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
  getApplyChangeSkillTemplate: '32c5a9836e2cfe8a26d6093e6b53862aad94824ef1bd1af0a75ecd41c204d292',
  getArchiveChangeSkillTemplate: 'eedf7639d297bfe3246fcd7b85a6a61de5e512ee592dad0398dafacbcb04bb81',
  getBulkArchiveChangeSkillTemplate: 'e8e63d98496ddde8cf9bd34932d8c637a617b7bb706d1f89a5cae9abdf790825',
  getContinueChangeSkillTemplate: '370775c5b80426219abf2c82c4e2900a1d5edc4798454d756c03a9779abb3b16',
  getExploreSkillTemplate: 'e39750b656be254b404e803eb0efe112d0cb2e7d18602150012685f2993840b6',
  getFeedbackSkillTemplate: '51eaac6cd0b7f845c4ef104bc34cad345e7b4c05a37126e1e9489bcab41bd010',
  getFfChangeSkillTemplate: '84eaef90a7855a872dfe0123beea18a699d5c7118e1278c999f556da56e49bd3',
  getNewChangeSkillTemplate: '61207953f7486f53519e9a0bda31d417aeb13de1c1b3c7a682f30172f9792beb',
  getOnboardSkillTemplate: 'db1cdee76bc7c28d7477f7fb44e2485bcb2eaa2cd30d99ca99330bbfb51f140f',
  getPastelApplyCommandTemplate: '7443afd3e7210c30531837d1ab3c0274224c62b8f3bdd051b0abfaceed5bee4b',
  getPastelArchiveCommandTemplate: 'b6297c17267b5e1be449eab7b708a10dc1ffc39eacd851831a5bc6dfb6850203',
  getPastelBulkArchiveCommandTemplate: '7f8b309f1c33feba7a94f5bf5ada6816bda532ee42176c04dc7426c22da36cab',
  getPastelContinueCommandTemplate: '95be9e67b6467f4ce5f684db746375f493864015c18a40d298d440fe82c71551',
  getPastelExploreCommandTemplate: '0e4386ebc79c5803c071cdd23e8ff9899414e44f02965e2ad21c86d3eabcef7c',
  getPastelFfCommandTemplate: 'ba29961843584631999bdbf9b94c97ecd443496e76631d7b48c4267235c2dfc5',
  getPastelNewCommandTemplate: '9dfc6dd295477fbb82ca958190d8793fe65bcce5b76d19f4df3b7c44bedbc109',
  getPastelOnboardCommandTemplate: '18b20097f970bd7331caaec769115b122f66f3d3bc927f8a51e69f5cd4f0e00b',
  getPastelProposeCommandTemplate: 'c35232a2375116af7cbc97d1520db9a1fb8bd835e759b9340256c989b3085ac0',
  getProposeSkillTemplate: 'b80341b633429a546ff2685369c9deff79dd7e9a02842a864686b60c65a270b8',
  getPastelSyncCommandTemplate: 'aa302e61b6ab69e40a1fd7de64f0aab86aae44b31ebc7beb6f50a12e3b210167',
  getPastelVerifyCommandTemplate: '440ec9b6abc6071e9fcc1e5035b1b464d737a6ec2c12c39e4503ccaf5e4d79b3',
  getSyncSpecsSkillTemplate: 'cd604ed04c77746839321108daa525f6b1dd1894903264a8da0e2d73205c600c',
  getVerifyChangeSkillTemplate: '2cbec20d55f154d7e62e4df79cbe59847b8a2646c84fbb389bcfafb2e4ff2795',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'pastelsdd-apply-change': '51c7e7848d26531f683dc42a9449224991bafe3ae4bd6f4ec19b6422ad922703',
  'pastelsdd-archive-change': '74c8829e5666cc1e60bccc38dbce389b75c1f0ce1e665fed8ed7cf4fd64b1600',
  'pastelsdd-bulk-archive-change': '54f2251eb0964d683376225dd945b39cbcba202a5bb24da386b2eee51fb41f5a',
  'pastelsdd-continue-change': 'f66c8b88cfb17cacf83b7debd36eff3f43d4742c195f59bc17f47e258bd349c8',
  'pastelsdd-explore': '1d5a70b0dc2e057b6c8483979d7c032f19a1320d8e38a6bd69c0a8eb557bf998',
  'pastelsdd-ff-change': '9b3afddc1a60168c0a77f273df872881e4d996d1bf57d595f49baf1e80e52b99',
  'pastelsdd-new-change': '3250b61ea1ac8596434ec0d4667212a75e61ff38e90934ad127740ef33b7e0de',
  'pastelsdd-onboard': '387db79a422eba8870996d04626e97c6ad4dea27cabc332309a4dc56060f813a',
  'pastelsdd-propose': '2b44d000a84773bddbe9e9a1ea4297762bf9da90130bd9c2cb921750aff87003',
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
