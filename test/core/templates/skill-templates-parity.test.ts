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
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getApplyChangeSkillTemplate: '4fdcc35660fd5b21de3eb477fd5057569282a83273ffd62303a7bf85bd034478',
  getArchiveChangeSkillTemplate: '37292e424c163d8759c0aa4fea502bd05be652ce700f17c551d53263e5423d8e',
  getBulkArchiveChangeSkillTemplate: 'e8e63d98496ddde8cf9bd34932d8c637a617b7bb706d1f89a5cae9abdf790825',
  getContinueChangeSkillTemplate: '370775c5b80426219abf2c82c4e2900a1d5edc4798454d756c03a9779abb3b16',
  getExploreSkillTemplate: 'e39750b656be254b404e803eb0efe112d0cb2e7d18602150012685f2993840b6',
  getFeedbackSkillTemplate: '51eaac6cd0b7f845c4ef104bc34cad345e7b4c05a37126e1e9489bcab41bd010',
  getFfChangeSkillTemplate: '84eaef90a7855a872dfe0123beea18a699d5c7118e1278c999f556da56e49bd3',
  getNewChangeSkillTemplate: '61207953f7486f53519e9a0bda31d417aeb13de1c1b3c7a682f30172f9792beb',
  getOnboardSkillTemplate: '73aad8884f1be9e5510c65093f2075f41bf74c9fd5139bc21d7d24329551d1af',
  getOpsxApplyCommandTemplate: 'cae771bc77f0e43aa25fcc89bd5805e320c31eeb403ab52a581557e90c8b7dd7',
  getOpsxArchiveCommandTemplate: '099f569cd2f76077f646c36a5872bdb63d1fbccf7801eab96654c6043ec40bce',
  getOpsxBulkArchiveCommandTemplate: '4ae3138a36ab8fd4d0e82e723060075cf72136da304eb5d41b27e420e84241c1',
  getOpsxContinueCommandTemplate: 'c2256b48248f2f6ba098ab9e23daf3dd7a265ec7f90f4569825ff381910ab2d3',
  getOpsxExploreCommandTemplate: '11d81afaa729f7b35f1db0f8a16f656de22b5fd9797320e60646fcfb6d450bed',
  getOpsxFfCommandTemplate: 'cc96e8d30879dfe622a370cfa89104a219b493934d79d3985351c0c0ea040dcb',
  getOpsxNewCommandTemplate: 'ebd9762603da6a09688cd98440219907daae121e4bafd39c48895fa08c58185a',
  getOpsxOnboardCommandTemplate: 'fe3beeca353b21051e037e49b7e2fb9d5c52ef40441088b3011869b9603677aa',
  getOpsxProposeCommandTemplate: '1c9e39c24f53098d4b64ccd018d6252f98cecb87d76456700a1a9d226779c619',
  getOpsxProposeSkillTemplate: 'd7c4d4d4687337f235d6c86765c24d2aad4002abe591329b4b41ac016642d095',
  getOpsxSyncCommandTemplate: 'beb3e670e61446d9794197a21370d2fe316f56f89c368cc5b2859d32060fbdbc',
  getOpsxVerifyCommandTemplate: 'ac78149916c90717a39b2f72703193f9753364be7d265565cbec809ae7672177',
  getSyncSpecsSkillTemplate: 'cd604ed04c77746839321108daa525f6b1dd1894903264a8da0e2d73205c600c',
  getVerifyChangeSkillTemplate: '2cbec20d55f154d7e62e4df79cbe59847b8a2646c84fbb389bcfafb2e4ff2795',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'pastelsdd-apply-change': '874cd9628a0333bf45f9a4b5305885eb2b8e80f2466387f4976ecd226e3a4be3',
  'pastelsdd-archive-change': 'ff3aa70db327f33b2aba1aa2df7e53d5234b98fe5be414334c4fc989ddd21173',
  'pastelsdd-bulk-archive-change': '54f2251eb0964d683376225dd945b39cbcba202a5bb24da386b2eee51fb41f5a',
  'pastelsdd-continue-change': 'f66c8b88cfb17cacf83b7debd36eff3f43d4742c195f59bc17f47e258bd349c8',
  'pastelsdd-explore': '1d5a70b0dc2e057b6c8483979d7c032f19a1320d8e38a6bd69c0a8eb557bf998',
  'pastelsdd-ff-change': '9b3afddc1a60168c0a77f273df872881e4d996d1bf57d595f49baf1e80e52b99',
  'pastelsdd-new-change': '3250b61ea1ac8596434ec0d4667212a75e61ff38e90934ad127740ef33b7e0de',
  'pastelsdd-onboard': '0899ff41d7193a0ab7dfcc426fcf6729f257142f433c9520c33cd6ff63292175',
  'pastelsdd-propose': '1e76761290cad67e509be2166aa4db461c896c566c10803a059930c137dfc28d',
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
      ['pastelsdd-propose', getOpsxProposeSkillTemplate],
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
