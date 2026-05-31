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
  getPsApplyCommandTemplate,
  getPsArchiveCommandTemplate,
  getPsBulkArchiveCommandTemplate,
  getPsContinueCommandTemplate,
  getPsExploreCommandTemplate,
  getPsFfCommandTemplate,
  getPsNewCommandTemplate,
  getPsOnboardCommandTemplate,
  getPsSyncCommandTemplate,
  getPsProposeCommandTemplate,
  getProposeSkillTemplate,
  getPsVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getApplyChangeSkillTemplate: '8901f23e1a3d9da67e34ab9b375aed6f450590b217529c6cf67abf864807c5c4',
  getArchiveChangeSkillTemplate: 'ef6e28294e7a6d96505df441f6ee6049bdb6bbf7a9035a492dde7344e8eb5f24',
  getBulkArchiveChangeSkillTemplate: '3f4a389b095f277e299c922d46b6ec9ee17ca2cb3cff92c7aa809c665b9164fb',
  getContinueChangeSkillTemplate: 'cd188f08fa20612ffe445bac0c31bc111149582fc6250e6ea6923ef3198ec660',
  getExploreSkillTemplate: '0b75a6f9a9bbb1811ddaa6f7033e90f9358660ba1a8cf05f107fda5750c2c46f',
  getFeedbackSkillTemplate: '217dcc7f035e18024f3c3c1774f35b421e4043215a0627ecaf71b78baff94df4',
  getFfChangeSkillTemplate: 'abc66c455e4e71e411968461121349e8d2a07fb78c3e2c73cac089abdb5aa008',
  getNewChangeSkillTemplate: '693fe8ead94dabb7cc5e308c48170f5cc16afd8de2987d357d2cb17bc563ec3a',
  getOnboardSkillTemplate: '58534c9d4cddbbd23bffd66b829ee50681f2c94945c5ec0f61d23ce7d5ef03d0',
  getProposeSkillTemplate: 'f239bf463d95a2d7f8ee4a5a065d2e4e4783bafa0d58a48891802d75acfda7f7',
  getPsApplyCommandTemplate: 'b08e52d5eefee5585953e8fd5597d7404fbbb169879b5a76abdb796e35474cc5',
  getPsArchiveCommandTemplate: '41f4cd14fac214e9f0a23042bb725ab0a787118891c8d5ceb3aff96da8ea9502',
  getPsBulkArchiveCommandTemplate: '1464df49ad5bf07a550d34f6950495e5ca397f6eb7a8690bcc0993c8e4136b74',
  getPsContinueCommandTemplate: 'dca3927fa00bf0a7135c6cc99f75b2908e80a38bb495ec5f3e5888743e0f1e6d',
  getPsExploreCommandTemplate: 'bfd0f5505ee60d50fb9b7f1ecb3ffa933d801d86136786e78c4fa4f60a1acabe',
  getPsFfCommandTemplate: 'ef272952e2e01b96ed6e49abef147e8808d6186896d61cea60ce7ebcd947eabc',
  getPsNewCommandTemplate: 'fdb348e81411ff65d722ab90a218155ed301712ef44b6621124dbad726959895',
  getPsOnboardCommandTemplate: '23aff5092861aae702dcd1508d0e3dc2eb835d5f3c4eeccab4da18a6a63604fc',
  getPsProposeCommandTemplate: '9951b03992681834c3aa054f4888b295a9c99d34bfea1d89d158247e9df0faa9',
  getPsSyncCommandTemplate: '7e24aaf6b126cb256ab76d802877adbbe12d2cf8e6c60310fc40ff64c2ad852b',
  getPsVerifyCommandTemplate: 'ff5444b1f84b2de82e3c56b105f384bdd61e58251257b183087c5c92a608e7ec',
  getSyncSpecsSkillTemplate: 'c3a49701bdd4a7501df454dac72b19faa4104cee3a01851dc91dd7d55ec63127',
  getVerifyChangeSkillTemplate: '75cb3e3bfbeca4402f70a552444c7c7f246e215f1997fc6c545bfda2a3b93179',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'pscode-apply-change': 'acab8747674045b45fda486f8f2614c965784c8f5ef29739636f997e1ecbc07d',
  'pscode-archive-change': '71bec77766fc32d43f4b2385fcec95d1913b7bd28ab90ccc090fa1553e9b8a72',
  'pscode-bulk-archive-change': 'b9c04ef1f7a0ae77f9614f53a6f3d66d98eab9473a199948690556f6df65a744',
  'pscode-continue-change': '653da27ffeb149d013dae46e5c5798b7d069853df4a8e86eef6be6e7cb8fc473',
  'pscode-explore': '0738211d4ea6a31c346a09f4b0f5d36fe199298c602b9071949fe0da220f1095',
  'pscode-ff-change': 'e90c927e307745c787e379b592c68e4398d8c755f49a5aed05532ccbfe1d3d3b',
  'pscode-new-change': 'de4831901162220364af0992ae500cd0f840d521122b0fb963403857dcaba2e9',
  'pscode-onboard': '0f0e3b085c21aec962ed497beafca44d72e5c8229e49a499f84e81b27e0e5161',
  'pscode-propose': 'eb5650d788bdac6920c2f538806d9af0274dac8c7431d2283e0efdba300c3e45',
  'pscode-sync-specs': '1d82a2661add555ac0517b0f9109a5432a7733d5c2820389252f3deebe22065d',
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
      getSyncSpecsSkillTemplate,
      getOnboardSkillTemplate,
      getPsExploreCommandTemplate,
      getPsNewCommandTemplate,
      getPsContinueCommandTemplate,
      getPsApplyCommandTemplate,
      getPsFfCommandTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getPsSyncCommandTemplate,
      getVerifyChangeSkillTemplate,
      getPsArchiveCommandTemplate,
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
      ['pscode-sync-specs', getSyncSpecsSkillTemplate],
      ['pscode-archive-change', getArchiveChangeSkillTemplate],
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
      ['pscode-sync-specs', getSyncSpecsSkillTemplate, 'workspace spec sync is not supported'],
      ['pscode-archive-change', getArchiveChangeSkillTemplate, 'workspace archive is not supported'],
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
