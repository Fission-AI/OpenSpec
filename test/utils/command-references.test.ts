import { describe, it, expect } from 'vitest';
import {
  getSkillReferenceTransformer,
  getTransformerForTool,
  transformCommandInvocations,
  transformToSkillReferences,
} from '../../src/utils/command-references.js';
import type { CommandInvocation } from '../../src/core/command-generation/invocation.js';
import { getApplyChangeSkillTemplate } from '../../src/core/templates/workflows/apply-change.js';

const FLAT_SLASH: CommandInvocation = { style: 'flat', prefix: '/' };
const FLAT_AT: CommandInvocation = { style: 'flat', prefix: '@' };
const NAMESPACED_SLASH: CommandInvocation = { style: 'namespaced', prefix: '/' };

/** The `/opsx-<id>` case, which most flat tools use. */
const transformToHyphenCommands = (text: string): string =>
  transformCommandInvocations(text, FLAT_SLASH);

describe('transformCommandInvocations', () => {
  describe('basic transformations', () => {
    it('should transform single command reference', () => {
      expect(transformToHyphenCommands('/opsx:new')).toBe('/opsx-new');
    });

    it('should transform multiple command references', () => {
      const input = '/opsx:new and /opsx:apply';
      const expected = '/opsx-new and /opsx-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should transform command reference in context', () => {
      const input = 'Use /opsx:apply to implement tasks';
      const expected = 'Use /opsx-apply to implement tasks';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should handle backtick-quoted commands', () => {
      const input = 'Run `/opsx:continue` to proceed';
      const expected = 'Run `/opsx-continue` to proceed';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should return unchanged text with no command references', () => {
      const input = 'This is plain text without commands';
      expect(transformToHyphenCommands(input)).toBe(input);
    });

    it('should return empty string unchanged', () => {
      expect(transformToHyphenCommands('')).toBe('');
    });

    it('should not transform similar but non-matching patterns', () => {
      const input = '/ops:new opsx: /other:command';
      expect(transformToHyphenCommands(input)).toBe(input);
    });

    it('should handle multiple occurrences on same line', () => {
      const input = '/opsx:new /opsx:continue /opsx:apply';
      const expected = '/opsx-new /opsx-continue /opsx-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should leave unknown command references unchanged', () => {
      // Mirrors transformToSkillReferences: an invented id is left as written
      // rather than reshaped into a command that does not exist either.
      const input = 'Try /opsx:unknown-command here';
      expect(transformToHyphenCommands(input)).toBe(input);
    });

    it('should rewrite only the known id on a mixed line', () => {
      expect(transformToHyphenCommands('/opsx:apply and /opsx:bogus')).toBe(
        '/opsx-apply and /opsx:bogus'
      );
    });
  });

  describe('multiline content', () => {
    it('should transform references across multiple lines', () => {
      const input = `Use /opsx:new to start
Then /opsx:continue to proceed
Finally /opsx:apply to implement`;
      const expected = `Use /opsx-new to start
Then /opsx-continue to proceed
Finally /opsx-apply to implement`;
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('all known commands', () => {
    const commands = [
      'new',
      'continue',
      'apply',
      'update',
      'ff',
      'sync',
      'archive',
      'bulk-archive',
      'verify',
      'explore',
      'onboard',
    ];

    for (const cmd of commands) {
      it(`should transform /opsx:${cmd}`, () => {
        expect(transformToHyphenCommands(`/opsx:${cmd}`)).toBe(`/opsx-${cmd}`);
      });
    }
  });

  describe('non-slash prefixes', () => {
    it("spells Amazon Q's prompt library form, replacing the slash", () => {
      // The whole `/opsx:` is consumed, so no stray slash survives: it is
      // `@opsx-apply`, never `/@opsx-apply` or `@/opsx-apply`.
      expect(transformCommandInvocations('/opsx:apply', FLAT_AT)).toBe('@opsx-apply');
      expect(transformCommandInvocations('Run `/opsx:archive` when done.', FLAT_AT)).toBe(
        'Run `@opsx-archive` when done.'
      );
    });

    it('leaves unknown ids alone under a non-slash prefix too', () => {
      expect(transformCommandInvocations('/opsx:apply and /opsx:bogus', FLAT_AT)).toBe(
        '@opsx-apply and /opsx:bogus'
      );
    });

    it('is a no-op for the canonical namespaced slash form', () => {
      const input = 'Use /opsx:new then /opsx:apply';
      expect(transformCommandInvocations(input, NAMESPACED_SLASH)).toBe(input);
    });
  });
});

describe('transformToSkillReferences', () => {
  describe('all known commands', () => {
    const mappings: Array<[string, string]> = [
      ['explore', '/openspec-explore'],
      ['new', '/openspec-new-change'],
      ['continue', '/openspec-continue-change'],
      ['apply', '/openspec-apply-change'],
      ['update', '/openspec-update-change'],
      ['ff', '/openspec-ff-change'],
      ['sync', '/openspec-sync-specs'],
      ['archive', '/openspec-archive-change'],
      ['bulk-archive', '/openspec-bulk-archive-change'],
      ['verify', '/openspec-verify-change'],
      ['onboard', '/openspec-onboard'],
      ['propose', '/openspec-propose'],
    ];

    for (const [cmd, skillRef] of mappings) {
      it(`should transform /opsx:${cmd} to ${skillRef}`, () => {
        expect(transformToSkillReferences(`/opsx:${cmd}`)).toBe(skillRef);
      });
    }
  });

  describe('basic transformations', () => {
    it('should transform command reference in context', () => {
      const input = 'Use /opsx:apply to implement tasks';
      const expected = 'Use /openspec-apply-change to implement tasks';
      expect(transformToSkillReferences(input)).toBe(expected);
    });

    it('should transform multiple command references', () => {
      const input = 'Run /opsx:apply then /opsx:archive';
      const expected = 'Run /openspec-apply-change then /openspec-archive-change';
      expect(transformToSkillReferences(input)).toBe(expected);
    });

    it('should handle backtick-quoted commands', () => {
      const input = 'Run `/opsx:continue` to proceed';
      const expected = 'Run `/openspec-continue-change` to proceed';
      expect(transformToSkillReferences(input)).toBe(expected);
    });

    it('should transform references across multiple lines', () => {
      const input = `Use /opsx:new to start
Then /opsx:apply to implement`;
      const expected = `Use /openspec-new-change to start
Then /openspec-apply-change to implement`;
      expect(transformToSkillReferences(input)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should return unchanged text with no command references', () => {
      const input = 'This is plain text without commands';
      expect(transformToSkillReferences(input)).toBe(input);
    });

    it('should return empty string unchanged', () => {
      expect(transformToSkillReferences('')).toBe('');
    });

    it('should leave unknown command references unchanged', () => {
      const input = 'Try /opsx:unknown-command here';
      expect(transformToSkillReferences(input)).toBe(input);
    });

    it('should not transform similar but non-matching patterns', () => {
      const input = '/ops:new opsx: /other:command';
      expect(transformToSkillReferences(input)).toBe(input);
    });

    it('should transform longest matching command (bulk-archive vs archive)', () => {
      const input = '/opsx:bulk-archive and /opsx:archive';
      const expected = '/openspec-bulk-archive-change and /openspec-archive-change';
      expect(transformToSkillReferences(input)).toBe(expected);
    });
  });
});

describe('getSkillReferenceTransformer', () => {
  it('uses the default /<name> form for tools without a custom prefix', () => {
    expect(getSkillReferenceTransformer('vibe')).toBe(transformToSkillReferences);
    expect(getSkillReferenceTransformer('hermes')('/opsx:apply')).toBe('/openspec-apply-change');
    // dsh supports the user-facing /<name> gesture, so it keeps the default.
    expect(getSkillReferenceTransformer('dsh')('/opsx:apply')).toBe('/openspec-apply-change');
  });

  it('uses /skill:<name> for Kimi Code, per its documented invocation syntax', () => {
    const transformer = getSkillReferenceTransformer('kimi');
    expect(transformer('/opsx:propose')).toBe('/skill:openspec-propose');
    expect(transformer('Run `/opsx:apply` then /opsx:archive')).toBe(
      'Run `/skill:openspec-apply-change` then /skill:openspec-archive-change'
    );
    expect(transformer('/opsx:unknown-command')).toBe('/opsx:unknown-command');
  });

  it('uses $<name> for direct Codex invocation hints', () => {
    const transformer = getSkillReferenceTransformer('codex');
    expect(transformer('/opsx:propose')).toBe('$openspec-propose');
    expect(transformer('/opsx:unknown-command')).toBe('/opsx:unknown-command');
  });

  it('uses natural-language references for Rovo Dev, which has no slash surface', () => {
    const transformer = getSkillReferenceTransformer('rovodev');
    expect(transformer('/opsx:propose')).toBe('the openspec-propose skill');
    expect(transformer('Run `/opsx:apply` then /opsx:archive')).toBe(
      'Run `the openspec-apply-change skill` then the openspec-archive-change skill'
    );
    // No `/openspec-*` or other slash-command form is ever emitted.
    expect(transformer('/opsx:propose')).not.toMatch(/\/openspec-/);
    expect(transformer('/opsx:unknown-command')).toBe('/opsx:unknown-command');
  });
});

describe('getTransformerForTool', () => {
  it('selects skill references for skills-only delivery for every tool', () => {
    expect(getTransformerForTool('claude', 'skills', 'adapter-backed', NAMESPACED_SLASH)).toBe(
      transformToSkillReferences
    );
    // hyphen-command tools must not fall back to hyphen commands when no commands are generated
    expect(getTransformerForTool('opencode', 'skills', 'adapter-backed', FLAT_SLASH)).toBe(transformToSkillReferences);
    expect(getTransformerForTool('pi', 'skills', 'adapter-backed', FLAT_SLASH)).toBe(transformToSkillReferences);
    expect(getTransformerForTool('oh-my-pi', 'skills', 'adapter-backed', FLAT_SLASH)).toBe(transformToSkillReferences);
  });

  it('selects skill references for tools without a command surface, regardless of delivery', () => {
    // Tools like Kimi Code or Mistral Vibe have no command adapter, so their
    // skills must never reference /opsx:* commands that were not generated.
    expect(getTransformerForTool('vibe', 'both', 'none', undefined)).toBe(transformToSkillReferences);
    expect(getTransformerForTool('hermes', 'both', 'none', undefined)).toBe(transformToSkillReferences);
    // Kimi Code documents /skill:<name> invocations (docs/supported-tools.md)
    for (const delivery of ['both', 'commands', 'skills'] as const) {
      const transformer = getTransformerForTool('kimi', delivery, 'none', undefined);
      expect(transformer?.('/opsx:propose')).toBe('/skill:openspec-propose');
    }
  });

  it('selects hyphen commands for every flat-invocation tool when commands are generated', () => {
    // These tools invoke commands by filename (/opsx-<id>), so skills must
    // reference the hyphen form their command files actually answer to.
    for (const toolId of ['bob', 'cursor', 'github-copilot', 'oh-my-pi', 'opencode', 'pi', 'qwen'] as const) {
      for (const delivery of ['both', 'commands'] as const) {
        const transformer = getTransformerForTool(toolId, delivery, 'adapter-backed', FLAT_SLASH);
        expect(transformer?.('/opsx:apply'), `${toolId} ${delivery}`).toBe('/opsx-apply');
      }
      // ...but must not fall back to hyphen commands when no commands are generated
      expect(getTransformerForTool(toolId, 'skills', 'adapter-backed', FLAT_SLASH)).toBe(transformToSkillReferences);
    }
  });

  it('selects skill references for devin whenever skills are generated', () => {
    // The Devin Local agent has no workflows, so Devin skill bodies and the
    // getting-started hint must name `/openspec-*` skills, which both Devin
    // agents accept. Workflow bodies get the hyphen form from the generator,
    // like every other flat-invocation tool.
    expect(getTransformerForTool('devin', 'both', 'adapter-backed', FLAT_SLASH)).toBe(
      transformToSkillReferences
    );
    expect(getTransformerForTool('devin', 'skills', 'adapter-backed', FLAT_SLASH)).toBe(
      transformToSkillReferences
    );
    // Under commands-only delivery no Devin skills exist to point at, so the
    // hint falls back to the workflow name Devin registers.
    const commandsOnly = getTransformerForTool('devin', 'commands', 'adapter-backed', FLAT_SLASH);
    expect(commandsOnly?.('/opsx:propose')).toBe('/opsx-propose');
  });

  it("selects Amazon Q's @-prefixed prompt form when commands are generated", () => {
    // Amazon Q loads .amazonq/prompts/opsx-<id>.md into its prompt library,
    // which is invoked with @ — it registers no slash command at all.
    for (const delivery of ['both', 'commands'] as const) {
      const transformer = getTransformerForTool('amazon-q', delivery, 'adapter-backed', FLAT_AT);
      expect(transformer?.('/opsx:apply'), delivery).toBe('@opsx-apply');
      expect(transformer?.('Run /opsx:archive next'), delivery).toBe('Run @opsx-archive next');
    }
    // Skills-only delivery generates no prompt files, so point at the skill.
    expect(getTransformerForTool('amazon-q', 'skills', 'adapter-backed', FLAT_AT)).toBe(
      transformToSkillReferences
    );
  });

  it('selects no transformer for namespaced tools when commands are generated', () => {
    expect(getTransformerForTool('claude', 'both', 'adapter-backed', NAMESPACED_SLASH)).toBeUndefined();
    expect(getTransformerForTool('claude', 'commands', 'adapter-backed', NAMESPACED_SLASH)).toBeUndefined();
  });

  it('selects shared-tree-safe Codex skill references in every delivery mode', () => {
    // Codex needs $<name>, while generic consumers of the same canonical
    // .agents tree need /<name>. Keep both explicit so neither target breaks.
    for (const delivery of ['both', 'commands', 'skills'] as const) {
      const transformer = getTransformerForTool('codex', delivery, 'skills-invocable', undefined);
      expect(transformer?.('/opsx:propose')).toBe(
        '$openspec-propose (Codex) or /openspec-propose (other agents)'
      );
      expect(transformer?.('Run /opsx:apply next')).toBe(
        'Run $openspec-apply-change (Codex) or /openspec-apply-change (other agents) next'
      );
    }
  });
});

// Regression for #1153/#1514: the apply skill template must author its
// continue/apply/archive references as canonical /opsx:* tokens so the
// generator can rewrite them per target. Bare "openspec-continue-change"
// prose is invisible to the transformers, which left skills.sh, Codex, and
// Kimi with dead text and no archive/input invocation after a naive revert.
describe('apply skill template generates valid per-target invocations', () => {
  const skill = getApplyChangeSkillTemplate().instructions;

  it('authors invocation references as transformable /opsx:* tokens', () => {
    expect(skill).toContain('/opsx:apply add-auth');
    expect(skill).toContain('suggest using `/opsx:continue`');
    expect(skill).toContain('archive this change with `/opsx:archive`');
    // No bare, non-transformable skill-name prose remains.
    expect(skill).not.toContain('suggest using openspec-continue-change');
  });

  const cases = [
    { tool: 'default (skills.sh)', transform: transformToSkillReferences, cont: '/openspec-continue-change', arch: '/openspec-archive-change', apply: '/openspec-apply-change' },
    { tool: 'codex', transform: getSkillReferenceTransformer('codex'), cont: '$openspec-continue-change', arch: '$openspec-archive-change', apply: '$openspec-apply-change' },
    { tool: 'kimi', transform: getSkillReferenceTransformer('kimi'), cont: '/skill:openspec-continue-change', arch: '/skill:openspec-archive-change', apply: '/skill:openspec-apply-change' },
  ];

  for (const { tool, transform, cont, arch, apply } of cases) {
    it(`emits ${tool} skill invocations for continue, apply, and archive`, () => {
      const out = transform(skill);
      expect(out).toContain(cont);
      expect(out).toContain(arch);
      expect(out).toContain(`${apply} add-auth`);
      // No canonical token survives the rewrite.
      expect(out).not.toMatch(/\/opsx:(continue|apply|archive)/);
    });
  }
});
