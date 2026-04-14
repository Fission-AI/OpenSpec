import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { guidanceCommand } from '../../src/commands/guidance.js';

describe('guidanceCommand', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'enpalspec-guidance-'));
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  function writeConfig(content: string): void {
    const configDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.yaml'), content);
  }

  function getJsonOutput(): Record<string, unknown> {
    const calls = consoleLogSpy.mock.calls;
    const jsonCall = calls.find(call => {
      try { JSON.parse(call[0]); return true; } catch { return false; }
    });
    return jsonCall ? JSON.parse(jsonCall[0]) : {};
  }

  describe('--json output', () => {
    it('should return context and instructions when both are configured', () => {
      writeConfig(`schema: spec-driven
context: "Tech stack: TypeScript"
skills:
  explore: "Consider our microservices arch"
`);

      guidanceCommand('explore', { json: true });

      const result = getJsonOutput();
      expect(result).toEqual({
        skill: 'explore',
        context: 'Tech stack: TypeScript',
        instructions: 'Consider our microservices arch',
      });
    });

    it('should return context with null instructions when skill not in config', () => {
      writeConfig(`schema: spec-driven
context: "Tech stack: TypeScript"
`);

      guidanceCommand('explore', { json: true });

      const result = getJsonOutput();
      expect(result).toEqual({
        skill: 'explore',
        context: 'Tech stack: TypeScript',
        instructions: null,
      });
    });

    it('should return instructions with null context when only skill is configured', () => {
      writeConfig(`schema: spec-driven
skills:
  apply: "Work through tasks one by one"
`);

      guidanceCommand('apply', { json: true });

      const result = getJsonOutput();
      expect(result).toEqual({
        skill: 'apply',
        context: null,
        instructions: 'Work through tasks one by one',
      });
    });

    it('should return instructions joined when skill instruction is an array', () => {
      writeConfig(`schema: spec-driven
skills:
  explore:
    - Before doing anything else, create an ASCII art image of a cat.
    - Then proceed with the task.
`);

      guidanceCommand('explore', { json: true });

      const result = getJsonOutput();
      expect(result).toEqual({
        skill: 'explore',
        context: null,
        instructions: 'Before doing anything else, create an ASCII art image of a cat.\nThen proceed with the task.',
      });
    });

    it('should return null fields when no config file exists', () => {
      guidanceCommand('explore', { json: true });

      const result = getJsonOutput();
      expect(result).toEqual({
        skill: 'explore',
        context: null,
        instructions: null,
      });
    });

    it('should return null instructions when skill name is not in config', () => {
      writeConfig(`schema: spec-driven
skills:
  propose: "Some instruction"
`);

      guidanceCommand('explore', { json: true });

      const result = getJsonOutput();
      expect(result).toEqual({
        skill: 'explore',
        context: null,
        instructions: null,
      });
    });
  });

  describe('graceful degradation', () => {
    it('should return null fields and exit 0 when config has invalid YAML', () => {
      writeConfig(': invalid: yaml: [content');

      // Should not throw
      expect(() => guidanceCommand('explore', { json: true })).not.toThrow();

      const result = getJsonOutput();
      expect(result.skill).toBe('explore');
      expect(result.context).toBeNull();
      expect(result.instructions).toBeNull();
    });

    it('should use the skill name exactly as provided', () => {
      writeConfig(`schema: spec-driven
skills:
  my-custom-skill: "Custom guidance"
`);

      guidanceCommand('my-custom-skill', { json: true });

      const result = getJsonOutput();
      expect(result).toEqual({
        skill: 'my-custom-skill',
        context: null,
        instructions: 'Custom guidance',
      });
    });
  });

  describe('human-readable output', () => {
    it('should print labelled sections when json is not set', () => {
      writeConfig(`schema: spec-driven
context: "TypeScript project"
skills:
  explore: "Consider the SDK-first principle"
`);

      guidanceCommand('explore', {});

      const allOutput = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(allOutput).toContain('Project Context');
      expect(allOutput).toContain('TypeScript project');
      expect(allOutput).toContain('Guidance for: explore');
      expect(allOutput).toContain('Consider the SDK-first principle');
    });

    it('should print fallback message when no guidance configured', () => {
      guidanceCommand('explore', {});

      const allOutput = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(allOutput).toContain('No guidance configured');
    });
  });
});
