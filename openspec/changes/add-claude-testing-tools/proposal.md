# Add Claude Code Testing Tools

## Why

Development teams need a systematic way to test and evaluate Claude Code prompts and instructions to:
- Understand how different instructions affect Claude's responses
- Compare instruction variants to find optimal approaches
- Track Claude's tool usage patterns and reasoning steps
- Create reproducible test cases for prompt engineering
- Build a simple evaluation system for local development

Currently, testing Claude Code requires manual interaction through the CLI, making it difficult to:
- Compare multiple instruction variants systematically
- Track metrics and patterns across tests
- Reproduce specific test scenarios
- Analyze response characteristics programmatically

## What Changes

### New Testing Infrastructure
- **TypeScript-based testing CLI** that wraps the `claude` command
  - Executes Claude Code in headless mode (no API key required)
  - Captures and parses JSON responses
  - Supports single tests, comparisons, and multi-turn conversations
  - Saves results for analysis and comparison

### Core Features
- **Single Test Mode**: Test individual prompts with optional instructions
  ```bash
  pnpm test:claude --prompt "Write a function" --name "test1"
  ```

- **Comparison Mode**: Test same prompt with multiple instruction variants
  ```bash
  pnpm test:claude compare \
    --prompt "Create API" \
    --variants "Be verbose" "Be concise" "Focus on security"
  ```

- **Conversation Mode**: Multi-turn conversations for complex scenarios
  ```bash
  pnpm test:claude conversation \
    --turns "Create model" "Add validation" "Add tests"
  ```

- **Analysis Capabilities**:
  - Response text extraction and metrics
  - Token usage and cost tracking
  - Execution time measurement
  - Session ID tracking for resumption
  - Tool usage pattern analysis (when available)
  - Reasoning step extraction

### File Structure
```
src/testing/              # Development testing tools (not production code)
├── claude-tester.ts      # Main CLI entry point
├── types.ts              # TypeScript interfaces
└── lib/
    ├── executor.ts       # Claude CLI execution wrapper
    ├── analyzer.ts       # Response analysis utilities
    └── reporter.ts       # Result reporting and formatting

test/claude-tests/        # Example test suites
├── example-prompts.ts    # Basic prompt examples
└── instruction-variants.ts # Instruction comparison examples

test-results/            # Git-ignored output directory
└── *.json              # JSON test results
```

### Integration Approach
- **Leverage existing package.json** - No new package or dependencies
- **Use existing dependencies** - commander, chalk, ora already available
- **Follow project patterns** - Consistent with existing OpenSpec structure
- **Non-invasive** - Testing tools isolated in `src/testing/` directory
- **Development-only** - Not included in production builds

### Command Line Interface
```bash
# Main commands
pnpm test:claude [options]           # Run single test
pnpm test:claude compare [options]   # Compare variants
pnpm test:claude conversation [options] # Multi-turn test

# Options
--prompt, -p <text>         # Prompt to test
--prompt-file, -f <file>    # Load prompt from file
--instructions, -i <text>   # Custom instructions
--name, -n <name>          # Test name for results
--output-dir, -o <dir>     # Results directory (default: ./test-results)
--model <model>            # Claude model (sonnet, opus, etc.)
--allowed-tools <tools>    # Restrict tool usage
--permission-mode <mode>   # Permission mode (acceptEdits, plan, etc.)

# Comparison options
--variants <texts...>      # Instruction variants to compare

# Conversation options  
--turns <prompts...>       # Conversation turns
--session-id <id>         # Resume specific session
```

### Output Format
Test results saved as JSON with:
- Test metadata (name, timestamp, prompt, instructions)
- Full response text
- Response metrics (length, tokens, cost)
- Execution timing
- Session information
- Error tracking

Example output structure:
```json
{
  "test_name": "api_test",
  "timestamp": "2025-09-01T10:30:00Z",
  "prompt": "Create a REST API",
  "instructions": "Be concise",
  "response": "...",
  "metrics": {
    "response_length": 1250,
    "tokens": { "input": 100, "output": 250 },
    "cost_usd": 0.0025,
    "duration_ms": 3500
  },
  "session_id": "uuid-here"
}
```

## Impact

### Code Changes
- **New files only** - No modifications to existing production code
- **Isolated testing directory** - `src/testing/` for all testing tools
- **Example tests** - `test/claude-tests/` for documentation
- **Scripts addition** - Two new scripts in package.json

### Dependencies
- **No new dependencies** - Uses existing commander, chalk, ora
- **No API key required** - Uses local Claude subscription via CLI

### Documentation
- This is a development tool, not part of OpenSpec's public API
- Example tests serve as documentation
- No changes to existing OpenSpec documentation

### Notes
- This is a tooling/infrastructure change for development purposes
- Does not affect OpenSpec's core functionality or specifications
- When archiving, use: `openspec archive 2025-09-01-add-claude-testing-tools --skip-specs`