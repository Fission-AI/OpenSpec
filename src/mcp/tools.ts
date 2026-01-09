import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { listChanges, listSpecs } from '../core/list.js';
import { ChangeCommand } from '../commands/change.js';
import { Validator } from '../core/validation/validator.js';
import { resolveOpenSpecDir } from '../core/path-resolver.js';
import path from 'path';

export function registerTools(server: FastMCP) {
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
}
