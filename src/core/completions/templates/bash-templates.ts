/**
 * Static template strings for Bash completion scripts.
 * These are Bash-specific helper functions that never change.
 */

export const BASH_DYNAMIC_HELPERS = `# Dynamic completion helpers

_clearspec_complete_changes() {
  local changes
  changes=$(clearspec __complete changes 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$changes" -- "$cur"))
}

_clearspec_complete_specs() {
  local specs
  specs=$(clearspec __complete specs 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$specs" -- "$cur"))
}

_clearspec_complete_items() {
  local items
  items=$(clearspec __complete changes 2>/dev/null | cut -f1; clearspec __complete specs 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$items" -- "$cur"))
}

_clearspec_complete_schemas() {
  local schemas
  schemas=$(clearspec __complete schemas 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$schemas" -- "$cur"))
}`;
