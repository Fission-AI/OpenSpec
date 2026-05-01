## Technical Approach

### Root Cause

The file `src/core/parsers/requirement-blocks.ts` has three functions that scan for markdown headers by regex without tracking whether the current line is inside a fenced code block:

1. **`splitTopLevelSections`** (L148-153) — matches `^## ` to split top-level sections
2. **`extractRequirementsSection`** (L44-49) — matches `^## ` to find section end; (L79) matches `### Requirement:` to split body
3. **`parseRequirementBlocksFromSection`** (L187) — matches `### Requirement:` and `^## ` for block boundaries

### Fix: Add `isInsideFencedBlock` State Tracking

Add a helper function `isInsideFence` or inline tracking that:

1. Tracks whether we're inside a fenced code block by detecting lines starting with ` ``` ` (with optional language identifier)
2. Toggles state on each fence boundary
3. When inside a fence, skips all header detection

The pattern is:

````typescript
let inFence = false;
for (const line of lines) {
  if (line.startsWith("```")) {
    inFence = !inFence;
    continue; // or process as body line
  }
  if (inFence) {
    // Treat as body content, NOT as a header
    continue;
  }
  // Normal header detection here
}
````

This must be applied to all three functions consistently.

### Files Changed

| File                                           | Change                                     |
| ---------------------------------------------- | ------------------------------------------ |
| `src/core/parsers/requirement-blocks.ts`       | Add fence tracking to 3 functions          |
| `test/core/parsers/requirement-blocks.test.ts` | New test file with fenced code block cases |

### No Breaking Changes

This fix only makes the parser MORE correct — specs without code blocks are unaffected.

## Architecture Updates

No architecture changes. This is a bugfix to the markdown parser.
