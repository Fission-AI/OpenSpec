---
'@fission-ai/openspec': minor
---

OpenSpec now installs as a single file with no Node.js needed: `curl -fsSL https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.sh | sh` on macOS and Linux, or `irm https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.ps1 | iex` on Windows. Every release now includes binaries for macOS, Linux (glibc and musl) and Windows on x64 and arm64, with `SHA256SUMS`. npm and the other package managers keep working as before.
