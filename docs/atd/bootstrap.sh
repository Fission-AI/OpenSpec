#!/usr/bin/env bash
# ATD developer bootstrap — DRAFT SKELETON.
# Finalized when the internal-package-identity change lands (package name,
# registry URL, and store remote are placeholders).
set -euo pipefail

REGISTRY_URL="${ATD_NPM_REGISTRY:?set ATD_NPM_REGISTRY to the internal registry URL}"
STANDARDS_REMOTE="${ATD_STANDARDS_REMOTE:?set ATD_STANDARDS_REMOTE to the atd-standards git remote}"
STANDARDS_DIR="${ATD_STANDARDS_DIR:-$HOME/atd-standards}"

echo "==> Configuring internal npm registry"
npm config set @atd:registry "$REGISTRY_URL"

echo "==> Installing OpenSpec CLI"
npm install -g @atd/openspec  # placeholder until package-identity lands

echo "==> Registering atd-standards store"
if [ ! -d "$STANDARDS_DIR" ]; then
  git clone "$STANDARDS_REMOTE" "$STANDARDS_DIR"
else
  git -C "$STANDARDS_DIR" pull --ff-only
fi
openspec store register "$STANDARDS_DIR"
openspec store doctor atd-standards

echo "==> Atlassian MCP: verify manually in your agent tool (read a Jira issue)."

echo "==> Health check"
openspec doctor

echo "Bootstrap complete."
