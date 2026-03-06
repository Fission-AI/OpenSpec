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
import { containsNormativeKeyword } from '../../src/core/validation/constants.js';

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

    it('should reject requirement without SHALL or MUST', () => {
      const requirement = {
        text: 'The system provides user authentication',
        scenarios: [
          {
            rawText: 'Given a user\nWhen they login\nThen authenticated',
          },
        ],
      };
      
      const result = RequirementSchema.safeParse(requirement);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Requirement must contain an UPPERCASE normative keyword (SHALL, MUST, DEBE, DEBERA, DEBERÁ)');
      }
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

  describe('containsNormativeKeyword', () => {
    it('should accept English keywords', () => {
      expect(containsNormativeKeyword('The system SHALL do X')).toBe(true);
      expect(containsNormativeKeyword('The system MUST do X')).toBe(true);
    });

    it('should accept Spanish keywords', () => {
      expect(containsNormativeKeyword('El sistema DEBE hacer X')).toBe(true);
      expect(containsNormativeKeyword('El sistema DEBERA hacer X')).toBe(true);
    });

    it('should accept accented Spanish keyword', () => {
      expect(containsNormativeKeyword('El sistema DEBERÁ hacer X')).toBe(true);
    });

    it('should reject lowercase keywords', () => {
      expect(containsNormativeKeyword('The system shall do X')).toBe(false);
      expect(containsNormativeKeyword('The system must do X')).toBe(false);
      expect(containsNormativeKeyword('El sistema debe hacer X')).toBe(false);
      expect(containsNormativeKeyword('El sistema debera hacer X')).toBe(false);
    });

    it('should reject substring matches', () => {
      expect(containsNormativeKeyword('The INDEBTED user logs in')).toBe(false);
      expect(containsNormativeKeyword('MUSTERING all resources')).toBe(false);
    });

    it('should reject text without any normative keyword', () => {
      expect(containsNormativeKeyword('The system will do X')).toBe(false);
    });
  });

  describe('RequirementSchema with Spanish keywords', () => {
    const validScenario = { rawText: 'Given X\nWhen Y\nThen Z' };

    it('should accept requirement with DEBE', () => {
      const result = RequirementSchema.safeParse({
        text: 'El sistema DEBE autenticar usuarios',
        scenarios: [validScenario],
      });
      expect(result.success).toBe(true);
    });

    it('should accept requirement with DEBERA', () => {
      const result = RequirementSchema.safeParse({
        text: 'El sistema DEBERA manejar errores',
        scenarios: [validScenario],
      });
      expect(result.success).toBe(true);
    });

    it('should reject requirement without any normative keyword', () => {
      const result = RequirementSchema.safeParse({
        text: 'El sistema maneja errores',
        scenarios: [validScenario],
      });
      expect(result.success).toBe(false);
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
      expect(report.issues.some(i => i.message.includes('must contain an UPPERCASE normative keyword'))).toBe(true);
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

    it('should pass ADDED requirement with Spanish DEBE keyword', async () => {
      const changeDir = path.join(testDir, 'test-change-es-debe');
      const specsDir = path.join(changeDir, 'specs', 'test-spec');
      await fs.mkdir(specsDir, { recursive: true });

      const deltaSpec = `# Test Spec

## ADDED Requirements

### Requirement: Autenticacion de usuarios
El sistema DEBE autenticar a los usuarios antes de permitir acceso.

#### Scenario: Login exitoso
**Given** un usuario con credenciales validas
**When** envia el formulario de login
**Then** el usuario es autenticado`;

      const specPath = path.join(specsDir, 'spec.md');
      await fs.writeFile(specPath, deltaSpec);

      const validator = new Validator(true);
      const report = await validator.validateChangeDeltaSpecs(changeDir);

      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
    });

    it('should pass MODIFIED requirement with Spanish DEBERA keyword', async () => {
      const changeDir = path.join(testDir, 'test-change-es-debera');
      const specsDir = path.join(changeDir, 'specs', 'test-spec');
      await fs.mkdir(specsDir, { recursive: true });

      const deltaSpec = `# Test Spec

## MODIFIED Requirements

### Requirement: Manejo de errores
El sistema DEBERA manejar todos los errores correctamente.

#### Scenario: Error de red
**Given** una conexion inestable
**When** ocurre un error de red
**Then** el sistema muestra un mensaje de error`;

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
  });
});
