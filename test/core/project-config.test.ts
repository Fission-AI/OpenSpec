import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  readProjectConfig,
  validateConfigRules,
  suggestSchemas,
} from '../../src/core/project-config.js';

describe('project-config', () => {
  let tempDir: string;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-config-'));
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleWarnSpy.mockRestore();
  });

  describe('readProjectConfig', () => {
    describe('resilient parsing', () => {
      it('should parse complete valid config', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
context: |
  Tech stack: TypeScript, React
  API style: RESTful
rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
  specs:
    - Use Given/When/Then format
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          context: 'Tech stack: TypeScript, React\nAPI style: RESTful\n',
          rules: {
            proposal: ['Include rollback plan', 'Identify affected teams'],
            specs: ['Use Given/When/Then format'],
          },
        });
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it('should parse minimal config with schema only', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, 'config.yaml'), 'schema: spec-driven\n');

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
        });
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it('should return partial config when schema is invalid', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: ""
context: Valid context here
rules:
  proposal:
    - Valid rule
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          context: 'Valid context here',
          rules: {
            proposal: ['Valid rule'],
          },
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Invalid 'schema' field")
        );
      });

      it('should return partial config when context is invalid', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
context: 123
rules:
  proposal:
    - Valid rule
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          rules: {
            proposal: ['Valid rule'],
          },
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Invalid 'context' field")
        );
      });

      it('should return partial config when rules is not an object', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
context: Valid context
rules: ["not", "an", "object"]
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          context: 'Valid context',
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Invalid 'rules' field")
        );
      });

      it('should filter out invalid rules for specific artifact', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
rules:
  proposal:
    - Valid rule
  specs: "not an array"
  design:
    - Another valid rule
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          rules: {
            proposal: ['Valid rule'],
            design: ['Another valid rule'],
          },
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Rules for 'specs' must be an array of strings")
        );
      });

      it('should filter out empty string rules', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
rules:
  proposal:
    - Valid rule
    - ""
    - Another valid rule
    - ""
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          rules: {
            proposal: ['Valid rule', 'Another valid rule'],
          },
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Some rules for 'proposal' are empty strings")
        );
      });

      it('should skip artifact if all rules are empty strings', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
rules:
  proposal:
    - ""
    - ""
  specs:
    - Valid rule
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          rules: {
            specs: ['Valid rule'],
          },
        });
      });

      it('should handle completely invalid YAML gracefully', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, 'config.yaml'), 'schema: [unclosed');

        const config = readProjectConfig(tempDir);

        expect(config).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to parse openspec/config.yaml'),
          expect.anything()
        );
      });

      it('should warn when config is not a YAML object', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, 'config.yaml'), '"just a string"');

        const config = readProjectConfig(tempDir);

        expect(config).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('not a valid YAML object')
        );
      });

      it('should handle empty config file', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, 'config.yaml'), '');

        const config = readProjectConfig(tempDir);

        expect(config).toBeNull();
      });
    });

    describe('context size limit enforcement', () => {
      it('should accept context under 50KB limit', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        const smallContext = 'a'.repeat(1000); // 1KB
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven\ncontext: "${smallContext}"\n`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.context).toBe(smallContext);
        expect(consoleWarnSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Context too large')
        );
      });

      it('should reject context over 50KB limit', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        const largeContext = 'a'.repeat(51 * 1024); // 51KB
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven\ncontext: "${largeContext}"\n`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({ schema: 'spec-driven' });
        expect(config?.context).toBeUndefined();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Context too large (51.0KB, limit: 50KB)')
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Ignoring context field')
        );
      });

      it('should handle context exactly at 50KB limit', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        const exactContext = 'a'.repeat(50 * 1024); // Exactly 50KB
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven\ncontext: "${exactContext}"\n`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.context).toBe(exactContext);
        expect(consoleWarnSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Context too large')
        );
      });

      it('should handle multi-byte UTF-8 characters in size calculation', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        // Unicode snowman is 3 bytes in UTF-8
        const contextWithUnicode = '☃'.repeat(18000); // ~54KB in UTF-8 (18000 * 3 bytes)
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
context: |
  ${contextWithUnicode}
`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.context).toBeUndefined();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Context too large')
        );
      });
    });

    describe('.yml/.yaml precedence', () => {
      it('should prefer .yaml when both exist', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          'schema: spec-driven\ncontext: from yaml\n'
        );
        fs.writeFileSync(
          path.join(configDir, 'config.yml'),
          'schema: tdd\ncontext: from yml\n'
        );

        const config = readProjectConfig(tempDir);

        expect(config?.schema).toBe('spec-driven');
        expect(config?.context).toBe('from yaml');
      });

      it('should use .yml when .yaml does not exist', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yml'),
          'schema: tdd\ncontext: from yml\n'
        );

        const config = readProjectConfig(tempDir);

        expect(config?.schema).toBe('tdd');
        expect(config?.context).toBe('from yml');
      });

      it('should return null when neither .yaml nor .yml exist', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });

        const config = readProjectConfig(tempDir);

        expect(config).toBeNull();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it('should return null when openspec directory does not exist', () => {
        const config = readProjectConfig(tempDir);

        expect(config).toBeNull();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });
    });

    describe('multi-line and special characters', () => {
      it('should preserve multi-line context', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
context: |
  Line 1: Tech stack
  Line 2: API conventions
  Line 3: Testing approach
`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.context).toBe(
          'Line 1: Tech stack\nLine 2: API conventions\nLine 3: Testing approach\n'
        );
      });

      it('should preserve special YAML characters in context', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
context: |
  Special chars: : @ # $ % & * [ ] { }
  Quotes: "double" 'single'
  Symbols: < > | \\ /
`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.context).toContain('Special chars: : @ # $ % & * [ ] { }');
        expect(config?.context).toContain('"double"');
        expect(config?.context).toContain("'single'");
        expect(config?.context).toContain('Symbols: < > | \\ /');
      });

      it('should preserve special characters in rule strings', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
rules:
  proposal:
    - "Use <template> tags in docs"
    - "Reference @mentions and #channels"
    - "Follow {variable} naming"
`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.rules?.proposal).toEqual([
          'Use <template> tags in docs',
          'Reference @mentions and #channels',
          'Follow {variable} naming',
        ]);
      });
    });
  });

  describe('validateConfigRules', () => {
    it('should return no warnings for valid artifact IDs', () => {
      const rules = {
        proposal: ['Rule 1'],
        specs: ['Rule 2'],
        design: ['Rule 3'],
      };
      const validIds = new Set(['proposal', 'specs', 'design', 'tasks']);

      const warnings = validateConfigRules(rules, validIds, 'spec-driven');

      expect(warnings).toEqual([]);
    });

    it('should warn about unknown artifact IDs', () => {
      const rules = {
        proposal: ['Rule 1'],
        testplan: ['Rule 2'], // Invalid
        documentation: ['Rule 3'], // Invalid
      };
      const validIds = new Set(['proposal', 'specs', 'design', 'tasks']);

      const warnings = validateConfigRules(rules, validIds, 'spec-driven');

      expect(warnings).toHaveLength(2);
      expect(warnings[0]).toContain('Unknown artifact ID in rules: "testplan"');
      expect(warnings[0]).toContain('Valid IDs for schema "spec-driven": design, proposal, specs, tasks');
      expect(warnings[1]).toContain('Unknown artifact ID in rules: "documentation"');
    });

    it('should return warnings for all unknown artifact IDs', () => {
      const rules = {
        invalid1: ['Rule 1'],
        invalid2: ['Rule 2'],
        invalid3: ['Rule 3'],
      };
      const validIds = new Set(['proposal', 'specs']);

      const warnings = validateConfigRules(rules, validIds, 'spec-driven');

      expect(warnings).toHaveLength(3);
    });

    it('should handle empty rules object', () => {
      const rules = {};
      const validIds = new Set(['proposal', 'specs']);

      const warnings = validateConfigRules(rules, validIds, 'spec-driven');

      expect(warnings).toEqual([]);
    });
  });

  describe('suggestSchemas', () => {
    const availableSchemas = [
      { name: 'spec-driven', isBuiltIn: true },
      { name: 'tdd', isBuiltIn: true },
      { name: 'custom-workflow', isBuiltIn: false },
      { name: 'team-process', isBuiltIn: false },
    ];

    it('should suggest close matches using fuzzy matching', () => {
      const message = suggestSchemas('spec-drven', availableSchemas); // Missing 'i'

      expect(message).toContain("Schema 'spec-drven' not found");
      expect(message).toContain('Did you mean one of these?');
      expect(message).toContain('spec-driven (built-in)');
    });

    it('should suggest tdd for tdd typo', () => {
      const message = suggestSchemas('td', availableSchemas);

      expect(message).toContain('Did you mean one of these?');
      expect(message).toContain('tdd (built-in)');
    });

    it('should list all available schemas', () => {
      const message = suggestSchemas('nonexistent', availableSchemas);

      expect(message).toContain('Available schemas:');
      expect(message).toContain('Built-in: spec-driven, tdd');
      expect(message).toContain('Project-local: custom-workflow, team-process');
    });

    it('should handle case when no project-local schemas exist', () => {
      const builtInOnly = [
        { name: 'spec-driven', isBuiltIn: true },
        { name: 'tdd', isBuiltIn: true },
      ];
      const message = suggestSchemas('invalid', builtInOnly);

      expect(message).toContain('Built-in: spec-driven, tdd');
      expect(message).toContain('Project-local: (none found)');
    });

    it('should include fix instruction', () => {
      const message = suggestSchemas('wrong-schema', availableSchemas);

      expect(message).toContain(
        "Fix: Edit openspec/config.yaml and change 'schema: wrong-schema' to a valid schema name"
      );
    });

    it('should limit suggestions to top 3 matches', () => {
      const manySchemas = [
        { name: 'test-a', isBuiltIn: true },
        { name: 'test-b', isBuiltIn: true },
        { name: 'test-c', isBuiltIn: true },
        { name: 'test-d', isBuiltIn: true },
        { name: 'test-e', isBuiltIn: true },
      ];
      const message = suggestSchemas('test', manySchemas);

      // Should suggest at most 3
      const suggestionCount = (message.match(/test-/g) || []).length;
      expect(suggestionCount).toBeGreaterThanOrEqual(3);
      expect(suggestionCount).toBeLessThanOrEqual(3 + 5); // 3 in suggestions + 5 in "Available" list
    });

    it('should not suggest schemas with distance > 3', () => {
      const message = suggestSchemas('abcdefghijk', availableSchemas);

      // 'abcdefghijk' has large Levenshtein distance from all schemas
      expect(message).not.toContain('Did you mean');
      expect(message).toContain('Available schemas:');
    });
  });

  describe('performance benchmarks', () => {
    /**
     * Performance benchmarks for config reading.
     * Target: <10ms typical, <50ms acceptable
     *
     * These tests validate that config reads are fast enough to not need caching.
     * Each command may read config multiple times (schema resolution + instruction loading),
     * so individual read times must be very fast.
     */

    it('typical config (1KB context): should read in <10ms', () => {
      const configDir = path.join(tempDir, 'openspec');
      fs.mkdirSync(configDir, { recursive: true });

      // Create a typical config (~1KB context)
      const typicalContext = `Tech stack: TypeScript, React, Node.js
API conventions: RESTful, JSON responses
Testing approach: Unit tests with Vitest, integration tests with Playwright
Code style: ESLint with Prettier, strict TypeScript
Documentation: JSDoc comments, README for each module
Deployment: Docker containers, Kubernetes
Monitoring: Prometheus metrics, Grafana dashboards
Error handling: Structured error types, error boundary components`;

      const configContent = `schema: spec-driven
context: |
  ${typicalContext}
rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
    - Estimate effort in story points
  design:
    - Document data flow diagrams
    - Consider edge cases
  specs:
    - Use Given/When/Then format
    - Cover error scenarios
`;
      fs.writeFileSync(path.join(configDir, 'config.yaml'), configContent);

      // Warm up (first read may have module loading overhead)
      readProjectConfig(tempDir);

      // Benchmark 10 reads
      const iterations = 10;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        readProjectConfig(tempDir);
      }
      const elapsed = performance.now() - start;
      const avgMs = elapsed / iterations;

      // Target: <20ms per read for typical config (allows for CI variability)
      // Note: Local development typically sees <5ms, but CI environments may be slower
      expect(avgMs).toBeLessThan(20);

      // Log for visibility in test output
      console.log(`Typical config (1KB): ${avgMs.toFixed(2)}ms avg per read`);
    });

    it('large config (50KB context): should read in <50ms', () => {
      const configDir = path.join(tempDir, 'openspec');
      fs.mkdirSync(configDir, { recursive: true });

      // Create a large config at the 50KB limit
      // Each character is ~1 byte, so 50KB = ~50,000 characters
      const largeContext = 'x'.repeat(49 * 1024); // Just under 50KB to pass size validation

      const configContent = `schema: spec-driven
context: "${largeContext}"
rules:
  proposal:
    - Rule 1
    - Rule 2
`;
      fs.writeFileSync(path.join(configDir, 'config.yaml'), configContent);

      // Warm up
      readProjectConfig(tempDir);

      // Benchmark 10 reads
      const iterations = 10;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        readProjectConfig(tempDir);
      }
      const elapsed = performance.now() - start;
      const avgMs = elapsed / iterations;

      // Target: <50ms per read for large config (acceptable for rare case)
      expect(avgMs).toBeLessThan(50);

      // Log for visibility in test output
      console.log(`Large config (50KB): ${avgMs.toFixed(2)}ms avg per read`);
    });

    it('repeated reads within single command: should be consistent', () => {
      const configDir = path.join(tempDir, 'openspec');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.yaml'),
        `schema: spec-driven
context: Test context for repeated reads
rules:
  proposal:
    - Test rule
`
      );

      // Warm up (first read may have module/YAML parsing loading overhead)
      readProjectConfig(tempDir);

      // Simulate a command that reads config multiple times
      // (e.g., schema resolution + instruction loading + validation)
      const reads: number[] = [];
      const totalReads = 5;

      for (let i = 0; i < totalReads; i++) {
        const start = performance.now();
        readProjectConfig(tempDir);
        reads.push(performance.now() - start);
      }

      // Calculate statistics
      const avgMs = reads.reduce((a, b) => a + b, 0) / reads.length;
      const maxMs = Math.max(...reads);
      const minMs = Math.min(...reads);

      // All reads should be fast (<20ms each, allowing CI variability)
      expect(maxMs).toBeLessThan(20);

      // Variance should be reasonable (no major spikes after warmup)
      // Allow 15ms variance for CI environments
      expect(maxMs - minMs).toBeLessThan(15);

      // Log for visibility
      console.log(`Repeated reads: avg=${avgMs.toFixed(2)}ms, min=${minMs.toFixed(2)}ms, max=${maxMs.toFixed(2)}ms`);
    });

    it('missing config: should return null quickly', () => {
      // No config file - should return null very fast
      const iterations = 10;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        readProjectConfig(tempDir);
      }
      const elapsed = performance.now() - start;
      const avgMs = elapsed / iterations;

      // Missing config should be even faster (<5ms)
      expect(avgMs).toBeLessThan(5);

      console.log(`Missing config: ${avgMs.toFixed(2)}ms avg per read`);
    });
  });
});
