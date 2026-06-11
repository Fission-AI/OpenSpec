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
import {
  generateSkillContent,
  getCommandContents,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: 'a75fe741c0278576d32ddf8c072aa64bf1eaf632306f2a7cfd2e099e96f517cb',
  getNewChangeSkillTemplate: '1a5fe8b45cd5506a526c68830791d78b54a62b1256483a165763a92575f65761',
  getContinueChangeSkillTemplate: '28cdc7aee4a38c0d4700d19cf67341267ed002687432ab21b762b91f022f79b3',
  getApplyChangeSkillTemplate: 'b3938e6f0430909d78ec77174e1147d2dfbe1af42ca0e0b4776f2518598c3d8b',
  getFfChangeSkillTemplate: '039bba4fb6b2318745cccd2e5ffb20c41558acda4653f6f89c18238ab7d27b13',
  getSyncSpecsSkillTemplate: 'd2df600f8fad697fed70f9835cdc5310445c3f218539bb5ebfddf9195a3eda09',
  getOnboardSkillTemplate: '9c81fd8d5ca9abb972a4466e94c2fa4f6d3b8ea5c31f7f4323efac3364b6e242',
  getOpsxExploreCommandTemplate: 'e5537de8611327bd26830f644daadee48da7bdf955773ce354a3ca880dffb1a5',
  getOpsxNewCommandTemplate: '0b948c20391032aba866ce18cd2ddd3242e2fb5a0cb9c0e91fbd4e5d873b215d',
  getOpsxContinueCommandTemplate: '6ea1c14793e893ca1279d98d45edc36765af1095904d06a0d09e6edfe92086f0',
  getOpsxApplyCommandTemplate: 'cd6207a85f8417303238ff93e55296dfb4c4bc2defb12c0f8b9f63ace384b910',
  getOpsxFfCommandTemplate: 'b2483a1dd727a272ef34e61326fe3e1e36c9f1ce2839199fb35f7e18b2be7de5',
  getArchiveChangeSkillTemplate: 'd0ee7730ab557ca67ea534dba8b4e3191a200782f0e6582e87b2ebca7de6b881',
  getBulkArchiveChangeSkillTemplate: '64999f8f871caface9adc9806c2e39784c4762cd37ad7fdd8b9577d7b1777746',
  getOpsxSyncCommandTemplate: '6c1c9fc5ba968a0ff720342f8ccf1eae46b01751e37cc62e730403500e02f719',
  getVerifyChangeSkillTemplate: '69e1e413f36d51ac223efe9e579dd1b226c2d86f60f26750dcb460b6fc4ac911',
  getOpsxArchiveCommandTemplate: 'bf776ba913cd236184c04afb3dbfaeb96a676fbd5fc63d058c7ee9a806b5c091',
  getOpsxOnboardCommandTemplate: '6fb3c0e417cd0d022f4f6b728ebad6ea505959593ce497cfcc8b539c449e9f0f',
  getOpsxBulkArchiveCommandTemplate: 'c57372d09e31ec94f4a693ecae2d1a34143070398b09d5405e51a5ba9dc719c9',
  getOpsxVerifyCommandTemplate: 'fa9b62438814c3c7b630a3cc8d789d7e7b945f08a94155d1b0601c8a83518465',
  getOpsxProposeSkillTemplate: '73c20bbeabbb730cd8685de9c1f61f6f495faeba82bd58755f6115de31e294ca',
  getOpsxProposeCommandTemplate: 'd586b51977f23f7d494c544a734ef1907a535eabb3bd320a39e11824abc162b7',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '5ea56dbe7aed93f93908603e0ca787cff59fc6fc8f34bc7edfa5b5ca8b99f0b9',
  'openspec-new-change': '9e1649d04be60f4e2028e0bbafa6fc9bc5e4b80afb32c36d213dfb318421fd01',
  'openspec-continue-change': '93bb6cf1edcbc456393b2c872c97c705c938af6a9db74f2d02012e03c6b57763',
  'openspec-apply-change': 'd39e52a8b89000be00ac07e8c33818a85b8039a0223fcdcc4129c8f2a4c17891',
  'openspec-ff-change': '4679cfd482f97a6dc132eaacb2f1bfaa0d20ba9513130e17417aac8148a2fe49',
  'openspec-sync-specs': '1956ef553c152b03eb76bd9b7d8e1f1c247a190088766b0858927d6752574946',
  'openspec-archive-change': '2a1e55ce2fec7669e59360c42be6c86ede6f0f23b39f6d41383517084286b560',
  'openspec-bulk-archive-change': '44e73d38a3d58f13dadeab97e425754e1c222ee7b5ba8883a90d4397a69e9e66',
  'openspec-verify-change': 'fac1708a6dc00a0bc5afea3ff0e334b042542ed343b54a8d8e82463b33b15ca6',
  'openspec-onboard': '6636f4c7e14617302f4a98e824ca7b82fe51e6c66d958e3c963e60f9f60e559e',
  'openspec-propose': 'b001b0ef37e42d49bd2d8e6acf58329f30edd344483db5cbfc66295ea9c40a4d',
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

  it('teaches store selection in every deployed opsx command template', () => {
    for (const entry of getCommandContents()) {
      expect(entry.body, entry.id).toContain(STORE_SELECTION_GUIDANCE);
    }

    // Feedback has no store-capable command and intentionally carries no
    // store teaching; it ships outside both registries.
    expect(getFeedbackSkillTemplate().instructions).not.toContain('**Store selection:**');
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
