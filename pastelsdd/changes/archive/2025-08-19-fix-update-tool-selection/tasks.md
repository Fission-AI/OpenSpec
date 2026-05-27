# Implementation Tasks

## 1. Update Update Command
- [x] Remove hardcoded CLAUDE.md update from `src/core/update.ts`
- [x] Add logic to check for existing AI tool configuration files
- [x] Update only existing files using their appropriate configurators
- [x] Iterate through all registered configurators to check for existing files

## 2. Update Configurator Registry
- [x] Add method to get all configurators for update command
- [x] Ensure each configurator can check if its file exists

## 3. Add Tests
- [x] Test update command with only CLAUDE.md present
- [x] Test update command with no AI tool files present
- [x] Test update command with multiple AI tool files present
- [x] Test that update never creates new AI tool files

## 4. Update Documentation
- [x] Update README to clarify team-friendly behavior
- [x] Document that update only modifies existing files