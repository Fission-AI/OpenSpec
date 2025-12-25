import type { SchemaYaml } from './types.js';

/**
 * Built-in schema definitions.
 * These are compiled into the package, avoiding runtime file resolution issues.
 */

export const SPEC_DRIVEN_SCHEMA: SchemaYaml = {
  name: 'spec-driven',
  version: 1,
  description: 'Default OpenSpec workflow - proposal → specs → design → tasks',
  artifacts: [
    {
      id: 'proposal',
      generates: 'proposal.md',
      description: 'Initial proposal document outlining the change',
      template: 'templates/proposal.md',
      requires: [],
    },
    {
      id: 'specs',
      generates: 'specs/*.md',
      description: 'Detailed specifications for the change',
      template: 'templates/spec.md',
      requires: ['proposal'],
    },
    {
      id: 'design',
      generates: 'design.md',
      description: 'Technical design document with implementation details',
      template: 'templates/design.md',
      requires: ['proposal'],
    },
    {
      id: 'tasks',
      generates: 'tasks.md',
      description: 'Implementation tasks derived from specs and design',
      template: 'templates/tasks.md',
      requires: ['specs', 'design'],
    },
  ],
};

export const TDD_SCHEMA: SchemaYaml = {
  name: 'tdd',
  version: 1,
  description: 'Test-driven development workflow - tests → implementation → docs',
  artifacts: [
    {
      id: 'spec',
      generates: 'spec.md',
      description: 'Feature specification defining requirements',
      template: 'templates/spec.md',
      requires: [],
    },
    {
      id: 'tests',
      generates: 'tests/*.test.ts',
      description: 'Test files written before implementation',
      template: 'templates/test.md',
      requires: ['spec'],
    },
    {
      id: 'implementation',
      generates: 'src/*.ts',
      description: 'Implementation code to pass the tests',
      template: 'templates/implementation.md',
      requires: ['tests'],
    },
    {
      id: 'docs',
      generates: 'docs/*.md',
      description: 'Documentation for the implemented feature',
      template: 'templates/docs.md',
      requires: ['implementation'],
    },
  ],
};

/** Map of built-in schema names to their definitions */
export const BUILTIN_SCHEMAS: Record<string, SchemaYaml> = {
  'spec-driven': SPEC_DRIVEN_SCHEMA,
  'tdd': TDD_SCHEMA,
};
