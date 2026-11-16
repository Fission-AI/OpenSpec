## Why

Teams that commit OpenSpec skills update every repository when the CLI changes. A machine-wide install lets each developer choose their coding tools once. Teams that need skills in Git can keep shipping them there.

## What changes

- Default new projects to machine-wide skills. Support project scope for shared team skills and GitHub’s hosted Copilot agent.
- Offer the move during interactive `openspec update`. Keep project scope when the user presses Enter. After the maintainer commits the removals, each teammate can run the same command to choose tools.
- Install the bundled skills through Vercel’s `skills` package in both scopes. Preserve OpenSpec tool IDs and use package IDs for newly supported tools.
- Refresh the profile’s built-in skills to match the running CLI, including after a downgrade. Keep separately named skills, specs and project settings.
- Retain local project discovery through `projects.json`. Limit migration to the current repository.
- Require Node 22.20.0 for package installations. Standalone executables include their runtime.

## Impact

The CLI setup, update, workflow instructions and installation docs change together. The changeset includes the maintainer and teammate upgrade instructions.
