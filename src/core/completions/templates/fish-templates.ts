/**
 * Static template strings for Fish completion scripts.
 * These are Fish-specific helper functions that never change.
 */

export const FISH_STATIC_HELPERS = `# Helper function to check if a subcommand is present
function __fish_openspec_using_subcommand
    set -l cmd (commandline -opc)
    set -e cmd[1]
    for i in $argv
        if contains -- $i $cmd
            return 0
        end
    end
    return 1
end

function __fish_openspec_no_subcommand
    set -l cmd (commandline -opc)
    test (count $cmd) -eq 1
end`;

export const FISH_DYNAMIC_HELPERS = `# Dynamic completion helpers

function __fish_openspec_changes
    openspec __complete changes 2>/dev/null | while read -l id desc
        printf '%s\\t%s\\n' "$id" "$desc"
    end
end

function __fish_openspec_specs
    openspec __complete specs 2>/dev/null | while read -l id desc
        printf '%s\\t%s\\n' "$id" "$desc"
    end
end

function __fish_openspec_items
    __fish_openspec_changes
    __fish_openspec_specs
end`;
