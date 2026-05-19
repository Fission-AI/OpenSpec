import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  parseHooksField,
  readProjectConfig,
  VALID_HOOK_EVENTS,
} from '../../src/core/project-config.js';

describe('project-config hooks', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('VALID_HOOK_EVENTS', () => {
    it('should export all eight valid hook events', () => {
      expect(VALID_HOOK_EVENTS).toHaveLength(8);
      expect(VALID_HOOK_EVENTS).toContain('pre-propose');
      expect(VALID_HOOK_EVENTS).toContain('post-propose');
      expect(VALID_HOOK_EVENTS).toContain('pre-explore');
      expect(VALID_HOOK_EVENTS).toContain('post-explore');
      expect(VALID_HOOK_EVENTS).toContain('pre-apply');
      expect(VALID_HOOK_EVENTS).toContain('post-apply');
      expect(VALID_HOOK_EVENTS).toContain('pre-archive');
      expect(VALID_HOOK_EVENTS).toContain('post-archive');
    });
  });

  describe('parseHooksField', () => {
    it('should return null for null input', () => {
      expect(parseHooksField(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(parseHooksField(undefined)).toBeNull();
    });

    it('should warn and return null for string input', () => {
      const result = parseHooksField('some string');
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid 'hooks' field")
      );
    });

    it('should warn and return null for array input', () => {
      const result = parseHooksField([]);
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid 'hooks' field")
      );
    });

    it('should return null for empty object (no valid entries)', () => {
      const result = parseHooksField({});
      expect(result).toBeNull();
    });

    it('should parse a fully specified hook entry', () => {
      const result = parseHooksField({
        'post-archive': { instruction: 'Review the log', run: './scripts/notify.sh' },
      });
      expect(result).not.toBeNull();
      expect(result!['post-archive']).toEqual({
        instruction: 'Review the log',
        run: './scripts/notify.sh',
      });
    });

    it('should parse a hook entry with only instruction', () => {
      const result = parseHooksField({ 'pre-apply': { instruction: 'Check tasks' } });
      expect(result!['pre-apply']).toEqual({ instruction: 'Check tasks' });
    });

    it('should parse a hook entry with only run', () => {
      const result = parseHooksField({ 'pre-archive': { run: './scripts/check.sh' } });
      expect(result!['pre-archive']).toEqual({ run: './scripts/check.sh' });
    });

    it('should treat null hook entry as no-op without warning', () => {
      const result = parseHooksField({ 'pre-archive': null });
      expect(result).not.toBeNull();
      expect(result!['pre-archive']).toBeNull();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should warn and skip unknown hook event keys', () => {
      const result = parseHooksField({
        'pre-build': { run: './build.sh' },
        'post-archive': { run: './notify.sh' },
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown hook event key 'pre-build'")
      );
      expect(result!['post-archive']).toEqual({ run: './notify.sh' });
      expect((result as Record<string, unknown>)['pre-build']).toBeUndefined();
    });

    it('should warn when instruction field is wrong type but keep valid run', () => {
      const result = parseHooksField({ 'pre-propose': { instruction: 123, run: './ok.sh' } });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("pre-propose.instruction' must be a string")
      );
      expect(result!['pre-propose']).toEqual({ run: './ok.sh' });
    });

    it('should warn when run field is wrong type but keep valid instruction', () => {
      const result = parseHooksField({ 'post-apply': { instruction: 'ok', run: true } });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("post-apply.run' must be a string")
      );
      expect(result!['post-apply']).toEqual({ instruction: 'ok' });
    });

    it('should warn when hook entry is wrong type and skip it', () => {
      const result = parseHooksField({ 'pre-explore': 'not-an-object', 'post-explore': { run: './ok.sh' } });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("pre-explore")
      );
      expect(result!['post-explore']).toEqual({ run: './ok.sh' });
      expect((result as Record<string, unknown>)['pre-explore']).toBeUndefined();
    });

    it('should parse all eight valid events', () => {
      const input: Record<string, unknown> = {};
      for (const event of VALID_HOOK_EVENTS) {
        input[event] = { run: `./scripts/${event}.sh` };
      }
      const result = parseHooksField(input);
      expect(result).not.toBeNull();
      for (const event of VALID_HOOK_EVENTS) {
        expect(result![event]).toEqual({ run: `./scripts/${event}.sh` });
      }
    });
  });

  describe('readProjectConfig hooks integration', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = path.join(os.tmpdir(), `openspec-hooks-test-${Date.now()}`);
      fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    function writeConfig(yaml: string) {
      fs.writeFileSync(path.join(tempDir, 'openspec', 'config.yaml'), yaml, 'utf-8');
    }

    it('should return undefined hooks when config has no hooks field', () => {
      writeConfig('schema: spec-driven\n');
      const config = readProjectConfig(tempDir);
      expect(config).not.toBeNull();
      expect(config!.hooks).toBeUndefined();
    });

    it('should parse hooks when present alongside other fields', () => {
      writeConfig(
        'schema: spec-driven\nhooks:\n  post-archive:\n    run: ./scripts/notify.sh\n'
      );
      const config = readProjectConfig(tempDir);
      expect(config!.hooks).not.toBeUndefined();
      expect(config!.hooks!['post-archive']).toEqual({ run: './scripts/notify.sh' });
    });

    it('should warn and exclude hooks when hooks field is wrong type, but return other fields', () => {
      writeConfig('schema: spec-driven\nhooks: "invalid"\n');
      const config = readProjectConfig(tempDir);
      expect(config!.schema).toBe('spec-driven');
      expect(config!.hooks).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid 'hooks' field")
      );
    });

    it('should parse null/empty hook entry without warning', () => {
      writeConfig('schema: spec-driven\nhooks:\n  pre-archive:\n');
      const config = readProjectConfig(tempDir);
      expect(config!.hooks!['pre-archive']).toBeNull();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
