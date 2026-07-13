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
  getExploreSkillTemplate: '76096c95d9a9edf6fcb2c21496f3a9e10c3590c1962546ae4ce403890a3b064e',
  getNewChangeSkillTemplate: '9cff7766fae6cbe4b511383620fb631949f68b0701a160cfd742ff314510f894',
  getContinueChangeSkillTemplate: 'c40545f2955826dc8ffa7a7e92ab770c05c77a2df65ccc190e43e4257d21abf2',
  getApplyChangeSkillTemplate: 'bf28715f9cd68edc34d3010b89fe44969eb1be71a453860197fb5665e2929aaf',
  getFfChangeSkillTemplate: '3d5f7c0a5adc13de39b075dbf1055638f451113522aa0f47cb82388972effc0c',
  getSyncSpecsSkillTemplate: '2e56dfaca62753eac71673b727e25f5211375c360191aa7e0824a1c8520e6899',
  getOnboardSkillTemplate: '497cf9749152c1ea0ad2c5e25173d98a03b531b1593356dadc3174282ee002fd',
  getOpsxExploreCommandTemplate: 'cf7e4b7864caeaf0812b7cd66bab114e76ff3291c37620ff8ca953ef9b902e5f',
  getOpsxNewCommandTemplate: '1644a002f8e6460e75297bf25af45020e1d6f6f2b0625a85dc694977f67ad880',
  getOpsxContinueCommandTemplate: 'c47cebacadd84a3b87415f4833593714916beeadddd1094f4421bdbda9fbddcf',
  getOpsxApplyCommandTemplate: '9e6a6341aa4e4af914d03c71dea0461b628af3ef094e08770d109183c7eb37e3',
  getOpsxFfCommandTemplate: '6ab0f815943d13d15feeaed6b3c5c31d88a5e39eaeb2e97559084882834eaad0',
  getArchiveChangeSkillTemplate: 'beac67ea518ebfcca042b65bf8aaf5580efbc0f2dc401a90b359755a7eed6aec',
  getBulkArchiveChangeSkillTemplate: '92ee1a9279a1785fc1096c4b3ff0ea3e7b62d32ede8769667adfc98c3ddab699',
  getOpsxSyncCommandTemplate: 'b63ceab2649287341d8d1e9859e28aee43859c0f010842b9cab24d26bc5be9b0',
  getVerifyChangeSkillTemplate: '82e177a08924e428b7a49bb0496ebbe3b432a402028ddfc5991791357f2ea323',
  getOpsxArchiveCommandTemplate: 'e1ad0e9ba787b547b623b8640384fe313a4a5fa667895d0e057874df4f50c7ca',
  getOpsxOnboardCommandTemplate: '0ad961804e729504d05fcabfb2b8dd60af63622cf046fbc3a579b726822b4245',
  getOpsxBulkArchiveCommandTemplate: '42ab68ab52596f4d4c35a647d37d676bd391dce357f0802dececc68b38b64f0a',
  getOpsxVerifyCommandTemplate: '922bf6a739ce568f05b1a05e08b2bb4b07aa83c9170212db505d269ee4d5bec8',
  getOpsxProposeSkillTemplate: 'c3285c04754d98a7d64ae26b761cabb5f498f2e0335b9f61bc9b2a40ad383479',
  getOpsxProposeCommandTemplate: 'd9e3aa0bd7a07aa74beff43c274ffe80d2d8e56a5f1658c3c2defb95542363fc',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getUpdateChangeSkillTemplate: '7eb4872a29c395679b5630e19d8117bbf98c6f364018f6a6df4860e797736dcb',
  getOpsxUpdateCommandTemplate: '2582125a7bfd5620837a5d418bc3a431670b164723fffef63bf83a2893b84ecd',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'a4929dd0dba75eae6d9a033bccff7a9659acc9af785663b92b9e24a5612e2bac',
  'openspec-new-change': '4c5d8552d5c0d86a6ab03abb89f0fdc909e3314c4680a1eb093a2a57e6021e72',
  'openspec-continue-change': 'ba24cc84ad60ae5438248d1bb7c60edc87263cf31b60bd1b3ad64920275f90f9',
  'openspec-apply-change': '28e7bd6303d3601b7aeb5ea8aa00d36b6c521f9c463dbd1c0c974299247b9d03',
  'openspec-ff-change': 'b93e1b419277f0f154514128594e37376357eaf78baf2002ed49a91500117e92',
  'openspec-sync-specs': 'cbf42ede20c04ccba5bb850e1f3155483c4c7f2d50ab4a5170bdc82ddfa422c1',
  'openspec-archive-change': 'cd809dc03ee62c8ce1e95c726c838587fd958e9bfc3c18a55a03a9025368e805',
  'openspec-bulk-archive-change': '81d88e43267fd2d351e0d91b1455e1adf1c9f46579c8615bb37701e50a954ea4',
  'openspec-verify-change': '9d4e31dc0913ede7fd64802efde19493604baa910157be75f7e1f8c669eb6d65',
  'openspec-onboard': 'c0e85db9ce32f40b61064ea595fdef0a66e0c702760a5d1782ee6c5053c99b80',
  'openspec-propose': '2e49a22015d65d7b38d892d48ca204cdc60dff075b1af719b75a13582a1ea099',
  'openspec-update-change': '9f7663774774c7df4f2ebff2ca617280381032290b4edaf925d1848441f3e08e',
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
