# Domain Archive Upstream Reimplementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reimplement the approved multi-level domain, sibling archive, mandatory domain decision, and lenient domain validation requirements on official OpenSpec 1.6.0 at upstream commit `0a99f41`.

**Architecture:** Add `src/utils/change-path.ts` as the canonical path and discovery layer. Route both local roots and registered stores through `ResolvedOpenSpecRoot`, whose archive directory becomes `openspec/archive`; all CLI, workflow, discovery, archive, completion, initialization, and generated-agent consumers use the same helpers and root fields.

**Tech Stack:** TypeScript, Node.js filesystem APIs, Commander, `@inquirer/prompts`, Vitest, pnpm.

## Global Constraints

- Preserve official OpenSpec 1.6.0 Store and root-selection behavior.
- Change IDs use forward-slash relative paths such as `auth/oauth/add-login` on every OS.
- Leaf change names remain lowercase kebab-case; domain segments are case-preserving and filesystem-safe.
- Non-interactive or JSON creation requires an explicit `--domain`, including `--domain ""` for root placement.
- Legacy `openspec/changes/archive` is not created and is ignored during active-change discovery.
- No automatic migration of legacy archives.

---

### Task 1: Canonical domain path helpers

**Files:**
- Create: `src/utils/change-path.ts`
- Create: `test/utils/change-path.test.ts`

**Interfaces:**
- Produces: `splitChangeId(id)`, `validateDomainPath(domainPath)`, `buildArchivePath(archiveDir, changeId, date)`, `findAllChangeIds(changesDir)`, and `findAllArchivedChangeIds(archiveDir)`.
- Discovery recognizes `.openspec.yaml` or `proposal.md`, returns sorted forward-slash IDs, skips hidden directories, and skips only the root-level legacy `archive` directory for active changes.

- [ ] Write failing tests for root, one-level, and multi-level IDs; archive path preservation; lenient valid segments; traversal, whitespace, backslash, empty, and leading-dot rejection; recursive discovery; and legacy archive exclusion.
- [ ] Run `node_modules/.bin/vitest.cmd run test/utils/change-path.test.ts` and confirm the module-not-found failure.
- [ ] Implement the five exported helpers with an internal recursive walker and an explicit `skipLegacyArchive` option.
- [ ] Run the helper tests and confirm all pass.

### Task 2: Root structure and Store parity

**Files:**
- Modify: `src/core/openspec-root.ts`
- Modify: `src/core/root-selection.ts`
- Modify: `src/core/init.ts`
- Modify: `src/utils/change-utils.ts`
- Modify: Store/root fixtures and tests under `test/core`, `test/commands`, `test/helpers`, and `test/cli-e2e`.

**Interfaces:**
- `OPENSPEC_ARCHIVE_DIR` becomes `openspec/archive`.
- Every `ResolvedOpenSpecRoot.archiveDir` becomes `<root>/openspec/archive`.
- Initialization anchors `openspec/specs` and `openspec/archive`, never `openspec/changes/archive`.

- [ ] Update root, Store, init, and create-change tests to expect sibling archive layout.
- [ ] Run the focused tests and confirm failures reference the old nested archive path.
- [ ] Change root constants, root construction, initialization, scaffold, and fixture paths to the sibling archive.
- [ ] Run focused root/Store/init tests and confirm local and registered Store behavior passes.

### Task 3: Recursive consumers and slash-ID validation

**Files:**
- Modify: `src/utils/item-discovery.ts`
- Modify: `src/core/list.ts`
- Modify: `src/core/view.ts`
- Modify: `src/commands/workflow/shared.ts`
- Modify: `src/core/planning-home.ts` if path formatting requires normalization.
- Modify: corresponding tests.

**Interfaces:**
- All active consumers call `findAllChangeIds`.
- Archived consumers call `findAllArchivedChangeIds(root.archiveDir)`.
- `validateChangeExists` validates the final change segment strictly and domain segments with `validateDomainPath`.

- [ ] Add failing nested-domain tests for list, view, item discovery, available changes, and existence validation.
- [ ] Replace top-level directory scans with canonical discovery helpers.
- [ ] Resolve paths with split ID segments and preserve forward-slash IDs in output.
- [ ] Run focused consumer tests and confirm all pass.

### Task 4: Domain-aware creation with mandatory user decision

**Files:**
- Modify: `src/utils/change-utils.ts`
- Modify: `src/commands/workflow/new-change.ts`
- Modify: `src/cli/index.ts`
- Create: `test/commands/workflow/new-change-domain.test.ts`
- Modify: existing CLI and Store tests that create changes non-interactively.

**Interfaces:**
- `NewChangeOptions.domain?: string` and CLI `--domain <path>`.
- `createChange(root, fullId, options)` validates domain and leaf name independently.
- Interactive creation selects or creates domain levels; JSON/no-TTY creation without `domain` emits an actionable error and existing-domain hints.

- [ ] Add failing tests for local and Store root creation, explicit empty domain, nested domain, lenient casing, invalid paths, and mandatory non-interactive enforcement.
- [ ] Implement slash-ID creation and interactive domain selection without changing Store selection semantics.
- [ ] Add `--domain` to Commander and update all scripted tests to state `--domain ""` where root placement is intended.
- [ ] Run new-change, artifact workflow, Store, and root-selection tests.

### Task 5: Domain-preserving archive and spec application

**Files:**
- Modify: `src/core/archive.ts`
- Modify: `src/core/specs-apply.ts` if domain prefix is not already supported.
- Modify: `test/core/archive.test.ts`
- Modify: Store archive E2E tests.

**Interfaces:**
- Archive source is `<changesDir>/<domain...>/<name>`.
- Archive destination is `buildArchivePath(root.archiveDir, changeId, date)`.
- Delta specs from a domain change apply beneath the matching domain prefix in `openspec/specs`.

- [ ] Add failing root, nested-domain, Store, collision, and domain-prefixed spec-apply tests.
- [ ] Use recursive selection, slash-ID source resolution, recursive parent creation, and canonical archive path building.
- [ ] Pass the domain prefix into spec target resolution while keeping root-level behavior unchanged.
- [ ] Run archive and Store archive tests.

### Task 6: Agent templates, completions, and user guidance

**Files:**
- Modify: `src/core/templates/workflows/propose.ts`
- Modify: `src/core/templates/workflows/new-change.ts`
- Modify: `src/core/templates/workflows/ff-change.ts`
- Modify: `src/core/templates/workflows/onboard.ts`
- Modify: `src/core/templates/workflows/archive-change.ts`
- Modify: `src/core/templates/workflows/bulk-archive-change.ts`
- Modify: template parity tests and completion tests.

**Interfaces:**
- Creation templates ask for a mandatory domain, recommend kebab-case, and never silently transform a literal.
- Archive templates derive the domain from the full change ID and target `openspec/archive/<domain>/YYYY-MM-DD-<name>`.
- Generated commands preserve `--store` and add the resolved `--domain`.

- [ ] Add/update template assertions before changing generated content.
- [ ] Update all creation and archive guidance, including fast-forward and onboarding flows.
- [ ] Refresh parity hashes from deterministic generated content.
- [ ] Run template, completion, init, and update tests.

### Task 7: Integration verification

**Files:**
- Modify only files required by failures proven to be regressions from Tasks 1-6.

- [ ] Run `node build.js` and confirm TypeScript compilation succeeds.
- [ ] Run `node_modules/.bin/vitest.cmd run` and confirm zero failures.
- [ ] Smoke-test local root and registered Store creation with `--domain "Performance/SignificanceManager"`.
- [ ] Smoke-test `auth//oauth`, `auth/..`, and missing non-interactive `--domain` failures.
- [ ] Smoke-test archiving a nested change to sibling `openspec/archive` with its domain preserved.
- [ ] Review `git diff --check`, `git status`, and the diff against `upstream/main`.
