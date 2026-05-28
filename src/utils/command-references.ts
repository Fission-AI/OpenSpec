/**
 * Command Reference Utilities
 *
 * Utilities for transforming command references to tool-specific formats.
 */

/**
 * Transforms colon-based command references to hyphen-based format.
 * Converts `/opsx:` patterns to `/opsx-` for tools that use hyphen syntax.
 *
 * @param text - The text containing command references
 * @returns Text with command references transformed to hyphen format
 *
 * @example
 * transformToHyphenCommands('/opsx:new') // returns '/opsx-new'
 * transformToHyphenCommands('Use /opsx:apply to implement') // returns 'Use /opsx-apply to implement'
 */
export function transformToHyphenCommands(text: string): string {
  return text.replace(/\/opsx:/g, '/opsx-');
}

/**
 * Rewrites generated workflow instructions that name Claude-style tools into
 * runtime-neutral instructions Codex can follow without attempting missing tools.
 */
export function transformCodexRuntimeToolReferences(text: string): string {
  return text
    .replace(
      /Use the \*\*AskUserQuestion tool\*\* \(open-ended, no preset options\) to ask:/g,
      'Ask the user in chat and wait for their reply:'
    )
    .replace(
      /Use \*\*AskUserQuestion tool\*\* with multi-select to let user choose changes:/g,
      'Ask the user in chat to choose one or more changes from a concise numbered list:'
    )
    .replace(
      /Use \*\*AskUserQuestion tool\*\* with a single confirmation:/g,
      'Ask the user in chat for a single confirmation:'
    )
    .replace(
      /Use the \*\*TodoWrite tool\*\* to track progress through the artifacts\./g,
      "Track progress using Codex's native plan/checklist mechanism if available; otherwise keep a concise visible checklist."
    )
    .replace(
      /[Uu]se \*\*AskUserQuestion tool\*\*/g,
      (match) =>
        match.startsWith('Use')
          ? 'Ask the user in chat and wait for their reply'
          : 'ask the user in chat and wait for their reply'
    )
    .replace(
      /[Uu]se the \*\*AskUserQuestion tool\*\*/g,
      (match) =>
        match.startsWith('Use')
          ? 'Ask the user in chat and wait for their reply'
          : 'ask the user in chat and wait for their reply'
    )
    .replace(
      /[Uu]se \*\*TodoWrite tool\*\*/g,
      (match) =>
        match.startsWith('Use')
          ? "Use Codex's native plan/checklist mechanism if available"
          : "use Codex's native plan/checklist mechanism if available"
    )
    .replace(
      /[Uu]se the \*\*TodoWrite tool\*\*/g,
      (match) =>
        match.startsWith('Use')
          ? "Use Codex's native plan/checklist mechanism if available"
          : "use Codex's native plan/checklist mechanism if available"
    )
    .replace(
      /use Task tool \(subagent_type: "general-purpose", prompt: "Use Skill tool to invoke openspec-sync-specs for change '<name>'\. Delta spec analysis: <include the analyzed delta spec summary>"\)/g,
      "ask the agent to invoke openspec-sync-specs for change '<name>' with the analyzed delta spec summary"
    )
    .replace(
      /Use Task tool \(subagent_type: "general-purpose", prompt: "([^"]+)"\)/g,
      'Use the agent native delegation or skill mechanism if available; otherwise perform this step directly: $1'
    );
}
