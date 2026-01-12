# MCP Server Specification

## Purpose
Define the capabilities of the OpenSpec Model Context Protocol (MCP) server. This server enables native integration with MCP-compliant agents (including the Gemini CLI extension) by exposing tools, resources, and prompts dynamically.

## ADDED Requirements
### Requirement: Expose Tools
The server SHALL expose core OpenSpec capabilities as MCP tools.

#### Scenario: List Tools
- **WHEN** the client requests `tools/list`
- **THEN** return `openspec_list`, `openspec_show`, `openspec_validate`, `openspec_archive` tools
- **AND** include descriptions and JSON schemas for arguments

### Requirement: Expose Resources
The server SHALL expose specs and changes as MCP resources.

#### Scenario: List Resources
- **WHEN** the client requests `resources/list`
- **THEN** return a list of available specs and changes with `openspec://` URIs

#### Scenario: Read Resource
- **WHEN** the client requests `resources/read` for a valid URI
- **THEN** return the content of the corresponding file (markdown or JSON)

### Requirement: Expose Prompts
The server SHALL expose standard OpenSpec prompts.

#### Scenario: List Prompts
- **WHEN** the client requests `prompts/list`
- **THEN** return `proposal`, `apply`, `archive` prompts