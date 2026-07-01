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
  getExploreSkillTemplate: '48cbd02b12009c0e573aeca55dd6100b8b6ce455bd8bdd066bbccd4c729b03f7',
  getNewChangeSkillTemplate: 'e0d3a0772dfea90c04ae5e8d4208f8e7b930e6e8b13750ce451494688ec15217',
  getContinueChangeSkillTemplate: '11c19058472441295ddf608ded7a4b5fb2ad61ecba40e23b34d307fe59e55919',
  getApplyChangeSkillTemplate: '8fba9936ca420c6fd58e193426b96090e7c9fb17fe3f61a634f0961528e59b19',
  getFfChangeSkillTemplate: 'cf2488c33e0e0887ef7796e14071f18dccdd7c3660589d909108fdeabd5a2658',
  getSyncSpecsSkillTemplate: 'd6c1318bf4be083854cc1614f3a8173305f882ad3ad9568e6e716de94217648a',
  getOnboardSkillTemplate: '70a35eea8d6307cd6f7ab5846d5ad332b84d4b14027270c9c424c3b017676e6b',
  getOpsxExploreCommandTemplate: 'b747835aab935e6de79ffb1ec57600b70b007281ea516e0cae3c8b0e17fb3fa9',
  getOpsxNewCommandTemplate: 'be163b04b8af25cf33a17bb5f3e4c36febec9b74a381670e57b403dd0529cacf',
  getOpsxContinueCommandTemplate: '571de5710023b5a17f4e3a37e03d9a7af90fedce88552bfc43c9dff82e6bbe28',
  getOpsxApplyCommandTemplate: 'c46308f178f29d8ce66c86f2848cd182c1ee884c421a67d3e9cf644762f9f8cc',
  getOpsxFfCommandTemplate: 'd2e94a55f1597959cf2f65e3fc5a4c587676e9de2c7d7a84edf46a01d86b292e',
  getArchiveChangeSkillTemplate: 'ba42fde5ef6ee385edcdb4c25d66cee1aa7f701b6c4ad6fbcb0d846d80711393',
  getBulkArchiveChangeSkillTemplate: '25698132be5b11118896029828d9d85645653354383dc2e9dea0fd334c49767a',
  getOpsxSyncCommandTemplate: '558ad519502a0774447fab1322424754474bcfcb03bf53292577d129cf8d14fe',
  getVerifyChangeSkillTemplate: 'cbc5dcb9c7814f95740f502a7d8fdf3063ee4935762a71502efefc36f107639d',
  getOpsxArchiveCommandTemplate: 'dfe3ce852ac3b3af2119d99fa6fe0c2f0b543bca783c4b19c5ddd7c0cdb68319',
  getOpsxOnboardCommandTemplate: '83edd627153a5280356abfeba111d947b9c13ffd34f8ff9446931f041584df1f',
  getOpsxBulkArchiveCommandTemplate: '01dc410f437c49f606778c58493023676d432353698113c501c5cb910f95ec16',
  getOpsxVerifyCommandTemplate: '979bac81bf9c3ae054d7b7dea2c0d8b5d6d55d2eee51709281effb806ee280cd',
  getOpsxProposeSkillTemplate: '1a46a9da3ed6ce1b8c0733d52e63f267a7dad6907adda4f7a329b47b27807a00',
  getOpsxProposeCommandTemplate: '9218180a6752692398eac69dc960099960680bb9dbd363ca6c9295f9c5428b7c',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'a453c7d19485ca751186c1373ad598b0077e7c208355e9b386dd8c8494a63553',
  'openspec-new-change': '2e6c2f1adfc2f1c717055f3032cc76c1403436c57572fc8be64cd3125bd2903f',
  'openspec-continue-change': '3e2df28eb3f8988dcc75b9a96125f36aa8558058e17b39e363d929a6217a70ae',
  'openspec-apply-change': '4ff8ddf628866be3b79cf116d3a29ac9d1d87961387de130220498c9fab0e74d',
  'openspec-ff-change': '3a35d39f2e925df1d91921e1c78fd3b67288b51888f61dff299deabcbba2cc61',
  'openspec-sync-specs': '536408e97bf275a3a20fea3bfe34bbf9e6e184dac08812064f90071bff13dcd7',
  'openspec-archive-change': '427ac51eb00a4572178b8924db7f986b24b1f0bcd9a59bdc687ef5bc69ac7392',
  'openspec-bulk-archive-change': '89add53ae210265287b661ca64f1c4f536457d1873cfa68c727e13d85651d8e5',
  'openspec-verify-change': '8ebcd05be99c3742d0f7eec6779dd211f7318c3af22a519521a3d9e6b1f74f1d',
  'openspec-onboard': 'dd51c8620d4813c4dab1dda7d7a0d889b1240cee31b2cdc03fcdd667e974ea6e',
  'openspec-propose': 'adf8d619738ffec65cf9588f44bccf8c9c89446069a46e6f82f9ec88213c9c95',
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
