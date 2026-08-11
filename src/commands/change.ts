import { promises as fs } from 'fs';
import path from 'path';
import { JsonConverter } from '../core/converters/json-converter.js';
import { Change } from '../core/schemas/index.js';
import type { RootOutput } from '../core/root-selection.js';
import { isInteractive } from '../utils/interactive.js';
import { getActiveChangeIds } from '../utils/item-discovery.js';
import { FileSystemUtils } from '../utils/file-system.js';

/**
 * A change is a directory directly under changes/. Rejecting anything else up
 * front keeps a traversing name (`../..`) from reading a proposal outside the
 * changes directory, and keeps the missing-proposal message honest.
 */
function isChangeDirectoryName(changesPath: string, changeDir: string): boolean {
  return path.dirname(path.resolve(changeDir)) === path.resolve(changesPath);
}

export class ChangeCommand {
  private converter: JsonConverter;
  private rootPath?: string;

  constructor(rootPath?: string) {
    this.converter = new JsonConverter();
    this.rootPath = rootPath;
  }

  private getChangesPath(): string {
    return path.join(this.rootPath ?? process.cwd(), 'openspec', 'changes');
  }

  /**
   * Show a change proposal.
   * - Text mode: raw markdown passthrough (no filters)
   * - JSON mode: minimal object with deltas; --deltas-only returns same object with filtered deltas
   *   Note: --requirements-only is deprecated alias for --deltas-only
   */
  async show(changeName?: string, options?: { json?: boolean; requirementsOnly?: boolean; deltasOnly?: boolean; noInteractive?: boolean; rootOutput?: RootOutput }): Promise<void> {
    const changesPath = this.getChangesPath();

    if (!changeName) {
      const canPrompt = isInteractive(options);
      // Offer exactly the changes `show <name>` can resolve.
      const changes = await getActiveChangeIds(this.rootPath ?? process.cwd());
      if (canPrompt && changes.length > 0) {
        const { select } = await import('@inquirer/prompts');
        const selected = await select({
          message: 'Select a change to show',
          choices: changes.map(id => ({ name: id, value: id })),
        });
        changeName = selected;
      } else {
        if (changes.length === 0) {
          console.error('No change specified. No active changes found.');
        } else {
          console.error(`No change specified. Available IDs: ${changes.join(', ')}`);
        }
        console.error('Hint: use "openspec list" to view available changes.');
        process.exitCode = 1;
        return;
      }
    }

    const changeDir = path.join(changesPath, changeName);
    const proposalPath = path.join(changeDir, 'proposal.md');

    if (!isChangeDirectoryName(changesPath, changeDir)) {
      throw new Error(`Change "${changeName}" not found at ${proposalPath}`);
    }

    try {
      await fs.access(proposalPath);
    } catch {
      // A change can exist without a proposal: `openspec new change` scaffolds
      // only .openspec.yaml, and a custom schema need not define a proposal
      // artifact. Say which of the two cases this is instead of reporting a
      // change that does exist as missing. A stray file under changes/ is not a
      // change, and naming it one would point the user at a `status --change`
      // call that cannot work.
      const isChangeDirectory = await fs
        .stat(changeDir)
        .then((stats) => stats.isDirectory())
        .catch(() => false);
      if (isChangeDirectory) {
        throw new Error(
          `Change "${changeName}" has no proposal.md yet. ` +
            `Run "openspec status --change ${changeName}" to see which artifact comes next.`
        );
      }
      throw new Error(`Change "${changeName}" not found at ${proposalPath}`);
    }
    FileSystemUtils.assertPathWithin(path.dirname(proposalPath), proposalPath);

    if (options?.json) {
      FileSystemUtils.assertPathWithin(changeDir, proposalPath);
      const jsonOutput = await this.converter.convertChangeToJson(proposalPath);

      if (options.requirementsOnly) {
        console.error('Flag --requirements-only is deprecated; use --deltas-only instead.');
      }

      const parsed: Change = JSON.parse(jsonOutput);
      FileSystemUtils.assertPathWithin(changeDir, proposalPath);
      const contentForTitle = await fs.readFile(proposalPath, 'utf-8');
      const title = this.extractTitle(contentForTitle, changeName);
      const id = parsed.name;
      const deltas = parsed.deltas || [];

      const output = {
        id,
        title,
        deltaCount: deltas.length,
        deltas,
        ...(options.rootOutput ? { root: options.rootOutput } : {}),
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      FileSystemUtils.assertPathWithin(changeDir, proposalPath);
      const content = await fs.readFile(proposalPath, 'utf-8');
      console.log(content);
    }
  }

  private extractTitle(content: string, changeName: string): string {
    const match = content.match(/^#\s+(?:Change:\s+)?(.+)$/im);
    return match ? match[1].trim() : changeName;
  }
}
