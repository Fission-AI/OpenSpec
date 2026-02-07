import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findAllSpecs } from '../../src/utils/spec-discovery.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Spec Discovery Performance Benchmarks', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-perf-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should handle 100 flat specs efficiently', () => {
    // Create 100 flat specs
    for (let i = 0; i < 100; i++) {
      const specDir = path.join(tempDir, `capability-${i}`);
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), `# Spec ${i}`);
    }

    const startTime = performance.now();
    const specs = findAllSpecs(tempDir);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(specs.length).toBe(100);
    expect(duration).toBeLessThan(500); // Should complete in < 500ms
    console.log(`100 flat specs discovered in ${duration.toFixed(2)}ms`);
  });

  it('should handle 100 hierarchical specs efficiently', () => {
    // Create 100 hierarchical specs (depth 2-3)
    for (let i = 0; i < 50; i++) {
      const specDir = path.join(tempDir, '_global', `capability-${i}`);
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), `# Global Spec ${i}`);
    }

    for (let i = 0; i < 50; i++) {
      const specDir = path.join(tempDir, 'platform', 'services', `service-${i}`);
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), `# Service Spec ${i}`);
    }

    const startTime = performance.now();
    const specs = findAllSpecs(tempDir);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(specs.length).toBe(100);
    expect(duration).toBeLessThan(500); // Should complete in < 500ms
    console.log(`100 hierarchical specs discovered in ${duration.toFixed(2)}ms`);
  });

  it('should handle 1000 flat specs efficiently', () => {
    // Create 1000 flat specs
    for (let i = 0; i < 1000; i++) {
      const specDir = path.join(tempDir, `capability-${i}`);
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), `# Spec ${i}`);
    }

    const startTime = performance.now();
    const specs = findAllSpecs(tempDir);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(specs.length).toBe(1000);
    expect(duration).toBeLessThan(3000); // Should complete in < 3 seconds
    console.log(`1000 flat specs discovered in ${duration.toFixed(2)}ms`);
  });

  it('should handle 1000 hierarchical specs efficiently', () => {
    // Create 1000 hierarchical specs distributed across domains
    const domains = ['_global', 'frontend', 'backend', 'platform', 'services'];
    const categories = ['auth', 'api', 'database', 'cache', 'messaging'];

    let count = 0;
    for (const domain of domains) {
      for (const category of categories) {
        for (let i = 0; i < 40 && count < 1000; i++) {
          const specDir = path.join(tempDir, domain, category, `spec-${i}`);
          fs.mkdirSync(specDir, { recursive: true });
          fs.writeFileSync(path.join(specDir, 'spec.md'), `# ${domain}/${category} Spec ${i}`);
          count++;
        }
      }
    }

    const startTime = performance.now();
    const specs = findAllSpecs(tempDir);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(specs.length).toBe(1000);
    expect(duration).toBeLessThan(3000); // Should complete in < 3 seconds
    console.log(`1000 hierarchical specs discovered in ${duration.toFixed(2)}ms`);
  });

  it('should handle mixed flat and hierarchical specs (500 each)', () => {
    // Create 500 flat specs
    for (let i = 0; i < 500; i++) {
      const specDir = path.join(tempDir, `flat-${i}`);
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), `# Flat Spec ${i}`);
    }

    // Create 500 hierarchical specs
    for (let i = 0; i < 250; i++) {
      const specDir = path.join(tempDir, '_global', `hierarchical-${i}`);
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), `# Hierarchical Spec ${i}`);
    }

    for (let i = 0; i < 250; i++) {
      const specDir = path.join(tempDir, 'platform', 'services', `service-${i}`);
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), `# Service Spec ${i}`);
    }

    const startTime = performance.now();
    const specs = findAllSpecs(tempDir);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(specs.length).toBe(1000);

    // Verify we have both flat and hierarchical
    const flatSpecs = specs.filter(s => s.depth === 1);
    const hierarchicalSpecs = specs.filter(s => s.depth > 1);

    expect(flatSpecs.length).toBe(500);
    expect(hierarchicalSpecs.length).toBe(500);
    expect(duration).toBeLessThan(3000); // Should complete in < 3 seconds

    console.log(`1000 mixed specs (500 flat, 500 hierarchical) discovered in ${duration.toFixed(2)}ms`);
  });
});
