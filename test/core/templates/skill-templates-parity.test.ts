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
  getPastelApplyCommandTemplate,
  getPastelArchiveCommandTemplate,
  getPastelBulkArchiveCommandTemplate,
  getPastelContinueCommandTemplate,
  getPastelExploreCommandTemplate,
  getPastelFfCommandTemplate,
  getPastelNewCommandTemplate,
  getPastelOnboardCommandTemplate,
  getPastelSyncCommandTemplate,
  getPastelProposeCommandTemplate,
  getProposeSkillTemplate,
  getPastelVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getApplyChangeSkillTemplate: '643a9927c0d0264d90f7852aac7845d767e55aa319afb1d34f01e05c3ad76f1f',
  getArchiveChangeSkillTemplate: 'dd66744b3d111aa665eb5fc8d7af09b8439f22f451f1e8ad3d7d6ef0f3955362',
  getBulkArchiveChangeSkillTemplate: 'e8e63d98496ddde8cf9bd34932d8c637a617b7bb706d1f89a5cae9abdf790825',
  getContinueChangeSkillTemplate: '370775c5b80426219abf2c82c4e2900a1d5edc4798454d756c03a9779abb3b16',
  getExploreSkillTemplate: '361832a7624c189ddebcc089e73330503cc4b6e7298d0713fbe6d0c379003791',
  getFeedbackSkillTemplate: '51eaac6cd0b7f845c4ef104bc34cad345e7b4c05a37126e1e9489bcab41bd010',
  getFfChangeSkillTemplate: '823bfd4a6529edbada2c7577205cad2b8cbf73781fbc01380d0c08f51eea533b',
  getNewChangeSkillTemplate: '61207953f7486f53519e9a0bda31d417aeb13de1c1b3c7a682f30172f9792beb',
  getOnboardSkillTemplate: 'b1862a1190b61aadee892424a2d885abbb7a9bab6f26916698b9953cae8c0d2b',
  getPastelApplyCommandTemplate: '0d4e300de9f18550405b0d2b2440ba1c1d75c8657bfe4b0adb6f95158f90fa45',
  getPastelArchiveCommandTemplate: 'e3870575ef1b825c6d0aab447247e3b820be7b8e0b6567e1a9fb8d4fa794965b',
  getPastelBulkArchiveCommandTemplate: '7f8b309f1c33feba7a94f5bf5ada6816bda532ee42176c04dc7426c22da36cab',
  getPastelContinueCommandTemplate: '801580c56b7ff65693850768f2037155a23d6a61c7858135b467ab5d61d38646',
  getPastelExploreCommandTemplate: '6dd44b992f236be1620c4694cbfd0abbcf3af0789574c40f682cf5d69130f5b9',
  getPastelFfCommandTemplate: '50deafc03b611bfd5425caf8fc40085dba5b07d2550392724327cf11a13caa64',
  getPastelNewCommandTemplate: '2a72b4ef69636380baa0472a9a8a8cf2f99acb1fd3014d5e20bfb3d91a03ecff',
  getPastelOnboardCommandTemplate: 'c79e9921f48863d3dbf33abb37c737d031e45d7cfdbaff63cdfc3fe383d20d34',
  getPastelProposeCommandTemplate: '2e9481440289ed0009fddc99045ce3e0751e5ab2cf0499782083fec32ef1dff4',
  getProposeSkillTemplate: '866ac544fd07bf1fd35ebd96fc070759b38c26d6e48254f9a680b3e365865c8e',
  getPastelSyncCommandTemplate: 'b24d50461176008ae87f3d6fcf564bc215d71ffdf1bac5ef20b3d4579993f51a',
  getPastelVerifyCommandTemplate: '52af5242b87081bfb0ab22aaf679e8f76bfee6ec21a7e8f3bae206b11947dd8c',
  getSyncSpecsSkillTemplate: 'cd604ed04c77746839321108daa525f6b1dd1894903264a8da0e2d73205c600c',
  getVerifyChangeSkillTemplate: '2cbec20d55f154d7e62e4df79cbe59847b8a2646c84fbb389bcfafb2e4ff2795',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'pastelsdd-apply-change': 'a853dbc832299bb97b07dd7b61d8050a318982eb83819893ffe2f7935cbfe3e1',
  'pastelsdd-archive-change': 'bbacd37a57d331ec4a4ebf2abae57f662ce536bd507d2fd495d254237f9f3a84',
  'pastelsdd-bulk-archive-change': '54f2251eb0964d683376225dd945b39cbcba202a5bb24da386b2eee51fb41f5a',
  'pastelsdd-continue-change': 'f66c8b88cfb17cacf83b7debd36eff3f43d4742c195f59bc17f47e258bd349c8',
  'pastelsdd-explore': 'a5326623c84ac00e341240ac540411084f670f27ce7cf8d2917af8f3f87177a8',
  'pastelsdd-ff-change': '3fd283a3eb9d7c967929accc0dc04c16f82dded622fd1bc01e85c68473641bda',
  'pastelsdd-new-change': '3250b61ea1ac8596434ec0d4667212a75e61ff38e90934ad127740ef33b7e0de',
  'pastelsdd-onboard': '23775851309178d88091921da04dc5244e0231baad9f2c9164931a327d4cd91b',
  'pastelsdd-propose': '63074a5b053ee20a08c30fb99c9062bcaf6e3a9b2187b2bedd6a00555dd5f985',
  'pastelsdd-sync-specs': '6b429a590d1b1c326e7a55667bf68df52942171dcfa3c0ca29ad1db1457c4493',
  'pastelsdd-verify-change': 'ed1b5ed7013d3c6bc90381a32a39dc46240e70cbdbb91da10d4422e5cecb7920',
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
      getPastelExploreCommandTemplate,
      getPastelNewCommandTemplate,
      getPastelContinueCommandTemplate,
      getPastelApplyCommandTemplate,
      getPastelFfCommandTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getPastelSyncCommandTemplate,
      getVerifyChangeSkillTemplate,
      getPastelArchiveCommandTemplate,
      getPastelOnboardCommandTemplate,
      getPastelBulkArchiveCommandTemplate,
      getPastelVerifyCommandTemplate,
      getProposeSkillTemplate,
      getPastelProposeCommandTemplate,
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
      ['pastelsdd-explore', getExploreSkillTemplate],
      ['pastelsdd-new-change', getNewChangeSkillTemplate],
      ['pastelsdd-continue-change', getContinueChangeSkillTemplate],
      ['pastelsdd-apply-change', getApplyChangeSkillTemplate],
      ['pastelsdd-ff-change', getFfChangeSkillTemplate],
      ['pastelsdd-sync-specs', getSyncSpecsSkillTemplate],
      ['pastelsdd-archive-change', getArchiveChangeSkillTemplate],
      ['pastelsdd-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
      ['pastelsdd-verify-change', getVerifyChangeSkillTemplate],
      ['pastelsdd-onboard', getOnboardSkillTemplate],
      ['pastelsdd-propose', getProposeSkillTemplate],
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
      ['pastelsdd-apply-change', getApplyChangeSkillTemplate, 'full workspace apply is not supported'],
      ['pastelsdd-sync-specs', getSyncSpecsSkillTemplate, 'workspace spec sync is not supported'],
      ['pastelsdd-archive-change', getArchiveChangeSkillTemplate, 'workspace archive is not supported'],
      ['pastelsdd-bulk-archive-change', getBulkArchiveChangeSkillTemplate, 'workspace bulk archive is not supported'],
      ['pastelsdd-verify-change', getVerifyChangeSkillTemplate, 'full workspace implementation verification is not supported'],
    ];

    for (const [dirName, createTemplate, guardText] of guardedSkills) {
      const content = generateSkillContent(createTemplate(), 'PARITY-BASELINE');

      expect(content, dirName).toContain('actionContext.mode: "workspace-planning"');
      expect(content, dirName).toContain(guardText);
      expect(content, dirName).not.toContain('pastelsdd/changes/<name>');
      expect(content, dirName).not.toContain('mv pastelsdd/changes');
    }
  });
});
