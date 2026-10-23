# Writing an artifact

- If you have not loaded it yet, get its guidance: `openspec instructions <artifact-id> --change "<name>" --json`, and re-read each completed file in `dependencies` from disk first; the user may have edited it.
- Read any guide in SKILL.md's **Guides** table that fits this artifact and that you have not read yet.
- Its `instruction` field is the authoritative guidance, even for a familiar file name, and `template` is the file's structure.
- `context` and `rules` constrain what you write. Never copy them, or `<context>` and `<rules>` blocks, into the file.
- If the response has `skipped` or `warning`, the change declares `skip_specs`: create nothing for this artifact.
- If `resolvedOutputPath` is a glob, follow `instruction` to choose a concrete path inside `changeRoot` that matches it, and verify it remains inside `changeRoot` after resolving symlinks, both in its parent directories and in the file itself if it already exists; if it does not, stop and tell the user. Otherwise the output path is `resolvedOutputPath`.
- If the `instruction` field delegates creation to a specific skill or command, invoke it only if it can write the artifact to that output path; otherwise stop and tell the user.
- Otherwise write the artifact to that output path yourself, using `template` as its structure.
- Either way, verify the artifact file exists at that output path.
