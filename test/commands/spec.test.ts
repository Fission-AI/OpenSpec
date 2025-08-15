import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

describe('spec command', () => {
  let testDir: string;
  let originalDir: string;
  const cliPath = path.resolve('dist/cli/index.js');
  const CLI = `node ${cliPath}`;

  beforeEach(async () => {
    // Save original directory
    originalDir = process.cwd();
    
    // Create a test directory
    testDir = path.join(tmpdir(), `openspec-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    // Copy openspec directory from the current project
    const sourceOpenspecDir = path.join(originalDir, 'openspec');
    const targetOpenspecDir = path.join(testDir, 'openspec');
    await fs.cp(sourceOpenspecDir, targetOpenspecDir, { recursive: true });
    
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up
    process.chdir(originalDir);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('spec list', () => {
    it('should list available specs', () => {
      const output = execSync(`${CLI} spec list`, { encoding: 'utf-8' });
      expect(output).toContain('Available specs:');
      expect(output).toContain('cli-init');
    });

    it('should output JSON when --json flag is used', () => {
      const output = execSync(`${CLI} spec list --json`, { encoding: 'utf-8' });
      const json = JSON.parse(output);
      expect(json).toHaveProperty('specs');
      expect(Array.isArray(json.specs)).toBe(true);
      expect(json.specs).toContain('cli-init');
    });
  });

  describe('spec show', () => {
    it('should show spec in JSON format', () => {
      const output = execSync(`${CLI} spec show cli-init`, { encoding: 'utf-8' });
      const json = JSON.parse(output);
      expect(json).toHaveProperty('name', 'cli-init');
      expect(json).toHaveProperty('overview');
      expect(json).toHaveProperty('requirements');
      expect(Array.isArray(json.requirements)).toBe(true);
    });

    it('should filter to requirements only with --requirements', () => {
      const output = execSync(`${CLI} spec show cli-init --requirements`, { encoding: 'utf-8' });
      const json = JSON.parse(output);
      expect(json.requirements[0]).toHaveProperty('index');
      expect(json.requirements[0]).toHaveProperty('text');
      expect(json.requirements[0]).toHaveProperty('scenarios');
    });

    it('should hide scenarios with --no-scenarios', () => {
      const output = execSync(`${CLI} spec show cli-init --no-scenarios`, { encoding: 'utf-8' });
      const json = JSON.parse(output);
      expect(json.requirements[0]).toHaveProperty('index');
      expect(json.requirements[0]).toHaveProperty('text');
      expect(json.requirements[0]).not.toHaveProperty('scenarios');
    });

    it('should show specific requirement with -r option', () => {
      const output = execSync(`${CLI} spec show cli-init -r 0`, { encoding: 'utf-8' });
      const json = JSON.parse(output);
      expect(json).toHaveProperty('index', 0);
      expect(json).toHaveProperty('text');
      expect(json).toHaveProperty('scenarios');
    });

    it('should error for non-existent spec', () => {
      expect(() => {
        execSync(`${CLI} spec show non-existent`, { encoding: 'utf-8' });
      }).toThrow();
    });

    it('should error for invalid requirement index', () => {
      expect(() => {
        execSync(`${CLI} spec show cli-init -r 999`, { encoding: 'utf-8' });
      }).toThrow();
    });
  });

  describe('spec validate', () => {
    it('should validate a valid spec', () => {
      const output = execSync(`${CLI} spec validate cli-init`, { encoding: 'utf-8' });
      expect(output).toContain('✓ Spec \'cli-init\' is valid');
    });

    it('should output JSON validation report with --json', () => {
      const output = execSync(`${CLI} spec validate cli-init --json`, { encoding: 'utf-8' });
      const json = JSON.parse(output);
      expect(json).toHaveProperty('valid');
      expect(json).toHaveProperty('issues');
      expect(json).toHaveProperty('summary');
      expect(json.summary).toHaveProperty('errors');
      expect(json.summary).toHaveProperty('warnings');
      expect(json.summary).toHaveProperty('info');
    });

    it('should handle strict mode', () => {
      const output = execSync(`${CLI} spec validate cli-init --strict`, { encoding: 'utf-8' });
      expect(output).toBeDefined();
    });

    it('should error for non-existent spec', () => {
      expect(() => {
        execSync(`${CLI} spec validate non-existent`, { encoding: 'utf-8' });
      }).toThrow();
    });
  });

  describe('spec help', () => {
    it('should show help for spec command', () => {
      const output = execSync(`${CLI} spec --help`, { encoding: 'utf-8' });
      expect(output).toContain('Commands for working with OpenSpec specifications');
      expect(output).toContain('show');
      expect(output).toContain('list');
      expect(output).toContain('validate');
    });

    it('should show help for spec show subcommand', () => {
      const output = execSync(`${CLI} spec show --help`, { encoding: 'utf-8' });
      expect(output).toContain('Display a spec in JSON format');
      expect(output).toContain('--requirements');
      expect(output).toContain('--no-scenarios');
      expect(output).toContain('-r, --requirement');
    });
  });
});