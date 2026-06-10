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
  getExploreSkillTemplate: '90dc37c41de015365fbfb933133750a9678c9f919d12a962004e49acb9cdbbd3',
  getNewChangeSkillTemplate: '8aa104909c521680964e69e607e1039b0c9b575b8b5d4ce58a4de831f0ca2c9d',
  getContinueChangeSkillTemplate: 'c6360c4112711bdfad056dbb70d75045f09e02ec1d166b7b74a3d82280c898e3',
  getApplyChangeSkillTemplate: '5defbf984745678b99b3be07a194f838816976948a529a42a798312e161eff61',
  getFfChangeSkillTemplate: 'c5a0764d17965fd16c9724cfa0c08d5a53346f14565887d739e78b9427ce85e4',
  getSyncSpecsSkillTemplate: 'e2a1297758fc4a93b61e1b74aece0e34020dd42c3ef6b794fef90e0aea09622a',
  getOnboardSkillTemplate: 'f18835513aee2bf0661cb124b0100d0bd9a3aa1c28227e3edb41c4d0d10916d9',
  getOpsxExploreCommandTemplate: '9753f9ed9bd1ddbd5680f8aae2527941cbcd9dcbc55b69fdd2e476c90b2f2774',
  getOpsxNewCommandTemplate: 'd53c52a83e766609c4487a96eb485e37a3687a7c183530aac397c3f728ea3ea8',
  getOpsxContinueCommandTemplate: 'f20dcce5114ea59f1fd7c282cce6e1e30997259f5104d7fdf4364a156f5729af',
  getOpsxApplyCommandTemplate: '83278ff5549bb1c4f5e306c3b4919dc579360d73bae7b63b8a98c011ad10e1a0',
  getOpsxFfCommandTemplate: '4288b663adff7bb83d015a99c43729d5a0e5da8d6b164c9f827f8b2f253c56de',
  getArchiveChangeSkillTemplate: 'a994dd8e6e57d0bd29b1c74b07ff0e7b0d5ddf228b33fbdda5fbef6bdd98a2f7',
  getBulkArchiveChangeSkillTemplate: 'f53c24b71d9ba22afe8cd4b47be46eb71202969784e9458c250a46cb9915df07',
  getOpsxSyncCommandTemplate: '8d0d6fdfbdf87e51162530fcb8c24e127b814a84407add42995e52929a99feaa',
  getVerifyChangeSkillTemplate: '95028dd7a54e9a16ce9d572b7a87ca4c35cf1250b450a96210961be4c639bf15',
  getOpsxArchiveCommandTemplate: '343b26cd951098a2dd8257a2ed55030b2a33d6954bfd827356503d4e92924827',
  getOpsxOnboardCommandTemplate: 'b8a097234643c02a19d5b1b0f81df49f2dd475730c72f225db19eac72f22b931',
  getOpsxBulkArchiveCommandTemplate: '4e99fb4e8dc4bc14329422b0c1145c36b0e60f7c872c66caafae5f7e59e4b3fb',
  getOpsxVerifyCommandTemplate: '91ee531f17d67e3b2d3c81338621038f15788c613f0f39bcd7a34590ae153b99',
  getOpsxProposeSkillTemplate: 'a7995d72d5a9e15a26f673f8cc226dae529f6e78615cd5e9ba1c77d514107c12',
  getOpsxProposeCommandTemplate: '3682ec7638153f29fc6c5d2b61c34d337ab656e1932a7a64cda371ee1ecb6b8a',
  getFeedbackSkillTemplate: '5670e572139837f26a8c306d13e7faba6831ba178c4907f64c961ff345644189',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '925c8ed1ff232604dd4432e8ff0a0246cbda64c44ae2c046f61fe315b3512419',
  'openspec-new-change': 'a906b62c28f6ccd1ab6dbde69dcbb9f69e4c67f9520ed107aef54dc45bc0fbe1',
  'openspec-continue-change': 'fe4b828d85def8e02c5f31ba5cbba9daee8afc4fa5a52ef61b246190b04e9850',
  'openspec-apply-change': 'e9403bcbcc08f01ef40f13479119d886e250a2bf4ea63be40c41f3e6724d72a5',
  'openspec-ff-change': 'd22a64427e4f21b4d899377f5e7bb0f7a1ce9034fd2a0e19e5fdc53503ccdb37',
  'openspec-sync-specs': '500528c3329c9e142a8180db119c18d571fb22b4250025af76edff4c2b846db1',
  'openspec-archive-change': 'd35e5101cd9a8c2543a3b217b4fcdba651bfa51c2c5c6111e108b104116609e6',
  'openspec-bulk-archive-change': '3518162172debdc7c58231efc89d7e44e9076840e07459f4b709b67a90a3fee8',
  'openspec-verify-change': '7f16ff1f17b16c6417fef1665ff88bf2b49a4b5bc68fcd0e94399cb3e72db6f3',
  'openspec-onboard': '9d2012e1a31c48508a305dae3cc078f3b7a2ed13e66b28e2a0ad99618357c97b',
  'openspec-propose': '20766643feab8ae788f201a79057b9b603b56b6a86038a9342b4d9e312e69feb',
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

  it('teaches store selection in every generated skill', () => {
    for (const [dirName, createTemplate] of GENERATED_SKILL_FACTORIES) {
      const content = generateSkillContent(createTemplate(), 'PARITY-BASELINE');

      expect(content, dirName).toContain('**Store selection:**');
      expect(content, dirName).toContain('openspec store list --json');
      expect(content, dirName).toContain('--store <id>');
    }
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
