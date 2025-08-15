import { Command } from 'commander';
import ora from 'ora';
import path from 'path';
import { promises as fs } from 'fs';
import { InitCommand } from '../core/init.js';
import { UpdateCommand } from '../core/update.js';
import { DiffCommand } from '../core/diff.js';
import { ListCommand } from '../core/list.js';
import { ArchiveCommand } from '../core/archive.js';
import { SpecCommand } from '../commands/spec.js';

const program = new Command();

program
  .name('openspec')
  .description('AI-native system for spec-driven development')
  .version('0.0.1');

program
  .command('init [path]')
  .description('Initialize OpenSpec in your project')
  .action(async (targetPath = '.') => {
    try {
      // Validate that the path is a valid directory
      const resolvedPath = path.resolve(targetPath);
      
      try {
        const stats = await fs.stat(resolvedPath);
        if (!stats.isDirectory()) {
          throw new Error(`Path "${targetPath}" is not a directory`);
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // Directory doesn't exist, but we can create it
          console.log(`Directory "${targetPath}" doesn't exist, it will be created.`);
        } else if (error.message && error.message.includes('not a directory')) {
          throw error;
        } else {
          throw new Error(`Cannot access path "${targetPath}": ${error.message}`);
        }
      }
      
      const initCommand = new InitCommand();
      await initCommand.execute(targetPath);
    } catch (error) {
      console.log(); // Empty line for spacing
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('update [path]')
  .description('Update OpenSpec instruction files')
  .action(async (targetPath = '.') => {
    try {
      const resolvedPath = path.resolve(targetPath);
      const updateCommand = new UpdateCommand();
      await updateCommand.execute(resolvedPath);
    } catch (error) {
      console.log(); // Empty line for spacing
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('diff [change-name]')
  .description('Show differences between proposed spec changes and current specs (includes validation warnings)')
  .action(async (changeName?: string) => {
    try {
      const diffCommand = new DiffCommand();
      await diffCommand.execute(changeName);
    } catch (error) {
      console.log(); // Empty line for spacing
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all active changes with their task status')
  .action(async () => {
    try {
      const listCommand = new ListCommand();
      await listCommand.execute();
    } catch (error) {
      console.log(); // Empty line for spacing
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('archive [change-name]')
  .description('Archive a completed change and update main specs')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--skip-specs', 'Skip spec update operations (useful for infrastructure, tooling, or doc-only changes)')
  .option('--no-validate', 'Skip validation (not recommended, requires confirmation)')
  .action(async (changeName?: string, options?: { yes?: boolean; skipSpecs?: boolean; noValidate?: boolean }) => {
    try {
      const archiveCommand = new ArchiveCommand();
      await archiveCommand.execute(changeName, options);
    } catch (error) {
      console.log(); // Empty line for spacing
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

const specCommand = new SpecCommand();
specCommand.register(program);

program.parse();