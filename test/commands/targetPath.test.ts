import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ValidateCommand } from '../../src/commands/validate.js';
import { ChangeCommand } from '../../src/commands/change.js';
import { SpecCommand } from '../../src/commands/spec.js';
import { ArchiveCommand } from '../../src/core/archive.js';

describe('targetPath option', () => {
  let tempDir: string;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-targetpath-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create OpenSpec structure
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'archive'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'openspec', 'specs'), { recursive: true });

    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(async () => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.clearAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('ValidateCommand with targetPath', () => {
    it('should validate a spec using targetPath', async () => {
      // Create a valid spec
      const specDir = path.join(tempDir, 'openspec', 'specs', 'test-spec');
      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(
        path.join(specDir, 'spec.md'),
        `# Test Spec

## Purpose
Test purpose.

## Requirements

### Requirement: Test requirement SHALL pass

#### Scenario: Validation
- **GIVEN** a valid spec
- **WHEN** validated
- **THEN** passes`
      );

      const cmd = new ValidateCommand();
      await cmd.execute('test-spec', { 
        type: 'spec', 
        json: true, 
        noInteractive: true,
        targetPath: tempDir 
      });

      expect(console.log).toHaveBeenCalled();
      const output = (console.log as ReturnType<typeof vi.fn>).mock.calls
        .map((call: any[]) => call.join(' '))
        .join('\n');
      expect(output).toContain('valid');
    });

    it('should validate a change using targetPath', async () => {
      // Create a change with delta specs
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'test-change');
      const deltaDir = path.join(changeDir, 'specs', 'alpha');
      await fs.mkdir(deltaDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        '# Test Change\n\n## Why\nTest reason.\n\n## What Changes\n- **alpha:** Test'
      );
      await fs.writeFile(
        path.join(deltaDir, 'spec.md'),
        `## ADDED Requirements

### Requirement: New feature SHALL work

#### Scenario: Feature works
- **GIVEN** the feature
- **WHEN** used
- **THEN** works`
      );

      const cmd = new ValidateCommand();
      await cmd.execute('test-change', { 
        type: 'change', 
        json: true, 
        noInteractive: true,
        targetPath: tempDir 
      });

      expect(console.log).toHaveBeenCalled();
    });

    it('should validate all specs using targetPath', async () => {
      const cmd = new ValidateCommand();
      await cmd.execute(undefined, { 
        specs: true, 
        json: true, 
        noInteractive: true,
        targetPath: tempDir 
      });

      expect(console.log).toHaveBeenCalled();
    });

    it('should validate all changes using targetPath', async () => {
      const cmd = new ValidateCommand();
      await cmd.execute(undefined, { 
        changes: true, 
        json: true, 
        noInteractive: true,
        targetPath: tempDir 
      });

      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('ChangeCommand with targetPath', () => {
    it('should show a change using targetPath', async () => {
      // Create a change
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'test-change');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        '# Test Change\n\n## Why\nTest reason.\n\n## What Changes\n- **alpha:** Test'
      );

      const cmd = new ChangeCommand();
      await cmd.show('test-change', { 
        json: true, 
        noInteractive: true,
        targetPath: tempDir 
      });

      expect(console.log).toHaveBeenCalled();
      const output = (console.log as ReturnType<typeof vi.fn>).mock.calls
        .map((call: any[]) => call.join(' '))
        .join('\n');
      const parsed = JSON.parse(output);
      expect(parsed.id).toBe('test-change');
    });

    it('should list changes using targetPath', async () => {
      // Create changes
      const change1 = path.join(tempDir, 'openspec', 'changes', 'change-a');
      const change2 = path.join(tempDir, 'openspec', 'changes', 'change-b');
      await fs.mkdir(change1, { recursive: true });
      await fs.mkdir(change2, { recursive: true });
      await fs.writeFile(path.join(change1, 'proposal.md'), '# Change A');
      await fs.writeFile(path.join(change2, 'proposal.md'), '# Change B');

      const cmd = new ChangeCommand();
      await cmd.list({ 
        json: true, 
        targetPath: tempDir 
      });

      expect(console.log).toHaveBeenCalled();
      const output = (console.log as ReturnType<typeof vi.fn>).mock.calls
        .map((call: any[]) => call.join(' '))
        .join('\n');
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(2);
      expect(parsed.map((c: any) => c.id).sort()).toEqual(['change-a', 'change-b']);
    });

    it('should validate a change using targetPath', async () => {
      // Create a change
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'valid-change');
      const deltaDir = path.join(changeDir, 'specs', 'alpha');
      await fs.mkdir(deltaDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        '# Valid Change\n\n## Why\nTest.\n\n## What Changes\n- **alpha:** Test'
      );
      await fs.writeFile(
        path.join(deltaDir, 'spec.md'),
        `## ADDED Requirements

### Requirement: Test SHALL pass

#### Scenario: Pass
- **GIVEN** test
- **WHEN** run
- **THEN** pass`
      );

      const cmd = new ChangeCommand();
      await cmd.validate('valid-change', { 
        json: true, 
        noInteractive: true,
        targetPath: tempDir 
      });

      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('SpecCommand with targetPath', () => {
    it('should show a spec using targetPath', async () => {
      // Create a spec
      const specDir = path.join(tempDir, 'openspec', 'specs', 'test-spec');
      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(
        path.join(specDir, 'spec.md'),
        `# Test Spec

## Purpose
Test purpose.

## Requirements

### Requirement: Test SHALL work

#### Scenario: Works
- **GIVEN** test
- **WHEN** run
- **THEN** works`
      );

      const cmd = new SpecCommand();
      await cmd.show('test-spec', { 
        json: true, 
        noInteractive: true,
        targetPath: tempDir 
      });

      expect(console.log).toHaveBeenCalled();
      const output = (console.log as ReturnType<typeof vi.fn>).mock.calls
        .map((call: any[]) => call.join(' '))
        .join('\n');
      const parsed = JSON.parse(output);
      expect(parsed.id).toBe('test-spec');
    });
  });

  describe('ArchiveCommand with targetPath', () => {
    it('should archive a change using targetPath', async () => {
      // Create a change
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'archive-change');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        '- [x] Task 1\n- [x] Task 2'
      );

      const cmd = new ArchiveCommand();
      await cmd.execute('archive-change', { 
        yes: true, 
        skipSpecs: true, 
        noValidate: true,
        targetPath: tempDir 
      });

      // Verify change was archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
      expect(archives[0]).toContain('archive-change');

      // Verify original change no longer exists
      await expect(fs.access(changeDir)).rejects.toThrow();
    });

    it('should update specs in targetPath during archive', async () => {
      // Create a change with specs
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'spec-update-change');
      const changeSpecDir = path.join(changeDir, 'specs', 'new-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        '- [x] Done'
      );
      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `## ADDED Requirements

### Requirement: New capability SHALL exist

#### Scenario: Exists
- **GIVEN** the capability
- **WHEN** checked
- **THEN** exists`
      );

      const cmd = new ArchiveCommand();
      await cmd.execute('spec-update-change', { 
        yes: true, 
        noValidate: true,
        targetPath: tempDir 
      });

      // Verify spec was created in targetPath
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'new-capability', 'spec.md');
      const specContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(specContent).toContain('New capability SHALL exist');
    });

    it('should find specs in targetPath for updates', async () => {
      // Create existing spec
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'existing');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `# Existing Specification

## Purpose
Test purpose.

## Requirements

### Requirement: Original feature SHALL work

#### Scenario: Works
- **GIVEN** feature
- **WHEN** used
- **THEN** works`
      );

      // Create a change that modifies the spec
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'modify-change');
      const changeSpecDir = path.join(changeDir, 'specs', 'existing');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        '- [x] Done'
      );
      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `## ADDED Requirements

### Requirement: New feature SHALL also work

#### Scenario: Also works
- **GIVEN** new feature
- **WHEN** used
- **THEN** works`
      );

      const cmd = new ArchiveCommand();
      await cmd.execute('modify-change', { 
        yes: true, 
        noValidate: true,
        targetPath: tempDir 
      });

      // Verify both requirements exist
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'existing', 'spec.md');
      const specContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(specContent).toContain('Original feature SHALL work');
      expect(specContent).toContain('New feature SHALL also work');
    });
  });
});
