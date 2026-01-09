import { FastMCP } from 'fastmcp';
import { resolveOpenSpecDir } from '../core/path-resolver.js';
import path from 'path';
import fs from 'fs/promises';

export function registerResources(server: FastMCP) {
    server.addResource({
        uriTemplate: "openspec://changes/{name}/proposal",
        name: "Change Proposal",
        description: "The proposal.md file for a change",
        // @ts-ignore
        load: async (variables: any) => {
            const openspecPath = await resolveOpenSpecDir(process.cwd());
            const filePath = path.join(openspecPath, 'changes', variables.name, 'proposal.md');
            const text = await fs.readFile(filePath, 'utf-8');
            return {
                content: [{ uri: `openspec://changes/${variables.name}/proposal`, text }]
            };
        }
    });

    server.addResource({
        uriTemplate: "openspec://changes/{name}/tasks",
        name: "Change Tasks",
        description: "The tasks.md file for a change",
        // @ts-ignore
        load: async (variables: any) => {
            const openspecPath = await resolveOpenSpecDir(process.cwd());
            const filePath = path.join(openspecPath, 'changes', variables.name, 'tasks.md');
            const text = await fs.readFile(filePath, 'utf-8');
            return {
                content: [{ uri: `openspec://changes/${variables.name}/tasks`, text }]
            };
        }
    });

    server.addResource({
        uriTemplate: "openspec://specs/{id}",
        name: "Specification",
        description: "The spec.md file for a capability",
        // @ts-ignore
        load: async (variables: any) => {
            const openspecPath = await resolveOpenSpecDir(process.cwd());
            const filePath = path.join(openspecPath, 'specs', variables.id, 'spec.md');
            const text = await fs.readFile(filePath, 'utf-8');
            return {
                content: [{ uri: `openspec://specs/${variables.id}`, text }]
            };
        }
    });
}
