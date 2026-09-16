---
'@fission-ai/openspec': patch
---

Make `openspec completion uninstall bash` hand `.bashrc` back exactly as `completion install bash` found it. Install adds the OpenSpec block at the top of the file followed by a blank separator line; uninstall removed the block but kept that blank line at the top, then stripped every trailing blank line and wrote the file back without its final newline. The byte count happened to come out unchanged, but the next tool to append to `.bashrc` with `>>` (the nvm, conda and rustup installers all do) merged its first line into the user's last line and broke both. Uninstall now also drops the separator line install added when the block sits at the top of the file, and leaves the rest untouched: the final newline, trailing blank lines and CRLF line endings all survive the round trip. A block the user moved elsewhere in the file is still removed, and the zsh, fish and PowerShell installers are unchanged.
