import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  readProjectPluginConfig,
  enableProjectPlugin,
  disableProjectPlugin,
} from '../../../src/core/plugins/config.js';

const CONFIG_WITH_OPENLORE = `schema: spec-driven

# user comment that must survive
context: |
  My project context.

openlore:
  version: "2.1.3"
  domains:
    - api
    - billing
`;

describe('plugins/config project enablement', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-plugin-config-'));
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  function writeConfig(body: string): void {
    fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), body);
  }

  function readConfig(): string {
    return fs.readFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'utf-8');
  }

  it('reads no enabled plugins when there is no plugins block', () => {
    writeConfig('schema: spec-driven\n');
    expect(readProjectPluginConfig(projectRoot)).toEqual({ enabled: [], autoDetect: undefined });
  });

  it('reads enabled ids and autoDetect override', () => {
    writeConfig('schema: spec-driven\nplugins:\n  autoDetect: false\n  enabled:\n    - openlore\n');
    const result = readProjectPluginConfig(projectRoot);
    expect(result.enabled).toEqual(['openlore']);
    expect(result.autoDetect).toBe(false);
  });

  it('enabling preserves unknown keys, comments, and other config', () => {
    writeConfig(CONFIG_WITH_OPENLORE);
    expect(enableProjectPlugin(projectRoot, 'openlore')).toBe(true);

    const after = readConfig();
    // Unknown third-party block preserved.
    expect(after).toContain('openlore:');
    expect(after).toContain('version: "2.1.3"');
    // Comment preserved.
    expect(after).toContain('# user comment that must survive');
    // Core keys preserved.
    expect(after).toContain('schema: spec-driven');
    expect(after).toContain('My project context.');
    // New enablement recorded.
    expect(readProjectPluginConfig(projectRoot).enabled).toEqual(['openlore']);
  });

  it('enabling is idempotent', () => {
    writeConfig('schema: spec-driven\n');
    enableProjectPlugin(projectRoot, 'openlore');
    enableProjectPlugin(projectRoot, 'openlore');
    expect(readProjectPluginConfig(projectRoot).enabled).toEqual(['openlore']);
  });

  it('disabling removes only the named plugin', () => {
    writeConfig('schema: spec-driven\nplugins:\n  enabled:\n    - openlore\n    - demo\n');
    disableProjectPlugin(projectRoot, 'openlore');
    expect(readProjectPluginConfig(projectRoot).enabled).toEqual(['demo']);
  });

  it('returns false writing when there is no config file', () => {
    expect(enableProjectPlugin(projectRoot, 'openlore')).toBe(false);
  });
});
