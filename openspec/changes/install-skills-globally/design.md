## Scope and migration

The committed skill files and existing tool marker identify projects that carry their integrations in Git. The first interactive update offers to keep those files or switch to global skills. Choosing Keep records the decision in the existing tool marker. Committing that file carries the choice to other checkouts. An explicit `openspec init --scope global` can still switch the repo. Noninteractive updates refresh existing installs. A checkout with only project data can run ordinary commands without installing skills. Interactive update offers optional local tool setup to a teammate with no machine-wide install.

## Installer

The npm CLI and standalone executable give Vercel’s installer the OpenSpec GitHub repository, the running CLI’s release tag, and the selected agents, scope and workflows. If the tag cannot be fetched, setup reports the error. Project install and removal disable the package lock file. Global operations allow the package to manage its own lock.

Public OpenSpec IDs remain stable. The picker and help use the package registry plus existing OpenSpec display names and aliases. Previously supported agents outside the registry use the universal folder and the manual setup guide. The project marker records selected IDs and which integrations have files of their own. Windows project installs use copies so checked-in skills work from a second checkout.

## Refresh and migration ordering

The installed text must match the running CLI and selected workflow profile. The CLI manages the built-in names. A differently named skill belongs to its author. A current update leaves the skills untouched.

During a move, validate the global install before removing repo files. For a hosted Copilot opt-out, remove the managed cloud files, save the choice, then remove the repo skills. Restore the first cloud file if removing the second fails. The local install can be reused on retry.

Init and update remember the visited project locally. They do not enumerate other projects in their output or migrate another repository.
