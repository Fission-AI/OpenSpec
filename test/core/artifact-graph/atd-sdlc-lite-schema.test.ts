import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveSchema } from '../../../src/core/artifact-graph/resolver.js';
import { ArtifactGraph } from '../../../src/core/artifact-graph/graph.js';
import { detectCompleted } from '../../../src/core/artifact-graph/state.js';
import { loadTemplate, loadChangeContext } from '../../../src/core/artifact-graph/instruction-loader.js';

const full = resolveSchema('atd-sdlc');
const lite = resolveSchema('atd-sdlc-lite');

const instructionOf = (schema: typeof full, id: string) =>
  schema.artifacts.find(a => a.id === id)?.instruction ?? '';

/**
 * Extracts a shared rule block from an instruction: from the start marker
 * up to (excluding) the next bold `**Header**` line, or to the end.
 */
function extractBlock(instruction: string, startMarker: string): string {
  const start = instruction.indexOf(startMarker);
  expect(start, `marker not found: ${startMarker}`).toBeGreaterThanOrEqual(0);
  const rest = instruction.slice(start + startMarker.length);
  const next = rest.search(/\n\s*\*\*/);
  const block = startMarker + (next === -1 ? rest : rest.slice(0, next));
  return block.trim();
}

describe('atd-sdlc-lite built-in schema', () => {
  it('resolves with the three-artifact pipeline ticket → analysis → tasks', () => {
    expect(lite.name).toBe('atd-sdlc-lite');
    expect(lite.artifacts.map(a => a.id)).toEqual(['ticket', 'analysis', 'tasks']);

    const requires = Object.fromEntries(lite.artifacts.map(a => [a.id, a.requires]));
    expect(requires['ticket']).toEqual([]);
    expect(requires['analysis']).toEqual(['ticket']);
    expect(requires['tasks']).toEqual(['analysis']);

    expect(lite.apply?.requires).toEqual(['tasks']);
    expect(lite.apply?.tracks).toBe('tasks.md');
  });

  it('resolves every template referenced by the schema', () => {
    for (const artifact of lite.artifacts) {
      expect(loadTemplate('atd-sdlc-lite', artifact.template).length).toBeGreaterThan(0);
    }
  });

  describe('instruction parity with atd-sdlc (shared rule blocks verbatim)', () => {
    const sharedTicketBlocks = [
      '**Intake:**',
      '**Branch alignment (advisory):**',
      '**Completeness checklist (gate):**',
      '**Grilling protocol (when any checklist item is missing):**',
      '**Jira write-back (confirmed, idempotent):**',
    ];

    it.each(sharedTicketBlocks)('ticket block %s matches', marker => {
      const fullBlock = extractBlock(instructionOf(full, 'ticket'), marker);
      expect(instructionOf(lite, 'ticket')).toContain(fullBlock);
    });

    it.each(['**Code is the source of truth.**', '**Evidence:**'])(
      'analysis block %s matches',
      marker => {
        const fullBlock = extractBlock(instructionOf(full, 'analysis'), marker);
        expect(instructionOf(lite, 'analysis')).toContain(fullBlock);
      }
    );

    it('both schemas carry the identical explicit stack mapping in tasks and apply', () => {
      for (const text of [
        instructionOf(full, 'tasks'),
        instructionOf(lite, 'tasks'),
        full.apply?.instruction ?? '',
        lite.apply?.instruction ?? '',
      ]) {
        expect(text).toContain('python → python-service-standards');
        expect(text).toContain('spring-boot → spring-boot-standards');
        expect(text).toContain('oracle-ebs → oracle-ebs-plsql-standards');
        expect(text).toContain('angular → angular-standards');
      }
    });
  });

  describe('template compatibility with the full schema contract', () => {
    it('lite ticket template carries every mandatory full-contract field', () => {
      const t = loadTemplate('atd-sdlc-lite', 'ticket.md');
      for (const heading of [
        '## Sources',
        '## Problem Statement',
        '## Acceptance Criteria',
        '## Affected Systems',
        '## Edge Cases',
        '## Constraints',
        '## Out of Scope',
        '## Clarified Requirements',
        '## Triage Record',
      ]) {
        expect(t).toContain(heading);
      }
      // lite-specific addition on top of the full contract
      expect(t).toContain('## Restored Behavior');
    });

    it('lite analysis template carries SHA and affected-stacks fields', () => {
      const t = loadTemplate('atd-sdlc-lite', 'analysis.md');
      expect(t).toContain('**Commit SHA:**');
      expect(t).toContain('**Affected stacks:**');
    });
  });

  describe('escalation via .openspec.yaml schema switch', () => {
    let changeDir: string;

    beforeEach(() => {
      changeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atd-lite-escalation-'));
    });

    afterEach(() => {
      fs.rmSync(changeDir, { recursive: true, force: true });
    });

    function seedLiteChange(): void {
      fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: atd-sdlc-lite\n');
      fs.writeFileSync(path.join(changeDir, 'ticket.md'), '# Ticket');
      fs.writeFileSync(path.join(changeDir, 'analysis.md'), '# Impact Assessment');
    }

    function escalate(): void {
      fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: atd-sdlc\n');
    }

    it('pre-tasks escalation: ticket/analysis done, specs/design ready, solution-doc/tasks blocked, apply blocked', () => {
      seedLiteChange();
      escalate();

      const ctx = loadChangeContext(os.tmpdir(), path.basename(changeDir), undefined, { changeDir });
      expect(ctx.schemaName).toBe('atd-sdlc');
      expect(ctx.completed.has('ticket')).toBe(true);
      expect(ctx.completed.has('analysis')).toBe(true);
      expect(ctx.graph.getNextArtifacts(ctx.completed).sort()).toEqual(['design', 'specs']);

      const blocked = ctx.graph.getBlocked(ctx.completed);
      expect(blocked['solution-doc']).toEqual(['design', 'specs']);
      expect(blocked['tasks']).toEqual(['solution-doc']);
      // apply requires the tasks artifact, which is not complete
      expect(ctx.completed.has('tasks')).toBe(false);
    });

    it('late escalation: tasks.lite.md preserved, tracked tasks.md absent, apply blocked until a full task list exists', () => {
      seedLiteChange();
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '## 1. Work\n\n- [x] 1.1 partial\n- [ ] 1.2 pending\n');

      // late-escalation procedure from the lite apply instruction
      fs.renameSync(path.join(changeDir, 'tasks.md'), path.join(changeDir, 'tasks.lite.md'));
      escalate();

      expect(fs.existsSync(path.join(changeDir, 'tasks.lite.md'))).toBe(true);
      expect(fs.existsSync(path.join(changeDir, 'tasks.md'))).toBe(false);

      const ctx = loadChangeContext(os.tmpdir(), path.basename(changeDir), undefined, { changeDir });
      expect(ctx.schemaName).toBe('atd-sdlc');
      // the preserved lite checklist must NOT satisfy the full tasks artifact
      expect(ctx.completed.has('tasks')).toBe(false);
      expect(ctx.graph.getNextArtifacts(ctx.completed).sort()).toEqual(['design', 'specs']);
      expect(ctx.graph.getBlocked(ctx.completed)['tasks']).toEqual(['solution-doc']);
    });

    it('lite ticket gate enforces semantic validity, not just structural completeness', () => {
      const ticket = instructionOf(lite, 'ticket');
      expect(ticket).toContain('Structural completeness is not');
      expect(ticket).toContain('no FAIL, no UNCERTAIN');
      expect(ticket).toContain('recommendation is `atd-sdlc-lite`');
      expect(ticket).toContain('confirmed choice is `atd-sdlc-lite`');
      expect(ticket).toContain('missing, empty, or structurally incomplete');
      expect(ticket).toContain('all-pass triage record is never allowed');
      // the packaged schema never points at unpackaged repository docs
      expect(ticket).not.toContain('docs/atd/');
    });

    it('the 13-condition list is identical (normalized, ordered) across schema, triage workflow, and docs', async () => {
      const CANONICAL = [
        'Single repository and single component',
        'Small, localized file impact',
        'Restores existing intended behavior (no new behavior)',
        'Existing acceptance criteria, specification, or test already defines the behavior',
        'No API contract change',
        'No database/schema/data migration',
        'No authentication, authorization, security, privacy, or compliance impact',
        'No cross-service integration behavior change',
        'No new dependency',
        'No deployment or infrastructure change',
        'Straightforward automated regression test exists or is easy to add',
        'Trivial rollback',
        'No new functional or technical documentation needed (localized corrections to existing docs stay lite-eligible)',
      ].map(normalize);

      function normalize(s: string): string {
        return s.toLowerCase().replace(/[`*|]/g, '').replace(/\s+/g, ' ').trim();
      }

      function extractNumberedList(text: string, startMarker: string, endMarker: string): string[] {
        const start = text.indexOf(startMarker);
        expect(start, `marker not found: ${startMarker}`).toBeGreaterThanOrEqual(0);
        const endIdx = text.indexOf(endMarker, start);
        const section = text.slice(start, endIdx === -1 ? undefined : endIdx);
        const items: string[] = [];
        const re = /(?:^|\n)\s*\d{1,2}\.\s+([\s\S]*?)(?=\n\s*\d{1,2}\.\s|$)/g;
        for (const m of section.matchAll(re)) items.push(normalize(m[1]));
        return items;
      }

      // Surface 1: packaged lite schema (ticket gate)
      const schemaList = extractNumberedList(
        instructionOf(lite, 'ticket'),
        'Eligibility conditions',
        '**Branch alignment'
      );
      expect(schemaList).toEqual(CANONICAL);

      // Surface 2: triage workflow instructions (both delivery paths share the constant)
      const { getAtdTriageSkillTemplate } = await import('../../../src/core/templates/workflows/atd-triage.js');
      const triageInstructions = getAtdTriageSkillTemplate().instructions;
      const triageList = extractNumberedList(triageInstructions, 'Eligibility conditions', 'Rules:');
      expect(triageList).toEqual(CANONICAL);

      // Surface 3: docs/atd/lite-eligibility.md table
      const docText = fs.readFileSync(
        path.join(__dirname, '../../../docs/atd/lite-eligibility.md'),
        'utf-8'
      );
      const docList = [...docText.matchAll(/^\|\s*\d+\s*\|\s*(.+?)\s*\|\s*$/gm)].map(m => normalize(m[1]));
      expect(docList).toEqual(CANONICAL);

      // Risk examples: same three classes on every surface (normalized)
      for (const surface of [instructionOf(lite, 'ticket'), triageInstructions, docText]) {
        const n = normalize(surface);
        for (const example of ['authorization condition', 'where clause', 'financial calculation']) {
          expect(n, example).toContain(example);
        }
      }
    });

    it('lite instructions document both escalation procedures', () => {
      expect(instructionOf(lite, 'analysis')).toContain('`.openspec.yaml` metadata to `schema: atd-sdlc`');
      expect(lite.apply?.instruction).toContain('tasks.lite.md');
      expect(lite.apply?.instruction).toContain('Late escalation');
      expect(instructionOf(lite, 'analysis')).toContain('Downgrading a full change to lite is not supported');
    });
  });
});
