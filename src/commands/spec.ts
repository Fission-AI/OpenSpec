import { program } from 'commander';
import { Validator } from '../core/validation/validator.js';
import { isInteractive } from '../utils/interactive.js';
import { resolveOpenSpecDir } from '../core/path-resolver.js';
import { FileSystemUtils } from '../utils/file-system.js';
import path from 'path';
import { 
    getSpecMarkdown, 
    getSpecJson, 
    getSpecIds, 
    getSpecDetails, 
    ShowOptions 
} from '../core/spec-logic.js';

export class SpecCommand {
  async getSpecMarkdown(specId: string): Promise<string> {
      return getSpecMarkdown(process.cwd(), specId);
  }

  async getSpecJson(specId: string, options: ShowOptions = {}): Promise<any> {
      return getSpecJson(process.cwd(), specId, options);
  }

  async show(specId?: string, options: ShowOptions = {}): Promise<void> {
    if (!specId) {
      const canPrompt = isInteractive(options);
      const specIds = await getSpecIds(process.cwd());
      if (canPrompt && specIds.length > 0) {
        const { select } = await import('@inquirer/prompts');
        specId = await select({
          message: 'Select a spec to show',
          choices: specIds.map(id => ({ name: id, value: id })),
        });
      } else {
        throw new Error('Missing required argument <spec-id>');
      }
    }

    if (options.json) {
      if (options.requirements && options.requirement) {
        throw new Error('Options --requirements and --requirement cannot be used together');
      }
      const output = await this.getSpecJson(specId, options);
      console.log(JSON.stringify(output, null, 2));
      return;
    }
    const content = await this.getSpecMarkdown(specId);
    console.log(content);
  }
}

export function registerSpecCommand(rootProgram: typeof program) {
  const specCommand = rootProgram
    .command('spec')
    .description('Manage and view OpenSpec specifications');

  // Deprecation notice for noun-based commands
  specCommand.hook('preAction', () => {
    console.error('Warning: The "openspec spec ..." commands are deprecated. Prefer verb-first commands (e.g., "openspec show", "openspec validate --specs").');
  });

  specCommand
    .command('show [spec-id]')
    .description('Display a specific specification')
    .option('--json', 'Output as JSON')
    .option('--requirements', 'JSON only: Show only requirements (exclude scenarios)')
    .option('--no-scenarios', 'JSON only: Exclude scenario content')
    .option('-r, --requirement <id>', 'JSON only: Show specific requirement by ID (1-based)')
    .option('--no-interactive', 'Disable interactive prompts')
    .action(async (specId: string | undefined, options: ShowOptions & { noInteractive?: boolean }) => {
      try {
        const cmd = new SpecCommand();
        await cmd.show(specId, options as any);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exitCode = 1;
      }
    });

  specCommand
    .command('list')
    .description('List all available specifications')
    .option('--json', 'Output as JSON')
    .option('--long', 'Show id and title with counts')
    .action(async (options: { json?: boolean; long?: boolean }) => {
      try {
        const ids = await getSpecIds(process.cwd());
        
        if (ids.length === 0) {
            console.log('No items found');
            return;
        }

        if (options.json) {
            const specs = await Promise.all(ids.map(id => getSpecDetails(process.cwd(), id)));
            console.log(JSON.stringify(specs, null, 2));
        } else {
          if (!options.long) {
            ids.forEach(id => console.log(id));
            return;
          }
          
          for (const id of ids) {
              try {
                  const spec = await getSpecDetails(process.cwd(), id);
                  console.log(`${spec.id}: ${spec.title} [requirements ${spec.requirementCount}]`);
              } catch {
                  console.log(`${id}: (unable to read)`);
              }
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exitCode = 1;
      }
    });

  specCommand
    .command('validate [spec-id]')
    .description('Validate a specification structure')
    .option('--strict', 'Enable strict validation mode')
    .option('--json', 'Output validation report as JSON')
    .option('--no-interactive', 'Disable interactive prompts')
    .action(async (specId: string | undefined, options: { strict?: boolean; json?: boolean; noInteractive?: boolean }) => {
      try {
        if (!specId) {
          const canPrompt = isInteractive(options);
          const specIds = await getSpecIds(process.cwd());
          if (canPrompt && specIds.length > 0) {
            const { select } = await import('@inquirer/prompts');
            specId = await select({
              message: 'Select a spec to validate',
              choices: specIds.map(id => ({ name: id, value: id })),
            });
          } else {
            throw new Error('Missing required argument <spec-id>');
          }
        }

        const openspecPath = await resolveOpenSpecDir(process.cwd());
        const specPath = path.join(openspecPath, 'specs', specId, 'spec.md');
        
        if (!(await FileSystemUtils.fileExists(specPath))) {
          throw new Error(`Spec '${specId}' not found at ${specPath}`);
        }

        const validator = new Validator(options.strict);
        const report = await validator.validateSpec(specPath);

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          if (report.valid) {
            console.log(`Specification '${specId}' is valid`);
          } else {
            console.error(`Specification '${specId}' has issues`);
            report.issues.forEach(issue => {
              const label = issue.level === 'ERROR' ? 'ERROR' : issue.level;
              const prefix = issue.level === 'ERROR' ? '✗' : issue.level === 'WARNING' ? '⚠' : 'ℹ';
              console.error(`${prefix} [${label}] ${issue.path}: ${issue.message}`);
            });
          }
        }
        process.exitCode = report.valid ? 0 : 1;
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exitCode = 1;
      }
    });

  return specCommand;
}
