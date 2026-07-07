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
  getOpsxUpdateCommandTemplate,
  getOpsxVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getUpdateChangeSkillTemplate,
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
  getFfChangeSkillTemplate: '9f4c12a1c58c723c9c45a139307eb90caf39cedd93c435bc960d0817328875e2',
  getSyncSpecsSkillTemplate: '75abb20572256e2b8a647e77befae99f109ab5c4dc954a9c3c184829b5fcaa40',
  getOnboardSkillTemplate: 'e871d8ce172bb805ae62a7611aee7a3154d89414f427ad5ef31721c903f13002',
  getOpsxExploreCommandTemplate: '37e53590aae7ac6621d4393aa80a5b8af21881323887fa924ed329199fda27e0',
  getOpsxNewCommandTemplate: '57c600cce318d16b9b4308a18d0d983ea3c0673034e606a7cceec07b4c705e87',
  getOpsxContinueCommandTemplate: '418108b417107a87019d4020b26c105792d2ef0110fe6920445e255889216716',
  getOpsxApplyCommandTemplate: 'daeb507206707169de73c828e199648dde5732cbc17791ef2a027adffd028574',
  getOpsxFfCommandTemplate: '36973ae0dd00ab169fbaaa42bf565f97e1bc97cf63ae7c07307734cc1ca8c1fd',
  getArchiveChangeSkillTemplate: 'c511a1c943bcfc5f9f3833b8c0ff284b22d34864a08f5f553cec471ee485d38f',
  getBulkArchiveChangeSkillTemplate: '0f635913757ae3d1609e111f4a8f699443ca47cbaaf8a1b21eb652f7b96a1d13',
  getOpsxSyncCommandTemplate: '86cf706886d0f18069e2cfa16948b7357028fd348210efb58588c88c416d8622',
  getVerifyChangeSkillTemplate: 'd718c79aad649223a73fdb11036c93fb3842ac5a780f4934d50bfa03c9692683',
  getOpsxArchiveCommandTemplate: '6985bddb310cb45b6b50350bfcebe31bf67146135ca0084c94930920280970a4',
  getOpsxOnboardCommandTemplate: '0673f34a0f81fd173bcfb8c3ac83e2b1c617f7b7564e24e5298d3bd5665a05a9',
  getOpsxBulkArchiveCommandTemplate: '9f444fc7b27a5b788077b5e3aa4f61af45aa8c8004ac8d899d204fa362ff89b7',
  getOpsxVerifyCommandTemplate: '011509480a20a60342c993906f0f9280c0e9ba5d019d335bdc1ef4d53213a5a8',
  getOpsxProposeSkillTemplate: '8dfb5e9c719d5ba547aff0d3953c076dca6b33d7223be98cbffc396b8f1e0048',
  getOpsxProposeCommandTemplate: '7cd569beb32d99cdabd0b49615a8245160a8e152b6ea67a99fc4dd71e3f39f50',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getUpdateChangeSkillTemplate: 'fe2e8edaf973d42dc7fc7dfd846105c4c3cfec0437606e582ec644985cd4e81d',
  getOpsxUpdateCommandTemplate: 'e55ac5774203a7d9037d2d588889c97c53f3f930da49497cc79e865375920da7',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'ba099821631ce75ee70af370917bbddbc88d0882ad0e50e91ed687d2185102ef',
  'openspec-new-change': 'd5b8909bea70a33b7a312b38ce204a91f40b6bb2bff12c4c06b3e11641b6a689',
  'openspec-continue-change': '39b4467a4873cde7c97d52c80d53ac647b220bf7c9d96f4e6505f3188e1a1642',
  'openspec-apply-change': '09c0e1cdf5ccc82416d0969d6bd715cc70616bdbc3531358a5c36057f78be55a',
  'openspec-ff-change': '8d5a8890eccbd97d714fbab1d73472f79ad9104b519e000264ae43d752cdf631',
  'openspec-sync-specs': 'f6a1581eb11a30061795c42582db6fa4f5e1f213b4b7cad9f3cbfbe3e9fb2d97',
  'openspec-archive-change': '1821aee5a06afd895d59d1e1d16495e484b6087ecf59ec93460d7d5e7851e772',
  'openspec-bulk-archive-change': '7b09b04a440809dd7dbf0b1d7b695cbb8c41184d8d104eb32e82d7cdfb476d18',
  'openspec-verify-change': '9a8735eaaa34c278d2193eb32fa736f4b111d1c47e675971c8df40f81d20c8c3',
  'openspec-onboard': 'b1b6fc9a1b3ff64dafe9b8c39a761ee1bd001b542d47b4e4deaf058e0aa21256',
  'openspec-propose': '0cfc9278123d973929cb4da3ea7ac8ae1b6c84b472eed4fb753657b8347eaeb9',
  'openspec-update-change': '77ff4d1f1cd08a57649cce1f25e0ebc4f55d6d032dfde5c301d1b479561b72fa',
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
  ['openspec-update-change', getUpdateChangeSkillTemplate],
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
      getUpdateChangeSkillTemplate,
      getOpsxUpdateCommandTemplate,
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

  // Auto-approve the OpenSpec CLI: every generated skill carries
  // `allowed-tools: Bash(openspec:*)` so agents that honor it stop prompting
  // on each `openspec` call. Iterating the registry covers new skills too.
  it('pre-approves the openspec CLI via allowed-tools in every deployed skill', () => {
    for (const { template, dirName } of getSkillTemplates()) {
      const content = generateSkillContent(template, 'PARITY-BASELINE');
      expect(content, dirName).toContain('allowed-tools: Bash(openspec:*)');
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
