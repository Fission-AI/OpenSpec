/**
 * `openspec plugin` command group: inspect, enable, disable, and discover plugins.
 */

import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync as nodeSpawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  resolvePlugins,
  clearPluginResolutionCache,
  getOpenSpecVersion,
} from '../core/plugins/resolver.js';
import {
  enableProjectPlugin,
  disableProjectPlugin,
  readProjectPluginConfig,
} from '../core/plugins/config.js';
import {
  loadRegistry,
  findRegistryEntry,
  searchRegistry,
  RegistryError,
  type RegistryEntry,
} from '../core/plugins/registry.js';
import { satisfies } from '../core/plugins/semver.js';
import type { ResolvedPlugin } from '../core/plugins/types.js';
import { OPENSPEC_DIR_NAME } from '../core/config.js';

// cross-spawn ships no types; cast to node's spawnSync signature (repo pattern).
const require = createRequire(import.meta.url);
const crossSpawn = require('cross-spawn') as { sync: typeof nodeSpawnSync };

function ensureOpenSpecProject(): string {
  const projectRoot = process.cwd();
  if (!fs.existsSync(path.join(projectRoot, OPENSPEC_DIR_NAME))) {
    throw new Error('No OpenSpec project found here. Run "openspec init" first.');
  }
  return projectRoot;
}

function statusLabel(p: ResolvedPlugin): string {
  if (!p.compatible) return 'incompatible';
  if (!p.enabled) return 'disabled';
  return 'enabled';
}

function listPlugins(json?: boolean): void {
  const projectRoot = process.cwd();
  const resolution = resolvePlugins(projectRoot);

  if (json) {
    console.log(
      JSON.stringify(
        {
          plugins: resolution.plugins.map((p) => ({
            id: p.id,
            namespace: p.namespace,
            version: p.version,
            source: p.source,
            compatible: p.compatible,
            enabled: p.enabled,
            status: statusLabel(p),
            requires: p.manifest.openspecCompat,
          })),
          collisions: resolution.collisions,
          errors: resolution.errors,
        },
        null,
        2
      )
    );
    return;
  }

  if (resolution.plugins.length === 0 && resolution.errors.length === 0) {
    console.log('No plugins installed.');
    console.log('Discover plugins with "openspec plugin search".');
    return;
  }

  for (const p of resolution.plugins) {
    const ver = p.version ? `@${p.version}` : '';
    let line = `  ${p.namespace}  (${p.id}${ver})  [${statusLabel(p)}, ${p.source}]`;
    if (!p.compatible) line += `  requires OpenSpec ${p.manifest.openspecCompat}`;
    console.log(line);
  }

  for (const c of resolution.collisions) {
    console.log(`  ! ${c.kind} collision on "${c.value}" — resolve before these plugins load`);
  }
  for (const e of resolution.errors) {
    console.log(`  ! ${e.id}: ${e.error}`);
  }
}

function infoPlugin(id: string, json?: boolean): void {
  const resolution = resolvePlugins(process.cwd());
  const installed = resolution.plugins.find((p) => p.id === id || p.namespace === id);
  let registryEntry: RegistryEntry | undefined;
  try {
    registryEntry = findRegistryEntry(id);
  } catch {
    // Registry optional for info.
  }

  if (!installed && !registryEntry) {
    throw new Error(`Plugin "${id}" was not found among installed plugins or the registry.`);
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          installed: installed
            ? {
                id: installed.id,
                namespace: installed.namespace,
                version: installed.version,
                source: installed.source,
                compatible: installed.compatible,
                enabled: installed.enabled,
                manifest: installed.manifest,
              }
            : null,
          registry: registryEntry ?? null,
        },
        null,
        2
      )
    );
    return;
  }

  if (installed) {
    console.log(`${installed.manifest.displayName ?? installed.id}`);
    console.log(`  id:         ${installed.id}`);
    console.log(`  namespace:  ${installed.namespace}`);
    if (installed.version) console.log(`  version:    ${installed.version}`);
    console.log(`  source:     ${installed.source}`);
    console.log(`  status:     ${statusLabel(installed)}`);
    console.log(`  requires:   OpenSpec ${installed.manifest.openspecCompat}`);
    if (installed.manifest.summary) console.log(`  summary:    ${installed.manifest.summary}`);
    if (installed.manifest.commands?.length) {
      console.log('  commands:');
      for (const c of installed.manifest.commands) {
        console.log(`    ${installed.namespace} ${c.name}${c.summary ? ` — ${c.summary}` : ''}`);
      }
    }
  }
  if (registryEntry) {
    console.log('  registry:');
    console.log(`    npm:      ${registryEntry.npm}`);
    if (registryEntry.homepage) console.log(`    homepage: ${registryEntry.homepage}`);
  }
}

async function addPlugin(
  idOrNpm: string,
  options: { force?: boolean; install?: boolean }
): Promise<void> {
  const projectRoot = ensureOpenSpecProject();
  const resolution = resolvePlugins(projectRoot);
  const installed = resolution.plugins.find((p) => p.id === idOrNpm || p.namespace === idOrNpm);

  let registryEntry: RegistryEntry | undefined;
  try {
    registryEntry = findRegistryEntry(idOrNpm);
  } catch {
    // proceed without registry
  }

  // Not installed: print install guidance (or run install when asked).
  if (!installed) {
    const npmName = registryEntry?.npm ?? idOrNpm;
    if (registryEntry) {
      const ok = satisfies(getOpenSpecVersion(), registryEntry.openspecCompat);
      if (!ok && !options.force) {
        throw new Error(
          `${registryEntry.id} requires OpenSpec ${registryEntry.openspecCompat} (current ${getOpenSpecVersion()}). Re-run with --force to enable anyway.`
        );
      }
    } else {
      console.log(
        `Note: "${idOrNpm}" is not in the curated registry. Plugins run with your privileges — only add packages you trust.`
      );
    }

    if (options.install) {
      console.log(`Installing ${npmName}…`);
      const res = crossSpawn.sync('npm', ['install', '--save-dev', npmName], { stdio: 'inherit' });
      if (res.status !== 0) throw new Error(`Failed to install ${npmName}.`);
      clearPluginResolutionCache();
      // Re-resolve and only enable a genuinely-discovered, compatible manifest —
      // never fall back to the registry/raw name (could be a non-plugin package).
      const after = resolvePlugins(projectRoot).plugins.find(
        (p) =>
          p.id === registryEntry?.id ||
          p.namespace === registryEntry?.namespace ||
          p.id === idOrNpm
      );
      if (!after) {
        throw new Error(
          `Installed ${npmName}, but no OpenSpec plugin manifest was discovered in it.`
        );
      }
      if (!after.compatible && !options.force) {
        throw new Error(
          `${after.id} requires OpenSpec ${after.manifest.openspecCompat} (current ${getOpenSpecVersion()}). Re-run with --force to enable anyway.`
        );
      }
      reportEnable(projectRoot, after.id);
      return;
    }

    console.log(`To add ${npmName}, install it and enable it:`);
    console.log(`  npm install --save-dev ${npmName}`);
    console.log(`  openspec plugin add ${registryEntry?.id ?? idOrNpm}`);
    console.log('Or re-run this command with --install to do both.');
    return;
  }

  // Installed: gate on compatibility, then enable in project config.
  if (!installed.compatible && !options.force) {
    throw new Error(
      `${installed.id} requires OpenSpec ${installed.manifest.openspecCompat} (current ${getOpenSpecVersion()}). Re-run with --force to enable anyway.`
    );
  }
  if (!registryEntry) {
    console.log(
      `Note: "${installed.id}" is not in the curated registry. Plugins run with your privileges — only enable plugins you trust.`
    );
  }

  reportEnable(projectRoot, installed.id);
  console.log(`Run "openspec ${installed.namespace} --help" to see its commands.`);
}

/**
 * Enable a plugin in project config and report honestly whether the write
 * succeeded. When there is no config.yaml to edit, the plugin still works via
 * auto-detect, but enablement cannot be pinned — say so rather than claim success.
 */
function reportEnable(projectRoot: string, id: string): void {
  const wrote = enableProjectPlugin(projectRoot, id);
  clearPluginResolutionCache();
  if (wrote) {
    console.log(`Enabled "${id}" in openspec/config.yaml.`);
  } else {
    console.log(
      `No openspec/config.yaml found to record "${id}". It is still active via auto-detect; ` +
        `create openspec/config.yaml to pin it explicitly under plugins.enabled.`
    );
  }
}

function removePlugin(id: string): void {
  const projectRoot = ensureOpenSpecProject();
  const { enabled } = readProjectPluginConfig(projectRoot);
  if (!enabled.includes(id)) {
    console.log(`Plugin "${id}" is not enabled in this project.`);
    return;
  }
  disableProjectPlugin(projectRoot, id);
  clearPluginResolutionCache();
  console.log(`Removed "${id}" from this project's enabled plugins.`);
  console.log('The package is still installed; uninstall it with your package manager to remove it fully.');
}

function setEnabled(id: string, enabled: boolean): void {
  const projectRoot = ensureOpenSpecProject();
  if (enabled) {
    reportEnable(projectRoot, id);
  } else {
    const wrote = disableProjectPlugin(projectRoot, id);
    clearPluginResolutionCache();
    console.log(
      wrote
        ? `Disabled "${id}" in openspec/config.yaml.`
        : `No openspec/config.yaml found; nothing to disable for "${id}".`
    );
  }
}

function searchPlugins(query: string | undefined, json?: boolean): void {
  let entries: RegistryEntry[];
  try {
    entries = searchRegistry(query);
  } catch (error) {
    if (error instanceof RegistryError) {
      throw new Error(error.message);
    }
    throw error;
  }

  if (json) {
    console.log(JSON.stringify({ plugins: entries }, null, 2));
    return;
  }

  if (entries.length === 0) {
    console.log(query ? `No registry plugins match "${query}".` : 'The registry is empty.');
    return;
  }

  for (const e of entries) {
    console.log(`  ${e.namespace}  (${e.id}, npm: ${e.npm})`);
    console.log(`      ${e.summary}`);
    console.log(`      requires OpenSpec ${e.openspecCompat}${e.homepage ? ` · ${e.homepage}` : ''}`);
  }
}

export function registerPluginCommand(program: Command): void {
  const pluginCmd = program
    .command('plugin')
    .description('Manage OpenSpec plugins (marketplace engines)');

  pluginCmd
    .command('list')
    .description('List installed plugins and their status')
    .option('--json', 'Output as JSON')
    .action((options?: { json?: boolean }) => {
      listPlugins(options?.json);
    });

  pluginCmd
    .command('info <id>')
    .description('Show details for a plugin (installed and/or registry)')
    .option('--json', 'Output as JSON')
    .action((id: string, options?: { json?: boolean }) => {
      try {
        infoPlugin(id, options?.json);
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exitCode = 1;
      }
    });

  pluginCmd
    .command('add <id>')
    .description('Enable a plugin in this project (and print install guidance if missing)')
    .option('--force', 'Enable even if the plugin is incompatible with this OpenSpec version')
    .option('--install', 'Install the package via npm before enabling')
    .action(async (id: string, options?: { force?: boolean; install?: boolean }) => {
      try {
        await addPlugin(id, options ?? {});
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exitCode = 1;
      }
    });

  pluginCmd
    .command('remove <id>')
    .description('Disable a plugin in this project (does not uninstall the package)')
    .action((id: string) => {
      try {
        removePlugin(id);
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exitCode = 1;
      }
    });

  pluginCmd
    .command('enable <id>')
    .description('Enable a plugin in this project')
    .action((id: string) => {
      try {
        setEnabled(id, true);
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exitCode = 1;
      }
    });

  pluginCmd
    .command('disable <id>')
    .description('Disable a plugin in this project')
    .action((id: string) => {
      try {
        setEnabled(id, false);
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exitCode = 1;
      }
    });

  pluginCmd
    .command('search [query]')
    .description('Discover plugins from the curated registry')
    .option('--json', 'Output as JSON')
    .action((query?: string, options?: { json?: boolean }) => {
      try {
        searchPlugins(query, options?.json);
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exitCode = 1;
      }
    });
}
