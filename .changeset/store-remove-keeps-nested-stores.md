---
'@fission-ai/openspec': patch
---

Stop `openspec store remove` deleting a store the user did not name. Remove deletes the target's folder recursively, but it checked only the target's own metadata, so any other registered store living inside that folder was deleted with it, uncommitted planning work included, while its registry entry was left pointing at a path that no longer existed. The natural way to get there is a shared store vendored into another as a git submodule, a layout `store register` accepts. Remove now refuses when another registration points inside the folder, checked under the same registry lock that commits the removal, and the error names each nested store with the `openspec store unregister` command to run first. Removing a store whose other registrations are siblings is unchanged, and `store register` still accepts nested checkouts.
