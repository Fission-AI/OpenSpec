import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { Validator } from '../../src/core/validation/validator.js';
import { 
  ScenarioSchema, 
  RequirementSchema, 
  SpecSchema, 
  ChangeSchema,
  DeltaSchema 
} from '../../src/core/schemas/index.js';

describe('Validation Schemas', () => {
  describe('ScenarioSchema', () => {
    it('should validate a valid scenario', () => {
      const scenario = {
        rawText: 'Given a user is logged in\nWhen they click logout\nThen they are redirected to login page',
      };
      
      const result = ScenarioSchema.safeParse(scenario);
      expect(result.success).toBe(true);
    });

    it('should reject scenario with empty text', () => {
      const scenario = {
        rawText: '',
      };
      
      const result = ScenarioSchema.safeParse(scenario);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Scenario text cannot be empty');
      }
    });
  });

  describe('RequirementSchema', () => {
    it('should validate a valid requirement', () => {
      const requirement = {
        text: 'The system SHALL provide user authentication',
        scenarios: [
          {
            rawText: 'Given a user with valid credentials\nWhen they submit the login form\nThen they are authenticated',
          },
        ],
      };
      
      const result = RequirementSchema.safeParse(requirement);
      expect(result.success).toBe(true);
    });

    it('no longer enforces SHALL or MUST at the schema level (moved to the validator)', () => {
      // SHALL/MUST body-keyword enforcement moved out of the Zod refine and into
      // Validator.applySpecRules so it can recover the requirement header and
      // emit the targeted body-keyword hint (#1156). The schema therefore accepts
      // a body without the keyword; the validator (exercised below) reports it.
      const requirement = {
        text: 'The system provides user authentication',
        scenarios: [
          {
            rawText: 'Given a user\nWhen they login\nThen authenticated',
          },
        ],
      };

      const result = RequirementSchema.safeParse(requirement);
      expect(result.success).toBe(true);
    });

    it('should reject requirement without scenarios', () => {
      const requirement = {
        text: 'The system SHALL provide user authentication',
        scenarios: [],
      };
      
      const result = RequirementSchema.safeParse(requirement);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Requirement must have at least one scenario');
      }
    });
  });

  describe('SpecSchema', () => {
    it('should validate a valid spec', () => {
      const spec = {
        name: 'user-auth',
        overview: 'This spec defines user authentication requirements',
        requirements: [
          {
            text: 'The system SHALL provide user authentication',
            scenarios: [
              {
                rawText: 'Given a user with valid credentials\nWhen they submit the login form\nThen they are authenticated',
              },
            ],
          },
        ],
      };
      
      const result = SpecSchema.safeParse(spec);
      expect(result.success).toBe(true);
    });

    it('should reject spec without requirements', () => {
      const spec = {
        name: 'user-auth',
        overview: 'This spec defines user authentication requirements',
        requirements: [],
      };
      
      const result = SpecSchema.safeParse(spec);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Spec must have at least one requirement');
      }
    });
  });

  describe('ChangeSchema', () => {
    it('should validate a valid change', () => {
      const change = {
        name: 'add-user-auth',
        why: 'We need user authentication to secure the application and protect user data',
        whatChanges: 'Add authentication module with login and logout capabilities',
        deltas: [
          {
            spec: 'user-auth',
            operation: 'ADDED',
            description: 'Add new user authentication spec',
          },
        ],
      };
      
      const result = ChangeSchema.safeParse(change);
      expect(result.success).toBe(true);
    });

    it('should reject change with short why section', () => {
      const change = {
        name: 'add-user-auth',
        why: 'Need auth',
        whatChanges: 'Add authentication',
        deltas: [
          {
            spec: 'user-auth',
            operation: 'ADDED',
            description: 'Add auth',
          },
        ],
      };
      
      const result = ChangeSchema.safeParse(change);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Why section must be at least 50 characters');
      }
    });

    it('should warn about too many deltas', () => {
      const deltas = Array.from({ length: 11 }, (_, i) => ({
        spec: `spec-${i}`,
        operation: 'ADDED' as const,
        description: `Add spec ${i}`,
      }));
      
      const change = {
        name: 'massive-change',
        why: 'This is a massive change that affects many parts of the system',
        whatChanges: 'Update everything',
        deltas,
      };
      
      const result = ChangeSchema.safeParse(change);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Consider splitting changes with more than 10 deltas');
      }
    });
  });
});

describe('Validator', () => {
  const testDir = path.join(process.cwd(), 'test-validation-tmp');
  
  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('validateSpec', () => {
    it('should validate a valid spec file', async () => {
      const specContent = `# User Authentication Spec

## Purpose
This specification defines the requirements for user authentication in the system.

## Requirements

### The system SHALL provide secure user authentication
The system SHALL provide secure user authentication mechanisms.

#### Scenario: Successful login
Given a user with valid credentials
When they submit the login form
Then they are authenticated and redirected to the dashboard

### The system SHALL handle invalid login attempts
The system SHALL gracefully handle incorrect credentials.

#### Scenario: Invalid credentials
Given a user with invalid credentials
When they submit the login form
Then they see an error message`;

      const specPath = path.join(testDir, 'spec.md');
      await fs.writeFile(specPath, specContent);
      
      const validator = new Validator();
      const report = await validator.validateSpec(specPath);
      
      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
    });

    it('should detect missing overview section', async () => {
      const specContent = `# User Authentication Spec

## Requirements

### The system SHALL provide secure user authentication

#### Scenario: Login
Given a user
When they login
Then authenticated`;

      const specPath = path.join(testDir, 'spec.md');
      await fs.writeFile(specPath, specContent);
      
      const validator = new Validator();
      const report = await validator.validateSpec(specPath);
      
      expect(report.valid).toBe(false);
      expect(report.summary.errors).toBeGreaterThan(0);
      expect(report.issues.some(i => i.message.includes('Purpose'))).toBe(true);
    });

    it('should error on delta headers inside a main spec', async () => {
      const specContent = `# Test Specification

## Purpose
This specification validates that stray delta headers are rejected in main specs.

## Requirements

### Requirement: A
The system SHALL do A.

#### Scenario: A works
- **WHEN** foo
- **THEN** bar

## MODIFIED Requirements

### Requirement: B
The system SHALL do B.

#### Scenario: B works
- **WHEN** baz
- **THEN** qux`;

      const specPath = path.join(testDir, 'spec.md');
      await fs.writeFile(specPath, specContent);

      const report = await new Validator().validateSpec(specPath);

      expect(report.valid).toBe(false);
      expect(
        report.issues.some(i => i.level === 'ERROR' && i.message.includes('Main spec contains delta header'))
      ).toBe(true);
      expect(
        report.issues.some(i => i.level === 'ERROR' && i.message.includes('Requirement header "### Requirement: B" appears outside'))
      ).toBe(true);
    });

    it('should error on requirement headers that appear after the Requirements section ends', async () => {
      const specContent = `# Test Specification

## Purpose
This specification validates that hidden requirements are rejected even without delta headers.

## Requirements

### Requirement: A
The system SHALL do A.

#### Scenario: A works
- **WHEN** foo
- **THEN** bar

## Edge Cases

### Requirement: B
The system SHALL do B.

#### Scenario: B works
- **WHEN** baz
- **THEN** qux`;

      const specPath = path.join(testDir, 'spec.md');
      await fs.writeFile(specPath, specContent);

      const report = await new Validator().validateSpec(specPath);

      expect(report.valid).toBe(false);
      expect(
        report.issues.some(i => i.level === 'ERROR' && i.message.includes('Requirement header "### Requirement: B" appears outside'))
      ).toBe(true);
    });

    it('should ignore delta header examples inside fenced code blocks', async () => {
      const specContent = `# Test Specification

## Purpose
This specification documents delta syntax without being flagged for quoted examples.

## Requirements

### Requirement: Explain delta syntax
The system SHALL allow documentation specs to quote delta headers inside fenced code blocks.

\`\`\`markdown
## ADDED Requirements

### Requirement: Example
The system SHALL ...
\`\`\`

#### Scenario: reader follows the example
- **WHEN** a reader reviews the documentation
- **THEN** the quoted delta header remains an example only`;

      const specPath = path.join(testDir, 'spec.md');
      await fs.writeFile(specPath, specContent);

      const report = await new Validator().validateSpec(specPath);

      expect(report.valid).toBe(true);
      expect(report.issues.some(i => i.message.includes('Main spec contains delta header'))).toBe(false);
      expect(report.issues.some(i => i.message.includes('appears outside the main ## Requirements section'))).toBe(false);
    });
  });

  describe('validateChange', () => {
    it('should validate a valid change file', async () => {
      const changeContent = `# Add User Authentication

## Why
We need to implement user authentication to secure the application and protect user data from unauthorized access.

## What Changes
- **user-auth:** Add new user authentication specification
- **api-endpoints:** Modify to include auth endpoints`;

      const changePath = path.join(testDir, 'change.md');
      await fs.writeFile(changePath, changeContent);
      
      const validator = new Validator();
      const report = await validator.validateChange(changePath);
      
      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
    });

    it('should detect missing why section', async () => {
      const changeContent = `# Add User Authentication

## What Changes
- **user-auth:** Add new user authentication specification`;

      const changePath = path.join(testDir, 'change.md');
      await fs.writeFile(changePath, changeContent);
      
      const validator = new Validator();
      const report = await validator.validateChange(changePath);
      
      expect(report.valid).toBe(false);
      expect(report.summary.errors).toBeGreaterThan(0);
      expect(report.issues.some(i => i.message.includes('Why'))).toBe(true);
    });
  });

  describe('strict mode', () => {
    it('should fail on warnings in strict mode', async () => {
      const specContent = `# Test Spec

## Purpose
Brief overview

## Requirements

### The system SHALL do something

#### Scenario: Test
Given test
When action
Then result`;

      const specPath = path.join(testDir, 'spec.md');
      await fs.writeFile(specPath, specContent);

      const validator = new Validator(true); // strict mode
      const report = await validator.validateSpec(specPath);

      expect(report.valid).toBe(false); // Should fail due to brief overview warning
    });

    it('should pass warnings in non-strict mode', async () => {
      const specContent = `# Test Spec

## Purpose
Brief overview

## Requirements

### The system SHALL do something

#### Scenario: Test
Given test
When action
Then result`;

      const specPath = path.join(testDir, 'spec.md');
      await fs.writeFile(specPath, specContent);

      const validator = new Validator(false); // non-strict mode
      const report = await validator.validateSpec(specPath);

      expect(report.valid).toBe(true); // Should pass despite warnings
      expect(report.summary.warnings).toBeGreaterThan(0);
    });
  });

  describe('validateChangeDeltaSpecs with metadata', () => {
    it('should validate requirement with metadata before SHALL/MUST text', async () => {
      const changeDir = path.join(testDir, 'test-change');
      const specsDir = path.join(changeDir, 'specs', 'test-spec');
      await fs.mkdir(specsDir, { recursive: true });

      const deltaSpec = `# Test Spec

## ADDED Requirements

### Requirement: Circuit Breaker State Management SHALL be implemented
**ID**: REQ-CB-001
**Priority**: P1 (High)

The system MUST implement a circuit breaker with three states.

#### Scenario: Normal operation
**Given** the circuit breaker is in CLOSED state
**When** a request is made
**Then** the request is executed normally`;

      const specPath = path.join(specsDir, 'spec.md');
      await fs.writeFile(specPath, deltaSpec);

      const validator = new Validator(true);
      const report = await validator.validateChangeDeltaSpecs(changeDir);

      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
    });

    it('should validate requirement with SHALL in text but not in header', async () => {
      const changeDir = path.join(testDir, 'test-change-2');
      const specsDir = path.join(changeDir, 'specs', 'test-spec');
      await fs.mkdir(specsDir, { recursive: true });

      const deltaSpec = `# Test Spec

## ADDED Requirements

### Requirement: Error Handling
**ID**: REQ-ERR-001
**Priority**: P2

The system SHALL handle all errors gracefully.

#### Scenario: Error occurs
**Given** an error condition
**When** an error occurs
**Then** the error is logged and user is notified`;

      const specPath = path.join(specsDir, 'spec.md');
      await fs.writeFile(specPath, deltaSpec);

      const validator = new Validator(true);
      const report = await validator.validateChangeDeltaSpecs(changeDir);

      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
    });

    it('should fail when requirement text lacks SHALL/MUST', async () => {
      const changeDir = path.join(testDir, 'test-change-3');
      const specsDir = path.join(changeDir, 'specs', 'test-spec');
      await fs.mkdir(specsDir, { recursive: true });

      const deltaSpec = `# Test Spec

## ADDED Requirements

### Requirement: Logging Feature
**ID**: REQ-LOG-001

The system will log all events.

#### Scenario: Event occurs
**Given** an event
**When** it occurs
**Then** it is logged`;

      const specPath = path.join(specsDir, 'spec.md');
      await fs.writeFile(specPath, deltaSpec);

      const validator = new Validator(true);
      const report = await validator.validateChangeDeltaSpecs(changeDir);

      expect(report.valid).toBe(false);
      expect(report.summary.errors).toBeGreaterThan(0);
      expect(report.issues.some(i => i.message.includes('must contain SHALL or MUST'))).toBe(true);
    });

    it('should hint the author when ADDED requirement only has SHALL/MUST in the header', async () => {
      const changeDir = path.join(testDir, 'test-change-shall-in-header-added');
      const specsDir = path.join(changeDir, 'specs', 'test-spec');
      await fs.mkdir(specsDir, { recursive: true });

      const deltaSpec = `# Test Spec

## ADDED Requirements

### Requirement: The system SHALL log all errors
Error handling logic goes here.

#### Scenario: Error occurs
**Given** an error
**When** it occurs
**Then** it is logged`;

      const specPath = path.join(specsDir, 'spec.md');
      await fs.writeFile(specPath, deltaSpec);

      const validator = new Validator(true);
      const report = await validator.validateChangeDeltaSpecs(changeDir);

      expect(report.valid).toBe(false);
      const shallMessage = report.issues.find(i => i.message.includes('must contain SHALL or MUST'));
      expect(shallMessage?.message).toContain('not only in the header');
      expect(shallMessage?.message).toContain('### Requirement:');
    });

    it('should hint the author when MODIFIED requirement only has SHALL/MUST in the header', async () => {
      const changeDir = path.join(testDir, 'test-change-shall-in-header-modified');
      const specsDir = path.join(changeDir, 'specs', 'test-spec');
      await fs.mkdir(specsDir, { recursive: true });

      const deltaSpec = `# Test Spec

## MODIFIED Requirements

### Requirement: The system MUST validate user input
Please describe how validation should work here.

#### Scenario: Invalid input
**Given** invalid input
**When** validation runs
**Then** an error surfaces`;

      const specPath = path.join(specsDir, 'spec.md');
      await fs.writeFile(specPath, deltaSpec);

      const validator = new Validator(true);
      const report = await validator.validateChangeDeltaSpecs(changeDir);

      expect(report.valid).toBe(false);
      const shallMessage = report.issues.find(i => i.message.includes('must contain SHALL or MUST'));
      expect(shallMessage?.message).toContain('not only in the header');
      expect(shallMessage?.message).toContain('### Requirement:');
    });

    it('should keep the generic SHALL/MUST error when neither header nor body contain the keyword', async () => {
      const changeDir = path.join(testDir, 'test-change-shall-nowhere');
      const specsDir = path.join(changeDir, 'specs', 'test-spec');
      await fs.mkdir(specsDir, { recursive: true });

      const deltaSpec = `# Test Spec

## ADDED Requirements

### Requirement: Logging Feature
The system will log all events.

#### Scenario: Event occurs
**Given** an event
**When** it occurs
**Then** it is logged`;

      const specPath = path.join(specsDir, 'spec.md');
      await fs.writeFile(specPath, deltaSpec);

      const validator = new Validator(true);
      const report = await validator.validateChangeDeltaSpecs(changeDir);

      expect(report.valid).toBe(false);
      const shallMessage = report.issues.find(i => i.message.includes('must contain SHALL or MUST'));
      expect(shallMessage?.message).not.toContain('not only in the header');
    });

    it('should handle requirements without metadata fields', async () => {
      const changeDir = path.join(testDir, 'test-change-4');
      const specsDir = path.join(changeDir, 'specs', 'test-spec');
      await fs.mkdir(specsDir, { recursive: true });

      const deltaSpec = `# Test Spec

## ADDED Requirements

### Requirement: Simple Feature
The system SHALL implement this feature.

#### Scenario: Basic usage
**Given** a condition
**When** an action occurs
**Then** a result happens`;

      const specPath = path.join(specsDir, 'spec.md');
      await fs.writeFile(specPath, deltaSpec);

      const validator = new Validator(true);
      const report = await validator.validateChangeDeltaSpecs(changeDir);

      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
    });

    it('should treat delta headers case-insensitively', async () => {
      const changeDir = path.join(testDir, 'test-change-mixed-case');
      const specsDir = path.join(changeDir, 'specs', 'test-spec');
      await fs.mkdir(specsDir, { recursive: true });

      const deltaSpec = `# Test Spec

## Added Requirements

### Requirement: Mixed Case Handling
The system MUST support mixed case delta headers.

#### Scenario: Case insensitive parsing
**Given** a delta file with mixed case headers
**When** validation runs
**Then** the delta is detected`;

      const specPath = path.join(specsDir, 'spec.md');
      await fs.writeFile(specPath, deltaSpec);

      const validator = new Validator(true);
      const report = await validator.validateChangeDeltaSpecs(changeDir);

      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
      expect(report.summary.warnings).toBe(0);
      expect(report.summary.info).toBe(0);
    });

    // #1182b — delta discovery recurses the nested multi-area layout.
    it('discovers and validates deltas in a nested specs/<area>/<capability> layout (#1182b)', async () => {
      const changeDir = path.join(testDir, 'test-change-nested');
      const nestedDir = path.join(changeDir, 'specs', 'area-one', 'cap-a');
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(
        path.join(nestedDir, 'spec.md'),
        `## ADDED Requirements\n\n### Requirement: Nested capability\nThe system SHALL support nested multi-area delta layouts.\n\n#### Scenario: Nested delta is discovered\n- **WHEN** validating a change with nested specs\n- **THEN** the delta is found and validated`
      );

      const report = await new Validator(true).validateChangeDeltaSpecs(changeDir);
      expect(report.issues.some(i => i.message.includes('No delta sections found'))).toBe(false);
      expect(report.issues.some(i => i.message.includes('No deltas found'))).toBe(false);
      expect(report.valid).toBe(true);
    });

    it('still validates a single-level layout unchanged (#1182b control)', async () => {
      const changeDir = path.join(testDir, 'test-change-onelevel');
      const oneLevelDir = path.join(changeDir, 'specs', 'cap-a');
      await fs.mkdir(oneLevelDir, { recursive: true });
      await fs.writeFile(
        path.join(oneLevelDir, 'spec.md'),
        `## ADDED Requirements\n\n### Requirement: One level capability\nThe system SHALL support a one-level layout.\n\n#### Scenario: One level delta\n- **WHEN** validating\n- **THEN** the delta is found`
      );

      const report = await new Validator(true).validateChangeDeltaSpecs(changeDir);
      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
    });
  });

  // #1156 — the SHALL/MUST body-keyword hint applies to main specs too, with the
  // actionable sentence byte-identical to the change-delta path, emitted once.
  describe('main-spec SHALL/MUST body-keyword hint (#1156)', () => {
    const ACTIONABLE_SENTENCE =
      'must contain SHALL or MUST in the requirement body, not only in the header. Move the SHALL/MUST statement to the line immediately after the "### Requirement: ..." header.';

    const buildSpec = (requirementBlock: string): string =>
      [
        '# Demo Spec',
        '',
        '## Purpose',
        'A purpose long enough to satisfy the validator length threshold for tests.',
        '',
        '## Requirements',
        '',
        requirementBlock,
      ].join('\n');

    const shallIssues = (issues: { message: string }[]) =>
      issues.filter(i => i.message.includes('SHALL or MUST'));

    it('emits the targeted hint when the keyword is in the header only (with a body line)', async () => {
      const content = buildSpec(
        '### Requirement: The system SHALL log\nLogging happens here.\n\n#### Scenario: S\n- **WHEN** x\n- **THEN** y'
      );
      const report = await new Validator().validateSpecContent('demo', content);
      const issues = shallIssues(report.issues);
      expect(issues).toHaveLength(1); // exactly one, no duplicate generic
      expect(issues[0].message).toContain('not only in the header');
      expect(issues[0].message).toContain(ACTIONABLE_SENTENCE);
    });

    it('uses an actionable sentence byte-identical to the change-delta message', async () => {
      const block =
        '### Requirement: The system SHALL log\nLogging happens here.\n\n#### Scenario: S\n- **WHEN** x\n- **THEN** y';

      const specReport = await new Validator().validateSpecContent('demo', buildSpec(block));
      const specMsg = shallIssues(specReport.issues)[0].message;

      const changeDir = path.join(testDir, 'change-parity-sentence');
      const deltaDir = path.join(changeDir, 'specs', 'cap');
      await fs.mkdir(deltaDir, { recursive: true });
      await fs.writeFile(path.join(deltaDir, 'spec.md'), `## ADDED Requirements\n\n${block}`);
      const deltaReport = await new Validator().validateChangeDeltaSpecs(changeDir);
      const deltaMsg = shallIssues(deltaReport.issues)[0].message;

      // Same actionable sentence; only the leading prefix differs.
      expect(specMsg.endsWith(ACTIONABLE_SENTENCE)).toBe(true);
      expect(deltaMsg.endsWith(ACTIONABLE_SENTENCE)).toBe(true);
      expect(specMsg.startsWith('Requirement "The system SHALL log"')).toBe(true);
      expect(deltaMsg.startsWith('ADDED "The system SHALL log"')).toBe(true);
    });

    it('keeps a generic missing-keyword error when neither header nor body has the keyword', async () => {
      const content = buildSpec(
        '### Requirement: Logging\nThe system will log all events.\n\n#### Scenario: S\n- **WHEN** x\n- **THEN** y'
      );
      const report = await new Validator().validateSpecContent('demo', content);
      const issues = shallIssues(report.issues);
      expect(issues).toHaveLength(1);
      expect(issues[0].message).not.toContain('not only in the header');
    });

    it('does not flag a requirement whose body line contains the keyword', async () => {
      const content = buildSpec(
        '### Requirement: Logging\nThe system SHALL log all events.\n\n#### Scenario: S\n- **WHEN** x\n- **THEN** y'
      );
      const report = await new Validator().validateSpecContent('demo', content);
      expect(shallIssues(report.issues)).toHaveLength(0);
    });

    it('rejects a lowercase shall/must in the body (matching the delta path)', async () => {
      const content = buildSpec(
        '### Requirement: Logging\nthe system shall log all events.\n\n#### Scenario: S\n- **WHEN** x\n- **THEN** y'
      );
      const report = await new Validator().validateSpecContent('demo', content);
      expect(shallIssues(report.issues)).toHaveLength(1);
    });

    it('emits the hint for a header-only requirement with no body line (intended additive change)', async () => {
      const content = buildSpec(
        '### Requirement: The system MUST be available\n\n#### Scenario: S\n- **WHEN** x\n- **THEN** y'
      );
      const report = await new Validator().validateSpecContent('demo', content);
      const issues = shallIssues(report.issues);
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('not only in the header');
    });

    it('does not subject RENAMED requirements to the hint (byte-for-byte unchanged)', async () => {
      const changeDir = path.join(testDir, 'change-renamed');
      const deltaDir = path.join(changeDir, 'specs', 'cap');
      await fs.mkdir(deltaDir, { recursive: true });
      await fs.writeFile(
        path.join(deltaDir, 'spec.md'),
        '## RENAMED Requirements\n\n- FROM: `### Requirement: Old name`\n- TO: `### Requirement: The system SHALL do the new thing`\n'
      );
      const report = await new Validator().validateChangeDeltaSpecs(changeDir);
      expect(report.issues.some(i => i.message.includes('not only in the header'))).toBe(false);
    });
  });
});
