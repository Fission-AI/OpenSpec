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
  getExploreSkillTemplate: '7d2f54e74fffcb36aaaa4498a4a8b033142bb25945fb9b2de532354acbe76b9c',
  getNewChangeSkillTemplate: '39663a6d2037e6697020393a66f6327506e3e3bc573b7a3556dcb7f9457dc51d',
  getContinueChangeSkillTemplate: '1bb28875d6e5946ea2ec5f12e90f55d9784c2fa1f6e4c4e2d0eda53d861d4c75',
  getApplyChangeSkillTemplate: '0f5a15fc7fb9ad6059a5643d0e01365d27642637a4aaebf182f9eabb45348197',
  getFfChangeSkillTemplate: '5e51dd66c35071e0fd90ddc392a67a71d68d54de92fd1fe872505999b83f8c45',
  getSyncSpecsSkillTemplate: '75abb20572256e2b8a647e77befae99f109ab5c4dc954a9c3c184829b5fcaa40',
  getOnboardSkillTemplate: 'e871d8ce172bb805ae62a7611aee7a3154d89414f427ad5ef31721c903f13002',
  getOpsxExploreCommandTemplate: '37e53590aae7ac6621d4393aa80a5b8af21881323887fa924ed329199fda27e0',
  getOpsxNewCommandTemplate: '57c600cce318d16b9b4308a18d0d983ea3c0673034e606a7cceec07b4c705e87',
  getOpsxContinueCommandTemplate: '418108b417107a87019d4020b26c105792d2ef0110fe6920445e255889216716',
  getOpsxApplyCommandTemplate: 'daeb507206707169de73c828e199648dde5732cbc17791ef2a027adffd028574',
  getOpsxFfCommandTemplate: '544f92f6468aa84dcac7433cb39682dc1f43c066d6f773b593dffc1b57cc7aa4',
  getArchiveChangeSkillTemplate: '35d852d2b7b00d9d013a7b6f2bef64d616a08c973411326291a76adc75bab7d9',
  getBulkArchiveChangeSkillTemplate: '085b026355ba197fe87fe6d3ed9491bb9283079e56fa52f5956e49b8fdf5a4bc',
  getOpsxSyncCommandTemplate: '86cf706886d0f18069e2cfa16948b7357028fd348210efb58588c88c416d8622',
  getVerifyChangeSkillTemplate: 'd718c79aad649223a73fdb11036c93fb3842ac5a780f4934d50bfa03c9692683',
  getOpsxArchiveCommandTemplate: 'a38925d65f1d542b8476e524e37d9623472c0dd61aaac592f9ccf15b426ec85e',
  getOpsxOnboardCommandTemplate: '0673f34a0f81fd173bcfb8c3ac83e2b1c617f7b7564e24e5298d3bd5665a05a9',
  getOpsxBulkArchiveCommandTemplate: '7b1d592c74b0e833b253e091dcedaa4fe5c26351ce1465e06493e722efe12b17',
  getOpsxVerifyCommandTemplate: '011509480a20a60342c993906f0f9280c0e9ba5d019d335bdc1ef4d53213a5a8',
  getOpsxProposeSkillTemplate: '3af6e30956dd35c31ba6dc9f246f3f3c91e7bccd34054d9f751c926dad2713c6',
  getOpsxProposeCommandTemplate: 'f57df994c1d41ba3f42956a366caed79576db75d0c109a134f8e07d65c44cd98',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '08f905865f86e787262fed252c59ed343ac24db8befa31e5cf8fd99af947263b',
  'openspec-new-change': 'bdb534d6d5a00b235f63852af089f904fd20df34be526ef67990ec3183829f33',
  'openspec-continue-change': '5d2aea621310d74d89e547d705d2e08e6d5a44da7bca93ba049ed43ebf60295e',
  'openspec-apply-change': '54cffa61274c6a499d2b3775e9f6db29255fd8e5ad99d7352c1e3bbe2edb45ed',
  'openspec-ff-change': 'e7c60b4e2d82b6b2bc799f69c23728a0788ed23df5fe94feb446d67b8c8f2ac9',
  'openspec-sync-specs': 'a81fd87f5e871874eab72e57c10a1949fde46d1d07d95f8ea3bc1a52b4e78c43',
  'openspec-archive-change': 'b222cb847cc1a96ee78081cb8df0490eec1a3e1b8a7a8f38cd575028b09cfaf4',
  'openspec-bulk-archive-change': '4b1f154caf51295e2da28d965df0e526c5735e5b87936815afaab345e1384a87',
  'openspec-verify-change': '97d1eed5b900788706c28339e27c1d2d9c548626316253f43ebd00d8d52d02d6',
  'openspec-onboard': 'd136b6ab7134d6bceeca73bc2f6037624506587e8df99059f77fe88874256ed1',
  'openspec-propose': '126bab0459eb384d8ccdbddcfa0b5c2143f3f69a0c15a2105e346611dfb6af41',
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
