---
'@fission-ai/openspec': patch
---

Let `openspec store setup --no-init-git` create a store inside an existing Git repository. Setup refuses a path inside another repository because initializing the store there would nest one repository in another, but it ran that check even with `--no-init-git`, which creates no repository at all. Users who keep their home directory as a dotfiles repository therefore could not set up a store at the recommended `~/openspec/<id>` path with any flag. With `--no-init-git` the check is now skipped, and the store never records the enclosing repository's remote. The default setup and an explicit `--init-git` still refuse a path inside another repository.
