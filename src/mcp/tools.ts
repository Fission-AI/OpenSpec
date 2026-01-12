import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { listChanges, listSpecs } from '../core/list.js';
import { ChangeCommand } from '../commands/change.js';
import { SpecCommand } from '../commands/spec.js';
import { ArchiveCommand } from '../core/archive.js';
import { Validator } from '../core/validation/validator.js';
import { resolveOpenSpecDir } from '../core/path-resolver.js';
import { runInit } from '../core/init-logic.js';
import { runUpdate } from '../core/update-logic.js';
import { runArchive } from '../core/archive-logic.js';
import { runCreateChange } from '../core/change-logic.js';
import { getViewData } from '../core/view-logic.js';
import path from 'path';

export function registerTools(server: FastMCP) {
    server.addTool({
        name: "openspec_init",
        description: "Initialize OpenSpec in the current project.",
        parameters: z.object({
            tools: z.array(z.string()).optional().describe("AI tools to configure"),
            shouldMigrate: z.boolean().optional().default(true).describe("Whether to auto-migrate legacy openspec/ directory")
        }),
        execute: async (args) => {
            try {
                const result = await runInit(process.cwd(), args);
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error initializing: ${error.message}` }]
                };
            }
        }
    });

    server.addTool({
        name: "openspec_update",
        description: "Update OpenSpec instruction files and slash commands.",
        parameters: z.object({}),
        execute: async () => {
            try {
                const result = await runUpdate(process.cwd());
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error updating: ${error.message}` }]
                };
            }
        }
    });

    server.addTool({
        name: "openspec_view",
        description: "Get dashboard data for specs and changes.",
        parameters: z.object({}),
        execute: async () => {
            try {
                const data = await getViewData(process.cwd());
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error getting view data: ${error.message}` }]
                };
            }
        }
    });

    server.addTool({
        name: "openspec_create_change",
        description: "Scaffold a new OpenSpec change directory.",
        parameters: z.object({
            name: z.string().describe("Kebab-case name of the change"),
            schema: z.string().optional().default("spec-driven").describe("Workflow schema to use")
        }),
        execute: async (args) => {
            try {
                const result = await runCreateChange(process.cwd(), args.name, { schema: args.schema });
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error creating change: ${error.message}` }]
                };
            }
        }
    });

    server.addTool({
        name: "openspec_list_changes",
        description: "List active OpenSpec changes.",
        parameters: z.object({
            sort: z.enum(['recent', 'name']).optional().default('recent'),
        }),
        execute: async (args) => {
            try {
                const changes = await listChanges(process.cwd(), args.sort);
                return {
                    content: [{ type: "text", text: JSON.stringify(changes, null, 2) }]
                };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error listing changes: ${error.message}` }]
                };
            }
        }
    });

    server.addTool({
        name: "openspec_list_specs",
        description: "List OpenSpec specifications.",
        parameters: z.object({}),
        execute: async () => {
            try {
                const specs = await listSpecs(process.cwd());
                return {
                    content: [{ type: "text", text: JSON.stringify(specs, null, 2) }]
                };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error listing specs: ${error.message}` }]
                };
            }
        }
    });

    server.addTool({
        name: "openspec_show_change",
        description: "Show details of a change proposal.",
        parameters: z.object({
            name: z.string().describe("Name of the change"),
            format: z.enum(['json', 'markdown']).optional().default('json')
        }),
        execute: async (args) => {
            try {
                const cmd = new ChangeCommand();
                if (args.format === 'markdown') {
                    const content = await cmd.getChangeMarkdown(args.name);
                    return { content: [{ type: "text", text: content }] };
                }
                const data = await cmd.getChangeJson(args.name);
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error showing change: ${error.message}` }]
                };
            }
        }
    });

    server.addTool({
        name: "openspec_show_spec",
        description: "Show details of a specification.",
        parameters: z.object({
            id: z.string().describe("ID of the spec"),
            format: z.enum(['json', 'markdown']).optional().default('json')
        }),
        execute: async (args) => {
            try {
                const cmd = new SpecCommand();
                if (args.format === 'markdown') {
                    const content = await cmd.getSpecMarkdown(args.id);
                    return { content: [{ type: "text", text: content }] };
                }
                const data = await cmd.getSpecJson(args.id);
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error showing spec: ${error.message}` }]
                };
            }
        }
    });

    server.addTool({
        name: "openspec_validate_change",
        description: "Validate a change proposal.",
        parameters: z.object({
            name: z.string().describe("Name of the change"),
            strict: z.boolean().optional()
        }),
        execute: async (args) => {
            try {
                const openspecPath = await resolveOpenSpecDir(process.cwd());
                const changeDir = path.join(openspecPath, 'changes', args.name);
                const validator = new Validator(args.strict);
                const report = await validator.validateChangeDeltaSpecs(changeDir);
                return {
                    content: [{ type: "text", text: JSON.stringify(report, null, 2) }]
                };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error validating change: ${error.message}` }]
                };
            }
        }
    });

    server.addTool({
        name: "openspec_archive_change",
        description: "Archive a completed change and update main specs.",
        parameters: z.object({
            name: z.string().describe("Name of the change"),
            skipSpecs: z.boolean().optional().default(false),
            noValidate: z.boolean().optional().default(false),
        }),
        execute: async (args) => {
            try {
                const result = await runArchive(args.name, { 
                    skipSpecs: args.skipSpecs, 
                    noValidate: args.noValidate 
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error archiving change: ${error.message}` }]
                };
            }
        }
    });
}
