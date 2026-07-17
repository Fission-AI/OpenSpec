# Implementation Tasks

## 1. Create Devin Desktop Adapter

### 1.1 Create adapter file
- Create `src/core/command-generation/adapters/devin.ts`
- Base implementation on the existing Windsurf adapter (`src/core/command-generation/adapters/windsurf.ts`)
- Use `.devin/workflows/` as the target directory
- Use `opsx-<id>.md` as the filename pattern
- Include frontmatter with: name, description, category, tags

### 1.2 Implement adapter interface
- Export `devinAdapter` object implementing `ToolCommandAdapter`
- Set `toolId` to `'devin'`
- Implement `getFilePath()` to return `.devin/workflows/opsx-<id>.md`
- Implement `formatFile()` to generate YAML frontmatter + body content

## 2. Register Adapter

### 2.1 Update registry
- Edit `src/core/command-generation/registry.ts`
- Import the new `devinAdapter`
- Register it in the static initializer: `CommandAdapterRegistry.register(devinAdapter)`

### 2.2 Export adapter
- Edit `src/core/command-generation/adapters/index.ts`
- Add export: `export { devinAdapter } from './devin.js'`
- Update main index if needed: `src/core/command-generation/index.ts`

## 3. Update CLI Tool Selection

### 3.1 Add Devin Desktop to tool picker
- Locate CLI initialization code that prompts for tool selection
- Add "Devin Desktop" option to the multi-select menu
- Ensure it appears alongside Windsurf and other tools
- Map selection to `devin` tool ID

## 4. Update Documentation

### 4.1 Update supported tools reference
- Edit `docs/supported-tools.md`
- Add Devin Desktop row to the tool directory reference table
- Include:
  - Tool name and ID: `Devin Desktop (devin)`
  - Skills path: `.devin/skills/openspec-*/SKILL.md`
  - Command path: `.devin/workflows/opsx-<id>.md`
- Add `devin` to the available tool IDs list in the "Non-Interactive Setup" section

### 4.2 Update README if needed
- Check if README mentions tool count or lists specific tools
- Update any references to reflect Devin Desktop support

## 5. Add Tests

### 5.1 Test adapter functionality
- Create or update tests for the Devin adapter
- Test `getFilePath()` returns correct path
- Test `formatFile()` generates valid YAML frontmatter
- Test cross-platform path handling (Windows, macOS, Linux)

### 5.2 Test CLI integration
- Test `openspec init --tools devin` generates `.devin/workflows/` files
- Test `openspec update` refreshes existing Devin workflows
- Test that Devin Desktop appears in interactive tool selection
- Verify files are created with correct structure and content

### 5.3 Test backward compatibility
- Ensure Windsurf adapter still works
- Verify both Devin and Windsurf can be selected together
- Test that existing Windsurf installations are not affected

## 6. Verify and Polish

### 6.1 Manual testing
- Run `openspec init` and select Devin Desktop
- Verify `.devin/workflows/` directory is created
- Check that workflow files have correct frontmatter and content
- Run `openspec update` and verify files are refreshed
- Test on Windows, macOS, and Linux if possible

### 6.2 Code review checklist
- Adapter follows existing patterns (Windsurf, Cursor, Claude)
- No hardcoded paths (use `path.join()`)
- YAML escaping handles special characters
- Error handling is consistent with other adapters
- Comments are clear and helpful

### 6.3 Documentation review
- Supported tools table is accurate and complete
- Tool IDs are consistent across docs
- Examples show Devin Desktop usage
- Links and references are correct
