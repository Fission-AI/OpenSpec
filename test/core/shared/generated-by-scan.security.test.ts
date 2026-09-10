import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { extractGeneratedByVersion } from '../../../src/core/shared/tool-detection.js';
import { isLegacyCodexSkillEquivalentToCurrent } from '../../../src/core/shared/skill-content-equivalence.js';

/**
 * Both scans used an `m`-anchored `^\s*`, where `\s` crosses newlines, so the
 * engine re-scanned the whole whitespace run from every line start. A hostile
 * (or merely malformed) SKILL.md of a few tens of KB froze `openspec update`
 * for minutes. These bound the work instead of asserting an exact time.
 */
describe('generatedBy scanning is not super-linear', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-generated-by-scan-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // The blowup is in the *failing* scan: with no `generatedBy:` to find, the
  // engine retries the whole whitespace run from every line start.
  it('gives up on a whitespace-heavy skill file quickly', () => {
    const skillFile = path.join(tempDir, 'SKILL.md');
    // 63 KB of ` \n`: 3.6s on the old regex, and it grows ~n^1.8 from there.
    fs.writeFileSync(skillFile, ' \n'.repeat(32_000));

    const start = Date.now();
    const version = extractGeneratedByVersion(skillFile);
    const elapsed = Date.now() - start;

    expect(version).toBeNull();
    expect(elapsed).toBeLessThan(500);
  });

  it('compares a whitespace-heavy legacy frontmatter quickly', () => {
    // 63 KB of whitespace frontmatter: 2.8s on the old regex.
    const content = `---\n${' \n'.repeat(32_000)}---\nbody\n`;

    const start = Date.now();
    const equivalent = isLegacyCodexSkillEquivalentToCurrent(content, content);
    const elapsed = Date.now() - start;

    expect(equivalent).toBe(true);
    expect(elapsed).toBeLessThan(500);
  });

  it('keeps the matching semantics it had before', () => {
    const cases: [string, string | null][] = [
      ['generatedBy: 1.2.3\n', '1.2.3'],
      ['metadata:\n  generatedBy: "1.2.3"\n', '1.2.3'],
      ["  generatedBy: '1.2.3'  \n", '1.2.3'],
      ['---\r\nmetadata:\r\n  generatedBy: "1.2.3"\r\n---\r\n', '1.2.3'],
      ['generatedBy:\n', null],
      ['no version here\n', null],
    ];

    for (const [content, expected] of cases) {
      const skillFile = path.join(tempDir, 'SKILL.md');
      fs.writeFileSync(skillFile, content);
      expect(extractGeneratedByVersion(skillFile)).toBe(expected);
    }
  });
});
