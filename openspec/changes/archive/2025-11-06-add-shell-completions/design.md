# Shell Completions Design

## Overview

This design establishes a plugin-based architecture for shell completions that prioritizes clean TypeScript patterns, scalability, and maintainability. The system separates concerns between shell-specific generation logic, dynamic completion data providers, and installation automation.

**Scope:** This proposal implements **Zsh completion only** (with Oh My Zsh priority). The architecture is designed to support bash, fish, and PowerShell in future proposals.

## Native Shell Completion Behaviors

**Design Philosophy:** We integrate with each shell's native completion system rather than attempting to customize or unify behaviors. This ensures familiar UX for users and reduces maintenance complexity.

**Note:** While all four shell behaviors are documented below for architectural reference, **only Zsh is implemented in this proposal**. Bash, Fish, and PowerShell are documented to guide future implementations.

### Bash Completion Behavior

**Interaction Pattern:**
- **Single TAB:** Completes if only one match exists, otherwise does nothing
- **Double TAB (TAB TAB):** Displays all possible completions as a list
- **Type more characters + TAB:** Narrows matches and completes or shows refined list

**OpenSpec Integration:**
```bash
# After installing: openspec completion install bash
openspec val<TAB>           # Completes to "openspec validate"
openspec validate <TAB><TAB>  # Shows: --all --changes --specs --strict --json [change-ids] [spec-ids]
openspec show add-<TAB><TAB>  # Shows all changes starting with "add-"
```

**Implementation:** Uses bash-completion framework with `_init_completion`, `compgen`, and `COMPREPLY` array.

### Zsh Completion Behavior (with Oh My Zsh)

**Interaction Pattern:**
- **Single TAB:** Shows interactive menu with all matches immediately
- **TAB / Arrow Keys:** Navigate through completion options
- **Enter:** Selects highlighted option
- **Ctrl+C / Esc:** Cancels completion menu

**OpenSpec Integration:**
```zsh
# After installing: openspec completion install zsh
openspec val<TAB>    # Shows menu with "validate" and "view" highlighted
openspec show <TAB>  # Shows menu with all change IDs and spec IDs, categorized
```

**Implementation:** Uses Zsh completion system with `_arguments`, `_describe`, and `compadd` built-ins. Oh My Zsh provides enhanced menu styling automatically.

### Fish Completion Behavior

**Interaction Pattern:**
- **As-you-type:** Gray suggestions appear automatically in real-time
- **Right Arrow / Ctrl+F:** Accepts the suggestion
- **TAB:** Shows menu with all matches if multiple exist
- **TAB again:** Cycles through options or navigates menu
- **Enter:** Accepts current selection

**OpenSpec Integration:**
```fish
# After installing: openspec completion install fish
openspec val       # Gray suggestion shows "validate" immediately
openspec show a    # Real-time suggestions for changes starting with "a"
openspec <TAB>     # Shows all commands with descriptions in paged menu
```

**Implementation:** Uses Fish's declarative `complete -c` syntax. Completions are auto-loaded from `~/.config/fish/completions/`.

### PowerShell Completion Behavior

**Interaction Pattern:**
- **TAB:** Cycles forward through completions one at a time (inline replacement)
- **Shift+TAB:** Cycles backward through completions
- **Ctrl+Space:** Shows IntelliSense-style menu (PSReadLine v2.2+)
- **Arrow Keys:** Navigate menu if shown

**OpenSpec Integration:**
```powershell
# After installing: openspec completion install powershell
openspec val<TAB>       # Cycles: validate → view → validate
openspec show <TAB>     # Cycles through change IDs one by one
openspec <Ctrl+Space>   # Shows IntelliSense menu with all commands
```

**Implementation:** Uses `Register-ArgumentCompleter` with custom script block that returns `[System.Management.Automation.CompletionResult]` objects.

### Comparison Table

| Shell       | Trigger         | Display Style          | Navigation           | Selection      |
|-------------|-----------------|------------------------|----------------------|----------------|
| Bash        | TAB TAB         | List (printed once)    | Type more + TAB      | Auto-complete  |
| Zsh         | TAB             | Interactive menu       | TAB/Arrows           | Enter          |
| Fish        | TAB/Auto        | Real-time + menu       | TAB/Arrows           | Enter/Right    |
| PowerShell  | TAB             | Inline cycling         | TAB/Shift+TAB        | Stop cycling   |

**Key Insight:** Each shell's completion UX reflects its design philosophy. We respect these conventions rather than forcing uniformity.

## Architectural Principles

### 1. Plugin-Based Generator System

Each shell has unique completion syntax and conventions. Rather than creating a monolithic generator with branching logic, we use a plugin pattern where each shell implements a common interface:

```typescript
interface CompletionGenerator {
  generate(): string;
  getInstallPath(): string;
  getConfigFile(): string;
}
```

**Benefits:**
- New shells can be added without modifying existing generators
- Shell-specific logic is isolated and testable
- Type safety ensures all generators implement required methods
- Easy to maintain and understand (single responsibility per generator)

**Implementation Classes:**
- `ZshCompletionGenerator` - Uses Zsh's `_arguments` and `_describe` functions
- `BashCompletionGenerator` - Uses `_init_completion` and `compgen` built-ins
- `FishCompletionGenerator` - Uses `complete -c` declarative syntax
- `PowerShellCompletionGenerator` - Uses `Register-ArgumentCompleter` cmdlet

### 2. Centralized Command Registry

Shell completions must stay synchronized with actual CLI commands. To avoid duplication and drift, we maintain a single source of truth:

```typescript
type CommandDefinition = {
  name: string;
  description: string;
  flags: FlagDefinition[];
  acceptsChangeId: boolean;
  acceptsSpecId: boolean;
  subcommands?: CommandDefinition[];
};

const COMMAND_REGISTRY: CommandDefinition[] = [
  {
    name: 'init',
    description: 'Initialize OpenSpec in your project',
    flags: [
      { name: '--tools', description: 'Configure AI tools non-interactively', hasValue: true }
    ],
    acceptsChangeId: false,
    acceptsSpecId: false
  },
  // ... all other commands
];
```

**Benefits:**
- All generators consume the same command definitions
- Adding a new command automatically propagates to all shells
- Flag changes only need to be made in one place
- Type safety prevents typos and missing fields
- Easier to test (mock the registry)

**TypeScript Sugar:**
- Use `const` assertions for readonly registry
- Leverage discriminated unions for command types
- Use `satisfies` operator to ensure registry matches interface

### 3. Dynamic Completion Provider

Change and spec IDs are project-specific and discovered at runtime. A dedicated provider encapsulates this logic:

```typescript
class CompletionProvider {
  private changeCache: { ids: string[]; timestamp: number } | null = null;
  private specCache: { ids: string[]; timestamp: number } | null = null;
  private readonly CACHE_TTL_MS = 2000;

  async getChangeIds(): Promise<string[]> {
    if (this.changeCache && Date.now() - this.changeCache.timestamp < this.CACHE_TTL_MS) {
      return this.changeCache.ids;
    }

    const ids = await discoverActiveChangeIds();
    this.changeCache = { ids, timestamp: Date.now() };
    return ids;
  }

  async getSpecIds(): Promise<string[]> {
    // Similar caching logic
  }

  isOpenSpecProject(): boolean {
    // Check for openspec/ directory
  }
}
```

**Benefits:**
- Caching reduces file system overhead during rapid tab completion
- Encapsulates project detection logic
- Easy to test with mocked file system
- Shared across all shell generators

**Design Decisions:**
- 2-second cache TTL balances freshness with performance
- Cache per-process (not persistent) to avoid stale data across sessions
- Graceful degradation when outside OpenSpec projects

### 4. Separate Installation Logic

Installation involves shell configuration file manipulation, which differs from generation. We separate this concern:

```typescript
interface CompletionInstaller {
  install(): Promise<InstallResult>;
  uninstall(): Promise<UninstallResult>;
  isInstalled(): Promise<boolean>;
}
```

**Shell-Specific Installers:**
- `ZshInstaller` - Handles both Oh My Zsh (custom completions) and standard Zsh (fpath)
- `BashInstaller` - Detects completion directories and sources from `.bashrc`
- `FishInstaller` - Writes to `~/.config/fish/completions/` (auto-loaded)
- `PowerShellInstaller` - Appends to PowerShell profile

**Benefits:**
- Installation logic doesn't pollute generator code
- Can test installation without generating completion scripts
- Easier to handle edge cases (missing directories, permissions, already installed)

### 5. Type-Safe Shell Detection

We use TypeScript's literal types and type guards for shell detection:

```typescript
type SupportedShell = 'bash' | 'zsh' | 'fish' | 'powershell';

function detectShell(): SupportedShell {
  const shellPath = process.env.SHELL || '';
  const shellName = path.basename(shellPath).toLowerCase();

  // PowerShell normalization
  if (shellName === 'pwsh' || shellName === 'powershell') {
    return 'powershell';
  }

  const supported: SupportedShell[] = ['bash', 'zsh', 'fish', 'powershell'];
  if (supported.includes(shellName as SupportedShell)) {
    return shellName as SupportedShell;
  }

  throw new Error(`Shell '${shellName}' is not supported. Supported: ${supported.join(', ')}`);
}
```

**Benefits:**
- Compile-time type checking prevents invalid shell names
- Easy to add new shells (add to union type)
- Type narrowing works in switch statements
- Clear error messages for unsupported shells

### 6. Factory Pattern for Instantiation

A factory function selects the appropriate generator/installer based on shell type:

```typescript
function createGenerator(shell: SupportedShell, provider: CompletionProvider): CompletionGenerator {
  switch (shell) {
    case 'bash': return new BashCompletionGenerator(COMMAND_REGISTRY, provider);
    case 'zsh': return new ZshCompletionGenerator(COMMAND_REGISTRY, provider);
    case 'fish': return new FishCompletionGenerator(COMMAND_REGISTRY, provider);
    case 'powershell': return new PowerShellCompletionGenerator(COMMAND_REGISTRY, provider);
  }
}
```

**Benefits:**
- Single point of instantiation
- Type safety ensures exhaustive switch (TypeScript error if shell type missing)
- Easy to inject dependencies (registry, provider)

## Command Structure

**This Proposal (Zsh-only):**
```
openspec completion
├── zsh               # Generate Zsh completion script
├── install [shell]   # Install Zsh completion (auto-detects or explicit zsh)
└── uninstall [shell] # Remove Zsh completion (auto-detects or explicit zsh)
```

**Future (after follow-up proposals):**
```
openspec completion
├── bash              # Generate Bash completion script (future)
├── zsh               # Generate Zsh completion script (this proposal)
├── fish              # Generate Fish completion script (future)
├── powershell        # Generate PowerShell completion script (future)
├── install [shell]   # Install completion (auto-detects or explicit shell)
└── uninstall [shell] # Remove completion (auto-detects or explicit shell)
```

## File Organization

**This Proposal (Zsh-only):**
```
src/
├── commands/
│   └── completion.ts              # CLI command registration (zsh, install, uninstall)
├── core/
│   └── completions/
│       ├── types.ts               # Interfaces: CompletionGenerator, CommandDefinition, etc.
│       ├── command-registry.ts    # Single source of truth for OpenSpec commands
│       ├── completion-provider.ts # Dynamic change/spec ID discovery with caching
│       ├── factory.ts             # Factory for instantiating Zsh generator/installer
│       ├── generators/
│       │   └── zsh-generator.ts   # Zsh completion script generator
│       └── installers/
│           └── zsh-installer.ts   # Handles Oh My Zsh + standard Zsh installation
└── utils/
    └── shell-detection.ts         # Shell detection (returns 'zsh' or throws)
```

**Future additions (bash, fish, powershell):**
- `generators/bash-generator.ts`, `fish-generator.ts`, `powershell-generator.ts`
- `installers/bash-installer.ts`, `fish-installer.ts`, `powershell-installer.ts`
- Update `shell-detection.ts` to support additional shell types

## Oh My Zsh Priority

Zsh implementation prioritizes Oh My Zsh because:
1. **Popularity** - Oh My Zsh is the most popular Zsh configuration framework
2. **Convention** - Has standard completion directory (`~/.oh-my-zsh/custom/completions/`)
3. **Detection** - Easy to detect via `$ZSH` environment variable
4. **Fallback** - Standard Zsh support provides compatibility when Oh My Zsh isn't installed

**Installation Strategy:**
```typescript
if (isOhMyZshInstalled()) {
  // Install to ~/.oh-my-zsh/custom/completions/_openspec
  // Automatically loaded by Oh My Zsh
} else {
  // Install to ~/.zsh/completions/_openspec
  // Update ~/.zshrc with fpath and compinit if needed
}
```

## Caching Strategy

Dynamic completions cache results for 2 seconds to balance freshness with performance:

**Why 2 seconds?**
- Typical tab completion sessions last < 2 seconds
- Prevents repeated file system scans during rapid tabbing
- Short enough to feel "live" when changes/specs are added
- Automatic per-process expiration (no stale data across sessions)

**Implementation:**
```typescript
private changeCache: { ids: string[]; timestamp: number } | null = null;
private readonly CACHE_TTL_MS = 2000;

if (this.changeCache && Date.now() - this.changeCache.timestamp < this.CACHE_TTL_MS) {
  return this.changeCache.ids; // Use cached
}
// Refresh cache
```

## Error Handling Philosophy

Completions should degrade gracefully rather than break workflows:

1. **Unsupported shell** - Clear error with list of supported shells
2. **Not in OpenSpec project** - Skip dynamic completions, only offer static commands
3. **Permission errors** - Suggest alternative installation methods
4. **Missing config directories** - Auto-create with user notification
5. **Already installed** - Offer to reinstall/update
6. **Not installed (during uninstall)** - Exit gracefully with informational message

## Testing Strategy

Each component is independently testable:

1. **Unit Tests**
   - Shell detection with mocked `$SHELL` environment variable
   - Generator output verification (regex pattern matching)
   - Completion provider caching behavior
   - Command registry structure validation

2. **Integration Tests**
   - Installation to temporary test directories
   - Configuration file modifications
   - End-to-end command flow (generate → install → verify)

3. **Manual Testing**
   - Real shell environments (Oh My Zsh, Bash, Fish, PowerShell)
   - Tab completion behavior in OpenSpec projects
   - Dynamic change/spec ID suggestions
   - Installation/uninstallation workflows

## TypeScript Sugar Patterns

### 1. Const Assertions for Immutable Data
```typescript
const COMMAND_REGISTRY = [
  { name: 'init', ... },
  { name: 'list', ... }
] as const;
```

### 2. Discriminated Unions for Command Types
```typescript
type Command =
  | { type: 'simple'; name: string }
  | { type: 'with-subcommands'; name: string; subcommands: Command[] };
```

### 3. Template Literal Types for Strings
```typescript
type ShellConfigFile = `~/.${SupportedShell}rc` | `~/.${SupportedShell}_profile`;
```

### 4. Satisfies Operator for Type Validation
```typescript
const config = {
  shell: 'zsh',
  path: '~/.zshrc'
} satisfies ShellConfig;
```

### 5. Optional Chaining and Nullish Coalescing
```typescript
const path = process.env.ZSH ?? `${os.homedir()}/.oh-my-zsh`;
```

### 6. Async/Await with Promise.all for Parallel Operations
```typescript
const [changes, specs] = await Promise.all([
  provider.getChangeIds(),
  provider.getSpecIds()
]);
```

## Scalability Considerations

### Adding a New Shell

1. Define shell in `SupportedShell` union type
2. Create generator class implementing `CompletionGenerator`
3. Create installer class implementing `CompletionInstaller`
4. Add cases to factory functions
5. Add command registration in CLI
6. Write tests

**TypeScript will enforce** that all switch statements are updated (exhaustiveness checking).

### Adding a New Command

1. Add to `COMMAND_REGISTRY` with appropriate metadata
2. All generators automatically include it
3. Update tests to verify new command appears

### Changing Completion Behavior

Dynamic completion logic is centralized in `CompletionProvider`, making behavior changes trivial without touching shell-specific code.

## Trade-offs and Decisions

### Decision: Separate Generators vs. Template Engine

**Chosen:** Separate generator classes per shell

**Alternative:** Template engine with shell-specific templates

**Rationale:**
- Shell completion syntax is fundamentally different (not just text substitution)
- Type safety is better with classes than templates
- Logic complexity (caching, dynamic completions) doesn't fit template paradigm
- Easier to debug and test dedicated classes

### Decision: 2-Second Cache TTL

**Chosen:** 2-second cache

**Alternatives:** No cache (slow), longer cache (stale), persistent cache (complex)

**Rationale:**
- Balances performance with freshness
- Matches typical user interaction patterns
- Simple implementation (no invalidation complexity)
- Automatic cleanup on process exit

### Decision: Oh My Zsh Detection

**Chosen:** Check `$ZSH` env var first, then `~/.oh-my-zsh/` directory

**Rationale:**
- `$ZSH` is set by Oh My Zsh initialization (reliable)
- Directory check is fallback for non-interactive scenarios
- Standard Zsh serves as ultimate fallback

### Decision: Installation Automation vs. Manual Instructions

**Chosen:** Automated installation with install/uninstall commands

**Alternative:** Generate script and provide manual installation instructions

**Rationale:**
- Better user experience (one command vs. multiple manual steps)
- Reduces errors from manual configuration
- Aligns with user expectations for modern CLI tools
- Still supports manual workflow via script generation to stdout

## Future Enhancements

1. **Contextual Flag Completion** - Suggest only valid flags for current command
2. **Fuzzy Matching** - Allow partial matching for change/spec IDs
3. **Rich Descriptions** - Include "why" section in completion suggestions (shell-dependent)
4. **Completion Stats** - Track completion usage for analytics
5. **Custom Completion Hooks** - Allow projects to extend completions
6. **MCP Integration** - Provide completions via Model Context Protocol

## References

- [Bash Programmable Completion](https://www.gnu.org/software/bash/manual/html_node/Programmable-Completion.html)
- [Zsh Completion System](https://zsh.sourceforge.io/Doc/Release/Completion-System.html)
- [Fish Completions](https://fishshell.com/docs/current/completions.html)
- [PowerShell Argument Completers](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/register-argumentcompleter)
- [Oh My Zsh Custom Completions](https://github.com/ohmyzsh/ohmyzsh/wiki/Customization#adding-custom-completions)
