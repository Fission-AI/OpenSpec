import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { existsSync } from 'fs';
import { Validator } from '../core/validation/validator.js';
import { JsonConverter } from '../core/converters/json-converter.js';
import { MarkdownParser } from '../core/parsers/markdown-parser.js';
import { Spec } from '../core/schemas/index.js';

export class SpecCommand {
  private validator: Validator;
  private converter: JsonConverter;

  constructor() {
    this.validator = new Validator();
    this.converter = new JsonConverter();
  }

  register(program: Command): void {
    const specCmd = program
      .command('spec')
      .description('Commands for working with OpenSpec specifications');

    specCmd
      .command('show <spec-name>')
      .description('Display a spec in JSON format')
      .option('--json', 'Output as JSON (default)', true)
      .option('--requirements', 'Show only requirements without scenarios')
      .option('--no-scenarios', 'Hide scenarios from output')
      .option('-r, --requirement <index>', 'Show only a specific requirement by index')
      .action(async (specName: string, options: any) => {
        await this.show(specName, options);
      });

    specCmd
      .command('list')
      .description('List all available specs')
      .option('--json', 'Output as JSON')
      .action(async (options: any) => {
        await this.list(options);
      });

    specCmd
      .command('validate <spec-name>')
      .description('Validate a spec structure')
      .option('--strict', 'Enable strict validation mode')
      .option('--json', 'Output validation report as JSON')
      .action(async (specName: string, options: any) => {
        await this.validate(specName, options);
      });
  }

  private async show(specName: string, options: any): Promise<void> {
    try {
      const specPath = await this.findSpecPath(specName);
      
      if (!specPath) {
        throw new Error(`Spec '${specName}' not found`);
      }

      const content = await fs.readFile(specPath, 'utf-8');
      const parser = new MarkdownParser(content);
      const spec = parser.parseSpec(specName);

      let output: any = spec;

      if (options.requirements || !options.scenarios) {
        output = {
          ...spec,
          requirements: spec.requirements.map((req, index) => ({
            index,
            text: req.text,
            ...(options.scenarios === false ? {} : { scenarios: req.scenarios })
          }))
        };
      }

      if (options.requirement) {
        const reqIndex = parseInt(options.requirement);
        if (isNaN(reqIndex) || reqIndex < 0 || reqIndex >= spec.requirements.length) {
          throw new Error(`Requirement index '${options.requirement}' not found in spec '${specName}' (valid range: 0-${spec.requirements.length - 1})`);
        }
        output = {
          index: reqIndex,
          ...spec.requirements[reqIndex]
        };
      }

      console.log(JSON.stringify(output, null, 2));
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  private async list(options: any): Promise<void> {
    try {
      const specsDir = path.join(process.cwd(), 'openspec', 'specs');
      
      if (!existsSync(specsDir)) {
        throw new Error('No specs directory found. Run "openspec init" first.');
      }

      const specDirs = await fs.readdir(specsDir);
      const specs: string[] = [];

      for (const dir of specDirs) {
        const dirPath = path.join(specsDir, dir);
        const stat = await fs.stat(dirPath);
        
        if (stat.isDirectory()) {
          const specFile = path.join(dirPath, 'spec.md');
          if (existsSync(specFile)) {
            specs.push(dir);
          }
        }
      }

      if (options.json) {
        console.log(JSON.stringify({ specs }, null, 2));
      } else {
        if (specs.length === 0) {
          console.log('No specs found.');
        } else {
          console.log('Available specs:');
          specs.forEach(spec => {
            console.log(`  - ${spec}`);
          });
        }
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  private async validate(specName: string, options: any): Promise<void> {
    try {
      const specPath = await this.findSpecPath(specName);
      
      if (!specPath) {
        throw new Error(`Spec '${specName}' not found`);
      }

      const validator = new Validator(options.strict);
      const report = await validator.validateSpec(specPath);

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        if (report.valid) {
          console.log(`✓ Spec '${specName}' is valid`);
        } else {
          console.log(`✗ Spec '${specName}' has validation issues:`);
        }

        if (report.summary.errors > 0) {
          console.log(`  Errors: ${report.summary.errors}`);
        }
        if (report.summary.warnings > 0) {
          console.log(`  Warnings: ${report.summary.warnings}`);
        }
        if (report.summary.info > 0) {
          console.log(`  Info: ${report.summary.info}`);
        }

        if (report.issues.length > 0) {
          console.log('\nIssues:');
          report.issues.forEach(issue => {
            const icon = issue.level === 'ERROR' ? '✗' : 
                        issue.level === 'WARNING' ? '⚠' : 'ℹ';
            console.log(`  ${icon} [${issue.level}] ${issue.path}: ${issue.message}`);
          });
        }
      }

      if (!report.valid) {
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  private async findSpecPath(specName: string): Promise<string | null> {
    const specsDir = path.join(process.cwd(), 'openspec', 'specs');
    const specPath = path.join(specsDir, specName, 'spec.md');
    
    if (existsSync(specPath)) {
      return specPath;
    }
    
    return null;
  }
}