import { describe, it, expect } from 'vitest';
import {
  GateSchema,
  GatesSchema,
  StepSchema,
  TddConfigSchema,
  ApplyPhaseSchema,
} from '../../../src/core/artifact-graph/types.js';
import { parseSchema } from '../../../src/core/artifact-graph/schema.js';

describe('Gate Schema Parsing (7.1 + 7.2)', () => {

  // ── GateSchema ──────────────────────────────────────────────────────

  describe('GateSchema', () => {
    it('should parse a valid gate with all required fields', () => {
      const input = {
        id: 'cap-coverage',
        check: 'capability-coverage',
        severity: 'blocking',
      };
      const result = GateSchema.parse(input);
      expect(result.id).toBe('cap-coverage');
      expect(result.check).toBe('capability-coverage');
      expect(result.severity).toBe('blocking');
    });

    it('should parse a valid gate with all optional fields', () => {
      const input = {
        id: 'code-review',
        check: 'ai-review',
        severity: 'warning',
        prompt: 'Review the code',
        command: 'npm test',
        retry: 3,
        on_p2: 'batch-then-recheck',
      };
      const result = GateSchema.parse(input);
      expect(result.prompt).toBe('Review the code');
      expect(result.command).toBe('npm test');
      expect(result.retry).toBe(3);
      expect(result.on_p2).toBe('batch-then-recheck');
    });

    it('should fail when id is missing', () => {
      const input = { check: 'capability-coverage', severity: 'blocking' };
      const result = GateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should fail when id is empty string', () => {
      const input = { id: '', check: 'capability-coverage', severity: 'blocking' };
      const result = GateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should fail when check is missing', () => {
      const input = { id: 'test', severity: 'blocking' };
      const result = GateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should fail when check is empty string', () => {
      const input = { id: 'test', check: '', severity: 'blocking' };
      const result = GateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should only accept blocking or warning as severity', () => {
      const blocking = GateSchema.safeParse({ id: 'a', check: 'x', severity: 'blocking' });
      const warning = GateSchema.safeParse({ id: 'a', check: 'x', severity: 'warning' });
      const invalid = GateSchema.safeParse({ id: 'a', check: 'x', severity: 'critical' });

      expect(blocking.success).toBe(true);
      expect(warning.success).toBe(true);
      expect(invalid.success).toBe(false);
    });

    it('should accept optional fields being omitted', () => {
      const input = { id: 'test', check: 'all-tasks-done', severity: 'blocking' };
      const result = GateSchema.parse(input);
      expect(result.prompt).toBeUndefined();
      expect(result.command).toBeUndefined();
      expect(result.retry).toBeUndefined();
      expect(result.on_p2).toBeUndefined();
    });

    it('should only accept valid on_p2 values', () => {
      const batch = GateSchema.safeParse({ id: 'a', check: 'x', severity: 'blocking', on_p2: 'batch-then-recheck' });
      const skip = GateSchema.safeParse({ id: 'a', check: 'x', severity: 'blocking', on_p2: 'skip' });
      const invalid = GateSchema.safeParse({ id: 'a', check: 'x', severity: 'blocking', on_p2: 'ignore' });

      expect(batch.success).toBe(true);
      expect(skip.success).toBe(true);
      expect(invalid.success).toBe(false);
    });

    it('should require retry to be a positive integer', () => {
      const valid = GateSchema.safeParse({ id: 'a', check: 'x', severity: 'blocking', retry: 3 });
      const zero = GateSchema.safeParse({ id: 'a', check: 'x', severity: 'blocking', retry: 0 });
      const negative = GateSchema.safeParse({ id: 'a', check: 'x', severity: 'blocking', retry: -1 });
      const float = GateSchema.safeParse({ id: 'a', check: 'x', severity: 'blocking', retry: 1.5 });

      expect(valid.success).toBe(true);
      expect(zero.success).toBe(false);
      expect(negative.success).toBe(false);
      expect(float.success).toBe(false);
    });
  });

  // ── GatesSchema ─────────────────────────────────────────────────────

  describe('GatesSchema', () => {
    it('should parse gates with pre and post arrays', () => {
      const input = {
        pre: [{ id: 'g1', check: 'capability-coverage', severity: 'blocking' }],
        post: [{ id: 'g2', check: 'all-tasks-done', severity: 'warning' }],
      };
      const result = GatesSchema.parse(input);
      expect(result.pre).toHaveLength(1);
      expect(result.post).toHaveLength(1);
    });

    it('should allow pre and post to be omitted', () => {
      const result = GatesSchema.parse({});
      expect(result.pre).toBeUndefined();
      expect(result.post).toBeUndefined();
    });

    it('should allow empty pre/post arrays', () => {
      const result = GatesSchema.parse({ pre: [], post: [] });
      expect(result.pre).toEqual([]);
      expect(result.post).toEqual([]);
    });
  });

  // ── StepSchema ──────────────────────────────────────────────────────

  describe('StepSchema', () => {
    it('should parse a valid step with all fields', () => {
      const input = {
        id: 'coded',
        method: 'tdd',
        tdd: { enforce: 'per-task', test_pattern: 'tests/test_*.py', min_coverage: 80, marker: true },
        instruction: 'Follow TDD',
      };
      const result = StepSchema.parse(input);
      expect(result.id).toBe('coded');
      expect(result.method).toBe('tdd');
      expect(result.tdd!.enforce).toBe('per-task');
    });

    it('should parse a minimal step with only id', () => {
      const result = StepSchema.parse({ id: 'committed' });
      expect(result.id).toBe('committed');
      expect(result.method).toBeUndefined();
      expect(result.tdd).toBeUndefined();
      expect(result.gate_ref).toBeUndefined();
    });

    it('should only accept valid method values', () => {
      const tdd = StepSchema.safeParse({ id: 'a', method: 'tdd' });
      const free = StepSchema.safeParse({ id: 'a', method: 'free' });
      const gate = StepSchema.safeParse({ id: 'a', method: 'gate' });
      const invalid = StepSchema.safeParse({ id: 'a', method: 'manual' });

      expect(tdd.success).toBe(true);
      expect(free.success).toBe(true);
      expect(gate.success).toBe(true);
      expect(invalid.success).toBe(false);
    });

    it('should parse step with gate_ref', () => {
      const result = StepSchema.parse({ id: 'reviewed', method: 'gate', gate_ref: 'code-reviewed' });
      expect(result.gate_ref).toBe('code-reviewed');
    });
  });

  // ── TddConfigSchema ────────────────────────────────────────────────

  describe('TddConfigSchema', () => {
    it('should parse a valid tdd config', () => {
      const input = { enforce: 'per-task', test_pattern: 'test_*.py', min_coverage: 80, marker: true };
      const result = TddConfigSchema.parse(input);
      expect(result.enforce).toBe('per-task');
      expect(result.test_pattern).toBe('test_*.py');
      expect(result.min_coverage).toBe(80);
      expect(result.marker).toBe(true);
    });

    it('should accept per-group and optional enforce values', () => {
      expect(TddConfigSchema.safeParse({ enforce: 'per-group' }).success).toBe(true);
      expect(TddConfigSchema.safeParse({ enforce: 'optional' }).success).toBe(true);
      expect(TddConfigSchema.safeParse({ enforce: 'always' }).success).toBe(false);
    });

    it('should allow optional fields to be omitted', () => {
      const result = TddConfigSchema.parse({ enforce: 'per-task' });
      expect(result.test_pattern).toBeUndefined();
      expect(result.min_coverage).toBeUndefined();
      expect(result.marker).toBeUndefined();
    });
  });

  // ── ApplyPhaseSchema ────────────────────────────────────────────────

  describe('ApplyPhaseSchema', () => {
    it('should parse a full apply phase with gates and steps', () => {
      const input = {
        requires: ['tasks'],
        tracks: 'tasks.md',
        gates: {
          pre: [{ id: 'g1', check: 'capability-coverage', severity: 'blocking' }],
          post: [{ id: 'g2', check: 'all-tasks-done', severity: 'blocking' }],
        },
        steps: [
          { id: 'coded', method: 'tdd', tdd: { enforce: 'per-task' } },
          { id: 'reviewed', method: 'gate', gate_ref: 'code-reviewed' },
        ],
        instruction: 'Follow the steps',
      };
      const result = ApplyPhaseSchema.parse(input);
      expect(result.gates!.pre).toHaveLength(1);
      expect(result.gates!.post).toHaveLength(1);
      expect(result.steps).toHaveLength(2);
    });

    it('should parse apply phase without gates and steps (backward compat)', () => {
      const input = {
        requires: ['tasks'],
        tracks: 'tasks.md',
        instruction: 'Apply the change',
      };
      const result = ApplyPhaseSchema.parse(input);
      expect(result.gates).toBeUndefined();
      expect(result.steps).toBeUndefined();
    });
  });

  // ── Backward Compatibility: spec-driven schema ──────────────────────

  describe('Backward Compatibility', () => {
    it('should parse spec-driven schema.yaml without gates/steps', () => {
      const yaml = `
name: spec-driven
version: 1
description: Default OpenSpec workflow
artifacts:
  - id: proposal
    generates: proposal.md
    description: Initial proposal
    template: proposal.md
    requires: []
  - id: specs
    generates: "specs/**/*.md"
    description: Specifications
    template: spec.md
    requires:
      - proposal
apply:
  requires: [specs]
  tracks: tasks.md
  instruction: Work through tasks
`;
      const schema = parseSchema(yaml);
      expect(schema.name).toBe('spec-driven');
      expect(schema.apply).toBeDefined();
      expect(schema.apply!.gates).toBeUndefined();
      expect(schema.apply!.steps).toBeUndefined();
    });

    it('should parse odoo-sdd schema.yaml with gates and steps', () => {
      const yaml = `
name: odoo-sdd
version: 1
description: Odoo SDD workflow
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
    requires: []
  - id: tasks
    generates: tasks.md
    description: Tasks
    template: tasks.md
    requires:
      - proposal
apply:
  requires: [tasks]
  tracks: tasks.md
  gates:
    pre:
      - id: cap-coverage
        check: capability-coverage
        severity: blocking
    post:
      - id: task-completion
        check: all-tasks-done
        severity: blocking
      - id: code-reviewed
        check: ai-review
        severity: blocking
        retry: 3
        on_p2: batch-then-recheck
        prompt: Review the code
  steps:
    - id: coded
      method: tdd
      tdd:
        enforce: per-task
        test_pattern: "tests/test_*.py"
        min_coverage: 80
        marker: true
    - id: reviewed
      method: gate
      gate_ref: code-reviewed
    - id: committed
      instruction: Use Lore Protocol
`;
      const schema = parseSchema(yaml);
      expect(schema.apply!.gates!.pre).toHaveLength(1);
      expect(schema.apply!.gates!.post).toHaveLength(2);
      expect(schema.apply!.steps).toHaveLength(3);
      expect(schema.apply!.steps![0].tdd!.enforce).toBe('per-task');
      expect(schema.apply!.gates!.post![1].retry).toBe(3);
      expect(schema.apply!.gates!.post![1].on_p2).toBe('batch-then-recheck');
    });

    it('should parse schema without apply block at all', () => {
      const yaml = `
name: minimal
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
    requires: []
`;
      const schema = parseSchema(yaml);
      expect(schema.apply).toBeUndefined();
    });
  });
});
