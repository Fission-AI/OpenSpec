import { describe, it, expect } from 'vitest';
import { buildCodeFenceMask } from '../../../src/core/parsers/code-fence.js';
import { MarkdownParser } from '../../../src/core/parsers/markdown-parser.js';

describe('buildCodeFenceMask', () => {
  it('does not open a fence on a backtick line whose info string contains a backtick', () => {
    // CommonMark: the info string of a backtick fence may not contain backticks,
    // so ```npm test``` is inline code, not a fence opener.
    const lines = ['Run ```npm test``` first.', '```npm test``` must pass.', '### Requirement: B', 'text'];
    expect(buildCodeFenceMask(lines)).toEqual([false, false, false, false]);
  });

  it('still opens a tilde fence whose info string contains a backtick', () => {
    const lines = ['~~~ `x`', '### Requirement: hidden', '~~~', 'after'];
    expect(buildCodeFenceMask(lines)).toEqual([true, true, true, false]);
  });

  it('still opens a plain backtick fence with an info string', () => {
    const lines = ['```ts', 'code', '```', 'after'];
    expect(buildCodeFenceMask(lines)).toEqual([true, true, true, false]);
  });

  it('keeps requirements after a line that starts with triple-backtick inline code', () => {
    const content = `# Spec

## Purpose
Purpose text.

## Requirements

### Requirement: First
\`\`\`openspec validate\`\`\` SHALL exit 0 on a valid change.

#### Scenario: ok
- **WHEN** valid
- **THEN** exit 0

### Requirement: Second
The system SHALL keep this requirement.

#### Scenario: kept
- **WHEN** parsed
- **THEN** present
`;
    const spec = new MarkdownParser(content).parseSpec('s');
    expect(spec.requirements.map((r) => r.text)).toHaveLength(2);
  });
});
