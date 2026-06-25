import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  type SkillTemplate,
  type CommandTemplate,
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
  getExploreSkillTemplate: 'e2765fae6c2e960f4ce07058cfdaa547ff3435d454eacd5e924e38139e97ad52',
  getNewChangeSkillTemplate: 'b0c26f0b65380062e586505c08c72230e59dccea89e6acca7b673f01cba70d5a',
  getContinueChangeSkillTemplate: 'fbc6c379ed3dd39f59f52b10584b8df5b1dc08b5422bcf1c6d6255a944d22a11',
  getApplyChangeSkillTemplate: '73f54516b1958a7c554d48c59e684727f653d97f145a2bd582dda74527b42357',
  getFfChangeSkillTemplate: '50e68fbb49b76d2690b614bffa9e6210e45539fb74419fc2e4311158b6d38485',
  getSyncSpecsSkillTemplate: '9f02b41227db70875b89eefeb275c769142607dc5b2593f4e606794aed2fdbad',
  getOnboardSkillTemplate: '4f4b60fea6e3fc7d2185815b2808fad51535fdd00cd4401b32d1536f32fa2b6d',
  getOpsxExploreCommandTemplate: '4d5e64e3ede6703113cf2fd23b797371ef2407b702478b4f7240fc81cbf2d3a5',
  getOpsxNewCommandTemplate: '757f72e2d9a1a6794b2188704fd39dd2ab65428899b4b361c76cc15a5e4f2ccc',
  getOpsxContinueCommandTemplate: '62f8863edda2bfe4e210f8bc3095fd4369aaaaf7772a5cba9602d0f0bca1d0c9',
  getOpsxApplyCommandTemplate: '04983d97c190633e27ef57f92e90baf8a010fc9c9c42e88ef59934cde7a64bd0',
  getOpsxFfCommandTemplate: 'f775b242bcfd56594c431c7f31a0129208a1bacfdb2427074d412543072ef7ca',
  getArchiveChangeSkillTemplate: '2b1e71a81500966a4e10fb1179f0c29b91bb61d1ac3054d9f468ca6a9e12d157',
  getBulkArchiveChangeSkillTemplate: 'fdb1715804e86de85be96222b8efeb9d5b350c6d5c19e343e244655deff8e62b',
  getOpsxSyncCommandTemplate: '4c8118afaea79ff4fed3d946c88e6a7abbba904a5fbf643e4372da1e3735a467',
  getVerifyChangeSkillTemplate: 'deb37f828a6286da1d0e5f52ffa838073bd5f89329573980755dd06314c90a73',
  getOpsxArchiveCommandTemplate: 'cf2a6795847821737346351ccdf0fee7df450c1675dcf0d18016d74fa8d43f27',
  getOpsxOnboardCommandTemplate: '57c1f3e2590bda8f47818bab1d528456c1b8a9a7501f63ab9e2115e0cfaf6f35',
  getOpsxBulkArchiveCommandTemplate: 'b76c421023ccb5a12867c349f27cdb186234b692c1811980fb94127567bdabda',
  getOpsxVerifyCommandTemplate: 'b417c30775c0a5df40d4e3aafd4ab9aba9727cd5d31cf081d9374b785a144486',
  getOpsxProposeSkillTemplate: 'dfbbf438cf571ece6fbd9c5402dbed6d05d3c3b1c68631b6fca133ec96cd9abd',
  getOpsxProposeCommandTemplate: 'f8267f48c153493f55d769e9583b4f726431e2df417346c7e9e97afdffeffcdc',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '7a80d827f39d71c6c4664a6a27ab5e91151bbf31c8a91ed757b2e91fa2187062',
  'openspec-new-change': '640bcac6a16c2d3bb25fe036d3d86db977e3468f1c8ee2f499a02e87cda030b4',
  'openspec-continue-change': '2d958ca853bfe9157f222465bf3999945b84c509f7987b1a9ca5d2163af10482',
  'openspec-apply-change': '6ee028fbdc510de98c2d1d7755ee5cb42d50475348bcc56e516b35de3336f8cb',
  'openspec-ff-change': 'da3245429774a1bfb5b330caf3d23eb12edb93ae42c4582c58318ca47b8c5988',
  'openspec-sync-specs': 'e2546b191f4f570dbef3c91304183b96bd4a394ec70c33c708a8bde8b36d9568',
  'openspec-archive-change': '7b536484389c8279eff172ab797b57362295a32029c0cc95133216ee1b868e36',
  'openspec-bulk-archive-change': '4c7b7c3a8c1e0f364ed94aa7f5fa2988801321a757c74b70b367a9bde8e22d11',
  'openspec-verify-change': 'c8fdc20f8a93b495830bd1b4d6215ed44733291c6f5b6acf5e043e9c6bc3e08e',
  'openspec-onboard': 'f1911c7134ee19c83069707dd651623f7187fe0edbc880534c77e40526a6c851',
  'openspec-propose': 'c62270399bec36328e1f9a77adf91eeb530306741544047a329a3fbac2eef6ad',
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

function hashTemplate(templateFn: () => SkillTemplate | CommandTemplate): string {
  const template = templateFn();
  const content = stableStringify(template);
  return createHash('sha256').update(content).digest('hex');
}

describe('Skill Template Parity Tests', () => {
  const templateFunctions: Record<string, () => SkillTemplate | CommandTemplate> = {
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

  it('guards unsupported workspace workflows from repo-local fallback edits', () => {
    const guardedSkills: Array<[string, () => SkillTemplate, string]> = [
      ['openspec-apply-change', getApplyChangeSkillTemplate, 'full workspace apply is not supported'],
      ['openspec-sync-specs', getSyncSpecsSkillTemplate, 'workspace spec sync is not supported'],
      ['openspec-archive-change', getArchiveChangeSkillTemplate, 'workspace archive is not supported'],
      ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate, 'workspace bulk archive is not supported'],
      ['openspec-verify-change', getVerifyChangeSkillTemplate, 'full workspace implementation verification is not supported'],
    ];

    for (const [dirName, createTemplate, guardText] of guardedSkills) {
      const content = generateSkillContent(createTemplate(), 'PARITY-BASELINE');

      expect(content, dirName).toContain('actionContext.mode: "workspace-planning"');
      expect(content, dirName).toContain(guardText);
      expect(content, dirName).not.toContain('openspec/changes/<name>');
      expect(content, dirName).not.toContain('mv openspec/changes');
    }
  });
});
