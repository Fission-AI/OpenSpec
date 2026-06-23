/**
 * Plugin command surfacing and delegation.
 *
 * Each active plugin is surfaced as one reserved top-level namespace. Execution
 * is delegated to the plugin's own executable as a child process (inherited
 * stdio, propagated exit code) — plugin code is never loaded into this process.
 *
 * Two cooperating mechanisms:
 *  - `registerPlugins` adds a Commander command per namespace so plugins appear
 *    in `--help` and completion, and as a safety-net execution path.
 *  - `maybeDelegateEarly` runs before Commander parses argv and forwards a
 *    namespace invocation verbatim (including `--help` and unknown flags),
 *    which Commander's own parsing would otherwise mangle.
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { spawnSync as nodeSpawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import type { Command } from 'commander';
import type { ResolvedPlugin } from './types.js';
import { resolvePlugins, activePlugins } from './resolver.js';
import { isSafeBin } from './manifest.js';

/** True when `child` resolves to a location strictly inside `parent`. */
function isPathInside(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** Real (symlink-resolved) path, or null if it does not exist. */
function realpathOrNull(p: string): string | null {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return null;
  }
}

// cross-spawn ships no types; cast to node's spawnSync signature (repo pattern).
const require = createRequire(import.meta.url);
const crossSpawn = require('cross-spawn') as { sync: typeof nodeSpawnSync };

/** Resolve the [command, baseArgs] used to launch a plugin. */
function resolveLauncher(plugin: ResolvedPlugin): { command: string; baseArgs: string[] } {
  const { manifest, packageRoot } = plugin;
  if (manifest.bin) {
    // Defense-in-depth: manifest validation already rejects an unsafe `bin`, but
    // re-check containment here before spawning so a crafted path (absolute, `..`,
    // or a Windows drive/backslash) can never launch a binary outside the package.
    const binPath = path.resolve(packageRoot, manifest.bin);
    if (!isSafeBin(manifest.bin) || !isPathInside(packageRoot, binPath)) {
      throw new Error(
        `Plugin "${plugin.id}" declares an executable ("${manifest.bin}") outside its package`
      );
    }
    // Lexical checks stop `..`/absolute escapes but not a package-local symlink
    // that points outside the package. Resolve symlinks on both the package root
    // and the bin, and require the real bin to stay inside the real root before
    // spawning. realpath also confirms the entrypoint actually exists.
    const realRoot = realpathOrNull(packageRoot);
    const realBin = realpathOrNull(binPath);
    if (!realRoot || !realBin || !isPathInside(realRoot, realBin)) {
      throw new Error(
        `Plugin "${plugin.id}" executable ("${manifest.bin}") resolves outside its package`
      );
    }
    // Run the plugin's JS entrypoint with the current Node — avoids shell/.cmd
    // shims. Launch the symlink-resolved path so the spawned file is exactly the
    // one we verified is contained (closes the symlink-swap TOCTOU window).
    return { command: process.execPath, baseArgs: [realBin] };
  }
  if (manifest.binArgs && manifest.binArgs.length > 0) {
    return { command: manifest.binArgs[0], baseArgs: manifest.binArgs.slice(1) };
  }
  // Should not happen: manifest validation guarantees one of the above.
  throw new Error(`Plugin "${plugin.id}" declares no executable`);
}

/**
 * Delegate to a plugin executable. Returns the child's exit code.
 * Inherits stdio so the plugin owns the terminal session.
 */
export function delegateToPlugin(plugin: ResolvedPlugin, args: string[]): number {
  let command: string;
  let baseArgs: string[];
  try {
    ({ command, baseArgs } = resolveLauncher(plugin));
  } catch (error) {
    console.error(`Error launching plugin "${plugin.id}": ${(error as Error).message}`);
    return 1;
  }
  const result = crossSpawn.sync(command, [...baseArgs, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  if (result.error) {
    const err = result.error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      console.error(
        `Error: could not launch plugin "${plugin.id}". The executable was not found.\n` +
          `Try reinstalling the plugin package, e.g. "npm install ${plugin.id}".`
      );
    } else {
      console.error(`Error launching plugin "${plugin.id}": ${err.message}`);
    }
    return 1;
  }

  if (typeof result.status === 'number') return result.status;
  // Terminated by signal.
  return 1;
}

/**
 * If the first non-option token in argv is an active plugin namespace, delegate
 * to that plugin with the remaining args verbatim and return true. The caller
 * must then skip Commander parsing. Returns false when no namespace matches.
 */
export function maybeDelegateEarly(
  argv: string[],
  projectRoot: string = process.cwd()
): boolean {
  // argv is the full process argv: [node, script, ...rest]
  const rest = argv.slice(2);
  const tokenIndex = rest.findIndex((token) => !token.startsWith('-'));
  if (tokenIndex === -1) return false;

  const namespace = rest[tokenIndex];
  const plugins = activePlugins(resolvePlugins(projectRoot));
  const plugin = plugins.find((p) => p.namespace === namespace);
  if (!plugin) return false;

  const forwarded = rest.slice(tokenIndex + 1);
  const code = delegateToPlugin(plugin, forwarded);
  process.exitCode = code;
  return true;
}

/**
 * Register a Commander command per active plugin namespace for discoverability.
 * Execution normally happens via `maybeDelegateEarly`; this path is a safety net.
 */
export function registerPlugins(
  program: Command,
  projectRoot: string = process.cwd()
): void {
  const plugins = activePlugins(resolvePlugins(projectRoot));

  for (const plugin of plugins) {
    const summary =
      plugin.manifest.summary ?? plugin.manifest.displayName ?? `${plugin.id} plugin commands`;

    const cmd = program
      .command(`${plugin.namespace} [args...]`)
      .description(`[plugin] ${summary}`)
      .allowUnknownOption(true)
      .helpOption(false)
      .action((args: string[] = []) => {
        const code = delegateToPlugin(plugin, args);
        process.exitCode = code;
      });

    // Let unknown options/positionals flow through to the plugin rather than be parsed.
    if (typeof (cmd as { passThroughOptions?: (v?: boolean) => Command }).passThroughOptions === 'function') {
      (cmd as { passThroughOptions: (v?: boolean) => Command }).passThroughOptions(true);
    }
  }
}
