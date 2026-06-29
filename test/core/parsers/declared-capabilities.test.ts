import { describe, it, expect } from 'vitest';
import { extractDeclaredCapabilities } from '../../../src/core/parsers/declared-capabilities.js';

describe('extractDeclaredCapabilities', () => {
  it('returns hasSection=false when there is no Capabilities section', () => {
    const md = `## Why\nStuff.\n\n## What Changes\n- a thing\n`;
    expect(extractDeclaredCapabilities(md)).toEqual({
      hasSection: false,
      capabilities: [],
      malformed: [],
    });
  });

  it('extracts ids from heading form (New + Modified)', () => {
    const md = `## Capabilities\n\n### New Capabilities\n\n- \`user-auth\`: introduce auth\n\n### Modified Capabilities\n\n- \`cli-init\`: tweak init\n`;
    const r = extractDeclaredCapabilities(md);
    expect(r.hasSection).toBe(true);
    expect(r.capabilities).toEqual(['cli-init', 'user-auth']);
    expect(r.malformed).toEqual([]);
  });

  it('takes the FIRST inline-code span and ignores backticks in the description', () => {
    const md = `## Capabilities\n### New Capabilities\n- \`tool-command-surface\`: classifies tools as \`adapter\` or \`none\`\n`;
    expect(extractDeclaredCapabilities(md).capabilities).toEqual(['tool-command-surface']);
  });

  it('accepts the bold-label form', () => {
    const md = `## Capabilities\n\n- **New Capabilities**:\n  - \`data-export\`: export\n- **Modified Capabilities**:\n  - \`cli-update\`: change\n`;
    expect(extractDeclaredCapabilities(md).capabilities).toEqual(['cli-update', 'data-export']);
  });

  it('treats None / _None_ / comment / empty subsections as no declaration', () => {
    const md = `## Capabilities\n### New Capabilities\n- \`only-one\`: x\n### Modified Capabilities\n_None — purely additive_\n`;
    expect(extractDeclaredCapabilities(md).capabilities).toEqual(['only-one']);
    const md2 = `## Capabilities\n### New Capabilities\n<!-- nothing yet -->\n### Modified Capabilities\nNone\n`;
    expect(extractDeclaredCapabilities(md2).capabilities).toEqual([]);
  });

  it('reports non-kebab ids as malformed rather than dropping them', () => {
    const md = `## Capabilities\n### New Capabilities\n- \`User-Auth\`: bad casing\n- \`good-one\`: fine\n`;
    const r = extractDeclaredCapabilities(md);
    expect(r.capabilities).toEqual(['good-one']);
    expect(r.malformed).toEqual(['User-Auth']);
  });

  it('does not pick up Impact-section code bullets (bounded by next ## )', () => {
    const md = `## Capabilities\n### New Capabilities\n- \`real-cap\`: yes\n\n## Impact\n- \`src/core/foo.ts\` - not a capability\n`;
    expect(extractDeclaredCapabilities(md).capabilities).toEqual(['real-cap']);
  });

  it('ignores Removed Capabilities (not required to ship a delta)', () => {
    const md = `## Capabilities\n### New Capabilities\n- \`kept\`: x\n### Removed Capabilities\n- \`gone\`: removed\n`;
    expect(extractDeclaredCapabilities(md).capabilities).toEqual(['kept']);
  });

  it('handles CRLF line endings', () => {
    const md = `## Capabilities\r\n### New Capabilities\r\n- \`crlf-cap\`: x\r\n`;
    expect(extractDeclaredCapabilities(md).capabilities).toEqual(['crlf-cap']);
  });

  it('ignores capability-looking bullets inside fenced code blocks', () => {
    const md = `## Capabilities\n### New Capabilities\n\n\`\`\`\n- \`fenced-not-real\`: example\n\`\`\`\n\n- \`real-cap\`: yes\n`;
    expect(extractDeclaredCapabilities(md).capabilities).toEqual(['real-cap']);
  });

  it('dedupes repeated ids', () => {
    const md = `## Capabilities\n### Modified Capabilities\n- \`dup\`: a\n- \`dup\`: b\n`;
    expect(extractDeclaredCapabilities(md).capabilities).toEqual(['dup']);
  });
});
