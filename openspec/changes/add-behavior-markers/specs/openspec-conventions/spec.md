# OpenSpec Conventions Specification

## Purpose
Define conventions and patterns for writing OpenSpec specifications to ensure consistency and enable tooling.

## Behavior Markers

### Marker Syntax

@behavior marker-syntax
WHEN writing a behavior in a spec
THEN prefix it with @behavior followed by a brief kebab-case identifier
AND place the marker on the line immediately before the WHEN statement

@behavior marker-identifier
WHEN choosing an identifier for @behavior
THEN use kebab-case (lowercase with hyphens)
AND keep it brief but descriptive (2-4 words)
AND ensure it's unique within the spec

@behavior marker-placement
WHEN adding @behavior markers to a spec
THEN place them in the ## Behavior or ## Behaviors section
AND ensure each WHEN/THEN block has exactly one marker
AND maintain a blank line after each THEN block for readability

### Examples

@behavior valid-marker-example
WHEN a spec includes properly formatted markers
THEN tools can extract and identify behaviors programmatically
AND the spec remains human-readable

Example of correct usage:
```markdown
## Behavior

@behavior user-register
WHEN user registers with valid email
THEN create account and send confirmation

@behavior user-login
WHEN user logs in with correct credentials
THEN return JWT token with user data

@behavior invalid-credentials
WHEN user provides invalid credentials
THEN return 401 unauthorized error
```

@behavior invalid-marker-detection
WHEN a behavior lacks an @behavior marker
THEN tools should gracefully skip it
AND optionally warn about unmarked behaviors

### Edge Cases

@behavior multiline-when-then
WHEN a WHEN or THEN clause spans multiple lines
THEN the @behavior marker still goes on the line before WHEN
AND the entire block is considered part of that behavior

@behavior multiple-then-clauses
WHEN a behavior has multiple THEN clauses using AND
THEN treat them as part of the same behavior
AND use a single @behavior marker for the entire block

@behavior nested-conditions
WHEN behaviors have nested conditions or complex logic
THEN keep the @behavior marker simple
AND let the WHEN/THEN content contain the complexity

## Spec Structure

@behavior spec-file-location
WHEN creating a spec file
THEN place it in openspec/specs/[capability-name]/spec.md
AND use kebab-case for the capability name

@behavior spec-sections
WHEN structuring a spec
THEN include these sections in order:
- # [Capability Name] Specification
- ## Purpose (brief description)
- ## Behavior or ## Behaviors (with @behavior markers)
- ## Examples (optional, for complex behaviors)

## Benefits of Behavior Markers

@behavior tooling-extraction
WHEN tools need to extract behaviors from specs
THEN they can parse @behavior markers reliably
AND avoid complex regex patterns for WHEN/THEN extraction

@behavior behavior-counting
WHEN displaying change summaries
THEN tools can count behaviors by counting @behavior markers
AND show accurate behavior counts per spec

@behavior behavior-referencing
WHEN documenting or discussing specific behaviors
THEN use the @behavior identifier for clear reference
AND maintain consistency across documentation