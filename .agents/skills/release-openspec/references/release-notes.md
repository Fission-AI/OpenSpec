# GitHub release notes

Read this file only after the npm package, tag, and GitHub Release exist, or when the user explicitly asks to preview or polish release notes.

## Gather source material

1. Bind the release values once and fetch the current release. Replace the example values, but keep every expansion quoted:

   ```bash
   tag="vX.Y.Z"
   previous_tag="vA.B.C"
   gh release view "$tag" --repo Fission-AI/OpenSpec \
     --json body,name,isPrerelease,url
   ```

2. For a stable release, find the preceding stable release by excluding drafts and prereleases. For a beta, compare against the preceding tag in the same beta series when one exists; otherwise compare against the latest stable release.
3. Fetch GitHub-generated notes to recover first-time contributor attribution and the full changelog link:

   ```bash
   gh api repos/Fission-AI/OpenSpec/releases/generate-notes \
     -f "tag_name=$tag" -f "previous_tag_name=$previous_tag" -q '.body'
   ```

4. Cross-check the final content against the released `CHANGELOG.md` section and the merged Version Packages PR. Never invent an item from commit titles alone.

## Title

Use:

```text
<tag> - <one-to-four-word theme>
```

Lead with the most notable user-facing addition. For two similarly important additions, comma-separate them. For a fix-only release, name the primary fixed area.

## Body

Use only the sections that contain content:

```markdown
## What's New in <tag>

<One direct sentence describing the release theme.>

### New

- **Feature** - What users can now do and when it helps.

### Improved

- **Area** - What became easier, safer, faster, or more consistent.

### Fixed

- **Area** - What now behaves correctly.

## New Contributors

* @username made their first contribution in #PR

**Full Changelog**: <compare-link>
```

## Voice and cleanup

- Write for developers using OpenSpec with AI coding assistants.
- Be direct and practical; avoid marketing language.
- Lead with user capability or impact, not implementation.
- Keep each item to one or two sentences.
- Remove commit hashes, changeset wrappers, raw semantic-bump headings, and inline `Thanks @user` boilerplate.
- Omit internal CI, test, and refactor details unless users experience the result.
- Keep contribution credit in `New Contributors`, not inside feature bullets.
- Preserve GitHub's first-contribution wording and PR link.
- Exclude core maintainer `@TabishB` from `New Contributors`. If no external first-time contributors remain, omit that section.
- Always retain the full changelog compare link.

## Apply and verify

Create a temporary file, write the body to it with the available file-editing tool, bind the final title, then update:

```bash
notes_file="$(mktemp)"
title="$tag - Release Theme"
# Write the polished Markdown body to "$notes_file" before continuing.
gh release edit "$tag" --repo Fission-AI/OpenSpec \
  --title "$title" --notes-file "$notes_file"
```

When the user asked only for a preview or audit, show the proposed title/body without editing. When the user asked to run, continue, or complete the release, apply the polished notes without an extra confirmation pause, then fetch the release again and verify the saved title/body.
