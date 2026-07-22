# ATD developer bootstrap (draft)

One-time machine setup for the ATD OpenSpec workflow. **Draft** — package name
and registry finalize when the `internal-package-identity` change lands.

## Steps

1. **Internal npm configuration** — point the ATD scope at the internal
   registry (exact scope/registry TBD by internal-package-identity):

   ```bash
   npm config set @atd:registry <internal-registry-url>
   ```

2. **Install the CLI**:

   ```bash
   npm install -g @atd/openspec   # placeholder name until package-identity lands
   ```

3. **Register the standards store**:

   ```bash
   git clone <atd-standards remote> ~/atd-standards
   openspec store register ~/atd-standards
   openspec store doctor atd-standards
   ```

4. **Verify the Atlassian MCP** is configured in your agent tool (Claude Code,
   Cursor, …) and can read a Jira issue. The ticket artifact falls back to
   pasted content when the MCP is unavailable, but write-back and closure
   comments require it.

5. **Health check**:

   ```bash
   openspec doctor
   ```

See `bootstrap.sh` for the scripted skeleton of the same steps.
