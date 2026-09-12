import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { Validator } from '../../src/core/validation/validator.js';
import {
  MIN_PURPOSE_LENGTH,
  PURPOSE_PLACEHOLDER_PREFIX,
  PURPOSE_PLACEHOLDER_SUFFIX,
  VALIDATION_MESSAGES,
} from '../../src/core/validation/constants.js';

const ARCHIVE_TEXT = `${PURPOSE_PLACEHOLDER_PREFIX}add-retry-budget${PURPOSE_PLACEHOLDER_SUFFIX}`;

const specWith = (purpose: string) =>
  [
    '# widgets Specification',
    '',
    '## Purpose',
    purpose,
    '',
    '## Requirements',
    '### Requirement: Retries are bounded',
    'The system SHALL stop retrying a delivery after the configured budget.',
    '',
    '#### Scenario: Budget exhausted',
    '- **WHEN** the budget is exhausted',
    '- **THEN** the delivery is abandoned',
    '',
  ].join('\n');

const REAL_PURPOSE =
  'Bounds how often a failed delivery is retried, so a permanently broken endpoint cannot occupy the worker pool forever.';

const purposeIssues = (issues: Array<{ path: string }>) =>
  issues.filter((issue) => issue.path === 'overview');

describe('Purpose placeholder validation', () => {
  describe('severity is what --strict is for', () => {
    it('passes by default, so a project carrying one keeps validating', async () => {
      const report = await new Validator().validateSpecContent('widgets', specWith(ARCHIVE_TEXT));

      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
      expect(report.summary.warnings).toBe(1);
    });

    it('fails under --strict, naming the placeholder and where it is', async () => {
      const report = await new Validator(true).validateSpecContent(
        'widgets',
        specWith(ARCHIVE_TEXT)
      );

      expect(report.valid).toBe(false);
      expect(report.issues).toContainEqual({
        level: 'WARNING',
        path: 'overview',
        line: 4,
        message: VALIDATION_MESSAGES.PURPOSE_IS_PLACEHOLDER,
      });
    });

    it('leaves an authored Purpose passing --strict', async () => {
      const report = await new Validator(true).validateSpecContent(
        'widgets',
        specWith(REAL_PURPOSE)
      );

      expect(report.valid).toBe(true);
      expect(report.summary.warnings).toBe(0);
    });
  });

  describe('the gap this closes', () => {
    it('is the case --strict could not reach: the placeholder outruns the length floor', async () => {
      // The check that exists to catch a thin Purpose is a length floor, and the
      // placeholder clears it - so before this rule the spec saying "nobody wrote
      // a Purpose" passed --strict while a real but terse one failed. Both now
      // fail, each for the reason that fits it.
      expect(ARCHIVE_TEXT.length).toBeGreaterThan(MIN_PURPOSE_LENGTH);

      const placeholder = await new Validator(true).validateSpecContent(
        'widgets',
        specWith(ARCHIVE_TEXT)
      );
      const terse = await new Validator(true).validateSpecContent(
        'widgets',
        specWith('Does stuff.')
      );

      expect(placeholder.valid).toBe(false);
      expect(placeholder.issues.map((i) => i.message)).toContain(
        VALIDATION_MESSAGES.PURPOSE_IS_PLACEHOLDER
      );

      expect(terse.valid).toBe(false);
      expect(terse.issues.map((i) => i.message)).toContain(VALIDATION_MESSAGES.PURPOSE_TOO_BRIEF);
      expect(terse.issues.map((i) => i.message)).not.toContain(
        VALIDATION_MESSAGES.PURPOSE_IS_PLACEHOLDER
      );
    });

    it('reports a bare TBD once, as a placeholder rather than as too brief', async () => {
      const report = await new Validator(true).validateSpecContent('widgets', specWith('TBD'));

      const found = purposeIssues(report.issues);
      expect(found).toHaveLength(1);
      expect(found[0].message).toBe(VALIDATION_MESSAGES.PURPOSE_IS_PLACEHOLDER);
    });

    it('reports a bare TODO the same way, since it is the same non-answer', async () => {
      const report = await new Validator(true).validateSpecContent('widgets', specWith('TODO'));

      const found = purposeIssues(report.issues);
      expect(found).toHaveLength(1);
      expect(found[0].message).toBe(VALIDATION_MESSAGES.PURPOSE_IS_PLACEHOLDER);
    });
  });

  describe('a Purpose that documents the placeholder is not one', () => {
    it('passes --strict while quoting the sentence archive writes inside a fence', async () => {
      // OpenSpec's own docs are the population most likely to quote this text.
      // A check that fails the document explaining what the placeholder is
      // teaches people that the warning is noise, which costs more than the one
      // finding it adds.
      const purpose = [
        'Documents the Purpose `openspec archive` writes for a capability a delta introduced',
        'without one, and what to replace it with:',
        '',
        '```',
        ARCHIVE_TEXT,
        '```',
      ].join('\n');

      const report = await new Validator(true).validateSpecContent('widgets', specWith(purpose));

      expect(report.valid).toBe(true);
      expect(purposeIssues(report.issues)).toEqual([]);
    });
  });

  describe('archive is unaffected', () => {
    it('still reports a placeholder spec as valid to the validator archive runs', async () => {
      // `openspec archive` validates every rebuilt spec before writing it, with a
      // non-strict Validator. A spec archive writes must not fail validation it
      // would have passed before, so the new rule has to stay a warning on
      // exactly this call.
      const report = await new Validator().validateSpecContent('widgets', specWith(ARCHIVE_TEXT));

      expect(report.valid).toBe(true);
    });
  });

  describe('the real file path', () => {
    let dir: string;

    beforeEach(async () => {
      dir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-purpose-'));
    });

    afterEach(async () => {
      await fs.rm(dir, { recursive: true, force: true });
    });

    it('reports a placeholder read off disk', async () => {
      const file = path.join(dir, 'spec.md');
      await fs.writeFile(file, specWith(ARCHIVE_TEXT), 'utf-8');

      const report = await new Validator(true).validateSpec(file);

      expect(report.valid).toBe(false);
      expect(report.issues.map((i) => i.message)).toContain(
        VALIDATION_MESSAGES.PURPOSE_IS_PLACEHOLDER
      );
    });

    it('reports the same line for a spec saved with CRLF endings', async () => {
      const lf = path.join(dir, 'lf.md');
      const crlf = path.join(dir, 'crlf.md');
      await fs.writeFile(lf, specWith(ARCHIVE_TEXT), 'utf-8');
      await fs.writeFile(crlf, specWith(ARCHIVE_TEXT).replace(/\n/g, '\r\n'), 'utf-8');

      const lfReport = await new Validator().validateSpec(lf);
      const crlfReport = await new Validator().validateSpec(crlf);

      expect(purposeIssues(crlfReport.issues)).toEqual(purposeIssues(lfReport.issues));
      expect(purposeIssues(crlfReport.issues)).toEqual([
        {
          level: 'WARNING',
          path: 'overview',
          line: 4,
          message: VALIDATION_MESSAGES.PURPOSE_IS_PLACEHOLDER,
        },
      ]);
    });
  });
});
