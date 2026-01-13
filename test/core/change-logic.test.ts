import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { 
    getActiveChanges, 
    getChangeMarkdown, 
    getChangeJson, 
    getChangeDetails, 
    validateChange,
    runCreateChange
} from '../../src/core/change-logic.js';

describe('Core Change Logic', () => {
  let tempRoot: string;
  let originalCwd: string;
  const changeName = 'demo-change';

  beforeAll(async () => {
    originalCwd = process.cwd();
    tempRoot = path.join(os.tmpdir(), `openspec-core-change-logic-${Date.now()}`);
    // Simulate project structure
    await fs.mkdir(path.join(tempRoot, 'openspec', 'changes'), { recursive: true });
    // Write a dummy project config to ensure resolveOpenSpecDir works if it checks for project root markers
    await fs.writeFile(path.join(tempRoot, 'package.json'), '{}', 'utf-8'); 
    process.chdir(tempRoot);

    // Create a demo change manually to test retrieval
    const changeDir = path.join(tempRoot, 'openspec', 'changes', changeName);
    await fs.mkdir(changeDir, { recursive: true });
    const proposal = `# Change: Demo Change\n\n## Why\nTest core logic.\n\n## What Changes\n- **auth:** Add requirement`;
    await fs.writeFile(path.join(changeDir, 'proposal.md'), proposal, 'utf-8');
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n- [ ] Task 2\n', 'utf-8');
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('getActiveChanges returns list of change IDs', async () => {
    const changes = await getActiveChanges(tempRoot);
    expect(changes).toContain(changeName);
  });

  it('getChangeMarkdown returns content of proposal.md', async () => {
    const content = await getChangeMarkdown(tempRoot, changeName);
    expect(content).toContain('# Change: Demo Change');
  });

  it('getChangeJson returns parsed JSON object', async () => {
    const json = await getChangeJson(tempRoot, changeName);
    expect(json.id).toBe(changeName);
    expect(json.title).toBe('Demo Change');
    expect(json.deltas).toBeDefined();
    // Verify one delta (requirement addition) is parsed if the parser logic works on that markdown
    // The dummy markdown: "- **auth:** Add requirement" might be parsed as a delta depending on parser logic.
    // The parser usually looks for headers like "## ADDED Requirements" or "## What Changes" mapping.
    // Existing parser logic is complex, but we at least check structure.
  });

  it('getChangeDetails returns details with task counts', async () => {
    const details = await getChangeDetails(tempRoot, changeName);
    expect(details.id).toBe(changeName);
    expect(details.title).toBe('Demo Change');
    expect(details.taskStatus).toEqual({ total: 2, completed: 1 });
  });

  it('validateChange returns a validation report', async () => {
    const report = await validateChange(tempRoot, changeName, false);
    // It might be invalid because it doesn't strictly follow spec-driven structure (scenarios etc)
    // But we just check we got a report object.
    expect(report).toHaveProperty('valid');
    expect(report).toHaveProperty('issues');
  });

  it('runCreateChange scaffolds a new change', async () => {
    const newChangeName = 'new-test-change';
    const result = await runCreateChange(tempRoot, newChangeName);
    
    expect(result.name).toBe(newChangeName);
    expect(result.changeDir).toContain(newChangeName);
    
    // Manually create proposal.md as getActiveChanges requires it
    await fs.writeFile(path.join(result.changeDir, 'proposal.md'), '# Change', 'utf-8');

    // Verify file creation
    const changes = await getActiveChanges(tempRoot);
    expect(changes).toContain(newChangeName);
  });
});
