/**
 * Static template strings for Fish completion scripts.
 * These are Fish-specific helper functions that never change.
 */

export const FISH_STATIC_HELPERS = `# Helper function to match the command path at the start of the invocation
function __fish_openspec_using_command_path
    set -l tokens (commandline -opc)
    set -e tokens[1]
    set -l path
    for token in $tokens
        if test "$token" = --no-color
            continue
        end
        set -a path $token
        if test (count $path) -eq (count $argv)
            break
        end
    end
    test (count $path) -eq (count $argv); or return 1
    for index in (seq (count $argv))
        test "$path[$index]" = "$argv[$index]"; or return 1
    end
    return 0
end

function __fish_openspec_no_subcommand
    set -l tokens (commandline -opc)
    set -e tokens[1]
    for token in $tokens
        if test "$token" != --no-color
            return 1
        end
    end
    return 0
end

function __fish_openspec_completing_option_value
    set -l current (commandline -ct)
    for option in $argv
        if string match -q -- "$option=*" "$current"
            return 0
        end
    end

    set -l tokens (commandline -opc)
    test (count $tokens) -gt 0; or return 1
    contains -- $tokens[-1] $argv
end

function __fish_openspec_complete_attached_short_path
    set -l option $argv[1]
    set -l current (commandline -ct)
    test "$current" != "$option"; or return 1
    string match -q -- "$option*" "$current"; or return 1
    set -l value (string sub -s (math (string length -- "$option") + 1) -- "$current")
    __fish_complete_path "$value"
end

function __fish_openspec_positional_index
    set -l target $argv[1]
    set -l depth $argv[2]
    set -l value_flags $argv[3..]
    set -l tokens (commandline -opc)
    set -e tokens[1]
    set -l count 0
    set -l options 1
    set -l skip 0
    for token in $tokens
        if test $skip -eq 1
            set skip 0
            continue
        end
        if test $options -eq 1
            if test "$token" = --
                set options 0
                continue
            end
            if contains -- $token $value_flags
                set skip 1
                continue
            end
            if string match -q -- '-*' $token
                continue
            end
        end
        set count (math $count + 1)
    end
    test $skip -eq 0; or return 1
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
