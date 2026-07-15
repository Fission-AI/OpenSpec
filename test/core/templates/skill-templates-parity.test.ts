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
  getExploreSkillTemplate: '7d2f54e74fffcb36aaaa4498a4a8b033142bb25945fb9b2de532354acbe76b9c',
  getNewChangeSkillTemplate: '2994cb7688858fef63469415ad759cd60508dcd4d0746d7c304099d5a6e186f0',
  getContinueChangeSkillTemplate: '1bb28875d6e5946ea2ec5f12e90f55d9784c2fa1f6e4c4e2d0eda53d861d4c75',
  getApplyChangeSkillTemplate: '0f5a15fc7fb9ad6059a5643d0e01365d27642637a4aaebf182f9eabb45348197',
  getFfChangeSkillTemplate: '594cbbf298b892727cccd6bd4ce80acd5fb278c972a778deb05e87b87eacd124',
  getSyncSpecsSkillTemplate: '75abb20572256e2b8a647e77befae99f109ab5c4dc954a9c3c184829b5fcaa40',
  getOnboardSkillTemplate: 'a6a45448c5d92b13e5adddbf6b2a289554b82d56bf5bc44d862bb092c0aae648',
  getOpsxExploreCommandTemplate: '37e53590aae7ac6621d4393aa80a5b8af21881323887fa924ed329199fda27e0',
  getOpsxNewCommandTemplate: 'c329c787ee8db8849d2f4dd7f07cbc5a8bb2290d93bc9623306a2770771aba0e',
  getOpsxContinueCommandTemplate: '418108b417107a87019d4020b26c105792d2ef0110fe6920445e255889216716',
  getOpsxApplyCommandTemplate: 'daeb507206707169de73c828e199648dde5732cbc17791ef2a027adffd028574',
  getOpsxFfCommandTemplate: 'db317fb793951bcfac7386100c6351ffb755395fe0924336d32ce1811509cb9a',
  getArchiveChangeSkillTemplate: '2a5efdf94471c41aaa077d89b3c8f803b4729b007fe0bb65f50e7b364b37fb82',
  getBulkArchiveChangeSkillTemplate: '5f40744f638d883f303395d8d01777b1cd4995bd44dc75106833b7fb01c6f04a',
  getOpsxSyncCommandTemplate: '86cf706886d0f18069e2cfa16948b7357028fd348210efb58588c88c416d8622',
  getVerifyChangeSkillTemplate: 'd718c79aad649223a73fdb11036c93fb3842ac5a780f4934d50bfa03c9692683',
  getOpsxArchiveCommandTemplate: '6ae626f4d6331aa046a434f7de07aea01e2e50c6584a0224a779c226303e2858',
  getOpsxOnboardCommandTemplate: '21dc97ae57508de0cd0fa3abd7681cfa0876543cbd83d56cf5af1c13e7cc9739',
  getOpsxBulkArchiveCommandTemplate: 'acfcd6d2a492a9d0981195ba898ad65c324efde1e61981017b46c158be21cdce',
  getOpsxVerifyCommandTemplate: '011509480a20a60342c993906f0f9280c0e9ba5d019d335bdc1ef4d53213a5a8',
  getOpsxProposeSkillTemplate: '6075e12526e1c85ae677453ce504989a75f4913974a4108cbc0cfd74e962558a',
  getOpsxProposeCommandTemplate: '7ecc7051be1c9c74b7a3c07951a4dc4ba10232f110c3ec58aa203f8fc1dcc5ac',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getUpdateChangeSkillTemplate: 'fe2e8edaf973d42dc7fc7dfd846105c4c3cfec0437606e582ec644985cd4e81d',
  getOpsxUpdateCommandTemplate: 'e55ac5774203a7d9037d2d588889c97c53f3f930da49497cc79e865375920da7',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'ba099821631ce75ee70af370917bbddbc88d0882ad0e50e91ed687d2185102ef',
  'openspec-new-change': '17d245dfa5c30780eb405eb8fbd27cf58036a2636768261fc115ae5e6825154a',
  'openspec-continue-change': '39b4467a4873cde7c97d52c80d53ac647b220bf7c9d96f4e6505f3188e1a1642',
  'openspec-apply-change': '09c0e1cdf5ccc82416d0969d6bd715cc70616bdbc3531358a5c36057f78be55a',
  'openspec-ff-change': 'baa82c4671d0a3b39de622d46751cadf8a7d270258daba33775b87b6c7da9d71',
  'openspec-sync-specs': 'f6a1581eb11a30061795c42582db6fa4f5e1f213b4b7cad9f3cbfbe3e9fb2d97',
  'openspec-archive-change': '656c52af9aa7f30c1b503b29ea5750e1f458fce240ef8907d039fc3bb34bbd74',
  'openspec-bulk-archive-change': '55fac949edfcce909d0321742ed6adcb97ae0450a59c23d549e067d8bcc95c45',
  'openspec-verify-change': '9a8735eaaa34c278d2193eb32fa736f4b111d1c47e675971c8df40f81d20c8c3',
  'openspec-onboard': '87d57f051874aec372a999f122ca76e5ea3d13bb2cc02525daf115a6dc314781',
  'openspec-propose': '3d1934c64158b9be02ee9b2277583fca5ab70b7d66760dffb053a1e4daec5d2f',
  'openspec-update-change': '77ff4d1f1cd08a57649cce1f25e0ebc4f55d6d032dfde5c301d1b479561b72fa',
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
  it('requires explicit domain selection without silently rewriting literals', () => {
    const templates: Array<[string, string]> = [
      ['openspec-propose skill', getOpsxProposeSkillTemplate().instructions],
      ['openspec-propose command', getOpsxProposeCommandTemplate().content],
      ['openspec-new-change skill', getNewChangeSkillTemplate().instructions],
      ['openspec-new-change command', getOpsxNewCommandTemplate().content],
    ];

    for (const [label, content] of templates) {
      expect(content, label).toContain('Domain selection is mandatory');
      expect(content, label).toContain('lowercase kebab-case');
      expect(content, label).toContain('Do not silently transform');
      expect(content, label).toContain('Convert to the suggested');
      expect(content, label).toContain('Keep the exact literal');
      expect(content, label).toContain('Choose another domain');
      expect(content, label).toContain('replace underscores with hyphens');
      expect(content, label).toContain('`XMLParser` -> `xml-parser`');
      expect(content, label).toContain('`IOError` -> `io-error`');
      expect(content, label).toContain('lowercase only after the user chooses conversion');
    }
  });

  it('passes the mandatory domain and preserves Store selection in every creation workflow', () => {
    const templates: Array<[string, string]> = [
      ['openspec-propose skill', getOpsxProposeSkillTemplate().instructions],
      ['openspec-propose command', getOpsxProposeCommandTemplate().content],
      ['openspec-new-change skill', getNewChangeSkillTemplate().instructions],
      ['openspec-new-change command', getOpsxNewCommandTemplate().content],
      ['openspec-ff-change skill', getFfChangeSkillTemplate().instructions],
      ['openspec-ff-change command', getOpsxFfCommandTemplate().content],
      ['openspec-onboard skill', getOnboardSkillTemplate().instructions],
      ['openspec-onboard command', getOpsxOnboardCommandTemplate().content],
    ];

    for (const [label, content] of templates) {
      expect(content, label).toContain('openspec new change "<name>" --domain "<resolved-domain>"');
      expect(content, label).toContain('openspec new change "<name>" --domain ""');
      expect(content, label).toContain('append `--store <id>`');
      expect(content, label).toContain(STORE_SELECTION_GUIDANCE);
    }
  });

  it('uses the canonical change ID for every lifecycle command after creation', () => {
    const templates: Array<[string, string]> = [
      ['openspec-propose skill', getOpsxProposeSkillTemplate().instructions],
      ['openspec-propose command', getOpsxProposeCommandTemplate().content],
      ['openspec-new-change skill', getNewChangeSkillTemplate().instructions],
      ['openspec-new-change command', getOpsxNewCommandTemplate().content],
      ['openspec-ff-change skill', getFfChangeSkillTemplate().instructions],
      ['openspec-ff-change command', getOpsxFfCommandTemplate().content],
      ['openspec-onboard skill', getOnboardSkillTemplate().instructions],
      ['openspec-onboard command', getOpsxOnboardCommandTemplate().content],
    ];

    for (const [label, content] of templates) {
      const canonicalGuidance =
        'Set `<change-id>` to `<resolved-domain>/<name>` for a non-root domain, or `<name>` for root placement.';
      expect(content, label).toContain(canonicalGuidance);
      expect(content, label).toContain('openspec status --change "<change-id>"');
      expect(content, label).toMatch(/openspec instructions .+ --change "<change-id>"/u);
      expect(content, label).not.toContain('--change "<name>"');
      expect(content, label).not.toContain('openspec archive "<name>"');

      const downstreamContent = content.slice(content.indexOf(canonicalGuidance));
      for (const reference of downstreamContent
        .split('\n')
        .filter((line) => /\/opsx:(?:apply|continue|archive|verify)(?:\s|`)/u.test(line))) {
        expect(reference, `${label}: ${reference.trim()}`).toContain('<change-id>');
      }
    }

    for (const [label, content] of templates.filter(([label]) => label.includes('onboard'))) {
      expect(content, label).toContain('openspec archive "<change-id>"');
    }
  });

  it('archives slash-qualified changes beside changes while preserving their domains', () => {
    const templates: Array<[string, string]> = [
      ['openspec-archive-change skill', getArchiveChangeSkillTemplate().instructions],
      ['openspec-archive-change command', getOpsxArchiveCommandTemplate().content],
      ['openspec-bulk-archive-change skill', getBulkArchiveChangeSkillTemplate().instructions],
      ['openspec-bulk-archive-change command', getOpsxBulkArchiveCommandTemplate().content],
      ['openspec-onboard skill', getOnboardSkillTemplate().instructions],
      ['openspec-onboard command', getOpsxOnboardCommandTemplate().content],
    ];

    for (const [label, content] of templates) {
      expect(content, label).toContain('full slash-delimited change ID');
      expect(content, label).toContain(
        '<planningHome.root>/openspec/archive/<domain>/YYYY-MM-DD-<name>'
      );
      expect(content, label).toContain(
        '<planningHome.root>/openspec/archive/YYYY-MM-DD-<name>'
      );
      expect(content, label).not.toContain('<planningHome.changesDir>/archive');
      expect(content, label).not.toContain('changes/archive');
    }
  });

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
