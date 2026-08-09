/**
 * Shared schema-selection guidance for change-creation workflows.
 *
 * Interpolated into new, propose, and ff skill/command instructions so every
 * generated entry point uses the same discovery and confirmation protocol.
 */
export const SCHEMA_SELECTION_GUIDANCE = `2. **Select and confirm the workflow schema**

   Before creating the change, determine the schema as follows:

   - If the user explicitly names a schema, use it and treat that choice as confirmed. If they also explicitly ask you to confirm it, stop and wait for confirmation.
   - Otherwise, run \`openspec schemas --json\` and inspect each schema's \`name\`, \`description\`, and \`artifacts\`.
   - Use \`description\` as the authority for matching the request. Use \`name\` and \`artifacts\` only to identify, display, and explain candidates.
   - Select a schema only when exactly one is a clear match.
     - Normally, present the recommendation and a concise reason, then stop and wait for confirmation.
     - Skip that confirmation only when the user's current request or the selected schema's description clearly and unambiguously says no further confirmation is needed.
     - If the user explicitly asks for confirmation, always wait even if the selected schema's description waives it.
   - If no unique recommendation is possible, stop before creating the change, list the relevant candidates with their descriptions, and ask the user to choose. Never silently use the default schema.
   - If the user rejects a recommendation, stop and list the relevant candidates so they can choose.
   - If \`openspec schemas --json\` fails, cannot be parsed, or returns no schemas, stop and report the problem. Do not fall back to the default.
   - After the user selects a listed candidate, treat that choice as confirmed.

   Do not continue until one schema is confirmed or confirmation has been clearly waived. Use the selected schema name in the create command below.`;
