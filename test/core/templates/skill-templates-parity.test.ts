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
  getExploreSkillTemplate: 'ab2a8bf7ce065d19174b3525b6863e41a12fe74fbb866e7504143d9eed8a0086',
  getNewChangeSkillTemplate: '5ca6525b7eb3327d746a21c1579ef8b78b49050a5413244e38424f174bf08060',
  getContinueChangeSkillTemplate: '8ccb112a87a90f63b1b3f20d4888394e4557663c5e72db2d946c8e4d97385475',
  getApplyChangeSkillTemplate: 'f2498d259472b38998369861a4a5b65e4738aa896be206a676d78f86b7f7e102',
  getFfChangeSkillTemplate: '17b3fe2d984f80ed56882227a9a723232318c6c90fed62eaf9022db9acf080d8',
  getSyncSpecsSkillTemplate: 'cabf15984b0f7d9e6d53429f433cd9d352ed20d6b9e460e16a3b1272a2a90fb9',
  getOnboardSkillTemplate: '99082362f7eabe237674f116ebbe1ea92530a3b7db4928535641c08dd6ead22d',
  getOpsxExploreCommandTemplate: '37e53590aae7ac6621d4393aa80a5b8af21881323887fa924ed329199fda27e0',
  getOpsxNewCommandTemplate: '57c600cce318d16b9b4308a18d0d983ea3c0673034e606a7cceec07b4c705e87',
  getOpsxContinueCommandTemplate: '418108b417107a87019d4020b26c105792d2ef0110fe6920445e255889216716',
  getOpsxApplyCommandTemplate: 'daeb507206707169de73c828e199648dde5732cbc17791ef2a027adffd028574',
  getOpsxFfCommandTemplate: '36973ae0dd00ab169fbaaa42bf565f97e1bc97cf63ae7c07307734cc1ca8c1fd',
  getArchiveChangeSkillTemplate: 'db3578455ff4e890abe9561ddf8a0a159e2c03d5d0c364d9bbcfc8f177d5a017',
  getBulkArchiveChangeSkillTemplate: 'b0a2c631cc2ebb8cee3e84b0fd96d94d49aba24bc9a32b6ae414355d6625f42d',
  getOpsxSyncCommandTemplate: '86cf706886d0f18069e2cfa16948b7357028fd348210efb58588c88c416d8622',
  getVerifyChangeSkillTemplate: '6c1fdbe761457956edff9b69d684b5c3973b6909f2f05c77fad7125a7f3b0c2c',
  getOpsxArchiveCommandTemplate: '6985bddb310cb45b6b50350bfcebe31bf67146135ca0084c94930920280970a4',
  getOpsxOnboardCommandTemplate: 'eb679b6d41a18b5deb63ce4b7ebab807e4a4102328993762c2953aca7e6599e3',
  getOpsxBulkArchiveCommandTemplate: '9f444fc7b27a5b788077b5e3aa4f61af45aa8c8004ac8d899d204fa362ff89b7',
  getOpsxVerifyCommandTemplate: '011509480a20a60342c993906f0f9280c0e9ba5d019d335bdc1ef4d53213a5a8',
  getOpsxProposeSkillTemplate: '2586457f9790ec1d8bbf565f71d39d8dd1261a18a7350e97f3f2959c3989ae5c',
  getOpsxProposeCommandTemplate: '7cd569beb32d99cdabd0b49615a8245160a8e152b6ea67a99fc4dd71e3f39f50',
  getFeedbackSkillTemplate: '2ace6d9ec7f4d5405c06116123eddf4898c01c9b3be823166e33b5f2ba2fe28f',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'cf3d092188291dc8ce4a43d130671d8656301fc95ac9fb516243bc9b35a0ebb1',
  'openspec-new-change': '3f4fd463063d87ed114ddc5592ad9b09bf23d86ca7295251a5539307638a4c71',
  'openspec-continue-change': '4afb1f8c235f1250a17b5dc513fc7fb838422b882448508a9187138a4ad97cb2',
  'openspec-apply-change': '447bafda03d4ce76764e9d07775effaf1bee1b3457f29161b7e3ea0eeb9bd095',
  'openspec-ff-change': '411c643273aeab4150224be06de7961b9003720075c2e8176b6523f90eaa377a',
  'openspec-sync-specs': '7878045cc5857c013be452bf64429c443f30b410b204e2382f30456b082cb0df',
  'openspec-archive-change': 'f70ec2b5546ed7a798ac619cc35358b9050a7a8fd4fe454cffb99ff84bd93056',
  'openspec-bulk-archive-change': '646be54a71085c3391587b1293ec8443d7aaf6f357695c551a4ec76fbbd92e57',
  'openspec-verify-change': '628f39880097777ae4ed63b7b9e7808bdaefbba0b96ef0c4249a98a62a3c1089',
  'openspec-onboard': '17584310394fffbf9c9a34b68041505f10f9071eaf7ec32405362f7f74994e6e',
  'openspec-propose': '8e2974174be73d53f95fd806465e59d154320b6d6c76fa7db15b66b0ce92631a',
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
