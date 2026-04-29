import { describe, it, expect } from 'vitest';
import { parseSchema, SchemaValidationError } from '../../../src/core/artifact-graph/schema.js';

describe('artifact-graph/schema', () => {
  describe('parseSchema', () => {
    it('should parse valid schema YAML', () => {
      const yaml = `
name: test-schema
version: 1
description: A test schema
artifacts:
  - id: proposal
    generates: proposal.md
    description: Initial proposal
    template: templates/proposal.md
    requires: []
  - id: design
    generates: design.md
    description: Design document
    template: templates/design.md
    requires:
      - proposal
`;
      const schema = parseSchema(yaml);

      expect(schema.name).toBe('test-schema');
      expect(schema.version).toBe(1);
      expect(schema.description).toBe('A test schema');
      expect(schema.artifacts).toHaveLength(2);
      expect(schema.artifacts[0].id).toBe('proposal');
      expect(schema.artifacts[1].requires).toEqual(['proposal']);
    });

    it('should throw on missing required fields', () => {
      const yaml = `
name: test-schema
version: 1
artifacts:
  - id: proposal
    description: Missing generates and template
`;
      expect(() => parseSchema(yaml)).toThrow(SchemaValidationError);
      expect(() => parseSchema(yaml)).toThrow(/generates/);
    });

    it('should throw on missing schema name', () => {
      const yaml = `
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Test
    template: templates/proposal.md
`;
      expect(() => parseSchema(yaml)).toThrow(SchemaValidationError);
      expect(() => parseSchema(yaml)).toThrow(/name/);
    });

    it('should throw on invalid version (non-positive)', () => {
      const yaml = `
name: test
version: 0
artifacts:
  - id: proposal
    generates: proposal.md
    description: Test
    template: templates/proposal.md
`;
      expect(() => parseSchema(yaml)).toThrow(SchemaValidationError);
      expect(() => parseSchema(yaml)).toThrow(/positive/);
    });

    it('should throw on empty artifacts array', () => {
      const yaml = `
name: test
version: 1
artifacts: []
`;
      expect(() => parseSchema(yaml)).toThrow(SchemaValidationError);
      expect(() => parseSchema(yaml)).toThrow(/artifact/i);
    });

    it('should throw on duplicate artifact IDs', () => {
      const yaml = `
name: test
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: First
    template: templates/proposal.md
  - id: proposal
    generates: other.md
    description: Duplicate
    template: templates/other.md
`;
      expect(() => parseSchema(yaml)).toThrow(SchemaValidationError);
      expect(() => parseSchema(yaml)).toThrow(/Duplicate artifact ID: proposal/);
    });

    it('should throw on invalid requires reference', () => {
      const yaml = `
name: test
version: 1
artifacts:
  - id: design
    generates: design.md
    description: Design doc
    template: templates/design.md
    requires:
      - nonexistent
`;
      expect(() => parseSchema(yaml)).toThrow(SchemaValidationError);
      expect(() => parseSchema(yaml)).toThrow(/Invalid dependency reference.*nonexistent/);
    });

    it('should detect self-referencing cycle', () => {
      const yaml = `
name: test
version: 1
artifacts:
  - id: A
    generates: a.md
    description: Self reference
    template: templates/a.md
    requires:
      - A
`;
      expect(() => parseSchema(yaml)).toThrow(SchemaValidationError);
      expect(() => parseSchema(yaml)).toThrow(/Cyclic dependency detected/);
    });

    it('should detect simple A → B → A cycle', () => {
      const yaml = `
name: test
version: 1
artifacts:
  - id: A
    generates: a.md
    description: A
    template: templates/a.md
    requires:
      - B
  - id: B
    generates: b.md
    description: B
    template: templates/b.md
    requires:
      - A
`;
      expect(() => parseSchema(yaml)).toThrow(SchemaValidationError);
      expect(() => parseSchema(yaml)).toThrow(/Cyclic dependency detected/);
      expect(() => parseSchema(yaml)).toThrow(/→/);
    });

    it('should detect longer A → B → C → A cycle and list all IDs', () => {
      const yaml = `
name: test
version: 1
artifacts:
  - id: A
    generates: a.md
    description: A
    template: templates/a.md
    requires:
      - C
  - id: B
    generates: b.md
    description: B
    template: templates/b.md
    requires:
      - A
  - id: C
    generates: c.md
    description: C
    template: templates/c.md
    requires:
      - B
`;
      expect(() => parseSchema(yaml)).toThrow(SchemaValidationError);
      expect(() => parseSchema(yaml)).toThrow(/Cyclic dependency detected/);
      // Should contain all three in the cycle path
      const error = (() => {
        try {
          parseSchema(yaml);
        } catch (e) {
          return e;
        }
      })() as Error;
      expect(error.message).toMatch(/A.*→.*B|B.*→.*C|C.*→.*A/);
    });

    it('should allow default empty requires array', () => {
      const yaml = `
name: test
version: 1
artifacts:
  - id: root
    generates: root.md
    description: Root artifact
    template: templates/root.md
`;
      const schema = parseSchema(yaml);
      expect(schema.artifacts[0].requires).toEqual([]);
    });

    describe('folder field', () => {
      const baseYaml = (folderLine: string) => `
name: test
version: 1
artifacts:
  - id: adr
    generates: "*.md"
    description: ADR
    template: adr.md${folderLine ? '\n    ' + folderLine : ''}
`;

      it('accepts a valid relative folder', () => {
        const schema = parseSchema(baseYaml('folder: ADR'));
        expect(schema.artifacts[0].folder).toBe('ADR');
      });

      it('accepts a nested relative folder', () => {
        const schema = parseSchema(baseYaml('folder: docs/decisions'));
        expect(schema.artifacts[0].folder).toBe('docs/decisions');
      });

      it('treats omitted folder as undefined', () => {
        const schema = parseSchema(baseYaml(''));
        expect(schema.artifacts[0].folder).toBeUndefined();
      });

      it('rejects empty folder string', () => {
        expect(() => parseSchema(baseYaml('folder: ""'))).toThrow(SchemaValidationError);
        expect(() => parseSchema(baseYaml('folder: ""'))).toThrow(/non-empty/);
      });

      it('rejects whitespace-only folder', () => {
        expect(() => parseSchema(baseYaml('folder: "   "'))).toThrow(/non-empty/);
      });

      it('rejects POSIX absolute path', () => {
        expect(() => parseSchema(baseYaml('folder: /etc/openspec'))).toThrow(/relative path/);
      });

      it('rejects Windows absolute path', () => {
        expect(() => parseSchema(baseYaml('folder: "C:\\\\Windows\\\\Temp"'))).toThrow(
          /relative path/
        );
      });

      it('rejects parent traversal', () => {
        expect(() => parseSchema(baseYaml('folder: "../outside"'))).toThrow(
          /stay within the project root/
        );
      });

      it('rejects nested parent traversal', () => {
        expect(() => parseSchema(baseYaml('folder: "ADR/../../../escape"'))).toThrow(
          /stay within the project root/
        );
      });

      it('rejects reserved openspec/ prefix', () => {
        expect(() => parseSchema(baseYaml('folder: "openspec/specs"'))).toThrow(
          /reserved.*openspec/
        );
      });

      it('rejects exact "openspec"', () => {
        expect(() => parseSchema(baseYaml('folder: openspec'))).toThrow(/reserved.*openspec/);
      });

      it('includes the artifact ID in folder validation errors', () => {
        try {
          parseSchema(baseYaml('folder: /etc/openspec'));
          expect.fail('Should have thrown');
        } catch (err) {
          expect((err as Error).message).toMatch(/\[adr\]/);
          expect((err as Error).message).toMatch(/folder/);
        }
      });
    });
  });
});
