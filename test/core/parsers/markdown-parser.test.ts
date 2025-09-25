import { describe, it, expect } from 'vitest';
import { MarkdownParser } from '../../../src/core/parsers/markdown-parser.js';

describe('MarkdownParser', () => {
  describe('parseSpec', () => {
    it('should parse a valid spec', () => {
      const content = `# User Authentication Spec

## Purpose
This specification defines the requirements for user authentication.

## Requirements

### The system SHALL provide secure user authentication
Users need to be able to log in securely.

#### Scenario: Successful login
Given a user with valid credentials
When they submit the login form
Then they are authenticated

### The system SHALL handle invalid login attempts
The system must handle incorrect credentials.

#### Scenario: Invalid credentials
Given a user with invalid credentials
When they submit the login form
Then they see an error message`;

      const parser = new MarkdownParser(content);
      const spec = parser.parseSpec('user-auth');
      
      expect(spec.name).toBe('user-auth');
      expect(spec.overview).toContain('requirements for user authentication');
      expect(spec.requirements).toHaveLength(2);
      
      const firstReq = spec.requirements[0];
      expect(firstReq.text).toBe('Users need to be able to log in securely.');
      expect(firstReq.scenarios).toHaveLength(1);
      
      const scenario = firstReq.scenarios[0];
      expect(scenario.rawText).toContain('Given a user with valid credentials');
      expect(scenario.rawText).toContain('When they submit the login form');
      expect(scenario.rawText).toContain('Then they are authenticated');
    });

    it('should handle multi-line scenarios', () => {
      const content = `# Test Spec

## Purpose
Test overview

## Requirements

### The system SHALL handle complex scenarios
This requirement has content.

#### Scenario: Multi-line scenario
Given a user with valid credentials
  and the user has admin privileges
  and the system is in maintenance mode
When they attempt to login
  and provide their MFA token
Then they are authenticated
  and redirected to admin dashboard
  and see a maintenance warning`;

      const parser = new MarkdownParser(content);
      const spec = parser.parseSpec('test');
      
      const scenario = spec.requirements[0].scenarios[0];
      expect(scenario.rawText).toContain('Given a user with valid credentials');
      expect(scenario.rawText).toContain('and the user has admin privileges');
      expect(scenario.rawText).toContain('When they attempt to login');
      expect(scenario.rawText).toContain('and provide their MFA token');
      expect(scenario.rawText).toContain('Then they are authenticated');
      expect(scenario.rawText).toContain('and see a maintenance warning');
    });

    it('should throw error for missing overview', () => {
      const content = `# Test Spec

## Requirements

### The system SHALL do something

#### Scenario: Test
Given test
When action
Then result`;

      const parser = new MarkdownParser(content);
      expect(() => parser.parseSpec('test')).toThrow('must have a Purpose section');
    });

    it('should throw error for missing requirements', () => {
      const content = `# Test Spec

## Purpose
This is a test spec`;

      const parser = new MarkdownParser(content);
      expect(() => parser.parseSpec('test')).toThrow('must have a Requirements section');
    });
  });

  describe('parseChange', () => {
    it('should parse a valid change', () => {
      const content = `# Add User Authentication

## Why
We need to implement user authentication to secure the application and protect user data from unauthorized access.

## What Changes
- **user-auth:** Add new user authentication specification
- **api-endpoints:** Modify to include authentication endpoints
- **database:** Remove old session management tables`;

      const parser = new MarkdownParser(content);
      const change = parser.parseChange('add-user-auth');
      
      expect(change.name).toBe('add-user-auth');
      expect(change.why).toContain('secure the application');
      expect(change.whatChanges).toContain('user-auth');
      expect(change.deltas).toHaveLength(3);
      
      expect(change.deltas[0].spec).toBe('user-auth');
      expect(change.deltas[0].operation).toBe('ADDED');
      expect(change.deltas[0].description).toContain('Add new user authentication');
      
      expect(change.deltas[1].spec).toBe('api-endpoints');
      expect(change.deltas[1].operation).toBe('MODIFIED');
      
      expect(change.deltas[2].spec).toBe('database');
      expect(change.deltas[2].operation).toBe('REMOVED');
    });

    it('should throw error for missing why section', () => {
      const content = `# Test Change

## What Changes
- **test:** Add test`;

      const parser = new MarkdownParser(content);
      expect(() => parser.parseChange('test')).toThrow('must have a Why section');
    });

    it('should throw error for missing what changes section', () => {
      const content = `# Test Change

## Why
Because we need it`;

      const parser = new MarkdownParser(content);
      expect(() => parser.parseChange('test')).toThrow('must have a What Changes section');
    });

    it('should handle changes without deltas', () => {
      const content = `# Test Change

## Why
We need to make some changes for important reasons that justify this work.

## What Changes
Some general description of changes without specific deltas`;

      const parser = new MarkdownParser(content);
      const change = parser.parseChange('test');
      
      expect(change.deltas).toHaveLength(0);
    });

    it('parses change documents saved with CRLF line endings', () => {
      const crlfContent = [
        '# CRLF Change',
        '',
        '## Why',
        'Reasons on Windows editors should parse like POSIX environments.',
        '',
        '## What Changes',
        '- **alpha:** Add cross-platform parsing coverage',
      ].join('\r\n');

      const parser = new MarkdownParser(crlfContent);
      const change = parser.parseChange('crlf-change');

      expect(change.why).toContain('Windows editors should parse');
      expect(change.deltas).toHaveLength(1);
      expect(change.deltas[0].spec).toBe('alpha');
    });
  });

  describe('section parsing', () => {
    it('should handle nested sections correctly', () => {
      const content = `# Test Spec

## Purpose
This is the overview section for testing nested sections.

## Requirements

### The system SHALL handle nested sections

#### Scenario: Test nested
Given a nested structure
When parsing sections
Then handle correctly

### Another requirement SHALL work

#### Scenario: Another test
Given another test
When running
Then success`;

      const parser = new MarkdownParser(content);
      const spec = parser.parseSpec('test');
      
      // Should find the correct sections at different levels
      expect(spec).toBeDefined();
      expect(spec.overview).toContain('testing nested sections');
      expect(spec.requirements).toHaveLength(2);
    });

    it('should preserve content between headers', () => {
      const content = `# Test

## Purpose
This is the overview.
It has multiple lines.

Some more content here.

## Requirements

### Requirement 1
Content for requirement 1`;

      const parser = new MarkdownParser(content);
      const spec = parser.parseSpec('test');
      
      expect(spec.overview).toContain('multiple lines');
      expect(spec.overview).toContain('more content');
    });

    it('should use requirement heading as fallback when no content is provided', () => {
      const content = `# Test Spec

## Purpose
Test overview

## Requirements

### The system SHALL use heading text when no content

#### Scenario: Test
Given test
When action
Then result`;

      const parser = new MarkdownParser(content);
      const spec = parser.parseSpec('test');
      
      expect(spec.requirements[0].text).toBe('The system SHALL use heading text when no content');
    });

    it('should extract requirement text from first non-empty content line', () => {
      const content = `# Test Spec

## Purpose
Test overview

## Requirements

### Requirement heading

This is the actual requirement text.
This is additional description.

#### Scenario: Test
Given test
When action
Then result`;

      const parser = new MarkdownParser(content);
      const spec = parser.parseSpec('test');
      
      expect(spec.requirements[0].text).toBe('This is the actual requirement text.');
    });
  });
});