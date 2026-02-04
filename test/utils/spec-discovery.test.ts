import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findAllSpecs, isSpecStructureHierarchical, findSpecUpdates, validateSpecStructure, type DiscoveredSpec } from '../../src/utils/spec-discovery.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturesDir = path.join(__dirname, '..', 'fixtures', 'spec-discovery');

describe('spec-discovery', () => {
  describe('findAllSpecs() - flat structure', () => {
    let flatFixtureDir: string;

    beforeEach(() => {
      // Create flat structure fixture
      flatFixtureDir = path.join(fixturesDir, 'flat-structure');
      fs.mkdirSync(path.join(flatFixtureDir, 'auth'), { recursive: true });
      fs.mkdirSync(path.join(flatFixtureDir, 'payments'), { recursive: true });
      fs.mkdirSync(path.join(flatFixtureDir, 'notifications'), { recursive: true });

      fs.writeFileSync(path.join(flatFixtureDir, 'auth', 'spec.md'), '# Auth Spec');
      fs.writeFileSync(path.join(flatFixtureDir, 'payments', 'spec.md'), '# Payments Spec');
      fs.writeFileSync(path.join(flatFixtureDir, 'notifications', 'spec.md'), '# Notifications Spec');
    });

    afterEach(() => {
      // Clean up fixtures
      if (fs.existsSync(flatFixtureDir)) {
        fs.rmSync(flatFixtureDir, { recursive: true, force: true });
      }
    });

    it('should find all specs in flat structure', () => {
      const specs = findAllSpecs(flatFixtureDir);

      expect(specs).toHaveLength(3);
      expect(specs.map(s => s.capability).sort()).toEqual(['auth', 'notifications', 'payments']);
    });

    it('should set depth to 1 for flat structure specs', () => {
      const specs = findAllSpecs(flatFixtureDir);

      specs.forEach(spec => {
        expect(spec.depth).toBe(1);
      });
    });

    it('should return absolute paths to spec.md files', () => {
      const specs = findAllSpecs(flatFixtureDir);

      specs.forEach(spec => {
        expect(path.isAbsolute(spec.path)).toBe(true);
        expect(spec.path.endsWith('spec.md')).toBe(true);
        expect(fs.existsSync(spec.path)).toBe(true);
      });
    });

    it('should handle empty specs directory', () => {
      const emptyDir = path.join(fixturesDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const specs = findAllSpecs(emptyDir);

      expect(specs).toHaveLength(0);

      fs.rmSync(emptyDir, { recursive: true, force: true });
    });

    it('should handle non-existent directory gracefully', () => {
      const nonExistent = path.join(fixturesDir, 'does-not-exist');

      const specs = findAllSpecs(nonExistent);

      expect(specs).toHaveLength(0);
    });

    it('should skip spec.md found directly in baseDir (no valid capability)', () => {
      // A spec.md at the root of the specs directory has no capability name
      fs.writeFileSync(path.join(flatFixtureDir, 'spec.md'), '# Root Spec');

      const specs = findAllSpecs(flatFixtureDir);

      // Should only find the 3 specs in subdirectories, not the root one
      expect(specs).toHaveLength(3);
      expect(specs.map(s => s.capability)).not.toContain('');
    });

    it('should ignore directories without spec.md', () => {
      const dirWithoutSpec = path.join(flatFixtureDir, 'no-spec');
      fs.mkdirSync(dirWithoutSpec, { recursive: true });
      fs.writeFileSync(path.join(dirWithoutSpec, 'readme.md'), '# README');

      const specs = findAllSpecs(flatFixtureDir);

      expect(specs).toHaveLength(3); // Only the 3 with spec.md
      expect(specs.map(s => s.capability)).not.toContain('no-spec');
    });
  });

  describe('findAllSpecs() - hierarchical structure', () => {
    let hierarchicalFixtureDir: string;

    beforeEach(() => {
      // Create hierarchical structure fixture (depth 2-4)
      hierarchicalFixtureDir = path.join(fixturesDir, 'hierarchical-structure');

      // Depth 2: _global/testing
      fs.mkdirSync(path.join(hierarchicalFixtureDir, '_global', 'testing'), { recursive: true });
      fs.writeFileSync(path.join(hierarchicalFixtureDir, '_global', 'testing', 'spec.md'), '# Testing Spec');

      // Depth 2: _global/architecture
      fs.mkdirSync(path.join(hierarchicalFixtureDir, '_global', 'architecture'), { recursive: true });
      fs.writeFileSync(path.join(hierarchicalFixtureDir, '_global', 'architecture', 'spec.md'), '# Architecture Spec');

      // Depth 2: dev/mcp-server
      fs.mkdirSync(path.join(hierarchicalFixtureDir, 'dev', 'mcp-server'), { recursive: true });
      fs.writeFileSync(path.join(hierarchicalFixtureDir, 'dev', 'mcp-server', 'spec.md'), '# MCP Server Spec');

      // Depth 3: packages/auth/oauth
      fs.mkdirSync(path.join(hierarchicalFixtureDir, 'packages', 'auth', 'oauth'), { recursive: true });
      fs.writeFileSync(path.join(hierarchicalFixtureDir, 'packages', 'auth', 'oauth', 'spec.md'), '# OAuth Spec');

      // Depth 4: platform/services/api/rest
      fs.mkdirSync(path.join(hierarchicalFixtureDir, 'platform', 'services', 'api', 'rest'), { recursive: true });
      fs.writeFileSync(path.join(hierarchicalFixtureDir, 'platform', 'services', 'api', 'rest', 'spec.md'), '# REST API Spec');
    });

    afterEach(() => {
      if (fs.existsSync(hierarchicalFixtureDir)) {
        fs.rmSync(hierarchicalFixtureDir, { recursive: true, force: true });
      }
    });

    it('should find all specs in hierarchical structure', () => {
      const specs = findAllSpecs(hierarchicalFixtureDir);

      expect(specs).toHaveLength(5);
    });

    it('should construct capability names from relative paths', () => {
      const specs = findAllSpecs(hierarchicalFixtureDir);
      const capabilities = specs.map(s => s.capability).sort();

      expect(capabilities).toContain(path.join('_global', 'testing'));
      expect(capabilities).toContain(path.join('_global', 'architecture'));
      expect(capabilities).toContain(path.join('dev', 'mcp-server'));
      expect(capabilities).toContain(path.join('packages', 'auth', 'oauth'));
      expect(capabilities).toContain(path.join('platform', 'services', 'api', 'rest'));
    });

    it('should correctly calculate depth for hierarchical specs', () => {
      const specs = findAllSpecs(hierarchicalFixtureDir);

      const depth2Specs = specs.filter(s => s.depth === 2);
      const depth3Specs = specs.filter(s => s.depth === 3);
      const depth4Specs = specs.filter(s => s.depth === 4);

      expect(depth2Specs).toHaveLength(3); // _global/testing, _global/architecture, dev/mcp-server
      expect(depth3Specs).toHaveLength(1); // packages/auth/oauth
      expect(depth4Specs).toHaveLength(1); // platform/services/api/rest
    });

    it('should handle mixed depth hierarchies', () => {
      const specs = findAllSpecs(hierarchicalFixtureDir);

      const depths = specs.map(s => s.depth).sort();
      expect(Math.min(...depths)).toBe(2);
      expect(Math.max(...depths)).toBe(4);
    });

    it('should return absolute paths with correct hierarchy', () => {
      const specs = findAllSpecs(hierarchicalFixtureDir);

      specs.forEach(spec => {
        expect(path.isAbsolute(spec.path)).toBe(true);
        expect(spec.path.endsWith('spec.md')).toBe(true);
        expect(fs.existsSync(spec.path)).toBe(true);

        // Verify path contains the capability structure
        const normalizedPath = spec.path.split(path.sep).join('/');
        const normalizedCapability = spec.capability.split(path.sep).join('/');
        expect(normalizedPath).toContain(normalizedCapability);
      });
    });

    it('should find all specs including intermediate levels (validation happens separately)', () => {
      // Add a spec.md at an intermediate directory level
      fs.writeFileSync(path.join(hierarchicalFixtureDir, '_global', 'spec.md'), '# Intermediate Spec');

      const specs = findAllSpecs(hierarchicalFixtureDir);

      // findAllSpecs discovers all spec.md files; orphan detection is done by validateSpecStructure()
      expect(specs).toHaveLength(6);
      expect(specs.map(s => s.capability)).toContain('_global');
    });
  });

  describe('findAllSpecs() - cross-platform path handling', () => {
    let crossPlatformFixtureDir: string;

    beforeEach(() => {
      crossPlatformFixtureDir = path.join(fixturesDir, 'cross-platform');

      // Create a hierarchical structure that will test path.sep handling
      fs.mkdirSync(path.join(crossPlatformFixtureDir, '_global', 'testing'), { recursive: true });
      fs.writeFileSync(path.join(crossPlatformFixtureDir, '_global', 'testing', 'spec.md'), '# Testing Spec');

      fs.mkdirSync(path.join(crossPlatformFixtureDir, 'packages', 'auth'), { recursive: true });
      fs.writeFileSync(path.join(crossPlatformFixtureDir, 'packages', 'auth', 'spec.md'), '# Auth Spec');
    });

    afterEach(() => {
      if (fs.existsSync(crossPlatformFixtureDir)) {
        fs.rmSync(crossPlatformFixtureDir, { recursive: true, force: true });
      }
    });

    it('should use platform-specific path separators in capability names', () => {
      const specs = findAllSpecs(crossPlatformFixtureDir);

      specs.forEach(spec => {
        if (spec.depth > 1) {
          // Hierarchical specs should use path.sep (\ on Windows, / on Unix)
          expect(spec.capability).toContain(path.sep);
        }
      });
    });

    it('should construct paths using path.join for cross-platform compatibility', () => {
      const specs = findAllSpecs(crossPlatformFixtureDir);

      // Verify that paths are constructed correctly on current platform
      const globalTestingSpec = specs.find(s => s.capability.endsWith('testing'));
      expect(globalTestingSpec).toBeDefined();

      // Path should be valid on current platform
      expect(fs.existsSync(globalTestingSpec!.path)).toBe(true);

      // Verify path structure matches platform conventions
      const expectedPath = path.join(crossPlatformFixtureDir, '_global', 'testing', 'spec.md');
      expect(globalTestingSpec!.path).toBe(expectedPath);
    });

    it('should handle capability names consistently across platforms', () => {
      const specs = findAllSpecs(crossPlatformFixtureDir);

      // Capability names should use path.sep consistently
      const globalSpec = specs.find(s => s.capability.includes('global'));
      const packagesSpec = specs.find(s => s.capability.includes('packages'));

      expect(globalSpec).toBeDefined();
      expect(packagesSpec).toBeDefined();

      // On Windows: _global\testing, packages\auth
      // On Unix: _global/testing, packages/auth
      if (process.platform === 'win32') {
        expect(globalSpec!.capability).toBe('_global\\testing');
        expect(packagesSpec!.capability).toBe('packages\\auth');
      } else {
        expect(globalSpec!.capability).toBe('_global/testing');
        expect(packagesSpec!.capability).toBe('packages/auth');
      }
    });

    it('should correctly split capability names by path.sep for depth calculation', () => {
      const specs = findAllSpecs(crossPlatformFixtureDir);

      const globalSpec = specs.find(s => s.capability.includes('global'));
      const packagesSpec = specs.find(s => s.capability.includes('packages'));

      expect(globalSpec!.depth).toBe(2);
      expect(packagesSpec!.depth).toBe(2);

      // Verify depth calculation uses path.sep correctly
      expect(globalSpec!.capability.split(path.sep)).toHaveLength(2);
      expect(packagesSpec!.capability.split(path.sep)).toHaveLength(2);
    });
  });

  describe('findSpecUpdates()', () => {
    let updatesFixtureDir: string;
    let changeDir: string;
    let mainSpecsDir: string;

    beforeEach(() => {
      updatesFixtureDir = path.join(fixturesDir, 'spec-updates');
      changeDir = path.join(updatesFixtureDir, 'changes', 'my-change');
      mainSpecsDir = path.join(updatesFixtureDir, 'specs');
    });

    afterEach(() => {
      if (fs.existsSync(updatesFixtureDir)) {
        fs.rmSync(updatesFixtureDir, { recursive: true, force: true });
      }
    });

    it('should map flat delta specs to main specs', () => {
      // Create main spec
      fs.mkdirSync(path.join(mainSpecsDir, 'auth'), { recursive: true });
      fs.writeFileSync(path.join(mainSpecsDir, 'auth', 'spec.md'), '# Auth');

      // Create delta spec in change
      fs.mkdirSync(path.join(changeDir, 'specs', 'auth'), { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'specs', 'auth', 'spec.md'), '# Auth Delta');

      const updates = findSpecUpdates(changeDir, mainSpecsDir);

      expect(updates).toHaveLength(1);
      expect(updates[0].capability).toBe('auth');
      expect(updates[0].exists).toBe(true);
      expect(updates[0].source).toContain(path.join('my-change', 'specs', 'auth', 'spec.md'));
      expect(updates[0].target).toBe(path.join(mainSpecsDir, 'auth', 'spec.md'));
    });

    it('should map hierarchical delta specs preserving path structure', () => {
      // Create main spec
      fs.mkdirSync(path.join(mainSpecsDir, '_global', 'testing'), { recursive: true });
      fs.writeFileSync(path.join(mainSpecsDir, '_global', 'testing', 'spec.md'), '# Testing');

      // Create delta spec in change
      fs.mkdirSync(path.join(changeDir, 'specs', '_global', 'testing'), { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'specs', '_global', 'testing', 'spec.md'), '# Testing Delta');

      const updates = findSpecUpdates(changeDir, mainSpecsDir);

      expect(updates).toHaveLength(1);
      expect(updates[0].capability).toBe(path.join('_global', 'testing'));
      expect(updates[0].exists).toBe(true);
    });

    it('should detect new capabilities (exists=false) when main spec does not exist', () => {
      // No main spec
      fs.mkdirSync(mainSpecsDir, { recursive: true });

      // Create delta spec for a new capability
      fs.mkdirSync(path.join(changeDir, 'specs', 'new-feature'), { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'specs', 'new-feature', 'spec.md'), '# New Feature');

      const updates = findSpecUpdates(changeDir, mainSpecsDir);

      expect(updates).toHaveLength(1);
      expect(updates[0].capability).toBe('new-feature');
      expect(updates[0].exists).toBe(false);
    });

    it('should return empty array when change has no specs directory', () => {
      fs.mkdirSync(changeDir, { recursive: true });
      fs.mkdirSync(mainSpecsDir, { recursive: true });

      const updates = findSpecUpdates(changeDir, mainSpecsDir);

      expect(updates).toHaveLength(0);
    });

    it('should handle mixed flat and hierarchical delta specs', () => {
      // Create main specs
      fs.mkdirSync(path.join(mainSpecsDir, 'auth'), { recursive: true });
      fs.writeFileSync(path.join(mainSpecsDir, 'auth', 'spec.md'), '# Auth');
      fs.mkdirSync(path.join(mainSpecsDir, '_global', 'testing'), { recursive: true });
      fs.writeFileSync(path.join(mainSpecsDir, '_global', 'testing', 'spec.md'), '# Testing');

      // Create delta specs
      fs.mkdirSync(path.join(changeDir, 'specs', 'auth'), { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'specs', 'auth', 'spec.md'), '# Auth Delta');
      fs.mkdirSync(path.join(changeDir, 'specs', '_global', 'testing'), { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'specs', '_global', 'testing', 'spec.md'), '# Testing Delta');

      const updates = findSpecUpdates(changeDir, mainSpecsDir);

      expect(updates).toHaveLength(2);
      const capabilities = updates.map(u => u.capability).sort();
      expect(capabilities).toContain('auth');
      expect(capabilities).toContain(path.join('_global', 'testing'));
      expect(updates.every(u => u.exists)).toBe(true);
    });
  });

  describe('validateSpecStructure() - orphaned specs validation', () => {
    it('should return no issues for valid leaf-only specs', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 },
        { capability: path.join('packages', 'auth', 'oauth'), path: '/specs/packages/auth/oauth/spec.md', depth: 3 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const orphanedIssues = issues.filter(i => i.message.includes('Orphaned spec'));

      expect(orphanedIssues).toHaveLength(0);
    });

    it('should detect orphaned spec at intermediate level (depth 1 parent of depth 2)', () => {
      const specs: DiscoveredSpec[] = [
        { capability: '_global', path: '/specs/_global/spec.md', depth: 1 },
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const orphanedIssues = issues.filter(i => i.message.includes('Orphaned spec'));

      expect(orphanedIssues).toHaveLength(1);
      expect(orphanedIssues[0].level).toBe('ERROR');
      expect(orphanedIssues[0].message).toContain('_global');
      expect(orphanedIssues[0].message).toContain('intermediate level');
      expect(orphanedIssues[0].capability).toBe('_global');
    });

    it('should detect orphaned spec at intermediate level (depth 2 parent of depth 3)', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('packages', 'auth'), path: '/specs/packages/auth/spec.md', depth: 2 },
        { capability: path.join('packages', 'auth', 'oauth'), path: '/specs/packages/auth/oauth/spec.md', depth: 3 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const orphanedIssues = issues.filter(i => i.message.includes('Orphaned spec'));

      expect(orphanedIssues).toHaveLength(1);
      expect(orphanedIssues[0].level).toBe('ERROR');
      expect(orphanedIssues[0].message).toContain(path.join('packages', 'auth'));
    });

    it('should detect multiple orphaned specs', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'platform', path: '/specs/platform/spec.md', depth: 1 },
        { capability: path.join('platform', 'services'), path: '/specs/platform/services/spec.md', depth: 2 },
        { capability: path.join('platform', 'services', 'api'), path: '/specs/platform/services/api/spec.md', depth: 3 },
        { capability: path.join('platform', 'services', 'api', 'rest'), path: '/specs/platform/services/api/rest/spec.md', depth: 4 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const orphanedIssues = issues.filter(i => i.message.includes('Orphaned spec'));

      // Should detect 3 orphaned specs (platform, platform/services, platform/services/api)
      expect(orphanedIssues.length).toBeGreaterThanOrEqual(3);
      expect(orphanedIssues.every(i => i.level === 'ERROR')).toBe(true);
    });

    it('should not flag specs with similar prefixes as orphaned', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: 'authentication', path: '/specs/authentication/spec.md', depth: 1 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const orphanedIssues = issues.filter(i => i.message.includes('Orphaned spec'));

      expect(orphanedIssues).toHaveLength(0);
    });
  });

  describe('validateSpecStructure() - depth limits validation', () => {
    it('should return no issues for specs within recommended depth', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 },
        { capability: path.join('packages', 'auth', 'oauth'), path: '/specs/packages/auth/oauth/spec.md', depth: 3 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const depthIssues = issues.filter(i => i.message.includes('depth'));

      expect(depthIssues).toHaveLength(0);
    });

    it('should return WARNING for specs at depth 4 (above recommended)', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('platform', 'services', 'api', 'rest'), path: '/specs/platform/services/api/rest/spec.md', depth: 4 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const depthIssues = issues.filter(i => i.message.includes('depth'));

      expect(depthIssues).toHaveLength(1);
      expect(depthIssues[0].level).toBe('WARNING');
      expect(depthIssues[0].message).toContain('depth 4');
      expect(depthIssues[0].message).toContain('Recommended maximum is 3');
    });

    it('should return ERROR for specs exceeding configured maxDepth', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('a', 'b', 'c', 'd', 'e'), path: '/specs/a/b/c/d/e/spec.md', depth: 5 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const depthIssues = issues.filter(i => i.message.includes('exceeds maximum depth'));

      expect(depthIssues).toHaveLength(1);
      expect(depthIssues[0].level).toBe('ERROR');
      expect(depthIssues[0].message).toContain('exceeds maximum depth 4');
      expect(depthIssues[0].message).toContain('actual: 5');
    });

    it('should respect custom maxDepth configuration', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('a', 'b', 'c'), path: '/specs/a/b/c/spec.md', depth: 3 },
      ];

      // With maxDepth: 2, depth 3 should be an error
      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 2 });
      const depthIssues = issues.filter(i => i.message.includes('exceeds maximum depth'));

      expect(depthIssues).toHaveLength(1);
      expect(depthIssues[0].level).toBe('ERROR');
      expect(depthIssues[0].message).toContain('exceeds maximum depth 2');
    });

    it('should cap maxDepth at hard limit of 6', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('a', 'b', 'c', 'd', 'e', 'f', 'g'), path: '/specs/a/b/c/d/e/f/g/spec.md', depth: 7 },
      ];

      // Even with maxDepth: 10, hard limit is 6
      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 10 });
      const depthIssues = issues.filter(i => i.message.includes('exceeds maximum depth'));

      expect(depthIssues).toHaveLength(1);
      expect(depthIssues[0].level).toBe('ERROR');
      expect(depthIssues[0].message).toContain('exceeds maximum depth 6');
    });

    it('should handle multiple specs with different depth issues', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('a', 'b'), path: '/specs/a/b/spec.md', depth: 2 }, // OK
        { capability: path.join('c', 'd', 'e', 'f'), path: '/specs/c/d/e/f/spec.md', depth: 4 }, // WARNING
        { capability: path.join('g', 'h', 'i', 'j', 'k'), path: '/specs/g/h/i/j/k/spec.md', depth: 5 }, // ERROR
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const depthWarnings = issues.filter(i => i.level === 'WARNING' && i.message.includes('depth'));
      const depthErrors = issues.filter(i => i.level === 'ERROR' && i.message.includes('depth'));

      expect(depthWarnings).toHaveLength(1);
      expect(depthErrors).toHaveLength(1);
    });
  });

  describe('validateSpecStructure() - naming conventions validation', () => {
    it('should return no issues for valid lowercase alphanumeric names', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: 'user-profile', path: '/specs/user-profile/spec.md', depth: 1 },
        { capability: 'api_gateway', path: '/specs/api_gateway/spec.md', depth: 1 },
        { capability: 'service123', path: '/specs/service123/spec.md', depth: 1 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const namingIssues = issues.filter(i => i.message.includes('Invalid segment'));

      expect(namingIssues).toHaveLength(0);
    });

    it('should reject uppercase letters in capability names', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'Auth', path: '/specs/Auth/spec.md', depth: 1 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const namingIssues = issues.filter(i => i.message.includes('Invalid segment'));

      expect(namingIssues).toHaveLength(1);
      expect(namingIssues[0].level).toBe('ERROR');
      expect(namingIssues[0].message).toContain('Auth');
      expect(namingIssues[0].message).toContain('lowercase alphanumeric');
    });

    it('should reject special characters (spaces, dots, @ symbols)', () => {
      const invalidNames = [
        { capability: 'user profile', path: '/specs/user profile/spec.md', depth: 1 }, // space
        { capability: 'auth.service', path: '/specs/auth.service/spec.md', depth: 1 }, // dot
        { capability: 'api@gateway', path: '/specs/api@gateway/spec.md', depth: 1 }, // @
        { capability: 'service$name', path: '/specs/service$name/spec.md', depth: 1 }, // $
      ];

      invalidNames.forEach(spec => {
        const issues = validateSpecStructure([spec], { validatePaths: true, maxDepth: 4 });
        const namingIssues = issues.filter(i => i.message.includes('Invalid segment'));
        expect(namingIssues.length).toBeGreaterThan(0);
        expect(namingIssues[0].level).toBe('ERROR');
      });
    });

    it('should validate all segments in hierarchical capability names', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('valid', 'Invalid', 'valid'), path: '/specs/valid/Invalid/valid/spec.md', depth: 3 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const namingIssues = issues.filter(i => i.message.includes('Invalid segment'));

      expect(namingIssues).toHaveLength(1);
      expect(namingIssues[0].message).toContain('Invalid');
    });

    it('should allow underscore-prefixed names', () => {
      const specs: DiscoveredSpec[] = [
        { capability: '_global', path: '/specs/_global/spec.md', depth: 1 },
        { capability: path.join('_private', 'auth'), path: '/specs/_private/auth/spec.md', depth: 2 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const namingIssues = issues.filter(i => i.message.includes('Invalid segment'));

      expect(namingIssues).toHaveLength(0);
    });

    it('should only report naming issue once per capability', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('Bad', 'Also-Bad', 'more-bad'), path: '/specs/Bad/Also-Bad/more-bad/spec.md', depth: 3 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const namingIssues = issues.filter(i => i.message.includes('Invalid segment'));

      // Should only report once for the first invalid segment
      expect(namingIssues).toHaveLength(1);
    });

    it('should skip naming validation when validatePaths is false', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'InvalidName', path: '/specs/InvalidName/spec.md', depth: 1 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: false, maxDepth: 4 });
      const namingIssues = issues.filter(i => i.message.includes('Invalid segment'));

      expect(namingIssues).toHaveLength(0);
    });
  });

  describe('validateSpecStructure() - reserved names validation', () => {
    it('should reject reserved directory names', () => {
      const reservedNames = [
        { capability: '..', path: '/specs/../spec.md', depth: 1 },
        { capability: '.', path: '/specs/./spec.md', depth: 1 },
        { capability: '.git', path: '/specs/.git/spec.md', depth: 1 },
        { capability: '.gitignore', path: '/specs/.gitignore/spec.md', depth: 1 },
        { capability: 'node_modules', path: '/specs/node_modules/spec.md', depth: 1 },
        { capability: '.openspec', path: '/specs/.openspec/spec.md', depth: 1 },
      ];

      reservedNames.forEach(spec => {
        const issues = validateSpecStructure([spec], { validatePaths: true, maxDepth: 4 });
        const reservedIssues = issues.filter(i => i.message.includes('Reserved name'));

        expect(reservedIssues).toHaveLength(1);
        expect(reservedIssues[0].level).toBe('ERROR');
        expect(reservedIssues[0].message).toContain(spec.capability);
        expect(reservedIssues[0].capability).toBe(spec.capability);
      });
    });

    it('should reject reserved names in hierarchical paths', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('packages', '.git', 'auth'), path: '/specs/packages/.git/auth/spec.md', depth: 3 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const reservedIssues = issues.filter(i => i.message.includes('Reserved name'));

      expect(reservedIssues).toHaveLength(1);
      expect(reservedIssues[0].level).toBe('ERROR');
      expect(reservedIssues[0].message).toContain('.git');
    });

    it('should allow valid names that contain reserved substrings', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'git-utils', path: '/specs/git-utils/spec.md', depth: 1 }, // contains "git" but not ".git"
        { capability: 'node-server', path: '/specs/node-server/spec.md', depth: 1 }, // contains "node" but not "node_modules"
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const reservedIssues = issues.filter(i => i.message.includes('Reserved name'));

      expect(reservedIssues).toHaveLength(0);
    });

    it('should list all reserved names in error message', () => {
      const specs: DiscoveredSpec[] = [
        { capability: '.git', path: '/specs/.git/spec.md', depth: 1 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const reservedIssues = issues.filter(i => i.message.includes('Reserved name'));

      expect(reservedIssues[0].message).toContain('..');
      expect(reservedIssues[0].message).toContain('.');
      expect(reservedIssues[0].message).toContain('.git');
      expect(reservedIssues[0].message).toContain('node_modules');
      expect(reservedIssues[0].message).toContain('.openspec');
    });

    it('should only report reserved name issue once per capability', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('.git', 'node_modules'), path: '/specs/.git/node_modules/spec.md', depth: 2 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });
      const reservedIssues = issues.filter(i => i.message.includes('Reserved name'));

      // Should only report once for the first reserved name found
      expect(reservedIssues).toHaveLength(1);
    });

    it('should skip reserved name validation when validatePaths is false', () => {
      const specs: DiscoveredSpec[] = [
        { capability: '.git', path: '/specs/.git/spec.md', depth: 1 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: false, maxDepth: 4 });
      const reservedIssues = issues.filter(i => i.message.includes('Reserved name'));

      expect(reservedIssues).toHaveLength(0);
    });
  });

  describe('validateSpecStructure() - combined validation', () => {
    it('should return empty array for completely valid specs', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 },
        { capability: path.join('packages', 'api-gateway'), path: '/specs/packages/api-gateway/spec.md', depth: 2 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });

      expect(issues).toHaveLength(0);
    });

    it('should detect multiple types of validation issues', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'platform', path: '/specs/platform/spec.md', depth: 1 }, // Orphaned (parent of next)
        { capability: path.join('platform', 'services'), path: '/specs/platform/services/spec.md', depth: 2 },
        { capability: 'Invalid-Name', path: '/specs/Invalid-Name/spec.md', depth: 1 }, // Uppercase
        { capability: path.join('a', 'b', 'c', 'd', 'e'), path: '/specs/a/b/c/d/e/spec.md', depth: 5 }, // Too deep
        { capability: '.git', path: '/specs/.git/spec.md', depth: 1 }, // Reserved
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 4 });

      const orphanedIssues = issues.filter(i => i.message.includes('Orphaned spec'));
      const depthIssues = issues.filter(i => i.message.includes('exceeds maximum depth'));
      const namingIssues = issues.filter(i => i.message.includes('Invalid segment'));
      const reservedIssues = issues.filter(i => i.message.includes('Reserved name'));

      expect(orphanedIssues.length).toBeGreaterThan(0);
      expect(depthIssues.length).toBeGreaterThan(0);
      expect(namingIssues.length).toBeGreaterThan(0);
      expect(reservedIssues.length).toBeGreaterThan(0);
    });

    it('should respect config defaults', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('a', 'b', 'c', 'd', 'e'), path: '/specs/a/b/c/d/e/spec.md', depth: 5 },
      ];

      // When maxDepth not specified, should use default (4)
      const issues = validateSpecStructure(specs, {});
      const depthIssues = issues.filter(i => i.message.includes('exceeds maximum depth'));

      expect(depthIssues).toHaveLength(1);
      expect(depthIssues[0].message).toContain('exceeds maximum depth 4');
    });

    it('should handle empty specs array', () => {
      const issues = validateSpecStructure([], { validatePaths: true, maxDepth: 4 });

      expect(issues).toHaveLength(0);
    });
  });

  describe('validateSpecStructure() - configuration settings', () => {
    it('should use default maxDepth of 4 when not specified', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('a', 'b', 'c', 'd', 'e'), path: '/specs/a/b/c/d/e/spec.md', depth: 5 },
      ];

      const issues = validateSpecStructure(specs, {});
      const depthIssues = issues.filter(i => i.message.includes('exceeds maximum depth'));

      expect(depthIssues).toHaveLength(1);
      expect(depthIssues[0].message).toContain('exceeds maximum depth 4');
    });

    it('should use default validatePaths of true when not specified', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'InvalidName', path: '/specs/InvalidName/spec.md', depth: 1 },
      ];

      const issues = validateSpecStructure(specs, {});
      const namingIssues = issues.filter(i => i.message.includes('Invalid segment'));

      expect(namingIssues).toHaveLength(1);
    });

    it('should disable naming validation when validatePaths is false', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'Invalid-Name', path: '/specs/Invalid-Name/spec.md', depth: 1 },
        { capability: 'auth.service', path: '/specs/auth.service/spec.md', depth: 1 },
        { capability: '.git', path: '/specs/.git/spec.md', depth: 1 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: false, maxDepth: 4 });
      const namingIssues = issues.filter(i => i.message.includes('Invalid segment'));
      const reservedIssues = issues.filter(i => i.message.includes('Reserved name'));

      expect(namingIssues).toHaveLength(0);
      expect(reservedIssues).toHaveLength(0);
    });

    it('should still validate depth and orphaned specs when validatePaths is false', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'parent', path: '/specs/parent/spec.md', depth: 1 },
        { capability: path.join('parent', 'child'), path: '/specs/parent/child/spec.md', depth: 2 },
        { capability: path.join('a', 'b', 'c', 'd', 'e'), path: '/specs/a/b/c/d/e/spec.md', depth: 5 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: false, maxDepth: 4 });
      const orphanedIssues = issues.filter(i => i.message.includes('Orphaned spec'));
      const depthIssues = issues.filter(i => i.message.includes('exceeds maximum depth'));

      expect(orphanedIssues.length).toBeGreaterThan(0);
      expect(depthIssues.length).toBeGreaterThan(0);
    });

    it('should respect custom maxDepth value of 2', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('a', 'b'), path: '/specs/a/b/spec.md', depth: 2 }, // OK
        { capability: path.join('c', 'd', 'e'), path: '/specs/c/d/e/spec.md', depth: 3 }, // ERROR
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 2 });
      const depthErrors = issues.filter(i => i.level === 'ERROR' && i.message.includes('exceeds maximum depth'));

      expect(depthErrors).toHaveLength(1);
      expect(depthErrors[0].message).toContain('exceeds maximum depth 2');
      expect(depthErrors[0].message).toContain('actual: 3');
    });

    it('should respect custom maxDepth value of 6', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('a', 'b', 'c', 'd', 'e', 'f'), path: '/specs/a/b/c/d/e/f/spec.md', depth: 6 }, // OK (at limit)
        { capability: path.join('g', 'h', 'i', 'j', 'k', 'l', 'm'), path: '/specs/g/h/i/j/k/l/m/spec.md', depth: 7 }, // ERROR
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 6 });
      const depthErrors = issues.filter(i => i.level === 'ERROR' && i.message.includes('exceeds maximum depth'));

      expect(depthErrors).toHaveLength(1);
      expect(depthErrors[0].message).toContain('exceeds maximum depth 6');
    });

    it('should handle maxDepth: 1 (flat only)', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 }, // OK
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 }, // ERROR
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 1 });
      const depthErrors = issues.filter(i => i.level === 'ERROR' && i.message.includes('exceeds maximum depth'));

      expect(depthErrors).toHaveLength(1);
      expect(depthErrors[0].capability).toBe(path.join('_global', 'testing'));
    });

    it('should show warnings for depth 4-6 when within configured maxDepth', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('a', 'b', 'c', 'd'), path: '/specs/a/b/c/d/spec.md', depth: 4 },
        { capability: path.join('e', 'f', 'g', 'h', 'i'), path: '/specs/e/f/g/h/i/spec.md', depth: 5 },
      ];

      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 6 });
      const depthWarnings = issues.filter(i => i.level === 'WARNING' && i.message.includes('depth'));

      expect(depthWarnings).toHaveLength(2);
      expect(depthWarnings[0].message).toContain('Recommended maximum is 3');
    });

    it('should combine all config options correctly', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'ValidName', path: '/specs/ValidName/spec.md', depth: 1 }, // Invalid if validatePaths=true
        { capability: path.join('a', 'b', 'c'), path: '/specs/a/b/c/spec.md', depth: 3 }, // OK if maxDepth>=3
      ];

      // Strict config: enable all validations, low maxDepth
      const strictIssues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 2 });
      expect(strictIssues.length).toBeGreaterThan(0);

      // Lenient config: disable path validation, high maxDepth
      const lenientIssues = validateSpecStructure(specs, { validatePaths: false, maxDepth: 6 });
      expect(lenientIssues).toHaveLength(0);
    });

    it('should handle undefined config values with defaults', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('a', 'b', 'c', 'd', 'e'), path: '/specs/a/b/c/d/e/spec.md', depth: 5 },
        { capability: 'InvalidName', path: '/specs/InvalidName/spec.md', depth: 1 },
      ];

      const issues = validateSpecStructure(specs, { structure: 'auto' }); // Only structure specified

      // Should use defaults: maxDepth=4, validatePaths=true
      const depthIssues = issues.filter(i => i.message.includes('exceeds maximum depth'));
      const namingIssues = issues.filter(i => i.message.includes('Invalid segment'));

      expect(depthIssues).toHaveLength(1);
      expect(namingIssues).toHaveLength(1);
    });

    it('should handle empty config object with all defaults', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('a', 'b', 'c', 'd', 'e'), path: '/specs/a/b/c/d/e/spec.md', depth: 5 },
      ];

      const issues = validateSpecStructure(specs, {});
      const depthIssues = issues.filter(i => i.message.includes('exceeds maximum depth'));

      expect(depthIssues).toHaveLength(1);
      expect(depthIssues[0].message).toContain('exceeds maximum depth 4');
    });

    it('should treat maxDepth 10 as hard-capped at 6', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('a', 'b', 'c', 'd', 'e', 'f', 'g'), path: '/specs/a/b/c/d/e/f/g/spec.md', depth: 7 },
      ];

      // Even with maxDepth: 10, should cap at 6
      const issues = validateSpecStructure(specs, { validatePaths: true, maxDepth: 10 });
      const depthIssues = issues.filter(i => i.message.includes('exceeds maximum depth'));

      expect(depthIssues).toHaveLength(1);
      expect(depthIssues[0].message).toContain('exceeds maximum depth 6');
    });

    it('should not enforce structure in auto mode with mixed specs', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 },
      ];

      const issues = validateSpecStructure(specs, { structure: 'auto', validatePaths: true, maxDepth: 4 });

      expect(issues).toHaveLength(0);
    });

    it('should reject hierarchical specs in flat mode', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 },
      ];

      const issues = validateSpecStructure(specs, { structure: 'flat', validatePaths: true, maxDepth: 4 });

      const structureIssues = issues.filter(i => i.message.includes('structure is set to "flat"'));
      expect(structureIssues).toHaveLength(1);
      expect(structureIssues[0].level).toBe('ERROR');
      expect(structureIssues[0].capability).toBe(path.join('_global', 'testing'));
    });

    it('should reject flat specs in hierarchical mode', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 },
      ];

      const issues = validateSpecStructure(specs, { structure: 'hierarchical', validatePaths: true, maxDepth: 4 });

      const structureIssues = issues.filter(i => i.message.includes('structure is set to "hierarchical"'));
      expect(structureIssues).toHaveLength(1);
      expect(structureIssues[0].level).toBe('ERROR');
      expect(structureIssues[0].capability).toBe('auth');
    });
  });

  describe('validateSpecStructure() - structure mode enforcement', () => {
    it('should accept all flat specs in flat mode', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: 'payments', path: '/specs/payments/spec.md', depth: 1 },
      ];

      const issues = validateSpecStructure(specs, { structure: 'flat', validatePaths: false });

      expect(issues).toHaveLength(0);
    });

    it('should reject all hierarchical specs in flat mode', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 },
        { capability: path.join('platform', 'api'), path: '/specs/platform/api/spec.md', depth: 2 },
      ];

      const issues = validateSpecStructure(specs, { structure: 'flat', validatePaths: false });

      const structureIssues = issues.filter(i => i.message.includes('structure is set to "flat"'));
      expect(structureIssues).toHaveLength(2);
    });

    it('should accept all hierarchical specs in hierarchical mode', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 },
        { capability: path.join('platform', 'api'), path: '/specs/platform/api/spec.md', depth: 2 },
      ];

      const issues = validateSpecStructure(specs, { structure: 'hierarchical', validatePaths: false });

      expect(issues).toHaveLength(0);
    });

    it('should reject all flat specs in hierarchical mode', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: 'payments', path: '/specs/payments/spec.md', depth: 1 },
      ];

      const issues = validateSpecStructure(specs, { structure: 'hierarchical', validatePaths: false });

      const structureIssues = issues.filter(i => i.message.includes('structure is set to "hierarchical"'));
      expect(structureIssues).toHaveLength(2);
    });
  });

  describe('validateSpecStructure() - allowMixed enforcement', () => {
    it('should error on mixed specs when allowMixed is false and structure is auto', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 },
      ];

      const issues = validateSpecStructure(specs, { structure: 'auto', allowMixed: false, validatePaths: false });

      const mixedIssues = issues.filter(i => i.message.includes('Mixed spec structure'));
      expect(mixedIssues).toHaveLength(1);
      expect(mixedIssues[0].level).toBe('ERROR');
      expect(mixedIssues[0].message).toContain('1 flat');
      expect(mixedIssues[0].message).toContain('1 hierarchical');
    });

    it('should pass uniform flat specs when allowMixed is false', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: 'payments', path: '/specs/payments/spec.md', depth: 1 },
      ];

      const issues = validateSpecStructure(specs, { structure: 'auto', allowMixed: false, validatePaths: false });

      expect(issues).toHaveLength(0);
    });

    it('should pass uniform hierarchical specs when allowMixed is false', () => {
      const specs: DiscoveredSpec[] = [
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 },
        { capability: path.join('platform', 'api'), path: '/specs/platform/api/spec.md', depth: 2 },
      ];

      const issues = validateSpecStructure(specs, { structure: 'auto', allowMixed: false, validatePaths: false });

      expect(issues).toHaveLength(0);
    });

    it('should not check allowMixed when structure is explicit', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 },
      ];

      // flat mode with allowMixed: false — should only get structure errors, not mixed errors
      const issues = validateSpecStructure(specs, { structure: 'flat', allowMixed: false, validatePaths: false });

      const mixedIssues = issues.filter(i => i.message.includes('Mixed spec structure'));
      expect(mixedIssues).toHaveLength(0);

      const structureIssues = issues.filter(i => i.message.includes('structure is set to "flat"'));
      expect(structureIssues).toHaveLength(1);
    });

    it('should allow mixed specs when allowMixed is true (default)', () => {
      const specs: DiscoveredSpec[] = [
        { capability: 'auth', path: '/specs/auth/spec.md', depth: 1 },
        { capability: path.join('_global', 'testing'), path: '/specs/_global/testing/spec.md', depth: 2 },
      ];

      const issues = validateSpecStructure(specs, { structure: 'auto', allowMixed: true, validatePaths: false });

      expect(issues).toHaveLength(0);
    });
  });
});
