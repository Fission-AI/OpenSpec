## Context

`openspec init` already supports multiple AI tools via a shared tool registry and adapter-driven generation pipeline, but DeepSeek TUI is currently missing from the supported tool set. This creates an onboarding gap for users who rely on DeepSeek TUI in this fork.

The existing init flow already handles a key split in behavior:
- Skills can be generated for any tool that defines a tool workspace directory.
- Slash commands are generated only when a command adapter is registered for that tool.

The change should preserve this architecture and extend it with DeepSeek TUI in a cross-platform-safe way, following the same metadata-first pattern used by `.claude`, `.cursor`, and other tool entries.

## Goals / Non-Goals

**Goals:**
- Add DeepSeek TUI as a supported tool in `openspec init` for interactive and `--tools` workflows.
- Ensure DeepSeek TUI participates in tool validation, selection, generation, and summary output.
- Define DeepSeek path metadata using the existing `skillsDir` convention (`.deepseek`) so generation resolves to `<projectRoot>/.deepseek/skills/`.
- Preserve adapter-gated command generation semantics (skills can be generated without command adapter).
- Keep behavior consistent across macOS, Linux, and Windows.

**Non-Goals:**
- Introducing new workflow templates beyond existing profile/delivery behavior.
- Designing a brand-new command adapter framework.
- Changing existing supported-tool behavior for other tools.

## Decisions

1. **Register DeepSeek TUI in the canonical supported-tools list and path metadata**
   - DeepSeek TUI is added in `AI_TOOLS` with explicit `value`, display name, and `skillsDir: '.deepseek'`.
   - This keeps behavior aligned with existing tools (e.g. `claude -> .claude`, `cursor -> .cursor`) and avoids bespoke path logic.
   - Rationale: A single source of truth keeps interactive choices, `--tools` validation, and generation routing consistent.
   - Alternative considered: ad-hoc special-casing DeepSeek in init parsing. Rejected because it fragments tool metadata and is brittle.

2. **Treat DeepSeek TUI as skills-capable and command-adapter optional**
   - Define a `skillsDir` for DeepSeek TUI and allow skill generation through existing template flow.
   - If no command adapter exists, skip command generation and report it in summary output exactly like other adapterless tools.
   - Rationale: Reuses proven behavior (already present for tools such as Kimi CLI) and avoids blocking init on adapter parity.
   - Alternative considered: requiring command adapter before enabling the tool. Rejected because it delays usable support.

3. **Keep output, docs, and validation user-facing and explicit**
   - `--tools` errors and success summaries should recognize DeepSeek TUI as a first-class tool.
   - Tool documentation and CLI docs should list the same tool id/value used in `AI_TOOLS`, avoiding drift between UX and implementation.
   - Rationale: discoverability and predictable CLI UX matter as much as generation mechanics.
   - Alternative considered: silently accept alias values without surfacing tool name. Rejected due to lower transparency.

4. **Follow existing integration archetypes (Codex/Cursor/OpenCode/Pi/Kimi)**
   - DeepSeek metadata should mirror the same `AI_TOOLS` shape as Codex/Cursor (`name`, `value`, `successLabel`, `skillsDir`) with no one-off fields unless required.
   - DeepSeek command behavior should follow the same adapter contract as all tools: only generate commands when a registered adapter exists.
   - DeepSeek should not reuse special command-body transforms that are tool-specific to OpenCode/Pi (hyphen rewriting or `$@` injection), unless DeepSeek later introduces equivalent requirements.
   - Rationale: keeps integration maintenance predictable and avoids accidental coupling to unrelated tool quirks.

## Risks / Trade-offs

- **[Risk] Tool ID or directory naming mismatch** -> **Mitigation:** use explicit constants and existing tool metadata patterns, plus tests that assert generated paths and summaries.
- **[Risk] Adapterless command generation accidentally attempted** -> **Mitigation:** keep generation branch on explicit adapter lookup and verify skip-summary output for DeepSeek TUI.
- **[Trade-off] DeepSeek may launch with skills-only behavior first** -> **Mitigation:** document and spec this behavior now; adapter can be added later without breaking existing init contract.
