#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Manual release helper for LightSpec.

This flow assumes "publish-only" CI mode (no automated Version Packages PR).

Usage:
  scripts/release-manual.sh [--yes] [--skip-tests]

Options:
  --yes         Skip confirmation prompts.
  --skip-tests  Skip running test/build checks before versioning.
  -h, --help    Show this help.

Flow:
  1) Ensure branch is main and working tree is clean
  2) Fast-forward main from origin
  3) Run changeset status and changeset version
  4) Commit "Version Packages" and push main
  5) Run local publish (pnpm run release:ci)
  6) Push tags, create GitHub release if missing
EOF
}

confirm() {
  local prompt="$1"
  if [[ "${ASSUME_YES}" == "true" ]]; then
    return 0
  fi
  read -r -p "${prompt} [y/N] " answer
  [[ "${answer}" =~ ^[Yy]$ ]]
}

require_cmd() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || {
    echo "Missing required command: ${cmd}" >&2
    exit 1
  }
}

ensure_github_token() {
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    return 0
  fi

  if ! token="$(gh auth token 2>/dev/null)"; then
    echo "Unable to read GitHub token from gh auth." >&2
    echo "Set GITHUB_TOKEN manually (PAT with read:user and repo:status)." >&2
    exit 1
  fi

  if [[ -z "${token}" ]]; then
    echo "gh auth token returned an empty token." >&2
    echo "Set GITHUB_TOKEN manually (PAT with read:user and repo:status)." >&2
    exit 1
  fi

  export GITHUB_TOKEN="${token}"
}

ASSUME_YES="false"
SKIP_TESTS="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)
      ASSUME_YES="true"
      shift
      ;;
    --skip-tests)
      SKIP_TESTS="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

require_cmd git
require_cmd pnpm
require_cmd npm
require_cmd gh
ensure_github_token

branch="$(git branch --show-current)"
if [[ "${branch}" != "main" ]]; then
  echo "Release must run from main. Current branch: ${branch}" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree must be clean before release." >&2
  git status --short >&2
  exit 1
fi

echo "Fetching latest main..."
git fetch origin main --tags
git pull --ff-only origin main

echo "Checking changeset status..."
pnpm -s exec changeset status

if [[ "${SKIP_TESTS}" != "true" ]]; then
  echo "Running tests/build checks..."
  pnpm -s test
  pnpm -s build
fi

if ! confirm "Proceed with versioning and publish?"; then
  echo "Release aborted."
  exit 1
fi

echo "Applying changesets (version bump + changelog)..."
pnpm -s exec changeset version

if [[ -z "$(git status --porcelain)" ]]; then
  echo "No version changes were produced. Nothing to release."
  exit 0
fi

echo "Committing version changes..."
git add -A .changeset CHANGELOG.md package.json
git commit -m "Version Packages"

echo "Pushing main..."
git push origin main

echo "Publishing to npm via changesets..."
pnpm -s run release:ci

echo "Pushing tags..."
git push --follow-tags origin main

version="v$(node -p "require('./package.json').version")"
if gh release view "${version}" >/dev/null 2>&1; then
  echo "GitHub release ${version} already exists."
else
  echo "Creating GitHub release ${version}..."
  gh release create "${version}" --generate-notes
fi

echo "Manual release flow completed."
