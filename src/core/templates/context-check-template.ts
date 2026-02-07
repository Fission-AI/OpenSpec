export const contextCheckTemplate = `**Goal**
Validate that the project's agent instruction file (CLAUDE.md or AGENTS.md at project root) contains adequate context for AI assistants to work effectively with this codebase.

**Detection Strategy**
Check which agent file exists by examining the context currently available to you (your "memory"). Do NOT read files from disk—use only what has already been loaded into your context. If neither CLAUDE.md nor AGENTS.md appears to be in your current context, inform the user that no agent instruction file is currently loaded and suggest they open it in their editor or add it to the conversation.

**Required Context Properties**
The agent file MUST contain these sections with meaningful, project-specific content:

1. **Purpose** - Project goals and objectives (what the project does and why it exists)
2. **Domain Context** - Domain-specific knowledge AI assistants need (business rules, terminology, concepts)
3. **Tech Stack** - Technologies and frameworks used (languages, libraries, tools)
4. **Project Non-Obvious Conventions** - Must include ALL of these subsections:
   - Code Style (formatting rules, naming conventions)
   - Architecture Patterns (architectural decisions and patterns)
   - Testing Strategy (testing approach and requirements)
   - Git Workflow (optional - branching strategy and commit conventions)
5. **Important Constraints** - Technical, business, or regulatory constraints
6. **External Dependencies** - Key external services, APIs, or systems

**Validation Criteria**
For each required property, classify as:
- **Missing**: Section header absent or contains only placeholder text like \`[...]\`, \`[Describe...]\`, \`[Add...]\`, or \`[List...]\`
- **Sub-optimal**: Section exists but is too brief (< 20 words) or generic/vague
- **Good**: Section has meaningful, project-specific content (≥ 20 words)

**Validation Process**
1. Identify which agent file is in your current context (CLAUDE.md or AGENTS.md)
2. For each required property, check if it exists and classify its quality
3. Report findings clearly:
   - List properties that are **missing** or **sub-optimal**
   - For each issue, explain what should be included
   - Summarize which properties are **good**

**Offering Exploration**
If any properties are missing or sub-optimal:
1. Explain what needs improvement
2. Ask: "Would you like me to explore your codebase to gather this context and propose updates to [CLAUDE.md|AGENTS.md]?"
3. Wait for user confirmation before proceeding

**If User Accepts Exploration**
1. Systematically explore the codebase:
   - **Tech Stack**: Check package.json, requirements.txt, go.mod, Cargo.toml, pom.xml, etc.
   - **Architecture Patterns**: Examine project structure, folder organization, common code patterns, framework usage
   - **Testing Strategy**: Look at test files, test frameworks (jest, pytest, etc.), test organization
   - **Code Style**: Check for .prettierrc, .eslintrc, or other config files; examine actual code for conventions
   - **Purpose**: Infer from README, package.json description, comments
   - **Domain Context**: Identify from code comments, type definitions, business logic
   - **Important Constraints**: Look for security patterns, performance considerations, compliance notes
   - **External Dependencies**: Identify external API calls, third-party services, database connections
2. Draft content for each missing/sub-optimal property
3. Present the proposed content to the user for review
4. Ask: "Would you like me to write these additions to [CLAUDE.md|AGENTS.md]?"
5. Wait for confirmation before modifying the file

**If User Declines Exploration**
Provide manual guidance:
- Explain what each missing/sub-optimal property should contain
- Give examples of good content for each property
- Suggest they populate the sections manually

**Writing Confirmed Content**
When user confirms:
1. If the property section doesn't exist, add it
2. If the property section exists but is sub-optimal, replace it with the improved content
3. Preserve existing good content—only update what needs improvement
4. Use the Edit tool to make precise updates
5. Confirm completion and show what was updated

**Example Validation Report**
\`\`\`
✓ Validated context in CLAUDE.md

Missing properties (3):
- Purpose: Should describe project goals and what it does
- Domain Context: Should include business rules, terminology, concepts
- Important Constraints: Should list technical, business, or regulatory constraints

Sub-optimal properties (2):
- Tech Stack: Only 8 words - needs more detail about frameworks and tools
- Code Style: Generic description - needs project-specific conventions

Good properties (2):
- Architecture Patterns: Well-documented with clear explanations
- Testing Strategy: Comprehensive with examples

Would you like me to explore your codebase to gather this context and propose updates to CLAUDE.md?
\`\`\`

**Important Notes**
- Work only with the agent file currently in your context—do NOT read files from disk
- Never modify files without explicit user confirmation
- Present all proposed content for review before writing
- Focus on project-specific details, not generic advice
- Keep tone helpful and educational`;
