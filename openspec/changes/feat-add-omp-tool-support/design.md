## Context

OpenSpec supports AI coding assistants by generating two artifact types per tool: skill files (for agent instruction loading) and command files (for slash-command invocation). Each tool has a `ToolCommandAdapter` that controls the output path and file format.

Oh My Pi (OMP) is a terminal AI coding agent that uses a `.omp/` project directory. Its command system uses the filename stem as the slash command name (e.g., `opsx-propose.md` → `/opsx-propose`), which requires command body references to be in hyphenated form (`/opsx-propose` rather than `/opsx:propose`). This is the same pattern already used by Pi and OpenCode.

## Goals / Non-Goals

**Goals:**
- Add a `ToolCommandAdapter` for Oh My Pi producing `.omp/commands/opsx-<id>.md` with `description` frontmatter.
- Inject `**Provided arguments**: $@` after the `**Input**:` heading in command bodies so user-supplied arguments are visible to the agent when a command is invoked with arguments.
- Register the adapter so `init` and `update` can generate command files and skill files for OMP.
- Apply `transformToHyphenCommands` to OMP skill bodies so `/opsx:` references become `/opsx-` for consistency with the command naming convention.
- Add OMP to `AI_TOOLS` so it appears in tool selection and auto-detection.

**Non-Goals:**
- Changing the file format used by Pi or OpenCode.
- Adding OMP-specific frontmatter fields beyond `description`.
- Auto-detecting OMP presence (the `.omp/` directory is sufficient as `skillsDir`).

## Decisions

### Reuse the existing `transformToHyphenCommands` transformer for skill files

**Decision**: Add `'oh-my-pi'` to the `tool.value` conditional in `init.ts` and `update.ts` that selects the hyphen transformer.

**Rationale**: Pi and OpenCode follow the same filename-as-command-name convention and are already handled by this branch. OMP has an identical convention. Extending the same conditional is minimal-diff and keeps the pattern consistent.

**Alternative considered**: Storing the transformer flag on the `AIToolOption` object (e.g., `useHyphenCommands: true`). This is cleaner long-term but is a larger refactor than this change warrants. It can be done separately if more tools adopt this convention.

### Use `description`-only frontmatter in command files

**Decision**: The `formatFile` method outputs only a `description` YAML field in frontmatter.

**Rationale**: OMP's command format uses filename for the slash command name and `description` for display. No additional frontmatter fields (name, category, tags) are needed, matching the minimalist approach used by Pi.

### Inject `$@` into command bodies (matching Pi)

**Decision**: Apply the same `injectArgs` logic as Pi's adapter — append `**Provided arguments**: $@` on the line after the `**Input**:` heading, skipping injection if `$@` or `$ARGUMENTS` is already present.

**Rationale**: OpenSpec command templates contain an `**Input**:` heading that describes what arguments the command accepts (e.g., `**Input**: The argument after /opsx-propose is the change name…`). Without injecting `$@`, a user running `/opsx-propose my-feature` passes `my-feature` as `$@` but the agent never sees it — the argument is silently discarded. OMP's prompt template spec explicitly supports `$@` and positional forms. Pi faces the same problem and already solves it with identical injection logic.

**Alternative considered**: Leaving injection out and relying on users to add `$@` manually to the template. Rejected: this would silently break argument passing for all OMP commands and diverge from Pi's established behavior.

### Tool ID is `'oh-my-pi'`, skills directory is `'.omp'`

**Decision**: `value: 'oh-my-pi'` in `AI_TOOLS`; `skillsDir: '.omp'`.

**Rationale**: The tool ID uses the full kebab-case name for human clarity. The `.omp/` directory is the short canonical path users will see on disk. The two are independent and follow the precedent set by `kilocode` (ID) → `.kilocode` (dir).

## Risks / Trade-offs

- **`.omp/` directory collision**: If a project uses `.omp/` for another purpose, OMP detection will yield a false positive. → Mitigation: This is consistent with how every other tool is detected; no special handling is warranted.
- **Conditional growth in init.ts / update.ts**: Adding a third value to the `tool.value === 'opencode' || tool.value === 'pi'` checks makes the long-term refactor to a per-tool flag more urgent. → Mitigation: Document in tasks; the refactor is low-risk and can follow separately.
- **Adapter missing `escapeYamlValue`**: If a command description contains special YAML characters, the description frontmatter could be malformed. → Mitigation: `escapeYamlValue` is applied in this implementation (task 1.2), consistent with Pi adapter.

## Open Questions

None — implementation is well-defined by the existing Pi/OpenCode/OMP pattern.
