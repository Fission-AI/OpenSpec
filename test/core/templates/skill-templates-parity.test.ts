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
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
  getOpsxSyncCommandTemplate,
  getOpsxVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: '3f73b4d7ab189ef6367fccc9d99308bee35c6a89dae4c8044582a01cb01b335b',
  getNewChangeSkillTemplate: '5989672758eccf54e3bb554ab97f2c129a192b12bbb7688cc1ffcf6bccb1ae9d',
  getContinueChangeSkillTemplate: 'f2e413f0333dfd6641cc2bd1a189273fdea5c399eecdde98ef528b5216f097b3',
  getApplyChangeSkillTemplate: '708fc73c34f767556d6f169255840688cba173655b80bf39d58c522b664cd952',
  getFfChangeSkillTemplate: 'a7332fb14c8dc3f9dec71f5d332790b4a8488191e7db4ab6132ccbefecf9ded9',
  getSyncSpecsSkillTemplate: 'bded184e4c345619148de2c0ad80a5b527d4ffe45c87cc785889b9329e0f465b',
  getOnboardSkillTemplate: 'c9e719a02d2ae7f74a0e978f9ad4e767c1921248a9e3724c3321c58a15c38ba9',
  getOpsxExploreCommandTemplate: 'b421b88c7a532385f7b1404736d7893eb35a05573b4a04a96f72379ac1bbf148',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: '8bbaedcc95287f9e822572608137df4f49ad54cedfb08d3342d0d1c4e9716caa',
  getOpsxApplyCommandTemplate: '11321c8b50cbf0bedb6310713f38fd4f70956fffc3847e75535e7310091abd41',
  getOpsxFfCommandTemplate: 'cdebe872cc8e0fcc25c8864b98ffd66a93484c0657db94bd1285b8113092702a',
  getArchiveChangeSkillTemplate: 'ff45a77218ea58f62e0ce5c60f1292c6d4ada0914327548f24bff00cfc3f822a',
  getBulkArchiveChangeSkillTemplate: '8049897ce1ddb2ff6c0d4b72e22636f9ecfd083b5f2c2a30cf3bb1cb828a2f93',
  getOpsxSyncCommandTemplate: '378d035fe7cc30be3e027b66dcc4b8afc78ef1c8369c39479c9b05a582fb5ccf',
  getVerifyChangeSkillTemplate: '4d181fcc2c80ad3b5dc23f657c26de3fd7071893f2764789dd2f29e84c7a3f2b',
  getOpsxArchiveCommandTemplate: 'e3dfced3acc27545c6893d36662fe98bd0d7628520c977bdb09f93429a57574a',
  getOpsxOnboardCommandTemplate: 'fce531f952e939ee85a41848fc21e4cc720b0f3eb62737adc3a51ee6ad2dfc57',
  getOpsxBulkArchiveCommandTemplate: '0d77c82de43840a28c74f5181cb21e33b9a9d00454adf4bc92bdc9e69817d6f5',
  getOpsxVerifyCommandTemplate: 'c8a128f85a697f5bae379d46889c299ab281e11f57e89a977f23fba3475b8d2c',
  getOpsxProposeSkillTemplate: '9ad632d1f8af71dc672e0bcada1fc00530f2b26d71616fdb7b07c7ed31c413be',
  getOpsxProposeCommandTemplate: '3369267d3b6f0184c4f206ecf82083d266297eaa1946713530a1c25ffcaf36c8',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '4d91b414150abea330dcd72054e77c5fc2738f7555612051effbcc217198fe01',
  'openspec-new-change': '5f36455977c23ef1d9274e34e5700709f1fe2a3136ed033000b18b759b623adf',
  'openspec-continue-change': '9ce3c4386163d011168423ddfefd0d2dfa63cef5aaa8e99f56612bddfb719e17',
  'openspec-apply-change': '3f4895711e40f54382edc9c6402100122909649a2740a0104a3eb410de579dcb',
  'openspec-ff-change': '3f40340379e97b51c33e90c92440ba098dd17bca8f392f5786cef4d81cc0a71f',
  'openspec-sync-specs': '30fdec587142bcabb4cfc7f2d505ea72fbbd27eecd629782f509c7440a521b9a',
  'openspec-archive-change': 'b7479c523574b8171eed03d20ee0036183d87b18c8809c623b03dc5b61dd3f4c',
  'openspec-bulk-archive-change': '07b60503d0634d2fd5ae5345b2ed2cef354133e79ec99eb2388abab5b75f68de',
  'openspec-verify-change': 'a97687a8735b492623941a908abf937b2f32496d85a4d6ffddf1ef5ff6909293',
  'openspec-onboard': '53ce81dff0772ba7f80c88e615306434336958771ee43878bb809f679b63fc20',
  'openspec-propose': 'ef626aab08b188b97ba75a1fcc61f26d54ea3fa2c302b92e5bfc2332fb300a91',
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const sorted = Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
    return `{${sorted.join(',')}}`;
  }

  return JSON.stringify(value);
}

function hashTemplate(templateFn: () => SkillTemplate): string {
  const template = templateFn();
  const content = stableStringify(template);
  return createHash('sha256').update(content).digest('hex');
}

describe('Skill Template Parity Tests', () => {
  const templateFunctions: Record<string, () => SkillTemplate> = {
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

  describe('Template function hashes', () => {
    for (const [name, fn] of Object.entries(templateFunctions)) {
      it(`${name} hash should match expected`, () => {
        const hash = hashTemplate(fn);
        expect(hash).toBe(EXPECTED_FUNCTION_HASHES[name]);
      });
    }
  });

  describe('Generated skill content hashes', () => {
    const skillWorkflows: Record<string, () => SkillTemplate> = {
      'openspec-explore': getExploreSkillTemplate,
      'openspec-new-change': getNewChangeSkillTemplate,
      'openspec-continue-change': getContinueChangeSkillTemplate,
      'openspec-apply-change': getApplyChangeSkillTemplate,
      'openspec-ff-change': getFfChangeSkillTemplate,
      'openspec-sync-specs': getSyncSpecsSkillTemplate,
      'openspec-archive-change': getArchiveChangeSkillTemplate,
      'openspec-bulk-archive-change': getBulkArchiveChangeSkillTemplate,
      'openspec-verify-change': getVerifyChangeSkillTemplate,
      'openspec-onboard': getOnboardSkillTemplate,
      'openspec-propose': getOpsxProposeSkillTemplate,
    };

    for (const [workflowId, fn] of Object.entries(skillWorkflows)) {
      it(`${workflowId} generated content hash should match expected`, () => {
        const template = fn();
        const content = generateSkillContent(template, '1.0.0');
        const hash = createHash('sha256').update(content).digest('hex');
        expect(hash).toBe(EXPECTED_GENERATED_SKILL_CONTENT_HASHES[workflowId]);
      });
    }
  });
});
