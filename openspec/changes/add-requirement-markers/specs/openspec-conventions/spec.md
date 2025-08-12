# OpenSpec Conventions Specification

## Purpose
Define conventions and patterns for writing OpenSpec specifications to ensure consistency and enable tooling.

## Requirement Markers

### Marker Syntax

@requirement marker-syntax
WHEN writing a requirement in a spec
THEN prefix it with @requirement followed by a brief kebab-case identifier
AND place the marker on the line immediately before the WHEN statement

@requirement marker-identifier
WHEN choosing an identifier for @requirement
THEN use kebab-case (lowercase with hyphens)
AND keep it brief but descriptive (2-4 words)
AND ensure it's unique within the spec

@requirement marker-placement
WHEN adding @requirement markers to a spec
THEN place them in the ## Behavior or ## Behaviors section
AND ensure each WHEN/THEN block has exactly one marker
AND maintain a blank line after each THEN block for readability

### Examples

@requirement valid-marker-example
WHEN a spec includes properly formatted markers
THEN tools can extract and identify requirements programmatically
AND the spec remains human-readable

Example of correct usage:
```markdown
## Behavior

@requirement user-register
WHEN user registers with valid email
THEN create account and send confirmation

@requirement user-login
WHEN user logs in with correct credentials
THEN return JWT token with user data

@requirement invalid-credentials
WHEN user provides invalid credentials
THEN return 401 unauthorized error
```

@requirement invalid-marker-detection
WHEN a requirement lacks an @requirement marker
THEN tools should gracefully skip it
AND optionally warn about unmarked requirements

### Edge Cases

@requirement multiline-when-then
WHEN a WHEN or THEN clause spans multiple lines
THEN the @requirement marker still goes on the line before WHEN
AND the entire block is considered part of that requirement

@requirement multiple-then-clauses
WHEN a requirement has multiple THEN clauses using AND
THEN treat them as part of the same requirement
AND use a single @requirement marker for the entire block

@requirement nested-conditions
WHEN requirements have nested conditions or complex logic
THEN keep the @requirement marker simple
AND let the WHEN/THEN content contain the complexity

## Spec Structure

@requirement spec-file-location
WHEN creating a spec file
THEN place it in openspec/specs/[capability-name]/spec.md
AND use kebab-case for the capability name

@requirement spec-sections
WHEN structuring a spec
THEN include these sections in order:
- # [Capability Name] Specification
- ## Purpose (brief description)
- ## Behavior or ## Behaviors (with @requirement markers)
- ## Examples (optional, for complex requirements)

## Benefits of Requirement Markers

@requirement tooling-extraction
WHEN tools need to extract requirements from specs
THEN they can parse @requirement markers reliably
AND avoid complex regex patterns for WHEN/THEN extraction

@requirement requirement-counting
WHEN displaying change summaries
THEN tools can count requirements by counting @requirement markers
AND show accurate requirement counts per spec

@requirement requirement-referencing
WHEN documenting or discussing specific requirements
THEN use the @requirement identifier for clear reference
AND maintain consistency across documentation