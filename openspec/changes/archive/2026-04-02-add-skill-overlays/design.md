## Context

OpenSpec's plugin system (added in `feat/add-plugin-system`) provides hooks, gates, and schemas at runtime — but has no mechanism to influence the content of generated skills and commands. The `openspec update` command produces identical skill files regardless of which plugins are active. This means domain-specific instructions (e.g., orchestration modes for Odoo development) must be maintained out-of-band and are lost on every `openspec update`.

The `generateSkillContent()` function already accepts a `transformInstructions` callback, currently used only for OpenCode's hyphen-based command reference transformation. This existing hook is the natural injection point for plugin overlays.

## Goals / Non-Goals

**Goals:**
- Plugins can declare content to append to specific workflow skills/commands
- `openspec update` reads overlay declarations and applies them during generation
- Overlay injection composes cleanly with existing `transformInstructions` pipeline
- Design is extensible to future overlay operations (prepend, replace_section) without breaking changes
- PR-able to upstream Fission-AI/OpenSpec

**Non-Goals:**
- `replace_section` or `prepend` operations (future work)
- Overlay content validation or linting
- Runtime overlay injection (only at `openspec update` time)
- Plugin-to-plugin overlay ordering conflicts (whitelist order is deterministic)
- Overlay injection during `openspec init` — plugins may not be configured yet at init time; overlays only activate during `openspec update`

## Decisions

### D1: Overlay schema in plugin.yaml

```yaml
skill_overlays:
  <workflow-id>:
    append: <relative-path-to-file>
```

**Why this shape**: Each workflow ID maps to a single operation object. Using an object (`{ append: "file.md" }`) instead of a bare string allows future operations (`prepend`, `replace_section`) to be added as sibling keys without schema migration. The Zod schema uses `z.record()` for workflow IDs (not a fixed enum) because workflow IDs are defined by profiles and may vary.

**Zod strategy**: Use `z.object({ append: z.string() }).strict()` for the overlay operation object. `.strict()` rejects unknown keys now (e.g., `{ unknown_op: "file.md" }` fails validation), while new operations (`prepend`, `replace_section`) can be added to the schema definition in future versions without migration. Do NOT use `.passthrough()` — unknown keys should be caught early.

**Alternative considered**: Array of operations per workflow (`[{ type: "append", file: "..." }]`). Rejected because it adds complexity for zero current benefit — multiple operations per workflow per plugin is an unlikely use case, and if needed, the plugin can concatenate content into a single overlay file.

### D2: Injection point — compose transformers in update.ts

The overlay injection happens in `update.ts` where skills are generated, NOT in `skill-generation.ts`. The existing `transformInstructions` callback is composed:

```typescript
// Pseudocode in update.ts skill generation loop
const overlayTransformer = buildOverlayTransformer(loadedPlugins, workflowId);
const toolTransformer = tool.value === 'opencode' ? transformToHyphenCommands : undefined;
const composed = composeTransformers(overlayTransformer, toolTransformer);
const skillContent = generateSkillContent(template, version, composed);
```

**Why compose, not extend**: `generateSkillContent` already takes a single `transformInstructions` callback. Composing transformers (overlay first, then tool-specific) maintains the existing API contract without modifying `skill-generation.ts`'s signature.

**Ordering**: Overlay content is appended BEFORE tool-specific transforms run. This ensures the overlay content also gets hyphen-transformed for OpenCode.

### D3: Overlay content for commands

Command content is generated via `getCommandContents()` → adapter pipeline. Overlays are applied by modifying the `body` field of `CommandContent` before passing it to `generateCommands()`.

**Why not only skills**: Both skills and commands serve the same purpose (workflow instructions for AI agents). A user on Claude Code uses commands (`/opsx:apply`), while a user on Cursor uses skills. Both should get the overlay content.

**Application point**: Overlays are applied to `CommandContent.body` objects once globally (before the per-tool adapter pipeline), not per-tool. This is correct because overlays are tool-agnostic — the same orchestration instructions should reach all tools equally.

### D4: Plugin loading in update.ts

`update.ts` currently does not load plugins. We add a single call to `getLoadedPlugins(projectRoot)` (already implemented in `src/core/plugin/context.ts`) at the start of the update flow. This returns all whitelisted plugins with their manifests.

If plugin loading fails for any reason, update continues without overlays (warn and proceed).

### D5: No workflow ID validation at manifest parse time

Workflow IDs in `skill_overlays` are NOT validated against the known workflow list during manifest parsing. Validation is deferred to update time when the profile's active workflows are known. Unknown workflow IDs are silently skipped (they might be valid in a different profile).

## Risks / Trade-offs

- **[Overlay file missing at update time]** → Warning logged, skill generated without overlay. This is a conscious choice: plugins may be deployed before their overlay files are created.
- **[Overlay content conflicts between plugins]** → Not possible with append-only. Both plugins' content is appended in whitelist order. If this becomes a problem with future operations (replace_section), we'll need conflict detection.
- **[Generated skill files grow large]** → Overlay content is additional instructions appended to the template. Plugin authors should keep overlays focused and concise. No size limit enforced (same policy as existing skill templates).
- **[Upstream merge friction]** → The change touches 5-6 existing files with small, additive modifications. The new `composeTransformers` utility is self-contained. Risk is low if we keep the diff minimal.

## Resolved Questions

- **Should `openspec plugin validate` check that overlay files exist on disk?** Yes, as a warning not an error. Added as task 5.4.
