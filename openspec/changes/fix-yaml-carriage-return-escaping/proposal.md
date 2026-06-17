## Why

Several command adapters duplicate the same YAML frontmatter scalar escaping helper. The duplicated helper detects carriage returns as requiring quoted YAML, but only escapes line feeds. A description, category, name, or tag containing `\r` can therefore be emitted with a raw carriage return inside a double-quoted scalar.

This produces inconsistent YAML escaping across generated command files and makes the helper harder to fix consistently.

## What Changes

Move the shared YAML scalar escaping behavior into one command-generation utility and make it escape carriage returns as `\r` when emitting double-quoted YAML scalars.

Update the YAML-frontmatter adapters that use this behavior to call the shared utility.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `command-generation`: YAML frontmatter scalar values escape carriage returns consistently.

## Impact

- `src/core/command-generation/utils/yaml.ts` - add shared YAML scalar escaping utility.
- YAML-frontmatter command adapters - import the shared utility instead of local copies.
- `test/core/command-generation/yaml-utils.test.ts` and adapter tests - cover carriage-return escaping.
