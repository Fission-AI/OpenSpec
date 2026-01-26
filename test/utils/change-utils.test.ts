import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { validateChangeName, createChange } from '../../src/utils/change-utils.js';

describe('validateChangeName', () => {
  describe('valid names', () => {
    it('should accept simple kebab-case name', () => {
      const result = validateChangeName('add-auth');
      expect(result).toEqual({ valid: true });
    });

    it('should accept name with multiple segments', () => {
      const result = validateChangeName('add-user-auth');
      expect(result).toEqual({ valid: true });
    });

    it('should accept name with numeric suffix', () => {
      const result = validateChangeName('add-feature-2');
      expect(result).toEqual({ valid: true });
    });

    it('should accept single word name', () => {
      const result = validateChangeName('refactor');
      expect(result).toEqual({ valid: true });
    });

    it('should accept name with numbers in segments', () => {
      const result = validateChangeName('upgrade-to-v2');
      expect(result).toEqual({ valid: true });
    });
  });

  describe('invalid names - uppercase rejected', () => {
    it('should reject name with uppercase letters', () => {
      const result = validateChangeName('Add-Auth');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should reject fully uppercase name', () => {
      const result = validateChangeName('ADD-AUTH');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
    });
  });

  describe('invalid names - spaces rejected', () => {
    it('should reject name with spaces', () => {
      const result = validateChangeName('add auth');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('spaces');
    });
  });

  describe('invalid names - underscores rejected', () => {
    it('should reject name with underscores', () => {
      const result = validateChangeName('add_auth');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('underscores');
    });
  });

  describe('invalid names - special characters rejected', () => {
    it('should reject name with exclamation mark', () => {
      const result = validateChangeName('add-auth!');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject name with @ symbol', () => {
      const result = validateChangeName('add@auth');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('invalid names - leading/trailing hyphens rejected', () => {
    it('should reject name with leading hyphen', () => {
      const result = validateChangeName('-add-auth');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('start with a hyphen');
    });

    it('should reject name with trailing hyphen', () => {
      const result = validateChangeName('add-auth-');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('end with a hyphen');
    });
  });

  describe('invalid names - consecutive hyphens rejected', () => {
    it('should reject name with double hyphens', () => {
      const result = validateChangeName('add--auth');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('consecutive hyphens');
    });
  });

  describe('invalid names - empty name rejected', () => {
    it('should reject empty string', () => {
      const result = validateChangeName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });
});

describe('createChange', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('creates directory', () => {
    it('should create change directory', async () => {
      await createChange(testDir, 'add-auth');

      const changeDir = path.join(testDir, 'openspec', 'changes', 'add-auth');
      const stats = await fs.stat(changeDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create .openspec.yaml metadata file with default schema', async () => {
      await createChange(testDir, 'add-auth');

      const metaPath = path.join(testDir, 'openspec', 'changes', 'add-auth', '.openspec.yaml');
      const content = await fs.readFile(metaPath, 'utf-8');
      expect(content).toContain('schema: spec-driven');
      expect(content).toMatch(/created: \d{4}-\d{2}-\d{2}/);
    });

    it('should create .openspec.yaml with custom schema', async () => {
      await createChange(testDir, 'add-auth', { schema: 'spec-driven' });

      const metaPath = path.join(testDir, 'openspec', 'changes', 'add-auth', '.openspec.yaml');
      const content = await fs.readFile(metaPath, 'utf-8');
      expect(content).toContain('schema: spec-driven');
    });
  });

  describe('schema validation', () => {
    it('should throw error for unknown schema', async () => {
      await expect(createChange(testDir, 'add-auth', { schema: 'unknown-schema' })).rejects.toThrow(
        /Unknown schema/
      );
    });
  });

  describe('duplicate change throws error', () => {
    it('should throw error if change already exists', async () => {
      await createChange(testDir, 'add-auth');

      await expect(createChange(testDir, 'add-auth')).rejects.toThrow(
        /already exists/
      );
    });
  });

  describe('invalid name throws validation error', () => {
    it('should throw error for uppercase name', async () => {
      await expect(createChange(testDir, 'Add-Auth')).rejects.toThrow(
        /lowercase/
      );
    });

    it('should throw error for name with spaces', async () => {
      await expect(createChange(testDir, 'add auth')).rejects.toThrow(
        /spaces/
      );
    });

    it('should throw error for empty name', async () => {
      await expect(createChange(testDir, '')).rejects.toThrow(
        /empty/
      );
    });
  });

  describe('creates parent directories if needed', () => {
    it('should create openspec/changes/ directories if they do not exist', async () => {
      const newProjectDir = path.join(testDir, 'new-project');
      await fs.mkdir(newProjectDir);

      // openspec/changes/ does not exist yet
      await createChange(newProjectDir, 'add-auth');

      const changeDir = path.join(newProjectDir, 'openspec', 'changes', 'add-auth');
      const stats = await fs.stat(changeDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });
});
