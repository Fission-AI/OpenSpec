import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { JsonConverter } from '../../../src/core/converters/json-converter.js';

describe('JsonConverter', () => {
  const testDir = path.join(process.cwd(), 'test-json-converter-tmp');
  const converter = new JsonConverter();
  
  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('convertSpecToJson', () => {
    it('should convert a spec to JSON format', async () => {
      const specContent = `# User Authentication Spec

## Purpose
This specification defines the requirements for user authentication.

## Requirements

### The system SHALL provide secure user authentication
Users need to be able to log in securely.

#### Scenario: Successful login
Given a user with valid credentials
When they submit the login form
Then they are authenticated`;

      const specPath = path.join(testDir, 'spec.md');
      await fs.writeFile(specPath, specContent);
      
      const json = converter.convertSpecToJson(specPath);
      const parsed = JSON.parse(json);
      
      expect(parsed.name).toBe('spec');
      expect(parsed.overview).toContain('user authentication');
      expect(parsed.requirements).toHaveLength(1);
      expect(parsed.requirements[0].scenarios).toHaveLength(1);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.format).toBe('openspec');
      expect(parsed.metadata.sourcePath).toBe(specPath);
    });

    it('should extract spec name from directory structure', async () => {
      const specsDir = path.join(testDir, 'specs', 'user-auth');
      await fs.mkdir(specsDir, { recursive: true });
      
      const specContent = `# User Auth

## Purpose
Auth spec overview

## Requirements

### The system SHALL authenticate users

#### Scenario: Login
Given a user
When they login
Then authenticated`;

      const specPath = path.join(specsDir, 'spec.md');
      await fs.writeFile(specPath, specContent);
      
      const json = converter.convertSpecToJson(specPath);
      const parsed = JSON.parse(json);
      
      expect(parsed.name).toBe('user-auth');
    });
  });

  describe('convertChangeToJson', () => {
    it('should convert a change to JSON format', async () => {
      const changeContent = `# Add User Authentication

## Why
We need to implement user authentication to secure the application and protect user data from unauthorized access.

## What Changes
- **user-auth:** Add new user authentication specification
- **api-endpoints:** Modify to include authentication endpoints`;

      const changePath = path.join(testDir, 'change.md');
      await fs.writeFile(changePath, changeContent);
      
      const json = await converter.convertChangeToJson(changePath);
      const parsed = JSON.parse(json);
      
      expect(parsed.name).toBe('change');
      expect(parsed.why).toContain('secure the application');
      expect(parsed.deltas).toHaveLength(2);
      expect(parsed.deltas[0].spec).toBe('user-auth');
      expect(parsed.deltas[0].operation).toBe('ADDED');
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.format).toBe('lightspec-'change');
      expect(parsed.metadata.sourcePath).toBe(changePath);
    });

    it('should extract change name from directory structure', async () => {
      const changesDir = path.join(testDir, 'changes', 'add-auth');
      await fs.mkdir(changesDir, { recursive: true });
      
      const changeContent = `# Add Auth

## Why
We need authentication for security reasons and to protect user data properly.

## What Changes
- **auth:** Add authentication`;

      const changePath = path.join(changesDir, 'proposal.md');
      await fs.writeFile(changePath, changeContent);
      
      const json = await converter.convertChangeToJson(changePath);
      const parsed = JSON.parse(json);
      
      expect(parsed.name).toBe('add-auth');
    });
  });

  describe('JSON formatting', () => {
    it('should produce properly formatted JSON with indentation', async () => {
      const specContent = `# Test

## Purpose
Test overview

## Requirements

### The system SHALL test

#### Scenario: Test
Given test
When action
Then result`;

      const specPath = path.join(testDir, 'spec.md');
      await fs.writeFile(specPath, specContent);
      
      const json = converter.convertSpecToJson(specPath);
      
      // Check for proper indentation (2 spaces)
      expect(json).toContain('  "name"');
      expect(json).toContain('  "overview"');
      expect(json).toContain('  "requirements"');
      
      // Check it's valid JSON
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should handle special characters in content', async () => {
      const specContent = `# Test

## Purpose
This has "quotes" and \\ backslashes and
newlines

## Requirements

### The system SHALL handle "special" characters

#### Scenario: Special chars
Given a string with "quotes"
When processing \\ backslash
Then handle correctly`;

      const specPath = path.join(testDir, 'spec.md');
      await fs.writeFile(specPath, specContent);
      
      const json = converter.convertSpecToJson(specPath);
      const parsed = JSON.parse(json);
      
      expect(parsed.overview).toContain('"quotes"');
      expect(parsed.overview).toContain('\\');
      expect(parsed.requirements[0].text).toContain('"special"');
    });
  });
});