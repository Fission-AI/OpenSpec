import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  type SkillTemplate,
  getApplyChangeSkillTemplate,
  getCompleteChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getExploreSkillTemplate,
  getFeedbackSkillTemplate,
  getFfChangeSkillTemplate,
  getNewChangeSkillTemplate,
  getOnboardSkillTemplate,
  getPsApplyCommandTemplate,
  getPsCompleteCommandTemplate,
  getPsBulkArchiveCommandTemplate,
  getPsContinueCommandTemplate,
  getPsExploreCommandTemplate,
  getPsFfCommandTemplate,
  getPsNewCommandTemplate,
  getPsOnboardCommandTemplate,
  getPsProposeCommandTemplate,
  getProposeSkillTemplate,
  getPsVerifyCommandTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getApplyChangeSkillTemplate: '7a42d44157e912cf345dde3d99e1450d8b104e7dec53cdc3acf2d69fc693fb78',
  getCompleteChangeSkillTemplate: '2bad0e2858404e2b7fa3f3e18ff5e09d7aaf2a957cfffca7b38a876292234dae',
  getBulkArchiveChangeSkillTemplate: '3f4a389b095f277e299c922d46b6ec9ee17ca2cb3cff92c7aa809c665b9164fb',
  getContinueChangeSkillTemplate: 'cd188f08fa20612ffe445bac0c31bc111149582fc6250e6ea6923ef3198ec660',
  getExploreSkillTemplate: '0b75a6f9a9bbb1811ddaa6f7033e90f9358660ba1a8cf05f107fda5750c2c46f',
  getFeedbackSkillTemplate: '217dcc7f035e18024f3c3c1774f35b421e4043215a0627ecaf71b78baff94df4',
  getFfChangeSkillTemplate: 'abc66c455e4e71e411968461121349e8d2a07fb78c3e2c73cac089abdb5aa008',
  getNewChangeSkillTemplate: '693fe8ead94dabb7cc5e308c48170f5cc16afd8de2987d357d2cb17bc563ec3a',
  getOnboardSkillTemplate: '19c3d9a9c2ae1d6dce05a3fef2849dcd8012cd90be4dce44543de6a993eaff64',
  getProposeSkillTemplate: 'f239bf463d95a2d7f8ee4a5a065d2e4e4783bafa0d58a48891802d75acfda7f7',
  getPsApplyCommandTemplate: '390bfc1eb803490f5abc1fc834d9e475d6548d557ed0e482242cea8379643fcc',
  getPsCompleteCommandTemplate: '74db9b5f7f40e8e3b1360872a74969b1e5676c02eea69ea672d74c5a7c96598f',
  getPsBulkArchiveCommandTemplate: '1464df49ad5bf07a550d34f6950495e5ca397f6eb7a8690bcc0993c8e4136b74',
  getPsContinueCommandTemplate: 'dca3927fa00bf0a7135c6cc99f75b2908e80a38bb495ec5f3e5888743e0f1e6d',
  getPsExploreCommandTemplate: 'bfd0f5505ee60d50fb9b7f1ecb3ffa933d801d86136786e78c4fa4f60a1acabe',
  getPsFfCommandTemplate: 'ef272952e2e01b96ed6e49abef147e8808d6186896d61cea60ce7ebcd947eabc',
  getPsNewCommandTemplate: 'fdb348e81411ff65d722ab90a218155ed301712ef44b6621124dbad726959895',
  getPsOnboardCommandTemplate: 'f01a5baae071c51e5991e10024abef089a35c222c0bbc8be3c2f8dd580d48091',
  getPsProposeCommandTemplate: '9951b03992681834c3aa054f4888b295a9c99d34bfea1d89d158247e9df0faa9',
  getPsVerifyCommandTemplate: 'ff5444b1f84b2de82e3c56b105f384bdd61e58251257b183087c5c92a608e7ec',
  getVerifyChangeSkillTemplate: '75cb3e3bfbeca4402f70a552444c7c7f246e215f1997fc6c545bfda2a3b93179',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'pscode-apply-change': 'daea2fe6d6ea38f92eb498834e5cbb1ef22816f2eebcd44d46f4b67bb0b87191',
  'pscode-archive-change': '984a5bc32c2e35cf0f18800dfd2fa10827668ea2aeb9adcf4a37651d193c2d3a',
  'pscode-bulk-archive-change': 'b9c04ef1f7a0ae77f9614f53a6f3d66d98eab9473a199948690556f6df65a744',
  'pscode-continue-change': '653da27ffeb149d013dae46e5c5798b7d069853df4a8e86eef6be6e7cb8fc473',
  'pscode-explore': '0738211d4ea6a31c346a09f4b0f5d36fe199298c602b9071949fe0da220f1095',
  'pscode-ff-change': 'e90c927e307745c787e379b592c68e4398d8c755f49a5aed05532ccbfe1d3d3b',
  'pscode-new-change': 'de4831901162220364af0992ae500cd0f840d521122b0fb963403857dcaba2e9',
  'pscode-onboard': '619da33e386c2c41e3d0ddafc94572b39f1163050a50d89268e08b31a6b1d1e1',
  'pscode-propose': 'eb5650d788bdac6920c2f538806d9af0274dac8c7431d2283e0efdba300c3e45',
  'pscode-verify-change': '0bfe7b51d85a62b8229c12d30405d1070a6e27ecfa636e525eb7508e0cddcb4a',
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
      getOnboardSkillTemplate,
      getPsExploreCommandTemplate,
      getPsNewCommandTemplate,
      getPsContinueCommandTemplate,
      getPsApplyCommandTemplate,
      getPsFfCommandTemplate,
      getCompleteChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getVerifyChangeSkillTemplate,
      getPsCompleteCommandTemplate,
      getPsOnboardCommandTemplate,
      getPsBulkArchiveCommandTemplate,
      getPsVerifyCommandTemplate,
      getProposeSkillTemplate,
      getPsProposeCommandTemplate,
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
      ['pscode-explore', getExploreSkillTemplate],
      ['pscode-new-change', getNewChangeSkillTemplate],
      ['pscode-continue-change', getContinueChangeSkillTemplate],
      ['pscode-apply-change', getApplyChangeSkillTemplate],
      ['pscode-ff-change', getFfChangeSkillTemplate],
      ['pscode-archive-change', getCompleteChangeSkillTemplate],
      ['pscode-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
      ['pscode-verify-change', getVerifyChangeSkillTemplate],
      ['pscode-onboard', getOnboardSkillTemplate],
      ['pscode-propose', getProposeSkillTemplate],
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
      ['pscode-apply-change', getApplyChangeSkillTemplate, 'full workspace apply is not supported'],
      ['pscode-archive-change', getCompleteChangeSkillTemplate, 'workspace archive is not supported'],
      ['pscode-bulk-archive-change', getBulkArchiveChangeSkillTemplate, 'workspace bulk archive is not supported'],
      ['pscode-verify-change', getVerifyChangeSkillTemplate, 'full workspace implementation verification is not supported'],
    ];

    for (const [dirName, createTemplate, guardText] of guardedSkills) {
      const content = generateSkillContent(createTemplate(), 'PARITY-BASELINE');

      expect(content, dirName).toContain('actionContext.mode: "workspace-planning"');
      expect(content, dirName).toContain(guardText);
      expect(content, dirName).not.toContain('pscode/changes/<name>');
      expect(content, dirName).not.toContain('mv pscode/changes');
    }
  });
});
