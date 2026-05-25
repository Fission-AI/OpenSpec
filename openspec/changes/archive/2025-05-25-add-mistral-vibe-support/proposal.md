# Add Mistral Vibe Support - Proposal

## Why

Mistral Vibe is a popular AI coding assistant that works with OpenSpec skills, but it is not currently available through OpenSpec's standard setup workflows. Users must manually copy skills to use them with Vibe.

Adding official Mistral Vibe support enables users to set up and manage Vibe integration through OpenSpec's standard commands, eliminating manual copying and ensuring skills stay up-to-date automatically.

## What Changes

- Enable Mistral Vibe as a supported tool that appears in tool selection
- Automatically set up Mistral Vibe skills in the correct location during initialization
- Detect existing Mistral Vibe configurations when checking project status

## Non-goals

- Support for global Vibe skills directory - can be Phase 2
- Vibe-specific customizations beyond standard skill format
- Integration with Mistral Vibe's additional features
- Command generation (Vibe uses skills, not commands)

## Capabilities

### New Capabilities
- `vibe-tool-config`: Enable Mistral Vibe as a supported OpenSpec tool

### Modified Capabilities
- `ai-tool-paths`: Add Mistral Vibe to tool path configuration

## Impact

- **Files Modified**: Configuration and documentation
- **New Dependencies**: None
- **Breaking Changes**: None
- **User Experience**: Users can set up Mistral Vibe through standard OpenSpec workflows
