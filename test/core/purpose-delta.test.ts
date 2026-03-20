/**
 * Purpose Delta Tests
 *
 * Tests for first-class Purpose delta support in OpenSpec.
 * Covers: parser (parseDeltaSpec), validator (validateChangeDeltaSpecs),
 *         apply (buildUpdatedSpec), and change-parser (parseSpecDeltas).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseDeltaSpec } from '../../src/core/parsers/requirement-blocks.js';
import { Validator } from '../../src/core/validation/validator.js';
import { buildUpdatedSpec, type SpecUpdate } from '../../src/core/specs-apply.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Purpose Delta Support', () => {
  // -----------------------------------------------------------------------
  // Parser tests (parseDeltaSpec)
  // -----------------------------------------------------------------------
  describe('parseDeltaSpec — Purpose extraction', () => {
    it('should extract purposeText from a purpose-only delta', () => {
      const content = `# Some Delta Spec

## Purpose

This is the new purpose text for the spec.
`;
      const plan = parseDeltaSpec(content);
      expect(plan.purposeText).toBe('This is the new purpose text for the spec.');
      expect(plan.added).toHaveLength(0);
      expect(plan.modified).toHaveLength(0);
      expect(plan.removed).toHaveLength(0);
      expect(plan.renamed).toHaveLength(0);
    });

    it('should extract purposeText from a mixed Purpose + MODIFIED delta', () => {
      const content = `# Mixed Delta

## Purpose

Updated purpose text.

## MODIFIED Requirements

### Requirement: Auth Check

The system MUST verify tokens on login.

#### Scenario: Token expired

Given a user with an expired token
When they attempt to access a resource
Then the system returns 401
`;
      const plan = parseDeltaSpec(content);
      expect(plan.purposeText).toBe('Updated purpose text.');
      expect(plan.modified).toHaveLength(1);
      expect(plan.modified[0].name).toBe('Auth Check');
    });

    it('should return undefined purposeText when no Purpose section exists', () => {
      const content = `# Delta Spec

## ADDED Requirements

### Requirement: New Thing

The system MUST do the new thing.

#### Scenario: Basic usage

Given the system
When the user does the thing
Then the system does its thing
`;
      const plan = parseDeltaSpec(content);
      expect(plan.purposeText).toBeUndefined();
      expect(plan.added).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Validator tests (validateChangeDeltaSpecs)
  // -----------------------------------------------------------------------
  describe('Validator — Purpose delta acceptance', () => {
    let tmpDir: string;
    let changeDir: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-purpose-test-'));
      changeDir = path.join(tmpDir, 'test-change');
      await fs.mkdir(path.join(changeDir, 'specs'), { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should accept a purpose-only delta file as valid', async () => {
      const specDir = path.join(changeDir, 'specs', 'my-spec');
      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(
        path.join(specDir, 'spec.md'),
        `# My Spec Delta

## Purpose

This is the new purpose.
`
      );

      const validator = new Validator();
      const report = await validator.validateChangeDeltaSpecs(changeDir);
      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
    });

    it('should accept a mixed Purpose + MODIFIED delta file as valid', async () => {
      const specDir = path.join(changeDir, 'specs', 'my-spec');
      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(
        path.join(specDir, 'spec.md'),
        `# My Spec Delta

## Purpose

Updated purpose.

## MODIFIED Requirements

### Requirement: Some Rule

The system MUST validate inputs.

#### Scenario: Bad input

Given bad input
When the system processes it
Then the system rejects it
`
      );

      const validator = new Validator();
      const report = await validator.validateChangeDeltaSpecs(changeDir);
      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
    });

    it('should reject a file with neither Purpose nor requirement sections', async () => {
      const specDir = path.join(changeDir, 'specs', 'empty-spec');
      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(
        path.join(specDir, 'spec.md'),
        `# Empty Delta Spec

Just some text with no sections.
`
      );

      const validator = new Validator();
      const report = await validator.validateChangeDeltaSpecs(changeDir);
      expect(report.valid).toBe(false);
      expect(report.summary.errors).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // Apply tests (buildUpdatedSpec)
  // -----------------------------------------------------------------------
  describe('buildUpdatedSpec — Purpose delta application', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-purpose-apply-'));
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should update Purpose and preserve requirements for purpose-only delta', async () => {
      // Create source delta (purpose-only)
      const srcDir = path.join(tmpDir, 'change', 'specs', 'my-spec');
      await fs.mkdir(srcDir, { recursive: true });
      const srcFile = path.join(srcDir, 'spec.md');
      await fs.writeFile(srcFile, `# My Spec Delta

## Purpose

This is the brand new purpose text.
`);

      // Create target main spec
      const tgtDir = path.join(tmpDir, 'main', 'my-spec');
      await fs.mkdir(tgtDir, { recursive: true });
      const tgtFile = path.join(tgtDir, 'spec.md');
      await fs.writeFile(tgtFile, `# my-spec Specification

## Purpose

Old purpose text here.

## Requirements

### Requirement: Basic Functionality

The system MUST do basic things.

#### Scenario: Default behavior

Given default state
When user interacts
Then system responds
`);

      const update: SpecUpdate = { source: srcFile, target: tgtFile, exists: true };
      const { rebuilt, counts } = await buildUpdatedSpec(update, 'test-change');

      // Purpose updated
      expect(rebuilt).toContain('This is the brand new purpose text.');
      expect(rebuilt).not.toContain('Old purpose text here.');

      // Requirements preserved untouched
      expect(rebuilt).toContain('### Requirement: Basic Functionality');
      expect(rebuilt).toContain('#### Scenario: Default behavior');
      expect(rebuilt).toContain('The system MUST do basic things.');

      // Counts: no requirement changes
      expect(counts.added).toBe(0);
      expect(counts.modified).toBe(0);
      expect(counts.removed).toBe(0);
      expect(counts.renamed).toBe(0);
    });

    it('should update both Purpose and requirements for mixed delta', async () => {
      // Create source delta (Purpose + ADDED requirement)
      const srcDir = path.join(tmpDir, 'change', 'specs', 'mixed-spec');
      await fs.mkdir(srcDir, { recursive: true });
      const srcFile = path.join(srcDir, 'spec.md');
      await fs.writeFile(srcFile, `# Mixed Delta

## Purpose

Updated purpose from delta.

## ADDED Requirements

### Requirement: New Rule

The system MUST enforce the new rule.

#### Scenario: Rule enforcement

Given conditions
When triggered
Then the rule applies
`);

      // Create target main spec
      const tgtDir = path.join(tmpDir, 'main', 'mixed-spec');
      await fs.mkdir(tgtDir, { recursive: true });
      const tgtFile = path.join(tgtDir, 'spec.md');
      await fs.writeFile(tgtFile, `# mixed-spec Specification

## Purpose

Original purpose.

## Requirements

### Requirement: Existing Rule

The system MUST keep this.

#### Scenario: Existing behavior

Given state
When action
Then result
`);

      const update: SpecUpdate = { source: srcFile, target: tgtFile, exists: true };
      const { rebuilt, counts } = await buildUpdatedSpec(update, 'test-change');

      // Purpose updated
      expect(rebuilt).toContain('Updated purpose from delta.');
      expect(rebuilt).not.toContain('Original purpose.');

      // Existing requirement preserved
      expect(rebuilt).toContain('### Requirement: Existing Rule');

      // New requirement added
      expect(rebuilt).toContain('### Requirement: New Rule');
      expect(counts.added).toBe(1);
    });
  });
});
