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
  getFfChangeSkillTemplate: 'eb202d18fcbbe3833cba0bf267f8e45f6e71fa0d60a33f80ab97fe5b405830da',
  getSyncSpecsSkillTemplate: '9559d55a649f68ab0cee69017e0895eb92b7ce16896d353e3b0429ca4f474704',
  getOnboardSkillTemplate: 'a3869b632379ac56ab09e59d1efa53283947b2d73c3fb74156913c7e5b84342f',
  getOpsxExploreCommandTemplate: '37e53590aae7ac6621d4393aa80a5b8af21881323887fa924ed329199fda27e0',
  getOpsxNewCommandTemplate: 'c329c787ee8db8849d2f4dd7f07cbc5a8bb2290d93bc9623306a2770771aba0e',
  getOpsxContinueCommandTemplate: '418108b417107a87019d4020b26c105792d2ef0110fe6920445e255889216716',
  getOpsxApplyCommandTemplate: 'daeb507206707169de73c828e199648dde5732cbc17791ef2a027adffd028574',
  getOpsxFfCommandTemplate: 'f2a8f6f49866b3c7cd1c8e9ef46dcb5d68f7eff054e6a7ef00b3dfc6da33675c',
  getArchiveChangeSkillTemplate: '0f1e8090ee2350f406e3605572619ce022cc1ac34b14dec5d36f97e73072ffb3',
  getBulkArchiveChangeSkillTemplate: 'c47334cf94ef30184cd116fac7364853d4f8bd82487d1ba5adb7400a6479de6a',
  getOpsxSyncCommandTemplate: '713969eae4bfda6d8046cdefe1b19f3dbb2cbd0920125755037561d6c26469b3',
  getVerifyChangeSkillTemplate: 'd718c79aad649223a73fdb11036c93fb3842ac5a780f4934d50bfa03c9692683',
  getOpsxArchiveCommandTemplate: '8c443a55106ef4004c6f5e3d5a0ed1381e0d3d217c53d2aba05067860e976ef5',
  getOpsxOnboardCommandTemplate: '79f214d7f189248fe7dafe5ba5f92b9d5c1d5f9b58bff0ed549e89c0d0cd0d55',
  getOpsxBulkArchiveCommandTemplate: '38ad1d292f77044068eb6749d678cf7e69b610f4b1f4b1b667b55f9d2e2912b7',
  getOpsxVerifyCommandTemplate: '011509480a20a60342c993906f0f9280c0e9ba5d019d335bdc1ef4d53213a5a8',
  getOpsxProposeSkillTemplate: '2515367c8db1fdaaf1a73388dd3f59668d6d41c5753d9a1566925c6851b265e4',
  getOpsxProposeCommandTemplate: '33f580cf45baa81987e3652c9574b9a55a1ef3537e57d89fd4b50d52d0728b0d',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getUpdateChangeSkillTemplate: 'fe2e8edaf973d42dc7fc7dfd846105c4c3cfec0437606e582ec644985cd4e81d',
  getOpsxUpdateCommandTemplate: 'e55ac5774203a7d9037d2d588889c97c53f3f930da49497cc79e865375920da7',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'ba099821631ce75ee70af370917bbddbc88d0882ad0e50e91ed687d2185102ef',
  'openspec-new-change': '17d245dfa5c30780eb405eb8fbd27cf58036a2636768261fc115ae5e6825154a',
  'openspec-continue-change': '39b4467a4873cde7c97d52c80d53ac647b220bf7c9d96f4e6505f3188e1a1642',
  'openspec-apply-change': '09c0e1cdf5ccc82416d0969d6bd715cc70616bdbc3531358a5c36057f78be55a',
  'openspec-ff-change': 'b8567d9e727b1342126504685337719b1204839478660dac3e28a3f2250ab2c6',
  'openspec-sync-specs': '479068632b10d3bf060c65cd20c645a074f25d8d41bcce6199a48a95543fb1eb',
  'openspec-archive-change': '61965cf8db3b571d1a45ee6e526154f3f546798220a45ffb5e7619cbc899ac6d',
  'openspec-bulk-archive-change': 'c3f5fe47e04e6828a62988f548dee2b81982827d3e6490e95c36521fc07ff490',
  'openspec-verify-change': '9a8735eaaa34c278d2193eb32fa736f4b111d1c47e675971c8df40f81d20c8c3',
  'openspec-onboard': 'c9fb3577d8b9ba876b3d7b95e85781c989ca302ca95f3e8e9abe2df890bcd92b',
  'openspec-propose': '2edb42356aeb5b2c51b5750e888b0d987f64a4dd63f4b2008117acc9d4f4ca26',
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

  it('keeps exact domain literals as an explicit user choice in fast-forward and onboarding', () => {
    const templates: Array<[string, string]> = [
      ['openspec-ff-change skill', getFfChangeSkillTemplate().instructions],
      ['openspec-ff-change command', getOpsxFfCommandTemplate().content],
      ['openspec-onboard skill', getOnboardSkillTemplate().instructions],
      ['openspec-onboard command', getOpsxOnboardCommandTemplate().content],
    ];

    for (const [label, content] of templates) {
      expect(content, label).toContain('Do not silently transform');
      expect(content, label).toContain('Convert to the suggested');
      expect(content, label).toContain('Keep the exact literal');
      expect(content, label).toContain('Choose another domain');
    }
  });

  it('uses canonical change and spec IDs throughout archive, bulk archive, and sync workflows', () => {
    const archiveTemplates: Array<[string, string]> = [
      ['archive skill', getArchiveChangeSkillTemplate().instructions],
      ['archive command', getOpsxArchiveCommandTemplate().content],
    ];
    const bulkTemplates: Array<[string, string]> = [
      ['bulk archive skill', getBulkArchiveChangeSkillTemplate().instructions],
      ['bulk archive command', getOpsxBulkArchiveCommandTemplate().content],
    ];
    const syncTemplates: Array<[string, string]> = [
      ['sync skill', getSyncSpecsSkillTemplate().instructions],
      ['sync command', getOpsxSyncCommandTemplate().content],
    ];

    for (const [label, content] of [...archiveTemplates, ...bulkTemplates, ...syncTemplates]) {
      expect(content, label).toContain('openspec status --change "<change-id>" --json');
      expect(content, label).not.toContain('--change "<name>"');
      expect(content, label).toContain(
        'derive `<domain>` only from every segment before the final `<name>` in the full `<change-id>`'
      );
      expect(content, label).toContain(
        'The repo-local delta path `specs/<capability>/spec.md` does not contain the change domain.'
      );
      expect(content, label).toContain('openspec/specs/<domain>/<capability>/spec.md');
      expect(content, label).toContain('openspec/specs/<capability>/spec.md');
    }

    for (const [label, content] of archiveTemplates) {
      expect(content, label).toContain("openspec-sync-specs for change '<change-id>'");
    }

    for (const [label, content] of bulkTemplates) {
      expect(content, label).toContain('`<spec-id> -> [<change-id>...]`');
      expect(content, label).toContain('identical capability leaves in different domains');
      expect(content, label).not.toContain('`capability -> [changes that touch it]`');
    }
  });

  it('domain-qualifies the propose pre-creation apply teaser', () => {
    for (const [label, content] of [
      ['propose skill', getOpsxProposeSkillTemplate().instructions],
      ['propose command', getOpsxProposeCommandTemplate().content],
    ] as Array<[string, string]>) {
      expect(content, label).toContain('When ready to implement, run /opsx:apply <change-id>');
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
