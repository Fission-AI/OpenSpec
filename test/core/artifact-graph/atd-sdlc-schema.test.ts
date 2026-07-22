import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveSchema } from '../../../src/core/artifact-graph/resolver.js';
import { ArtifactGraph } from '../../../src/core/artifact-graph/graph.js';
import { detectCompleted } from '../../../src/core/artifact-graph/state.js';
import { loadTemplate, loadChangeContext, generateInstructions } from '../../../src/core/artifact-graph/instruction-loader.js';

describe('atd-sdlc built-in schema', () => {
  it('resolves through the built-in tier with the six-artifact pipeline', () => {
    const schema = resolveSchema('atd-sdlc');

    expect(schema.name).toBe('atd-sdlc');
    expect(schema.version).toBe(1);
    expect(schema.artifacts.map(a => a.id)).toEqual([
      'ticket',
      'analysis',
      'specs',
      'design',
      'solution-doc',
      'tasks',
    ]);
  });

  it('encodes the dependency chain ticket → analysis → (specs, design) → solution-doc → tasks', () => {
    const schema = resolveSchema('atd-sdlc');
    const requires = Object.fromEntries(schema.artifacts.map(a => [a.id, a.requires]));

    expect(requires['ticket']).toEqual([]);
    expect(requires['analysis']).toEqual(['ticket']);
    expect(requires['specs']).toEqual(['analysis']);
    expect(requires['design']).toEqual(['analysis']);
    expect(requires['solution-doc']).toEqual(['specs', 'design']);
    expect(requires['tasks']).toEqual(['solution-doc']);
  });

  it('tracks apply via tasks.md gated on the tasks artifact', () => {
    const schema = resolveSchema('atd-sdlc');

    expect(schema.apply?.requires).toEqual(['tasks']);
    expect(schema.apply?.tracks).toBe('tasks.md');
    expect(schema.apply?.instruction).toContain('atd-standards');
  });

  it('resolves every template referenced by the schema', () => {
    const schema = resolveSchema('atd-sdlc');

    for (const artifact of schema.artifacts) {
      const template = loadTemplate('atd-sdlc', artifact.template);
      expect(template.length).toBeGreaterThan(0);
    }
  });

  describe('tasks-requires-solution-doc gate', () => {
    let changeDir: string;

    beforeEach(() => {
      changeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atd-sdlc-gate-'));
    });

    afterEach(() => {
      fs.rmSync(changeDir, { recursive: true, force: true });
    });

    it('blocks tasks until solution.md exists', () => {
      const graph = ArtifactGraph.fromSchema(resolveSchema('atd-sdlc'));

      fs.writeFileSync(path.join(changeDir, 'ticket.md'), '# Ticket');
      fs.writeFileSync(path.join(changeDir, 'analysis.md'), '# Analysis');
      fs.mkdirSync(path.join(changeDir, 'specs', 'cap'), { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'specs', 'cap', 'spec.md'), '## ADDED Requirements');
      fs.writeFileSync(path.join(changeDir, 'design.md'), '# Design');

      let completed = detectCompleted(graph, changeDir);
      expect(completed.has('solution-doc')).toBe(false);
      expect(graph.getBlocked(completed)['tasks']).toEqual(['solution-doc']);
      expect(graph.getNextArtifacts(completed)).toEqual(['solution-doc']);

      fs.writeFileSync(path.join(changeDir, 'solution.md'), '# Solution');
      completed = detectCompleted(graph, changeDir);
      expect(completed.has('solution-doc')).toBe(true);
      expect(graph.getNextArtifacts(completed)).toEqual(['tasks']);
    });
  });

  describe('instruction content contracts', () => {
    const schema = resolveSchema('atd-sdlc');
    const instruction = (id: string) =>
      schema.artifacts.find(a => a.id === id)?.instruction ?? '';

    it('ticket carries intake, grilling, write-back, and branch-alignment rules', () => {
      const ticket = instruction('ticket');
      expect(ticket).toContain('Atlassian MCP');
      expect(ticket).toContain('paste the ticket');
      expect(ticket).toContain('AC-1');
      expect(ticket).toContain('EXACTLY ONE question at a time');
      expect(ticket).toContain('recommended answer');
      expect(ticket).toContain('managed section');
      expect(ticket).toContain('rules: ticket:');
      expect(ticket).toContain('triage.md');
      // branch alignment is a suggestion, never an enforcement
      expect(ticket).toContain('suggestion only');
      expect(ticket).toContain('never create or switch branches without explicit developer confirmation');
    });

    it('analysis carries code-as-truth, citation, stack, and token-efficiency rules', () => {
      const analysis = instruction('analysis');
      expect(analysis).toContain('Code is the source of truth');
      expect(analysis).toContain('commit SHA');
      expect(analysis).toContain('file:line');
      expect(analysis).toContain('{python, spring-boot, oracle-ebs, angular}');
      expect(analysis).toContain('rules: analysis:');
      expect(analysis).toContain('Never sweep whole directories');
    });

    it('specs mandate AC traceability', () => {
      const specs = instruction('specs');
      expect(specs).toContain('Covers: AC-n');
      expect(specs).toContain('scope invention');
    });

    it('design and solution-doc carry anti-slop rules', () => {
      expect(instruction('design')).toContain('Never draw a diagram');
      expect(instruction('solution-doc')).toContain('never filled with boilerplate');
      expect(instruction('solution-doc')).toContain('Pending implementation');
    });

    it('tasks carry the mandatory final group with the explicit standards mapping', () => {
      const tasks = instruction('tasks');
      expect(tasks).toContain('Mandatory final task group');
      expect(tasks).toContain('python → python-service-standards');
      expect(tasks).toContain('spring-boot → spring-boot-standards');
      expect(tasks).toContain('oracle-ebs → oracle-ebs-plsql-standards');
      expect(tasks).toContain('angular → angular-standards');
      expect(tasks).toContain('rules: tasks:');
      expect(tasks).toContain('idempotent Jira closure comment');
    });

    it('apply instruction mandates the standards fetch before implementing', () => {
      const apply = schema.apply?.instruction ?? '';
      expect(apply).toContain('Before implementing ANY task');
      expect(apply).toContain('python → python-service-standards');
      expect(apply).toContain('angular → angular-standards');
    });
  });

  describe('instruction assembly with project config and references', () => {
    let projectRoot: string;

    beforeEach(() => {
      projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atd-sdlc-assembly-'));
      const changeDir = path.join(projectRoot, 'openspec', 'changes', 'abc-1-test');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: atd-sdlc\n');
    });

    afterEach(() => {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    });

    it('rules: tasks: from openspec/config.yaml reaches the generated tasks instructions', () => {
      fs.writeFileSync(
        path.join(projectRoot, 'openspec', 'config.yaml'),
        'schema: atd-sdlc\nrules:\n  tasks:\n    - "Documentation destination: repo"\n'
      );

      const ctx = loadChangeContext(projectRoot, 'abc-1-test');
      const instructions = generateInstructions(ctx, 'tasks', projectRoot);

      expect(instructions.rules).toEqual(['Documentation destination: repo']);
      expect(instructions.instruction).toContain('rules: tasks:');
    });

    it('a references index entry for atd-standards is carried into the generated instructions', () => {
      const ctx = loadChangeContext(projectRoot, 'abc-1-test', 'atd-sdlc');
      const instructions = generateInstructions(ctx, 'ticket', projectRoot, {
        references: [
          {
            store_id: 'atd-standards',
            root: '/tmp/atd-standards',
            specs: [{ id: 'angular-standards', summary: 'ATD Angular coding standards' }],
            fetch: 'openspec show <spec-id> --type spec --store atd-standards',
            status: [],
          },
        ],
      });

      expect(instructions.references).toHaveLength(1);
      expect(instructions.references?.[0].store_id).toBe('atd-standards');
      expect(instructions.references?.[0].specs?.[0].id).toBe('angular-standards');
    });
  });
});
