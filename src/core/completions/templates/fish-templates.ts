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
end

function __fish_openspec_positional_index
    set -l target $argv[1]
    set -l depth $argv[2]
    set -l value_flags $argv[3..]
    set -l tokens (commandline -opc)
    set -e tokens[1]
    set -l count 0
    set -l skip 0
    for token in $tokens
        if test $skip -eq 1
            set skip 0
            continue
        end
        if contains -- $token $value_flags
            set skip 1
            continue
        end
        if string match -q -- '-*' $token
            continue
        end
        set count (math $count + 1)
    end
    test $count -eq (math $target + $depth)
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
end

function __fish_openspec_schemas
    openspec __complete schemas 2>/dev/null | while read -l id desc
        printf '%s\\t%s\\n' "$id" "$desc"
    end
end`;
