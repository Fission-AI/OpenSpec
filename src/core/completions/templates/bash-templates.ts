/**
 * Static template strings for Bash completion scripts.
 * These are Bash-specific helper functions that never change.
 */

export const BASH_DYNAMIC_HELPERS = `# Dynamic completion helpers

_pastelsdd_complete_changes() {
  local changes
  changes=$(pastelsdd __complete changes 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$changes" -- "$cur"))
}

_pastelsdd_complete_specs() {
  local specs
  specs=$(pastelsdd __complete specs 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$specs" -- "$cur"))
}

_pastelsdd_complete_items() {
  local items
  items=$(pastelsdd __complete changes 2>/dev/null | cut -f1; pastelsdd __complete specs 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$items" -- "$cur"))
}

_pastelsdd_complete_schemas() {
  local schemas
  schemas=$(pastelsdd __complete schemas 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$schemas" -- "$cur"))
}`;
