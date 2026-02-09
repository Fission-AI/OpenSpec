import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findAllSpecs, isSpecStructureHierarchical } from '../../src/utils/spec-discovery.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Backward Compatibility Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-compat-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Flat structure compatibility', () => {
    it('should work with existing flat structure projects', () => {
      // Simulate an existing flat structure project
      const capabilities = ['auth', 'api', 'database', 'payments', 'notifications'];

      for (const cap of capabilities) {
        const specDir = path.join(tempDir, cap);
        fs.mkdirSync(specDir, { recursive: true });
        fs.writeFileSync(path.join(specDir, 'spec.md'), `# ${cap} Specification`);
      }

      const specs = findAllSpecs(tempDir);

      // Should find all specs
      expect(specs.length).toBe(5);

      // All should be depth 1 (flat)
      specs.forEach(spec => {
        expect(spec.depth).toBe(1);
      });

      // Capabilities should match directory names
      const capabilityNames = specs.map(s => s.capability).sort();
      expect(capabilityNames).toEqual(capabilities.sort());

      // Should detect as flat structure
      expect(isSpecStructureHierarchical(tempDir)).toBe(false);
    });

    it('should maintain capability names without path separators for flat structure', () => {
      const specDir = path.join(tempDir, 'authentication');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), '# Auth Spec');

      const specs = findAllSpecs(tempDir);

      expect(specs.length).toBe(1);
      expect(specs[0].capability).toBe('authentication');
      expect(specs[0].capability).not.toContain(path.sep);
      expect(specs[0].capability).not.toContain('/');
      expect(specs[0].capability).not.toContain('\\');
    });

    it('should work with specs that have additional files in directories', () => {
      // Flat structure with extra files (README, diagrams, etc.)
      const specDir = path.join(tempDir, 'api');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), '# API Spec');
      fs.writeFileSync(path.join(specDir, 'README.md'), '# API Documentation');
      fs.writeFileSync(path.join(specDir, 'diagram.png'), 'fake image');

      const specs = findAllSpecs(tempDir);

      expect(specs.length).toBe(1);
      expect(specs[0].capability).toBe('api');
    });
  });

  describe('Auto-detection with mixed structures', () => {
    it('should detect hierarchical structure when any spec has depth > 1', () => {
      // Mix of flat and hierarchical
      fs.mkdirSync(path.join(tempDir, 'auth'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'auth', 'spec.md'), '# Auth Spec');

      fs.mkdirSync(path.join(tempDir, '_global', 'testing'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '_global', 'testing', 'spec.md'), '# Testing Spec');

      expect(isSpecStructureHierarchical(tempDir)).toBe(true);
    });

    it('should detect flat structure when all specs are depth 1', () => {
      fs.mkdirSync(path.join(tempDir, 'auth'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'auth', 'spec.md'), '# Auth Spec');

      fs.mkdirSync(path.join(tempDir, 'api'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'api', 'spec.md'), '# API Spec');

      expect(isSpecStructureHierarchical(tempDir)).toBe(false);
    });

    it('should correctly discover mixed flat and hierarchical specs', () => {
      // Flat specs
      fs.mkdirSync(path.join(tempDir, 'auth'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'auth', 'spec.md'), '# Auth Spec');

      fs.mkdirSync(path.join(tempDir, 'payments'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'payments', 'spec.md'), '# Payments Spec');

      // Hierarchical specs
      fs.mkdirSync(path.join(tempDir, '_global', 'security'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '_global', 'security', 'spec.md'), '# Security Spec');

      fs.mkdirSync(path.join(tempDir, 'platform', 'api'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'platform', 'api', 'spec.md'), '# Platform API Spec');

      const specs = findAllSpecs(tempDir);

      expect(specs.length).toBe(4);

      // Verify flat specs
      const flatSpecs = specs.filter(s => s.depth === 1);
      expect(flatSpecs.length).toBe(2);
      expect(flatSpecs.map(s => s.capability).sort()).toEqual(['auth', 'payments']);

      // Verify hierarchical specs
      const hierarchicalSpecs = specs.filter(s => s.depth > 1);
      expect(hierarchicalSpecs.length).toBe(2);

      const globalSecurity = hierarchicalSpecs.find(s => s.capability.includes('security'));
      expect(globalSecurity).toBeDefined();
      expect(globalSecurity!.capability).toBe(path.join('_global', 'security'));

      const platformApi = hierarchicalSpecs.find(s => s.capability.includes('api'));
      expect(platformApi).toBeDefined();
      expect(platformApi!.capability).toBe(path.join('platform', 'api'));
    });

    it('should handle edge case of underscore-prefixed flat specs', () => {
      // Edge case: flat spec with underscore prefix (not hierarchical)
      fs.mkdirSync(path.join(tempDir, '_internal'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '_internal', 'spec.md'), '# Internal Spec');

      const specs = findAllSpecs(tempDir);

      expect(specs.length).toBe(1);
      expect(specs[0].capability).toBe('_internal');
      expect(specs[0].depth).toBe(1);

      // Should be detected as flat (no nested specs)
      expect(isSpecStructureHierarchical(tempDir)).toBe(false);
    });
  });

  describe('Integration with existing codebases', () => {
    it('should not break existing flat structure workflows', () => {
      // Simulate typical flat structure from existing projects
      const capabilities = [
        'authentication',
        'authorization',
        'user-management',
        'api-gateway',
        'notification-service',
        'payment-processing',
      ];

      for (const cap of capabilities) {
        const specDir = path.join(tempDir, cap);
        fs.mkdirSync(specDir, { recursive: true });
        fs.writeFileSync(
          path.join(specDir, 'spec.md'),
          `# ${cap} Specification\n\n## Purpose\n\nThis is the ${cap} specification.\n\n## Requirements\n\n### Requirement: System SHALL ${cap}\n\n#### Scenario: Basic usage\n\n- **WHEN** user performs action\n- **THEN** system responds correctly`
        );
      }

      const specs = findAllSpecs(tempDir);

      // All specs found
      expect(specs.length).toBe(6);

      // All flat (depth 1)
      expect(specs.every(s => s.depth === 1)).toBe(true);

      // Structure detected as flat
      expect(isSpecStructureHierarchical(tempDir)).toBe(false);

      // Capabilities match exactly (no path separators added)
      const foundCapabilities = specs.map(s => s.capability).sort();
      expect(foundCapabilities).toEqual(capabilities.sort());
    });
  });
});
