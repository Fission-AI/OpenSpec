import { promises as fs } from 'fs';
import path from 'path';
export async function getActiveChangeIds(root = process.cwd()) {
    const changesPath = path.join(root, 'openspec', 'changes');
    try {
        const entries = await fs.readdir(changesPath, { withFileTypes: true });
        const result = [];
        for (const entry of entries) {
            if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'archive')
                continue;
            const proposalPath = path.join(changesPath, entry.name, 'proposal.md');
            try {
                await fs.access(proposalPath);
                result.push(entry.name);
            }
            catch {
                // skip directories without proposal.md
            }
        }
        return result.sort();
    }
    catch {
        return [];
    }
}
export async function getSpecIds(root = process.cwd()) {
    const specsPath = path.join(root, 'openspec', 'specs');
    const result = [];
    try {
        const entries = await fs.readdir(specsPath, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory() || entry.name.startsWith('.'))
                continue;
            const specFile = path.join(specsPath, entry.name, 'spec.md');
            try {
                await fs.access(specFile);
                result.push(entry.name);
            }
            catch {
                // ignore
            }
        }
    }
    catch {
        // ignore
    }
    return result.sort();
}
//# sourceMappingURL=item-discovery.js.map