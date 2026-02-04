# Troubleshooting Hierarchical Specs

Common issues when working with hierarchical spec structures and how to resolve them.

## Spec Not Found

**Problem:** Running `openspec show auth` returns "Spec 'auth' not found"

**Cause:** The spec is in a hierarchical location but you're using a flat capability name.

**Solution:** Use the full hierarchical path:
```bash
# Instead of:
openspec show auth

# Use:
openspec show platform/services/auth
```

**How to find the correct path:**
```bash
# List all specs to see their full paths
openspec list --specs
```

---

## Validation Errors: Invalid Path Names

**Problem:** `openspec validate --specs` shows errors like:
```
ERROR: Invalid segment "Auth" in capability "platform/Auth"
```

**Cause:** Directory names must be lowercase with alphanumeric characters, hyphens, or underscores only.

**Solution:** Rename directories to follow naming conventions:
```bash
# Bad
platform/Auth/         # Uppercase
platform/my service/   # Spaces
platform/api-v2.0/     # Periods

# Good
platform/auth/
platform/my-service/
platform/api-v2/
```

---

## Delta Spec Not Applied During Archive

**Problem:** After archiving a change, the main spec wasn't updated.

**Cause:** The delta spec path doesn't match the main spec path (1:1 mapping required).

**Solution:** Ensure delta structure mirrors main structure exactly:
```bash
# If main spec is at:
openspec/specs/_global/testing/spec.md

# Delta must be at:
openspec/changes/<change-name>/specs/_global/testing/spec.md
```

---

## Path Separator Issues on Windows

**Problem:** Specs work on macOS/Linux but fail on Windows.

**Cause:** Hardcoded forward slashes (`/`) in capability references.

**Solution:** OpenSpec handles this automatically - capability paths use the OS-native separator internally. Use capability paths without worrying about separators:

```bash
# Both work on all platforms
openspec show _global/testing        # Forward slash (will work)
openspec show _global\testing        # Backslash on Windows (will work)
```

The `openspec list --specs` command always shows the correct format for your platform.

---

## Depth Limit Exceeded

**Problem:** Validation shows:
```
ERROR: Spec "platform/services/api/rest/v1" exceeds maximum depth 4
```

**Cause:** Spec hierarchy is too deep (default max: 4 levels).

**Solution 1:** Flatten the hierarchy:
```bash
# Instead of: platform/services/api/rest/v1 (depth 5)
# Use: platform/api-rest-v1 (depth 2)
```

**Solution 2:** Increase max depth in config (not recommended beyond 6):

**~/.config/openspec/config.json**
```json
{
  "specStructure": {
    "maxDepth": 5
  }
}
```

**Best practice:** Keep hierarchy shallow (2-3 levels preferred, 4 maximum).

---

## Mixed Structure Confusion

**Problem:** Some specs are flat, others hierarchical - team is confused about where to put new specs.

**Cause:** Inconsistent structure makes navigation harder.

**Solution 1:** Enforce one structure:

**~/.config/openspec/config.json**
```json
{
  "specStructure": {
    "structure": "hierarchical",  // or "flat"
    "allowMixed": false
  }
}
```

**Solution 2:** Document your conventions clearly:
- Create a SPECS.md file in your repo explaining the structure
- Use `_global/` for cross-cutting concerns
- Use domain directories (`platform/`, `frontend/`, etc.) for scoped specs
- Keep remaining top-level specs flat for simple capabilities

---

## Orphaned Specs

**Problem:** Validation shows:
```
ERROR: Orphaned spec found at intermediate level "_global"
```

**Cause:** A `spec.md` exists at an intermediate directory level (not a leaf).

**Example of the problem:**
```
openspec/specs/
  _global/
    spec.md              ← This is orphaned (intermediate level)
    testing/spec.md      ← Leaf spec (correct)
    security/spec.md     ← Leaf spec (correct)
```

**Solution:** Move the orphaned spec to a leaf directory:
```bash
# Create a new leaf directory
mkdir openspec/specs/_global/general

# Move the orphaned spec
mv openspec/specs/_global/spec.md openspec/specs/_global/general/spec.md
```

**Rule:** Specs must only exist at leaf directories (no children directories).

---

## Auto-Detection Not Working

**Problem:** OpenSpec doesn't detect hierarchical structure even though you have nested specs.

**Cause:** Config might be forcing flat structure, or specs are actually all depth 1.

**Solution 1:** Check your config:
```bash
cat ~/.config/openspec/config.json
```

If it shows `"structure": "flat"`, change to `"auto"`:
```json
{
  "specStructure": {
    "structure": "auto"
  }
}
```

**Solution 2:** Verify you actually have hierarchical specs:
```bash
openspec list --specs
```

If all specs are listed without path separators (e.g., `user-auth` instead of `backend/services/auth`), they're flat.

---

## Reserved Directory Names

**Problem:** Validation shows:
```
ERROR: Reserved name ".git" not allowed in capability
```

**Cause:** Using reserved directory names in spec paths.

**Reserved names:**
- `.git`
- `.gitignore`
- `node_modules`
- `.openspec`
- `..`
- `.`

**Solution:** Rename the directory to something else:
```bash
# Bad
openspec/specs/.internal/

# Good
openspec/specs/_internal/
```

---

## Change Proposal Capability Mismatch

**Problem:** Archived change but specs weren't updated.

**Cause:** Capability names in `proposal.md` don't match delta spec paths.

**Example of the problem:**

**proposal.md:**
```markdown
## Capabilities
- api
- auth
```

**But delta specs are at:**
```
openspec/changes/my-change/specs/platform/services/api/spec.md
openspec/changes/my-change/specs/platform/services/auth/spec.md
```

**Solution:** Update capability names in proposal to match delta paths:
```markdown
## Capabilities
- platform/services/api
- platform/services/auth
```

---

## Performance Issues

**Problem:** `openspec validate --specs` is slow with many specs.

**Cause:** Large number of specs (1000+).

**Expected Performance:**
- 100 specs: < 10ms
- 1000 specs: < 100ms

**If slower:**
1. Check for very deep hierarchies (optimize to 2-3 levels)
2. Ensure specs are properly organized (not all in one directory)
3. Check disk I/O performance

---

## Getting Help

If you're still stuck:

1. **Check the docs:**
   - [Organizing Specs](./organizing-specs.md)
   - [Migration Guide](./migration-flat-to-hierarchical.md)

2. **Ask the community:**
   - [Discord](https://discord.gg/YctCnvvshC)
   - [GitHub Issues](https://github.com/Fission-AI/OpenSpec/issues)

3. **Debug output:**
   ```bash
   # See detailed validation output
   openspec validate --specs --json
   ```
