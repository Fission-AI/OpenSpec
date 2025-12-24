# Technical Design for OpenSpec MCP Server Subcommand (v2)

Integrating MCP protocol into the OpenSpec CLI creates a **stdio-based server** that exposes **10 resources**, **6 tools**, and **3 prompts** to AI coding assistants. This design achieves 1:1 parity with the OpenSpec CLI while leveraging MCP's resource model for context delivery.

## Architecture Overview

The MCP server becomes a first-class subcommand alongside `init`, `list`, and `validate`. The implementation follows MCP best practices:

- **Resources**: Read-only access to specs, changes, project context, and AGENTS.md instructions
- **Tools**: Actions that modify state, mapping directly to CLI commands
- **Prompts**: Guided workflows that combine resources and tools

## Exposed Capabilities Summary

### Resources (10 total)

| Resource URI | Description |
|--------------|-------------|
| `openspec://instructions` | AGENTS.md workflow instructions |
| `openspec://project` | Project context (project.md) |
| `openspec://specs` | List of all specifications |
| `openspec://specs/{capability}` | Individual spec content |
| `openspec://changes` | List of active changes |
| `openspec://changes/{changeId}` | Change details (proposal, tasks, design) |
| `openspec://changes/{changeId}/proposal` | Proposal document |
| `openspec://changes/{changeId}/tasks` | Tasks checklist |
| `openspec://changes/{changeId}/design` | Design document |
| `openspec://archive` | List of archived changes |

### Tools (6 total)

| Tool | CLI Command | Description |
|------|-------------|-------------|
| `init` | `openspec init [path]` | Initialize OpenSpec in project |
| `list` | `openspec list [--specs]` | List changes (default) or specs |
| `show` | `openspec show [item-name]` | Show a change or spec |
| `validate` | `openspec validate [item-name]` | Validate changes and specs |
| `archive` | `openspec archive [change-name]` | Archive completed change |
| `update_project_context` | *(new)* | Update project.md with project details |

**Note**: The CLI `view` command (interactive dashboard) and `update` command are not exposed via MCP. The `change` and `spec` subcommand groups are accessed through `list`, `show`, and the prompts.

### Prompts (3 total)

| Prompt | Slash Command | Description |
|--------|---------------|-------------|
| `openspec-propose` | `/openspec:proposal` | Guided proposal workflow |
| `openspec-apply` | `/openspec:apply` | Guided implementation workflow |
| `openspec-archive` | `/openspec:archive` | Guided archive workflow |

---

## File Structure

```
src/
├── commands/
│   └── mcp.ts                    # Commander.js subcommand entry point
│
├── mcp/
│   ├── index.ts                  # McpServer initialization and startup
│   ├── server.ts                 # Server configuration and connection handling
│   │
│   ├── resources/
│   │   ├── index.ts              # Resource registration aggregator
│   │   ├── instructions.ts       # AGENTS.md resource
│   │   ├── project.ts            # project.md resource
│   │   ├── specs.ts              # Specs list and individual spec resources
│   │   ├── changes.ts            # Changes list and individual change resources
│   │   └── archive.ts            # Archived changes resource
│   │
│   ├── tools/
│   │   ├── index.ts              # Tool registration aggregator
│   │   ├── init.ts               # openspec init
│   │   ├── list.ts               # openspec list [--specs]
│   │   ├── show.ts               # openspec show [item-name]
│   │   ├── validate.ts           # openspec validate [item-name]
│   │   ├── archive.ts            # openspec archive [change-name]
│   │   └── project.ts            # update_project_context
│   │
│   ├── prompts/
│   │   ├── index.ts              # Prompt registration aggregator
│   │   ├── propose-prompt.ts     # Proposal workflow prompt
│   │   ├── apply-prompt.ts       # Implementation workflow prompt
│   │   └── archive-prompt.ts     # Archive workflow prompt
│   │
│   └── utils/
│       ├── path-resolver.ts      # OPENSPEC_ROOT path resolution logic
│       ├── context-loader.ts     # Loads AGENTS.md and project.md content
│       └── task-parser.ts        # Parse and update tasks.md
```

---

## Commander.js Integration

```typescript
// src/commands/mcp.ts
import { Command } from 'commander';
import { startMcpServer } from '../mcp/index.js';

export function createMcpCommand(): Command {
  return new Command('mcp')
    .description('Start stdio-based MCP server for AI agent integration')
    .option('--debug', 'Enable debug logging to stderr')
    .action(async (options) => {
      await startMcpServer({
        debug: options.debug ?? false,
      });
    });
}
```

---

## Path Resolution Logic

```typescript
// src/mcp/utils/path-resolver.ts
import * as path from 'path';
import * as fs from 'fs';

export interface PathConfig {
  specsRoot: string;
  projectRoot: string;
  isAutoProjectRoot: boolean;
}

export function resolveOpenSpecPaths(projectPath?: string): PathConfig {
  const openspecRoot = process.env.OPENSPEC_ROOT;
  const autoProjectRoot = process.env.OPENSPEC_AUTO_PROJECT_ROOT === 'true';
  
  const projectRoot = projectPath 
    ? path.resolve(projectPath) 
    : process.cwd();

  if (!openspecRoot) {
    return { specsRoot: projectRoot, projectRoot, isAutoProjectRoot: false };
  }

  const resolvedOpenspecRoot = path.resolve(openspecRoot);

  if (!autoProjectRoot) {
    return { specsRoot: resolvedOpenspecRoot, projectRoot, isAutoProjectRoot: false };
  }

  const relativeProjectPath = deriveRelativePath(projectRoot);
  const specsRoot = path.join(resolvedOpenspecRoot, relativeProjectPath);
  ensureDirectoryExists(specsRoot);

  return { specsRoot, projectRoot, isAutoProjectRoot: true };
}

function deriveRelativePath(projectRoot: string): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  
  if (homeDir && projectRoot.startsWith(homeDir)) {
    const relativePath = projectRoot.slice(homeDir.length);
    return relativePath.replace(/^[\/\\]+/, '');
  }
  
  return path.basename(projectRoot);
}

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getOpenSpecDir(config: PathConfig): string {
  return path.join(config.specsRoot, 'openspec');
}

export function getChangePath(config: PathConfig, changeId: string): string {
  return path.join(getOpenSpecDir(config), 'changes', changeId);
}

export function getSpecPath(config: PathConfig, capability: string): string {
  return path.join(getOpenSpecDir(config), 'specs', capability, 'spec.md');
}
```

### Path Resolution Examples

| OPENSPEC_ROOT | AUTO_PROJECT_ROOT | Project Path | Specs Written To |
|---------------|-------------------|--------------|------------------|
| *(not set)* | *(any)* | `/home/foo/myproject` | `/home/foo/myproject/openspec/` |
| `/home/foo/.openspec` | `false` | `/home/foo/myproject` | `/home/foo/.openspec/openspec/` |
| `/home/foo/.openspec` | `true` | `/home/foo/project/bar` | `/home/foo/.openspec/project/bar/openspec/` |

---

## MCP Server Initialization

```typescript
// src/mcp/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllResources } from './resources/index.js';
import { registerAllTools } from './tools/index.js';
import { registerAllPrompts } from './prompts/index.js';
import { resolveOpenSpecPaths } from './utils/path-resolver.js';

export async function startMcpServer(options: { debug: boolean }): Promise<void> {
  const pathConfig = resolveOpenSpecPaths();
  
  if (options.debug) {
    console.error('[openspec-mcp] Path configuration:', JSON.stringify(pathConfig, null, 2));
  }

  const server = new McpServer({
    name: 'openspec',
    version: '1.0.0',
  });

  registerAllResources(server, pathConfig);
  registerAllTools(server, pathConfig);
  registerAllPrompts(server, pathConfig);

  const transport = new StdioServerTransport();
  
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  try {
    await server.connect(transport);
    console.error('[openspec-mcp] Server started on stdio');
  } catch (error) {
    console.error('[openspec-mcp] Failed to start:', error);
    process.exit(1);
  }
}
```

---

## MCP Resources Implementation

Resources provide read-only access to OpenSpec data. AI assistants fetch these to understand project context before calling tools.

### Resource 1: Instructions (AGENTS.md)

```typescript
// src/mcp/resources/instructions.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathConfig, getOpenSpecDir } from '../utils/path-resolver.js';

export function registerInstructionsResource(server: McpServer, pathConfig: PathConfig): void {
  server.resource(
    'openspec://instructions',
    'OpenSpec workflow instructions from AGENTS.md. AI assistants should read this first to understand how to use OpenSpec tools and prompts.',
    async () => {
      const agentsPath = path.join(getOpenSpecDir(pathConfig), 'AGENTS.md');
      
      let content: string;
      try {
        content = await fs.readFile(agentsPath, 'utf-8');
      } catch {
        content = getDefaultAgentsTemplate();
      }

      return {
        contents: [{
          uri: 'openspec://instructions',
          mimeType: 'text/markdown',
          text: content,
        }],
      };
    }
  );
}

function getDefaultAgentsTemplate(): string {
  return `# OpenSpec Workflow Instructions

OpenSpec has not been initialized in this project. Use the \`init\` tool to get started.

## Available Tools

- \`init\`: Initialize OpenSpec in this project (openspec init)
- \`list\`: List changes or specs (openspec list [--specs])
- \`show\`: Show a change or spec (openspec show [item-name])
- \`validate\`: Validate changes and specs (openspec validate [item-name])
- \`archive\`: Archive a completed change (openspec archive [change-name])
- \`update_project_context\`: Update project.md with project details

## Available Prompts

- \`openspec-propose\`: Guided workflow for creating change proposals
- \`openspec-apply\`: Guided workflow for implementing changes
- \`openspec-archive\`: Guided workflow for archiving completed changes

## Getting Started

1. Run the \`init\` tool to initialize OpenSpec
2. Use \`update_project_context\` to fill in project details
3. Use the \`openspec-propose\` prompt to create your first change
`;
}
```

### Resource 2: Project Context (project.md)

```typescript
// src/mcp/resources/project.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathConfig, getOpenSpecDir } from '../utils/path-resolver.js';

export function registerProjectResource(server: McpServer, pathConfig: PathConfig): void {
  server.resource(
    'openspec://project',
    'Project context including tech stack, conventions, and architectural patterns. Use update_project_context tool to modify.',
    async () => {
      const projectPath = path.join(getOpenSpecDir(pathConfig), 'project.md');
      
      let content: string;
      try {
        content = await fs.readFile(projectPath, 'utf-8');
      } catch {
        content = getEmptyProjectTemplate();
      }

      return {
        contents: [{
          uri: 'openspec://project',
          mimeType: 'text/markdown',
          text: content,
        }],
      };
    }
  );
}

function getEmptyProjectTemplate(): string {
  return `# Project Context

<!-- This file is empty. Use the update_project_context tool to populate it. -->

## Project Description

## Tech Stack

## Conventions

## Architecture

## Testing
`;
}
```

### Resource 3-4: Specs Resources

```typescript
// src/mcp/resources/specs.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathConfig, getOpenSpecDir, getSpecPath } from '../utils/path-resolver.js';

export function registerSpecsResources(server: McpServer, pathConfig: PathConfig): void {
  // List all specs
  server.resource(
    'openspec://specs',
    'List of all specifications in openspec/specs/',
    async () => {
      const specsDir = path.join(getOpenSpecDir(pathConfig), 'specs');
      
      let specs: string[] = [];
      try {
        const entries = await fs.readdir(specsDir, { withFileTypes: true });
        specs = entries.filter(e => e.isDirectory()).map(e => e.name);
      } catch {}

      const content = specs.length > 0
        ? `# Specifications\n\n${specs.map(s => `- [${s}](openspec://specs/${s})`).join('\n')}`
        : '# Specifications\n\nNo specifications found.';

      return {
        contents: [{
          uri: 'openspec://specs',
          mimeType: 'text/markdown',
          text: content,
        }],
      };
    }
  );

  // Individual spec
  server.resourceTemplate(
    'openspec://specs/{capability}',
    'Specification document for a specific capability',
    async ({ capability }) => {
      const specPath = getSpecPath(pathConfig, capability as string);
      
      let content: string;
      try {
        content = await fs.readFile(specPath, 'utf-8');
      } catch {
        content = `# ${capability}\n\nSpecification not found.`;
      }

      return {
        contents: [{
          uri: `openspec://specs/${capability}`,
          mimeType: 'text/markdown',
          text: content,
        }],
      };
    }
  );
}
```

### Resource 5-9: Changes Resources

```typescript
// src/mcp/resources/changes.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathConfig, getOpenSpecDir, getChangePath } from '../utils/path-resolver.js';

export function registerChangesResources(server: McpServer, pathConfig: PathConfig): void {
  // List all active changes
  server.resource(
    'openspec://changes',
    'List of all active change proposals',
    async () => {
      const changesDir = path.join(getOpenSpecDir(pathConfig), 'changes');
      
      let changes: string[] = [];
      try {
        const entries = await fs.readdir(changesDir, { withFileTypes: true });
        changes = entries
          .filter(e => e.isDirectory() && e.name !== 'archive')
          .map(e => e.name);
      } catch {}

      const content = changes.length > 0
        ? `# Active Changes\n\n${changes.map(c => `- [${c}](openspec://changes/${c})`).join('\n')}`
        : '# Active Changes\n\nNo active changes.';

      return {
        contents: [{
          uri: 'openspec://changes',
          mimeType: 'text/markdown',
          text: content,
        }],
      };
    }
  );

  // Individual change - returns all files
  server.resourceTemplate(
    'openspec://changes/{changeId}',
    'Complete change details including proposal, tasks, and design',
    async ({ changeId }) => {
      const changePath = getChangePath(pathConfig, changeId as string);
      
      const [proposal, tasks, design] = await Promise.all([
        readFileIfExists(path.join(changePath, 'proposal.md')),
        readFileIfExists(path.join(changePath, 'tasks.md')),
        readFileIfExists(path.join(changePath, 'design.md')),
      ]);

      const contents = [];
      if (proposal) contents.push({ uri: `openspec://changes/${changeId}/proposal`, mimeType: 'text/markdown', text: proposal });
      if (tasks) contents.push({ uri: `openspec://changes/${changeId}/tasks`, mimeType: 'text/markdown', text: tasks });
      if (design) contents.push({ uri: `openspec://changes/${changeId}/design`, mimeType: 'text/markdown', text: design });

      if (contents.length === 0) {
        contents.push({ uri: `openspec://changes/${changeId}`, mimeType: 'text/markdown', text: `# ${changeId}\n\nChange not found.` });
      }

      return { contents };
    }
  );

  // Individual change files
  server.resourceTemplate('openspec://changes/{changeId}/proposal', 'Proposal document', async ({ changeId }) => {
    const content = await readFileIfExists(path.join(getChangePath(pathConfig, changeId as string), 'proposal.md'));
    return { contents: [{ uri: `openspec://changes/${changeId}/proposal`, mimeType: 'text/markdown', text: content || 'Not found' }] };
  });

  server.resourceTemplate('openspec://changes/{changeId}/tasks', 'Tasks checklist', async ({ changeId }) => {
    const content = await readFileIfExists(path.join(getChangePath(pathConfig, changeId as string), 'tasks.md'));
    return { contents: [{ uri: `openspec://changes/${changeId}/tasks`, mimeType: 'text/markdown', text: content || 'Not found' }] };
  });

  server.resourceTemplate('openspec://changes/{changeId}/design', 'Design document', async ({ changeId }) => {
    const content = await readFileIfExists(path.join(getChangePath(pathConfig, changeId as string), 'design.md'));
    return { contents: [{ uri: `openspec://changes/${changeId}/design`, mimeType: 'text/markdown', text: content || 'Not found' }] };
  });
}

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}
```

### Resource 10: Archive

```typescript
// src/mcp/resources/archive.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathConfig, getOpenSpecDir } from '../utils/path-resolver.js';

export function registerArchiveResource(server: McpServer, pathConfig: PathConfig): void {
  server.resource(
    'openspec://archive',
    'List of archived (completed) changes',
    async () => {
      const archiveDir = path.join(getOpenSpecDir(pathConfig), 'changes', 'archive');
      
      let archived: string[] = [];
      try {
        const entries = await fs.readdir(archiveDir, { withFileTypes: true });
        archived = entries.filter(e => e.isDirectory()).map(e => e.name).sort().reverse();
      } catch {}

      const content = archived.length > 0
        ? `# Archived Changes\n\n${archived.map(a => `- ${a}`).join('\n')}`
        : '# Archived Changes\n\nNo archived changes yet.';

      return {
        contents: [{
          uri: 'openspec://archive',
          mimeType: 'text/markdown',
          text: content,
        }],
      };
    }
  );
}
```

---

## MCP Tools Implementation

Tools provide actions that map directly to OpenSpec CLI commands. Each tool returns structured JSON responses.

### Tool 1: `init` - Initialize OpenSpec

Maps to: `openspec init [options] [path]`

```typescript
// src/mcp/tools/init.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathConfig, getOpenSpecDir } from '../utils/path-resolver.js';

export function registerInitTool(server: McpServer, pathConfig: PathConfig): void {
  server.tool(
    'init',
    `Initialize OpenSpec in the project. Creates openspec/ directory with AGENTS.md, project.md, and folder structure.

Equivalent to: openspec init [path]

After initialization:
1. Read openspec://instructions for workflow guidance
2. Use update_project_context to fill in project details
3. Use openspec-propose prompt to create your first change`,
    {
      path: z.string().optional()
        .describe('Path to initialize OpenSpec in (defaults to current directory)'),
      tools: z.array(z.enum(['claude-code', 'cursor', 'codex', 'codebuddy', 'qoder', 'roocode']))
        .optional()
        .describe('AI tools to configure slash commands for'),
    },
    async (args) => {
      try {
        const openspecDir = getOpenSpecDir(pathConfig);
        
        try {
          await fs.access(openspecDir);
          return {
            content: [{ type: 'text', text: JSON.stringify({ 
              success: false, 
              error: 'OpenSpec already initialized', 
              path: openspecDir,
              hint: 'Read openspec://instructions to see available workflows'
            }, null, 2) }],
            isError: true,
          };
        } catch {}

        await fs.mkdir(openspecDir, { recursive: true });
        await fs.mkdir(path.join(openspecDir, 'specs'), { recursive: true });
        await fs.mkdir(path.join(openspecDir, 'changes'), { recursive: true });
        await fs.mkdir(path.join(openspecDir, 'changes', 'archive'), { recursive: true });

        await fs.writeFile(path.join(openspecDir, 'AGENTS.md'), getAgentsTemplate());
        await fs.writeFile(path.join(openspecDir, 'project.md'), getProjectTemplate());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              path: openspecDir,
              filesCreated: ['AGENTS.md', 'project.md', 'specs/', 'changes/', 'changes/archive/'],
              nextSteps: [
                'Read openspec://instructions for workflow guidance',
                'Read openspec://project to see the empty project template',
                'Use update_project_context tool to fill in project details',
                'Use openspec-propose prompt to create your first change'
              ],
            }, null, 2),
          }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error}` }], isError: true };
      }
    }
  );
}

function getAgentsTemplate(): string {
  return `# OpenSpec Agent Instructions
  
// ... template content
`;
}

function getProjectTemplate(): string {
  return `# Project Context

## Project Description
<!-- Describe what this project does -->

## Tech Stack
<!-- List languages, frameworks, databases, etc. -->

## Conventions
<!-- Coding standards, naming conventions, patterns -->

## Architecture
<!-- High-level structure, key modules -->

## Testing
<!-- Testing approach and requirements -->
`;
}
```

### Tool 2: `list` - List Changes or Specs

Maps to: `openspec list [options]`

```typescript
// src/mcp/tools/list.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathConfig, getOpenSpecDir } from '../utils/path-resolver.js';

export function registerListTool(server: McpServer, pathConfig: PathConfig): void {
  server.tool(
    'list',
    `List items - changes by default, or specs with --specs flag.

Equivalent to: openspec list [--specs]

Before using:
1. Read openspec://instructions for context
2. Read openspec://project for project conventions`,
    {
      specs: z.boolean().default(false)
        .describe('List specs instead of changes'),
      long: z.boolean().default(false)
        .describe('Show detailed information'),
    },
    async (args) => {
      try {
        if (args.specs) {
          // List specs
          const specsDir = path.join(getOpenSpecDir(pathConfig), 'specs');
          let specs: Array<{ capability: string; summary?: string }> = [];
          
          try {
            const entries = await fs.readdir(specsDir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory()) {
                const spec: { capability: string; summary?: string } = { capability: entry.name };
                if (args.long) {
                  try {
                    const content = await fs.readFile(path.join(specsDir, entry.name, 'spec.md'), 'utf-8');
                    spec.summary = content.slice(0, 200).replace(/\n/g, ' ') + '...';
                  } catch {}
                }
                specs.push(spec);
              }
            }
          } catch {}

          return { 
            content: [{ 
              type: 'text', 
              text: JSON.stringify({ 
                type: 'specs',
                count: specs.length, 
                specs,
                hint: 'Use show tool with capability name for full spec content'
              }, null, 2) 
            }] 
          };
        } else {
          // List changes
          const changesDir = path.join(getOpenSpecDir(pathConfig), 'changes');
          let changes: Array<{ id: string; hasProposal: boolean; hasTasks: boolean; hasDesign: boolean; progress?: { completed: number; total: number } }> = [];
          
          try {
            const entries = await fs.readdir(changesDir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory() && entry.name !== 'archive') {
                const changePath = path.join(changesDir, entry.name);
                const change: any = {
                  id: entry.name,
                  hasProposal: await fileExists(path.join(changePath, 'proposal.md')),
                  hasTasks: await fileExists(path.join(changePath, 'tasks.md')),
                  hasDesign: await fileExists(path.join(changePath, 'design.md')),
                };
                
                if (args.long && change.hasTasks) {
                  try {
                    const tasks = await fs.readFile(path.join(changePath, 'tasks.md'), 'utf-8');
                    const all = tasks.match(/- \[[ x]\]/gi) || [];
                    const done = tasks.match(/- \[x\]/gi) || [];
                    change.progress = { completed: done.length, total: all.length };
                  } catch {}
                }
                
                changes.push(change);
              }
            }
          } catch {}

          return { 
            content: [{ 
              type: 'text', 
              text: JSON.stringify({ 
                type: 'changes',
                count: changes.length, 
                changes,
                hint: 'Use show tool with change name for full details'
              }, null, 2) 
            }] 
          };
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error}` }], isError: true };
      }
    }
  );
}

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}
```

### Tool 3: `show` - Show Change or Spec

Maps to: `openspec show [options] [item-name]`

```typescript
// src/mcp/tools/show.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathConfig, getChangePath, getSpecPath, getOpenSpecDir } from '../utils/path-resolver.js';

export function registerShowTool(server: McpServer, pathConfig: PathConfig): void {
  server.tool(
    'show',
    `Show details of a change or spec.

Equivalent to: openspec show [item-name]

Before using:
1. Read openspec://instructions for workflow context
2. Read openspec://project for project conventions
3. Use list tool to see available items`,
    {
      name: z.string()
        .describe('Name of the change or spec to show'),
      type: z.enum(['change', 'spec']).default('change')
        .describe('Type of item to show'),
    },
    async (args) => {
      try {
        if (args.type === 'spec') {
          // Show spec
          const specPath = getSpecPath(pathConfig, args.name);
          
          let content: string;
          try {
            content = await fs.readFile(specPath, 'utf-8');
          } catch {
            return { 
              content: [{ type: 'text', text: JSON.stringify({ 
                error: `Spec "${args.name}" not found`,
                hint: 'Use list tool with specs=true to see available specs'
              }, null, 2) }], 
              isError: true 
            };
          }

          return { 
            content: [{ 
              type: 'text', 
              text: JSON.stringify({ 
                type: 'spec',
                capability: args.name, 
                content 
              }, null, 2) 
            }] 
          };
        } else {
          // Show change
          const changePath = getChangePath(pathConfig, args.name);
          
          try {
            await fs.access(changePath);
          } catch {
            return { 
              content: [{ type: 'text', text: JSON.stringify({ 
                error: `Change "${args.name}" not found`,
                hint: 'Use list tool to see available changes'
              }, null, 2) }], 
              isError: true 
            };
          }

          const [proposal, tasks, design] = await Promise.all([
            readFileIfExists(path.join(changePath, 'proposal.md')),
            readFileIfExists(path.join(changePath, 'tasks.md')),
            readFileIfExists(path.join(changePath, 'design.md')),
          ]);

          const specDeltas = await readSpecDeltas(path.join(changePath, 'specs'));
          const taskProgress = parseTaskProgress(tasks || '');

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ 
                type: 'change',
                changeId: args.name, 
                progress: taskProgress,
                files: {
                  proposal: proposal ? 'present' : 'missing',
                  tasks: tasks ? 'present' : 'missing',
                  design: design ? 'present' : 'missing',
                },
                proposal, 
                tasks, 
                design,
                specDeltas,
              }, null, 2),
            }],
          };
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error}` }], isError: true };
      }
    }
  );
}

async function readFileIfExists(p: string): Promise<string | null> {
  try { return await fs.readFile(p, 'utf-8'); } catch { return null; }
}

async function readSpecDeltas(dir: string): Promise<Record<string, string>> {
  const deltas: Record<string, string> = {};
  try {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const content = await readFileIfExists(path.join(dir, entry.name, 'spec.md'));
        if (content) deltas[entry.name] = content;
      }
    }
  } catch {}
  return deltas;
}

function parseTaskProgress(content: string) {
  const all = content.match(/- \[[ x]\]/gi) || [];
  const done = content.match(/- \[x\]/gi) || [];
  return { total: all.length, completed: done.length, percentage: all.length ? Math.round((done.length / all.length) * 100) : 0 };
}
```

### Tool 4: `validate` - Validate Changes and Specs

Maps to: `openspec validate [options] [item-name]`

```typescript
// src/mcp/tools/validate.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathConfig, getOpenSpecDir, getChangePath } from '../utils/path-resolver.js';

export function registerValidateTool(server: McpServer, pathConfig: PathConfig): void {
  server.tool(
    'validate',
    `Validate changes and specs for formatting and structure.

Equivalent to: openspec validate [item-name]

Before using:
1. Read openspec://instructions for validation rules
2. Read openspec://project for project-specific conventions`,
    {
      name: z.string().optional()
        .describe('Specific change or spec to validate. If omitted, validates all.'),
      type: z.enum(['change', 'spec', 'all']).default('all')
        .describe('Type of item to validate'),
      strict: z.boolean().default(false)
        .describe('Fail on warnings (not just errors)'),
    },
    async (args) => {
      try {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        if (args.name && args.type === 'change') {
          // Validate specific change
          const changePath = getChangePath(pathConfig, args.name);
          
          try {
            await fs.access(changePath);
          } catch {
            return { 
              content: [{ type: 'text', text: JSON.stringify({ 
                valid: false, 
                error: `Change "${args.name}" not found` 
              }, null, 2) }], 
              isError: true 
            };
          }

          // Check required files
          if (!await fileExists(path.join(changePath, 'proposal.md'))) {
            errors.push('Missing proposal.md');
          } else {
            const proposal = await fs.readFile(path.join(changePath, 'proposal.md'), 'utf-8');
            if (!proposal.includes('## Summary')) warnings.push('proposal.md missing Summary section');
            if (!proposal.includes('## Why')) warnings.push('proposal.md missing Why section');
          }
          
          if (!await fileExists(path.join(changePath, 'tasks.md'))) {
            errors.push('Missing tasks.md');
          } else {
            const tasks = await fs.readFile(path.join(changePath, 'tasks.md'), 'utf-8');
            if (!tasks.match(/- \[[ x]\]/)) warnings.push('tasks.md has no task checkboxes');
          }

          // Validate spec deltas
          const specsDir = path.join(changePath, 'specs');
          try {
            const entries = await fs.readdir(specsDir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory() && !await fileExists(path.join(specsDir, entry.name, 'spec.md'))) {
                warnings.push(`specs/${entry.name}/ missing spec.md`);
              }
            }
          } catch {}
          
        } else if (args.name && args.type === 'spec') {
          // Validate specific spec
          const specPath = path.join(getOpenSpecDir(pathConfig), 'specs', args.name, 'spec.md');
          try {
            const content = await fs.readFile(specPath, 'utf-8');
            if (content.trim().length === 0) errors.push('spec.md is empty');
          } catch {
            errors.push(`Spec "${args.name}" not found`);
          }
          
        } else {
          // Validate all
          const specsDir = path.join(getOpenSpecDir(pathConfig), 'specs');
          const changesDir = path.join(getOpenSpecDir(pathConfig), 'changes');
          
          // Validate all specs
          try {
            const entries = await fs.readdir(specsDir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory()) {
                const specPath = path.join(specsDir, entry.name, 'spec.md');
                try {
                  const content = await fs.readFile(specPath, 'utf-8');
                  if (content.trim().length === 0) warnings.push(`specs/${entry.name}/spec.md is empty`);
                } catch {
                  errors.push(`specs/${entry.name}/ missing spec.md`);
                }
              }
            }
          } catch { 
            warnings.push('No specs directory found'); 
          }
          
          // Validate all changes
          try {
            const entries = await fs.readdir(changesDir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory() && entry.name !== 'archive') {
                const changePath = path.join(changesDir, entry.name);
                if (!await fileExists(path.join(changePath, 'proposal.md'))) {
                  errors.push(`changes/${entry.name}/ missing proposal.md`);
                }
                if (!await fileExists(path.join(changePath, 'tasks.md'))) {
                  warnings.push(`changes/${entry.name}/ missing tasks.md`);
                }
              }
            }
          } catch {}
        }

        const valid = errors.length === 0 && (!args.strict || warnings.length === 0);

        return { 
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              valid, 
              target: args.name || 'all',
              strict: args.strict,
              errors, 
              warnings 
            }, null, 2) 
          }], 
          isError: !valid 
        };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error}` }], isError: true };
      }
    }
  );
}

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}
```

### Tool 5: `archive` - Archive Completed Change

Maps to: `openspec archive [options] [change-name]`

```typescript
// src/mcp/tools/archive.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathConfig, getChangePath, getOpenSpecDir } from '../utils/path-resolver.js';

export function registerArchiveTool(server: McpServer, pathConfig: PathConfig): void {
  server.tool(
    'archive',
    `Archive a completed change and update main specs.

Equivalent to: openspec archive [change-name]

Before using:
1. Read openspec://instructions for archive workflow
2. Read openspec://project for project conventions
3. Use show tool to verify all tasks are complete
4. Use validate tool to ensure no errors`,
    {
      name: z.string()
        .describe('Name of the change to archive'),
      updateSpecs: z.boolean().default(true)
        .describe('Merge spec deltas into main specs/'),
      dryRun: z.boolean().default(false)
        .describe('Preview without making changes'),
      force: z.boolean().default(false)
        .describe('Archive even if tasks are incomplete'),
    },
    async (args) => {
      try {
        const openspecDir = getOpenSpecDir(pathConfig);
        const changePath = getChangePath(pathConfig, args.name);
        const archiveDir = path.join(openspecDir, 'changes', 'archive');
        
        try { 
          await fs.access(changePath); 
        } catch {
          return { 
            content: [{ type: 'text', text: JSON.stringify({ 
              success: false, 
              error: `Change "${args.name}" not found`,
              hint: 'Use list tool to see available changes'
            }, null, 2) }], 
            isError: true 
          };
        }

        // Check tasks complete
        if (!args.force) {
          try {
            const tasks = await fs.readFile(path.join(changePath, 'tasks.md'), 'utf-8');
            const incomplete = (tasks.match(/- \[ \]/g) || []).length;
            if (incomplete > 0) {
              return { 
                content: [{ type: 'text', text: JSON.stringify({ 
                  success: false, 
                  error: 'Incomplete tasks remain',
                  incompleteTasks: incomplete,
                  hint: 'Complete all tasks or use force=true to archive anyway'
                }, null, 2) }], 
                isError: true 
              };
            }
          } catch {}
        }

        const datePrefix = new Date().toISOString().split('T')[0];
        const archiveName = `${datePrefix}-${args.name}`;
        const archivePath = path.join(archiveDir, archiveName);

        if (args.dryRun) {
          return { 
            content: [{ type: 'text', text: JSON.stringify({ 
              dryRun: true,
              changeId: args.name,
              operations: [
                `Move ${changePath} → ${archivePath}`, 
                args.updateSpecs ? 'Merge spec deltas into specs/' : 'Skip spec updates'
              ],
              hint: 'Set dryRun=false to execute'
            }, null, 2) }] 
          };
        }

        await fs.mkdir(archiveDir, { recursive: true });
        
        // Merge spec deltas if requested
        if (args.updateSpecs) {
          await mergeSpecDeltas(changePath, openspecDir);
        }

        await fs.rename(changePath, archivePath);

        return { 
          content: [{ type: 'text', text: JSON.stringify({ 
            success: true, 
            changeId: args.name,
            archivedTo: archivePath, 
            specsUpdated: args.updateSpecs,
            nextSteps: [
              'Use validate tool to verify specs',
              'Commit the updated specs to version control'
            ]
          }, null, 2) }] 
        };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error}` }], isError: true };
      }
    }
  );
}

async function mergeSpecDeltas(changePath: string, openspecDir: string): Promise<void> {
  const deltaDir = path.join(changePath, 'specs');
  const mainDir = path.join(openspecDir, 'specs');
  
  try {
    for (const entry of await fs.readdir(deltaDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const deltaPath = path.join(deltaDir, entry.name, 'spec.md');
        const mainPath = path.join(mainDir, entry.name, 'spec.md');
        
        try {
          const delta = await fs.readFile(deltaPath, 'utf-8');
          await fs.mkdir(path.join(mainDir, entry.name), { recursive: true });
          
          let existing = '';
          try { existing = await fs.readFile(mainPath, 'utf-8'); } catch {}
          
          const merged = existing ? `${existing}\n\n---\n\n${delta}` : delta;
          await fs.writeFile(mainPath, merged);
        } catch {}
      }
    }
  } catch {}
}
```

### Tool 6: `update_project_context` - Update Project Context

This is a new tool (not in CLI) that enables AI assistants to populate project.md after analyzing the codebase.

```typescript
// src/mcp/tools/project.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathConfig, getOpenSpecDir } from '../utils/path-resolver.js';

export function registerProjectTool(server: McpServer, pathConfig: PathConfig): void {
  server.tool(
    'update_project_context',
    `Update the project.md file with project details.

This tool allows AI assistants to populate or update the project context after analyzing the codebase.

**Typical workflow:**
1. Read openspec://instructions for guidance
2. Read openspec://project to see current state
3. Analyze the codebase to understand tech stack, conventions, patterns
4. Call this tool with updates to apply

**Expected content sections:**
- Project Description: What the project does
- Tech Stack: Languages, frameworks, databases, etc.
- Conventions: Coding standards, naming conventions, patterns
- Architecture: High-level structure, key modules
- Testing: Testing approach and requirements

**Example prompt to trigger this workflow:**
"Please read openspec/project.md and help me fill it out with details about my project, tech stack, and conventions"`,
    {
      content: z.string()
        .describe('Complete markdown content for project.md'),
      
      merge: z.boolean().default(false)
        .describe('If true, merge with existing content instead of replacing'),
      
      section: z.string().optional()
        .describe('If provided with merge=true, only update this section (e.g., "Tech Stack")'),
    },
    async (args) => {
      try {
        const projectPath = path.join(getOpenSpecDir(pathConfig), 'project.md');
        
        let finalContent: string;
        
        if (args.merge) {
          let existing = '';
          try {
            existing = await fs.readFile(projectPath, 'utf-8');
          } catch {}

          if (args.section && existing) {
            // Update only the specified section
            finalContent = updateSection(existing, args.section, args.content);
          } else if (existing) {
            // Merge: append new content
            finalContent = `${existing}\n\n---\n\n## Updates\n\n${args.content}`;
          } else {
            finalContent = args.content;
          }
        } else {
          // Replace entirely
          finalContent = args.content;
        }

        await fs.mkdir(path.dirname(projectPath), { recursive: true });
        await fs.writeFile(projectPath, finalContent);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              path: projectPath,
              mode: args.merge ? (args.section ? `merged section: ${args.section}` : 'merged') : 'replaced',
              contentLength: finalContent.length,
              nextSteps: [
                'Read openspec://project to verify the updates',
                'Use openspec-propose prompt to create changes based on project context'
              ]
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error updating project context: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
}

/**
 * Updates a specific section in markdown content.
 */
function updateSection(existing: string, sectionName: string, newContent: string): string {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(## ${escaped}\\n)([\\s\\S]*?)(?=\\n## |\\n# |$)`, 'i');
  
  const match = existing.match(pattern);
  
  if (match) {
    return existing.replace(pattern, `## ${sectionName}\n\n${newContent}\n\n`);
  } else {
    return `${existing}\n\n## ${sectionName}\n\n${newContent}`;
  }
}
```

---

## MCP Prompts Implementation

Prompts provide guided workflows that combine resources and tools. **Each prompt instructs the AI to first read the instructions and project resources before proceeding.**

### Prompt 1: `openspec-propose` - Create Change Proposal

```typescript
// src/mcp/prompts/propose-prompt.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PathConfig } from '../utils/path-resolver.js';

export function registerProposePrompt(server: McpServer, pathConfig: PathConfig): void {
  server.prompt(
    'openspec-propose',
    'Guided workflow for creating a new OpenSpec change proposal. Equivalent to /openspec:proposal slash command.',
    {
      description: z.string().describe('What you want to build or change'),
      scope: z.enum(['new-capability', 'modify-existing', 'refactor', 'fix']).optional(),
    },
    async ({ description, scope }) => {
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `# OpenSpec Proposal Workflow

## Your Task
Create a new OpenSpec change proposal for: "${description}"
${scope ? `Scope: ${scope}` : ''}

## Step 1: Load Context (REQUIRED)

**You MUST read these resources before proceeding:**

1. Read \`openspec://instructions\` - Understand the OpenSpec workflow and conventions
2. Read \`openspec://project\` - Understand the project's tech stack, conventions, and architecture
3. Read \`openspec://specs\` - See existing specifications to avoid conflicts
4. Read \`openspec://changes\` - See active changes to avoid duplicates

## Step 2: Analyze the Request

Based on the context you loaded:
- Identify which existing specs might be affected
- Determine if this conflicts with any active changes
- Consider the project's conventions and architecture

## Step 3: Create the Proposal

Choose a unique change-id (kebab-case, verb-led):
- \`add-*\` for new features (e.g., add-user-auth)
- \`update-*\` for modifications (e.g., update-payment-flow)
- \`remove-*\` for deprecations
- \`refactor-*\` for restructuring
- \`fix-*\` for bug fixes

Create the change directory structure manually or describe what files to create:
- \`openspec/changes/<change-id>/proposal.md\` - The proposal document
- \`openspec/changes/<change-id>/tasks.md\` - Task breakdown
- \`openspec/changes/<change-id>/design.md\` - Technical design (optional)
- \`openspec/changes/<change-id>/specs/<capability>/spec.md\` - Spec deltas

## Step 4: Validate

Use the \`validate\` tool to check the proposal:
- \`validate\` with name=<change-id> and type='change'

Begin by reading the required resources.`,
          },
        }],
      };
    }
  );
}
```

### Prompt 2: `openspec-apply` - Implement Change

```typescript
// src/mcp/prompts/apply-prompt.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PathConfig } from '../utils/path-resolver.js';

export function registerApplyPrompt(server: McpServer, pathConfig: PathConfig): void {
  server.prompt(
    'openspec-apply',
    'Guided workflow for implementing an approved OpenSpec change. Equivalent to /openspec:apply slash command.',
    {
      changeId: z.string().describe('The change identifier to implement'),
    },
    async ({ changeId }) => {
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `# OpenSpec Implementation Workflow

## Implement Change: ${changeId}

## Step 1: Load Context (REQUIRED)

**You MUST read these resources before proceeding:**

1. Read \`openspec://instructions\` - Understand the implementation workflow
2. Read \`openspec://project\` - Understand the project's conventions and architecture
3. Read \`openspec://changes/${changeId}\` - Load the full change details (proposal, tasks, design)

## Step 2: Understand the Scope

From the change resources:
- Review proposal.md to understand what's being built and why
- Review design.md (if present) for technical decisions
- Review tasks.md to see the implementation checklist
- Note which specifications are affected

## Step 3: Implement Tasks Sequentially

Follow the tasks in order:
1. Read the current task description
2. Implement the required changes
3. Update tasks.md to mark the task complete (change \`[ ]\` to \`[x]\`)
4. Move to the next task

Keep progress synchronized - update the task status as you complete each item.

## Step 4: Apply Spec Changes

For each spec delta in the change:
- Review the ADDED, MODIFIED, and REMOVED requirements
- Ensure your implementation matches the specification
- Verify scenarios are testable

## Step 5: Validate Continuously

After completing significant work:
- Use \`validate\` tool with name="${changeId}" and type='change'
- Fix any errors or warnings before proceeding

## Step 6: Complete

When all tasks are done:
- Verify all task checkboxes are marked \`[x]\`
- Run final validation
- The change is ready for the archive workflow

Begin by reading the required resources.`,
          },
        }],
      };
    }
  );
}
```

### Prompt 3: `openspec-archive` - Archive Completed Change

```typescript
// src/mcp/prompts/archive-prompt.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PathConfig } from '../utils/path-resolver.js';

export function registerArchivePrompt(server: McpServer, pathConfig: PathConfig): void {
  server.prompt(
    'openspec-archive',
    'Guided workflow for archiving a completed change. Equivalent to /openspec:archive slash command.',
    {
      changeId: z.string().describe('The change identifier to archive'),
    },
    async ({ changeId }) => {
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `# OpenSpec Archive Workflow

## Archive Change: ${changeId}

## Step 1: Load Context (REQUIRED)

**You MUST read these resources before proceeding:**

1. Read \`openspec://instructions\` - Understand the archive workflow
2. Read \`openspec://project\` - Understand project conventions
3. Read \`openspec://changes/${changeId}\` - Verify the change is complete

## Step 2: Verify Completion

Use the \`show\` tool to check the change:
- \`show\` with name="${changeId}" and type='change'

Verify:
- All tasks are marked complete (\`[x]\`)
- Progress shows 100%
- All required files are present

## Step 3: Run Final Validation

Use the \`validate\` tool:
- \`validate\` with name="${changeId}" and type='change' and strict=true

Ensure there are no errors or warnings.

## Step 4: Preview Archive

Use the \`archive\` tool with dryRun=true:
- \`archive\` with name="${changeId}" and dryRun=true

Review the operations that will be performed.

## Step 5: Execute Archive

Use the \`archive\` tool:
- \`archive\` with name="${changeId}" and updateSpecs=true and dryRun=false

This will:
- Move the change to \`changes/archive/YYYY-MM-DD-${changeId}/\`
- Merge spec deltas into the main \`specs/\` directory

## Step 6: Post-Archive Validation

Use the \`validate\` tool to verify all specs:
- \`validate\` with type='all'

Confirm the merged specs are valid.

## Step 7: Report Completion

- Note the archive location
- Confirm specs were updated successfully
- Remind to commit changes to version control

Begin by reading the required resources.`,
          },
        }],
      };
    }
  );
}
```

---

## MCP Client Configuration

```json
{
  "mcpServers": {
    "openspec": {
      "command": "openspec",
      "args": ["mcp"],
      "env": {
        "OPENSPEC_ROOT": "/home/user/.openspec",
        "OPENSPEC_AUTO_PROJECT_ROOT": "true"
      }
    }
  }
}
```

---

## CLI to MCP Mapping Summary

| CLI Command | MCP Tool | MCP Resource |
|-------------|----------|--------------|
| `openspec init [path]` | `init` | - |
| `openspec list` | `list` | `openspec://changes` |
| `openspec list --specs` | `list` (specs=true) | `openspec://specs` |
| `openspec show [item]` | `show` | `openspec://changes/{id}`, `openspec://specs/{cap}` |
| `openspec validate [item]` | `validate` | - |
| `openspec archive [change]` | `archive` | `openspec://archive` |
| `openspec view` | *(not exposed - interactive)* | - |
| `openspec update` | *(not exposed - handled by MCP server update)* | - |
| *(read AGENTS.md)* | - | `openspec://instructions` |
| *(read project.md)* | - | `openspec://project` |
| *(update project.md)* | `update_project_context` | - |
| `/openspec:proposal` | - | `openspec-propose` prompt |
| `/openspec:apply` | - | `openspec-apply` prompt |
| `/openspec:archive` | - | `openspec-archive` prompt |

---

## Key Design Decisions

### Why Resources + Tools (not just Tools)

MCP Resources provide **read-only context** that AI assistants can fetch without side effects:
- Efficient context loading (fetch once, use many times)
- Clear separation between reading (resources) and writing (tools)
- Standard MCP pattern followed by other servers
- **Prompts explicitly require reading resources first** to ensure AI has proper context

### Why 6 Tools Match the CLI

Each tool maps directly to an OpenSpec CLI command:
- `init` → `openspec init`
- `list` → `openspec list` (with --specs flag)
- `show` → `openspec show`
- `validate` → `openspec validate`
- `archive` → `openspec archive`
- `update_project_context` → *(new, for maintaining project.md)*

The `view` command is interactive and not suitable for MCP. The `update` command is handled by updating the MCP server itself.

### Why `update_project_context` as a Tool

The project.md file needs to be populated with project-specific information. This tool enables AI assistants to:
1. Read `openspec://instructions` for guidance
2. Read `openspec://project` to see current state
3. Analyze the codebase to understand conventions
4. Write updates via the tool

This supports the workflow triggered by:
```
"Please read openspec/project.md and help me fill it out
with details about my project, tech stack, and conventions"
```

### Why Prompts Load Resources First

Every prompt explicitly instructs the AI to:
1. Read `openspec://instructions` - workflow guidance
2. Read `openspec://project` - project context and conventions
3. Read relevant change/spec resources

This ensures the AI always has proper context before taking action, leading to better-informed proposals and implementations.

### Why Path Resolution with Environment Variables

Different teams have different preferences:
- **Default** (no env vars): Specs in project directory - simple, self-contained
- **Fixed root**: Centralized spec storage - shared across projects
- **Auto-project-root**: Centralized but organized by project path - best of both worlds

