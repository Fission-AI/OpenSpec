import * as fs from 'node:fs';
import * as path from 'node:path';

import { withPrependedPathEnv } from './path-env.js';

/**
 * Fake opener executables for workset launch tests (resurrected from
 * the f858c19^ workspace-open pattern). Each fake records its cwd and
 * argv to its own JSON log instead of opening anything; an optional
 * exit code exercises the honest-propagation contract. Paths are baked
 * into each shim so several fakes can sit on PATH at once.
 */

export interface FakeTool {
  binDir: string;
  logPath: string;
}

export function createFakeTool(
  tempDir: string,
  name: string,
  options: { exitCode?: number } = {}
): FakeTool {
  const binDir = path.join(tempDir, `fake-${name}-bin`);
  const logPath = path.join(tempDir, `${name}-launch.json`);
  const recorderPath = path.join(binDir, 'record-launch.cjs');
  const exitCode = options.exitCode ?? 0;
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    recorderPath,
    "const fs = require('node:fs');\n" +
      `fs.writeFileSync(${JSON.stringify(logPath)}, JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }));\n` +
      `process.exit(${exitCode});\n`
  );

  const posixExecutable = path.join(binDir, name);
  fs.writeFileSync(
    posixExecutable,
    `#!/bin/sh\nexec node ${JSON.stringify(recorderPath)} "$@"\n`
  );
  fs.chmodSync(posixExecutable, 0o755);
  fs.writeFileSync(
    path.join(binDir, `${name}.cmd`),
    `@echo off\r\nnode "${recorderPath}" %*\r\n`
  );

  return { binDir, logPath };
}

export function envWithFakeTools(
  baseEnv: NodeJS.ProcessEnv,
  fakes: FakeTool[]
): NodeJS.ProcessEnv {
  let env = { ...baseEnv };
  for (const fake of fakes) {
    env = withPrependedPathEnv(env, fake.binDir);
  }
  return env;
}

export function readLaunchLog(logPath: string): {
  cwd: string;
  args: string[];
} {
  return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
}
