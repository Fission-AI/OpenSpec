# Domain Support & Archive Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure OpenSpec so that `changes/` and `archive/` support multi-level domain hierarchies, `archive/` moves to be a sibling of `changes/` under `openspec/`, and creating a change interactively guides the user to optionally pick or create a domain level-by-level.

**Architecture:** Introduce `src/utils/change-path.ts` as the single source of truth for change-id splitting, recursive leaf discovery, and archive-path calculation. All consumers (`archive.ts`, `list.ts`, `view.ts`, `item-discovery.ts`, `change-utils.ts`, `shared.ts`) are updated to call these helpers. The interactive domain-selection loop is encapsulated in `new-change.ts`.

**Tech Stack:** TypeScript, Node.js `fs/promises`, `@inquirer/prompts` (select / input), Vitest for tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/change-path.ts` | **Create** | `splitChangeId`, `findAllChangeIds`, `findAllArchivedChangeIds`, `buildArchivePath`, `validateDomainPath` |
| `src/core/archive.ts` | Modify | Use `findAllChangeIds` for selection; use `buildArchivePath` + new archive root |
| `src/core/list.ts` | Modify | Use `findAllChangeIds` instead of single-level `readdir` |
| `src/core/view.ts` | Modify | Use `findAllChangeIds` instead of single-level `readdirSync` |
| `src/utils/item-discovery.ts` | Modify | `getActiveChangeIds` → `findAllChangeIds`; `getArchivedChangeIds` → `findAllArchivedChangeIds` |
| `src/utils/change-utils.ts` | Modify | `createChange` accepts slash-separated id; `changesDir + id` for directory path |
| `src/commands/workflow/shared.ts` | Modify | `getAvailableChanges` → `findAllChangeIds`; `validateChangeExists` handles slash ids |
| `src/commands/workflow/new-change.ts` | Modify | Add `--domain` option; insert domain-selection interactive step |
| `src/core/planning-home.ts` | Modify | `getChangeDir` / `formatChangeLocation` work with multi-segment ids |
| `src/commands/completion.ts` | Modify | `getArchivedChangeIds` points to new archive root |
| `src/core/templates/workflows/archive-change.ts` | Modify | Update archive-path instructions in skill/command templates |
| `src/core/templates/workflows/bulk-archive-change.ts` | Modify | Same |
| `test/utils/change-path.test.ts` | **Create** | Unit tests for all helpers in `change-path.ts` |
| `test/core/archive.test.ts` | Modify | Update setup (no `changes/archive/`), add domain-aware archive tests |
| `test/utils/change-utils.test.ts` | Modify | Add tests for slash-id `createChange` |
| `test/commands/workflow/new-change-domain.test.ts` | **Create** | Tests for `--domain` flag in `newChangeCommand` |

---

## Task 1: Create `src/utils/change-path.ts` with helpers

**Files:**
- Create: `src/utils/change-path.ts`
- Create: `test/utils/change-path.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// test/utils/change-path.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import {
  splitChangeId,
  buildArchivePath,
  findAllChangeIds,
  findAllArchivedChangeIds,
  validateDomainPath,
} from '../../src/utils/change-path.js';

describe('splitChangeId', () => {
  it('returns empty domain and name for root-level id', () => {
    expect(splitChangeId('add-login')).toEqual({ domain: [], name: 'add-login' });
  });

  it('returns single-level domain', () => {
    expect(splitChangeId('auth/add-login')).toEqual({ domain: ['auth'], name: 'add-login' });
  });

  it('returns multi-level domain', () => {
    expect(splitChangeId('auth/oauth/add-login')).toEqual({
      domain: ['auth', 'oauth'],
      name: 'add-login',
    });
  });
});

describe('buildArchivePath', () => {
  it('builds path for no-domain change', () => {
    const result = buildArchivePath('/openspec/archive', 'add-login', '2025-01-23');
    expect(result).toBe(path.join('/openspec/archive', '2025-01-23-add-login'));
  });

  it('builds path for single-domain change', () => {
    const result = buildArchivePath('/openspec/archive', 'auth/add-login', '2025-01-23');
    expect(result).toBe(path.join('/openspec/archive', 'auth', '2025-01-23-add-login'));
  });

  it('builds path for multi-domain change', () => {
    const result = buildArchivePath('/openspec/archive', 'auth/oauth/add-login', '2025-01-23');
    expect(result).toBe(path.join('/openspec/archive', 'auth', 'oauth', '2025-01-23-add-login'));
  });
});

describe('validateDomainPath', () => {
  it('accepts empty string (no domain)', () => {
    expect(validateDomainPath('')).toEqual({ valid: true });
  });

  it('accepts single kebab-case segment', () => {
    expect(validateDomainPath('auth')).toEqual({ valid: true });
  });

  it('accepts multi-level kebab-case path', () => {
    expect(validateDomainPath('auth/oauth')).toEqual({ valid: true });
  });

  it('rejects empty segment (double slash)', () => {
    const result = validateDomainPath('auth//oauth');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects uppercase segment', () => {
    const result = validateDomainPath('Auth/oauth');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Auth');
  });

  it('rejects segment with underscore', () => {
    const result = validateDomainPath('my_domain');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('my_domain');
  });
});

describe('findAllChangeIds', () => {
  let tempDir: string;
  let changesDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-cp-test-${randomUUID()}`);
    changesDir = path.join(tempDir, 'changes');
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns empty array when changesDir does not exist', async () => {
    const result = await findAllChangeIds(path.join(tempDir, 'nonexistent'));
    expect(result).toEqual([]);
  });

  it('finds root-level change', async () => {
    await fs.mkdir(path.join(changesDir, 'add-login'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'add-login', '.openspec.yaml'), 'schema: spec-driven\ncreated: 2025-01-01\n');
    const result = await findAllChangeIds(changesDir);
    expect(result).toEqual(['add-login']);
  });

  it('finds domain-nested change', async () => {
    await fs.mkdir(path.join(changesDir, 'auth', 'add-login'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'auth', 'add-login', '.openspec.yaml'), 'schema: spec-driven\ncreated: 2025-01-01\n');
    const result = await findAllChangeIds(changesDir);
    expect(result).toContain(path.join('auth', 'add-login').replace(/\\/g, '/'));
  });

  it('finds multi-level domain change', async () => {
    await fs.mkdir(path.join(changesDir, 'auth', 'oauth', 'add-login'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'auth', 'oauth', 'add-login', '.openspec.yaml'), 'schema: spec-driven\ncreated: 2025-01-01\n');
    const result = await findAllChangeIds(changesDir);
    expect(result).toContain('auth/oauth/add-login');
  });

  it('does not return domain container directories (no .openspec.yaml or proposal.md)', async () => {
    // domain container only — no leaf marker
    await fs.mkdir(path.join(changesDir, 'auth'), { recursive: true });
    const result = await findAllChangeIds(changesDir);
    expect(result).toEqual([]);
  });

  it('uses proposal.md as leaf marker when .openspec.yaml absent', async () => {
    await fs.mkdir(path.join(changesDir, 'add-login'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'add-login', 'proposal.md'), '# proposal');
    const result = await findAllChangeIds(changesDir);
    expect(result).toEqual(['add-login']);
  });
});

describe('findAllArchivedChangeIds', () => {
  let tempDir: string;
  let archiveDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-arc-test-${randomUUID()}`);
    archiveDir = path.join(tempDir, 'archive');
    await fs.mkdir(archiveDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('finds root-level archived change', async () => {
    await fs.mkdir(path.join(archiveDir, '2025-01-23-add-login'), { recursive: true });
    await fs.writeFile(path.join(archiveDir, '2025-01-23-add-login', '.openspec.yaml'), 'schema: spec-driven\ncreated: 2025-01-01\n');
    const result = await findAllArchivedChangeIds(archiveDir);
    expect(result).toEqual(['2025-01-23-add-login']);
  });

  it('finds domain-nested archived change', async () => {
    await fs.mkdir(path.join(archiveDir, 'auth', '2025-01-23-add-login'), { recursive: true });
    await fs.writeFile(path.join(archiveDir, 'auth', '2025-01-23-add-login', '.openspec.yaml'), 'schema: spec-driven\ncreated: 2025-01-01\n');
    const result = await findAllArchivedChangeIds(archiveDir);
    expect(result).toContain('auth/2025-01-23-add-login');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test test/utils/change-path.test.ts
```
Expected: multiple failures — `change-path.ts` does not exist yet.

- [ ] **Step 3: Create `src/utils/change-path.ts`**

```typescript
// src/utils/change-path.ts
import { promises as fs } from 'fs';
import path from 'path';
import { validateChangeName } from './change-utils.js';

export interface SplitChangeId {
  domain: string[];
  name: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Splits a full change id (e.g. "auth/oauth/add-login") into domain segments
 * and the change name (last segment).
 */
export function splitChangeId(id: string): SplitChangeId {
  const parts = id.split('/');
  return {
    domain: parts.slice(0, -1),
    name: parts[parts.length - 1],
  };
}

/**
 * Validates that a domain path string (e.g. "auth/oauth") consists only of
 * valid kebab-case segments. Empty string means no domain and is always valid.
 */
export function validateDomainPath(domainPath: string): ValidationResult {
  if (domainPath === '') return { valid: true };

  const segments = domainPath.split('/');
  for (const segment of segments) {
    if (segment === '') {
      return { valid: false, error: `Domain path '${domainPath}' contains an empty segment (double slash)` };
    }
    const check = validateChangeName(segment);
    if (!check.valid) {
      return { valid: false, error: `Domain segment '${segment}' is invalid: ${check.error}` };
    }
  }
  return { valid: true };
}

/**
 * Computes the archive destination path for a change, preserving domain hierarchy.
 *
 * Examples:
 *   buildArchivePath('/openspec/archive', 'add-login', '2025-01-23')
 *     → '/openspec/archive/2025-01-23-add-login'
 *   buildArchivePath('/openspec/archive', 'auth/add-login', '2025-01-23')
 *     → '/openspec/archive/auth/2025-01-23-add-login'
 *   buildArchivePath('/openspec/archive', 'auth/oauth/add-login', '2025-01-23')
 *     → '/openspec/archive/auth/oauth/2025-01-23-add-login'
 */
export function buildArchivePath(archiveDir: string, changeId: string, date: string): string {
  const { domain, name } = splitChangeId(changeId);
  return path.join(archiveDir, ...domain, `${date}-${name}`);
}

/**
 * Returns true if `dir` is a leaf change directory (contains .openspec.yaml or proposal.md).
 */
async function isLeafChange(dir: string): Promise<boolean> {
  try {
    await fs.access(path.join(dir, '.openspec.yaml'));
    return true;
  } catch {
    try {
      await fs.access(path.join(dir, 'proposal.md'));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Recursively walks `rootDir` and returns relative slash-separated ids for all
 * leaf change directories (directories that contain .openspec.yaml or proposal.md).
 */
async function walkForLeaves(rootDir: string, prefix: string): Promise<string[]> {
  const results: string[] = [];
  let entries: Awaited<ReturnType<typeof fs.readdir>>;
  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const fullPath = path.join(rootDir, entry.name);
    const relId = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (await isLeafChange(fullPath)) {
      results.push(relId);
    } else {
      // It's a domain container — recurse
      const children = await walkForLeaves(fullPath, relId);
      results.push(...children);
    }
  }
  return results;
}

/**
 * Recursively finds all active change ids (relative to changesDir) by looking
 * for leaf-node directories that contain .openspec.yaml or proposal.md.
 * Returns forward-slash separated ids regardless of OS.
 */
export async function findAllChangeIds(changesDir: string): Promise<string[]> {
  try {
    await fs.access(changesDir);
  } catch {
    return [];
  }
  const ids = await walkForLeaves(changesDir, '');
  return ids.sort();
}

/**
 * Same as findAllChangeIds but for the archive root directory.
 */
export async function findAllArchivedChangeIds(archiveDir: string): Promise<string[]> {
  try {
    await fs.access(archiveDir);
  } catch {
    return [];
  }
  const ids = await walkForLeaves(archiveDir, '');
  return ids.sort();
}
```

- [ ] **Step 4: Run tests — expect green**

```bash
pnpm test test/utils/change-path.test.ts
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/change-path.ts test/utils/change-path.test.ts
git commit -m "feat: add change-path utilities (splitChangeId, buildArchivePath, findAllChangeIds)"
```

---

## Task 2: Update `src/utils/item-discovery.ts`

**Files:**
- Modify: `src/utils/item-discovery.ts`

- [ ] **Step 1: Write failing test**

```typescript
// test/utils/item-discovery.test.ts  (create this new file)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { getActiveChangeIds, getArchivedChangeIds } from '../../src/utils/item-discovery.js';

describe('getActiveChangeIds (domain-aware)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-disc-test-${randomUUID()}`);
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes'), { recursive: true });
    process.chdir(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns domain-nested change id', async () => {
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'auth', 'add-login'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'openspec', 'changes', 'auth', 'add-login', 'proposal.md'),
      '# proposal'
    );
    const ids = await getActiveChangeIds(tempDir);
    expect(ids).toContain('auth/add-login');
  });
});

describe('getArchivedChangeIds (domain-aware)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-arc-disc-${randomUUID()}`);
    await fs.mkdir(path.join(tempDir, 'openspec', 'archive'), { recursive: true });
    process.chdir(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('reads from openspec/archive/ (not openspec/changes/archive/)', async () => {
    await fs.mkdir(
      path.join(tempDir, 'openspec', 'archive', '2025-01-23-add-login'),
      { recursive: true }
    );
    await fs.writeFile(
      path.join(tempDir, 'openspec', 'archive', '2025-01-23-add-login', 'proposal.md'),
      '# proposal'
    );
    const ids = await getArchivedChangeIds(tempDir);
    expect(ids).toContain('2025-01-23-add-login');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test test/utils/item-discovery.test.ts
```

- [ ] **Step 3: Update `src/utils/item-discovery.ts`**

Replace the file entirely:

```typescript
import path from 'path';
import { findAllChangeIds, findAllArchivedChangeIds } from './change-path.js';

export async function getActiveChangeIds(root: string = process.cwd()): Promise<string[]> {
  const changesPath = path.join(root, 'openspec', 'changes');
  return findAllChangeIds(changesPath);
}

export async function getSpecIds(root: string = process.cwd()): Promise<string[]> {
  const { promises: fs } = await import('fs');
  const specsPath = path.join(root, 'openspec', 'specs');
  const result: string[] = [];
  try {
    const entries = await fs.readdir(specsPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const specFile = path.join(specsPath, entry.name, 'spec.md');
      try {
        await fs.access(specFile);
        result.push(entry.name);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return result.sort();
}

export async function getArchivedChangeIds(root: string = process.cwd()): Promise<string[]> {
  const archivePath = path.join(root, 'openspec', 'archive');
  return findAllArchivedChangeIds(archivePath);
}
```

- [ ] **Step 4: Run tests — expect green**

```bash
pnpm test test/utils/item-discovery.test.ts
```

- [ ] **Step 5: Run full suite to catch regressions**

```bash
pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/item-discovery.ts test/utils/item-discovery.test.ts
git commit -m "feat: item-discovery uses findAllChangeIds and new archive root"
```

---

## Task 3: Update `src/core/list.ts` and `src/core/view.ts`

**Files:**
- Modify: `src/core/list.ts`
- Modify: `src/core/view.ts`

- [ ] **Step 1: Write failing tests for domain-aware listing**

```typescript
// Add to test/core/list.test.ts  — find and append these cases
// (look for existing describe block for ListCommand)

it('lists domain-nested change with full relative id', async () => {
  // Setup: create auth/add-login under changesDir
  await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'auth', 'add-login'), { recursive: true });
  await fs.writeFile(
    path.join(tempDir, 'openspec', 'changes', 'auth', 'add-login', '.openspec.yaml'),
    'schema: spec-driven\ncreated: 2025-01-01\n'
  );
  const listCommand = new ListCommand();
  // Capture stdout
  const lines: string[] = [];
  const origLog = console.log;
  console.log = (...args: any[]) => lines.push(args.join(' '));
  await listCommand.execute(tempDir, 'changes', {});
  console.log = origLog;
  const output = lines.join('\n');
  expect(output).toContain('auth/add-login');
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test test/core/list.test.ts
```

- [ ] **Step 3: Update `src/core/list.ts`** — replace the readdir block for changes mode

Find this block (around line 85–95):
```typescript
// Get all directories in changes (excluding archive)
const entries = await fs.readdir(changesDir, { withFileTypes: true });
const changeDirs = entries
  .filter(entry => entry.isDirectory() && entry.name !== 'archive')
  .map(entry => entry.name);
```

Replace with:
```typescript
import { findAllChangeIds } from '../utils/change-path.js';

// ...inside execute(), changes mode:
const changeDirs = await findAllChangeIds(changesDir);
```

Also update where `getTaskProgressForChange` is called — it currently takes `(changesDir, changeDir)` where the second arg is just the name. With domain ids the name is now the full relative id. Verify the call signature in `src/utils/task-progress.ts` — if it does `path.join(changesDir, name)` then passing `auth/add-login` already works correctly.

- [ ] **Step 4: Update `src/core/view.ts`** — replace the `readdirSync` + `entry.name !== 'archive'` block inside `getChangesData`

Find (around line 95–100):
```typescript
const entries = fs.readdirSync(changesDir, { withFileTypes: true });

for (const entry of entries) {
  if (entry.isDirectory() && entry.name !== 'archive') {
    const progress = await getTaskProgressForChange(changesDir, entry.name);
    // ...
    draft/active/completed.push({ name: entry.name ... })
```

Replace with:
```typescript
import { findAllChangeIds } from '../utils/change-path.js';

// inside getChangesData (make the method async if not already):
const changeIds = await findAllChangeIds(changesDir);

for (const id of changeIds) {
  const progress = await getTaskProgressForChange(changesDir, id);
  if (progress.total === 0) {
    draft.push({ name: id });
  } else if (progress.completed === progress.total) {
    completed.push({ name: id });
  } else {
    active.push({ name: id, progress });
  }
}
```

Note: `getChangesData` is called with `await` in `execute()`, so making it `async` is safe.

- [ ] **Step 5: Run tests**

```bash
pnpm test test/core/list.test.ts test/core/view.test.ts
```

- [ ] **Step 6: Run full suite**

```bash
pnpm test
```

- [ ] **Step 7: Commit**

```bash
git add src/core/list.ts src/core/view.ts
git commit -m "feat: list and view use recursive domain-aware change discovery"
```

---

## Task 4: Update `src/commands/workflow/shared.ts`

**Files:**
- Modify: `src/commands/workflow/shared.ts`

- [ ] **Step 1: Write failing test**

```typescript
// Add to test/commands/artifact-workflow.test.ts or a new file
// test/commands/workflow/shared-domain.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { getAvailableChanges, validateChangeExists } from '../../../src/commands/workflow/shared.js';

describe('getAvailableChanges (domain-aware)', () => {
  let tempDir: string;
  let changesDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-shared-${randomUUID()}`);
    changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns domain-nested id', async () => {
    await fs.mkdir(path.join(changesDir, 'auth', 'add-login'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'auth', 'add-login', '.openspec.yaml'), 'schema: spec-driven\ncreated: 2025-01-01\n');
    const ids = await getAvailableChanges(tempDir, changesDir);
    expect(ids).toContain('auth/add-login');
  });
});

describe('validateChangeExists (domain-aware)', () => {
  let tempDir: string;
  let changesDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-vce-${randomUUID()}`);
    changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('resolves domain-nested change id', async () => {
    await fs.mkdir(path.join(changesDir, 'auth', 'add-login'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'auth', 'add-login', '.openspec.yaml'), 'schema: spec-driven\ncreated: 2025-01-01\n');
    const result = await validateChangeExists('auth/add-login', tempDir, changesDir);
    expect(result).toBe('auth/add-login');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test test/commands/workflow/shared-domain.test.ts
```

- [ ] **Step 3: Update `getAvailableChanges` in `src/commands/workflow/shared.ts`**

Replace:
```typescript
export async function getAvailableChanges(
  projectRoot: string,
  changesDir = path.join(projectRoot, 'openspec', 'changes')
): Promise<string[]> {
  const changesPath = changesDir;
  try {
    const entries = await fs.promises.readdir(changesPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && e.name !== 'archive' && !e.name.startsWith('.'))
      .map((e) => e.name);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}
```

With:
```typescript
import { findAllChangeIds } from '../../utils/change-path.js';

export async function getAvailableChanges(
  projectRoot: string,
  changesDir = path.join(projectRoot, 'openspec', 'changes')
): Promise<string[]> {
  return findAllChangeIds(changesDir);
}
```

- [ ] **Step 4: Update `validateChangeExists` in the same file**

The existing function calls `validateChangeName(changeName)` which rejects slashes. Replace the validation call with a domain-path-aware check:

```typescript
import { validateDomainPath, splitChangeId } from '../../utils/change-path.js';

export async function validateChangeExists(
  changeName: string | undefined,
  projectRoot: string,
  changesDir = path.join(projectRoot, 'openspec', 'changes')
): Promise<string> {
  if (!changeName) {
    const available = await getAvailableChanges(projectRoot, changesDir);
    if (available.length === 0) {
      throw new Error('No changes found. Create one with: openspec new change <name>');
    }
    throw new Error(
      `Missing required option --change. Available changes:\n  ${available.join('\n  ')}`
    );
  }

  // Validate: split into domain + name, validate each segment
  const { domain, name } = splitChangeId(changeName);
  const domainValidation = validateDomainPath(domain.join('/'));
  if (!domainValidation.valid) {
    throw new Error(`Invalid change id '${changeName}': ${domainValidation.error}`);
  }
  const nameValidation = validateChangeName(name);  // validateChangeName already imported at top of file
  if (!nameValidation.valid) {
    throw new Error(`Invalid change name '${name}': ${nameValidation.error}`);
  }

  // Check directory existence
  const changePath = path.join(changesDir, ...changeName.split('/'));
  const exists = fs.existsSync(changePath) && fs.statSync(changePath).isDirectory();

  if (!exists) {
    const available = await getAvailableChanges(projectRoot, changesDir);
    if (available.length === 0) {
      throw new Error(
        `Change '${changeName}' not found. No changes exist. Create one with: openspec new change <name>`
      );
    }
    throw new Error(
      `Change '${changeName}' not found. Available changes:\n  ${available.join('\n  ')}`
    );
  }

  return changeName;
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test test/commands/workflow/shared-domain.test.ts
pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add src/commands/workflow/shared.ts test/commands/workflow/shared-domain.test.ts
git commit -m "feat: workflow/shared supports domain-nested change ids"
```

---

## Task 5: Update `src/core/archive.ts`

**Files:**
- Modify: `src/core/archive.ts`
- Modify: `test/core/archive.test.ts`

- [ ] **Step 1: Write failing tests for domain-aware archive**

Add these cases to `test/core/archive.test.ts`. In `beforeEach`, remove the `changes/archive` mkdir — it should no longer be pre-created:

```typescript
it('archives to openspec/archive/ (sibling of changes/)', async () => {
  const changeName = 'test-feature';
  const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
  await fs.mkdir(changeDir, { recursive: true });
  await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1');

  await archiveCommand.execute(changeName, { yes: true });

  const archiveRoot = path.join(tempDir, 'openspec', 'archive');
  const archives = await fs.readdir(archiveRoot);
  expect(archives.length).toBe(1);
  expect(archives[0]).toMatch(/^\d{4}-\d{2}-\d{2}-test-feature$/);

  // Old location must NOT exist
  const oldArchive = path.join(tempDir, 'openspec', 'changes', 'archive');
  await expect(fs.access(oldArchive)).rejects.toThrow();
});

it('preserves domain hierarchy when archiving', async () => {
  const changeId = 'auth/add-login';
  const changeDir = path.join(tempDir, 'openspec', 'changes', 'auth', 'add-login');
  await fs.mkdir(changeDir, { recursive: true });
  await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1');

  await archiveCommand.execute(changeId, { yes: true });

  const archiveRoot = path.join(tempDir, 'openspec', 'archive');
  const domainDir = await fs.readdir(path.join(archiveRoot, 'auth'));
  expect(domainDir.length).toBe(1);
  expect(domainDir[0]).toMatch(/^\d{4}-\d{2}-\d{2}-add-login$/);
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test test/core/archive.test.ts
```

- [ ] **Step 3: Update `src/core/archive.ts`** — change archive root and path calculation

At the top of `execute()`, change:

```typescript
// OLD
const changesDir = path.join(targetPath, 'openspec', 'changes');
const archiveDir = path.join(changesDir, 'archive');
const mainSpecsDir = path.join(targetPath, 'openspec', 'specs');
```

To:

```typescript
import { findAllChangeIds, buildArchivePath } from '../utils/change-path.js';

// NEW
const openspecDir = path.join(targetPath, 'openspec');
const changesDir = path.join(openspecDir, 'changes');
const archiveDir = path.join(openspecDir, 'archive');
const mainSpecsDir = path.join(openspecDir, 'specs');
```

Then update the final archive section (around line 267–287). Replace:
```typescript
const archiveName = `${this.getArchiveDate()}-${changeName}`;
const archivePath = path.join(archiveDir, archiveName);

try {
  await fs.access(archivePath);
  throw new Error(`Archive '${archiveName}' already exists.`);
} catch (error: any) {
  if (error.code !== 'ENOENT') {
    throw error;
  }
}

await fs.mkdir(archiveDir, { recursive: true });
await moveDirectory(changeDir, archivePath);
console.log(`Change '${changeName}' archived as '${archiveName}'.`);
```

With:
```typescript
const archivePath = buildArchivePath(archiveDir, changeName, this.getArchiveDate());

try {
  await fs.access(archivePath);
  const archiveName = path.basename(archivePath);
  throw new Error(`Archive '${archiveName}' already exists at ${archivePath}.`);
} catch (error: any) {
  if (error.code !== 'ENOENT') {
    throw error;
  }
}

await fs.mkdir(path.dirname(archivePath), { recursive: true });
await moveDirectory(changeDir, archivePath);
console.log(`Change '${changeName}' archived to '${archivePath}'.`);
```

- [ ] **Step 4: Update `selectChange()` in `src/core/archive.ts`**

Replace the `readdir` + filter block inside `selectChange`:
```typescript
// OLD
const entries = await fs.readdir(changesDir, { withFileTypes: true });
const changeDirs = entries
  .filter(entry => entry.isDirectory() && entry.name !== 'archive')
  .map(entry => entry.name)
  .sort();
```

With:
```typescript
const changeDirs = await findAllChangeIds(changesDir);
```

Also update how progress is retrieved — `getTaskProgressForChange(changesDir, id)` already uses `path.join(changesDir, id)` internally; verify this in `src/utils/task-progress.ts`. If so, no further change needed.

- [ ] **Step 5: Update `changeDir` resolution** — the line that resolves from the provided `changeName`

```typescript
// OLD
const changeDir = path.join(changesDir, changeName);
```

With (handles both flat and domain-nested ids):
```typescript
const changeDir = path.join(changesDir, ...changeName.split('/'));
```

- [ ] **Step 6: Run tests**

```bash
pnpm test test/core/archive.test.ts
pnpm test
```

- [ ] **Step 7: Commit**

```bash
git add src/core/archive.ts test/core/archive.test.ts
git commit -m "feat: archive moves to openspec/archive/ and preserves domain hierarchy"
```

---

## Task 6: Update `src/utils/change-utils.ts` and `src/core/planning-home.ts`

**Files:**
- Modify: `src/utils/change-utils.ts`
- Modify: `src/core/planning-home.ts`
- Modify: `test/utils/change-utils.test.ts`

- [ ] **Step 1: Write failing test for domain-nested `createChange`**

Add to `test/utils/change-utils.test.ts`:
```typescript
it('creates change directory at domain-nested path', async () => {
  const result = await createChange(testDir, 'auth/add-login');

  const changeDir = path.join(testDir, 'openspec', 'changes', 'auth', 'add-login');
  const stats = await fs.stat(changeDir);
  expect(stats.isDirectory()).toBe(true);
  expect(result.changeDir).toBe(changeDir);
});

it('throws if change with domain already exists', async () => {
  await createChange(testDir, 'auth/add-login');
  await expect(createChange(testDir, 'auth/add-login')).rejects.toThrow("already exists");
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
pnpm test test/utils/change-utils.test.ts
```

- [ ] **Step 3: Update `createChange` in `src/utils/change-utils.ts`**

The `name` parameter now carries the full id (`auth/add-login`). Split it to validate:

```typescript
import { splitChangeId, validateDomainPath } from './change-path.js';

export async function createChange(
  projectRoot: string,
  name: string,   // now a full id, e.g. "auth/add-login" or "add-login"
  options: CreateChangeOptions = {}
): Promise<CreateChangeResult> {
  const { domain, name: changeName } = splitChangeId(name);

  // Validate change name (last segment)
  const validation = validateChangeName(changeName);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Validate domain segments
  if (domain.length > 0) {
    const domainValidation = validateDomainPath(domain.join('/'));
    if (!domainValidation.valid) {
      throw new Error(domainValidation.error);
    }
  }

  // ... rest of the function is unchanged, except:
  // Build changeDir using the full id (supports slashes)
  const changeDir = path.join(
    options.changesDir ?? path.join(projectRoot, 'openspec', 'changes'),
    ...name.split('/')
  );

  // ... rest unchanged (FileSystemUtils.directoryExists, createDirectory, writeChangeMetadata)
}
```

- [ ] **Step 4: Verify `src/core/planning-home.ts` — `getChangeDir` and `formatChangeLocation`**

Read the current implementation. These two functions call `FileSystemUtils.joinPath(planningHome.changesDir, changeName)`. Since `changeName` is now a slash-separated id, and `FileSystemUtils.joinPath` likely uses `path.join`, this will work on all OSes automatically. Confirm by reading:

```bash
grep -n "joinPath\|getChangeDir\|formatChangeLocation" src/core/planning-home.ts src/utils/file-system.ts
```

If `joinPath` uses `path.join(...parts.split('/'))` or similar, no change is needed. If it doesn't split on `/`, update `getChangeDir`:

```typescript
export function getChangeDir(planningHome: PlanningHome, changeName: string): string {
  return path.join(planningHome.changesDir, ...changeName.split('/'));
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test test/utils/change-utils.test.ts test/core/planning-home.test.ts
pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/change-utils.ts src/core/planning-home.ts test/utils/change-utils.test.ts
git commit -m "feat: createChange and planning-home support domain-nested change ids"
```

---

## Task 7: Update `src/commands/workflow/new-change.ts` — domain selection

**Files:**
- Create: `test/commands/workflow/new-change-domain.test.ts`
- Modify: `src/commands/workflow/new-change.ts`
- Modify: `src/cli/index.ts` (add `--domain` option to `new change` command)

- [ ] **Step 1: Write failing tests for `--domain` flag**

```typescript
// test/commands/workflow/new-change-domain.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { newChangeCommand } from '../../../src/commands/workflow/new-change.js';

// Prevent interactive prompts from firing
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  input: vi.fn(),
}));

describe('newChangeCommand --domain', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-nc-domain-${randomUUID()}`);
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes'), { recursive: true });
    // write a minimal openspec/config.yaml so schema resolution works
    await fs.writeFile(
      path.join(tempDir, 'openspec', 'config.yaml'),
      'schema: spec-driven\n'
    );
    process.chdir(tempDir);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('creates change under domain when --domain provided', async () => {
    await newChangeCommand('add-login', { domain: 'auth', json: true });

    const changeDir = path.join(tempDir, 'openspec', 'changes', 'auth', 'add-login');
    const stat = await fs.stat(changeDir);
    expect(stat.isDirectory()).toBe(true);
  });

  it('creates change under multi-level domain', async () => {
    await newChangeCommand('add-login', { domain: 'auth/oauth', json: true });

    const changeDir = path.join(tempDir, 'openspec', 'changes', 'auth', 'oauth', 'add-login');
    const stat = await fs.stat(changeDir);
    expect(stat.isDirectory()).toBe(true);
  });

  it('throws on invalid domain segment', async () => {
    await expect(
      newChangeCommand('add-login', { domain: 'Auth', json: true })
    ).rejects.toThrow();
  });

  it('throws when non-interactive (json mode) and --domain not provided', async () => {
    // No --domain, --json forces non-interactive path
    await expect(
      newChangeCommand('add-login', { json: true })
    ).rejects.toThrow(/Domain selection is required/);
  });

  it('throws when stdin is not a TTY and --domain not provided', async () => {
    // Simulate non-TTY stdin
    const origIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    try {
      await expect(
        newChangeCommand('add-login', {})
      ).rejects.toThrow(/Domain selection is required/);
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', { value: origIsTTY, configurable: true });
    }
  });

  it('accepts explicit empty --domain as "no domain"', async () => {
    await newChangeCommand('add-login', { domain: '', json: true });
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'add-login');
    const stat = await fs.stat(changeDir);
    expect(stat.isDirectory()).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
pnpm test test/commands/workflow/new-change-domain.test.ts
```

- [ ] **Step 3: Add `domain` to `NewChangeOptions` and validate it**

In `src/commands/workflow/new-change.ts`, update `NewChangeOptions`:

```typescript
export interface NewChangeOptions {
  description?: string;
  goal?: string;
  areas?: string;
  schema?: string;
  domain?: string;       // ← new
  initiative?: string;
  store?: string;
  storePath?: string;
  json?: boolean;
}
```

At the top of `newChangeCommand`, after `assertInitiativeSelectorsHaveReference(options)` and before creating the change, add domain resolution:

```typescript
import { validateDomainPath } from '../../utils/change-path.js';

// Resolve domain. Domain selection is MANDATORY — the CLI must never silently
// default to "no domain" when running non-interactively (agents/CI/--json),
// because the agent should consult the user instead of guessing.
let resolvedDomain: string;

if (options.domain !== undefined) {
  // Explicit --domain (including --domain "" for "no domain")
  const domainValidation = validateDomainPath(options.domain);
  if (!domainValidation.valid) {
    throw new Error(domainValidation.error);
  }
  resolvedDomain = options.domain;
} else {
  // --domain not provided. Decide based on environment.
  const canPromptInteractively = !options.json && process.stdin.isTTY === true;

  if (!canPromptInteractively) {
    // Non-interactive (agent / CI / --json / piped stdin):
    // Refuse to default. Tell the caller (likely an AI agent) to ask the user.
    const existing = await findAllChangeIds(planningHome.changesDir);
    const existingDomains = Array.from(
      new Set(
        existing
          .map((id) => id.split('/').slice(0, -1).join('/'))
          .filter((d) => d.length > 0)
      )
    ).sort();

    const existingHint = existingDomains.length > 0
      ? `\nExisting domains in this project:\n  ${existingDomains.join('\n  ')}`
      : '\n(No domains exist yet in this project.)';

    throw new Error(
      `Domain selection is required and cannot be skipped.\n\n` +
      `This environment does not support interactive prompts ` +
      `(no TTY / --json mode).\n` +
      `If you are an AI agent: please ask the user which domain to place this ` +
      `change under, then re-run with one of:\n\n` +
      `  --domain <path>     e.g. --domain auth/oauth\n` +
      `  --domain ""         to place the change at the root (no domain)\n` +
      existingHint
    );
  }

  // Interactive path: prompt level by level
  resolvedDomain = await selectDomainInteractive(planningHome.changesDir);
}

// Build the full change id: domain/name or just name
const fullId = resolvedDomain ? `${resolvedDomain}/${name}` : name;
```

Then pass `fullId` instead of `name` to `createChange`:
```typescript
const result = await createChange(projectRoot, fullId, { ... });
```

And update `outputForCreatedChange` call to use `fullId`:
```typescript
const payload = outputForCreatedChange(fullId, result.changeDir, result.schema, initiative);
```

- [ ] **Step 4: Implement `selectDomainInteractive` in the same file**

Add this function before `newChangeCommand`:

```typescript
import { findAllChangeIds } from '../../utils/change-path.js';

/**
 * Interactively guides the user to pick or create a domain, level by level.
 * Returns a slash-separated domain string (e.g. "auth/oauth") or "" for no domain.
 */
async function selectDomainInteractive(changesDir: string): Promise<string> {
  const { select, input } = await import('@inquirer/prompts');
  const { validateChangeName } = await import('../../utils/change-utils.js');
  const { promises: fs } = await import('fs');
  const path = await import('path');

  let currentPath = changesDir;
  const selectedSegments: string[] = [];

  while (true) {
    // Discover immediate subdirectories that are domain containers (not leaf changes)
    let subDomains: string[] = [];
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const fullPath = path.join(currentPath, entry.name);
        // Only offer domain containers (directories without .openspec.yaml and without proposal.md)
        let hasYaml = false;
        let hasProposal = false;
        try { await fs.access(path.join(fullPath, '.openspec.yaml')); hasYaml = true; } catch {}
        try { await fs.access(path.join(fullPath, 'proposal.md')); hasProposal = true; } catch {}
        if (!hasYaml && !hasProposal) {
          subDomains.push(entry.name);
        }
      }
    } catch {}
    subDomains.sort();

    const currentDomainLabel = selectedSegments.length > 0
      ? selectedSegments.join('/') + '/'
      : '';

    const choices = [
      {
        name: selectedSegments.length === 0
          ? '[Create here, no domain]'
          : `[Create under ${currentDomainLabel}]`,
        value: '__here__',
      },
      ...subDomains.map(d => ({
        name: currentDomainLabel + d + '/',
        value: d,
      })),
      {
        name: selectedSegments.length === 0 ? '[Create new domain…]' : '[Create new sub-domain…]',
        value: '__new__',
      },
    ];

    const answer = await select({
      message: selectedSegments.length === 0
        ? 'Select domain (optional)'
        : `Place under ${currentDomainLabel}, or go deeper?`,
      choices,
    });

    if (answer === '__here__') {
      return selectedSegments.join('/');
    }

    if (answer === '__new__') {
      let newSegment = '';
      while (true) {
        newSegment = await input({
          message: 'Enter new domain name (kebab-case):',
        });
        const check = validateChangeName(newSegment);
        if (check.valid) break;
        console.log(`Invalid: ${check.error}. Try again.`);
      }
      selectedSegments.push(newSegment);
      return selectedSegments.join('/');
    }

    // Descend into chosen subdomain
    selectedSegments.push(answer);
    currentPath = path.join(currentPath, answer);
  }
}
```

- [ ] **Step 5: Add `--domain` option to `src/cli/index.ts`**

Find the `newCmd` block:
```typescript
newCmd
  .command('change <name>')
  .description('Create a new change directory')
  .option('--description <text>', ...)
  // ...
  .option('--schema <name>', ...)
  .option('--json', 'Output as JSON')
  .action(async (name: string, options: NewChangeOptions) => {
```

Add `--domain` option:
```typescript
  .option('--domain <path>', 'Domain path for the change (e.g. auth/oauth), slash-separated')
```

- [ ] **Step 6: Run tests**

```bash
pnpm test test/commands/workflow/new-change-domain.test.ts
pnpm test
```

- [ ] **Step 7: Commit**

```bash
git add src/commands/workflow/new-change.ts src/cli/index.ts test/commands/workflow/new-change-domain.test.ts
git commit -m "feat: new change command supports domain selection (interactive and --domain flag)"
```

---

## Task 8: Update completion and skill templates

**Files:**
- Modify: `src/commands/completion.ts`
- Modify: `src/core/templates/workflows/archive-change.ts`
- Modify: `src/core/templates/workflows/bulk-archive-change.ts`

- [ ] **Step 1: Update `src/commands/completion.ts`**

`getArchivedChangeIds` already points to `openspec/archive/` after Task 2. Verify the import is `from '../utils/item-discovery.js'` and no further changes are needed here.

Run:
```bash
pnpm test test/commands/completion.test.ts
```

- [ ] **Step 2: Update archive path in `src/core/templates/workflows/archive-change.ts`**

Find all occurrences of the shell snippet:
```bash
mkdir -p "<planningHome.changesDir>/archive"
mv "<changeRoot>" "<planningHome.changesDir>/archive/YYYY-MM-DD-<name>"
```

Replace with:
```bash
mkdir -p "<openspecDir>/archive/<domain-segments>"
mv "<changeRoot>" "<openspecDir>/archive/<domain-segments>/YYYY-MM-DD-<name>"
```

And update the explanatory text block that says "Create an `archive` directory under `planningHome.changesDir`" to say "Create the archive path under `openspecDir/archive/`, preserving domain hierarchy from the change id."

Also update the **Output On Success** example to show `archive/auth/oauth/2025-01-23-add-login/` for domain-nested changes.

- [ ] **Step 3: Update `src/core/templates/workflows/bulk-archive-change.ts`**

Apply the same replacements as Step 2 — same shell snippet, same explanatory text, same output examples.

- [ ] **Step 4: Run full test suite**

```bash
pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add src/commands/completion.ts src/core/templates/workflows/archive-change.ts src/core/templates/workflows/bulk-archive-change.ts
git commit -m "feat: update completion and skill templates for new archive structure"
```

---

## Task 9: Final integration check

- [ ] **Step 1: Build the project**

```bash
pnpm run build
```
Expected: no TypeScript errors.

- [ ] **Step 2: Run the full test suite**

```bash
pnpm test
```
Expected: all green.

- [ ] **Step 3: Manual smoke test — create a domain-nested change**

```bash
node bin/openspec.js new change add-login --domain auth/oauth --json
```
Expected JSON output containing `"id": "auth/oauth/add-login"` and the correct path.

Verify directory was created:
```bash
ls openspec/changes/auth/oauth/
```
Expected: `add-login/` directory exists.

- [ ] **Step 4: Manual smoke test — archive a domain-nested change**

```bash
node bin/openspec.js archive auth/oauth/add-login --yes
```
Expected output: `Change 'auth/oauth/add-login' archived to 'openspec/archive/auth/oauth/<date>-add-login'.`

Verify:
```bash
ls openspec/archive/auth/oauth/
```
Expected: `<date>-add-login/` directory.

- [ ] **Step 4b: Manual smoke test — non-interactive enforcement**

```bash
node bin/openspec.js new change add-something --json
```
Expected: command exits non-zero with an error message containing `Domain selection is required` and instructing the agent to re-run with `--domain <path>` or `--domain ""`.

```bash
node bin/openspec.js new change add-something --domain "" --json
```
Expected: succeeds and creates `openspec/changes/add-something/` (no domain).

- [ ] **Step 5: Commit if any final fixes were needed; otherwise just tag**

```bash
git add -A
git commit -m "fix: integration smoke test fixes" # only if needed
```
