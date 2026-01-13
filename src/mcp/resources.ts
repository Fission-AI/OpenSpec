import { FastMCP } from 'fastmcp';
import { resolveOpenSpecDir } from '../core/path-resolver.js';
import path from 'path';
import fs from 'fs/promises';

function assertSafePathSegment(value: unknown, label: string): string {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Invalid ${label}`);
    }
    // Disallow traversal and path separators (both posix + win)
    if (value === '.' || value === '..' || value.includes('..') || /[\\/]/u.test(value)) {
        throw new Error(`Invalid ${label}`);
    }
    return value;
}

export function registerResources(server: FastMCP) {
    server.addResourceTemplate({
        uriTemplate: "openspec://changes/{name}/proposal",
        name: "Change Proposal",
        description: "The proposal.md file for a change",
        arguments: [{ name: "name", description: "Name of the change", required: true }],
        // @ts-expect-error - variables type mismatch in fastmcp
        load: async (variables: any) => {
            const openspecPath = await resolveOpenSpecDir(process.cwd());
            const name = assertSafePathSegment(variables?.name, 'change name');
            const filePath = path.join(openspecPath, 'changes', name, 'proposal.md');
            
            // Final safety check: ensure resolved path is within openspecPath
            if (!path.resolve(filePath).startsWith(path.resolve(openspecPath))) {
                throw new Error("Unauthorized path access");
            }

            const text = await fs.readFile(filePath, 'utf-8');
            return {
                content: [{ uri: `openspec://changes/${name}/proposal`, text }]
            };
        }
    });

    server.addResourceTemplate({
        uriTemplate: "openspec://changes/{name}/tasks",
        name: "Change Tasks",
        description: "The tasks.md file for a change",
        arguments: [{ name: "name", description: "Name of the change", required: true }],
        // @ts-expect-error - variables type mismatch in fastmcp
        load: async (variables: any) => {
            const openspecPath = await resolveOpenSpecDir(process.cwd());
            const name = assertSafePathSegment(variables?.name, 'change name');
            const filePath = path.join(openspecPath, 'changes', name, 'tasks.md');

            // Final safety check: ensure resolved path is within openspecPath
            if (!path.resolve(filePath).startsWith(path.resolve(openspecPath))) {
                throw new Error("Unauthorized path access");
            }

            const text = await fs.readFile(filePath, 'utf-8');
            return {
                content: [{ uri: `openspec://changes/${name}/tasks`, text }]
            };
        }
    });

    server.addResourceTemplate({
        uriTemplate: "openspec://specs/{id}",
        name: "Specification",
        description: "The spec.md file for a capability",
        arguments: [{ name: "id", description: "ID of the spec", required: true }],
        // @ts-expect-error - variables type mismatch in fastmcp
        load: async (variables: any) => {
            const openspecPath = await resolveOpenSpecDir(process.cwd());
            const id = assertSafePathSegment(variables?.id, 'spec id');
            const filePath = path.join(openspecPath, 'specs', id, 'spec.md');

            // Final safety check: ensure resolved path is within openspecPath
            if (!path.resolve(filePath).startsWith(path.resolve(openspecPath))) {
                throw new Error("Unauthorized path access");
            }

            const text = await fs.readFile(filePath, 'utf-8');
            return {
                content: [{ uri: `openspec://specs/${id}`, text }]
            };
        }
    });
}