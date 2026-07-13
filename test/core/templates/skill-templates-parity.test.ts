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
  getExploreSkillTemplate: '7d29c863c7489fccd3696e5a0f797c2a3ceb00e87b2edbb5afa2a7f4c2c1e5f1',
  getNewChangeSkillTemplate: '9a77bc2103d174df4074564b1815de3674ad2f4417286747bfac1982cb8a8729',
  getContinueChangeSkillTemplate: 'ca14e1fc46f3ae35d46db0b874138a649fdbc0ca497e5d13b8f8717bbd6d2270',
  getApplyChangeSkillTemplate: '0c5090a0da5209abd3868f2e6fd8676dc399c9d35175559c9824719aa55bd77f',
  getFfChangeSkillTemplate: '418936f7f7d239eb57316e7a7fc16333356ae0c86a19dd1f1eb3df4e6570cf72',
  getSyncSpecsSkillTemplate: '7cd72eb2ee6daa5a659b8f39b7f2dad0a7f4b4e0a9d72d6983aa756268b24f5a',
  getOnboardSkillTemplate: '468b1acb044688cb5c758afacb9e317f315286a1a896b2160dbd3a3aaaefdc01',
  getOpsxExploreCommandTemplate: '377375850502c64771c15dfa5d3a97a94019fb7d1a9bf386082851e84691bcb6',
  getOpsxNewCommandTemplate: '8d264704470d555340e63bef518623854783673a827a0b7186b7db785fe3bef0',
  getOpsxContinueCommandTemplate: '760fdf65bb7e8a2022ec6b292ed418c810c7110021a14686a0703a7dd45715a4',
  getOpsxApplyCommandTemplate: 'fb04979c3953c9a801511d25bf40d433d7f2dc5ebaf8c03089361a5468a895c4',
  getOpsxFfCommandTemplate: 'ea3f4cb7c75bf60a862a96673a3a1ee790d152c095d1eaec1bfd947e604c45cf',
  getArchiveChangeSkillTemplate: '2685d3afa9c744b71977213b50a07b6f36245b47e850de0837279071ea995622',
  getBulkArchiveChangeSkillTemplate: '48da8717605f7ad031eb64a08a1699b193e2b8581d520b0415109323cfe18aa9',
  getOpsxSyncCommandTemplate: '657334f9a24012dbbd376b43dd70a0359ab3b33860b42533f2d22614840dd040',
  getVerifyChangeSkillTemplate: '694d9de868be5c4efeaba4e5dadabce44bac441083cdf91ed6e9d54101c20f85',
  getOpsxArchiveCommandTemplate: '6bedf96a38f737b81873d179af0baa70ba569a9842a53547328b195df94a52cc',
  getOpsxOnboardCommandTemplate: '8cfd54812d14d10d6073204f32c29f54d77ae0e9b14767b9ecd4e140a6b1f049',
  getOpsxBulkArchiveCommandTemplate: '173f5bceee0980ae065e17ef24a1c0cec4730de017f448238942b26a0fc17247',
  getOpsxVerifyCommandTemplate: '172aaf7c3409138be84fce21d49dac206e6d4dfbdc663c9a82ad41663a6e0417',
  getOpsxProposeSkillTemplate: '47031581d8855472d6e8743650394c7f91c18a34fd037ffa9eda7b0a521e1b91',
  getOpsxProposeCommandTemplate: '3d450bd00350a7f906d421bf3d1a1b02a05912d01499480414f46f28b7ce3af2',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getUpdateChangeSkillTemplate: 'edfd7c78c182824d0775c7a9329cc6c2c11a80f0566ce72e0fc0c148aae1db4f',
  getOpsxUpdateCommandTemplate: '74ae3775f8a2c89dd418c9128af09becc86175f5268203a1ad8b572d3b1f53ee',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '7720de626aaecda5f708ff168cc3a2f5ffc192da83ec6330a3f711e511d3ecbf',
  'openspec-new-change': 'acef2777cd19fca67a7f6e0c12f495c8289abe35bf8be6f167a1bf2cb95c3ac7',
  'openspec-continue-change': '723d05abf8826e75a252ec52988fa0ce38a19709eb9126c739e0123a8351477d',
  'openspec-apply-change': 'bbbb5b93d33cdfb20f95774ff1c7e5f939c889b32ee039d6c294e139dd9da293',
  'openspec-ff-change': '28bdc98be47e94b9e718760f620d279818ba408035b8c6a9e2a68e840bda1948',
  'openspec-sync-specs': 'a8c0c437d38cca64c0e1c154810e2c06a4b8675152b616bac74bcd5e9090785a',
  'openspec-archive-change': 'd3f15228a5ec885f09493025e16e4a6763effda37a490bee0684a794b8940eb2',
  'openspec-bulk-archive-change': 'a575d6813df21f21a176d96933d21d0706759cd40d3590f3a3774e58b574bf83',
  'openspec-verify-change': '4e7db9dd5b3b6c3f3f3828c5d5e769b60fe14c264bf947478144cf08a7d69f4e',
  'openspec-onboard': 'a402b00b0dc0e2a6d763cede2ce1e50338a83ca80230ab956cf4a7ec874c13ba',
  'openspec-propose': '7a9ee4bf53dcdb18ff61f87e4dd8c81dd9a0ecd8f1fb684af64b05fcb8cd22f8',
  'openspec-update-change': '129923f75ba75d177acd96db9c893ee85f06101f617e7e22dc11c7017108f978',
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
