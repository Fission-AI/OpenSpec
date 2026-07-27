---
'@fission-ai/openspec': patch
---

Respect reduced-motion preferences in `openspec init`: the welcome animation is skipped when the OS reduced-motion setting is on (macOS Reduce Motion, GNOME animations disabled), when `OPENSPEC_NO_ANIMATION` is set, or when the new `--no-animation` flag is passed. The static welcome screen is shown instead.
