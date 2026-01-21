<rules>
- Add Windows CI verification as a task when changes involve file paths
- Include cross-platform testing considerations
</rules>

## 1. Detection Functions

- [ ] 1.1 Create `detectEditorConfigs()` function to scan for .claude/, .cursor/, .windsurf/, .cline/
- [ ] 1.2 Create `detectOpenSpecState()` function to detect: uninitialized, old system, new system, mixed
- [ ] 1.3 Define `DetectionResult` interface for typed detection output
- [ ] 1.4 Add detection for each editor's configuration markers
- [ ] 1.5 Handle edge cases (empty directories, partial configs)

## 2. Smart Init Enhancement

- [ ] 2.1 Update init wizard to run detection before showing options
- [ ] 2.2 Display detection summary showing what was found
- [ ] 2.3 Pre-select detected editors in the selection UI
- [ ] 2.4 Allow user to override detected selections
- [ ] 2.5 Show state-aware recommendations (e.g., "Old system detected, recommend migration")
- [ ] 2.6 Handle already-initialized projects gracefully (detect and advise)
- [ ] 2.7 Ensure --yes flag uses detected editors as defaults

## 3. Editor Adapters

- [ ] 3.1 Create `EditorAdapter` interface for unified generation
- [ ] 3.2 Implement Claude Code adapter (skills + opsx commands)
- [ ] 3.3 Implement Cursor adapter (rules format in .cursor/rules/)
- [ ] 3.4 Implement Windsurf adapter (rules format in .windsurf/rules/)
- [ ] 3.5 Implement Cline adapter (rules format in .cline/rules/)
- [ ] 3.6 Define content transformation for each adapter (skill content → editor format)

## 4. Multi-Editor Generation

- [ ] 4.1 Update init to accept multiple editor selections
- [ ] 4.2 Generate files for all selected editors
- [ ] 4.3 Handle conflicts if multiple editors share a directory (unlikely but check)
- [ ] 4.4 Ensure skill content is equivalent across editors (format may differ)
- [ ] 4.5 Support adding editors to existing setup

## 5. Testing

- [ ] 5.1 Add unit tests for detectEditorConfigs()
- [ ] 5.2 Add unit tests for detectOpenSpecState() (including mixed state)
- [ ] 5.3 Add unit tests for each editor adapter
- [ ] 5.4 Add integration tests for multi-editor init
- [ ] 5.5 Test detection on projects with various configurations (uninitialized, old, new, mixed)
- [ ] 5.6 Test pre-selection behavior in init wizard
- [ ] 5.7 Test mixed state handling (recommends cleanup)
- [ ] 5.8 Verify Windows CI passes (cross-platform path handling)
- [ ] 5.9 Manual testing with actual editors (Claude Code, Cursor, etc.)

## 6. Documentation

- [ ] 6.1 Update README with multi-editor support
- [ ] 6.2 Document each supported editor and its configuration format
- [ ] 6.3 Add troubleshooting guide for editor-specific issues
- [ ] 6.4 Document how to add additional editors (adapter pattern)
