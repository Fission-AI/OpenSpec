## Context

Command adapters for Bob, Claude, Cursor, Pi, and Windsurf emit YAML frontmatter and shared the same local `escapeYamlValue()` implementation. The helper regex includes `\r`, so carriage returns already trigger double quoting, but the escape chain only handles backslashes, double quotes, and `\n`.

## Goals / Non-Goals

**Goals:**

- Provide one reusable YAML scalar escaping helper for command generation.
- Preserve existing quoting behavior for ordinary scalars and existing escaped characters.
- Escape carriage returns as `\\r` whenever a YAML scalar is double quoted.
- Keep adapter output formats otherwise unchanged.

**Non-Goals:**

- Replace all frontmatter generation with a YAML serializer.
- Change TOML or markdown-only adapters.
- Broaden command adapter behavior beyond scalar escaping.

## Decisions

1. Add `src/core/command-generation/utils/yaml.ts`.

   The utility owns the existing detection regex and escaping chain so future YAML-frontmatter adapters can reuse the same behavior.

2. Escape carriage returns after line feeds.

   The helper continues escaping backslashes and double quotes first, then emits visible `\\n` and `\\r` sequences for control characters inside double-quoted scalars.

3. Update all current YAML-frontmatter adapters with the duplicated helper.

   The current repository still uses YAML helpers in Bob, Claude, Cursor, Pi, and Windsurf. Qwen now emits TOML and is outside this change.

## Risks / Trade-offs

- A dedicated YAML serializer would handle more edge cases but would be a larger behavioral change for generated files. This change intentionally preserves the existing formatting contract and fixes the known control-character gap.
