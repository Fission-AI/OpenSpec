# Dev Container Setup

This directory contains the VS Code dev container configuration for OpenSpec development.

## What's Included

- **Node.js 20 LTS** (>=20.19.0) - TypeScript/JavaScript runtime
- **pnpm** - Fast, disk space efficient package manager
- **Git + GitHub CLI** - Version control tools
- **VS Code Extensions**:
  - ESLint & Prettier for code quality
  - Vitest Explorer for running tests
  - GitLens for enhanced git integration
  - Error Lens for inline error highlighting
  - Code Spell Checker
  - Path IntelliSense

## How to Use

### First Time Setup

1. **Install Prerequisites** (on your local machine):
   - [VS Code](https://code.visualstudio.com/)
   - [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

2. **Open in Container**:
   - Open this project in VS Code
   - You'll see a notification: "Folder contains a Dev Container configuration file"
   - Click "Reopen in Container"

   OR

   - Open Command Palette (`Cmd/Ctrl+Shift+P`)
   - Type "Dev Containers: Reopen in Container"
   - Press Enter

3. **Wait for Setup**:
   - The container will build (first time takes a few minutes)
   - `pnpm install` runs automatically via `postCreateCommand`
   - All extensions install automatically

### Daily Development

Once set up, the container preserves your development environment:

```bash
# Run development build
pnpm run dev

# Run CLI in development
pnpm run dev:cli

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build the project
pnpm run build
```

### SSH Keys

Your SSH keys are mounted read-only from `~/.ssh`, so git operations work seamlessly with GitHub/GitLab.

### Rebuilding the Container

If you modify `.devcontainer/devcontainer.json`:
- Command Palette → "Dev Containers: Rebuild Container"

## Benefits

- No need to install Node.js or pnpm on your local machine
- Consistent development environment across team members
- Isolated from other Node.js projects on your machine
- All dependencies and tools containerized
- Easy onboarding for new developers

## Troubleshooting

**Container won't build:**
- Ensure Docker Desktop is running
- Check Docker has enough memory allocated (recommend 4GB+)

**Extensions not appearing:**
- Rebuild the container: "Dev Containers: Rebuild Container"

**Permission issues:**
- The container runs as the `node` user (non-root)
- Files created in the container are owned by this user
