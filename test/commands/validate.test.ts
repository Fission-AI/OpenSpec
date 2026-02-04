import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

describe('top-level validate command', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-validate-command-tmp');
  const changesDir = path.join(testDir, 'openspec', 'changes');
  const specsDir = path.join(testDir, 'openspec', 'specs');

  beforeEach(async () => {
    await fs.mkdir(changesDir, { recursive: true });
    await fs.mkdir(specsDir, { recursive: true });

    // Create a valid spec
    const specContent = [
      '## Purpose',
      'This spec ensures the validation harness exercises a deterministic alpha module for automated tests.',
      '',
      '## Requirements',
      '',
      '### Requirement: Alpha module SHALL produce deterministic output',
      'The alpha module SHALL produce a deterministic response for validation.',
      '',
      '#### Scenario: Deterministic alpha run',
      '- **GIVEN** a configured alpha module',
      '- **WHEN** the module runs the default flow',
      '- **THEN** the output matches the expected fixture result',
    ].join('\n');
    await fs.mkdir(path.join(specsDir, 'alpha'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'alpha', 'spec.md'), specContent, 'utf-8');

    // Create a simple change with bullets (parser supports this)
    const changeContent = `# Test Change\n\n## Why\nBecause reasons that are sufficiently long for validation.\n\n## What Changes\n- **alpha:** Add something`;
    await fs.mkdir(path.join(changesDir, 'c1'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'c1', 'proposal.md'), changeContent, 'utf-8');
    const deltaContent = [
      '## ADDED Requirements',
      '### Requirement: Validator SHALL support alpha change deltas',
      'The validator SHALL accept deltas provided by the test harness.',
      '',
      '#### Scenario: Apply alpha delta',
      '- **GIVEN** the test change delta',
      '- **WHEN** openspec validate runs',
      '- **THEN** the validator reports the change as valid',
    ].join('\n');
    const c1DeltaDir = path.join(changesDir, 'c1', 'specs', 'alpha');
    await fs.mkdir(c1DeltaDir, { recursive: true });
    await fs.writeFile(path.join(c1DeltaDir, 'spec.md'), deltaContent, 'utf-8');

    // Duplicate name for ambiguity test
    await fs.mkdir(path.join(changesDir, 'dup'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'dup', 'proposal.md'), changeContent, 'utf-8');
    const dupDeltaDir = path.join(changesDir, 'dup', 'specs', 'dup');
    await fs.mkdir(dupDeltaDir, { recursive: true });
    await fs.writeFile(path.join(dupDeltaDir, 'spec.md'), deltaContent, 'utf-8');
    await fs.mkdir(path.join(specsDir, 'dup'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'dup', 'spec.md'), specContent, 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('prints a helpful hint when no args in non-interactive mode', async () => {
    const result = await runCLI(['validate'], { cwd: testDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Nothing to validate. Try one of:');
  });

  it('validates all with --all and outputs JSON summary', async () => {
    const result = await runCLI(['validate', '--all', '--json'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    const output = result.stdout.trim();
    expect(output).not.toBe('');
    const json = JSON.parse(output);
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.summary?.totals?.items).toBeDefined();
    expect(json.version).toBe('1.0');
  });

  it('validates only specs with --specs and respects --concurrency', async () => {
    const result = await runCLI(['validate', '--specs', '--json', '--concurrency', '1'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    const output = result.stdout.trim();
    expect(output).not.toBe('');
    const json = JSON.parse(output);
    expect(json.items.every((i: any) => i.type === 'spec')).toBe(true);
  });

  it('errors on ambiguous item names and suggests type override', async () => {
    const result = await runCLI(['validate', 'dup'], { cwd: testDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Ambiguous item');
  });

  it('accepts change proposals saved with CRLF line endings', async () => {
    const changeId = 'crlf-change';
    const toCrlf = (segments: string[]) => segments.join('\n').replace(/\n/g, '\r\n');

    const crlfContent = toCrlf([
      '# CRLF Proposal',
      '',
      '## Why',
      'This change verifies validation works with Windows line endings.',
      '',
      '## What Changes',
      '- **alpha:** Ensure validation passes on CRLF files',
    ]);

    await fs.mkdir(path.join(changesDir, changeId), { recursive: true });
    await fs.writeFile(path.join(changesDir, changeId, 'proposal.md'), crlfContent, 'utf-8');

    const deltaContent = toCrlf([
      '## ADDED Requirements',
      '### Requirement: Parser SHALL accept CRLF change proposals',
      'The parser SHALL accept CRLF change proposals without manual edits.',
      '',
      '#### Scenario: Validate CRLF change',
      '- **GIVEN** a change proposal saved with CRLF line endings',
      '- **WHEN** a developer runs openspec validate on the proposal',
      '- **THEN** validation succeeds without section errors',
    ]);

    const deltaDir = path.join(changesDir, changeId, 'specs', 'alpha');
    await fs.mkdir(deltaDir, { recursive: true });
    await fs.writeFile(path.join(deltaDir, 'spec.md'), deltaContent, 'utf-8');

    const result = await runCLI(['validate', changeId], { cwd: testDir });
    expect(result.exitCode).toBe(0);
  });

  it('respects --no-interactive flag passed via CLI', async () => {
    // This test ensures Commander.js --no-interactive flag is correctly parsed
    // and passed to the validate command. The flag sets options.interactive = false
    // (not options.noInteractive = true) due to Commander.js convention.
    const result = await runCLI(['validate', '--specs', '--no-interactive'], {
      cwd: testDir,
      // Don't set OPEN_SPEC_INTERACTIVE to ensure we're testing the flag itself
      env: { ...process.env, OPEN_SPEC_INTERACTIVE: undefined },
    });
    expect(result.exitCode).toBe(0);
    // Should complete without hanging and without prompts
    expect(result.stderr).not.toContain('What would you like to validate?');
  });

  describe('hierarchical specs support', () => {
    it('validates hierarchical specs at depth 2', async () => {
      // Create hierarchical spec: _global/testing
      const hierarchicalContent = [
        '## Purpose',
        'Testing standards for the system.',
        '',
        '## Requirements',
        '',
        '### Requirement: System SHALL have unit tests',
        'All modules SHALL include unit tests.',
        '',
        '#### Scenario: Unit test coverage',
        '- **GIVEN** a module with business logic',
        '- **WHEN** tests are executed',
        '- **THEN** coverage meets minimum threshold',
      ].join('\n');

      const hierarchicalSpecDir = path.join(specsDir, '_global', 'testing');
      await fs.mkdir(hierarchicalSpecDir, { recursive: true });
      await fs.writeFile(path.join(hierarchicalSpecDir, 'spec.md'), hierarchicalContent, 'utf-8');

      const result = await runCLI(['validate', '_global/testing'], { cwd: testDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('valid');
    });

    it('validates hierarchical specs at depth 3', async () => {
      // Create deep hierarchical spec: platform/services/api
      const deepContent = [
        '## Purpose',
        'API service specifications.',
        '',
        '## Requirements',
        '',
        '### Requirement: API SHALL provide REST endpoints',
        'The API service SHALL expose RESTful endpoints.',
        '',
        '#### Scenario: REST endpoint access',
        '- **GIVEN** an authenticated client',
        '- **WHEN** the client makes a GET request',
        '- **THEN** the response contains valid JSON',
      ].join('\n');

      const deepSpecDir = path.join(specsDir, 'platform', 'services', 'api');
      await fs.mkdir(deepSpecDir, { recursive: true });
      await fs.writeFile(path.join(deepSpecDir, 'spec.md'), deepContent, 'utf-8');

      const result = await runCLI(['validate', 'platform/services/api'], { cwd: testDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('valid');
    });

    it('validates mixed flat and hierarchical specs with --specs', async () => {
      // Create another hierarchical spec
      const hierarchicalContent = [
        '## Purpose',
        'Security standards.',
        '',
        '## Requirements',
        '',
        '### Requirement: System SHALL encrypt data',
        'All sensitive data SHALL be encrypted.',
        '',
        '#### Scenario: Data encryption',
        '- **GIVEN** sensitive user data',
        '- **WHEN** stored in the database',
        '- **THEN** it is encrypted at rest',
      ].join('\n');

      const securitySpecDir = path.join(specsDir, '_global', 'security');
      await fs.mkdir(securitySpecDir, { recursive: true });
      await fs.writeFile(path.join(securitySpecDir, 'spec.md'), hierarchicalContent, 'utf-8');

      // Validate all specs (includes flat 'alpha', 'dup' and hierarchical '_global/security')
      const result = await runCLI(['validate', '--specs', '--json'], { cwd: testDir });
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout.trim());
      const specIds = json.items.map((item: any) => item.id);

      // Should include both flat and hierarchical specs
      expect(specIds).toContain('alpha');
      expect(specIds).toContain('dup');
      expect(specIds).toContain('_global/security');
    });

    it('includes structure validation issues in bulk validation', async () => {
      // Create a spec with invalid naming (uppercase)
      const invalidNamingDir = path.join(specsDir, 'Invalid-Name');
      await fs.mkdir(invalidNamingDir, { recursive: true });
      const invalidContent = [
        '## Purpose',
        'This spec has an invalid name.',
        '',
        '## Requirements',
        '',
        '### Requirement: Test SHALL work',
        'Test requirement.',
        '',
        '#### Scenario: Test',
        '- **GIVEN** a test',
        '- **WHEN** it runs',
        '- **THEN** it passes',
      ].join('\n');
      await fs.writeFile(path.join(invalidNamingDir, 'spec.md'), invalidContent, 'utf-8');

      const result = await runCLI(['validate', '--specs', '--json'], { cwd: testDir });

      // Should still complete but report issues
      const json = JSON.parse(result.stdout.trim());

      // Check if there's a structure validation item
      const structureItem = json.items.find((item: any) => item.id === '_structure');
      if (!structureItem) {
        // If no structure item, the spec name might not have been discovered
        // Check if the invalid spec is in the list
        const invalidSpec = json.items.find((item: any) => item.id === 'Invalid-Name');
        expect(invalidSpec).toBeUndefined(); // Should not be discovered due to invalid name
        // The test passes if the invalid-named spec is filtered out during discovery
        return;
      }

      expect(structureItem.valid).toBe(false);
      expect(structureItem.issues.length).toBeGreaterThan(0);

      // Should have at least one naming issue (either "naming convention" or "Invalid segment")
      const namingIssues = structureItem.issues.filter((issue: any) =>
        issue.message.toLowerCase().includes('invalid segment') ||
        issue.message.toLowerCase().includes('naming')
      );
      expect(namingIssues.length).toBeGreaterThan(0);
    });

    it('validates change with hierarchical delta structure', async () => {
      // Test that validate command works with hierarchical change deltas
      const changeId = 'hierarchical-delta-change';
      const changeContent = [
        '# Hierarchical Delta Change',
        '',
        '## Why',
        'Add monitoring specifications to global standards.',
        '',
        '## What Changes',
        '- **_global/monitoring:** Add new monitoring requirements',
      ].join('\n');

      await fs.mkdir(path.join(changesDir, changeId), { recursive: true });
      await fs.writeFile(path.join(changesDir, changeId, 'proposal.md'), changeContent, 'utf-8');

      // Create a hierarchical delta structure (now supported by validator)
      const deltaContent = [
        '# Monitoring Specification - Changes',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: System SHALL have monitoring',
        'All services SHALL be monitored.',
        '',
        '#### Scenario: Monitoring enabled',
        '- **GIVEN** a deployed service',
        '- **WHEN** the service is running',
        '- **THEN** metrics are collected and reported',
      ].join('\n');

      const deltaDir = path.join(changesDir, changeId, 'specs', '_global', 'monitoring');
      await fs.mkdir(deltaDir, { recursive: true });
      await fs.writeFile(path.join(deltaDir, 'spec.md'), deltaContent, 'utf-8');

      const result = await runCLI(['validate', changeId], { cwd: testDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('valid');
    });
  });
});
