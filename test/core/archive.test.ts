import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArchiveCommand } from '../../src/core/archive.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn()
}));

describe('ArchiveCommand', () => {
  let tempDir: string;
  let archiveCommand: ArchiveCommand;
  const originalConsoleLog = console.log;

  beforeEach(async () => {
    // Create temp directory
    tempDir = path.join(os.tmpdir(), `openspec-archive-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Change to temp directory
    process.chdir(tempDir);
    
    // Create OpenSpec structure
    const openspecDir = path.join(tempDir, 'openspec');
    await fs.mkdir(path.join(openspecDir, 'changes'), { recursive: true });
    await fs.mkdir(path.join(openspecDir, 'specs'), { recursive: true });
    await fs.mkdir(path.join(openspecDir, 'changes', 'archive'), { recursive: true });
    
    // Suppress console.log during tests
    console.log = vi.fn();
    
    archiveCommand = new ArchiveCommand();
  });

  afterEach(async () => {
    // Restore console.log
    console.log = originalConsoleLog;
    
    // Clear mocks
    vi.clearAllMocks();
    
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('execute', () => {
    it('should archive a change successfully', async () => {
      // Create a test change
      const changeName = 'test-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create tasks.md with completed tasks
      const tasksContent = '- [x] Task 1\n- [x] Task 2';
      await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
      
      // Execute archive with --yes flag
      await archiveCommand.execute(changeName, { yes: true });
      
      // Check that change was moved to archive
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      
      expect(archives.length).toBe(1);
      expect(archives[0]).toMatch(new RegExp(`\\d{4}-\\d{2}-\\d{2}-${changeName}`));
      
      // Verify original change directory no longer exists
      await expect(fs.access(changeDir)).rejects.toThrow();
    });

    it('should warn about incomplete tasks', async () => {
      const changeName = 'incomplete-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create tasks.md with incomplete tasks
      const tasksContent = '- [x] Task 1\n- [ ] Task 2\n- [ ] Task 3';
      await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
      
      // Execute archive with --yes flag
      await archiveCommand.execute(changeName, { yes: true });
      
      // Verify warning was logged
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Warning: 2 incomplete task(s) found')
      );
    });

    it('should update specs when archiving', async () => {
      const changeName = 'spec-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create spec in change
      const specContent = '# Test Capability Spec\n\nTest content';
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Execute archive with --yes flag
      await archiveCommand.execute(changeName, { yes: true });
      
      // Verify spec was copied to main specs
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'test-capability', 'spec.md');
      const copiedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(copiedContent).toBe(specContent);
    });

    it('should throw error if change does not exist', async () => {
      await expect(
        archiveCommand.execute('non-existent-change', { yes: true })
      ).rejects.toThrow("Change 'non-existent-change' not found.");
    });

    it('should throw error if archive already exists', async () => {
      const changeName = 'duplicate-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create existing archive with same date
      const date = new Date().toISOString().split('T')[0];
      const archivePath = path.join(tempDir, 'openspec', 'changes', 'archive', `${date}-${changeName}`);
      await fs.mkdir(archivePath, { recursive: true });
      
      // Try to archive
      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(`Archive '${date}-${changeName}' already exists.`);
    });

    it('should handle changes without tasks.md', async () => {
      const changeName = 'no-tasks-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Execute archive without tasks.md
      await archiveCommand.execute(changeName, { yes: true });
      
      // Should complete without warnings
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('incomplete task(s)')
      );
      
      // Verify change was archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
    });

    it('should handle changes without specs', async () => {
      const changeName = 'no-specs-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Execute archive without specs
      await archiveCommand.execute(changeName, { yes: true });
      
      // Should complete without spec updates
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Specs to update')
      );
      
      // Verify change was archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
    });

    it('should skip spec updates when --skip-specs flag is used', async () => {
      const changeName = 'skip-specs-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create spec in change
      const specContent = '# Test Capability Spec\n\nTest content';
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Execute archive with --skip-specs flag
      await archiveCommand.execute(changeName, { yes: true, skipSpecs: true });
      
      // Verify skip message was logged
      expect(console.log).toHaveBeenCalledWith(
        'Skipping spec updates (--skip-specs flag provided).'
      );
      
      // Verify spec was NOT copied to main specs
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'test-capability', 'spec.md');
      await expect(fs.access(mainSpecPath)).rejects.toThrow();
      
      // Verify change was still archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
      expect(archives[0]).toMatch(new RegExp(`\\d{4}-\\d{2}-\\d{2}-${changeName}`));
    });

    it('should proceed with archive when user declines spec updates', async () => {
      const { confirm } = await import('@inquirer/prompts');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      
      const changeName = 'decline-specs-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create spec in change
      const specContent = '# Test Capability Spec\n\nTest content';
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Mock confirm to return false (decline spec updates)
      mockConfirm.mockResolvedValueOnce(false);
      
      // Execute archive without --yes flag
      await archiveCommand.execute(changeName);
      
      // Verify user was prompted about specs
      expect(mockConfirm).toHaveBeenCalledWith({
        message: 'Proceed with spec updates?',
        default: true
      });
      
      // Verify skip message was logged
      expect(console.log).toHaveBeenCalledWith(
        'Skipping spec updates. Proceeding with archive.'
      );
      
      // Verify spec was NOT copied to main specs
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'test-capability', 'spec.md');
      await expect(fs.access(mainSpecPath)).rejects.toThrow();
      
      // Verify change was still archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
      expect(archives[0]).toMatch(new RegExp(`\\d{4}-\\d{2}-\\d{2}-${changeName}`));
    });
  });

  describe('error handling', () => {
    it('should throw error when openspec directory does not exist', async () => {
      // Remove openspec directory
      await fs.rm(path.join(tempDir, 'openspec'), { recursive: true });
      
      await expect(
        archiveCommand.execute('any-change', { yes: true })
      ).rejects.toThrow("No OpenSpec changes directory found. Run 'openspec init' first.");
    });
  });

  describe('interactive mode', () => {
    it('should use select prompt for change selection', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = select as unknown as ReturnType<typeof vi.fn>;
      
      // Create test changes
      const change1 = 'feature-a';
      const change2 = 'feature-b';
      await fs.mkdir(path.join(tempDir, 'openspec', 'changes', change1), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'openspec', 'changes', change2), { recursive: true });
      
      // Mock select to return first change
      mockSelect.mockResolvedValueOnce(change1);
      
      // Execute without change name
      await archiveCommand.execute(undefined, { yes: true });
      
      // Verify select was called with correct options
      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Select a change to archive',
        choices: [
          { name: change1, value: change1 },
          { name: change2, value: change2 }
        ]
      });
      
      // Verify the selected change was archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives[0]).toContain(change1);
    });

    it('should use confirm prompt for task warnings', async () => {
      const { confirm } = await import('@inquirer/prompts');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      
      const changeName = 'incomplete-interactive';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create tasks.md with incomplete tasks
      const tasksContent = '- [ ] Task 1';
      await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
      
      // Mock confirm to return true (proceed)
      mockConfirm.mockResolvedValueOnce(true);
      
      // Execute without --yes flag
      await archiveCommand.execute(changeName);
      
      // Verify confirm was called
      expect(mockConfirm).toHaveBeenCalledWith({
        message: 'Warning: 1 incomplete task(s) found. Continue?',
        default: false
      });
    });

    it('should cancel when user declines task warning', async () => {
      const { confirm } = await import('@inquirer/prompts');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      
      const changeName = 'cancel-test';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create tasks.md with incomplete tasks
      const tasksContent = '- [ ] Task 1';
      await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
      
      // Mock confirm to return false (cancel)
      mockConfirm.mockResolvedValueOnce(false);
      
      // Execute without --yes flag
      await archiveCommand.execute(changeName);
      
      // Verify archive was cancelled
      expect(console.log).toHaveBeenCalledWith('Archive cancelled.');
      
      // Verify change was not archived
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });
  });

  describe('delta processing', () => {
    it('should apply delta changes when archiving', async () => {
      const changeName = 'delta-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create existing spec in main specs
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'test-capability');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const existingSpec = `# Test Capability

### Requirement: Original Feature

This is the original feature.

### Requirement: To Be Modified

This will be modified.

### Requirement: To Be Removed

This will be removed.`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), existingSpec);
      
      // Create delta spec in change
      const deltaSpec = `# Test Capability - Changes

## ADDED

### Requirement: New Feature

This is a new feature.

## MODIFIED

### Requirement: To Be Modified

This has been modified with new content.

## REMOVED

### Requirement: To Be Removed

This requirement is being removed.`;
      
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaSpec);
      
      // Execute archive
      await archiveCommand.execute(changeName, { yes: true });
      
      // Read the updated spec
      const updatedSpec = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      
      // Verify changes were applied
      expect(updatedSpec).toContain('### Requirement: Original Feature');
      expect(updatedSpec).toContain('### Requirement: New Feature');
      expect(updatedSpec).toContain('This has been modified with new content');
      expect(updatedSpec).not.toContain('### Requirement: To Be Removed');
      
      // Verify stats were displayed
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('+ 1 added'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('~ 1 modified'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('- 1 removed'));
    });

    it('should handle RENAMED requirements in delta specs', async () => {
      const changeName = 'rename-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create existing spec
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'test-capability');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const existingSpec = `# Test Capability

### Requirement: Old Name

This requirement will be renamed.`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), existingSpec);
      
      // Create delta spec with RENAMED
      const deltaSpec = `# Test Capability - Changes

## RENAMED

### FROM: Requirement: Old Name
### TO: Requirement: New Name

This requirement has been renamed.`;
      
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaSpec);
      
      // Execute archive
      await archiveCommand.execute(changeName, { yes: true });
      
      // Read updated spec
      const updatedSpec = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      
      // Verify rename was applied
      expect(updatedSpec).not.toContain('### Requirement: Old Name');
      expect(updatedSpec).toContain('### Requirement: New Name');
      
      // Verify stats
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('→ 1 renamed'));
    });

    it('should normalize headers with trim() for matching', async () => {
      const changeName = 'normalize-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create existing spec with extra whitespace
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'test-capability');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const existingSpec = `# Test Capability

### Requirement: Feature With Spaces   

This has trailing spaces in header.`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), existingSpec);
      
      // Create delta spec without extra whitespace
      const deltaSpec = `# Test Capability - Changes

## MODIFIED

### Requirement: Feature With Spaces

This header is normalized for matching.`;
      
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaSpec);
      
      // Execute archive - should match despite whitespace differences
      await archiveCommand.execute(changeName, { yes: true });
      
      // Read updated spec
      const updatedSpec = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      
      // Verify modification was applied
      expect(updatedSpec).toContain('This header is normalized for matching');
    });

    it('should validate MODIFIED requirements exist', async () => {
      const changeName = 'invalid-modified';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create empty existing spec
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'test-capability');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), '# Test Capability\n');
      
      // Create delta spec with MODIFIED for non-existent requirement
      const deltaSpec = `# Test Capability - Changes

## MODIFIED

### Requirement: Non-Existent

This requirement doesn't exist in the main spec.`;
      
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaSpec);
      
      // Execute archive - should fail validation
      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow('MODIFIED requirement not found: "Requirement: Non-Existent"');
    });

    it('should validate ADDED requirements do not already exist', async () => {
      const changeName = 'invalid-added';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create existing spec with a requirement
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'test-capability');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const existingSpec = `# Test Capability

### Requirement: Existing Feature

This already exists.`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), existingSpec);
      
      // Create delta spec trying to ADD existing requirement
      const deltaSpec = `# Test Capability - Changes

## ADDED

### Requirement: Existing Feature

Trying to add an existing requirement.`;
      
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaSpec);
      
      // Execute archive - should fail validation
      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow('ADDED requirement already exists: "Requirement: Existing Feature"');
    });

    it('should validate RENAMED FROM requirement exists', async () => {
      const changeName = 'invalid-rename-from';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create empty existing spec
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'test-capability');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), '# Test Capability\n');
      
      // Create delta spec with RENAMED for non-existent requirement
      const deltaSpec = `# Test Capability - Changes

## RENAMED

### FROM: Requirement: Non-Existent
### TO: Requirement: New Name

Trying to rename a non-existent requirement.`;
      
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaSpec);
      
      // Execute archive - should fail validation
      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow('RENAMED FROM requirement not found: "Requirement: Non-Existent"');
    });

    it('should validate RENAMED TO requirement does not exist', async () => {
      const changeName = 'invalid-rename-to';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create existing spec with two requirements
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'test-capability');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const existingSpec = `# Test Capability

### Requirement: Old Name

This will be renamed.

### Requirement: Existing Target

This already exists.`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), existingSpec);
      
      // Create delta spec trying to rename to existing requirement
      const deltaSpec = `# Test Capability - Changes

## RENAMED

### FROM: Requirement: Old Name
### TO: Requirement: Existing Target

Trying to rename to an existing requirement.`;
      
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaSpec);
      
      // Execute archive - should fail validation
      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow('RENAMED TO requirement already exists: "Requirement: Existing Target"');
    });

    it('should apply changes in correct order: RENAMED → REMOVED → MODIFIED → ADDED', async () => {
      const changeName = 'order-test';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create existing spec
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'test-capability');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const existingSpec = `# Test Capability

### Requirement: To Rename

Will be renamed.

### Requirement: To Remove

Will be removed.

### Requirement: To Modify

Will be modified.`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), existingSpec);
      
      // Create delta spec with all operations
      const deltaSpec = `# Test Capability - Changes

## ADDED

### Requirement: New Addition

Added requirement.

## MODIFIED

### Requirement: To Modify

Modified content.

## REMOVED

### Requirement: To Remove

Removed.

## RENAMED

### FROM: Requirement: To Rename
### TO: Requirement: Renamed

Renamed requirement.`;
      
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaSpec);
      
      // Execute archive
      await archiveCommand.execute(changeName, { yes: true });
      
      // Read updated spec
      const updatedSpec = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      
      // Verify all operations were applied
      expect(updatedSpec).not.toContain('### Requirement: To Rename');
      expect(updatedSpec).toContain('### Requirement: Renamed');
      expect(updatedSpec).not.toContain('### Requirement: To Remove');
      expect(updatedSpec).toContain('Modified content');
      expect(updatedSpec).toContain('### Requirement: New Addition');
    });

    it('should handle backward compatibility with non-delta specs', async () => {
      const changeName = 'non-delta-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create non-delta spec (full replacement)
      const fullSpec = `# Test Capability

### Requirement: Complete Replacement

This is a complete spec replacement, not a delta.`;
      
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), fullSpec);
      
      // Execute archive
      await archiveCommand.execute(changeName, { yes: true });
      
      // Read the spec from main specs
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'test-capability', 'spec.md');
      const copiedSpec = await fs.readFile(mainSpecPath, 'utf-8');
      
      // Verify entire spec was copied
      expect(copiedSpec).toBe(fullSpec);
      
      // Verify no delta stats were displayed
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('+ '));
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('~ '));
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('- '));
    });

    it('should validate that renamed requirements are not also in ADDED', async () => {
      const changeName = 'invalid-rename-added';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create existing spec
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'test-capability');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const existingSpec = `# Test Capability

### Requirement: Old Name

This will be renamed.`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), existingSpec);
      
      // Create delta spec with conflicting RENAMED and ADDED
      const deltaSpec = `# Test Capability - Changes

## ADDED

### Requirement: New Name

This is added.

## RENAMED

### FROM: Requirement: Old Name
### TO: Requirement: New Name

This is renamed to the same name.`;
      
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaSpec);
      
      // Execute archive - should fail validation
      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow('RENAMED requirement also in ADDED section: "Requirement: New Name"');
    });
  });
});