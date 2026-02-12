/**
 * Template exports for OpenSpec.
 *
 * The old config file templates (AGENTS.md, project.md, claude-template, etc.)
 * have been removed. The skill-based workflow uses skill-templates.ts directly.
 */

// Re-export all skill templates and related types through the compatibility facade.
export * from './skill-templates.js';
