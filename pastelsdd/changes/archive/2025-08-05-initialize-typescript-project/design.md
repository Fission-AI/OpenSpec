# Technical Design

## Technology Choices

### TypeScript Configuration
- **Strict mode**: Enable all strict type checking for better AI understanding
- **Target**: ES2022 for modern JavaScript features
- **Module**: ES2022 for modern ESM support
- **Module Resolution**: Node for proper package resolution
- **Output**: dist/ directory for compiled JavaScript
- **Source Maps**: Enable for debugging TypeScript directly
- **Declaration Files**: Generate .d.ts files for type definitions
- **ES Module Interop**: true for better CommonJS compatibility
- **Skip Lib Check**: false to ensure all types are validated

### Package Structure
```
pastelsdd
├── bin/            # CLI entry point
├── dist/           # Compiled JavaScript
├── src/            # TypeScript source
│   ├── cli/        # Command implementations
│   ├── core/       # Core Pastelsdd logic
│   └── utils/      # Shared utilities
├── package.json
├── tsconfig.json
└── build.js        # Build script
```

### Dependency Strategy
- **Minimal dependencies**: Only essential packages
- **commander**: Industry-standard CLI framework
- **@inquirer/prompts**: Modern prompting library
- **No heavy frameworks**: Direct, readable implementation

### Build Approach
- Native TypeScript compilation via tsc
- Simple build.js script for packaging
- No complex build toolchain needed
- ESM output with proper .js extensions in imports

### Development Workflow
1. `pnpm install` - Install dependencies
2. `pnpm run build` - Compile TypeScript
3. `pnpm run dev` - Development mode
4. `pnpm link` - Test CLI locally

### Node.js Requirements
- **Minimum version**: Node.js 20.19.0
- **Recommended**: Node.js 22 LTS
- **Rationale**: Full ESM support without flags, modern JavaScript features

### ESM Configuration
- **Package type**: `"type": "module"` in package.json
- **File extensions**: Use .js extensions in TypeScript imports (compiles correctly)
- **Top-level await**: Available for cleaner async initialization
- **Future-proof**: Aligns with JavaScript standards

### TypeScript Best Practices
- **All code in TypeScript**: No .js files in src/, only .ts
- **Explicit types**: Prefer explicit typing over inference where it adds clarity
- **Interfaces over types**: Use interfaces for object shapes, types for unions/aliases
- **No any**: Strict mode prevents implicit any, use unknown when needed
- **Async/await**: Modern async patterns throughout