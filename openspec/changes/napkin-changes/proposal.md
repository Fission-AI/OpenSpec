## Why

When users start a new change with `/opsx:new`, their initial description gets lost. The system creates an empty folder and shows a template, but the user's intent—the thing they said they wanted to build—isn't captured anywhere. They have to describe it again when creating the proposal.

This adds friction and breaks the natural flow of: idea → capture → expand → implement.

## What Changes

- Introduce "napkin" as a lightweight precursor to a full change
- Napkins are simple markdown files: `<name>.napkin.md` in `openspec/changes/`
- When promoted via `/opsx:continue`, napkin content seeds the proposal and the napkin file is deleted
- Full changes remain as folders with artifacts (no change to existing behavior)

**File structure:**
```
openspec/changes/
├── dark-mode.napkin.md       ← napkin (lightweight, just an idea)
├── auth-refactor/            ← full change (folder with artifacts)
│   ├── .openspec.yaml
│   ├── proposal.md
│   └── ...
```

**Lifecycle:**
1. `/opsx:new "add dark mode"` → creates `dark-mode.napkin.md` with user's description
2. User can edit, add notes, refine thinking
3. `/opsx:continue` → promotes napkin to full change folder, creates `proposal.md` using napkin content
4. `dark-mode.napkin.md` is deleted after promotion

## Capabilities

### New Capabilities

- `napkin-changes`: Support for lightweight napkin files (`.napkin.md`) as precursors to full changes, including creation, listing, and promotion to full change folders

### Modified Capabilities

- `change-creation`: Add support for creating napkin files instead of folders
- `cli-change`: Update `openspec new change` to support napkin creation
- `cli-list`: Show napkins alongside full changes in `openspec list` output

## Impact

- `src/utils/change-utils.ts` - Add napkin creation/detection utilities
- `src/commands/change.ts` - Support `--napkin` flag or make napkin the default
- `src/commands/list.ts` - Include napkins in change listing
- `.claude/skills/openspec-new-change/` - Update to create napkins by default
- `.claude/skills/openspec-continue-change/` - Handle napkin → full change promotion
- `.claude/commands/opsx/new.md` - Update skill instructions
- `.claude/commands/opsx/continue.md` - Update to handle napkin promotion
