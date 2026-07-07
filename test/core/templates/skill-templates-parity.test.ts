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
  getApplyChangeSkillTemplate: '3650033ed19cea2188ce20e3ef7ff4d959c76538c2ec6d9e535217f9dc1f3c3a',
  getFfChangeSkillTemplate: '9f4c12a1c58c723c9c45a139307eb90caf39cedd93c435bc960d0817328875e2',
  getSyncSpecsSkillTemplate: '75abb20572256e2b8a647e77befae99f109ab5c4dc954a9c3c184829b5fcaa40',
  getOnboardSkillTemplate: 'e871d8ce172bb805ae62a7611aee7a3154d89414f427ad5ef31721c903f13002',
  getOpsxExploreCommandTemplate: '37e53590aae7ac6621d4393aa80a5b8af21881323887fa924ed329199fda27e0',
  getOpsxNewCommandTemplate: '57c600cce318d16b9b4308a18d0d983ea3c0673034e606a7cceec07b4c705e87',
  getOpsxContinueCommandTemplate: '418108b417107a87019d4020b26c105792d2ef0110fe6920445e255889216716',
  getOpsxApplyCommandTemplate: 'c9955342220f85b8d133e6369efb1190c34206a3e7ec4d21f6b58d109eea73cb',
  getOpsxFfCommandTemplate: '36973ae0dd00ab169fbaaa42bf565f97e1bc97cf63ae7c07307734cc1ca8c1fd',
  getArchiveChangeSkillTemplate: 'c511a1c943bcfc5f9f3833b8c0ff284b22d34864a08f5f553cec471ee485d38f',
  getBulkArchiveChangeSkillTemplate: '0f635913757ae3d1609e111f4a8f699443ca47cbaaf8a1b21eb652f7b96a1d13',
  getOpsxSyncCommandTemplate: '86cf706886d0f18069e2cfa16948b7357028fd348210efb58588c88c416d8622',
  getVerifyChangeSkillTemplate: 'd718c79aad649223a73fdb11036c93fb3842ac5a780f4934d50bfa03c9692683',
  getOpsxArchiveCommandTemplate: '6985bddb310cb45b6b50350bfcebe31bf67146135ca0084c94930920280970a4',
  getOpsxOnboardCommandTemplate: '0673f34a0f81fd173bcfb8c3ac83e2b1c617f7b7564e24e5298d3bd5665a05a9',
  getOpsxBulkArchiveCommandTemplate: '9f444fc7b27a5b788077b5e3aa4f61af45aa8c8004ac8d899d204fa362ff89b7',
  getOpsxVerifyCommandTemplate: '011509480a20a60342c993906f0f9280c0e9ba5d019d335bdc1ef4d53213a5a8',
  getOpsxProposeSkillTemplate: 'd5951d57180bb4baf53f76ec8704281dda398a73814d9f85bd7fe6ce3ae8e851',
  getOpsxProposeCommandTemplate: 'b7b554e4507d6643e37c2e9eee38db4b9a831f82aa2c36fc9ca5c384198a0876',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '08f905865f86e787262fed252c59ed343ac24db8befa31e5cf8fd99af947263b',
  'openspec-new-change': 'bdb534d6d5a00b235f63852af089f904fd20df34be526ef67990ec3183829f33',
  'openspec-continue-change': '5d2aea621310d74d89e547d705d2e08e6d5a44da7bca93ba049ed43ebf60295e',
  'openspec-apply-change': 'dc5812e72681639bec682896f83b493d6539db6c48758a5c9d3846923ec2b6fd',
  'openspec-ff-change': 'cbb7844c130bd188319ff2b3f0c0320243b5ae5b588a0f816cd4e29408f25676',
  'openspec-sync-specs': 'a81fd87f5e871874eab72e57c10a1949fde46d1d07d95f8ea3bc1a52b4e78c43',
  'openspec-archive-change': '833290ade47ddaed7f5e523d07437c7cef2497340021e944096bce449e290c22',
  'openspec-bulk-archive-change': '244b195e53d3f010a99892c1922c800fd8f02e7745d0f34ec18b5fe9b5548706',
  'openspec-verify-change': '97d1eed5b900788706c28339e27c1d2d9c548626316253f43ebd00d8d52d02d6',
  'openspec-onboard': 'd136b6ab7134d6bceeca73bc2f6037624506587e8df99059f77fe88874256ed1',
  'openspec-propose': '39ea2ae742b987756b7f7992d61ac705c0be9028935731ffb3512bb7d8ac9cee',
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
