import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import {
  resolvePluginDir,
  parsePluginManifest,
  getProjectPluginsDir,
  getUserPluginsDir,
  getPackagePluginsDir,
} from '../core/plugin/loader.js';
import { readProjectConfig } from '../core/project-config.js';
import type { PluginManifest } from '../core/plugin/types.js';
import { VALID_HOOK_POINTS } from '../core/plugin/types.js';

interface PluginListEntry {
  name: string;
  version: string;
  description: string;
  source: 'project' | 'user' | 'package';
  status: 'loaded' | 'not-in-whitelist' | 'error';
  error?: string;
}

/**
 * Scan a directory for plugin subdirectories.
 */
function scanPluginDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'plugin.yaml')))
    .map(e => e.name);
}

/**
 * Discover all plugins across all tiers with their status.
 */
function discoverPlugins(projectRoot: string, whitelist: string[]): PluginListEntry[] {
  const seen = new Set<string>();
  const results: PluginListEntry[] = [];
  const whitelistSet = new Set(whitelist);

  const tiers: Array<{ dir: string; source: 'project' | 'user' | 'package' }> = [
    { dir: getProjectPluginsDir(projectRoot), source: 'project' },
    { dir: getUserPluginsDir(), source: 'user' },
    { dir: getPackagePluginsDir(), source: 'package' },
  ];

  for (const { dir, source } of tiers) {
    for (const name of scanPluginDir(dir)) {
      if (seen.has(name)) continue;
      seen.add(name);

      try {
        const manifest = parsePluginManifest(path.join(dir, name));
        results.push({
          name: manifest.name,
          version: manifest.version,
          description: manifest.description || '',
          source,
          status: whitelistSet.has(name) ? 'loaded' : 'not-in-whitelist',
        });
      } catch (err) {
        results.push({
          name,
          version: '?',
          description: '',
          source,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return results;
}

export function registerPluginCommand(program: Command): void {
  const pluginCmd = program
    .command('plugin')
    .description('Manage OpenSpec plugins');

  pluginCmd
    .command('list')
    .description('List available and loaded plugins')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const projectRoot = path.resolve('.');
      const config = readProjectConfig(projectRoot);
      const whitelist = config?.plugins || [];
      const plugins = discoverPlugins(projectRoot, whitelist);

      if (options.json) {
        console.log(JSON.stringify(plugins, null, 2));
        return;
      }

      if (plugins.length === 0) {
        console.log('No plugins found.');
        console.log('\nTo add a plugin:');
        console.log('  1. Create openspec/plugins/<name>/plugin.yaml');
        console.log('  2. Add the plugin name to config.yaml plugins array');
        return;
      }

      console.log('Plugins:\n');
      const nameWidth = Math.max(...plugins.map(p => p.name.length), 10);

      for (const p of plugins) {
        const statusIcon =
          p.status === 'loaded' ? chalk.green('●') :
          p.status === 'not-in-whitelist' ? chalk.gray('○') :
          chalk.red('✗');
        const sourceLabel = chalk.dim(`(${p.source})`);
        const desc = p.description ? chalk.dim(` — ${p.description}`) : '';

        console.log(`  ${statusIcon} ${p.name.padEnd(nameWidth)} ${p.version.padEnd(8)} ${sourceLabel}${desc}`);
        if (p.status === 'error' && p.error) {
          console.log(chalk.red(`    Error: ${p.error}`));
        }
      }

      console.log(`\n${chalk.green('●')} loaded  ${chalk.gray('○')} not in whitelist  ${chalk.red('✗')} error`);
    });

  pluginCmd
    .command('info <name>')
    .description('Show detailed plugin information')
    .option('--json', 'Output as JSON')
    .action(async (name: string, options) => {
      const projectRoot = path.resolve('.');
      const resolved = resolvePluginDir(name, projectRoot);

      if (!resolved) {
        console.error(`Plugin "${name}" not found.`);
        const config = readProjectConfig(projectRoot);
        const whitelist = config?.plugins || [];
        const plugins = discoverPlugins(projectRoot, whitelist);
        if (plugins.length > 0) {
          console.log('\nAvailable plugins:');
          for (const p of plugins) {
            console.log(`  - ${p.name} (${p.source})`);
          }
        }
        process.exit(1);
      }

      let manifest: PluginManifest;
      try {
        manifest = parsePluginManifest(resolved.dir);
      } catch (err) {
        console.error(`Failed to parse plugin "${name}": ${err}`);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify({
          ...manifest,
          skillOverlays: manifest.skill_overlays ?? {},
          source: resolved.source,
          dir: resolved.dir,
        }, null, 2));
        return;
      }

      console.log(`Plugin: ${chalk.bold(manifest.name)}`);
      console.log(`Version: ${manifest.version}`);
      if (manifest.description) console.log(`Description: ${manifest.description}`);
      if (manifest.openspec) console.log(`OpenSpec compatibility: ${manifest.openspec}`);
      console.log(`Source: ${resolved.source} (${resolved.dir})`);

      if (manifest.schemas && manifest.schemas.length > 0) {
        console.log(`\nSchemas: ${manifest.schemas.join(', ')}`);
      }

      if (manifest.config) {
        console.log('\nConfig schema:');
        for (const [category, fields] of Object.entries(manifest.config)) {
          for (const [field, schema] of Object.entries(fields)) {
            const req = schema.required ? chalk.red('required') : chalk.dim('optional');
            const def = schema.default !== undefined ? ` (default: ${schema.default})` : '';
            console.log(`  ${category}.${field}: ${schema.type} [${req}]${def}`);
          }
        }
      }

      if (manifest.hooks) {
        console.log('\nHooks:');
        for (const point of VALID_HOOK_POINTS) {
          const hooks = manifest.hooks[point];
          if (hooks && hooks.length > 0) {
            for (const hook of hooks) {
              console.log(`  ${point} → ${hook.id} (${hook.handler.type})`);
            }
          }
        }
      }

      if (manifest.gates && manifest.gates.length > 0) {
        console.log('\nGates:');
        for (const gate of manifest.gates) {
          console.log(`  ${gate.id} (${gate.handler.type})`);
        }
      }

      if (manifest.skill_overlays) {
        const entries = Object.entries(manifest.skill_overlays);
        if (entries.length > 0) {
          console.log('\nSkill Overlays:');
          for (const [workflowId, overlay] of entries) {
            console.log(`  ${workflowId} → append: ${overlay.append}`);
          }
        }
      }
    });
}
