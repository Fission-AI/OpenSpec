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
  getInitiativesSkillTemplate,
  getOpsxInitiativesCommandTemplate,
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
  getExploreSkillTemplate: '26675478b220715bafe3749311db95677043afc85da4dd01c53726a83f198704',
  getNewChangeSkillTemplate: 'a647a6602e361cda6a5277ee8195c76cc59c6105c155731bb67ae61bd14c627f',
  getContinueChangeSkillTemplate: '03d2a37c9a703a379d4df38633009e63f30f26df78c13e5e259001a4e0391c76',
  getApplyChangeSkillTemplate: 'dfbf04bd25ffedba1f8b764623a3c91e0e6f43ed14de97d7642421944ac57ac1',
  getFfChangeSkillTemplate: 'bf6f4918e96f681922b715338b56dba7a60a46051e3fbaf2ef2d026e51eed07c',
  getSyncSpecsSkillTemplate: '8af60d91a626e4751d6a2aef7e47b1522daa1db01c213386fc206a54ce176ab1',
  getOnboardSkillTemplate: 'eb746e0f6e720794f2565e487a8bb7e50273e4b8494308b00e7afeed2c31a5e2',
  getOpsxExploreCommandTemplate: '1a99984ace5e8ae76a05d357c04a2c6e4b13407451f4545534d4ce95d507bb54',
  getOpsxNewCommandTemplate: 'd761624274af2856e60096847dc9fab4beaec0ee55f49ee1e885d3af0496570f',
  getOpsxContinueCommandTemplate: 'bd7776b401467c98b07ead76a6965802e99dc150d59804c1014e7ef5f7f89fb3',
  getOpsxApplyCommandTemplate: '0a65c9b1fa9b00953fa8c68bf3ba03e69b7d8167376b1cbf656d151c23a067b4',
  getOpsxFfCommandTemplate: '610a96f70073eb6643f1387723dec01ffbfa75a2e48ddd471845d47fc1183378',
  getArchiveChangeSkillTemplate: '6457b47ef91bbb964e434725ca845851ed69497a5f770c4ef9713019fd1378ae',
  getBulkArchiveChangeSkillTemplate: '0ce6933682e5f74b8d8b3fd49270957d6c14572eb0490eb65ad63628152e865e',
  getOpsxSyncCommandTemplate: 'f50af3e913e32269b5b17bfef71f4f2175c327b3546f848cff9e7f8e017df3bd',
  getVerifyChangeSkillTemplate: '9ec56494eac8d7970f985c00938987f784ee3402e407e239004e6da7d0af1896',
  getOpsxArchiveCommandTemplate: 'eaa988fb7eacfd8d27c89b0dbac75bdf34ae45f11dccedf5a30caf16dfe0ac80',
  getOpsxOnboardCommandTemplate: 'f5d6072c4c6d0c9e2704c469d06f2d56f638c1450088df644f88f013af4074d4',
  getOpsxBulkArchiveCommandTemplate: 'be07bc0d7ea413aebaad181ee22dc856bbfc6210fe394310b6c8b552ee891bc0',
  getOpsxVerifyCommandTemplate: 'b4a5717c25883ca74dc8da091aef2432492e2a377c8cd9c1a0369b6b854dc32c',
  getOpsxProposeSkillTemplate: 'ad11a374aa8f3978a93af3a2d5b4cea736d6a5f7b3f913b38a2b34aeeb2bec21',
  getOpsxProposeCommandTemplate: '8aa4d2e0ca201ad8e913e8d490223063cef9c2a7e2b7a464d5aa0452540ccc09',
  getInitiativesSkillTemplate: '9b3261e6a319223fa8a3795ace0f59197b0a15dc0bd2a1dfe0eabc5312ac0956',
  getOpsxInitiativesCommandTemplate: 'b2c38557ccf42569531bfbac19146cc83e48292663d5b8f432d352feb0910b97',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getUpdateChangeSkillTemplate: 'fe2e8edaf973d42dc7fc7dfd846105c4c3cfec0437606e582ec644985cd4e81d',
  getOpsxUpdateCommandTemplate: 'e55ac5774203a7d9037d2d588889c97c53f3f930da49497cc79e865375920da7',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '0b7f81479edf27f85eb8a7deffb37aa6b9782adb1203ac1b541ce7e85b03fc64',
  'openspec-new-change': '81f414bfce1e11931b93d87ccadd0674ec460789bfe4079c73f483358a960859',
  'openspec-continue-change': '987043d62f6703f01258b0d09c0b9fd0481d845d6d738049d62dde5dfdd5160c',
  'openspec-apply-change': '3ad97a4a515021299002eb48279a2e5ee9ea77a9dd251a7156193f5263b0de3f',
  'openspec-ff-change': '30e8e5cc2e73f58699ccefad6f941bc8d8b9c5d0d77b12ef5d3140e220aa6079',
  'openspec-sync-specs': 'defce99383e7269a691cccf1577139bded63b6d3136055eb55b27847aa915602',
  'openspec-archive-change': 'fc9ecf88d9855e36a157f42518e9533b9df35b5370c20413931cef74e5bd353e',
  'openspec-bulk-archive-change': 'bfb25fdacb3bb2959535b79e6d321b0319d43cbde52614337f1318a065929b6f',
  'openspec-verify-change': '2aa862e0f32bf85d1a073629a1dce44dac7c005bf76ba2f63fd19b0953228f30',
  'openspec-onboard': 'abd8b125dd67edb482a6fcba2304ea4327cc3ac3689eea68ee805e5913065523',
  'openspec-propose': 'd4a35ab16a2ca89f65c6aa1cc931cba21c3f01d5de356855a027d114b92047ec',
  'openspec-initiatives': 'f7ca1580fb8fbe1244e35ef6c733865a5cd5ab4010767914456d75e6503de175',
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
  ['openspec-initiatives', getInitiativesSkillTemplate],
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
      getInitiativesSkillTemplate,
      getOpsxInitiativesCommandTemplate,
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
