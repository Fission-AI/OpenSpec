import { FastMCP } from 'fastmcp';
import { 
    PROPOSAL_GUARDRAILS, PROPOSAL_STEPS, PROPOSAL_REFERENCES,
    BASE_GUARDRAILS, APPLY_STEPS, APPLY_REFERENCES,
    ARCHIVE_STEPS, ARCHIVE_REFERENCES
} from '../core/templates/prompts.js';

export function registerPrompts(server: FastMCP) {
    server.addPrompt({
        name: "openspec_proposal",
        description: "Scaffold a new OpenSpec change proposal",
        load: async () => ({
            messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: `${PROPOSAL_GUARDRAILS}\n\n${PROPOSAL_STEPS}\n\n${PROPOSAL_REFERENCES}`
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
                    text: `${BASE_GUARDRAILS}\n\n${APPLY_STEPS}\n\n${APPLY_REFERENCES}`
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
                    text: `${BASE_GUARDRAILS}\n\n${ARCHIVE_STEPS}\n\n${ARCHIVE_REFERENCES}`
                }
            }]
        })
    });
}
