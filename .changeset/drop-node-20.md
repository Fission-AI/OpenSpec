---
'@fission-ai/openspec': minor
---

**Breaking:** the npm package now needs Node.js 22.12.0 or newer. Node 20 reached end-of-life on April 30, 2026. Only npm installs on Node 20 are affected: the standalone binary, the default install since v1.15.0, doesn't use Node, and nothing else about the CLI changes. If you can't upgrade, install the standalone binary (`curl -fsSL https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.sh | sh`, or `irm https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.ps1 | iex` on Windows). Homebrew (`brew install openspec`) still runs on Node, but installs and manages a current Node.js for you as a dependency.
