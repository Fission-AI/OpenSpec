import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { migrateOpenCodeCommands } from '../../../src/core/shared/opencode-migration.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn()
}));

describe('migrateOpenCodeCommands', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-opencode-migration-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('moves legacy command files into .opencode/commands', async () => {
    const legacyDir = path.join(tempDir, '.opencode', 'command');
    const nextDir = path.join(tempDir, '.opencode', 'commands');
    await fs.mkdir(legacyDir, { recursive: true });

    const legacyFile = path.join(legacyDir, 'opsx-archive.md');
    await fs.writeFile(legacyFile, 'legacy content');

    await migrateOpenCodeCommands(tempDir, false);

    const migratedFile = path.join(nextDir, 'opsx-archive.md');
    const migratedContent = await fs.readFile(migratedFile, 'utf-8');
    expect(migratedContent).toBe('legacy content');

    const legacyEntries = await fs.readdir(legacyDir);
    expect(legacyEntries).toHaveLength(0);
  });

  it('overwrites destination files on conflict', async () => {
    const legacyDir = path.join(tempDir, '.opencode', 'command');
    const nextDir = path.join(tempDir, '.opencode', 'commands');
    await fs.mkdir(legacyDir, { recursive: true });
    await fs.mkdir(nextDir, { recursive: true });

    const legacyFile = path.join(legacyDir, 'opsx-archive.md');
    const destFile = path.join(nextDir, 'opsx-archive.md');
    await fs.writeFile(destFile, 'current content');
    await fs.writeFile(legacyFile, 'legacy content');

    await migrateOpenCodeCommands(tempDir, false);

    const migratedContent = await fs.readFile(destFile, 'utf-8');
    expect(migratedContent).toBe('current content');

    const legacyEntries = await fs.readdir(legacyDir);
    expect(legacyEntries).toHaveLength(0);
  });

  it('does nothing when legacy directory does not exist', async () => {
    await migrateOpenCodeCommands(tempDir, false);

    const legacyDir = path.join(tempDir, '.opencode', 'command');
    await expect(fs.readdir(legacyDir)).rejects.toThrow();
  });

  it('removes empty legacy directory when confirmed', async () => {
    const legacyDir = path.join(tempDir, '.opencode', 'command');
    await fs.mkdir(legacyDir, { recursive: true });

    // Ensure the migration actually changes something so cleanup prompt applies.
    await fs.writeFile(path.join(legacyDir, 'opsx-archive.md'), 'legacy content');

    const { confirm } = await import('@inquirer/prompts');
    (confirm as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await migrateOpenCodeCommands(tempDir, true);

    await expect(fs.readdir(legacyDir)).rejects.toThrow();
  });

  it('keeps empty legacy directory when deletion is declined', async () => {
    const legacyDir = path.join(tempDir, '.opencode', 'command');
    await fs.mkdir(legacyDir, { recursive: true });

    const { confirm } = await import('@inquirer/prompts');
    (confirm as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await migrateOpenCodeCommands(tempDir, true);

    const entries = await fs.readdir(legacyDir);
    expect(entries).toHaveLength(0);
  });
});
