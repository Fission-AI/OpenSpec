## Context

See [proposal.md](proposal.md#why).

OpenSpec already routes every skill-capable tool through one pipeline: `AI_TOOLS` metadata in `src/core/config.ts` drives tool detection (`available-tools.ts`), selection and validation (`init.ts`), skill path resolution (`shared/skill-paths.ts`), generation, version drift, and update. Tools that expose no custom command files simply have no `ToolCommandAdapter`, which `command-surface.ts` classifies as capability `none`.

DeepSeek Harness parses skills from fixed local roots (see the [upstream filesystem provider](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/skill/skill-filesystem)): `<project>/.dsh/skills` (rank 100), `<project>/.agents/skills` (rank 200), and user-level `~/.dsh/skills` (rank 400). It discovers only one level (`<root>/<name>/SKILL.md` or `<root>/<name>.md`), requires `name` (kebab-case) and non-empty `description` frontmatter, tolerates extra fields, and exposes skills to the model through `<available_skills>` plus a `skill` tool; users can also trigger them with the `/name` gesture. OpenSpec's generated `SKILL.md` files already satisfy every dsh constraint, so no template or frontmatter changes are needed.

## Goals / Non-Goals

**Goals:**

- Add one `dsh` entry to `AI_TOOLS` that opts into the existing project-local skills pipeline.
- Make first-time setup, auto-detection, refresh, and profile/delivery drift work through existing generic code.
- Lock the dsh path and invocation behavior with focused tests.

**Non-Goals:**

- A dsh command adapter or any `.dsh/commands/` output — dsh has no file-based command surface.
- A global `~/.dsh/skills` install target — dsh has a higher-priority project root and OpenSpec manages per-project artifacts.
- Reclassifying dsh as `skills-invocable` in `command-surface.ts`; that belongs to the in-flight `add-tool-command-surface-capabilities` work. Until then dsh shares the current adapterless behavior of Rovo Dev CLI and Kimi Code.
- Changing generated skill templates or frontmatter.

## Decisions

### 1. Represent dsh as an adapterless, project-local tool entry

Add to `src/core/config.ts`:

```ts
{
  name: 'DeepSeek Harness',
  value: 'dsh',
  available: true,
  successLabel: 'DeepSeek Harness',
  skillsDir: '.dsh',
},
```

`resolveToolSkillsDir()` then resolves to `<projectRoot>/.dsh/skills`, which is dsh's rank-100 project root. Nothing else in init/update/selection needs a code change because those paths derive from `AI_TOOLS`.

Alternative considered: write to `~/.dsh/skills` via `globalSkillsDir`. Rejected because the project root outranks the user root, keeps artifacts repo-local and reviewable, and matches OpenSpec's project-scoped update/removal semantics (MiniMax Code's global-only design exists to work around a tool that only reads the user root, which is not dsh's case).

### 2. Detect dsh from its `.dsh` directory

Use the existing `skillsDir` detection, which requires a directory. This recognizes both a bare `.dsh` project root and a populated `.dsh/skills` tree, but rejects a regular file named `.dsh`.

Explicit `detectionPaths` are unnecessary: `.dsh/skills` already implies a `.dsh` directory, and overrides accept file signals for tools that need them. Auto-detection identifies a tool root; it does not guarantee every child path is writable. A regular file at `.dsh/skills` remains a filesystem conflict reported during generation, as for other directory-based tools.

### 3. No command adapter; inherit capability `none`

`resolveCommandSurfaceCapability('dsh')` returns `none` because no adapter is registered. Consequences, all existing generic behavior:

- `delivery=both` / `skills`: skills generated; init reports `Commands skipped for: dsh (no adapter)`.
- `delivery=commands`: no dsh artifacts and the existing zero-artifact correction is printed.

Alternative considered: special-case dsh as `skills-invocable` like Codex so commands-only delivery keeps skills. Semantically dsh's skill tool + `/name` gesture are invocable, but the current shipped model only special-cases Codex; widening it here would duplicate the open `add-tool-command-surface-capabilities` change and expand this change's test matrix. Deferred deliberately.

### 4. Use the default `/openspec-*` skill reference spelling

dsh's user-facing `/name` gesture makes `/openspec-propose` a real, typeable invocation, so the default transformer (`getSkillReferenceTransformer` fallback) is correct. The model side can call the `skill` tool by name regardless.

Alternative considered: add `dsh` to `NATURAL_LANGUAGE_SKILL_TOOLS` (like Rovo). Rejected because Rovo has no slash-like gesture at all, while dsh documents `/name`.

### 5. No shared-root ownership work

`.dsh/skills` is used by no other `AI_TOOLS` entry, so `shared-skill-target.ts` marker/reconciliation logic does not apply. If the same repo also generates the `.agents` target, dsh will prefer its rank-100 `.dsh/skills` tree and there is no single-writer conflict to resolve.

### 6. No frontmatter or template changes

OpenSpec writes `---` first line, kebab-case `name`, non-empty `description`, one-level `<name>/SKILL.md`, and extra fields such as `license`, `compatibility`, and `metadata`. The upstream parser accepts these extra fields. Tests parse every generated skill's YAML frontmatter and check required names and descriptions.

## Risks / Trade-offs

- [Commands-only delivery leaves dsh with zero artifacts] → Mitigation: init/update already print the existing `delivery` correction for capability-`none` tools; docs list dsh as skills-only, and the deferred capability work is the real fix.
- [`.dsh` detection can fire on a stale empty directory after commands-only removal] → Mitigation: interactive init shows detected-but-unconfigured tools as unselected in extend mode; behavior matches Rovo and is a cosmetic pre-selection, never a forced write.
- [dsh fail-closed parsing could silently drop skills] → Mitigation: generated files already comply; the init regression test checks frontmatter shape, and manual smoke testing against a real dsh session is in tasks.
- [Same-name skills under `.dsh/skills` and `.agents/skills`] → Mitigation: dsh's rank ordering (100 < 200) deterministically prefers `.dsh/skills`; this is upstream behavior, documented in supported-tools.

## Migration Plan

No data migration is required. Reverting the entry stops future dsh detection and generation but leaves existing `.dsh/skills` files in user projects. Remove the generated `openspec-*` folders separately if rollback is needed; preserve user-authored skills. Projects using the shared `.agents` target today keep working; selecting `dsh` on a later `openspec init` writes the dedicated higher-priority root without touching `.agents`.

## Open Questions

_None._
