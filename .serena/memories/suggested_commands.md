# OpenSpec - Suggested Commands

## Development
```powershell
pnpm install          # Install dependencies
pnpm run build        # Build (node build.js)
pnpm run dev          # TypeScript watch mode
pnpm run dev:cli      # Build + run CLI
```

## Testing
```powershell
pnpm run test         # Run tests (vitest run)
pnpm run test:watch   # Watch mode
pnpm run test:ui      # Vitest UI
pnpm run test:coverage # Coverage report
```

## Linting
```powershell
pnpm run lint         # ESLint on src/
```

## Release
```powershell
pnpm run changeset    # Create changeset
pnpm run release      # Publish (requires version check)
```

## CLI Usage
```powershell
node bin/openspec.js  # Run CLI locally
# Or after install: openspec
```
