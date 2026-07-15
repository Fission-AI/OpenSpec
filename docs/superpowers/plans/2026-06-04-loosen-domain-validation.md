# Loosen Domain Validation + Skill Soft Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Demote OpenSpec's "domain segments must be lowercase kebab-case" rule from CLI hard-validation to a skill-surfaced recommendation, so AI agents stop silently lowercase-and-kebab-casing user-provided domain literals like `Performance/SignificanceManager`.

**Architecture:** CLI's `validateDomainPath` is rewritten to a lenient filesystem-safety check (allows letters of any case, digits, hyphens, underscores, dots; rejects empty, `.`, `..`, whitespace). Both `openspec-propose` and `openspec-new-change` skill templates get a soft-check step that compares user input against the kebab-case pattern and uses AskUserQuestion to offer convert / keep-as-is / pick-different. Plus a Guardrail forbidding silent transformation. The mandatory-domain CLI error gains a cross-platform case-insensitivity note.

**Tech Stack:** TypeScript, Node.js `fs/promises`, Vitest, the existing OpenSpec skill template machinery.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/change-path.ts` | Modify (lines 24–42) | Rewrite `validateDomainPath` to lenient mode |
| `test/utils/change-path.test.ts` | Modify (lines 48–78) | Flip uppercase/underscore tests; add CamelCase/dots/`.`/`..`/whitespace cases |
| `src/commands/workflow/new-change.ts` | Modify (mandatory-domain error block, ~line 240–260) | Append cross-platform case note |
| `test/commands/workflow/new-change-domain.test.ts` | Modify | Replace "rejects uppercase" with "accepts uppercase"; keep double-slash reject; add cross-platform note assertion |
| `src/core/templates/workflows/propose.ts` | Modify (skill + command templates) | Insert soft-check step before `openspec new change`; add Guardrail |
| `src/core/templates/workflows/new-change.ts` | Modify (skill + command templates) | Same |
| `test/core/templates/skill-templates-parity.test.ts` | Modify | Update 4 SHA-256 hashes (2 functions × 2 templates) + 2 generated payloads |

---

## Task 1: Loosen `validateDomainPath`

**Files:**
- Modify: `src/utils/change-path.ts:24-42`
- Modify: `test/utils/change-path.test.ts:48-78`

- [ ] **Step 1: Replace the `validateDomainPath` test block**

Replace lines 48-78 of `test/utils/change-path.test.ts` with:

```typescript
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

  it('accepts uppercase segment (lenient mode)', () => {
    expect(validateDomainPath('Auth')).toEqual({ valid: true });
  });

  it('accepts CamelCase segment (lenient mode)', () => {
    expect(validateDomainPath('Performance/SignificanceManager')).toEqual({ valid: true });
  });

  it('accepts segment with underscore (lenient mode)', () => {
    expect(validateDomainPath('my_domain')).toEqual({ valid: true });
  });

  it('accepts segment with dot (e.g. v1.2)', () => {
    expect(validateDomainPath('release/v1.2')).toEqual({ valid: true });
  });

  it('accepts mixed-case multi-level path', () => {
    expect(validateDomainPath('Auth/OAuth/v2_beta')).toEqual({ valid: true });
  });

  it('rejects empty segment (double slash)', () => {
    const result = validateDomainPath('auth//oauth');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects leading slash', () => {
    const result = validateDomainPath('/auth');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects trailing slash', () => {
    const result = validateDomainPath('auth/');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it("rejects pure-dot segment '.'", () => {
    const result = validateDomainPath('.');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/'\.'/);
  });

  it("rejects pure-dot segment '..'", () => {
    const result = validateDomainPath('foo/..');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/'\.\.'/);
  });

  it('rejects segment containing whitespace', () => {
    const result = validateDomainPath('foo bar');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('foo bar');
  });

  it('rejects segment with backslash', () => {
    const result = validateDomainPath('foo\\bar');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('foo\\bar');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node_modules/.bin/vitest run test/utils/change-path.test.ts
```

Expected: failures on `accepts uppercase`, `accepts CamelCase`, `accepts underscore`, `accepts dot`, `accepts mixed-case`, `rejects pure-dot '.'`, `rejects pure-dot '..'`, `rejects whitespace`, `rejects backslash`.

- [ ] **Step 3: Rewrite `validateDomainPath` in `src/utils/change-path.ts`**

Replace lines 24-42 with:

```typescript
/**
 * Validates that a domain path string (e.g. "auth/oauth") is filesystem-safe.
 *
 * Lenient mode: accepts any segment composed of letters (any case), digits,
 * hyphens, underscores, and dots. Rejects empty segments (e.g. "//" or
 * leading/trailing slash), pure-dot segments ("." or ".."), whitespace, and
 * backslashes. Empty string means "no domain" and is always valid.
 *
 * Note: lowercase kebab-case is the OpenSpec recommendation but NOT enforced
 * here. Skills (openspec-propose, openspec-new-change) surface the
 * recommendation to users via AskUserQuestion. See
 * docs/superpowers/specs/2026-06-04-loosen-domain-validation-design.md.
 */
export function validateDomainPath(domainPath: string): ValidationResult {
  if (domainPath === '') return { valid: true };

  const ALLOWED_SEGMENT = /^[A-Za-z0-9._-]+$/;
  const segments = domainPath.split('/');

  for (const segment of segments) {
    if (segment === '') {
      return {
        valid: false,
        error: `Domain path '${domainPath}' contains an empty segment (double slash, leading slash, or trailing slash)`,
      };
    }
    if (segment === '.' || segment === '..') {
      return {
        valid: false,
        error: `Domain segment '${segment}' is not allowed (filesystem traversal)`,
      };
    }
    if (!ALLOWED_SEGMENT.test(segment)) {
      return {
        valid: false,
        error: `Domain segment '${segment}' contains invalid characters; allowed: letters, digits, '-', '_', '.'`,
      };
    }
  }

  return { valid: true };
}
```

Also remove the now-unused `validateChangeName` import IF nothing else in the file uses it. Verify by:

```bash
node_modules/.bin/grep -n "validateChangeName" src/utils/change-path.ts
```

If only the import line matches, remove it. (Note: keep the `ValidationResult` type import.)

- [ ] **Step 4: Run tests to verify they pass**

```bash
node_modules/.bin/vitest run test/utils/change-path.test.ts
```

Expected: all 16+ tests pass.

- [ ] **Step 5: Run full suite to catch regressions**

```bash
node_modules/.bin/vitest run
```

Expected: any pre-existing test that depended on uppercase being rejected (most likely in `test/commands/workflow/new-change-domain.test.ts`) now fails. We fix those in Task 5. Other tests should pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils/change-path.ts test/utils/change-path.test.ts
git commit -m "feat: loosen validateDomainPath to lenient filesystem-safety check"
```

---

## Task 2: Append cross-platform case note to mandatory-domain error

**Files:**
- Modify: `src/commands/workflow/new-change.ts` (the mandatory-domain throw block)

- [ ] **Step 1: Locate the mandatory-domain throw**

Run:
```bash
node_modules/.bin/grep -n "Domain selection is required" src/commands/workflow/new-change.ts
```

Expected: one match around line 245-260, inside the `if (!canPromptInteractively)` block.

- [ ] **Step 2: Append the cross-platform note line**

Find the line:
```typescript
existingHint
);
```

Just before that line, change `existingHint` to be followed by a `crossPlatformNote`:

Replace this section in `src/commands/workflow/new-change.ts`:

```typescript
      throw new Error(
        `Domain selection is required and cannot be skipped.\n\n` +
          `This environment does not support interactive prompts ` +
          `(no TTY / --json mode).\n` +
          `If you are an AI agent: please ask the user which domain to place ` +
          `this change under, then re-run with one of:\n\n` +
          `  --domain <path>     e.g. --domain auth/oauth\n` +
          `  --domain ""         to place the change at the root (no domain)\n` +
          existingHint
      );
```

With:

```typescript
      throw new Error(
        `Domain selection is required and cannot be skipped.\n\n` +
          `This environment does not support interactive prompts ` +
          `(no TTY / --json mode).\n` +
          `If you are an AI agent: please ask the user which domain to place ` +
          `this change under, then re-run with one of:\n\n` +
          `  --domain <path>     e.g. --domain auth/oauth\n` +
          `  --domain ""         to place the change at the root (no domain)\n` +
          existingHint +
          `\n\nNote: domain segments are case-preserving. On case-insensitive ` +
          `file systems (Windows, macOS default APFS) different-case variants ` +
          `of the same name (e.g. 'Performance' vs 'performance') will collide.`
      );
```

- [ ] **Step 3: Run existing domain tests to confirm nothing broke**

```bash
node_modules/.bin/vitest run test/commands/workflow/new-change-domain.test.ts
```

The existing assertion `toThrow(/Domain selection is required/)` still matches (the prefix is unchanged). Expected: existing 9 tests still pass; the test that asserts uppercase rejection (~line 67) now fails — we fix in Task 5.

- [ ] **Step 4: Add a test asserting the cross-platform note appears**

Append to the `'non-interactive enforcement (mandatory domain decision)'` describe block in `test/commands/workflow/new-change-domain.test.ts`:

```typescript
    it('mandatory error includes cross-platform case note', async () => {
      try {
        await newChangeCommand('add-login', { json: true });
        throw new Error('expected newChangeCommand to throw');
      } catch (err) {
        const msg = (err as Error).message;
        expect(msg).toMatch(/case-insensitive/);
        expect(msg).toMatch(/Performance.*performance/);
      }
    });
```

- [ ] **Step 5: Run the new test**

```bash
node_modules/.bin/vitest run test/commands/workflow/new-change-domain.test.ts -t "case note"
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/commands/workflow/new-change.ts test/commands/workflow/new-change-domain.test.ts
git commit -m "feat: add cross-platform case note to mandatory-domain error"
```

---

## Task 3: Update `openspec-propose` skill — soft check + Guardrail

**Files:**
- Modify: `src/core/templates/workflows/propose.ts` (both `getOpsxProposeSkillTemplate` and `getOpsxProposeCommandTemplate`)
- Modify: `test/core/templates/skill-templates-parity.test.ts`

- [ ] **Step 1: Insert soft-check step in the skill template**

In `src/core/templates/workflows/propose.ts`, find the `**Steps**` section in the `instructions` field (around line 27). The current Step 2 reads:

```
2. **Create the change directory**
   ```bash
   openspec new change "<name>"
   ```
   This creates a scaffolded change in the planning home resolved by the CLI with `.openspec.yaml`.
```

Replace it with:

```
2. **Determine the domain (mandatory; never skip)**

   Use the **AskUserQuestion tool** to ask:
   > "What domain should this change live under? (e.g. \`auth\`, \`auth/oauth\`, or leave empty for no domain.) OpenSpec recommends lowercase kebab-case."

   When the user replies, check whether their answer matches \`/^[a-z0-9-]+(\\/[a-z0-9-]+)*$/\` (or is empty).

   - **If it matches** (or is empty): proceed to Step 3 with that value.
   - **If it does not match** (e.g. user typed \`Performance/SignificanceManager\`): compute a kebab-case suggestion (lowercase letters, split CamelCase boundaries with hyphens, replace underscores with hyphens, e.g. \`Performance/SignificanceManager\` → \`performance/significance-manager\`). Then use **AskUserQuestion** again with these options:
     - \`Convert to <suggestion>\` (recommended)
     - \`Keep as-is: <user-original>\` (CLI accepts it; just doesn't match the convention)
     - \`Pick a different domain\` (Other → re-ask)

   **NEVER convert silently.** The user owns their literal — only transform with explicit consent.

3. **Create the change directory**
   \`\`\`bash
   openspec new change "<name>" --domain "<resolved-domain>"
   \`\`\`
   Pass the value the user chose in Step 2 as \`--domain\` (use \`--domain ""\` for "no domain"). This creates a scaffolded change in the planning home resolved by the CLI with \`.openspec.yaml\`.
```

Renumber subsequent steps (4, 5, 6) accordingly.

- [ ] **Step 2: Add Guardrail to the skill template**

In the same `instructions` field, find the `**Guardrails**` block (last section). Append:

```
- **Don't silently transform user-specified literals** - When the user provides a domain that doesn't match OpenSpec's kebab-case recommendation, present the choice via AskUserQuestion (convert / keep as-is / pick different) and let the user decide. NEVER lowercase, kebab-case, or otherwise modify the literal on your own. (Deriving a kebab-case name from a freeform description like "add user auth" is fine — there's no specific literal there to preserve.)
```

- [ ] **Step 3: Apply the same insertion to the command template**

In `getOpsxProposeCommandTemplate.content` (around line 119–225), repeat both edits — Step 2 insertion and Guardrail addition — so the slash-command and skill stay in sync. Use the exact same text.

- [ ] **Step 4: Run parity tests to observe the new hashes**

```bash
node_modules/.bin/vitest run test/core/templates/skill-templates-parity.test.ts
```

Expected: 2 failures (`getOpsxProposeSkillTemplate`, `getOpsxProposeCommandTemplate`, and `openspec-propose` generated payload). The output diff prints actual hashes prefixed with `+`. Note them.

- [ ] **Step 5: Update expected hashes**

In `test/core/templates/skill-templates-parity.test.ts`, replace:
- the value of `getOpsxProposeSkillTemplate` in `EXPECTED_FUNCTION_HASHES` with the new actual hash
- the value of `getOpsxProposeCommandTemplate` in `EXPECTED_FUNCTION_HASHES` with the new actual hash
- the value of `'openspec-propose'` in `EXPECTED_GENERATED_SKILL_CONTENT_HASHES` with the new actual hash

- [ ] **Step 6: Re-run parity test**

```bash
node_modules/.bin/vitest run test/core/templates/skill-templates-parity.test.ts
```

Expected: all 30 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/core/templates/workflows/propose.ts test/core/templates/skill-templates-parity.test.ts
git commit -m "feat(propose-skill): add domain soft-check step and don't-transform guardrail"
```

---

## Task 4: Update `openspec-new-change` skill — soft check + Guardrail

**Files:**
- Modify: `src/core/templates/workflows/new-change.ts` (both `getNewChangeSkillTemplate` and `getOpsxNewCommandTemplate`)
- Modify: `test/core/templates/skill-templates-parity.test.ts`

- [ ] **Step 1: Insert the soft-check step**

In `src/core/templates/workflows/new-change.ts`, find Step 3 of `getNewChangeSkillTemplate.instructions` (the `openspec new change "<name>"` block, around line 38–43). Insert a new step BEFORE it:

```
3. **Determine the domain (mandatory; never skip)**

   Use the **AskUserQuestion tool** to ask:
   > "What domain should this change live under? (e.g. \`auth\`, \`auth/oauth\`, or leave empty for no domain.) OpenSpec recommends lowercase kebab-case."

   When the user replies, check whether their answer matches \`/^[a-z0-9-]+(\\/[a-z0-9-]+)*$/\` (or is empty).

   - **If it matches** (or is empty): proceed with that value.
   - **If it does not match** (e.g. \`Performance/SignificanceManager\`): compute a kebab-case suggestion (lowercase letters, split CamelCase boundaries with hyphens, replace underscores with hyphens). Then use **AskUserQuestion** with:
     - \`Convert to <suggestion>\` (recommended)
     - \`Keep as-is: <user-original>\`
     - \`Pick a different domain\`

   **NEVER convert silently.**
```

The current Step 3 (`Create the change directory`) becomes Step 4. Update its bash to pass the resolved domain:

```bash
openspec new change "<name>" --domain "<resolved-domain>"
```

Renumber subsequent steps (5, 6, 7) accordingly.

- [ ] **Step 2: Add Guardrail**

Append to the `**Guardrails**` block of `getNewChangeSkillTemplate.instructions`:

```
- **Don't silently transform user-specified literals** - When the user provides a domain that doesn't match OpenSpec's kebab-case recommendation, present the choice via AskUserQuestion (convert / keep as-is / pick different) and let the user decide. NEVER lowercase, kebab-case, or otherwise modify the literal on your own.
```

- [ ] **Step 3: Apply the same edits to the command template**

In `getOpsxNewCommandTemplate.content` (lower half of the file), insert the same new step + same Guardrail.

- [ ] **Step 4: Run parity tests to observe the new hashes**

```bash
node_modules/.bin/vitest run test/core/templates/skill-templates-parity.test.ts
```

Expected: 2 failures (`getNewChangeSkillTemplate`, `getOpsxNewCommandTemplate`, and `openspec-new-change` generated payload). Note the new actual hashes from the diff.

- [ ] **Step 5: Update expected hashes**

In `test/core/templates/skill-templates-parity.test.ts`, replace:
- `getNewChangeSkillTemplate` in `EXPECTED_FUNCTION_HASHES`
- `getOpsxNewCommandTemplate` in `EXPECTED_FUNCTION_HASHES`
- `'openspec-new-change'` in `EXPECTED_GENERATED_SKILL_CONTENT_HASHES`

- [ ] **Step 6: Re-run parity test**

```bash
node_modules/.bin/vitest run test/core/templates/skill-templates-parity.test.ts
```

Expected: all 30 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/core/templates/workflows/new-change.ts test/core/templates/skill-templates-parity.test.ts
git commit -m "feat(new-change-skill): add domain soft-check step and don't-transform guardrail"
```

---

## Task 5: Adjust the existing "rejects uppercase" domain test

**Files:**
- Modify: `test/commands/workflow/new-change-domain.test.ts`

The current test asserts uppercase domains throw. With the lenient validation from Task 1, they no longer throw. Flip the assertion.

- [ ] **Step 1: Find the test**

```bash
node_modules/.bin/grep -n "rejects invalid domain segment" test/commands/workflow/new-change-domain.test.ts
```

Expected: one match around line 64–68.

- [ ] **Step 2: Replace the test**

Find:

```typescript
  it('rejects invalid domain segment (uppercase)', async () => {
    await expect(
      newChangeCommand('add-login', { domain: 'Auth', json: true })
    ).rejects.toThrow();
  });
```

Replace with:

```typescript
  it('accepts uppercase / CamelCase domain (lenient mode)', async () => {
    await newChangeCommand('add-login', { domain: 'Performance/SignificanceManager', json: true });
    const changeDir = path.join(
      tempDir,
      'openspec',
      'changes',
      'Performance',
      'SignificanceManager',
      'add-login'
    );
    const stat = await fs.stat(changeDir);
    expect(stat.isDirectory()).toBe(true);
  });
```

- [ ] **Step 3: Run the file**

```bash
node_modules/.bin/vitest run test/commands/workflow/new-change-domain.test.ts
```

Expected: all tests pass (the new test creates the directory; double-slash test still rejects).

- [ ] **Step 4: Commit**

```bash
git add test/commands/workflow/new-change-domain.test.ts
git commit -m "test: assert uppercase/CamelCase domain accepted in lenient mode"
```

---

## Task 6: Final integration check + smoke tests

- [ ] **Step 1: Build**

```bash
node build.js
```
Expected: `✅ Build completed successfully!`

- [ ] **Step 2: Run the full test suite**

```bash
node_modules/.bin/vitest run
```
Expected: all green (1696+ tests pass, 0 failures).

- [ ] **Step 3: Smoke test — uppercase domain via CLI**

Since openspec is `npm link`-ed to this dir, dist updates are live for the global `openspec`.

```bash
SMOKE_DIR="/tmp/openspec-loosen-smoke-$$" && \
  mkdir -p "$SMOKE_DIR/openspec/changes" && \
  echo 'schema: spec-driven' > "$SMOKE_DIR/openspec/config.yaml" && \
  cd "$SMOKE_DIR" && \
  openspec new change foo --json --domain "Performance/SignificanceManager"; \
  echo "exit=$?"; \
  ls openspec/changes/Performance/SignificanceManager/foo/ ; \
  cd / && rm -rf "$SMOKE_DIR"
```

Expected: exit 0; JSON output containing `"id": "Performance/SignificanceManager/foo"`; the directory listing shows `.openspec.yaml` (or proposal.md).

- [ ] **Step 4: Smoke test — invalid domain still rejected**

```bash
SMOKE_DIR="/tmp/openspec-loosen-smoke-$$" && \
  mkdir -p "$SMOKE_DIR/openspec/changes" && \
  echo 'schema: spec-driven' > "$SMOKE_DIR/openspec/config.yaml" && \
  cd "$SMOKE_DIR" && \
  openspec new change foo --json --domain "auth//oauth"; \
  echo "exit=$?"; \
  cd / && rm -rf "$SMOKE_DIR"
```

Expected: exit 1; error message contains `empty segment`.

- [ ] **Step 5: Smoke test — `..` rejected**

```bash
SMOKE_DIR="/tmp/openspec-loosen-smoke-$$" && \
  mkdir -p "$SMOKE_DIR/openspec/changes" && \
  echo 'schema: spec-driven' > "$SMOKE_DIR/openspec/config.yaml" && \
  cd "$SMOKE_DIR" && \
  openspec new change foo --json --domain "auth/.."; \
  echo "exit=$?"; \
  cd / && rm -rf "$SMOKE_DIR"
```

Expected: exit 1; error message contains `filesystem traversal`.

- [ ] **Step 6: Final commit (only if integration fixes were needed)**

```bash
git status
# If clean: nothing to commit; skip.
# Otherwise: review, stage, commit with a descriptive message.
```
