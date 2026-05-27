# Change Proposal: Extend Shell Completions

## Why

Zsh completions provide an excellent developer experience, but many developers use bash, fish, or PowerShell. Extending completion support to these shells removes friction for the majority of developers who don't use Zsh.

## What Changes

This change adds bash, fish, and PowerShell completion support following the same architectural patterns, documentation methodology, and testing rigor established for Zsh completions.

## Deltas

- **Spec:** `cli-completion`
  - **Operation:** MODIFIED
  - **Description:** Extend completion generation, installation, and testing requirements to support bash, fish, and PowerShell while maintaining the existing Zsh implementation and architectural patterns