## 1. Core Infrastructure

- [x] 1.1 Create zod schema for global config in `src/core/config-schema.ts`
- [x] 1.2 Add utility functions for dot-notation key access (get/set nested values)
- [x] 1.3 Add type coercion logic (auto-detect boolean/number/string)

## 2. Config Command Implementation

- [x] 2.1 Create `src/commands/config.ts` with Commander.js subcommands
- [x] 2.2 Implement `config path` subcommand
- [x] 2.3 Implement `config list` subcommand with `--json` flag
- [x] 2.4 Implement `config get <key>` subcommand (raw output)
- [x] 2.5 Implement `config set <key> <value>` with `--string` flag
- [x] 2.6 Implement `config unset <key>` subcommand
- [x] 2.7 Implement `config reset --all` with `-y` confirmation flag
- [x] 2.8 Implement `config edit` subcommand (spawn $EDITOR)

## 3. Integration

- [x] 3.1 Register config command in CLI entry point
- [x] 3.2 Update shell completion registry to include config subcommands

## 4. Testing

- [x] 4.1 Manual testing of all subcommands
- [x] 4.2 Verify zod validation rejects invalid keys/values
- [x] 4.3 Test nested key access with dot notation
- [x] 4.4 Test type coercion edge cases (true/false, numbers, strings)
