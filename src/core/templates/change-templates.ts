import { promises as fs } from 'fs';
import path from 'path';

export type ChangeTemplateType = 'proposal' | 'tasks' | 'design' | 'spec';

export interface TemplateContext {
  changeId?: string;
  date?: string;
  capability?: string;
}

/**
 * Default templates for change files
 */
const defaultTemplates: Record<ChangeTemplateType, string> = {
  proposal: `## Why
TODO: Explain why {{changeId}} is needed

## What Changes
- TODO: List changes
- Created on {{date}}

## Impact
- Affected specs: TODO
- Affected code: TODO`,

  tasks: `## 1. Implementation
- [ ] 1.1 TODO: First task for {{changeId}}
- [ ] 1.2 TODO: Second task`,

  design: `## Context
TODO: Background and constraints for {{changeId}}

## Goals / Non-Goals
- Goals: TODO
- Non-Goals: TODO

## Decisions
TODO: Technical decisions and rationale

## Risks / Trade-offs
TODO: Risks and mitigation strategies`,

  spec: `## ADDED Requirements
### Requirement: [Replace with actual requirement name]
The system SHALL [describe the requirement].

#### Scenario: [Replace with scenario name]
- **WHEN** [condition]
- **THEN** [expected result]`,
};

/**
 * Validates that a spec template contains required tags for archive to work correctly
 */
function validateSpecTemplate(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for at least one delta section
  const hasDeltaSection = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements/m.test(content);
  if (!hasDeltaSection) {
    errors.push('Missing required delta section (## ADDED Requirements, ## MODIFIED Requirements, etc.)');
  }

  // Check for Requirement header
  const hasRequirement = /^###\s+Requirement:/m.test(content);
  if (!hasRequirement) {
    errors.push('Missing required ### Requirement: header');
  }

  // Check for Scenario header
  const hasScenario = /^####\s+Scenario:/m.test(content);
  if (!hasScenario) {
    errors.push('Missing required #### Scenario: header');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Replaces template variables with actual values
 */
function replaceVariables(content: string, context: TemplateContext): string {
  let result = content;

  if (context.changeId !== undefined) {
    result = result.replace(/\{\{changeId\}\}/g, context.changeId);
  }

  if (context.date !== undefined) {
    result = result.replace(/\{\{date\}\}/g, context.date);
  }

  if (context.capability !== undefined) {
    result = result.replace(/\{\{capability\}\}/g, context.capability);
  }

  return result;
}

/**
 * Manages change file templates with support for custom templates and variable substitution
 */
export class ChangeTemplateManager {
  /**
   * Loads a template from file system or returns default template
   * @param openspecDir Path to openspec directory
   * @param type Template type
   * @param context Variables to replace in template
   * @returns Rendered template content
   */
  static async loadTemplate(
    openspecDir: string,
    type: ChangeTemplateType,
    context: TemplateContext = {}
  ): Promise<string> {
    const templatePath = path.join(openspecDir, 'templates', `${type}.md.template`);

    let content: string;
    let isCustom = false;

    try {
      // Try to load custom template
      content = await fs.readFile(templatePath, 'utf-8');
      isCustom = true;
    } catch {
      // File doesn't exist, use default
      content = defaultTemplates[type];
    }

    // Validate spec template if it's custom
    if (isCustom && type === 'spec') {
      const validation = validateSpecTemplate(content);
      if (!validation.valid) {
        console.warn(
          `Warning: Custom spec template at ${templatePath} is missing required tags:\n  ${validation.errors.join('\n  ')}\n  Falling back to default template.`
        );
        content = defaultTemplates[type];
      }
    }

    // Replace variables
    const rendered = replaceVariables(content, {
      changeId: context.changeId || '',
      date: context.date || new Date().toISOString().split('T')[0],
      capability: context.capability || '',
    });

    return rendered;
  }

  /**
   * Renders a template with the given context (synchronous version for simple cases)
   * @param type Template type
   * @param context Variables to replace
   * @returns Rendered template content
   */
  static render(type: ChangeTemplateType, context: TemplateContext = {}): string {
    const content = defaultTemplates[type];
    return replaceVariables(content, {
      changeId: context.changeId || '',
      date: context.date || new Date().toISOString().split('T')[0],
      capability: context.capability || '',
    });
  }

  /**
   * Gets the default template content for a given type
   * @param type Template type
   * @returns Default template content
   */
  static getDefaultTemplate(type: ChangeTemplateType): string {
    return defaultTemplates[type];
  }

  /**
   * Checks if custom templates directory exists
   * @param openspecDir Path to openspec directory
   * @returns True if templates directory exists
   */
  static async hasCustomTemplates(openspecDir: string): Promise<boolean> {
    const templatesDir = path.join(openspecDir, 'templates');
    try {
      const stat = await fs.stat(templatesDir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Writes default templates to the templates directory
   * @param openspecDir Path to openspec directory
   */
  static async writeDefaultTemplates(openspecDir: string): Promise<void> {
    const templatesDir = path.join(openspecDir, 'templates');
    await fs.mkdir(templatesDir, { recursive: true });

    for (const [type, content] of Object.entries(defaultTemplates)) {
      const templatePath = path.join(templatesDir, `${type}.md.template`);
      await fs.writeFile(templatePath, content, 'utf-8');
    }
  }
}
