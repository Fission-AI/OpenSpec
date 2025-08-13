# Add @requirement Markers for Requirement Identification

## Why
Specs contain WHEN/THEN patterns that define system requirements, but extracting these programmatically requires brittle regex parsing that may miss edge cases or break with formatting changes.

## What Changes
- Define @requirement marker convention for identifying key requirements in specs
- Each marker includes a brief identifier (e.g., @requirement user-register)
- Markers appear directly before their WHEN/THEN blocks
- Document convention in openspec-conventions spec

## Impact
- Affected specs: openspec-conventions (new)
- Affected code: None initially - enables future tooling
- Breaking changes: None - additive convention only