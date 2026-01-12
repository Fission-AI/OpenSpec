import { FastMCP } from 'fastmcp';
import { 
    PROPOSAL_GUARDRAILS, PROPOSAL_STEPS, PROPOSAL_REFERENCES,
    BASE_GUARDRAILS, APPLY_STEPS, APPLY_REFERENCES,
    ARCHIVE_STEPS, ARCHIVE_REFERENCES
} from '../core/templates/prompts.js';

function toMcpInstructions(text: string): string {
    return text
        .replace(/openspec list --specs/g, 'openspec_list_specs')
        .replace(/openspec list/g, 'openspec_list_changes')
        .replace(/openspec show ([^ ]+) --type spec/g, 'openspec_show_spec(id: "$1")')
        .replace(/openspec show ([^ ]+) --json --deltas-only/g, 'openspec_show_change(name: "$1")')
        .replace(/openspec show ([^ ]+)/g, 'openspec_show_change(name: "$1")')
        .replace(/openspec validate ([^ ]+) --strict/g, 'openspec_validate_change(name: "$1", strict: true)')
        .replace(/openspec validate --strict/g, 'openspec_validate_change(strict: true)')
        .replace(/openspec archive ([^ ]+) --yes/g, 'openspec_archive_change(name: "$1")');
}

export function registerPrompts(server: FastMCP) {
    server.addPrompt({
        name: "openspec_proposal",
        description: "Scaffold a new OpenSpec change proposal",
        load: async () => ({
            messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: toMcpInstructions(`${PROPOSAL_GUARDRAILS}\n\n${PROPOSAL_STEPS}\n\n${PROPOSAL_REFERENCES}`)
                }
            }]
        })
    });

    server.addPrompt({
        name: "openspec_apply",
        description: "Apply an OpenSpec change",
        load: async () => ({
            messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: toMcpInstructions(`${BASE_GUARDRAILS}\n\n${APPLY_STEPS}\n\n${APPLY_REFERENCES}`)
                }
            }]
        })
    });

    server.addPrompt({
        name: "openspec_archive",
        description: "Archive an OpenSpec change",
        load: async () => ({
            messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: toMcpInstructions(`${BASE_GUARDRAILS}\n\n${ARCHIVE_STEPS}\n\n${ARCHIVE_REFERENCES}`)
                }
            }]
        })
    });
}
