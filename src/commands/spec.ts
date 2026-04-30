import { program } from 'commander';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { MarkdownParser } from '../core/parsers/markdown-parser.js';
import { Validator } from '../core/validation/validator.js';
import type { Spec } from '../core/schemas/index.js';
import { isInteractive } from '../utils/interactive.js';
import { getSpecIds } from '../utils/item-discovery.js';
import { CLI_DESCRIPTIONS, CLI_MESSAGES, SPEC_MESSAGES } from '../messages/index.js';

const SPECS_DIR = 'openspec/specs';

interface ShowOptions {
  json?: boolean;
  // JSON-only filters (raw-first text has no filters)
  requirements?: boolean;
  scenarios?: boolean; // --no-scenarios sets this to false (JSON only)
  requirement?: string; // JSON only
  noInteractive?: boolean;
}

function parseSpecFromFile(specPath: string, specId: string): Spec {
  const content = readFileSync(specPath, 'utf-8');
  const parser = new MarkdownParser(content);
  return parser.parseSpec(specId);
}

function validateRequirementIndex(spec: Spec, requirementOpt?: string): number | undefined {
  if (!requirementOpt) return undefined;
  const index = Number.parseInt(requirementOpt, 10);
  if (!Number.isInteger(index) || index < 1 || index > spec.requirements.length) {
    throw new Error(`Requirement ${requirementOpt} not found`);
  }
  return index - 1; // convert to 0-based
}

function filterSpec(spec: Spec, options: ShowOptions): Spec {
  const requirementIndex = validateRequirementIndex(spec, options.requirement);
  const includeScenarios = options.scenarios !== false && !options.requirements;

  const filteredRequirements = (requirementIndex !== undefined
    ? [spec.requirements[requirementIndex]]
    : spec.requirements
  ).map(req => ({
    text: req.text,
    scenarios: includeScenarios ? req.scenarios : [],
  }));

  const metadata = spec.metadata ?? { version: '1.0.0', format: 'openspec' as const };

  return {
    name: spec.name,
    overview: spec.overview,
    requirements: filteredRequirements,
    metadata,
  };
}

/**
 * Print the raw markdown content for a spec file without any formatting.
 * Raw-first behavior ensures text mode is a passthrough for deterministic output.
 */
function printSpecTextRaw(specPath: string): void {
  const content = readFileSync(specPath, 'utf-8');
  console.log(content);
}

export class SpecCommand {
  private SPECS_DIR = 'openspec/specs';

  async show(specId?: string, options: ShowOptions = {}): Promise<void> {
    if (!specId) {
      const canPrompt = isInteractive(options);
      const specIds = await getSpecIds();
      if (canPrompt && specIds.length > 0) {
        const { select } = await import('@inquirer/prompts');
        specId = await select({
          message: SPEC_MESSAGES.selectSpecToShow,
          choices: specIds.map(id => ({ name: id, value: id })),
        });
      } else {
        throw new Error(SPEC_MESSAGES.missingSpecId);
      }
    }

    const specPath = join(this.SPECS_DIR, specId, 'spec.md');
    if (!existsSync(specPath)) {
      throw new Error(SPEC_MESSAGES.specNotFound(specId));
    }

    if (options.json) {
      if (options.requirements && options.requirement) {
        throw new Error(SPEC_MESSAGES.requirementsAndRequirementConflict);
      }
      const parsed = parseSpecFromFile(specPath, specId);
      const filtered = filterSpec(parsed, options);
      const output = {
        id: specId,
        title: parsed.name,
        overview: parsed.overview,
        requirementCount: filtered.requirements.length,
        requirements: filtered.requirements,
        metadata: parsed.metadata ?? { version: '1.0.0', format: 'openspec' as const },
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }
    printSpecTextRaw(specPath);
  }
}

export function registerSpecCommand(rootProgram: typeof program) {
  const specCommand = rootProgram
    .command('spec')
    .description(CLI_DESCRIPTIONS.spec);

  // Deprecation notice for noun-based commands
  specCommand.hook('preAction', () => {
    console.error(CLI_MESSAGES.specCommandsDeprecated);
  });

  specCommand
    .command('show [spec-id]')
    .description(CLI_DESCRIPTIONS.specShow)
    .option('--json', 'Saída como JSON')
    .option('--requirements', 'Somente JSON: Exibe apenas requisitos (exclui cenários)')
    .option('--no-scenarios', 'Somente JSON: Exclui conteúdo de cenários')
    .option('-r, --requirement <id>', 'Somente JSON: Exibe requisito específico pelo ID (base 1)')
    .option('--no-interactive', 'Desativa prompts interativos')
    .action(async (specId: string | undefined, options: ShowOptions & { noInteractive?: boolean }) => {
      try {
        const cmd = new SpecCommand();
        await cmd.show(specId, options as any);
      } catch (error) {
        console.error(CLI_MESSAGES.error(error instanceof Error ? error.message : CLI_MESSAGES.unknownError));
        process.exitCode = 1;
      }
    });

  specCommand
    .command('list')
    .description(CLI_DESCRIPTIONS.specList)
    .option('--json', 'Saída como JSON')
    .option('--long', 'Exibe id e título com contagens')
    .action((options: { json?: boolean; long?: boolean }) => {
      try {
        if (!existsSync(SPECS_DIR)) {
          console.log(SPEC_MESSAGES.noItemsFound);
          return;
        }

        const specs = readdirSync(SPECS_DIR, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => {
            const specPath = join(SPECS_DIR, dirent.name, 'spec.md');
            if (existsSync(specPath)) {
              try {
                const spec = parseSpecFromFile(specPath, dirent.name);
                
                return {
                  id: dirent.name,
                  title: spec.name,
                  requirementCount: spec.requirements.length
                };
              } catch {
                return {
                  id: dirent.name,
                  title: dirent.name,
                  requirementCount: 0
                };
              }
            }
            return null;
          })
          .filter((spec): spec is { id: string; title: string; requirementCount: number } => spec !== null)
          .sort((a, b) => a.id.localeCompare(b.id));

        if (options.json) {
          console.log(JSON.stringify(specs, null, 2));
        } else {
          if (specs.length === 0) {
            console.log(SPEC_MESSAGES.noItemsFound);
            return;
          }
          if (!options.long) {
            specs.forEach(spec => console.log(spec.id));
            return;
          }
          specs.forEach(spec => {
            console.log(`${spec.id}: ${spec.title} ${SPEC_MESSAGES.requirementCount(spec.requirementCount)}`);
          });
        }
      } catch (error) {
        console.error(CLI_MESSAGES.error(error instanceof Error ? error.message : CLI_MESSAGES.unknownError));
        process.exitCode = 1;
      }
    });

  specCommand
    .command('validate [spec-id]')
    .description(CLI_DESCRIPTIONS.specValidate)
    .option('--strict', 'Ativa modo de validação estrita')
    .option('--json', 'Saída do relatório de validação como JSON')
    .option('--no-interactive', 'Desativa prompts interativos')
    .action(async (specId: string | undefined, options: { strict?: boolean; json?: boolean; noInteractive?: boolean }) => {
      try {
        if (!specId) {
          const canPrompt = isInteractive(options);
          const specIds = await getSpecIds();
          if (canPrompt && specIds.length > 0) {
            const { select } = await import('@inquirer/prompts');
            specId = await select({
              message: SPEC_MESSAGES.selectSpecToValidate,
              choices: specIds.map(id => ({ name: id, value: id })),
            });
          } else {
            throw new Error(SPEC_MESSAGES.missingSpecId);
          }
        }

        const specPath = join(SPECS_DIR, specId, 'spec.md');
        
        if (!existsSync(specPath)) {
          throw new Error(SPEC_MESSAGES.specNotFound(specId));
        }

        const validator = new Validator(options.strict);
        const report = await validator.validateSpec(specPath);

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          if (report.valid) {
            console.log(SPEC_MESSAGES.specIsValid(specId));
          } else {
            console.error(SPEC_MESSAGES.specHasIssues(specId));
            report.issues.forEach(issue => {
              const label = issue.level === 'ERROR' ? 'ERROR' : issue.level;
              const prefix = issue.level === 'ERROR' ? '✗' : issue.level === 'WARNING' ? '⚠' : 'ℹ';
              console.error(`${prefix} [${label}] ${issue.path}: ${issue.message}`);
            });
          }
        }
        process.exitCode = report.valid ? 0 : 1;
      } catch (error) {
        console.error(CLI_MESSAGES.error(error instanceof Error ? error.message : CLI_MESSAGES.unknownError));
        process.exitCode = 1;
      }
    });

  return specCommand;
}
