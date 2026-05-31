/**
 * Static template strings for Bash completion scripts.
 * These are Bash-specific helper functions that never change.
 */

export const BASH_DYNAMIC_HELPERS = `# Dynamic completion helpers

_pscode_complete_changes() {
  local changes
  changes=$(pscode __complete changes 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$changes" -- "$cur"))
}

_pscode_complete_specs() {
  local specs
  specs=$(pscode __complete specs 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$specs" -- "$cur"))
}

_pscode_complete_items() {
  local items
  items=$(pscode __complete changes 2>/dev/null | cut -f1; pscode __complete specs 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$items" -- "$cur"))
}

_pscode_complete_schemas() {
  local schemas
  schemas=$(pscode __complete schemas 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$schemas" -- "$cur"))
}`;
