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
  getExploreSkillTemplate: '3bfeae699013c46c0ad0018afd85b0ca931c5a7ddf8ce3c18aab22f06d1d354d',
  getNewChangeSkillTemplate: '63d2eb80b6e746a562c9273df4048d228d3aa025f9a921632a5855f751e727ba',
  getContinueChangeSkillTemplate: '09a58562acebd99b6738c45095bc423c3ce48388335e349aa59c7cb83ffab426',
  getApplyChangeSkillTemplate: '76cc8caf6a58e946b03d14eb81dd02af45a209d040e249b8e12811e2423012e8',
  getFfChangeSkillTemplate: '61389a5c3b9aa7405ac9e355269bd35f6a48415c041a3abd5cda1210afb4a7f7',
  getSyncSpecsSkillTemplate: 'd8a19a90678d84ddfbcb3cd98e06806efe3e32f2965a7a29fd970e29f50f0522',
  getOnboardSkillTemplate: 'fd10e5d08562888fbb95eec3bf1b765c90d24bbadfd886b9ae0eb821423eb4ab',
  getOpsxExploreCommandTemplate: '152372aee423777e9d5637199d194bdba224fc3caff6dc3643c0d9b6ad4fbf3d',
  getOpsxNewCommandTemplate: '14a3027294b0117b653c3d03f04ec89b951b5fe59153be3ae00377cf7cc6d6f1',
  getOpsxContinueCommandTemplate: '332a4d8c47f1d477bab725946454551de5031e3c4d6551f040b6806c81a53b9e',
  getOpsxApplyCommandTemplate: 'ab2efb2a9c3e47cfd12cf777575af93971f424343e8a318cbcfc4ed465d6e3ea',
  getOpsxFfCommandTemplate: 'edb5e1a9ecff5be9eb7f952356531fb899a3c88fa70663037ed4bdeeb30aa0a8',
  getArchiveChangeSkillTemplate: 'a630a79be1c563d313f75ed3f038b157cd9ad33e28b2805dd7fbb7dc766e2f86',
  getBulkArchiveChangeSkillTemplate: 'b251e738bc06d7e8e9e55e8c3e7591c452e3ca42a185965c5e7beeb2c6870bec',
  getOpsxSyncCommandTemplate: 'b25f62a21ad9b3eda0af79f3e8730814a44b9baa0ea8da6276125e845f59e823',
  getVerifyChangeSkillTemplate: '72d800b35725c65e1d11144a4000b74bb2c6c1809c351958b193e0502b83d3f4',
  getOpsxArchiveCommandTemplate: 'dc8c8ada7e068986bd83c4ba3755f111fb7abf2b234d3c42b744e552276407b3',
  getOpsxOnboardCommandTemplate: 'a0a3a0bd3005757cf8c64f2a4f5b80e90aca6179723ae793843baaab822ebe7f',
  getOpsxBulkArchiveCommandTemplate: 'fa10bb635ad5df4a42963b333a9d42d5da098b2577321a08c96de75bb83fb0eb',
  getOpsxVerifyCommandTemplate: 'dd00c7601f579e65968035776b28e75193d713300e9776f7bcdd14dbecd2fb63',
  getOpsxProposeSkillTemplate: 'a96cb461f59a562cfda0acecd6361d5e70497a1800d6a3c73afc35f2b18dae53',
  getOpsxProposeCommandTemplate: '64d236912ec56432c34b7ee810bca47e20a4cc3befbf1c9570909163f4f05fcd',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getUpdateChangeSkillTemplate: '84cf42664f863b89447c4fadeb666f5b16936d10f143139e7bbbe6846da87f2e',
  getOpsxUpdateCommandTemplate: 'c58d3534fa477e67bd35400848620784a2a69749c2e1703ab11cf7dca28b211a',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '74bd0a2abc09559af858195ddc187800e70686569a8a9e283cd72a0607442b35',
  'openspec-new-change': '986235a54f883526a3cd876348f30c5c4929371f257b84e1370dfafc910713c1',
  'openspec-continue-change': 'e82cf91e7833c21de29e537c256ee7acca9d92fb29275a3e126975cf2d8e2b91',
  'openspec-apply-change': '3f8eae937f9fc87967fbed44a9f20aabc6668ddad2aa53762a5621591cdaec8f',
  'openspec-ff-change': '9e997859748f54b75399c21c0896792912f719b9ddd1eabae3746153d31d311c',
  'openspec-sync-specs': 'be314dea2f1e26aca3d8fbc37dad1077b6d83fdb9cb6f59b2415f5eb91e9eca3',
  'openspec-archive-change': 'f99716c8c02a0dcdbc148e5cba64cb188952f1a0933ee4ebd8fb1aba701e2d8f',
  'openspec-bulk-archive-change': 'a2518c0cd3eebe817338be87743a1be07ab28f17e183c7eb499f705af0c863c2',
  'openspec-verify-change': 'c8e32ad379f5ab120ee2df54d17b1fb2d24ffde4b774e06e66e2eaafb2ffc150',
  'openspec-onboard': '34ca708adb63d6b011d65021b2807ca0f6b5078d10026fd4606df043a9e1d608',
  'openspec-propose': '21bc7e1756fd7a58a9776ea272a46510361e99b84ba5435956e74700ea25c8ac',
  'openspec-update-change': '9507860650a2f3fa13d3eab4299e2b56bdf90263f49b457dc5d641e28afdaa75',
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
