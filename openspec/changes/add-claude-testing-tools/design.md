# Technical Design: Claude Code Testing Tools

## Architecture Overview

The Claude Code testing tools are designed as a thin wrapper around the `claude` CLI command, leveraging the existing local subscription authentication. The architecture prioritizes simplicity, reusability, and integration with the existing OpenSpec codebase.

## Design Decisions

### 1. CLI Wrapper Approach
**Decision**: Use Node.js child_process to execute `claude` CLI commands rather than an SDK.

**Rationale**:
- No API key management required (uses existing subscription)
- Leverages battle-tested Claude CLI functionality
- Avoids SDK version dependencies
- Simpler implementation and maintenance

**Implementation**:
```typescript
import { spawn } from 'child_process';

async function executeClaude(prompt: string, options: ClaudeOptions): Promise<ClaudeResponse> {
  const args = [
    '-p', prompt,
    '--output-format', 'json',
    ...buildArgs(options)
  ];
  
  return new Promise((resolve, reject) => {
    const process = spawn('claude', args);
    // Handle stdout, stderr, exit
  });
}
```

### 2. Integration with Existing Package
**Decision**: Add testing tools to the existing OpenSpec package rather than creating a new package.

**Rationale**:
- Reuses existing dependencies (commander, chalk, ora)
- Maintains consistent code patterns
- Simpler dependency management
- Easier to maintain

**Structure**:
```
src/
├── cli/          # Existing CLI
├── commands/     # Existing commands
├── core/         # Existing core logic
├── utils/        # Existing utilities
└── testing/      # NEW: Testing tools (isolated)
    ├── claude-tester.ts
    ├── types.ts
    └── lib/
```

### 3. JSON-Based Communication
**Decision**: Use JSON output format for all Claude interactions.

**Rationale**:
- Structured data parsing
- Consistent error handling
- Metrics extraction
- Programmatic analysis

**Response Format**:
```typescript
interface ClaudeResponse {
  type: 'result';
  subtype: 'success' | 'error';
  is_error: boolean;
  duration_ms: number;
  result: string;
  session_id: string;
  total_cost_usd: number;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}
```

### 4. File-Based Result Storage
**Decision**: Store test results as JSON files in a local directory.

**Rationale**:
- Simple persistence mechanism
- Easy to version control (or ignore)
- Human-readable format
- Easy to process with other tools

**Naming Convention**:
```
test-results/
├── {test_name}_{timestamp}.json           # Single tests
├── {test_name}_comparison_{timestamp}.json # Comparisons
└── {test_name}_conversation_{timestamp}.json # Conversations
```

## Component Design

### 1. CLI Entry Point (`claude-tester.ts`)
Responsibilities:
- Parse command-line arguments using Commander
- Route to appropriate test mode (single, compare, conversation)
- Handle global options and configuration
- Display results summary

Key Methods:
```typescript
class ClaudeTester {
  async runSingleTest(options: SingleTestOptions): Promise<TestResult>
  async runComparison(options: ComparisonOptions): Promise<ComparisonResult>
  async runConversation(options: ConversationOptions): Promise<ConversationResult>
}
```

### 2. Executor (`lib/executor.ts`)
Responsibilities:
- Build claude CLI arguments from options
- Execute claude command via child_process
- Parse JSON responses
- Handle errors and timeouts
- Support streaming for long responses

Key Methods:
```typescript
class ClaudeExecutor {
  async execute(prompt: string, options: ExecuteOptions): Promise<ClaudeResponse>
  async stream(prompt: string, options: StreamOptions): AsyncIterable<ClaudeMessage>
  buildArgs(options: ExecuteOptions): string[]
}
```

### 3. Analyzer (`lib/analyzer.ts`)
Responsibilities:
- Extract metrics from responses
- Parse reasoning steps from text
- Identify tool usage patterns
- Calculate derived metrics

Key Methods:
```typescript
class ResponseAnalyzer {
  extractMetrics(response: ClaudeResponse): Metrics
  extractReasoningSteps(text: string): string[]
  analyzeToolUsage(response: ClaudeResponse): ToolUsage[]
  compareResponses(responses: ClaudeResponse[]): ComparisonMetrics
}
```

### 4. Reporter (`lib/reporter.ts`)
Responsibilities:
- Format results for console display
- Save results to JSON files
- Generate comparison tables
- Create summary reports

Key Methods:
```typescript
class ResultReporter {
  saveResult(result: TestResult, outputDir: string): string
  printSummary(result: TestResult): void
  printComparisonTable(comparison: ComparisonResult): void
  generateReport(results: TestResult[]): Report
}
```

## Data Flow

### Single Test Flow
1. User runs: `pnpm test:claude --prompt "..." --name "test1"`
2. CLI parses arguments, creates options object
3. Executor builds claude command with JSON output
4. Executor spawns claude process, captures response
5. Analyzer extracts metrics and patterns
6. Reporter saves JSON and prints summary

### Comparison Flow
1. User runs: `pnpm test:claude compare --prompt "..." --variants "A" "B" "C"`
2. CLI creates comparison options
3. For each variant:
   - Executor runs claude with variant as instruction
   - Analyzer processes response
4. Analyzer compares all responses
5. Reporter generates comparison table and saves results

### Conversation Flow
1. User runs: `pnpm test:claude conversation --turns "Q1" "Q2" "Q3"`
2. CLI creates conversation options
3. For each turn:
   - Executor runs claude with --continue flag (after first)
   - Analyzer tracks conversation metrics
4. Reporter saves conversation history

## Error Handling

### Expected Errors
- Claude CLI not found → Clear installation instructions
- No subscription → Guide to authentication
- Timeout → Configurable timeout with retry option
- Invalid JSON → Fallback to text parsing

### Error Recovery
```typescript
try {
  const response = await executor.execute(prompt, options);
  return analyzer.process(response);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code');
  } else if (error.code === 'TIMEOUT') {
    console.error(`Request timed out after ${options.timeout}ms`);
  }
  // Save partial results if available
  reporter.saveError(error, options);
}
```

## Performance Considerations

### Optimization Strategies
1. **Parallel Execution**: Run comparison variants in parallel (with rate limiting)
2. **Result Caching**: Cache responses for identical prompts (optional)
3. **Streaming**: Use stream-json format for large responses
4. **Batch Processing**: Support batch test files

### Resource Management
- Limit concurrent Claude processes (default: 3)
- Implement exponential backoff for rate limits
- Clean up old test results (configurable retention)

## Future Enhancements

### Potential Features (Not in Initial Implementation)
1. **Web UI**: Simple web interface for viewing results
2. **Diff Visualization**: Visual diff between response variants
3. **Pattern Detection**: Automatic pattern extraction from responses
4. **Test Suites**: YAML/JSON test definition format
5. **CI Integration**: GitHub Actions for automated testing
6. **Metrics Dashboard**: Aggregate metrics across tests

### Extension Points
The design allows for future extensions without breaking changes:
- Custom analyzers via plugin system
- Additional output formats (CSV, Markdown)
- Integration with evaluation frameworks
- Custom Claude CLI flags support

## Testing Strategy

### Unit Tests
- Mock claude CLI responses for executor tests
- Test analyzer pattern extraction with fixtures
- Test reporter formatting with snapshots

### Integration Tests
- Test with actual claude CLI (requires subscription)
- Test error scenarios (timeout, invalid input)
- Test multi-turn conversations

### Example Tests
Provide comprehensive examples in `test/claude-tests/`:
- Basic prompts
- Instruction variants
- Multi-turn conversations
- Error handling scenarios