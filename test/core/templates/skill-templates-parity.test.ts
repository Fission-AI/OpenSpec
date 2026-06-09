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
  getClsxApplyCommandTemplate,
  getClsxArchiveCommandTemplate,
  getClsxBulkArchiveCommandTemplate,
  getClsxContinueCommandTemplate,
  getClsxExploreCommandTemplate,
  getClsxFfCommandTemplate,
  getClsxNewCommandTemplate,
  getClsxOnboardCommandTemplate,
  getClsxSyncCommandTemplate,
  getClsxProposeCommandTemplate,
  getClsxProposeSkillTemplate,
  getClsxVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: '4e8d9b3d5893d4a4cc959144ecacce97002ccab6d308b63c67f35f5e755d33ed',
  getNewChangeSkillTemplate: 'f468684db75427ca7a624600696dea25977074e1d6687c86604508eb347b5b40',
  getContinueChangeSkillTemplate: 'a79931637f558ee86c89cae1f2f4e65034fa437e9407405de5e7d8e1e18aafcf',
  getApplyChangeSkillTemplate: '8e312352c06170786066a2d0d7a806ddf787287f037680355ee820d7aa048e7d',
  getFfChangeSkillTemplate: 'c7a7cc153ffbe2f5eff900b436d07fb99223d23a7b5c28500d6b8b402015814f',
  getSyncSpecsSkillTemplate: '050c57d6ddf7f0d79c5699edee65147a8dbcc0585fed300f72db63599251a2cf',
  getOnboardSkillTemplate: 'af464ed28b207d769a2f936b7d64552cdcbb7688a396069559433b5c6b288286',
  getClsxExploreCommandTemplate: '206f066e8eb1548c18cc0c08a466f6ac7b092d6c398600be371744e5bde0431c',
  getClsxNewCommandTemplate: '1517ec09c7d39c9880556bf73ea0214c618ab1bb9f6442d108fa44da9974106e',
  getClsxContinueCommandTemplate: '9e508d7bbd003906a0b7ffc666d492ac0b641710ff57a94c10f88c6dacf5e93b',
  getClsxApplyCommandTemplate: '7ea3bf55602b4f7383ac4882b50a8708e390f6106e13bb854e89f181fc623453',
  getClsxFfCommandTemplate: 'e833949936d5b4b9d58f1696091a0ec7d873fa4ed31890c7eba7545b40cc410f',
  getArchiveChangeSkillTemplate: 'f9400327e392365a89e26c5e4db518edbe49af8c59bfdc0d803699fc24c04932',
  getBulkArchiveChangeSkillTemplate: 'c77fbbdb703151af205b54a9c2f4cc8a9b549309959b9909d53c0b73f9fed30f',
  getClsxSyncCommandTemplate: 'cd3c0e28ebfa3ab0c33c0324ad7082e383ab0891e8bdba8a1db2107a4d117b9f',
  getVerifyChangeSkillTemplate: '3eca1676bd6d65fe74534d604a4cbe6e2f6ac3824288e33ca78d1afa7f451951',
  getClsxArchiveCommandTemplate: 'ba694430ca0311474f438b8af8ce8816b0f1becec1cd9f465b63d1bd4803327c',
  getClsxOnboardCommandTemplate: 'cd57efff6d1aa1bf452f1925024a1f06aeed2c58ea046e6fda39039f9e33f6e1',
  getClsxBulkArchiveCommandTemplate: 'ed209fb53b863645f9abe634851c785bec2e80dc2f1afedcc928f2aa0231fcb6',
  getClsxVerifyCommandTemplate: 'e4ebc64cfc65fcc25e8b74a727e5a587927fe7890c2b2d5a57a085e5a7bb2882',
  getClsxProposeSkillTemplate: '659cd375bf244b7bef5251b514b4014495e38f4dcb02913c805fbc9067eabdd9',
  getClsxProposeCommandTemplate: '9f19f4898750908842daf37f4a8980b7a7d33319607ad2b5cecc87f856b254ce',
  getFeedbackSkillTemplate: 'c1d5e8c7cc17a1daf159eadf3e697a19689a62258b5e3e58182ee559327256e1',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'clearspec-explore': 'de8b7c1a916675c9b90136fa15f9a0f1b7756903f78a005519c1692ae8cd7341',
  'clearspec-new-change': 'edb95a309744a3d17e082c9cdaf11de8da117883f03357e3a36a063a2b69b128',
  'clearspec-continue-change': '60f13eb8e469134b5fa2051e6915ccff3a7a80a6b921947f2267d2008b60c290',
  'clearspec-apply-change': '6302508bec289c84b5798ec4d03af44c8ca77b49ccd6e252a71c0e331fbade22',
  'clearspec-ff-change': '1faac7302e381f356c4648f37b5dacefaa9eb5a22c11c8633de16aa928f929b5',
  'clearspec-sync-specs': '9a0e4bc440752d79604b8b4d153189df43d9995b6143ca019b0a830b12c01156',
  'clearspec-archive-change': '953478b9b035517dc6cda5eadf707279ee4433a85fc233fed62459540075d799',
  'clearspec-bulk-archive-change': '5ed8eaa429e63d76c3ab39bfeaad1ef8d01afd3a1c3a3e7187cb15009703c494',
  'clearspec-verify-change': '42798628152bed2fee67fe294adade7f9a5f5d0cc4b8aedbd6d1af15e40c0a25',
  'clearspec-onboard': '1d62531fd4a015c33ad0947a276441b8c44ef2d1f810bb27081bc27ea3126db9',
  'clearspec-propose': '99178a4475a36a60454b0398c3af773d6602d25b73d906496049b68b4a247fcd',
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
      getClsxExploreCommandTemplate,
      getClsxNewCommandTemplate,
      getClsxContinueCommandTemplate,
      getClsxApplyCommandTemplate,
      getClsxFfCommandTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getClsxSyncCommandTemplate,
      getVerifyChangeSkillTemplate,
      getClsxArchiveCommandTemplate,
      getClsxOnboardCommandTemplate,
      getClsxBulkArchiveCommandTemplate,
      getClsxVerifyCommandTemplate,
      getClsxProposeSkillTemplate,
      getClsxProposeCommandTemplate,
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
      ['clearspec-explore', getExploreSkillTemplate],
      ['clearspec-new-change', getNewChangeSkillTemplate],
      ['clearspec-continue-change', getContinueChangeSkillTemplate],
      ['clearspec-apply-change', getApplyChangeSkillTemplate],
      ['clearspec-ff-change', getFfChangeSkillTemplate],
      ['clearspec-sync-specs', getSyncSpecsSkillTemplate],
      ['clearspec-archive-change', getArchiveChangeSkillTemplate],
      ['clearspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
      ['clearspec-verify-change', getVerifyChangeSkillTemplate],
      ['clearspec-onboard', getOnboardSkillTemplate],
      ['clearspec-propose', getClsxProposeSkillTemplate],
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
      ['clearspec-apply-change', getApplyChangeSkillTemplate, 'full workspace apply is not supported'],
      ['clearspec-sync-specs', getSyncSpecsSkillTemplate, 'workspace spec sync is not supported'],
      ['clearspec-archive-change', getArchiveChangeSkillTemplate, 'workspace archive is not supported'],
      ['clearspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate, 'workspace bulk archive is not supported'],
      ['clearspec-verify-change', getVerifyChangeSkillTemplate, 'full workspace implementation verification is not supported'],
    ];

    for (const [dirName, createTemplate, guardText] of guardedSkills) {
      const content = generateSkillContent(createTemplate(), 'PARITY-BASELINE');

      expect(content, dirName).toContain('actionContext.mode: "workspace-planning"');
      expect(content, dirName).toContain(guardText);
      expect(content, dirName).not.toContain('clearspec/changes/<name>');
      expect(content, dirName).not.toContain('mv clearspec/changes');
    }
  });
});
