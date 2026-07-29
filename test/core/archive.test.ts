import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArchiveCommand, isRetirableSpec } from '../../src/core/archive.js';
import { retireSpec } from '../../src/core/specs-apply.js';
import { Validator } from '../../src/core/validation/validator.js';
import { MarkdownParser } from '../../src/core/parsers/markdown-parser.js';
import { findMainSpecStructureIssues } from '../../src/core/parsers/spec-structure.js';
import { VALIDATION_MESSAGES } from '../../src/core/validation/constants.js';
import { formatLocalDate } from '../../src/utils/date.js';
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
  const originalExitCode = process.exitCode;
  const originalXdgDataHome = process.env.XDG_DATA_HOME;
  const originalTimeZone = process.env.TZ;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-archive-test-'));

    // Change to temp directory
    process.chdir(tempDir);

    // Isolate root resolution from any real store registry on the
    // host machine so no-root behavior stays the implicit-root path.
    process.env.XDG_DATA_HOME = path.join(tempDir, 'xdg-data');

    // Create OpenSpec structure
    const openspecDir = path.join(tempDir, 'openspec');
    await fs.mkdir(path.join(openspecDir, 'changes'), { recursive: true });
    await fs.mkdir(path.join(openspecDir, 'specs'), { recursive: true });
    await fs.mkdir(path.join(openspecDir, 'changes', 'archive'), { recursive: true });

    // Suppress console.log during tests
    console.log = vi.fn();

    // Isolate process.exitCode so a failing run can't leak into the next
    // test or skew the vitest process exit status.
    process.exitCode = undefined;

    archiveCommand = new ArchiveCommand();
  });

  afterEach(async () => {
    vi.useRealTimers();

    // Restore console.log
    console.log = originalConsoleLog;

    // Restore process.exitCode (clear anything a test set)
    process.exitCode = originalExitCode;

    if (originalXdgDataHome === undefined) {
      delete process.env.XDG_DATA_HOME;
    } else {
      process.env.XDG_DATA_HOME = originalXdgDataHome;
    }

    if (originalTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimeZone;
    }

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

    it('should use the process local date across a UTC date boundary', async () => {
      process.env.TZ = 'Asia/Shanghai';
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-14T16:30:00.000Z'));

      const changeName = 'local-date-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true, noValidate: true, skipSpecs: true });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      await expect(fs.readdir(archiveDir)).resolves.toEqual([`2026-07-15-${changeName}`]);
    });

    it('should preserve the date when UTC and local calendar dates match', async () => {
      process.env.TZ = 'Asia/Shanghai';
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-05T04:30:00.000Z'));

      const changeName = 'same-date-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true, noValidate: true, skipSpecs: true });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      await expect(fs.readdir(archiveDir)).resolves.toEqual([`2026-01-05-${changeName}`]);
    });

    it('keeps an existing YYYY-MM-DD- prefix instead of stacking a new one (#1309)', async () => {
      const changeName = '2026-07-04-voice-copilot-v1';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1');

      await archiveCommand.execute(changeName, { yes: true });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);

      // Archived under its own name: no second date prefix, and the folder
      // keeps sorting under the change's own day even when archived later.
      expect(archives).toEqual([changeName]);
      await expect(fs.access(changeDir)).rejects.toThrow();
    });

    it('still adds the date prefix when a name only starts with a partial date', async () => {
      const changeName = '2026-07-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1');

      await archiveCommand.execute(changeName, { yes: true });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);

      // `2026-07-` is not a full YYYY-MM-DD- prefix, so the name is dated
      // as usual. Asserted as a pattern rather than an exact date to avoid
      // a UTC-midnight race between execute() and the expectation.
      expect(archives.length).toBe(1);
      expect(archives[0]).toMatch(new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${changeName}$`));
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

    it('detects incomplete tasks in nested glob tasks.md files (#1202 data-safety gate)', async () => {
      // Before the fix the gate read a fixed changes/<name>/tasks.md, saw zero
      // tasks for a glob-tasks change, and let an unfinished change archive.
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'glob-tasks');
      await fs.mkdir(schemaDir, { recursive: true });
      await fs.writeFile(
        path.join(schemaDir, 'schema.yaml'),
        [
          'name: glob-tasks',
          'version: 1',
          'artifacts:',
          '  - id: proposal',
          '    generates: proposal.md',
          '    description: Proposal',
          '    template: proposal.md',
          '    requires: []',
          '  - id: tasks',
          '    generates: "**/tasks.md"',
          '    description: Nested tasks',
          '    template: tasks.md',
          '    requires: [proposal]',
          'apply:',
          '  requires: [tasks]',
          '  tracks: "**/tasks.md"',
          '',
        ].join('\n')
      );

      const changeName = 'glob-incomplete-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(path.join(changeDir, 'backend'), { recursive: true });
      await fs.mkdir(path.join(changeDir, 'frontend'), { recursive: true });
      await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: glob-tasks\n');
      await fs.writeFile(path.join(changeDir, 'backend', 'tasks.md'), '- [x] 1.1 a\n- [x] 1.2 b\n');
      await fs.writeFile(path.join(changeDir, 'frontend', 'tasks.md'), '- [x] 2.1 a\n- [ ] 2.2 b\n- [ ] 2.3 c\n');

      await archiveCommand.execute(changeName, { yes: true, noValidate: true, skipSpecs: true });

      // The gate now sees 5 tasks / 2 incomplete across the nested files.
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('2 incomplete task(s) found')
      );
    });

    it('should update specs when archiving (delta-based ADDED) and include change name in skeleton', async () => {
      const changeName = 'spec-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create delta-based change spec (ADDED requirement)
      const specContent = `# Test Capability Spec - Changes

## ADDED Requirements

### Requirement: The system SHALL provide test capability

#### Scenario: Basic test
Given a test condition
When an action occurs
Then expected result happens`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Execute archive with --yes flag and skip validation for speed
      await archiveCommand.execute(changeName, { yes: true, noValidate: true });
      
      // Verify spec was created from skeleton and ADDED requirement applied
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'test-capability', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain('# test-capability Specification');
      expect(updatedContent).toContain('## Purpose');
      expect(updatedContent).toContain(`created by archiving change ${changeName}`);
      expect(updatedContent).toContain('## Requirements');
      expect(updatedContent).toContain('### Requirement: The system SHALL provide test capability');
      expect(updatedContent).toContain('#### Scenario: Basic test');
    });

    it('should archive when ADDED requirements were already synced to the baseline (issue #1332)', async () => {
      const changeName = 'early-synced-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const requirementBlock = `### Requirement: The system SHALL provide a core abstraction layer

#### Scenario: Layer is available
- **WHEN** a consumer imports the layer
- **THEN** the abstraction is available`;

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## ADDED Requirements\n\n${requirementBlock}`
      );

      // Simulate the early-sync pattern: the requirement is already in the
      // main spec (identical content) before archive runs.
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n${requirementBlock}\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // Archive succeeds and the main spec keeps the requirement exactly once
      const updatedContent = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      const occurrences = updatedContent.split('### Requirement: The system SHALL provide a core abstraction layer').length - 1;
      expect(occurrences).toBe(1);

      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it('should still abort ADDED when an existing requirement has different content', async () => {
      const changeName = 'conflicting-added-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## ADDED Requirements\n\n### Requirement: The system SHALL provide a core abstraction layer\n\n#### Scenario: New behavior\n- **WHEN** a consumer imports the layer\n- **THEN** the new abstraction is available`
      );

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n### Requirement: The system SHALL provide a core abstraction layer\n\n#### Scenario: Old behavior\n- **WHEN** a consumer imports the layer\n- **THEN** the old abstraction is available\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // Genuine conflict: archive aborts, nothing moves, main spec untouched
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('ADDED failed for header "### Requirement: The system SHALL provide a core abstraction layer" - already exists')
      );
      expect(process.exitCode).toBe(1);
      await expect(fs.access(changeDir)).resolves.toBeUndefined();
      const untouched = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(untouched).toBe(mainSpecContent);
    });

    it('should archive when RENAMED requirements were already synced to the baseline', async () => {
      const changeName = 'early-synced-rename';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## RENAMED Requirements\n\n- FROM: \`### Requirement: The system SHALL provide an abstraction layer\`\n- TO: \`### Requirement: The system SHALL provide a core abstraction layer\`\n`
      );

      // Early-sync pattern: the main spec already carries the new header.
      const renamedBlock = `### Requirement: The system SHALL provide a core abstraction layer\n\n#### Scenario: Layer is available\n- **WHEN** a consumer imports the layer\n- **THEN** the abstraction is available`;
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n${renamedBlock}\n`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      const occurrences = updatedContent.split('### Requirement: The system SHALL provide a core abstraction layer').length - 1;
      expect(occurrences).toBe(1);
      expect(updatedContent).not.toContain('SHALL provide an abstraction layer');

      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it('should still abort RENAMED when neither the old nor the new header exists', async () => {
      const changeName = 'broken-rename';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## RENAMED Requirements\n\n- FROM: \`### Requirement: A requirement that never existed\`\n- TO: \`### Requirement: A new name that also does not exist\`\n`
      );

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n### Requirement: The system SHALL provide a core abstraction layer\n\n#### Scenario: Layer is available\n- **WHEN** a consumer imports the layer\n- **THEN** the abstraction is available\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('RENAMED failed for header "### Requirement: A requirement that never existed" - source not found')
      );
      expect(process.exitCode).toBe(1);
      await expect(fs.access(changeDir)).resolves.toBeUndefined();
      const untouched = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(untouched).toBe(mainSpecContent);
    });

    it('should abort when REMOVED names the FROM side of a RENAMED in the same delta', async () => {
      // Contradictory delta: you cannot both rename and remove the same
      // requirement. This used to fail incidentally at apply time (the rename
      // consumed the old header, so REMOVED hit "not found"); now that a
      // missing REMOVED target is treated as already synced, the conflict has
      // to be rejected explicitly.
      const changeName = 'rename-and-remove';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## RENAMED Requirements\n\n- FROM: \`### Requirement: Old name\`\n- TO: \`### Requirement: New name\`\n\n## REMOVED Requirements\n\n### Requirement: Old name\n`
      );

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n### Requirement: Old name\n\n#### Scenario: Works\n- **WHEN** it runs\n- **THEN** it works\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('requirement present in multiple sections (RENAMED and REMOVED) for header "### Requirement: Old name"')
      );
      expect(process.exitCode).toBe(1);
      const untouched = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(untouched).toBe(mainSpecContent);
    });

    it('should abort when REMOVED spells the renamed FROM header with different case', async () => {
      const changeName = 'rename-and-remove-case';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## RENAMED Requirements\n\n- FROM: \`### Requirement: Old Name\`\n- TO: \`### Requirement: New Name\`\n\n## REMOVED Requirements\n\n### Requirement: old name\n`
      );

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n### Requirement: Old Name\n\n#### Scenario: Works\n- **WHEN** it runs\n- **THEN** it works\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('requirement present in multiple sections (RENAMED and REMOVED) for header "### Requirement: Old Name" (REMOVED spells it "old name")')
      );
      expect(process.exitCode).toBe(1);
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      const untouched = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(untouched).toBe(mainSpecContent);
    });

    it('should archive when REMOVED requirements were already synced to the baseline', async () => {
      const changeName = 'early-synced-removal';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## REMOVED Requirements\n\n### Requirement: The system SHALL provide a legacy layer\n**Reason**: Replaced by the core abstraction layer.\n`
      );

      // Early-sync pattern: the requirement was already removed from the main spec.
      const keptBlock = `### Requirement: The system SHALL provide a core abstraction layer\n\n#### Scenario: Layer is available\n- **WHEN** a consumer imports the layer\n- **THEN** the abstraction is available`;
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n${keptBlock}\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // Archive succeeds with a warning instead of aborting
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('REMOVED requirement "The system SHALL provide a legacy layer" is not in the current spec')
      );
      // The skipped removal is not reported as applied
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('- 1 removed'));
      // A no-op update must not churn the file with normalization differences
      const updatedContent = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updatedContent).toBe(mainSpecContent);
      // ...and must not claim an update happened
      expect(console.log).toHaveBeenCalledWith('Specs already in sync; no files changed.');
      expect(console.log).not.toHaveBeenCalledWith('Specs updated successfully.');

      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it('should archive when MODIFIED requirements were already synced to the baseline', async () => {
      const changeName = 'early-synced-modify';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'mod-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const block = `### Requirement: Session handling\nThe system SHALL keep sessions.\n\n#### Scenario: Session persists\n- **WHEN** a user returns\n- **THEN** the session is restored`;
      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Mod Layer - Changes\n\n## MODIFIED Requirements\n\n${block}\n`
      );

      // Early-sync pattern: the modification is already applied to main.
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'mod-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# mod-layer Specification\n\n## Purpose\nSession layer behavior.\n\n## Requirements\n\n${block}\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // An identical MODIFIED block is a no-op: no churned rewrite, no
      // claimed update, no "~ 1 modified" in the totals.
      const updatedContent = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updatedContent).toBe(mainSpecContent);
      expect(console.log).toHaveBeenCalledWith('Specs already in sync; no files changed.');
      expect(console.log).not.toHaveBeenCalledWith('Specs updated successfully.');

      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it('should abort an already-synced RENAMED when a case variant of the source still exists', async () => {
      // FROM missing + TO present normally means the rename was early-synced,
      // but a fold-variant of FROM still in the spec means the header is a
      // typo - the same near-miss guard REMOVED applies.
      const changeName = 'typo-rename';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'rename-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Rename Layer - Changes\n\n## RENAMED Requirements\n- FROM: \`### Requirement: cache policy\`\n- TO: \`### Requirement: Eviction policy\`\n`
      );

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'rename-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# rename-layer Specification\n\n## Purpose\nCache behavior.\n\n## Requirements\n\n### Requirement: Cache Policy\nThe system SHALL cache.\n\n#### Scenario: Cached\n- **WHEN** data repeats\n- **THEN** it is served from cache\n\n### Requirement: Eviction policy\nThe system SHALL evict.\n\n#### Scenario: Evicted\n- **WHEN** the cache is full\n- **THEN** old entries are dropped\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('RENAMED failed for header "### Requirement: cache policy" - source not found, but "### Requirement: Cache Policy" exists')
      );
      expect(process.exitCode).toBe(1);
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      const untouched = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(untouched).toBe(mainSpecContent);
    });

    it('should abort when a REMOVED header near-misses an existing requirement (case/whitespace typo)', async () => {
      // A fold-insensitive match in the current spec means the header is a
      // typo, not an early-synced removal - that case must stay a hard abort.
      const changeName = 'typo-removal';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## REMOVED Requirements\n\n### Requirement: legacy layer\n**Reason**: Replaced.\n`
      );

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n### Requirement: Legacy Layer\n\n#### Scenario: Works\n- **WHEN** it runs\n- **THEN** it works\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('REMOVED failed for header "### Requirement: legacy layer" - not found, but "### Requirement: Legacy Layer" exists')
      );
      expect(process.exitCode).toBe(1);
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      const untouched = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(untouched).toBe(mainSpecContent);
    });

    it('should surface the skipped REMOVED as a warning in --json output', async () => {
      const changeName = 'early-synced-removal-json';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## REMOVED Requirements\n\n### Requirement: The system SHALL provide a legacy layer\n**Reason**: Replaced.\n`
      );

      const keptBlock = `### Requirement: The system SHALL provide a core abstraction layer\n\n#### Scenario: Layer is available\n- **WHEN** a consumer imports the layer\n- **THEN** the abstraction is available`;
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n${keptBlock}\n`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true, json: true });

      expect(process.exitCode).toBeUndefined();
      const logCalls = (console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().map(String);
      const jsonLine = logCalls.find((entry) => entry.trimStart().startsWith('{'));
      expect(jsonLine).toBeDefined();
      const parsed = JSON.parse(jsonLine!);
      expect(parsed.archive.totals.removed).toBe(0);
      // No file was written, so the result must not claim an update
      expect(parsed.archive.specsUpdated).toBe(false);
      // The silent path must not swallow the skip: agents reading JSON get
      // the same signal humans get on stdout.
      expect(parsed.archive.warnings).toEqual([
        expect.stringContaining('REMOVED requirement "The system SHALL provide a legacy layer" is not in the current spec'),
      ]);
    });

    it('should merge nested delta specs into the same relative path (#1353)', async () => {
      const changeName = 'nested-spec-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const nestedSpecDir = path.join(changeDir, 'specs', 'platform', 'example-capability');
      await fs.mkdir(nestedSpecDir, { recursive: true });

      const specContent = `# Nested Capability - Changes

## ADDED Requirements

### Requirement: Nested capability works
The system SHALL discover capabilities stored below namespace directories.

#### Scenario: Validate nested delta
- **WHEN** the user validates the change
- **THEN** OpenSpec detects the nested capability`;
      await fs.writeFile(path.join(nestedSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // Delta merged into the same nested path under the main specs directory
      const mainSpecPath = path.join(
        tempDir,
        'openspec',
        'specs',
        'platform',
        'example-capability',
        'spec.md'
      );
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain('### Requirement: Nested capability works');
      expect(updatedContent).toContain('#### Scenario: Validate nested delta');

      // Change directory moved to archive with the nested delta preserved
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
      const archivedDelta = path.join(
        archiveDir,
        archives[0],
        'specs',
        'platform',
        'example-capability',
        'spec.md'
      );
      await expect(fs.access(archivedDelta)).resolves.toBeUndefined();
    });

    it('should allow REMOVED requirements when creating new spec file (issue #403)', async () => {
      const changeName = 'new-spec-with-removed';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'gift-card');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create delta spec with both ADDED and REMOVED requirements
      // This simulates refactoring where old fields are removed and new ones are added
      const specContent = `# Gift Card - Changes

## ADDED Requirements

### Requirement: Logo and Background Color
The system SHALL support logo and backgroundColor fields for gift cards.

#### Scenario: Display gift card with logo
- **WHEN** a gift card is displayed
- **THEN** it shows the logo and backgroundColor

## REMOVED Requirements

### Requirement: Image Field
### Requirement: Thumbnail Field`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Execute archive - should succeed with warning about REMOVED requirements
      await archiveCommand.execute(changeName, { yes: true, noValidate: true });
      
      // Verify warning was logged about REMOVED requirements being ignored
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Warning: gift-card - 2 REMOVED requirement(s) ignored for new spec (nothing to remove).')
      );

      // The ignored removals are not reported as applied
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('- 2 removed'));
      
      // Verify spec was created with only ADDED requirements
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'gift-card', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain('# gift-card Specification');
      expect(updatedContent).toContain('### Requirement: Logo and Background Color');
      expect(updatedContent).toContain('#### Scenario: Display gift card with logo');
      // REMOVED requirements should not be in the final spec
      expect(updatedContent).not.toContain('### Requirement: Image Field');
      expect(updatedContent).not.toContain('### Requirement: Thumbnail Field');
      
      // Verify change was archived successfully
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBeGreaterThan(0);
      expect(archives.some(a => a.includes(changeName))).toBe(true);
    });

    it('should carry the delta Purpose into a new main spec (issue #1413)', async () => {
      const changeName = 'new-spec-with-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'loyalty');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `## Purpose

Tracks loyalty points earned and redeemed across the storefront.

## ADDED Requirements

### Requirement: Earn Points
The system SHALL award loyalty points on each completed order.

#### Scenario: Order completes
- **WHEN** an order completes
- **THEN** points are credited to the customer
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'loyalty', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain('Tracks loyalty points earned and redeemed across the storefront.');
      expect(updatedContent).not.toContain('TBD - created by archiving change');
      expect(updatedContent).toContain('### Requirement: Earn Points');
    });

    it('should keep fenced code inside a real delta Purpose (issue #1413)', async () => {
      const changeName = 'new-spec-with-fenced-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'config-format');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `## Purpose

Normalizes config files. The canonical shape is:

\`\`\`yaml
retries: 3
\`\`\`

## ADDED Requirements

### Requirement: Normalize Config
The system SHALL normalize config files on load.

#### Scenario: Config normalized
- **WHEN** a config file is loaded
- **THEN** it is normalized to the canonical shape
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'config-format', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain('Normalizes config files. The canonical shape is:');
      // The fenced example is part of the authored Purpose - masking fenced
      // lines out of the body would silently truncate it.
      expect(updatedContent).toContain('retries: 3');
      expect(updatedContent).not.toContain('TBD - created by archiving change');
    });

    it('should keep the TBD Purpose placeholder when the delta has no Purpose (issue #1413)', async () => {
      const changeName = 'new-spec-without-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'referrals');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `## ADDED Requirements

### Requirement: Send Invite
The system SHALL send a referral invite.

#### Scenario: Invite sent
- **WHEN** a customer refers a friend
- **THEN** an invite email is sent
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'referrals', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
    });

    it('should keep the TBD placeholder when the only Purpose header is inside a code fence (issue #1413)', async () => {
      const changeName = 'new-spec-with-fenced-header';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'payouts');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `## ADDED Requirements

### Requirement: Send Payout
The system SHALL send a payout. A main spec looks like:

\`\`\`markdown
## Purpose
Illustration only - not this capability's purpose.
\`\`\`

#### Scenario: Payout sent
- **WHEN** a payout is due
- **THEN** it is sent
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'payouts', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
      expect(updatedContent).not.toContain("Illustration only - not this capability's purpose.\n## Requirements");
    });

    it('should keep the TBD placeholder when the delta Purpose section is empty (issue #1413)', async () => {
      const changeName = 'new-spec-with-empty-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'notifications');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `## Purpose

## ADDED Requirements

### Requirement: Send Notification
The system SHALL send a notification.

#### Scenario: Notification sent
- **WHEN** an event fires
- **THEN** a notification is sent
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'notifications', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
    });

    it('should fall back to the placeholder when the delta Purpose hides a requirement header (issue #1413)', async () => {
      const changeName = 'new-spec-with-stray-header-in-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'widgets');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // A delta an agent can plausibly emit. Carrying this Purpose verbatim
      // would put a requirement header outside ## Requirements and abort the
      // archive - which succeeded before the Purpose carry-over existed.
      const specContent = `## Purpose

Handles widgets.

### Requirement: Stray header

## ADDED Requirements

### Requirement: Real Requirement
The system SHALL handle widgets.

#### Scenario: Widget handled
- **WHEN** a widget arrives
- **THEN** it is handled
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'widgets', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
      expect(updatedContent).not.toContain('### Requirement: Stray header');
      expect(updatedContent).toContain('### Requirement: Real Requirement');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Warning: widgets - delta Purpose ignored (it would leave the new spec unreadable)')
      );

      // The archive still completed rather than aborting.
      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(true);
    });

    it('should fall back to the placeholder when the delta Purpose contains a heading (issue #1413)', async () => {
      const changeName = 'new-spec-with-heading-in-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'gadgets');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // An `#` heading truncates the Purpose section when the spec is read back,
      // leaving a spec whose own validator rejects it for having no Purpose.
      const specContent = `## Purpose

# Not a spec title
Some body text that is comfortably longer than the strict-mode minimum length.

## ADDED Requirements

### Requirement: Handle Gadget
The system SHALL handle gadgets.

#### Scenario: Gadget handled
- **WHEN** a gadget arrives
- **THEN** it is handled
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'gadgets', 'spec.md'),
        'utf-8'
      );
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
      expect(updatedContent).not.toContain('# Not a spec title');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('gadgets - delta Purpose ignored')
      );
      // The rebuilt spec must still satisfy the validator archive itself runs.
      const report = await new Validator().validateSpecContent('gadgets', updatedContent);
      expect(report.issues.filter(i => i.level === 'ERROR')).toHaveLength(0);
    });

    it('should fall back to the placeholder when the delta Purpose has an unterminated fence (issue #1413)', async () => {
      const changeName = 'new-spec-with-unterminated-fence';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'mesh-config');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // The open fence masks everything after it, so the Purpose body would
      // swallow the skeleton's own ## Requirements header.
      const specContent = `## ADDED Requirements

### Requirement: Normalize Mesh Config
The system SHALL normalize mesh config.

#### Scenario: Config normalized
- **WHEN** config is loaded
- **THEN** it is normalized

## Purpose

Normalizes configuration for every service in the mesh. Canonical shape:

\`\`\`yaml
retries: 3
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'mesh-config', 'spec.md'),
        'utf-8'
      );
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
      // Exactly one Requirements section, and the requirement is still visible.
      expect(updatedContent.match(/^## Requirements$/gm)).toHaveLength(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('mesh-config - delta Purpose ignored')
      );
      const report = await new Validator().validateSpecContent('mesh-config', updatedContent);
      expect(report.issues.filter(i => i.level === 'ERROR')).toHaveLength(0);
    });

    it('should ignore a commented-out Purpose in favor of the real one (issue #1413)', async () => {
      const changeName = 'new-spec-with-commented-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'loyalty-v2');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `<!--
## Purpose
Draft purpose the author commented out while rewriting the section.
-->

## Purpose

Manages the loyalty program end to end across the storefront and admin console.

## ADDED Requirements

### Requirement: Earn Points
The system SHALL award loyalty points.

#### Scenario: Points earned
- **WHEN** an order completes
- **THEN** points are credited
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'loyalty-v2', 'spec.md'),
        'utf-8'
      );
      expect(updatedContent).toContain('Manages the loyalty program end to end');
      expect(updatedContent).not.toContain('Draft purpose the author commented out');
      expect(updatedContent).not.toContain('-->');
    });

    it.each([
      [
        'a section header hidden in a comment',
        'requirements-hidden-in-comment',
        'hidden-reqs',
        `## Purpose
Tracks widgets and keeps their state consistent across restarts.
<!-- TODO(author): promote the list below to
## Requirements
so the sections line up. -->
Widgets are the core unit of work.
`,
      ],
      [
        'a requirement header hidden in a comment',
        'requirement-header-in-comment',
        'hidden-req-header',
        `## Purpose
Tracks widgets and keeps their state consistent across restarts.
<!--
## Requirements
### Requirement: Draft idea we did not ship
-->
`,
      ],
      [
        'an unterminated comment',
        'unterminated-comment',
        'dangling-comment',
        `## Purpose
Tracks widgets and keeps their state consistent across restarts.
<!-- TODO: expand once the widget team confirms the retention policy.
`,
      ],
      [
        'a comment closed with the --!> terminator',
        'bang-terminated-comment',
        'bang-comment',
        `## Purpose
Tracks widgets and keeps their state consistent across restarts.
<!-- TODO(author): promote the list below to
## Requirements
so the sections line up. --!>
`,
      ],
    ])(
      'should fall back to the placeholder when the delta Purpose has %s (issue #1413)',
      async (_label, changeName, specFolder, purposeBlock) => {
        const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', specFolder);
        await fs.mkdir(changeSpecDir, { recursive: true });

        await fs.writeFile(
          path.join(changeSpecDir, 'spec.md'),
          `${purposeBlock}
## ADDED Requirements

### Requirement: Widget Tracking
The system SHALL track widgets.

#### Scenario: Widget tracked
- **WHEN** a widget is created
- **THEN** it is tracked
`
        );

        await archiveCommand.execute(changeName, { yes: true, noValidate: true });

        const updatedContent = await fs.readFile(
          path.join(tempDir, 'openspec', 'specs', specFolder, 'spec.md'),
          'utf-8'
        );
        // Markdown hidden in a comment is skipped by the section scan but still
        // lands in the file, where it can hide the headers the parsers rely on
        // and blank the document out in a markdown renderer.
        expect(updatedContent).toContain(
          `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
        );
        expect(updatedContent).not.toContain('<!--');
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining(`${specFolder} - delta Purpose ignored`)
        );
        expect(updatedContent.match(/^## Requirements$/gm)).toHaveLength(1);
        const report = await new Validator().validateSpecContent(specFolder, updatedContent);
        expect(report.issues.filter(i => i.level === 'ERROR')).toHaveLength(0);
      }
    );

    it.each([
      ['closed', '-->'],
      ['unterminated', ''],
    ])(
      'should not read a Purpose out of a %s comment that opens above the header (issue #1413)',
      async (label, terminator) => {
        const changeName = `commented-out-purpose-${label}`;
        const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', `co-${label}`);
        await fs.mkdir(changeSpecDir, { recursive: true });

        // An unterminated comment runs to end of file, so the header below it is
        // commented out just as surely as it is inside a closed comment.
        await fs.writeFile(
          path.join(changeSpecDir, 'spec.md'),
          `<!-- Draft the author commented out

## Purpose

Old abandoned purpose text that must not become the capability's Purpose.
${terminator}

## ADDED Requirements

### Requirement: Route Events
The system SHALL route events.

#### Scenario: Event routed
- **WHEN** an event arrives
- **THEN** it is routed
`
        );

        await archiveCommand.execute(changeName, { yes: true, noValidate: true });

        const updatedContent = await fs.readFile(
          path.join(tempDir, 'openspec', 'specs', `co-${label}`, 'spec.md'),
          'utf-8'
        );
        expect(updatedContent).toContain(
          `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
        );
        expect(updatedContent).not.toContain('Old abandoned purpose text');
        const report = await new Validator().validateSpecContent(`co-${label}`, updatedContent);
        expect(report.issues.filter(i => i.level === 'ERROR')).toHaveLength(0);
      }
    );

    it('should carry a Purpose containing arrow notation (issue #1413)', async () => {
      const changeName = 'new-spec-with-arrow-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'pipeline');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // `-->` is not a comment opener; it renders as text and hides nothing, so
      // it must not be mistaken for the HTML-comment hazard.
      const specContent = `## Purpose

Routes events through the pipeline: ingest --> transform --> sink, retrying each hop.

## ADDED Requirements

### Requirement: Route Events
The system SHALL route events through the pipeline.

#### Scenario: Event routed
- **WHEN** an event arrives
- **THEN** it is routed
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'pipeline', 'spec.md'),
        'utf-8'
      );
      expect(updatedContent).toContain('ingest --> transform --> sink');
      expect(updatedContent).not.toContain('TBD - created by archiving change');
    });

    it('should keep the TBD placeholder when the delta Purpose is only a code fence (issue #1413)', async () => {
      const changeName = 'new-spec-with-fenced-only-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'fenced-only');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // A code sample is not a description of the capability, so it counts as
      // an absent Purpose rather than one worth carrying.
      const specContent = `## Purpose

\`\`\`yaml
retries: 3
\`\`\`

## ADDED Requirements

### Requirement: Retry Requests
The system SHALL retry failed requests.

#### Scenario: Request retried
- **WHEN** a request fails
- **THEN** it is retried
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'fenced-only', 'spec.md'),
        'utf-8'
      );
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
      expect(updatedContent).not.toContain('retries: 3');
    });

    it('should end the Purpose at the next heading outside a code fence (issue #1413)', async () => {
      const changeName = 'new-spec-with-fenced-heading';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'fenced-heading');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // The fenced `## Requirements` must not be mistaken for the end of the
      // Purpose section, nor for a real section once the spec is written.
      const specContent = `## Purpose

Documents the main spec shape for readers. A main spec looks like:

\`\`\`markdown
## Requirements

### Requirement: Illustrative Only
\`\`\`

## ADDED Requirements

### Requirement: Real Requirement
The system SHALL do the real thing.

#### Scenario: Real thing done
- **WHEN** asked
- **THEN** done
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'fenced-heading', 'spec.md'),
        'utf-8'
      );
      // The whole fenced sample stays inside Purpose...
      expect(updatedContent).toContain('Documents the main spec shape for readers.');
      expect(updatedContent).toContain('### Requirement: Illustrative Only');
      // ...and none of it is read as real structure.
      expect(findMainSpecStructureIssues(updatedContent)).toHaveLength(0);
      const spec = new MarkdownParser(updatedContent).parseSpec('fenced-heading');
      expect(spec.requirements).toHaveLength(1);
    });

    it('should keep the placeholder when the delta Purpose is only an HTML comment (issue #1413)', async () => {
      const changeName = 'new-spec-with-unfilled-template';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'unfilled');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // This is the shipped delta template left unfilled.
      const specContent = `## Purpose
<!-- New capabilities only: one or two sentences on what this capability is for. -->

## ADDED Requirements

### Requirement: Do Thing
The system SHALL do the thing.

#### Scenario: Thing done
- **WHEN** asked
- **THEN** done
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'unfilled', 'spec.md'),
        'utf-8'
      );
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
      expect(updatedContent).not.toContain('New capabilities only');
    });

    it('should warn when a carried Purpose is under the strict-mode minimum (issue #1413)', async () => {
      const changeName = 'new-spec-with-brief-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'points');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `## Purpose

Tracks loyalty points.

## ADDED Requirements

### Requirement: Track Points
The system SHALL track points.

#### Scenario: Points tracked
- **WHEN** an order completes
- **THEN** points are tracked
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'points', 'spec.md'),
        'utf-8'
      );
      // The author's words are kept - the warning exists so the strict-mode
      // failure is not a surprise later.
      expect(updatedContent).toContain('Tracks loyalty points.');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('carried Purpose is under 50 characters')
      );
    });

    it('should not overwrite the Purpose of an existing main spec (issue #1413)', async () => {
      const changeName = 'existing-spec-with-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'billing');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'billing');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `# billing Specification

## Purpose
The established purpose that must survive archiving.

## Requirements

### Requirement: Charge Card
The system SHALL charge the card on file.

#### Scenario: Card charged
- **WHEN** an invoice is due
- **THEN** the card is charged
`
      );

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `## Purpose

A purpose written in the delta that must be ignored for an existing spec.

## ADDED Requirements

### Requirement: Refund Card
The system SHALL refund the card on file.

#### Scenario: Refund issued
- **WHEN** a refund is approved
- **THEN** the card is refunded
`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updatedContent).toContain('The established purpose that must survive archiving.');
      expect(updatedContent).not.toContain('A purpose written in the delta that must be ignored');
      expect(updatedContent).toContain('### Requirement: Refund Card');
      // Dropping it silently would be indistinguishable from it having worked.
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('billing - delta Purpose ignored; billing already has one')
      );
    });

    it.each([
      [
        'the existing spec has no Purpose at all',
        'existing-spec-without-purpose',
        'no-purpose-yet',
        `# no-purpose-yet Specification

## Requirements

### Requirement: Old Thing
The system SHALL do the old thing.

#### Scenario: Old done
- **WHEN** asked
- **THEN** done
`,
      ],
      [
        'the existing Purpose is identical to the delta Purpose',
        'existing-spec-with-same-purpose',
        'same-purpose',
        `# same-purpose Specification

## Purpose
Shared purpose text that both files carry verbatim for this test case.

## Requirements

### Requirement: Old Thing
The system SHALL do the old thing.

#### Scenario: Old done
- **WHEN** asked
- **THEN** done
`,
      ],
    ])(
      'should not warn about an ignored delta Purpose when %s (issue #1413)',
      async (_label, changeName, specFolder, mainSpec) => {
        const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', specFolder);
        await fs.mkdir(changeSpecDir, { recursive: true });
        const mainSpecDir = path.join(tempDir, 'openspec', 'specs', specFolder);
        await fs.mkdir(mainSpecDir, { recursive: true });
        await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec);

        await fs.writeFile(
          path.join(changeSpecDir, 'spec.md'),
          `## Purpose

Shared purpose text that both files carry verbatim for this test case.

## ADDED Requirements

### Requirement: New Thing
The system SHALL do the new thing.

#### Scenario: New done
- **WHEN** asked
- **THEN** done
`
        );

        await archiveCommand.execute(changeName, { yes: true, noValidate: true });

        // "already has one" is false when it has none, and noise when the two
        // bodies match.
        expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('already has one'));
      }
    );

    it('should still error on MODIFIED when creating new spec file', async () => {
      const changeName = 'new-spec-with-modified';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'new-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create delta spec with MODIFIED requirement (should fail for new spec)
      const specContent = `# New Capability - Changes

## ADDED Requirements

### Requirement: New Feature
New feature description.

## MODIFIED Requirements

### Requirement: Existing Feature
Modified content.`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Execute archive - should abort with error message (not throw, but log and return)
      await archiveCommand.execute(changeName, { yes: true, noValidate: true });
      
      // Verify error message mentions MODIFIED not allowed for new specs
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('new-capability: target spec does not exist; only ADDED requirements are allowed for new specs. MODIFIED and RENAMED operations require an existing spec.')
      );
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');
      
      // Verify spec was NOT created
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'new-capability', 'spec.md');
      await expect(fs.access(mainSpecPath)).rejects.toThrow();
      
      // Verify change was NOT archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should still error on RENAMED when creating new spec file', async () => {
      const changeName = 'new-spec-with-renamed';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'another-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create delta spec with RENAMED requirement (should fail for new spec)
      const specContent = `# Another Capability - Changes

## ADDED Requirements

### Requirement: New Feature
New feature description.

## RENAMED Requirements
- FROM: \`### Requirement: Old Name\`
- TO: \`### Requirement: New Name\``;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Execute archive - should abort with error message (not throw, but log and return)
      await archiveCommand.execute(changeName, { yes: true, noValidate: true });
      
      // Verify error message mentions RENAMED not allowed for new specs
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('another-capability: target spec does not exist; only ADDED requirements are allowed for new specs. MODIFIED and RENAMED operations require an existing spec.')
      );
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');
      
      // Verify spec was NOT created
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'another-capability', 'spec.md');
      await expect(fs.access(mainSpecPath)).rejects.toThrow();
      
      // Verify change was NOT archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
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
      const date = formatLocalDate();
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

    it('should archive a skip_specs change with no spec files cleanly', async () => {
      const changeName = 'marked-refactor';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        'schema: spec-driven\nskip_specs: true\n'
      );

      await archiveCommand.execute(changeName, { yes: true });

      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it('should block archiving a skip_specs change that has files under specs/', async () => {
      const changeName = 'marked-with-stray-specs';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const strayDir = path.join(changeDir, 'specs', 'notes');
      await fs.mkdir(strayDir, { recursive: true });
      await fs.writeFile(path.join(strayDir, 'spec.md'), '# headerless notes\n');
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        'schema: spec-driven\nskip_specs: true\n'
      );

      await archiveCommand.execute(changeName, { yes: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('skip_specs is set in .openspec.yaml but spec files exist under specs/')
      );
      expect(process.exitCode).toBe(1);
      // Change must not have moved.
      await expect(fs.access(changeDir)).resolves.toBeUndefined();
      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should block archiving when skip_specs is set but the metadata is unhonorable', async () => {
      const changeName = 'marked-invalid-metadata';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      // skip_specs without the required schema field: validate rejects this
      // metadata, so archive must not accept the change either.
      await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'skip_specs: true\n');

      await archiveCommand.execute(changeName, { yes: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('skip_specs is set but .openspec.yaml is not valid change metadata')
      );
      expect(process.exitCode).toBe(1);
      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should block archiving when skip_specs names an unknown schema', async () => {
      const changeName = 'marked-unknown-schema';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      // Well-shaped metadata naming a schema that does not resolve: status
      // rejects this metadata, so archive must not honor the marker and
      // bypass delta validation even though specs/ is empty.
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        'schema: does-not-exist\nskip_specs: true\n'
      );

      await archiveCommand.execute(changeName, { yes: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('skip_specs is set but .openspec.yaml is not valid change metadata')
      );
      expect(process.exitCode).toBe(1);
      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should block archiving when the metadata file exists but cannot be read', async () => {
      const changeName = 'metadata-as-directory';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      // .openspec.yaml as a directory: every metadata-reading surface errors
      // and the marker state cannot be determined, so archive must fail
      // closed into validation instead of treating the change as unmarked.
      await fs.mkdir(path.join(changeDir, '.openspec.yaml'), { recursive: true });

      await archiveCommand.execute(changeName, { yes: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('skip_specs is set but .openspec.yaml is not valid change metadata')
      );
      expect(process.exitCode).toBe(1);
      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should skip spec updates when --skip-specs flag is used', async () => {
      const changeName = 'skip-specs-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create spec in change
      const specContent = '# Test Capability Spec\n\nTest content';
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Execute archive with --skip-specs flag and noValidate to skip validation
      await archiveCommand.execute(changeName, { yes: true, skipSpecs: true, noValidate: true });
      
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

    it('should skip validation when commander sets validate to false (--no-validate)', async () => {
      const changeName = 'skip-validation-flag';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'unstable-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const deltaSpec = `# Unstable Capability

## ADDED Requirements

### Requirement: Logging Feature
**ID**: REQ-LOG-001

The system will log all events.

#### Scenario: Event recorded
- **WHEN** an event occurs
- **THEN** it is captured`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaSpec);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      const deltaSpy = vi.spyOn(Validator.prototype, 'validateChangeDeltaSpecs');
      const specContentSpy = vi.spyOn(Validator.prototype, 'validateSpecContent');

      try {
        await archiveCommand.execute(changeName, { yes: true, skipSpecs: true, validate: false });

        expect(deltaSpy).not.toHaveBeenCalled();
        expect(specContentSpy).not.toHaveBeenCalled();

        const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
        const archives = await fs.readdir(archiveDir);
        expect(archives.length).toBe(1);
        expect(archives[0]).toMatch(new RegExp(`\\d{4}-\\d{2}-\\d{2}-${changeName}`));
      } finally {
        deltaSpy.mockRestore();
        specContentSpy.mockRestore();
      }
    });

    it('should proceed with archive when user declines spec updates', async () => {
      const { confirm } = await import('@inquirer/prompts');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      
      const changeName = 'decline-specs-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create valid spec in change
      const specContent = `# Test Capability Spec

## Purpose
This is a test capability specification.

## Requirements

### The system SHALL provide test capability

#### Scenario: Basic test
Given a test condition
When an action occurs
Then expected result happens`;
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

    it('should support header trim-only normalization for matching', async () => {
      const changeName = 'normalize-headers';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'alpha');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Create existing main spec with a requirement (no extra trailing spaces)
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'alpha');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainContent = `# alpha Specification

## Purpose
Alpha purpose.

## Requirements

### Requirement: Important Rule
Some details.`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainContent);

      // Change attempts to modify the same requirement but with trailing spaces after the name
      const deltaContent = `# Alpha - Changes

## MODIFIED Requirements

### Requirement: Important Rule   
Updated details.`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updated = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updated).toContain('### Requirement: Important Rule');
      expect(updated).toContain('Updated details.');
    });

    it('should apply operations in order: RENAMED → REMOVED → MODIFIED → ADDED', async () => {
      const changeName = 'apply-order';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'beta');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Main spec with two requirements A and B
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'beta');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainContent = `# beta Specification

## Purpose
Beta purpose.

## Requirements

### Requirement: A
content A

### Requirement: B
content B`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainContent);

      // Rename A->C, Remove B, Modify C, Add D
      const deltaContent = `# Beta - Changes

## RENAMED Requirements
- FROM: \`### Requirement: A\`
- TO: \`### Requirement: C\`

## REMOVED Requirements
### Requirement: B

## MODIFIED Requirements
### Requirement: C
updated C

## ADDED Requirements
### Requirement: D
content D`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updated = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updated).toContain('### Requirement: C');
      expect(updated).toContain('updated C');
      expect(updated).toContain('### Requirement: D');
      expect(updated).not.toContain('### Requirement: A');
      expect(updated).not.toContain('### Requirement: B');
    });

    it('should abort with error when MODIFIED references non-existent requirements', async () => {
      const changeName = 'validate-missing';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'gamma');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Main spec with no requirements
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'gamma');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainContent = `# gamma Specification

## Purpose
Gamma purpose.

## Requirements`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainContent);

      // Delta tries to modify a non-existent requirement
      const deltaContent = `# Gamma - Changes

## MODIFIED Requirements
### Requirement: Missing
new text`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // Should not change the main spec and should not archive the change dir
      const still = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(still).toBe(mainContent);
      // Change dir should still exist since operation aborted
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('should abort stale MODIFIED blocks that would drop current scenarios (issue #1246)', async () => {
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'stale-modified');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecPath = path.join(mainSpecDir, 'spec.md');
      const baseSpec = `# stale-modified Specification

## Purpose
Stale modified purpose.

## Requirements

### Requirement: Shared Rule
The system SHALL support the shared rule.

#### Scenario: Existing behavior
- **WHEN** the original behavior runs
- **THEN** it succeeds`;
      await fs.writeFile(mainSpecPath, baseSpec);

      const changeA = 'modify-shared-a';
      const changeADir = path.join(tempDir, 'openspec', 'changes', changeA);
      const changeASpecDir = path.join(changeADir, 'specs', 'stale-modified');
      await fs.mkdir(changeASpecDir, { recursive: true });
      await fs.writeFile(path.join(changeASpecDir, 'spec.md'), `# Stale Modified - Change A

## MODIFIED Requirements

### Requirement: Shared Rule
The system SHALL support the shared rule.

#### Scenario: Existing behavior
- **WHEN** the original behavior runs
- **THEN** it succeeds

#### Scenario: Behavior from A
- **WHEN** change A behavior runs
- **THEN** it succeeds`);

      const changeB = 'modify-shared-b';
      const changeBDir = path.join(tempDir, 'openspec', 'changes', changeB);
      const changeBSpecDir = path.join(changeBDir, 'specs', 'stale-modified');
      await fs.mkdir(changeBSpecDir, { recursive: true });
      await fs.writeFile(path.join(changeBSpecDir, 'spec.md'), `# Stale Modified - Change B

## MODIFIED Requirements

### Requirement: Shared Rule
The system SHALL support the shared rule.

#### Scenario: Existing behavior
- **WHEN** the original behavior runs
- **THEN** it succeeds

#### Scenario: Behavior from B
- **WHEN** change B behavior runs
- **THEN** it succeeds`);

      await archiveCommand.execute(changeA, { yes: true, noValidate: true });
      await archiveCommand.execute(changeB, { yes: true, noValidate: true });

      const updated = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updated).toContain('#### Scenario: Existing behavior');
      expect(updated).toContain('#### Scenario: Behavior from A');
      expect(updated).not.toContain('#### Scenario: Behavior from B');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'stale-modified MODIFIED failed for header "### Requirement: Shared Rule" - current spec contains scenario(s) not present in the modified block: "Behavior from A"'
        )
      );
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');

      await expect(fs.access(changeBDir)).resolves.not.toThrow();
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeA))).toBe(true);
      expect(archives.some(a => a.includes(changeB))).toBe(false);
    });

    it('should abort MODIFIED that drops a duplicate-named scenario (issue #1246 multiplicity)', async () => {
      // Residual blind spot after the original #1246 gate: findMissingCurrentScenarios
      // used Set membership, so two current scenarios sharing a name were both
      // considered "present" when the MODIFIED block kept only one of them.
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'dup-scenario');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecPath = path.join(mainSpecDir, 'spec.md');
      await fs.writeFile(
        mainSpecPath,
        `# dup-scenario Specification

## Purpose
Duplicate scenario names within one requirement.

## Requirements

### Requirement: Login
The system SHALL authenticate.

#### Scenario: Validate
- **WHEN** input is empty
- **THEN** reject

#### Scenario: Validate
- **WHEN** input is malformed
- **THEN** reject`
      );

      const changeName = 'drop-one-validate';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'dup-scenario');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Drop One Validate - Change

## MODIFIED Requirements

### Requirement: Login
The system SHALL authenticate.

#### Scenario: Validate
- **WHEN** input is empty
- **THEN** reject`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updated = await fs.readFile(mainSpecPath, 'utf-8');
      // Spec must be untouched — both Validate scenarios preserved
      expect((updated.match(/#### Scenario: Validate/g) || []).length).toBe(2);
      expect(updated).toContain('malformed');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'dup-scenario MODIFIED failed for header "### Requirement: Login" - current spec contains scenario(s) not present in the modified block: "Validate"'
        )
      );
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');

      await expect(fs.access(changeDir)).resolves.not.toThrow();
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should not treat a fenced scenario example in the current spec as real drift', async () => {
      // The validator ignores fenced `#### Scenario:` lines (countScenarios is
      // fence-aware); the drift check must agree, or a fenced sample in the
      // current spec aborts an archive that validate said was fine.
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'fenced-current');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecPath = path.join(mainSpecDir, 'spec.md');
      await fs.writeFile(
        mainSpecPath,
        `# fenced-current Specification

## Purpose
Fenced scenario samples in the current spec.

## Requirements

### Requirement: Reporting
The system SHALL report results using the scenario format:

\`\`\`markdown
#### Scenario: Fenced sample
- **WHEN** shown as an example
- **THEN** it is not a real scenario
\`\`\`

#### Scenario: Emit report
- **WHEN** a run finishes
- **THEN** a report is emitted`
      );

      const changeName = 'edit-fenced-current';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'fenced-current');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Edit Fenced Current - Change

## MODIFIED Requirements

### Requirement: Reporting
The system SHALL report results in JSON.

#### Scenario: Emit report
- **WHEN** a run finishes
- **THEN** a JSON report is emitted`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updated = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updated).toContain('The system SHALL report results in JSON.');
      expect(updated).toContain('a JSON report is emitted');
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('current spec contains scenario(s) not present in the modified block')
      );
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(true);
    });

    it('should abort when a MODIFIED block only keeps a dropped scenario inside a fence', async () => {
      // The inverse hole: a fenced `#### Scenario: Audit` in the incoming block
      // must not count as keeping the real Audit scenario the block dropped.
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'fenced-incoming');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecPath = path.join(mainSpecDir, 'spec.md');
      await fs.writeFile(
        mainSpecPath,
        `# fenced-incoming Specification

## Purpose
Fenced scenario names in the incoming block.

## Requirements

### Requirement: Access log
The system SHALL log access.

#### Scenario: Audit
- **WHEN** a user signs in
- **THEN** an audit row is written`
      );

      const changeName = 'drop-audit-behind-fence';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'fenced-incoming');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Drop Audit Behind Fence - Change

## MODIFIED Requirements

### Requirement: Access log
The system SHALL log access, for example:

\`\`\`markdown
#### Scenario: Audit
- **WHEN** shown as an example
- **THEN** it is not a real scenario
\`\`\`

#### Scenario: Trace
- **WHEN** a request is served
- **THEN** a trace row is written`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updated = await fs.readFile(mainSpecPath, 'utf-8');
      // Spec must be untouched — the real Audit scenario preserved.
      expect(updated).toContain('an audit row is written');
      expect(updated).not.toContain('Trace');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'fenced-incoming MODIFIED failed for header "### Requirement: Access log" - current spec contains scenario(s) not present in the modified block: "Audit"'
        )
      );
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should abort with a structural error when target spec hides requirements outside ## Requirements', async () => {
      const changeName = 'hidden-requirement-target';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'delta-target');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'delta-target');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const malformedMain = `# delta-target Specification

## Purpose
Delta target purpose.

## Requirements

### Requirement: A
The system SHALL do A.

#### Scenario: A works
- **WHEN** foo
- **THEN** bar

## Edge Cases

### Requirement: B
The system SHALL do B.

#### Scenario: B works
- **WHEN** baz
- **THEN** qux`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), malformedMain);

      const deltaContent = `# Delta Target Changes

## MODIFIED Requirements

### Requirement: B
The system SHALL do B differently.

#### Scenario: B changes
- **WHEN** baz changes
- **THEN** qux changes`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('delta-target: target spec is structurally invalid and cannot be updated until fixed:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Requirement header "### Requirement: B" appears outside the main ## Requirements section.')
      );
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');

      const still = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(still).toBe(malformedMain);

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should require MODIFIED to reference the NEW header when a rename exists (error format)', async () => {
      const changeName = 'rename-modify-new-header';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'delta');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Main spec with Old
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'delta');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainContent = `# delta Specification

## Purpose
Delta purpose.

## Requirements

### Requirement: Old
old body`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainContent);

      // Delta: rename Old->New, but MODIFIED references Old (should abort)
      const badDelta = `# Delta - Changes

## RENAMED Requirements
- FROM: \`### Requirement: Old\`
- TO: \`### Requirement: New\`

## MODIFIED Requirements
### Requirement: Old
new body`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), badDelta);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });
      const unchanged = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(unchanged).toBe(mainContent);
      // Assert error message format and abort notice
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('delta validation failed')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Aborted. No files were changed.')
      );

      // Fix MODIFIED to reference New (should succeed)
      const goodDelta = `# Delta - Changes

## RENAMED Requirements
- FROM: \`### Requirement: Old\`
- TO: \`### Requirement: New\`

## MODIFIED Requirements
### Requirement: New
new body`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), goodDelta);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });
      const updated = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updated).toContain('### Requirement: New');
      expect(updated).toContain('new body');
      expect(updated).not.toContain('### Requirement: Old');
    });

    it('should process multiple specs atomically (any failure aborts all)', async () => {
      const changeName = 'multi-spec-atomic';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const spec1Dir = path.join(changeDir, 'specs', 'epsilon');
      const spec2Dir = path.join(changeDir, 'specs', 'zeta');
      await fs.mkdir(spec1Dir, { recursive: true });
      await fs.mkdir(spec2Dir, { recursive: true });

      // Existing main specs
      const epsilonMain = path.join(tempDir, 'openspec', 'specs', 'epsilon', 'spec.md');
      await fs.mkdir(path.dirname(epsilonMain), { recursive: true });
      await fs.writeFile(epsilonMain, `# epsilon Specification

## Purpose
Epsilon purpose.

## Requirements

### Requirement: E1
e1`);

      const zetaMain = path.join(tempDir, 'openspec', 'specs', 'zeta', 'spec.md');
      await fs.mkdir(path.dirname(zetaMain), { recursive: true });
      await fs.writeFile(zetaMain, `# zeta Specification

## Purpose
Zeta purpose.

## Requirements

### Requirement: Z1
z1`);

      // Delta: epsilon is valid modification; zeta tries to modify non-existent -> should abort both
      await fs.writeFile(path.join(spec1Dir, 'spec.md'), `# Epsilon - Changes

## MODIFIED Requirements
### Requirement: E1
E1 updated`);

      await fs.writeFile(path.join(spec2Dir, 'spec.md'), `# Zeta - Changes

## MODIFIED Requirements
### Requirement: Missing
missing body`);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const e1 = await fs.readFile(epsilonMain, 'utf-8');
      const z1 = await fs.readFile(zetaMain, 'utf-8');
      expect(e1).toContain('### Requirement: E1');
      expect(e1).not.toContain('E1 updated');
      expect(z1).toContain('### Requirement: Z1');
      // changeDir should still exist
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('should display aggregated totals across multiple specs', async () => {
      const changeName = 'multi-spec-totals';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const spec1Dir = path.join(changeDir, 'specs', 'omega');
      const spec2Dir = path.join(changeDir, 'specs', 'psi');
      await fs.mkdir(spec1Dir, { recursive: true });
      await fs.mkdir(spec2Dir, { recursive: true });

      // Existing main specs
      const omegaMain = path.join(tempDir, 'openspec', 'specs', 'omega', 'spec.md');
      await fs.mkdir(path.dirname(omegaMain), { recursive: true });
      await fs.writeFile(omegaMain, `# omega Specification\n\n## Purpose\nOmega purpose.\n\n## Requirements\n\n### Requirement: O1\no1`);

      const psiMain = path.join(tempDir, 'openspec', 'specs', 'psi', 'spec.md');
      await fs.mkdir(path.dirname(psiMain), { recursive: true });
      await fs.writeFile(psiMain, `# psi Specification\n\n## Purpose\nPsi purpose.\n\n## Requirements\n\n### Requirement: P1\np1`);

      // Deltas: omega add one, psi rename and modify -> totals: +1, ~1, -0, →1
      await fs.writeFile(path.join(spec1Dir, 'spec.md'), `# Omega - Changes\n\n## ADDED Requirements\n\n### Requirement: O2\nnew`);
      await fs.writeFile(path.join(spec2Dir, 'spec.md'), `# Psi - Changes\n\n## RENAMED Requirements\n- FROM: \`### Requirement: P1\`\n- TO: \`### Requirement: P2\`\n\n## MODIFIED Requirements\n### Requirement: P2\nupdated`);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // Verify aggregated totals line was printed
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Totals: + 1, ~ 1, - 0, → 1')
      );
    });
  });

  describe('exit code on blocked archive (human mode)', () => {
    // Regression for the silent-exit-0 bug: when archive is blocked in
    // human mode it must set a non-zero exit code so scripts/CI can detect
    // the failure, mirroring the JSON-mode behavior.
    it('runs delta spec validation for lowercase delta headers (parity with validate)', async () => {
      const changeName = 'exit-lowercase-delta';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'lower-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Lowercase section header: the parser reads it case-insensitively, so
      // the archive gate must route it into delta validation the same way
      // validate does instead of falling through to the rebuilt-spec check.
      const specContent = `# Lower Capability - Changes

## added requirements

### Requirement: Logging Feature
The system SHALL log all events.`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('must include at least one scenario')
      );
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('sets exit code 1 when delta spec validation fails', async () => {
      const changeName = 'exit-delta-fail';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'bad-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Delta spec missing required SHALL/MUST keyword -> validation error
      const specContent = `# Bad Capability - Changes

## ADDED Requirements

### Requirement: Logging Feature

The system will log all events.

#### Scenario: Event recorded
- **WHEN** an event occurs
- **THEN** it is captured`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true, skipSpecs: true });

      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed')
      );

      // Change must NOT have been archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('sets exit code 1 when the only delta spec sits at the specs/ root (#1385)', async () => {
      const changeName = 'exit-root-delta';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecsDir = path.join(changeDir, 'specs');
      await fs.mkdir(changeSpecsDir, { recursive: true });

      // No capability folder: the merge path skips this file, so archiving it
      // used to succeed while dropping the requirement.
      const specContent = `## ADDED Requirements

### Requirement: Request metrics
The system SHALL record request metrics.

#### Scenario: Request is counted
- **WHEN** a request completes
- **THEN** a counter is incremented`;
      await fs.writeFile(path.join(changeSpecsDir, 'spec.md'), specContent);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed')
      );

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('sets exit code 1 for a root-level specs/spec.md without delta headers (#1385)', async () => {
      const changeName = 'exit-root-plain';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecsDir = path.join(changeDir, 'specs');
      await fs.mkdir(changeSpecsDir, { recursive: true });

      // Main-spec shape rather than delta shape: still never merged, so the
      // gate must trip on the file existing, not on its headers.
      const specContent = `# Metrics

## Purpose
Metrics for requests.

## Requirements

### Requirement: Request metrics
The system SHALL record request metrics.

#### Scenario: Request is counted
- **WHEN** a request completes
- **THEN** a counter is incremented`;
      await fs.writeFile(path.join(changeSpecsDir, 'spec.md'), specContent);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('sets exit code 1 when spec rebuild fails (MODIFIED on new spec)', async () => {
      const changeName = 'exit-rebuild-fail';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'new-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // MODIFIED on a non-existent target spec aborts the rebuild
      const specContent = `# New Capability - Changes

## ADDED Requirements

### Requirement: New Feature
New feature description.

## MODIFIED Requirements

### Requirement: Existing Feature
Modified content.`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'new-capability', 'spec.md');
      await expect(fs.access(mainSpecPath)).rejects.toThrow();

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('sets exit code 1 when rebuilt spec fails validateSpecContent', async () => {
      // Spot 3 is defensive: spot 1 (validateChangeDeltaSpecs) already
      // enforces SHALL/MUST/scenario rules on the delta, and buildUpdatedSpec
      // pre-validates target structure, so a real delta almost never reaches
      // this branch. Spy on validateSpecContent (the existing --no-validate
      // test uses the same spy pattern) to force the rebuilt spec invalid
      // while buildUpdatedSpec runs for real — exercising the exit-code fix.
      const changeName = 'exit-rebuilt-validate-fail';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'rebuilt-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Existing main spec so MODIFIED targets a real spec and buildUpdatedSpec
      // succeeds (does not throw).
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'rebuilt-capability');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainContent = `# rebuilt-capability Specification

## Purpose
Rebuilt capability purpose.

## Requirements

### Requirement: Existing Feature
The system SHALL do the thing.

#### Scenario: works
- **WHEN** x
- **THEN** y`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainContent);

      // Valid MODIFIED delta (passes spot 1 delta validation).
      const deltaContent = `# Rebuilt Capability - Changes

## MODIFIED Requirements

### Requirement: Existing Feature
The system SHALL do the thing differently.

#### Scenario: works
- **WHEN** x
- **THEN** z`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaContent);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      const specContentSpy = vi
        .spyOn(Validator.prototype, 'validateSpecContent')
        .mockResolvedValue({
          valid: false,
          issues: [
            { level: 'ERROR', path: 'requirements[0]', message: 'mocked rebuilt-spec failure' },
          ],
          summary: { errors: 1, warnings: 0, info: 0 },
        });

      try {
        await archiveCommand.execute(changeName, { yes: true });

        expect(process.exitCode).toBe(1);
        // buildUpdatedSpec ran for real and the spy made its output "invalid"
        expect(specContentSpy).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Validation errors in rebuilt spec for rebuilt-capability')
        );
        expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');

        // Main spec must be unchanged (no writes happened)
        const still = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
        expect(still).toBe(mainContent);

        // Change must NOT have been archived
        const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
        const archives = await fs.readdir(archiveDir);
        expect(archives.some(a => a.includes(changeName))).toBe(false);
      } finally {
        specContentSpy.mockRestore();
      }
    });

    it('leaves exit code 0 on successful archive (no leak from prior test)', async () => {
      const changeName = 'exit-ok';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBeUndefined();

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should report no active changes when openspec directory does not exist', async () => {
      // Remove openspec directory
      await fs.rm(path.join(tempDir, 'openspec'), { recursive: true });
      
      await expect(
        archiveCommand.execute('any-change', { yes: true })
      ).rejects.toThrow("Change 'any-change' not found. No active changes exist in this root.");
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
      
      // Verify select was called with correct options (values matter, names may include progress)
      expect(mockSelect).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Select a change to archive',
        choices: expect.arrayContaining([
          expect.objectContaining({ value: change1 }),
          expect.objectContaining({ value: change2 })
        ])
      }));
      
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
      
      // Mock confirm to return false (cancel) for validation skip
      mockConfirm.mockResolvedValueOnce(false);
      // Mock another false for task warning
      mockConfirm.mockResolvedValueOnce(false);
      
      // Execute without --yes flag but skip validation to test task warning
      await archiveCommand.execute(changeName, { noValidate: true });
      
      // Verify archive was cancelled
      expect(console.log).toHaveBeenCalledWith('Archive cancelled.');
      
      // Verify change was not archived
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });
  });

  // A delta whose REMOVED entries cover every requirement rebuilds the main
  // spec empty, and an empty spec can never validate. Every such archive used
  // to abort with "Spec must have at least one requirement", leaving no way to
  // retire a capability (#1302).
  describe('capability retirement (#1302)', () => {
    const REQUIREMENT = [
      '### Requirement: The system SHALL provide a legacy layer',
      'The system SHALL provide a legacy layer to existing consumers.',
      '',
      '#### Scenario: Layer is available',
      '- **WHEN** a consumer imports the layer',
      '- **THEN** the legacy layer is available',
    ].join('\n');

    const PURPOSE =
      'Holds the behavior contract for the legacy layer that consumers still depend on today.';

    function mainSpec(name: string, requirements = REQUIREMENT): string {
      return `# ${name} Specification\n\n## Purpose\n${PURPOSE}\n\n## Requirements\n\n${requirements}\n`;
    }

    const REMOVE_ALL = [
      '# Legacy Layer - Changes',
      '',
      '## REMOVED Requirements',
      '',
      '### Requirement: The system SHALL provide a legacy layer',
      '**Reason**: The capability is retired.',
      '**Migration**: None; consumers already moved off it.',
      '',
    ].join('\n');

    /** The last thing printed, which in JSON mode is the one payload. */
    function lastJsonPayload(): string {
      const calls = (console.log as unknown as ReturnType<typeof vi.fn>).mock.calls;
      return String(calls[calls.length - 1][0]);
    }

    async function createChange(
      changeName: string,
      capability: string,
      deltaSpec: string
    ): Promise<string> {
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(path.join(changeDir, 'specs', ...capability.split('/')), {
        recursive: true,
      });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.writeFile(
        path.join(changeDir, 'specs', ...capability.split('/'), 'spec.md'),
        deltaSpec
      );
      return changeDir;
    }

    it('retires the capability when a delta removes its last requirement', async () => {
      const changeName = 'retire-legacy-layer';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true });

      // The spec and the directory it was alone in are gone from the live tree...
      await expect(fs.access(mainSpecDir)).rejects.toThrow();
      // ...but the specs root itself is never pruned.
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'specs'))
      ).resolves.not.toThrow();
      // Nothing was deleted: the spec rode into the archive with its change,
      // byte for byte, so recovering the capability is a `git mv` back.
      const retired = path.join(
        tempDir,
        'openspec',
        'changes',
        'archive',
        `${formatLocalDate()}-${changeName}`,
        'retired-specs',
        'legacy-layer',
        'spec.md'
      );
      await expect(fs.readFile(retired, 'utf-8')).resolves.toBe(mainSpec('legacy-layer'));
      // The archive completed rather than aborting.
      expect(process.exitCode).not.toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Retiring openspec/specs/legacy-layer/spec.md')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          `Moved to openspec/changes/archive/${formatLocalDate()}-${changeName}/retired-specs/legacy-layer/spec.md`
        )
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Totals: + 0, ~ 0, - 1, → 0')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Specs updated successfully.')
      );
      await expect(fs.access(path.join(tempDir, 'openspec', 'changes', changeName))).rejects.toThrow();
    });

    it('prunes empty parent directories in a nested layout but keeps siblings', async () => {
      const changeName = 'retire-nested';
      await createChange(changeName, 'platform/legacy-layer', REMOVE_ALL);
      const nestedDir = path.join(tempDir, 'openspec', 'specs', 'platform', 'legacy-layer');
      const siblingDir = path.join(tempDir, 'openspec', 'specs', 'platform', 'kept');
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.mkdir(siblingDir, { recursive: true });
      await fs.writeFile(path.join(nestedDir, 'spec.md'), mainSpec('legacy-layer'));
      await fs.writeFile(path.join(siblingDir, 'spec.md'), mainSpec('kept'));

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(nestedDir)).rejects.toThrow();
      // The sibling keeps the shared parent alive.
      await expect(fs.access(path.join(siblingDir, 'spec.md'))).resolves.not.toThrow();
    });

    it('leaves a capability directory that still holds other files', async () => {
      const changeName = 'retire-with-notes';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));
      await fs.writeFile(path.join(mainSpecDir, 'NOTES.md'), 'Kept by hand.\n');

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).rejects.toThrow();
      await expect(fs.readFile(path.join(mainSpecDir, 'NOTES.md'), 'utf-8')).resolves.toBe(
        'Kept by hand.\n'
      );
    });

    it('archives a REMOVED-only delta whose main spec was already deleted', async () => {
      // The issue's second dead end: pre-deleting the spec made the delta look
      // like a create, which landed on an empty spec and failed the same way.
      const changeName = 'retire-already-gone';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).not.toBe(1);
      // Nothing was recreated.
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'specs', 'legacy-layer'))
      ).rejects.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).rejects.toThrow();
    });

    // The requirement-block count and the validator do NOT agree on what a
    // requirement is: MarkdownParser accepts any `###` heading under
    // `## Requirements`, while the delta block parser only indexes canonical
    // `### Requirement:` headers and sweeps the rest into the preamble - which
    // survives into the rebuilt spec. Retiring on the block count alone deleted
    // specs that validate cleanly, so the validator is the only oracle.
    it('does not retire a spec that still validates without any requirement blocks', async () => {
      const changeName = 'retire-preamble-heading';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const preambleRequirement = [
        '### Notes on scope',
        'The system SHALL treat the notes below as normative for the legacy layer.',
        '',
        '#### Scenario: Notes apply',
        '- **WHEN** a reader consults the notes',
        '- **THEN** the notes apply',
      ].join('\n');
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        mainSpec('legacy-layer', `${preambleRequirement}\n\n${REQUIREMENT}`)
      );

      await archiveCommand.execute(changeName, { yes: true });

      const updated = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updated).toContain('### Notes on scope');
      expect(process.exitCode).not.toBe(1);
      // The rebuilt spec is still a valid spec, so it is written, not deleted.
      const report = await new Validator().validateSpecContent('legacy-layer', updated);
      expect(report.valid).toBe(true);
    });

    it('aborts, exactly as before, when the removal was already synced', async () => {
      // Nothing was removed this run, so this is not a retirement: the spec is
      // already requirement-less and stays the author's to fix. Deleting on a
      // no-op delta would destroy a file the change never touched, and archiving
      // anyway would leave a main spec that `validate` rejects.
      const changeName = 'retire-noop';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const emptied = `# legacy-layer Specification\n\n## Purpose\n${PURPOSE}\n\n## Requirements\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), emptied);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(emptied);
      // The change is still there to fix and retry.
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).resolves.not.toThrow();
    });

    it('aborts instead of retiring when the emptied spec is also broken another way', async () => {
      // "No requirements" is the only error retirement replaces. A spec that is
      // additionally malformed is the author's to fix, so archive must abort as
      // it always did rather than delete the evidence.
      const changeName = 'retire-also-broken';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      // No `## Purpose` section at all: the rebuilt spec fails on that too.
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `# legacy-layer Specification\n\n## Requirements\n\n${REQUIREMENT}\n`
      );

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).resolves.not.toThrow();
    });

    it('still writes the spec when requirements remain after the removal', async () => {
      const changeName = 'partial-removal';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const kept = [
        '### Requirement: The system SHALL provide a core layer',
        'The system SHALL provide a core layer to every consumer.',
        '',
        '#### Scenario: Core is available',
        '- **WHEN** a consumer imports the core',
        '- **THEN** the core layer is available',
      ].join('\n');
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        mainSpec('legacy-layer', `${REQUIREMENT}\n\n${kept}`)
      );

      await archiveCommand.execute(changeName, { yes: true });

      const updated = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updated).toContain('core layer');
      expect(updated).not.toContain('legacy layer is available');
    });

    it('keeps a nested capability alive under a retiring parent', async () => {
      const changeName = 'retire-parent-of-nested';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      const nestedDir = path.join(mainSpecDir, 'sub');
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));
      await fs.writeFile(path.join(nestedDir, 'spec.md'), mainSpec('sub'));

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).rejects.toThrow();
      await expect(fs.access(path.join(nestedDir, 'spec.md'))).resolves.not.toThrow();
    });

    // path.resolve collapses `..` but does NOT resolve symlinks, and readdir and
    // rmdir both follow them. A string-prefix bound therefore let the prune walk
    // delete directories anywhere on disk through a symlinked capability path.
    it.skipIf(process.platform === 'win32')(
      'never prunes directories outside the real specs root through a symlink',
      async () => {
        const changeName = 'retire-through-symlink';
        await createChange(changeName, 'platform/legacy-layer', REMOVE_ALL);
        const outside = path.join(tempDir, 'outside', 'platform');
        const linkedCapability = path.join(outside, 'legacy-layer');
        await fs.mkdir(linkedCapability, { recursive: true });
        await fs.writeFile(path.join(linkedCapability, 'spec.md'), mainSpec('legacy-layer'));
        await fs.symlink(outside, path.join(tempDir, 'openspec', 'specs', 'platform'), 'dir');

        await archiveCommand.execute(changeName, { yes: true });

        // The spec file itself goes, exactly where a write would have landed...
        await expect(fs.access(path.join(linkedCapability, 'spec.md'))).rejects.toThrow();
        // ...but no directory outside the real specs root is removed.
        await expect(fs.access(linkedCapability)).resolves.not.toThrow();
        await expect(fs.access(outside)).resolves.not.toThrow();
      }
    );

    it('does not delete anything until every spec write has succeeded', async () => {
      // Retirement is the only irreversible step, and the write loop is not
      // transactional, so a sibling that fails validation must leave the
      // retiring spec on disk and the change unarchived.
      const changeName = 'retire-with-failing-sibling';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const badDeltaDir = path.join(changeDir, 'specs', 'other-layer');
      await fs.mkdir(badDeltaDir, { recursive: true });
      await fs.writeFile(
        path.join(badDeltaDir, 'spec.md'),
        // A requirement with no scenario: rebuilds fine, fails spec validation.
        '# Other Layer - Changes\n\n## ADDED Requirements\n\n### Requirement: The system SHALL do a new thing\nThe system SHALL do a new thing.\n'
      );
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).resolves.not.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).resolves.not.toThrow();
    });

    it('applies a retirement and an ordinary update in the same archive', async () => {
      const changeName = 'retire-and-add';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const addDeltaDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(addDeltaDir, { recursive: true });
      await fs.writeFile(
        path.join(addDeltaDir, 'spec.md'),
        [
          '# Core Layer - Changes',
          '',
          '## ADDED Requirements',
          '',
          '### Requirement: The system SHALL provide a core layer',
          'The system SHALL provide a core layer to every consumer.',
          '',
          '#### Scenario: Core is available',
          '- **WHEN** a consumer imports the core',
          '- **THEN** the core layer is available',
          '',
        ].join('\n')
      );
      const legacyDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(legacyDir)).rejects.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'specs', 'core-layer', 'spec.md'))
      ).resolves.not.toThrow();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Totals: + 1, ~ 0, - 1, → 0')
      );
    });

    it('counts a rename applied on the way to the removal', async () => {
      const changeName = 'retire-after-rename';
      await createChange(
        changeName,
        'legacy-layer',
        [
          '# Legacy Layer - Changes',
          '',
          '## RENAMED Requirements',
          '',
          '- FROM: `### Requirement: The system SHALL serve old clients`',
          '- TO: `### Requirement: The system SHALL provide a legacy layer`',
          '',
          '## REMOVED Requirements',
          '',
          '### Requirement: The system SHALL provide a legacy layer',
          '**Reason**: The capability is retired.',
          '**Migration**: None.',
          '',
        ].join('\n')
      );
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        mainSpec(
          'legacy-layer',
          [
            '### Requirement: The system SHALL serve old clients',
            'The system SHALL serve old clients over the v1 endpoint.',
            '',
            '#### Scenario: Old client calls v1',
            '- **WHEN** an old client calls v1',
            '- **THEN** the response is served',
          ].join('\n')
        )
      );

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(mainSpecDir)).rejects.toThrow();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Totals: + 0, ~ 0, - 1, → 1')
      );
    });

    it('names the sections that moved with a retired spec', async () => {
      const changeName = 'retire-with-sections';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `${mainSpec('legacy-layer')}\n## Why These Decisions\nThe v1 endpoint predates the routing layer.\n`
      );

      await archiveCommand.execute(changeName, { yes: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('The retired spec also held section(s): Why These Decisions')
      );
      // Those sections are not lost - they moved with the file.
      const retired = await fs.readFile(
        path.join(
          tempDir,
          'openspec',
          'changes',
          'archive',
          `${formatLocalDate()}-${changeName}`,
          'retired-specs',
          'legacy-layer',
          'spec.md'
        ),
        'utf-8'
      );
      expect(retired).toContain('## Why These Decisions');
      expect(retired).toContain(PURPOSE);
    });

    it('moves nothing when the user declines the spec update', async () => {
      const { confirm } = await import('@inquirer/prompts');
      vi.mocked(confirm).mockResolvedValue(false);
      const changeName = 'retire-declined';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const original = mainSpec('legacy-layer');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), original);

      await archiveCommand.execute(changeName, {});

      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(original);
    });

    it('reports nothing to retire when the spec vanished before the write', async () => {
      // Guards the `if (retired)` branch: a racing deletion must not be counted
      // as a retirement this run.
      const update = {
        id: 'legacy-layer',
        source: path.join(tempDir, 'nope', 'spec.md'),
        target: path.join(tempDir, 'openspec', 'specs', 'gone', 'spec.md'),
        exists: false,
      };

      await expect(
        retireSpec(
          update,
          path.join(tempDir, 'openspec', 'specs'),
          path.join(tempDir, 'retired')
        )
      ).resolves.toEqual({ retired: false });
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Retiring'));
    });

    it.skipIf(process.platform === 'win32')(
      'leaves no empty staging directory behind when the move fails',
      async () => {
        // The staging directories are created before the move, so a failure
        // used to leave an empty `retired-specs/<capability>/` that rides into
        // the archive claiming a retirement that never happened. A dangling
        // symlink is the reproducible failure: lstat sees a file, the copy
        // follows the link and finds nothing.
        const capability = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        await fs.mkdir(capability, { recursive: true });
        await fs.symlink(
          path.join(tempDir, 'no-such-target.md'),
          path.join(capability, 'spec.md')
        );
        const staging = path.join(tempDir, 'change', 'retired-specs');

        await expect(
          retireSpec(
            {
              id: 'legacy-layer',
              source: 'x',
              target: path.join(capability, 'spec.md'),
              exists: true,
            },
            path.join(tempDir, 'openspec', 'specs'),
            staging,
            { silent: true }
          )
        ).resolves.toEqual({ retired: false });

        // Nothing staged, and no husk of a directory left claiming otherwise.
        await expect(fs.access(staging)).rejects.toThrow();
        // The dangling link is still the author's to clean up.
        await expect(fs.lstat(path.join(capability, 'spec.md'))).resolves.toBeTruthy();
      }
    );

    it.skipIf(process.platform === 'win32')(
      'keeps a sibling capability staged by the same run when a later move fails',
      async () => {
        // The cleanup walks up only through EMPTY directories, so it must stop
        // at a `retired-specs/` that already holds a retirement from this run
        // rather than taking the whole folder with it.
        const staging = path.join(tempDir, 'change', 'retired-specs');
        await fs.mkdir(path.join(staging, 'already-staged'), { recursive: true });
        await fs.writeFile(
          path.join(staging, 'already-staged', 'spec.md'),
          mainSpec('already-staged')
        );
        const capability = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        await fs.mkdir(capability, { recursive: true });
        // Dangling: lstat sees a file, so staging happens, then the copy fails.
        await fs.symlink(
          path.join(tempDir, 'no-such-target.md'),
          path.join(capability, 'spec.md')
        );

        await expect(
          retireSpec(
            {
              id: 'legacy-layer',
              source: 'x',
              target: path.join(capability, 'spec.md'),
              exists: true,
            },
            path.join(tempDir, 'openspec', 'specs'),
            staging,
            { silent: true }
          )
        ).resolves.toEqual({ retired: false });

        // The failed capability's husk is gone...
        await expect(fs.access(path.join(staging, 'legacy-layer'))).rejects.toThrow();
        // ...and the sibling that really was staged survives untouched.
        await expect(
          fs.readFile(path.join(staging, 'already-staged', 'spec.md'), 'utf-8')
        ).resolves.toBe(mainSpec('already-staged'));
      }
    );

    it('refuses to overwrite a spec an earlier aborted run already staged', async () => {
      // The staged copy is the only copy once the live one is moved, so
      // clobbering it would destroy the thing this whole path preserves.
      const capability = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(capability, { recursive: true });
      await fs.writeFile(path.join(capability, 'spec.md'), mainSpec('legacy-layer'));
      const staging = path.join(tempDir, 'retired');
      await fs.mkdir(path.join(staging, 'legacy-layer'), { recursive: true });
      await fs.writeFile(
        path.join(staging, 'legacy-layer', 'spec.md'),
        'staged by an earlier run\n'
      );

      await expect(
        retireSpec(
          {
            id: 'legacy-layer',
            source: 'x',
            target: path.join(capability, 'spec.md'),
            exists: true,
          },
          path.join(tempDir, 'openspec', 'specs'),
          staging,
          { silent: true }
        )
      ).rejects.toThrow(/already exists/);

      // Both copies survive.
      await expect(
        fs.readFile(path.join(staging, 'legacy-layer', 'spec.md'), 'utf-8')
      ).resolves.toBe('staged by an earlier run\n');
      await expect(fs.access(path.join(capability, 'spec.md'))).resolves.not.toThrow();
    });

    // The archive destination is settled from the change name alone, so a
    // collision is knowable before anything is touched. Discovering it after the
    // merge moved a spec out for an archive that then never happened.
    it('checks the archive destination before moving anything', async () => {
      const changeName = 'retire-colliding';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));
      await fs.mkdir(
        path.join(tempDir, 'openspec', 'changes', 'archive', `${formatLocalDate()}-${changeName}`),
        { recursive: true }
      );

      await expect(archiveCommand.execute(changeName, { yes: true })).rejects.toThrow(
        /already exists/
      );

      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).resolves.not.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).resolves.not.toThrow();
    });

    it('keeps the retiring spec on disk when a later spec write fails', async () => {
      // The validation pass runs before both loops, so only a failing WRITE
      // proves deletions really are deferred to the end.
      const changeName = 'retire-with-failing-write';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      // `zz-` keeps the retirement first in the prepared order, so an
      // undeferred deletion would land before the failing write.
      const otherDelta = path.join(changeDir, 'specs', 'zz-other-layer');
      await fs.mkdir(otherDelta, { recursive: true });
      await fs.writeFile(
        path.join(otherDelta, 'spec.md'),
        [
          '# Other - Changes',
          '',
          '## ADDED Requirements',
          '',
          '### Requirement: The system SHALL do a new thing',
          'The system SHALL do a new thing.',
          '',
          '#### Scenario: It happens',
          '- **WHEN** invoked',
          '- **THEN** it happens',
          '',
        ].join('\n')
      );
      const legacyDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'spec.md'), mainSpec('legacy-layer'));
      // Make the second spec's write throw, by putting a directory where its
      // file belongs. Read-only permissions would be a no-op on Windows; this
      // fails the write on every platform.
      await fs.mkdir(path.join(tempDir, 'openspec', 'specs', 'zz-other-layer', 'spec.md'), {
        recursive: true,
      });

      await archiveCommand.execute(changeName, { yes: true }).catch(() => undefined);

      await expect(fs.access(path.join(legacyDir, 'spec.md'))).resolves.not.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).resolves.not.toThrow();
    });

    it('prunes a whole chain of emptied parents, not just one level', async () => {
      const changeName = 'retire-deep';
      await createChange(changeName, 'a/b/legacy-layer', REMOVE_ALL);
      const deep = path.join(tempDir, 'openspec', 'specs', 'a', 'b', 'legacy-layer');
      await fs.mkdir(deep, { recursive: true });
      await fs.writeFile(path.join(deep, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(path.join(tempDir, 'openspec', 'specs', 'a'))).rejects.toThrow();
      await expect(fs.access(path.join(tempDir, 'openspec', 'specs'))).resolves.not.toThrow();
    });

    it('never prunes a sibling directory that merely shares the specs-root prefix', async () => {
      const specsRoot = path.join(tempDir, 'openspec', 'specs');
      const sibling = path.join(tempDir, 'openspec', 'specs-extra', 'legacy-layer');
      await fs.mkdir(sibling, { recursive: true });
      await fs.writeFile(path.join(sibling, 'spec.md'), mainSpec('legacy-layer'));

      await expect(
        retireSpec(
          { id: 'legacy-layer', source: 'x', target: path.join(sibling, 'spec.md'), exists: true },
          specsRoot,
          path.join(tempDir, 'retired'),
          { silent: true }
        )
      ).resolves.toMatchObject({ retired: true });

      await expect(fs.access(sibling)).resolves.not.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'specs-extra'))
      ).resolves.not.toThrow();
    });

    it.skipIf(process.platform === 'win32')(
      'prunes even when the specs root is itself named through a symlink',
      async () => {
        const realRoot = path.join(tempDir, 'openspec', 'specs');
        const linkedRoot = path.join(tempDir, 'specs-link');
        await fs.symlink(realRoot, linkedRoot, 'dir');
        const capability = path.join(realRoot, 'legacy-layer');
        await fs.mkdir(capability, { recursive: true });
        await fs.writeFile(path.join(capability, 'spec.md'), mainSpec('legacy-layer'));

        await retireSpec(
          {
            id: 'legacy-layer',
            source: 'x',
            target: path.join(capability, 'spec.md'),
            exists: true,
          },
          linkedRoot,
          path.join(tempDir, 'retired'),
          { silent: true }
        );

        await expect(fs.access(capability)).rejects.toThrow();
      }
    );

    it('retires both capabilities when one archive empties two', async () => {
      const changeName = 'retire-two';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const secondDelta = path.join(changeDir, 'specs', 'second-layer');
      await fs.mkdir(secondDelta, { recursive: true });
      await fs.writeFile(
        path.join(secondDelta, 'spec.md'),
        REMOVE_ALL.replace('Legacy Layer', 'Second Layer')
      );
      for (const capability of ['legacy-layer', 'second-layer']) {
        const dir = path.join(tempDir, 'openspec', 'specs', capability);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, 'spec.md'), mainSpec(capability));
      }

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(path.join(tempDir, 'openspec', 'specs', 'legacy-layer'))).rejects.toThrow();
      await expect(fs.access(path.join(tempDir, 'openspec', 'specs', 'second-layer'))).rejects.toThrow();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Totals: + 0, ~ 0, - 2, → 0')
      );
    });

    it('does not retire under --no-validate, since nothing checked the result', async () => {
      // The safety argument is the validator's verdict. With validation off
      // there is none, so the pre-#1302 behavior stands: write the spec.
      const changeName = 'retire-unvalidated';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `${mainSpec('legacy-layer')}\n## Notes\nHand-written notes worth keeping.\n`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const written = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(written).toContain('## Notes');
      expect(written).not.toContain('### Requirement:');
    });

    it('refuses to retire while any ### heading remains under Requirements', async () => {
      // A stray `### Requirements` under Purpose captures the validator's
      // section lookup, so it reports "no requirements" for a spec that plainly
      // still has one. A reader is not fooled, and neither is this guard.
      const changeName = 'retire-residual-heading';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        [
          '# legacy-layer Specification',
          '',
          '## Purpose',
          PURPOSE,
          '',
          '### Requirements',
          '(a stray sub-heading a previous author left behind)',
          '',
          '## Requirements',
          '',
          '### Legacy note',
          'The system SHALL keep the legacy note until migration completes.',
          '',
          '#### Scenario: Note applies',
          '- **WHEN** a reader consults the note',
          '- **THEN** it applies',
          '',
          REQUIREMENT,
          '',
        ].join('\n')
      );

      await archiveCommand.execute(changeName, { yes: true });

      const survived = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(survived).toContain('### Legacy note');
    });

    it('does not claim a resolved path for an ordinary retirement', async () => {
      // The temp root is itself reached through a symlink on macOS
      // (/var -> /private/var), so comparing resolved-vs-canonical paths would
      // decorate every retirement with a note that means nothing.
      const changeName = 'retire-plain-path';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true, json: true });

      const payload = JSON.parse(lastJsonPayload());
      // The retirement warning carries no resolved-path suffix: the nominal
      // path told the whole story. Asserted on the path, not on message prose.
      const retirement = payload.archive.warnings.find((w: string) =>
        w.includes('capability retired')
      );
      expect(retirement).toBeDefined();
      // Canonicalized for the same reason as the symlinked-spec.md test: the
      // warning would print the resolved form, so comparing the raw tempDir
      // would pass regardless of what the code did.
      expect(retirement).not.toContain(await fs.realpath(tempDir));
    });

    it.skipIf(process.platform === 'win32')(
      'names the resolved path when a symlink put the spec outside the specs tree',
      async () => {
        const changeName = 'retire-outside';
        await createChange(changeName, 'legacy-layer', REMOVE_ALL);
        const outside = path.join(tempDir, 'outside', 'legacy-layer');
        await fs.mkdir(outside, { recursive: true });
        await fs.writeFile(path.join(outside, 'spec.md'), mainSpec('legacy-layer'));
        await fs.symlink(outside, path.join(tempDir, 'openspec', 'specs', 'legacy-layer'), 'dir');

        await archiveCommand.execute(changeName, { yes: true, json: true });

        const payload = JSON.parse(lastJsonPayload());
        // The warning names where the file really was, not the nominal path.
        expect(payload.archive.warnings.join('\n')).toContain(
          await fs.realpath(path.join(tempDir, 'outside'))
        );
        // The unlink follows the link exactly where a write would have gone...
        await expect(fs.access(path.join(outside, 'spec.md'))).rejects.toThrow();
        // ...but the directory outside the tree is left alone.
        await expect(fs.access(outside)).resolves.not.toThrow();
      }
    );

    // The veto must not depend on WHERE the heading sits. Anything after the
    // last `### Requirement:` belongs to that block's raw and is discarded with
    // it, so reading the rebuilt body only ever saw headings above the first
    // requirement - and silently deleted the identical heading written below.
    it.each(['before', 'after'])(
      'refuses to retire with a stray heading %s the requirement',
      async (position) => {
        const changeName = `retire-heading-${position}`;
        await createChange(changeName, 'legacy-layer', REMOVE_ALL);
        const note = [
          '### Migration notes (hand-written, keep)',
          'Move consumers to v2 before deleting the shim.',
        ].join('\n');
        const body = position === 'before' ? `${note}\n\n${REQUIREMENT}` : `${REQUIREMENT}\n\n${note}`;
        const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        await fs.mkdir(mainSpecDir, { recursive: true });
        await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer', body));

        await archiveCommand.execute(changeName, { yes: true });

        const survived = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
        expect(survived).toContain('### Migration notes');
        expect(process.exitCode).toBe(1);
      }
    );

    it.skipIf(process.platform === 'win32')(
      'does not claim it deleted the target of a symlinked spec.md',
      async () => {
        // realpath follows the link; unlink removes the link and leaves the
        // target alone. Naming the target would report a deletion that never
        // happened.
        const changeName = 'retire-symlinked-file';
        await createChange(changeName, 'legacy-layer', REMOVE_ALL);
        const shared = path.join(tempDir, 'shared-legacy.md');
        await fs.writeFile(shared, mainSpec('legacy-layer'));
        const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        await fs.mkdir(mainSpecDir, { recursive: true });
        await fs.symlink(shared, path.join(mainSpecDir, 'spec.md'));

        await archiveCommand.execute(changeName, { yes: true, json: true });

        const warnings = JSON.parse(lastJsonPayload()).archive.warnings.join('\n');
        // Canonicalized: the warning would print the resolved form, and on
        // macOS tempDir lives under /var -> /private/var, so comparing the
        // uncanonicalized path would pass no matter what the code did.
        expect(warnings).not.toContain(await fs.realpath(shared));
        // The shared file really is still there.
        await expect(fs.readFile(shared, 'utf-8')).resolves.toContain('### Requirement:');
      }
    );

    it('still names every lost section when a fence holds an unterminated comment', async () => {
      // Masking comments before fences let a `<!--` inside a fenced example be
      // read as real syntax, blanking the rest of the file and truncating this
      // very list.
      const changeName = 'retire-fenced-comment';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        [
          mainSpec('legacy-layer'),
          '## Example markup',
          '',
          '```html',
          '<!-- an unterminated comment example',
          '```',
          '',
          '## Operational notes',
          'Worth keeping.',
          '',
        ].join('\n')
      );

      await archiveCommand.execute(changeName, { yes: true, json: true });

      const warnings = JSON.parse(lastJsonPayload()).archive.warnings.join('\n');
      expect(warnings).toContain('Example markup');
      expect(warnings).toContain('Operational notes');
    });

    it('reports a destination taken during the merge as a collision, not a raw errno', async () => {
      // The pre-flight check cannot cover the whole merge, so the move itself
      // has to name the same condition rather than leaking ENOTEMPTY.
      const changeName = 'retire-raced';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));
      const archived = path.join(
        tempDir,
        'openspec',
        'changes',
        'archive',
        `${formatLocalDate()}-${changeName}`
      );
      // Claim the destination while the confirmation prompt is open.
      const { confirm } = await import('@inquirer/prompts');
      vi.mocked(confirm).mockImplementation(async () => {
        await fs.mkdir(archived, { recursive: true });
        await fs.writeFile(path.join(archived, 'squatter.txt'), 'mine now\n');
        return true;
      });

      // Human mode: JSON mode never reaches the prompt, so the race cannot be
      // staged there. The error carries the same diagnostic either way.
      await expect(archiveCommand.execute(changeName, {})).rejects.toThrow(/already exists/);
    });

    it('reports the retirement, and where it went, in the --json warnings', async () => {
      const changeName = 'retire-json-warnings';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `${mainSpec('legacy-layer')}\n## Why These Decisions\nBecause v1 predates routing.\n`
      );

      await archiveCommand.execute(changeName, { yes: true, json: true });

      const payload = JSON.parse(lastJsonPayload());
      expect(payload.archive.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'legacy-layer - capability retired; moved the main spec to ' +
              `openspec/changes/archive/${formatLocalDate()}-${changeName}/retired-specs/legacy-layer/spec.md`
          ),
        ])
      );
      // Purpose always travels with the file, so it is named alongside the rest.
      expect(payload.archive.warnings.join('\n')).toContain('Purpose, Why These Decisions');
    });

    it('claims no retirement for a spec that was already gone', async () => {
      const changeName = 'retire-already-gone-json';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);

      await archiveCommand.execute(changeName, { yes: true, json: true });

      const payload = JSON.parse(lastJsonPayload());
      expect(payload.archive.specsUpdated).toBe(false);
      expect(payload.archive.totals).toEqual({ added: 0, modified: 0, removed: 0, renamed: 0 });
      expect(JSON.stringify(payload.archive.warnings ?? [])).not.toContain('capability retired');
    });

    it('does not name headings hidden in fences or HTML comments, nor repeat one', async () => {
      const changeName = 'retire-masked-sections';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        [
          mainSpec('legacy-layer'),
          '## Notes',
          'A sample of the format:',
          '',
          '```markdown',
          '## Not A Real Section',
          '```',
          '',
          '<!--',
          '## CommentedOut',
          '-->',
          '',
          '## Notes',
          'A second block under the same heading.',
          '',
        ].join('\n')
      );

      await archiveCommand.execute(changeName, { yes: true, json: true });

      const warnings = JSON.parse(lastJsonPayload()).archive.warnings.join('\n');
      expect(warnings).toContain('Notes');
      expect(warnings).not.toContain('Not A Real Section');
      expect(warnings).not.toContain('CommentedOut');
      // Deduped: the repeated heading is named once.
      expect(warnings.match(/Notes/g)).toHaveLength(1);
    });

    describe('isRetirableSpec', () => {
      const REQUIREMENTLESS = `# legacy-layer Specification\n\n## Purpose\n${PURPOSE}\n\n## Requirements\n`;

      it('is false for a spec that validates', async () => {
        await expect(
          isRetirableSpec('legacy-layer', mainSpec('legacy-layer'))
        ).resolves.toBe(false);
      });

      it('is true when the only error is that it has no requirements', async () => {
        await expect(isRetirableSpec('legacy-layer', REQUIREMENTLESS)).resolves.toBe(true);
      });

      it('is false for a different single error', async () => {
        // No Purpose section: a real failure, but not the one retirement replaces.
        await expect(
          isRetirableSpec(
            'legacy-layer',
            `# legacy-layer Specification\n\n## Requirements\n\n${REQUIREMENT}\n`
          )
        ).resolves.toBe(false);
      });

      it('is false when another error accompanies the missing requirements', async () => {
        // A requirement stranded under a trailing section: "no requirements"
        // AND "header outside the main ## Requirements section".
        const stranded = [
          '# legacy-layer Specification',
          '',
          '## Purpose',
          PURPOSE,
          '',
          '## Requirements',
          '',
          '## Appendix',
          '',
          REQUIREMENT,
          '',
        ].join('\n');
        const report = await new Validator().validateSpecContent('legacy-layer', stranded);
        const errors = report.issues.filter((issue) => issue.level === 'ERROR');
        // Guards the `every` rather than `some`: this shape carries the
        // no-requirements error alongside at least one other.
        expect(errors.length).toBeGreaterThan(1);
        expect(errors.map((issue) => issue.message)).toContain(
          VALIDATION_MESSAGES.SPEC_NO_REQUIREMENTS
        );
        await expect(isRetirableSpec('legacy-layer', stranded)).resolves.toBe(false);
      });
    });

    it('reports the retirement in --json instead of printing progress lines', async () => {
      const changeName = 'retire-json';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true, json: true });

      await expect(fs.access(mainSpecDir)).rejects.toThrow();
      const calls = (console.log as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
        (call) => String(call[0])
      );
      // JSON mode prints exactly one payload and no human progress lines.
      expect(calls.some((line) => line.includes('Retiring'))).toBe(false);
      const payload = JSON.parse(calls[calls.length - 1]);
      expect(payload.archive.specsUpdated).toBe(true);
      expect(payload.archive.totals).toEqual({ added: 0, modified: 0, removed: 1, renamed: 0 });
    });
  });

  describe('proposal warnings (#498)', () => {
    const LONG_WHY =
      'This change exists to document AI application patterns thoroughly for the team, which is long enough.';

    async function createChange(
      changeName: string,
      why: string,
      deltaSpec: string
    ): Promise<string> {
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(path.join(changeDir, 'specs', 'docs'), { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        `# Proposal\n\n## Why\n${why}\n\n## What Changes\n- Add docs.\n`
      );
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.writeFile(path.join(changeDir, 'specs', 'docs', 'spec.md'), deltaSpec);
      return changeDir;
    }

    function loggedLines(): string[] {
      return (console.log as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
        (call) => String(call[0])
      );
    }

    // A stray non-`### Requirement:` header inside a delta section used to be
    // parsed as a requirement, so archive blamed a requirement that does not
    // exist while `openspec validate` reported the change as valid (#498).
    it('does not report phantom requirement warnings for a stray delta header', async () => {
      const changeName = 'stray-header';
      await createChange(
        changeName,
        LONG_WHY,
        [
          '# Docs Delta',
          '',
          '## ADDED Requirements',
          '',
          '### Documentation Requirements',
          '',
          '### Requirement: AI Application Documentation',
          'Teams building AI applications SHALL document agent definitions.',
          '',
          '#### Scenario: Agent Definition Documentation',
          '- **WHEN** a team ships an agent',
          '- **THEN** the agent definition is documented',
          '',
        ].join('\n')
      );

      await archiveCommand.execute(changeName, { yes: true });

      const output = loggedLines().join('\n');
      expect(output).not.toContain('Proposal warnings in proposal.md');
      expect(output).not.toContain('Requirement must have at least one scenario');

      // The change still archives, exactly as `validate` predicted.
      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives).toEqual([expect.stringMatching(new RegExp(`\\d{4}-\\d{2}-\\d{2}-${changeName}`))]);
    });

    // REMOVED requirements are names-only by design, so delta spec validation
    // exempts them. The proposal report did not, and warned about a missing
    // scenario on every correct removal.
    it('does not warn about missing scenarios for REMOVED requirements', async () => {
      const changeName = 'removal';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(path.join(changeDir, 'specs', 'docs'), { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        `# Proposal\n\n## Why\n${LONG_WHY}\n\n## What Changes\n- Remove docs.\n`
      );
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.writeFile(
        path.join(changeDir, 'specs', 'docs', 'spec.md'),
        '# Docs Delta\n\n## REMOVED Requirements\n\n### Requirement: Old Thing\n'
      );
      // The removal needs a main spec to remove the requirement from.
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'docs');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        '# docs Specification\n\n## Purpose\nDocs.\n\n## Requirements\n### Requirement: Old Thing\nThe system SHALL do the old thing.\n\n#### Scenario: Old\n- **WHEN** invoked\n- **THEN** it happens\n'
      );

      await archiveCommand.execute(changeName, { yes: true });

      const output = loggedLines().join('\n');
      expect(output).not.toContain('Proposal warnings in proposal.md');
      expect(output).not.toContain('Requirement must have at least one scenario');
    });

    it('still reports genuine proposal-level warnings', async () => {
      const changeName = 'short-why';
      await createChange(
        changeName,
        'Short.',
        [
          '# Docs Delta',
          '',
          '## ADDED Requirements',
          '',
          '### Requirement: Real Requirement',
          'The system SHALL do a thing.',
          '',
          '#### Scenario: It works',
          '- **WHEN** invoked',
          '- **THEN** it works',
          '',
        ].join('\n')
      );

      await archiveCommand.execute(changeName, { yes: true });

      const output = loggedLines().join('\n');
      expect(output).toContain('Proposal warnings in proposal.md');
      expect(output).toContain('Why section must be at least 50 characters');
    });

    // The filter is anchored to the dot-joined Zod paths
    // (`deltas.<n>.requirement(s).…`). Rules in applyChangeRules use bracket
    // notation (`deltas[<n>].description`) and describe simple deltas parsed
    // from `## What Changes`, which are proposal-level. They must survive.
    it('keeps proposal-level warnings about simple deltas from What Changes', async () => {
      const changeName = 'simple-deltas';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        '# Proposal\n\n## Why\nShort.\n\n## What Changes\n- **docs:** add x\n'
      );
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true });

      const output = loggedLines().join('\n');
      expect(output).toContain('Proposal warnings in proposal.md');
      expect(output).toContain(VALIDATION_MESSAGES.DELTA_DESCRIPTION_TOO_BRIEF);
      expect(output).toContain(`ADDED ${VALIDATION_MESSAGES.DELTA_MISSING_REQUIREMENTS}`);
    });

    // Real delta defects are still caught. A missing scenario used to be
    // reported three times (twice as proposal warnings, once by the delta
    // report) and is now reported once, by the delta report.
    it('still blocks the archive on real delta requirement errors, reported once', async () => {
      const changeName = 'bad-delta';
      const changeDir = await createChange(
        changeName,
        LONG_WHY,
        [
          '# Docs Delta',
          '',
          '## ADDED Requirements',
          '',
          '### Requirement: Missing Scenario',
          'The system SHALL do a thing.',
          '',
        ].join('\n')
      );

      await archiveCommand.execute(changeName, { yes: true });

      const lines = loggedLines();
      const output = lines.join('\n');
      expect(output).toContain('Validation errors in change delta specs');
      expect(output).toContain('must include at least one scenario');
      expect(output).not.toContain('Proposal warnings in proposal.md');
      expect(
        lines.filter((line) => line.includes('must include at least one scenario'))
      ).toHaveLength(1);

      // The change was not archived.
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });
  });
});
